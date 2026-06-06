"""IELTS Speaking examiner — OpenAI-compatible LLM + acoustic feature extraction.

Works with any provider that speaks the OpenAI Chat Completions API: Groq,
OpenAI, Together, Anyscale, local llama.cpp/Ollama with the OpenAI bridge, etc.

Configure via env:
    EXAMINER_API_KEY   = <bearer key>
    EXAMINER_BASE_URL  = https://api.groq.com/openai/v1    (default)
    EXAMINER_MODEL     = llama-3.3-70b-versatile           (default)
"""
from __future__ import annotations

import json
import os
import re
import statistics
from dataclasses import dataclass, asdict
from typing import Any

import httpx
from pydantic import BaseModel, Field, field_validator, ValidationError

from .transcriber import Transcript

_FILLERS = re.compile(r"\b(uh|um|er|erm|hmm|uhm|like|you know)\b", re.IGNORECASE)
_CONNECTIVES = {
    "because", "however", "although", "therefore", "moreover", "furthermore",
    "whereas", "nevertheless", "consequently", "meanwhile", "firstly",
    "secondly", "finally", "in addition", "for instance", "on the other hand",
}
_COMPLEX_MARKERS = {"which", "who", "that", "if", "when", "while", "because",
                    "although", "though", "unless", "whereas"}
_COMMON = set("""the be to of and a in that have i it for not on with he as you do at this but his
by from they we say her she or an will my one all would there their what so up out if about who get
which go me when make can like time no just him know take people into year your good some could them
see other than then now look only come its over think also back after use two how our work first well
way even new want because any these give day most us is are was were has had said did get got going
really very much many more here new thing things something nothing everything someone people way
think know feel want need like love good great big small long high old right different""".split())


# ---------------------------------------------------------------------------
# Acoustic + lexical features
# ---------------------------------------------------------------------------
@dataclass
class AcousticFeatures:
    duration_sec: float
    speaking_time_sec: float
    word_count: int
    wpm: float
    pause_count: int
    long_pause_count: int
    mean_pause_sec: float
    max_pause_sec: float
    filler_count: int
    filler_per_100w: float
    type_token_ratio: float
    rare_word_ratio: float
    connective_count: int
    complex_clause_ratio: float
    self_correction_count: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def extract_acoustic_features(transcript: Transcript) -> AcousticFeatures:
    text = transcript.cleaned_text
    words_raw = re.findall(r"[a-zA-Z']+", text.lower())
    wc = len(words_raw)
    dur = transcript.duration_sec or 0.0

    pauses: list[float] = []
    wts = transcript.word_timestamps or []
    for i in range(1, len(wts)):
        gap = wts[i].get("start", 0) - wts[i - 1].get("end", 0)
        if gap > 0:
            pauses.append(gap)
    sig_pauses = [p for p in pauses if p > 0.3]
    long_pauses = [p for p in pauses if p > 1.0]

    # Speaking time = span actually covered by speech (excludes leading/trailing
    # silence and any Part-2 prep gap). WPM over the full clip understates rate
    # whenever the recording has quiet stretches — use the spoken span instead.
    if wts:
        speak = max(0.0, float(wts[-1].get("end", 0) or 0) - float(wts[0].get("start", 0) or 0))
    else:
        speak = dur
    if speak <= 0:
        speak = dur

    unique = set(words_raw)
    ttr = len(unique) / wc if wc else 0.0
    rare = [w for w in unique if w not in _COMMON and len(w) > 3]
    rare_ratio = len(rare) / len(unique) if unique else 0.0

    low = text.lower()
    conn = sum(1 for c in _CONNECTIVES if c in low)
    complex_ratio = (sum(1 for w in words_raw if w in _COMPLEX_MARKERS) / wc) if wc else 0.0
    self_corr = len(re.findall(r"\b(\w+)\s+\1\b", low))

    return AcousticFeatures(
        duration_sec=round(dur, 2),
        speaking_time_sec=round(speak, 2),
        word_count=wc,
        wpm=round(wc / (speak / 60), 1) if speak else 0.0,
        pause_count=len(sig_pauses),
        long_pause_count=len(long_pauses),
        mean_pause_sec=round(statistics.mean(sig_pauses), 3) if sig_pauses else 0.0,
        max_pause_sec=round(max(pauses), 3) if pauses else 0.0,
        filler_count=len(_FILLERS.findall(text)),
        filler_per_100w=round(len(_FILLERS.findall(text)) / wc * 100, 2) if wc else 0.0,
        type_token_ratio=round(ttr, 3),
        rare_word_ratio=round(rare_ratio, 3),
        connective_count=conn,
        complex_clause_ratio=round(complex_ratio, 3),
        self_correction_count=self_corr,
    )


