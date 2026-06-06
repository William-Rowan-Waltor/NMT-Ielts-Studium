import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || process.argv[2] || 5173);
const storageDir = path.join(root, 'data');
const storageFile = path.join(storageDir, 'app-state.json');

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.jsx', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
]);

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function decodeHtml(text = '') {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
  return String(text)
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, entity) => {
      const key = entity.toLowerCase();
      if (named[key]) return named[key];
      if (key.startsWith('#x')) return String.fromCharCode(parseInt(key.slice(2), 16));
      if (key.startsWith('#')) return String.fromCharCode(parseInt(key.slice(1), 10));
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function isDirectAudioUrl(value = '') {
  const url = String(value).trim();
  if (/^(blob:|data:audio\/)/i.test(url)) return true;
  return /^https?:\/\//i.test(url) && /\.(mp3|m4a|mp4|wav|ogg|oga|aac|webm)(\?|#|$)/i.test(url);
}

function formatTime(seconds = 0) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function segmentsToTranscript(segments) {
  return segments
    .map((seg) => `[${formatTime(seg.start)}] ${seg.speaker ? `${seg.speaker}: ` : ''}${seg.text}`)
    .join('\n');
}

function listeningImportStatus(code) {
  const statuses = {
    real_audio: {
      code: 'real_audio',
      label: 'Real audio attached',
      message: 'The importer found a playable audio file, but no transcript was fetched automatically.',
      nextAction: 'Paste or import a transcript if you want AI-generated questions.',
      hasRealAudio: true,
      hasTranscript: false,
      canGenerateQuestions: false,
    },
    transcript_only: {
      code: 'transcript_only',
      label: 'Transcript only',
      message: 'The importer fetched captions/transcript text, but did not attach the original audio.',
      nextAction: 'Use browser TTS or Make real audio to practice with audio.',
      hasRealAudio: false,
      hasTranscript: true,
      canGenerateQuestions: true,
    },
    source_link_only: {
      code: 'source_link_only',
      label: 'Source link only',
      message: 'The importer could not attach audio or transcript from this link.',
      nextAction: 'Use a direct audio URL, paste a transcript manually, or download captions with a browser tool.',
      hasRealAudio: false,
      hasTranscript: false,
      canGenerateQuestions: false,
    },
  };
  const mediaStatus = statuses[code] || statuses.source_link_only;
  return {
    importStatus: mediaStatus.code,
    importStatusLabel: mediaStatus.label,
    importStatusMessage: mediaStatus.message,
    importStatusNextAction: mediaStatus.nextAction,
    mediaStatus,
  };
}

function listeningImportError(message, status = 422, code = 'source_link_only') {
  const error = new Error(message);
  error.status = status;
  error.importStatusCode = code;
  return error;
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 IELTS-Writing-Lab local importer',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonAfter(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const braceStart = text.indexOf('{', start + marker.length);
  if (braceStart < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = braceStart; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(braceStart, i + 1);
    }
  }
  return null;
}

function extractYouTubeId(input) {
  let parsed;
  try { parsed = new URL(input); } catch { return ''; }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || '';
  if (!host.endsWith('youtube.com')) return '';
  if (parsed.searchParams.get('v')) return parsed.searchParams.get('v') || '';
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1] || '';
  return '';
}

function parseYouTubeJson3(raw) {
  const data = JSON.parse(raw);
  return (data.events || [])
    .filter((event) => Array.isArray(event.segs))
    .map((event, index) => {
      const text = decodeHtml(event.segs.map((seg) => seg.utf8 || '').join(''));
      const start = Number(event.tStartMs || 0) / 1000;
      const end = start + (Number(event.dDurationMs || 0) / 1000 || 0);
      return { id: `yt-${index + 1}`, start, end: end > start ? end : null, speaker: '', text };
    })
    .filter((seg) => seg.text);
}

