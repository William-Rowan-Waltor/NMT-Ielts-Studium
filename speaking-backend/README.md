# IELTS Speaking Backend (Phase 1)

Companion FastAPI server for the Writing Lab's Speaking section.

- **ASR**: `faster-whisper` (runs locally, no cloud cost)
- **Examiner**: any OpenAI-compatible LLM (default: Groq `llama-3.3-70b-versatile` — free tier, fast). Easy swap to OpenAI / Together / Ollama by editing `.env`.
- **Store**: SQLite (no Docker needed)
- **Question library**: seeded with ~30 Part 1/2/3 starter prompts

The Writing Lab UI talks to this server at `http://localhost:8000` by default.

## Setup (Windows / PowerShell)

```powershell
cd speaking-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env       # then edit .env to add EXAMINER_API_KEY
python -m src.seed_questions # initialize SQLite + seed questions
.\.venv\Scripts\python.exe -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

After setup, you can also double-click `start-speaking-backend.bat` from the project root.

### Local Ollama examiner (Windows, no cloud API key)

From the project root:

```powershell
.\setup-local-ai.bat
.\setup-speaking-backend-local.bat
.\start-speaking-backend.bat
```

The first command installs the project-local Ollama runtime/model under ignored `.local/` paths. The second creates the Python environment and copies `.env.local-ollama.example` to `.env` only when `.env` does not already exist. Whisper downloads its transcription model on first use.

## Setup (bash / Linux / macOS)

```bash
cd speaking-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # then edit EXAMINER_API_KEY
python -m src.seed_questions
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

## ffmpeg requirement

`faster-whisper` needs `ffmpeg` on PATH to decode `.webm` / `.m4a` uploads from the browser.

- **Windows**: `winget install Gyan.FFmpeg` (or download from ffmpeg.org and add to PATH)
- **macOS**: `brew install ffmpeg`
- **Linux**: `apt install ffmpeg`

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/health` | — | `{status, whisper_model, examiner_model}` |
| `GET` | `/api/library?part=part1&limit=10` | — | Question list |
| `POST` | `/api/score` | `audio` (file) + `question_text` + `part` | 4 scores + feedback VI |

## Whisper model sizes

| Model | Disk | RAM | Quality | Speed (CPU int8) |
|---|---|---|---|---|
| `tiny.en` | 75 MB | ~1 GB | OK | very fast |
| `base.en` | 145 MB | ~1 GB | good | fast (recommended) |
| `small.en` | 470 MB | ~2 GB | very good | medium |
| `medium.en` | 1.5 GB | ~4 GB | excellent | slow on CPU |

Switch by editing `WHISPER_MODEL` in `.env`.

## Phase 2 (not in this build)

- Postgres + pgvector for vector-search of "questions similar to recent exam topics"
- Auto-generated Part 1/2/3 questions from CC sources
- Word-level timestamps via WhisperX for finer pause/filler analysis