# ---------------------------------------------------------------------------
# Pydantic output schema
# ---------------------------------------------------------------------------
class Scores(BaseModel):
    fluency_coherence: float
    lexical_resource: float
    grammatical_range_accuracy: float
    pronunciation: float
    overall_band: float

    @field_validator("*")
    @classmethod
    def band_range(cls, v: float) -> float:
        if not (0 <= v <= 9):
            raise ValueError(f"band {v} ngoài [0,9]")
        return round(float(v) * 2) / 2


class Evidence(BaseModel):
    fluency_coherence: list[str] = Field(default_factory=list)
    lexical_resource: list[str] = Field(default_factory=list)
    grammatical_range_accuracy: list[str] = Field(default_factory=list)
    pronunciation: list[str] = Field(default_factory=list)


class FeedbackVI(BaseModel):
    fluency_coherence: list[str]
    lexical_resource: list[str]
    grammatical_range_accuracy: list[str]
    pronunciation: list[str]


class FeedbackEN(BaseModel):
    """English mirror of the feedback — optional so older model output still validates."""
    fluency_coherence: list[str] = Field(default_factory=list)
    lexical_resource: list[str] = Field(default_factory=list)
    grammatical_range_accuracy: list[str] = Field(default_factory=list)
    pronunciation: list[str] = Field(default_factory=list)


class BandGap(BaseModel):
    """What is blocking the next half-band on the weakest criterion."""
    weakest_criterion: str = ""
    current_band: float = 0.0
    next_band: float = 0.0
    why_not_higher_vi: str = ""
    to_improve_vi: list[str] = Field(default_factory=list)
    why_not_higher_en: str = ""
    to_improve_en: list[str] = Field(default_factory=list)


class ExaminerResult(BaseModel):
    scores: Scores
    evidence: Evidence
    feedback_vi: FeedbackVI
    next_steps_vi: list[str]
    feedback_en: FeedbackEN = Field(default_factory=FeedbackEN)
    next_steps_en: list[str] = Field(default_factory=list)
    band_gap: BandGap = Field(default_factory=BandGap)