function parseYouTubeXml(raw) {
  const segments = [];
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let match;
  while ((match = re.exec(raw))) {
    const attrs = match[1] || '';
    const text = decodeHtml(match[2].replace(/<[^>]+>/g, ''));
    const start = Number((attrs.match(/\bstart="([^"]+)"/) || [])[1]);
    const dur = Number((attrs.match(/\bdur="([^"]+)"/) || [])[1]);
    if (Number.isFinite(start) && text) {
      segments.push({ id: `yt-${segments.length + 1}`, start, end: Number.isFinite(dur) ? start + dur : null, speaker: '', text });
    }
  }
  return segments;
}

async function importYouTubeTranscript(inputUrl) {
  const videoId = extractYouTubeId(inputUrl);
  if (!videoId) throw new Error('Could not read YouTube video id.');
  const watchHtml = await fetchText(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`);
  const playerJson = extractJsonAfter(watchHtml, 'ytInitialPlayerResponse');
  if (!playerJson) throw new Error('Could not read YouTube player metadata.');
  const player = JSON.parse(playerJson);
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) throw new Error('This YouTube video does not expose captions to the local importer.');
  const track = tracks.find((t) => String(t.languageCode || '').toLowerCase().startsWith('en')) || tracks[0];
  const separator = track.baseUrl.includes('?') ? '&' : '?';
  let captionRaw = await fetchText(`${track.baseUrl}${separator}fmt=json3`);
  let segments = [];
  try {
    segments = parseYouTubeJson3(captionRaw);
  } catch {
    captionRaw = await fetchText(track.baseUrl);
    segments = parseYouTubeXml(captionRaw);
  }
  if (!segments.length) throw new Error('Captions were found, but could not be parsed.');
  return {
    ok: true,
    sourceType: 'youtube',
    ...listeningImportStatus('transcript_only'),
    title: player?.videoDetails?.title || 'YouTube import',
    sourceUrl: inputUrl,
    audioUrl: '',
    transcript: segmentsToTranscript(segments),
    transcriptSegments: segments,
    source: {
      sourceName: 'YouTube',
      license: 'youtube_terms_personal_use',
      usage: 'personal_non_commercial_study',
      commercialUseAllowed: false,
      redistributionAllowed: false,
      attribution: inputUrl,
    },
    warnings: ['Imported captions are for personal local study. Do not redistribute unless you have rights.'],
  };
}

function titleFromHtml(html, fallback) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return decodeHtml(og[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? decodeHtml(title[1].replace(/\s*\|\s*TED.*$/i, '')) : fallback;
}

function collectTedCues(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((item) => collectTedCues(item, out));
    return out;
  }
  const text = value.text || value.content || value.subtitle || value.caption;
  const start = value.startTime ?? value.start_time ?? value.start ?? value.time ?? value.startMs;
  if (typeof text === 'string' && start !== undefined && start !== null) {
    const numeric = Number(start);
    if (Number.isFinite(numeric)) {
      out.push({
        id: `ted-${out.length + 1}`,
        start: numeric > 10000 ? numeric / 1000 : numeric,
        end: null,
        speaker: '',
        text: decodeHtml(text.replace(/<[^>]+>/g, '')),
      });
    }
  }
  Object.values(value).forEach((item) => collectTedCues(item, out));
  return out;
}

async function importTedTranscript(inputUrl) {
  const parsed = new URL(inputUrl);
  const parts = parsed.pathname.split('/').filter(Boolean);
  const talkIndex = parts.indexOf('talks');
  const slug = talkIndex >= 0 ? parts[talkIndex + 1] : '';
  const urls = [];
  if (slug) {
    urls.push(`https://www.ted.com/talks/${slug}/transcript.json?language=en`);
    urls.push(`https://www.ted.com/talks/${slug}/transcript?language=en`);
  }
  urls.push(inputUrl);

  let html = '';
  let title = 'TED import';
  for (const candidate of urls) {
    try {
      const raw = await fetchText(candidate);
      if (candidate.endsWith('.json?language=en') || raw.trim().startsWith('{')) {
        const data = JSON.parse(raw);
        let segments = collectTedCues(data);
        if (segments.length) {
          segments = segments.map((seg, i) => ({ ...seg, end: segments[i + 1]?.start ?? null }));
          return {
            ok: true,
            sourceType: 'ted',
            ...listeningImportStatus('transcript_only'),
            title: data.title || 'TED import',
            sourceUrl: inputUrl,
            audioUrl: '',
            transcript: segmentsToTranscript(segments),
            transcriptSegments: segments,
            source: {
              sourceName: 'TED',
              license: 'CC-BY-NC-ND / TED terms',
              usage: 'personal_non_commercial_study',
              commercialUseAllowed: false,
              redistributionAllowed: false,
              attribution: inputUrl,
            },
            warnings: ['TED content is non-commercial and no-derivatives. Keep imports private/local.'],
          };
        }
      }
      html = raw;
      title = titleFromHtml(html, title);
      const nextData = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextData) {
        const data = JSON.parse(decodeHtml(nextData[1]));
        let segments = collectTedCues(data);
        if (segments.length) {
          segments = segments.map((seg, i) => ({ ...seg, end: segments[i + 1]?.start ?? null }));
          return {
            ok: true,
            sourceType: 'ted',
            ...listeningImportStatus('transcript_only'),
            title,
            sourceUrl: inputUrl,
            audioUrl: '',
            transcript: segmentsToTranscript(segments),
            transcriptSegments: segments,
            source: {
              sourceName: 'TED',
              license: 'CC-BY-NC-ND / TED terms',
              usage: 'personal_non_commercial_study',
              commercialUseAllowed: false,
              redistributionAllowed: false,
              attribution: inputUrl,
            },
            warnings: ['TED content is non-commercial and no-derivatives. Keep imports private/local.'],
          };
        }
      }
    } catch {
      // Try the next TED URL shape.
    }
  }
  throw new Error('Could not find a readable TED transcript. Open the TED transcript page and paste it manually.');
}

async function importListeningUrl(input) {
  let parsed;
  try { parsed = new URL(String(input || '').trim()); } catch { throw new Error('Enter a valid http(s) URL.'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http(s) URLs are supported.');
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (isDirectAudioUrl(parsed.href)) {
    return {
      ok: true,
      sourceType: 'direct_audio',
      ...listeningImportStatus('real_audio'),
      title: path.basename(parsed.pathname) || 'Direct audio import',
      sourceUrl: parsed.href,
      audioUrl: parsed.href,
      transcript: '',
      transcriptSegments: [],
      source: {
        sourceName: 'Direct audio URL',
        license: 'user_provided_personal_use',
        usage: 'personal_non_commercial_study',
        commercialUseAllowed: false,
        redistributionAllowed: false,
        attribution: parsed.href,
      },
      warnings: ['Direct audio was attached. Paste or fetch a transcript separately to generate questions.'],
    };
  }
  if (host === 'youtu.be' || host.endsWith('youtube.com')) return importYouTubeTranscript(parsed.href);
  if (host.endsWith('ted.com')) return importTedTranscript(parsed.href);
  if (host.endsWith('spotify.com')) {
    throw listeningImportError('Spotify transcripts usually require an authenticated browser session. Use the Spotify transcript downloader/extension, then paste the transcript here.');
  }
  throw listeningImportError('Unsupported source. Use YouTube captions, TED transcript pages, direct audio files, or paste the transcript manually.');
}

async function handleListeningImport(req, res) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    const raw = await readRequestBody(req);
    const body = JSON.parse(raw || '{}');
    const imported = await importListeningUrl(body.url);
    sendJson(res, 200, imported);
  } catch (error) {
    sendJson(res, error.status || 500, { ok: false, error: error.message, ...(error.importStatusCode ? listeningImportStatus(error.importStatusCode) : {}) });
  }
}

// ─── MarkItDown document-to-markdown endpoint ─────────────────────────────────
// POST /api/markitdown — body: JSON { filename: string, data: base64-string }
// Returns: JSON { markdown: string, filename: string }
// Requires the in-project markitdown-venv (run node scripts/setup-markitdown.mjs once).
// Resolved PER REQUEST (not at startup) so the venv can be created after the
// server is already running, without needing a restart.
const MARKITDOWN_SETUP_HINT = 'Create the in-project MarkItDown venv: from the project folder run  node scripts/setup-markitdown.mjs';

function resolveMarkitdownPython() {
  const candidates = [
    // IN-PROJECT first (self-contained — moves with the project): <root>/markitdown-venv
    path.join(root, 'markitdown-venv', 'Scripts', 'python.exe'), // Windows
    path.join(root, 'markitdown-venv', 'bin', 'python'),         // macOS/Linux
    // Legacy/external fallbacks
    path.join('D:', 'Downloads', 'markitdown-venv', 'Scripts', 'python.exe'),
    path.join(os.homedir(), '.venv', 'Scripts', 'python.exe'),
  ];
  return candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } })
    || null;
}

