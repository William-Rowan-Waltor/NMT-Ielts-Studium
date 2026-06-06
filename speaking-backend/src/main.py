"""FastAPI entry — endpoints consumed by the Writing Lab's Speaking tab.

Run: uvicorn src.main:app --reload --port 8000
"""
from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

# Load .env BEFORE importing anything that reads env vars.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from . import db
from .examiner import score_transcript
from .transcriber import transcribe

AUDIO_CACHE = Path(__file__).resolve().parent.parent / "audio_cache"
AUDIO_CACHE.mkdir(exist_ok=True)

# Local dev tool — accept ANY origin so it works from:
#   - http://localhost:5173  (node scripts/serve.mjs)
#   - file://                (double-click index.html — browser sends Origin: null)
#   - any other local port the user runs the lab on
# Safe because the server binds to 127.0.0.1 only AND `allow_credentials=False`,
# so the browser will not attach cookies. Override via ALLOWED_ORIGIN=... if you
# want to restrict it.
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
_origin_kwargs: dict[str, Any] = (
    {"allow_origins": ["*"]} if ALLOWED_ORIGIN == "*"
    else {"allow_origins": [o.strip() for o in ALLOWED_ORIGIN.split(",") if o.strip()]}
)

app = FastAPI(title="IELTS Speaking Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    **_origin_kwargs,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Voice-Map", "X-Speaker-Count"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


def _tts_installed() -> bool:
    try:
        import importlib.util
        return importlib.util.find_spec("supertonic") is not None
    except Exception:
        return False


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "whisper_model": os.getenv("WHISPER_MODEL", "base.en"),
        "examiner_model": os.getenv("EXAMINER_MODEL", "llama-3.3-70b-versatile"),
        "examiner_base_url": os.getenv("EXAMINER_BASE_URL", "https://api.groq.com/openai/v1"),
        "examiner_key_set": bool(os.getenv("EXAMINER_API_KEY")),
        "tts_available": _tts_installed(),
    }


@app.get("/api/library")
def library(part: str | None = None, topic: str | None = None,
            limit: int = 20) -> list[dict[str, Any]]:
    if part and part not in ("part1", "part2", "part3"):
        raise HTTPException(400, "part must be part1/part2/part3")
    return db.list_questions(part=part, topic=topic, limit=limit)


@app.get("/api/topics")
def topics() -> list[dict[str, Any]]:
    return db.list_topics()


@app.get("/api/sessions")
def sessions(limit: int = 50) -> list[dict[str, Any]]:
    return db.list_sessions(limit=limit)


@app.post("/api/score")
async def score(
    audio: UploadFile = File(...),
    question_text: str = Form(...),
    part: str = Form(...),
    question_id: str | None = Form(None),
) -> JSONResponse:
    if part not in ("part1", "part2", "part3"):
        raise HTTPException(400, "part must be part1/part2/part3")

    suffix = Path(audio.filename or "answer.webm").suffix or ".webm"
    tmp = tempfile.NamedTemporaryFile(prefix="ielts_", suffix=suffix,
                                      dir=AUDIO_CACHE, delete=False)
    try:
        with tmp as f:
            shutil.copyfileobj(audio.file, f)
        tr = transcribe(tmp.name, need_word_ts=True)
        result = score_transcript(question_text, tr, part=part)
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    # Don't persist a "no speech detected" attempt — it isn't a real score.
    if result.get("no_speech"):
        return JSONResponse(result)

    sid = db.insert_session({
        **result,
        "question_id": question_id,
        "part": part,
        "question_text": question_text,
    })
    result["id"] = sid
    return JSONResponse(result)


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)) -> JSONResponse:
    """Transcribe an uploaded audio file to text (no scoring). Used by the Vocab
    importer so users can pull lexis from mp3/m4a/wav/webm audio, not just text/docs.
    Returns {text, duration_sec}. Whisper-readable audio only (no video container
    de-muxing here — that needs ffmpeg)."""
    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    tmp = tempfile.NamedTemporaryFile(prefix="ielts_tr_", suffix=suffix,
                                      dir=AUDIO_CACHE, delete=False)
    try:
        with tmp as f:
            shutil.copyfileobj(audio.file, f)
        tr = transcribe(tmp.name, need_word_ts=False)
    except Exception as e:  # noqa: BLE001 — surface a clean message to the browser
        raise HTTPException(500, f"Transcription failed: {e}")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
    return JSONResponse({"text": tr.cleaned_text or "", "duration_sec": tr.duration_sec})