# ---------------------------------------------------------------------------
# Prompt — schema embedded so JSON mode produces the right shape every time
# ---------------------------------------------------------------------------
EXAMINER_SYSTEM = """You are a certified IELTS Speaking examiner (British Council / IDP). \
Apply the OFFICIAL PUBLIC BAND DESCRIPTORS. Score 4 criteria, each band 0-9 step 0.5.

FLUENCY & COHERENCE — B7: speaks at length without noticeable effort; some language-related \
hesitation; range of connectives/discourse markers with some flexibility. B6: willing to speak \
at length but may lose coherence (repetition, self-correction, hesitation).

LEXICAL RESOURCE — B7: flexible vocabulary on varied topics; some less common/idiomatic items; \
effective paraphrase. B6: enough vocabulary to discuss at length, meaning clear despite \
inappropriacies; generally paraphrases.

GRAMMATICAL RANGE & ACCURACY — B7: range of complex structures with some flexibility; frequently \
error-free sentences. B6: mix of simple/complex with limited flexibility; frequent errors in \
complex structures but rarely impede communication.

PRONUNCIATION — B7: all positive Band 6 features + some Band 8. B6: range of features with mixed \
control; generally understood; mispronunciation reduces clarity at times.

PROTOCOL:
1. Per criterion, cite 2-3 evidence quotes from the transcript.
2. Use the ACOUSTIC FEATURES JSON to inform F&C (wpm, pauses, fillers) and partly P.
3. overall_band = arithmetic mean of 4 sub-scores, rounded to nearest 0.5 (Cambridge).
4. Feedback in BOTH Vietnamese (feedback_vi/next_steps_vi) AND English (feedback_en/next_steps_en), \
2-3 actionable bullets per criterion. The English must mirror the same points as the Vietnamese.
5. Watch Vietnamese-L1 errors: dropped articles, missing 3rd-person -s and past -ed, \
omitted final consonants, no word stress, overuse of 'very'.
6. Identify the SINGLE weakest criterion. In band_gap, explain in BOTH Vietnamese \
(why_not_higher_vi/to_improve_vi) and English (why_not_higher_en/to_improve_en) exactly what is \
blocking the next half-band and give 2 concrete, practisable actions tied to THIS answer.
7. PART AWARENESS: the user message states which part this is and its length expectation. If the \
answer is too short for that part, say so explicitly and treat Fluency & Coherence as limited \
(you cannot demonstrate "speaks at length" on a very short answer).
Note: pronunciation is inferred from text + acoustics only (no phoneme audio) — be conservative \
and say so in pronunciation feedback.

You MUST return ONLY a single JSON object matching this exact schema (no markdown, no commentary):
{
  "scores": {
    "fluency_coherence":            <number 0-9>,
    "lexical_resource":             <number 0-9>,
    "grammatical_range_accuracy":   <number 0-9>,
    "pronunciation":                <number 0-9>,
    "overall_band":                 <number 0-9>
  },
  "evidence": {
    "fluency_coherence":            ["<short quote>", ...],
    "lexical_resource":             ["<short quote>", ...],
    "grammatical_range_accuracy":   ["<short quote>", ...],
    "pronunciation":                ["<short quote>", ...]
  },
  "feedback_vi": {
    "fluency_coherence":            ["<câu nhận xét tiếng Việt>", ...],
    "lexical_resource":             ["<câu nhận xét tiếng Việt>", ...],
    "grammatical_range_accuracy":   ["<câu nhận xét tiếng Việt>", ...],
    "pronunciation":                ["<câu nhận xét tiếng Việt>", ...]
  },
  "next_steps_vi": ["<bước hành động 1>", "<bước 2>", ...],
  "band_gap": {
    "weakest_criterion":  "<one of: Fluency & Coherence | Lexical Resource | Grammatical Range & Accuracy | Pronunciation>",
    "current_band":       <number>,
    "next_band":          <number = current_band + 0.5>,
    "why_not_higher_vi":  "<tiếng Việt: vì sao tiêu chí này chưa đạt band kế tiếp>",
    "to_improve_vi":      ["<hành động cụ thể 1>", "<hành động cụ thể 2>"]
  }
}"""


EXAMINER_USER_TMPL = """PART: {part_label}
LENGTH EXPECTATION FOR THIS PART: {part_expectation}

QUESTION:
{question}

CANDIDATE TRANSCRIPT:
{transcript}

ACOUSTIC FEATURES (JSON):
{features}

Return the JSON object only."""


# Part-aware length expectations + soft minimums. IELTS Speaking:
#   Part 1 = short personal Q&A; Part 2 = 1-2 min long turn; Part 3 = developed discussion.
_PART_META = {
    "part1": {
        "label": "Part 1 (short personal questions)",
        "expectation": "2-4 full sentences per answer is healthy; one-word answers cannot be scored well.",
        "min_words": 15,
    },
    "part2": {
        "label": "Part 2 (long turn — speak 1 to 2 minutes)",
        "expectation": "A proper long turn is roughly 150-220 words spoken over 90-120 seconds.",
        "min_words": 90,
    },
    "part3": {
        "label": "Part 3 (discussion — develop and justify ideas)",
        "expectation": "Each answer should be a developed 3-5 sentence response with reasons/examples.",
        "min_words": 30,
    },
}


