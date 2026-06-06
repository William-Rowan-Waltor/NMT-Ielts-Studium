"""SQLite layer for the Speaking backend.

Two tables only (Phase 1):
- questions: seeded library of Part 1/2/3 prompts
- sessions: practice attempts with scores + feedback JSON

Postgres + pgvector is intentionally deferred to Phase 2; the schema below
keeps the same field names as packages/db/schema.sql in the original proposal
so migration is a straight column-mapping later.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "speaking.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS questions (
    id              TEXT PRIMARY KEY,
    part            TEXT NOT NULL CHECK(part IN ('part1','part2','part3')),
    topic           TEXT NOT NULL,
    topic_category  TEXT,
    question_text   TEXT NOT NULL,
    cue_card_json   TEXT,                 -- JSON: {bullets: [...]}
    follow_up_json  TEXT,                 -- JSON: [str, str, ...]
    difficulty      TEXT,
    sample_band     TEXT,
    sample_text     TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_part  ON questions(part);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);

CREATE TABLE IF NOT EXISTS sessions (
    id                  TEXT PRIMARY KEY,
    question_id         TEXT,
    part                TEXT NOT NULL,
    question_text       TEXT NOT NULL,
    user_transcript     TEXT,
    fluency_score       REAL,
    lexical_score       REAL,
    grammar_score       REAL,
    pronunciation_score REAL,
    overall_band        REAL,
    examiner_feedback   TEXT,             -- JSON
    examiner_model      TEXT,
    duration_sec        REAL,
    started_at          TEXT NOT NULL,
    finished_at         TEXT,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(started_at DESC);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# --- Question helpers ------------------------------------------------------

def insert_question(q: dict[str, Any]) -> str:
    qid = q.get("id") or new_id()
    with connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO questions
               (id, part, topic, topic_category, question_text, cue_card_json,
                follow_up_json, difficulty, sample_band, sample_text, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                qid, q["part"], q["topic"], q.get("topic_category"),
                q["question_text"],
                json.dumps(q["cue_card"]) if q.get("cue_card") else None,
                json.dumps(q["follow_up"]) if q.get("follow_up") else None,
                q.get("difficulty"), q.get("sample_band"), q.get("sample_text"),
                now_iso(),
            ),
        )
    return qid


def list_questions(part: str | None = None, topic: str | None = None,
                   limit: int = 20) -> list[dict[str, Any]]:
    sql = "SELECT * FROM questions WHERE 1=1"
    args: list[Any] = []
    if part:
        sql += " AND part = ?"
        args.append(part)
    if topic:
        sql += " AND topic = ?"
        args.append(topic)
    sql += " ORDER BY RANDOM() LIMIT ?"
    args.append(limit)
    with connect() as conn:
        rows = conn.execute(sql, args).fetchall()
    return [_row_to_question(r) for r in rows]


def get_question(qid: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM questions WHERE id = ?", (qid,)).fetchone()
    return _row_to_question(row) if row else None


def list_topics() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT part, topic, COUNT(*) AS n FROM questions GROUP BY part, topic "
            "ORDER BY part, topic"
        ).fetchall()
    return [dict(r) for r in rows]


def _row_to_question(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    d["cue_card"] = json.loads(d.pop("cue_card_json")) if d.get("cue_card_json") else None
    d["follow_up"] = json.loads(d.pop("follow_up_json")) if d.get("follow_up_json") else None
    return d


# --- Session helpers -------------------------------------------------------

def insert_session(s: dict[str, Any]) -> str:
    sid = s.get("id") or new_id()
    with connect() as conn:
        conn.execute(
            """INSERT INTO sessions
               (id, question_id, part, question_text, user_transcript,
                fluency_score, lexical_score, grammar_score, pronunciation_score,
                overall_band, examiner_feedback, examiner_model, duration_sec,
                started_at, finished_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sid, s.get("question_id"), s["part"], s["question_text"],
                s.get("user_transcript"),
                s.get("fluency_score"), s.get("lexical_score"),
                s.get("grammar_score"), s.get("pronunciation_score"),
                s.get("overall_band"),
                json.dumps(s["examiner_feedback"]) if s.get("examiner_feedback") else None,
                s.get("examiner_model"), s.get("duration_sec"),
                s.get("started_at") or now_iso(),
                s.get("finished_at") or now_iso(),
            ),
        )
    return sid


def list_sessions(limit: int = 50) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [_row_to_session(r) for r in rows]


def _row_to_session(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    if d.get("examiner_feedback"):
        d["examiner_feedback"] = json.loads(d["examiner_feedback"])
    return d