# ─── Supertonic on-device TTS (real Listening audio) ──────────────────────────
_TTS = None  # lazily-loaded, cached for the process


def _get_tts():
    global _TTS
    if _TTS is None:
        from supertonic import TTS  # imported lazily so the server starts without it
        _TTS = TTS(auto_download=True)
    return _TTS


@app.post("/api/tts")
def tts_synthesize(text: str = Form(...), voice: str = Form("M1"),
                   lang: str = Form("en"), speed: float = Form(1.05)) -> Response:
    """Synthesize text → WAV with the on-device Supertonic model. Used by Listening to
    produce REAL audio (multiple voices, 44.1kHz) instead of browser TTS. Sync def so
    FastAPI runs the CPU-bound synth in a worker thread."""
    body = (text or "").strip()
    if not body:
        raise HTTPException(400, "No text to synthesize.")
    if len(body) > 6000:
        body = body[:6000]
    try:
        tts = _get_tts()
        try:
            style = tts.get_voice_style(voice_name=voice or "M1")
        except Exception:
            style = tts.get_voice_style(voice_name="M1")
        wav, _dur = tts.synthesize(text=body, voice_style=style, lang=(lang or "en"),
                                   speed=float(speed or 1.05))
        tmp = tempfile.NamedTemporaryFile(prefix="ielts_tts_", suffix=".wav",
                                          dir=AUDIO_CACHE, delete=False)
        tmp.close()
        tts.save_audio(wav, tmp.name)
        with open(tmp.name, "rb") as fh:
            data = fh.read()
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
        return Response(content=data, media_type="audio/wav")
    except HTTPException:
        raise
    except ModuleNotFoundError:
        raise HTTPException(503, "Supertonic TTS is not installed. Run: pip install 'supertonic[serve]' in speaking-backend/.venv")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"TTS failed: {e}")


# ─── Multi-voice dialogue synthesis (real Part 1 / Part 3 style audio) ─────────
# Generated conversation transcripts mark turns with [Speaker A]/[Speaker B]; many
# imported/teacher transcripts use line-leading labels (WOMAN:, TUTOR:, JAMES:).
# We split into turns, give each distinct speaker its own alternating M/F voice, and
# concatenate the per-turn WAVs so Part 1 (2 voices) and Part 3 (up to 4) sound like
# real exam audio. Monologues (no labels) fall back to a single narrator voice.
import re as _re

_SPEAKER_MARK = _re.compile(
    r"\[\s*([^\]\n]{1,30}?)\s*\]"                                 # [Speaker A] / [A]
    r"|(?:^|\n)[ \t]*([A-Z][A-Za-z]*(?:\s[A-Z][A-Za-z]+){0,2})[ \t]*:",  # LABEL: at line start
)
# Bracketed stage directions that are NOT speakers (kept as continuation, not synth labels).
_NON_SPEAKER = {
    "pause", "pauses", "laughs", "laughter", "music", "applause", "inaudible",
    "silence", "beep", "sound", "noise", "sighs", "coughs", "clears throat",
    "phone rings", "ringing", "crosstalk",
}
# Alternating female/male pool → strong gender contrast between consecutive speakers.
_VOICE_POOL = ["F1", "M1", "F2", "M2", "F3", "M3", "F4", "M4"]
_NARRATOR_VOICE = "M5"


def _norm_speaker(label: str) -> str:
    return _re.sub(r"\s+", " ", (label or "").strip()).upper()