def _length_nudge(part: str, feats: AcousticFeatures) -> dict[str, Any] | None:
    """If the answer is under the part-aware minimum, return a bilingual nudge plus a
    Fluency&Coherence cap (you cannot show 'speaks at length' on a too-short answer)."""
    meta = _PART_META.get(part, _PART_META["part1"])
    min_words = meta["min_words"]
    wc = feats.word_count
    if wc >= min_words:
        return None
    if part == "part2":
        nudge_vi = (f"Câu trả lời Part 2 mới có {wc} từ — quá ngắn cho một lượt nói dài 1-2 phút. "
                    "Hãy khai triển đủ các gạch đầu dòng trên thẻ và nói liên tục khoảng 90-120 giây.")
        nudge_en = (f"Your Part 2 long turn was only {wc} words — too short for a 1-2 minute turn. "
                    "Cover every bullet on the cue card and keep talking for about 90-120 seconds.")
        cap = 6.0 if wc < 80 else 6.5
    elif part == "part3":
        nudge_vi = (f"Câu trả lời Part 3 chỉ có {wc} từ — hãy phát triển ý: nêu lý do, ví dụ, và mở rộng quan điểm.")
        nudge_en = (f"Your Part 3 answer was only {wc} words — develop it with reasons, examples and a wider view.")
        cap = 6.5
    else:
        nudge_vi = (f"Câu trả lời chỉ có {wc} từ — trả lời thành 2-4 câu đầy đủ thay vì một vài từ.")
        nudge_en = (f"Your answer was only {wc} words — give a full 2-4 sentence answer instead of a few words.")
        cap = 6.5
    return {"nudge_vi": nudge_vi, "nudge_en": nudge_en, "fluency_cap": cap}


# ---------------------------------------------------------------------------
# LLM call (OpenAI-compatible chat completions)
# ---------------------------------------------------------------------------
def _call_llm(*, base_url: str, api_key: str, model: str,
              system: str, user: str, force_json: bool = True,
              timeout: float = 90.0) -> str:
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.0,
        "max_tokens": 2048,
    }
    if force_json:
        payload["response_format"] = {"type": "json_object"}

    url = base_url.rstrip("/") + "/chat/completions"
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    if resp.status_code != 200:
        raise RuntimeError(f"LLM HTTP {resp.status_code}: {resp.text[:400]}")
    data = resp.json()
    try:
        msg = data["choices"][0]["message"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"LLM unexpected response shape: {data}") from e
    # Reasoning models (e.g. gpt-oss) may leave content empty and put text in reasoning fields.
    content = msg.get("content")
    if not content:
        content = msg.get("reasoning_content") or msg.get("reasoning")
    if not content:
        raise RuntimeError(f"LLM returned empty content: {data}")
    return content


def _parse_examiner_json(raw: str) -> ExaminerResult:
    # Strip code fences if the model added them despite JSON mode.
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return ExaminerResult.model_validate_json(s)


# ---------------------------------------------------------------------------
# Service entry point
# ---------------------------------------------------------------------------
def _no_speech_result(transcript: Transcript, feats: AcousticFeatures, model: str) -> dict[str, Any]:
    """Returned when the recording has essentially no speech — we do NOT ask the
    LLM to invent a band for silence. UI shows a friendly retry message."""
    empty = lambda: {"fluency_coherence": [], "lexical_resource": [],
                     "grammatical_range_accuracy": [], "pronunciation": []}
    return {
        "no_speech": True,
        "user_transcript": transcript.cleaned_text or "",
        "fluency_score": None,
        "lexical_score": None,
        "grammar_score": None,
        "pronunciation_score": None,
        "overall_band": None,
        "examiner_feedback": {
            "evidence": empty(),
            "feedback_vi": empty(),
            "next_steps_vi": [
                "Mình gần như không nghe thấy giọng nói trong bản ghi này.",
                "Kiểm tra micro, nói to và rõ hơn, rồi thu lại nhé.",
            ],
            "feedback_en": empty(),
            "next_steps_en": [
                "I could barely hear any speech in this recording.",
                "Check your microphone, speak louder and clearer, then record again.",
            ],
            "acoustic_features": feats.to_dict(),
            "band_gap": BandGap().model_dump(),
        },
        "examiner_model": model,
        "duration_sec": transcript.duration_sec,
    }


