"""Local ASR via faster-whisper.

Stripped-down version of the original transcriber.py — Phase 1 only needs
local Whisper. Cloud providers (Groq, Deepgram, WhisperX) can be added later
without changing the call sites in main.py.
"""
from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

_MODEL_CACHE: dict[str, Any] = {}

_FILLERS = re.compile(r"\b(uh|um|er|erm|hmm|uhm)\b", re.IGNORECASE)
_MULTISPACE = re.compile(r"\s+")


@dataclass
class Transcript:
    raw_text: str
    cleaned_text: str
    asr_model: str
    language: str = "en"
    word_timestamps: list[dict[str, Any]] = field(default_factory=list)
    duration_sec: float | None = None
    latency_s: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def clean_text(raw: str, strip_fillers: bool = False) -> str:
    t = raw.strip()
    if strip_fillers:
        t = _FILLERS.sub("", t)
    t = _MULTISPACE.sub(" ", t).strip()
    if t and t[-1] not in ".!?":
        t += "."
    return t


def _get_model(model_name: str, device: str, compute: str):
    """Cache the WhisperModel — loading large weights every call is expensive."""
    cache_key = f"{model_name}|{device}|{compute}"
    if cache_key not in _MODEL_CACHE:
        from faster_whisper import WhisperModel
        _MODEL_CACHE[cache_key] = WhisperModel(model_name, device=device, compute_type=compute)
    return _MODEL_CACHE[cache_key]


def transcribe(
    audio_path: str | Path,
    *,
    model_name: str | None = None,
    device: str | None = None,
    compute: str | None = None,
    need_word_ts: bool = True,
) -> Transcript:
    audio = Path(audio_path)
    if not audio.exists():
        raise FileNotFoundError(audio)

    model_name = model_name or os.getenv("WHISPER_MODEL", "base.en")
    device = device or os.getenv("WHISPER_DEVICE", "auto")
    compute = compute or os.getenv("WHISPER_COMPUTE", "int8")

    t0 = time.perf_counter()
    wm = _get_model(model_name, device, compute)
    segments, info = wm.transcribe(
        str(audio),
        beam_size=5,
        language="en",
        word_timestamps=need_word_ts,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
    )

    parts: list[str] = []
    words: list[dict[str, Any]] = []
    for seg in segments:
        parts.append(seg.text)
        if need_word_ts and getattr(seg, "words", None):
            for w in seg.words:
                words.append({
                    "w": (w.word or "").strip(),
                    "start": round(float(w.start or 0.0), 3),
                    "end": round(float(w.end or 0.0), 3),
                })

    raw = "".join(parts).strip()
    return Transcript(
        raw_text=raw,
        cleaned_text=clean_text(raw),
        asr_model=f"faster-whisper-{model_name}",
        language=getattr(info, "language", "en"),
        word_timestamps=words,
        duration_sec=round(float(getattr(info, "duration", 0.0) or 0.0), 2),
        latency_s=round(time.perf_counter() - t0, 3),
    )