function cleanMarkitdownStderr(stderr = '') {
  return String(stderr)
    .split(/\r?\n/)
    .filter(line => !/RuntimeWarning|warn\(/i.test(line))
    .join('\n')
    .trim();
}

async function handleMarkItDown(req, res) {
  if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method not allowed' }); return; }
  let tmpPath = null;
  try {
    const body = JSON.parse(await readRequestBody(req));
    const { filename, data } = body;
    if (!filename || !data) { sendJson(res, 400, { error: 'filename and data (base64) required' }); return; }

    // Sanitise filename: keep only the basename + extension, no path traversal.
    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    tmpPath = path.join(os.tmpdir(), `mid-${Date.now()}-${safeName}`);
    fs.writeFileSync(tmpPath, Buffer.from(data, 'base64'));

    const markdown = await new Promise((resolve, reject) => {
      const markitdownPython = resolveMarkitdownPython();
      if (!markitdownPython) {
        reject(new Error(`Cannot find MarkItDown Python. ${MARKITDOWN_SETUP_HINT}.`));
        return;
      }
      const proc = spawn(markitdownPython, ['-m', 'markitdown', tmpPath]);
      let out = '', err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('error', e => reject(new Error(`Cannot start markitdown: ${e.message}. ${MARKITDOWN_SETUP_HINT}.`)));
      proc.on('close', code => {
        if (code === 0) resolve(out);
        else {
          const cleaned = cleanMarkitdownStderr(err);
          reject(new Error(`${cleaned || `markitdown exited ${code}`}. ${MARKITDOWN_SETUP_HINT}.`));
        }
      });
    });

    sendJson(res, 200, { markdown: markdown.trim(), filename: safeName });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch {} }
  }
}
// ──────────────────────────────────────────────────────────────────────────────