def score_transcript(question: str, transcript: Transcript, part: str = "part1") -> dict[str, Any]:
    api_key = os.getenv("EXAMINER_API_KEY")
    if not api_key:
        raise RuntimeError(
            "EXAMINER_API_KEY missing — set it in speaking-backend/.env "
            "(Groq, OpenAI, or any OpenAI-compatible provider)."
        )
    base_url = os.getenv("EXAMINER_BASE_URL", "https://api.groq.com/openai/v1")
    model = os.getenv("EXAMINER_MODEL", "llama-3.3-70b-versatile")

    feats = extract_acoustic_features(transcript)

    # Silence / no-speech guard — scoring an empty answer yields garbage bands.
    if feats.word_count < 3:
        return _no_speech_result(transcript, feats, model)

    part = part if part in _PART_META else "part1"
    meta = _PART_META[part]
    user = EXAMINER_USER_TMPL.format(
        part_label=meta["label"],
        part_expectation=meta["expectation"],
        question=question,
        transcript=transcript.cleaned_text or "(no speech detected)",
        features=json.dumps(feats.to_dict(), ensure_ascii=False),
    )

    # First pass.
    raw = _call_llm(base_url=base_url, api_key=api_key, model=model,
                    system=EXAMINER_SYSTEM, user=user, force_json=True)
    try:
        result = _parse_examiner_json(raw)
    except (ValidationError, json.JSONDecodeError) as e:
        # One repair attempt: feed the broken JSON back and ask for a fix.
        repair_user = (
            "Your previous response did not match the required schema. "
            f"Validator error: {str(e)[:300]}\n\n"
            "Previous response was:\n" + raw[:2000] +
            "\n\nReturn ONLY a corrected JSON object matching the schema in the system message."
        )
        raw2 = _call_llm(base_url=base_url, api_key=api_key, model=model,
                         system=EXAMINER_SYSTEM, user=repair_user, force_json=True)
        try:
            result = _parse_examiner_json(raw2)
        except (ValidationError, json.JSONDecodeError) as e2:
            raise RuntimeError(f"Examiner JSON failed twice: {e2}\nRaw: {raw2[:400]}") from e2

    s = result.scores

    # Part-aware under-length handling: cap Fluency & Coherence (can't show "speaks at
    # length" on a too-short answer) and surface a bilingual "say more" nudge.
    nudge = _length_nudge(part, feats)
    if nudge:
        if s.fluency_coherence > nudge["fluency_cap"]:
            s.fluency_coherence = nudge["fluency_cap"]
        result.next_steps_vi = [nudge["nudge_vi"], *result.next_steps_vi]
        result.next_steps_en = [nudge["nudge_en"], *(result.next_steps_en or [])]

    # Recompute overall — never trust LLM arithmetic.
    s.overall_band = round(
        statistics.mean([
            s.fluency_coherence, s.lexical_resource,
            s.grammatical_range_accuracy, s.pronunciation,
        ]) * 2
    ) / 2

    # Anchor band_gap to the ACTUAL weakest sub-score — don't trust the LLM to
    # pick the right criterion. Keep its why/to_improve prose.
    crit_map = [
        ("Fluency & Coherence", s.fluency_coherence),
        ("Lexical Resource", s.lexical_resource),
        ("Grammatical Range & Accuracy", s.grammatical_range_accuracy),
        ("Pronunciation", s.pronunciation),
    ]
    weak_label, weak_band = min(crit_map, key=lambda kv: kv[1])
    result.band_gap.weakest_criterion = weak_label
    result.band_gap.current_band = weak_band
    result.band_gap.next_band = min(9.0, weak_band + 0.5)

    return {
        "user_transcript": transcript.cleaned_text,
        "fluency_score": s.fluency_coherence,
        "lexical_score": s.lexical_resource,
        "grammar_score": s.grammatical_range_accuracy,
        "pronunciation_score": s.pronunciation,
        "overall_band": s.overall_band,
        "examiner_feedback": {
            "evidence": result.evidence.model_dump(),
            "feedback_vi": result.feedback_vi.model_dump(),
            "next_steps_vi": result.next_steps_vi,
            "feedback_en": result.feedback_en.model_dump(),
            "next_steps_en": result.next_steps_en,
            "acoustic_features": feats.to_dict(),
            "band_gap": result.band_gap.model_dump(),
        },
        "examiner_model": model,
        "duration_sec": transcript.duration_sec,
    }