def _parse_turns(transcript: str) -> list[tuple[str | None, str]]:
    """Split a transcript into (speaker_key|None, text) turns. None = unlabeled narration."""
    text = transcript or ""
    marks = list(_SPEAKER_MARK.finditer(text))
    if not marks:
        return [(None, text.strip())]
    turns: list[tuple[str | None, str]] = []
    pre = text[: marks[0].start()].strip()
    if pre:
        turns.append((None, pre))
    for i, m in enumerate(marks):
        raw = (m.group(1) or m.group(2) or "").strip()
        key = _norm_speaker(raw)
        seg_start = m.end()
        seg_end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        seg = text[seg_start:seg_end].strip()
        if not seg:
            continue
        if key.lower() in _NON_SPEAKER:
            # Stage direction — keep the speech as a continuation of the previous speaker.
            prev = turns[-1][0] if turns else None
            turns.append((prev, seg))
            continue
        turns.append((key, seg))
    return turns


def _assign_voices(turns: list[tuple[str | None, str]]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    nxt = 0
    for spk, _seg in turns:
        if spk is None or spk in mapping:
            continue
        mapping[spk] = _VOICE_POOL[nxt % len(_VOICE_POOL)]
        nxt += 1
    return mapping


@app.post("/api/tts-dialogue")
def tts_dialogue(transcript: str = Form(...), lang: str = Form("en"),
                 speed: float = Form(1.0), gap_ms: int = Form(350)) -> Response:
    """Synthesize a multi-speaker transcript → one WAV with a distinct voice per speaker.
    Sync def so the CPU-bound synth runs in a worker thread. Returns X-Voice-Map and
    X-Speaker-Count headers describing the speaker→voice assignment."""
    body = (transcript or "").strip()
    if not body:
        raise HTTPException(400, "No transcript to synthesize.")
    if len(body) > 12000:
        body = body[:12000]
    turns = _parse_turns(body)
    if len(turns) > 80:
        turns = turns[:80]
    voice_map = _assign_voices(turns)
    try:
        import numpy as np  # ships with faster-whisper

        tts = _get_tts()
        sr = int(getattr(tts, "sample_rate", 44100) or 44100)
        gap = np.zeros((1, max(0, int(sr * max(0, gap_ms) / 1000))), dtype=np.float32)

        _styles: dict[str, Any] = {}

        def _style(v: str):
            if v not in _styles:
                try:
                    _styles[v] = tts.get_voice_style(voice_name=v)
                except Exception:
                    _styles[v] = tts.get_voice_style(voice_name="M1")
            return _styles[v]

        pieces: list[Any] = []
        for spk, seg in turns:
            seg = (seg or "").strip()
            if not seg:
                continue
            v = voice_map.get(spk, _NARRATOR_VOICE) if spk is not None else _NARRATOR_VOICE
            wav, _d = tts.synthesize(text=seg[:2000], voice_style=_style(v),
                                     lang=(lang or "en"), speed=float(speed or 1.0))
            arr = np.asarray(wav, dtype=np.float32)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
            pieces.append(arr)
            pieces.append(gap)
        if not pieces:
            raise HTTPException(400, "Nothing to synthesize.")
        full = np.concatenate(pieces, axis=1)

        tmp = tempfile.NamedTemporaryFile(prefix="ielts_ttsd_", suffix=".wav",
                                          dir=AUDIO_CACHE, delete=False)
        tmp.close()
        tts.save_audio(full, tmp.name)
        with open(tmp.name, "rb") as fh:
            data = fh.read()
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

        vm = ", ".join(f"{spk}={v}" for spk, v in voice_map.items()) or f"narration={_NARRATOR_VOICE}"
        headers = {"X-Voice-Map": vm[:400], "X-Speaker-Count": str(len(voice_map))}
        return Response(content=data, media_type="audio/wav", headers=headers)
    except HTTPException:
        raise
    except ModuleNotFoundError:
        raise HTTPException(503, "Supertonic TTS is not installed. Run: pip install 'supertonic[serve]' in speaking-backend/.venv")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Dialogue TTS failed: {e}")