async function handleAIProxy(req, res) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    const raw = await readRequestBody(req);
    const body = JSON.parse(raw || '{}');
    const target = new URL(String(body.url || ''));
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Only http(s) provider URLs are allowed.');
    const headers = {};
    const allowed = new Set([
      'content-type',
      'authorization',
      'x-api-key',
      'anthropic-version',
      'anthropic-dangerous-direct-browser-access',
      'anthropic-beta',
      'http-referer',
      'x-title',
    ]);
    for (const [key, value] of Object.entries(body.headers || {})) {
      const lower = key.toLowerCase();
      if (allowed.has(lower)) headers[key] = String(value);
    }
    const upstream = await fetch(target.href, {
      method: body.method || 'POST',
      headers,
      body: typeof body.body === 'string' ? body.body : JSON.stringify(body.body || {}),
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    });
    res.end(text);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);

  if (url.pathname === '/api/markitdown') {
    await handleMarkItDown(req, res);
    return;
  }

  if (url.pathname === '/api/ai-proxy') {
    await handleAIProxy(req, res);
    return;
  }

  if (url.pathname === '/api/listening/import-url') {
    await handleListeningImport(req, res);
    return;
  }

  if (url.pathname === '/api/storage') {
    try {
      if (req.method === 'GET') {
        if (!fs.existsSync(storageFile)) {
          sendJson(res, 200, { exists: false, path: 'data/app-state.json' });
          return;
        }
        const raw = fs.readFileSync(storageFile, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(raw);
        return;
      }

      if (req.method === 'POST') {
        const raw = await readRequestBody(req);
        const data = JSON.parse(raw || '{}');
        const payload = {
          ...data,
          exists: true,
          savedAt: new Date().toISOString(),
          path: 'data/app-state.json',
        };
        fs.mkdirSync(storageDir, { recursive: true });
        const tmpFile = `${storageFile}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
        fs.renameSync(tmpFile, storageFile);
        sendJson(res, 200, { ok: true, path: 'data/app-state.json', savedAt: payload.savedAt });
        return;
      }

      sendJson(res, 405, { error: 'Method not allowed' });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  let requested;
  try {
    requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }
  const filePath = path.resolve(root, `.${requested}`);

  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime.get(path.extname(filePath)) || 'application/octet-stream',
      // Local dev server: never serve a stale build. Force revalidation each load.
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`IELTS Writing Lab running at http://localhost:${port}`);
  console.log(`Folder storage: ${storageFile}`);
});
