// API LAYER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PRESETS = {
  // — Confirmed working from Vietnam (email/OAuth signup, no phone) —
  gemini:{name:"Gemini",url:"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",model:"gemini-2.0-flash",format:"gemini",link:"https://aistudio.google.com/apikey"},
  gemini_pro:{name:"Gemini 2.5 Pro",url:"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",model:"gemini-2.5-pro",format:"gemini",link:"https://aistudio.google.com/apikey"},
  groq:{name:"Groq",url:"https://api.groq.com/openai/v1/chat/completions",model:"llama-3.3-70b-versatile",format:"openai",link:"https://console.groq.com/keys"},
  ollama:{name:"Local Ollama",url:"http://localhost:11434/v1/chat/completions",model:"ielts-fighter",format:"openai",link:"",defaultKey:"ollama"},
  openrouter:{name:"OpenRouter",url:"https://openrouter.ai/api/v1/chat/completions",model:"meta-llama/llama-3.3-70b-instruct:free",format:"openai",link:"https://openrouter.ai/keys"},
  // — Chinese providers (accept international users) —
  zhipu:{name:"Zhipu GLM",url:"https://open.bigmodel.cn/api/paas/v4/chat/completions",model:"glm-4-flash",format:"openai",link:"https://open.bigmodel.cn/usercenter/apikeys"},
  deepseek:{name:"DeepSeek",url:"https://api.deepseek.com/v1/chat/completions",model:"deepseek-chat",format:"openai",link:"https://platform.deepseek.com/api_keys"},
  kimi:{name:"Kimi (Moonshot)",url:"https://api.moonshot.cn/v1/chat/completions",model:"moonshot-v1-8k",format:"openai",link:"https://platform.moonshot.cn/console/api-keys"},
  // — Likely require US phone / verification (may be blocked from VN) —
  together:{name:"Together AI",url:"https://api.together.xyz/v1/chat/completions",model:"meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",format:"openai",link:"https://api.together.xyz/settings/api-keys"},
  nvidia:{name:"NVIDIA NIM",url:"https://integrate.api.nvidia.com/v1/chat/completions",model:"meta/llama-3.3-70b-instruct",format:"openai",link:"https://build.nvidia.com/explore/discover"},
  hyperbolic:{name:"Hyperbolic",url:"https://api.hyperbolic.xyz/v1/chat/completions",model:"meta-llama/Meta-Llama-3.1-405B-Instruct",format:"openai",link:"https://app.hyperbolic.xyz/settings"},
  cerebras:{name:"Cerebras",url:"https://api.cerebras.ai/v1/chat/completions",model:"llama-3.3-70b",format:"openai",link:"https://cloud.cerebras.ai/platform/"},
  sambanova:{name:"SambaNova",url:"https://api.sambanova.ai/v1/chat/completions",model:"Meta-Llama-3.1-405B-Instruct",format:"openai",link:"https://cloud.sambanova.ai/apis"},
  mistral:{name:"Mistral AI",url:"https://api.mistral.ai/v1/chat/completions",model:"mistral-large-latest",format:"openai",link:"https://console.mistral.ai/api-keys"},
  anthropic:{name:"Anthropic Claude",url:"https://api.anthropic.com/v1/messages",model:"claude-sonnet-4-5",format:"anthropic",link:"https://console.anthropic.com/settings/keys"},
  xai:{name:"xAI Grok",url:"https://api.x.ai/v1/chat/completions",model:"grok-3-mini",format:"openai",link:"https://console.x.ai/"},
  openai:{name:"OpenAI",url:"https://api.openai.com/v1/chat/completions",model:"gpt-4o-mini",format:"openai",link:"https://platform.openai.com/api-keys"},
  custom:{name:"Custom",url:"",model:"",format:"openai",link:""}
};

function inferAPIFormatFromUrl(url, fallback="openai") {
  const u = String(url||"").toLowerCase();
  if (u.includes("generativelanguage.googleapis.com")) return "gemini";
  if (u.includes("api.anthropic.com") || /\/v1\/messages(?:\?|$)/.test(u)) return "anthropic";
  if (u.includes("/chat/completions") || u.includes("api.openai.com")) return "openai";
  return fallback || "openai";
}

function normalizeAPIConfig(config={}) {
  const preset = Object.values(PRESETS).find(p=>p.url && p.url===config.url);
  const fallbackFormat = config.format || preset?.format || "openai";
  return {
    ...config,
    url: String(config.url || preset?.url || "").trim(),
    model: String(config.model || preset?.model || "").trim(),
    key: String(config.key || "").trim(),
    format: inferAPIFormatFromUrl(config.url || preset?.url || "", fallbackFormat)
  };
}

function canUseAIProxyForUrl(url) {
  try {
    if (typeof location === "undefined" || !location.protocol.startsWith("http")) return false;
    if (!["localhost","127.0.0.1","::1"].includes(location.hostname)) return false;
    const target = new URL(url);
    if (!["http:","https:"].includes(target.protocol)) return false;
    return target.origin !== location.origin;
  } catch { return false; }
}

function proxyFetchOptions(fetchUrl, opts) {
  return {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({url:fetchUrl,method:opts.method,headers:opts.headers,body:opts.body}),
    signal:opts.signal
  };
}

// ─── Gemini rate-limit defense ────────────────────────────────────────────────
// Free tier limits:
//   gemini-2.0-flash : 15 RPM  (1 req / 4 s) — 1500 RPD, 1M TPM
//   gemini-2.5-pro   :  5 RPM  (1 req / 12s) —   25 RPD  ← very tight
// Strategy: pro-active minimum gap between calls so we never hit RPM;
//           if we still get 429, auto-retry with exponential back-off
//           before surfacing the error (transparent to all call sites).

const _GEMINI_GAP = {  // ms between calls per model
  "gemini-2.5-pro":  13000,   // 5 RPM → 1 per 12s; use 13s to be safe
  "gemini-2.5-flash": 5000,
  default:            4400    // 15 RPM → 1 per 4s; use 4.4s
};
let _gemLastCallMs = 0;
let _gemChain = Promise.resolve(); // serialise concurrent Gemini calls

async function _geminiThrottle(model) {
  const gap = _GEMINI_GAP[model] || _GEMINI_GAP.default;
  // Chain onto the previous slot so concurrent callers don't both rush through
  const prev = _gemChain;
  let done; _gemChain = new Promise(r => done = r);
  await prev;
  const wait = gap - (Date.now() - _gemLastCallMs);
  if (wait > 20) await new Promise(r => setTimeout(r, wait));
  _gemLastCallMs = Date.now();
  done();
}
// ──────────────────────────────────────────────────────────────────────────────

function normalizeAnthropicMessages(messages) {
  const out = [];
  (messages||[]).filter(m=>m.role!=="system").forEach(m=>{
    const role = m.role==="assistant" ? "assistant" : "user";
    const content = String(m.content||"");
    const prev = out[out.length-1];
    if (prev && prev.role===role) prev.content += "\n\n" + content;
    else out.push({role,content});
  });
  return out.length ? out : [{role:"user",content:""}];
}

// ─── Provider failover ────────────────────────────────────────────────────────
// The app registers ALL saved configs so callAPI can transparently fall through to
// another provider when the active one is rate-limited, has a bad key, or is down —
// so AI-dependent tasks (grading, generation, reading-upload) never get interrupted.
// A provider that fails with a switchable error is put on a short cooldown so we
// skip it for a while instead of paying its latency on every call.
let _failoverConfigs = [];     // all saved config objects (each may carry a key)
let _failoverActiveId = null;  // id of the user's chosen Active provider
let _failoverEnabled = true;   // toggle (state.apiFailover !== false)
const _providerCooldown = new Map(); // cooldown-key → epoch ms until which to skip

function registerFailoverConfigs(configs, activeId, opts={}) {
  _failoverConfigs = Array.isArray(configs) ? configs.filter(Boolean) : [];
  if (activeId !== undefined) _failoverActiveId = activeId;
  if (typeof opts.enabled === "boolean") _failoverEnabled = opts.enabled;
}
function setFailoverEnabled(on) { _failoverEnabled = !!on; }
function _cdKey(cfg) { const n = normalizeAPIConfig(cfg); return n.url+"|"+n.model+"|"+n.key; }
function _onCooldown(cfg) { const u = _providerCooldown.get(_cdKey(cfg)); return !!(u && Date.now() < u); }
function _setCooldown(cfg, e) {
  const m = String(e&&e.message||"");
  let ms = 30000;
  if (e && e.nonRetryable) ms = 10*60*1000;                          // e.g. Gemini 0-quota
  else if (/Invalid API key \(40[13]\)/.test(m)) ms = 5*60*1000;     // bad/forbidden key
  else if (/Rate limited \(429\)/.test(m)) ms = 60*1000;             // rate limit
  else if (/Model\/URL not found \(404\)/.test(m)) ms = 10*60*1000;  // wrong model
  else if (/Provider server error|Network error|timed out/i.test(m)) ms = 30*1000;
  _providerCooldown.set(_cdKey(cfg), Date.now()+ms);
}

// Errors that mean "this provider can't serve right now → try another".
function _isSwitchableError(e) {
  if (e && e.nonRetryable) return true;
  const m = String(e&&e.message||"");
  return /Rate limited \(429\)|Invalid API key \(40[13]\)|Provider server error \(5\d\d\)|Network error|timed out|Empty (?:Gemini|Anthropic) response|No content in response|Invalid JSON response|Model\/URL not found \(404\)/i.test(m);
}

// Ordered, de-duplicated list of usable providers: the call's own config first, then
// the registered Active one, then the rest. Providers on cooldown are pushed to the
// back (still tried as a last resort so we never give up while any provider exists).
function _failoverCandidates(primary) {
  const seen = new Set(), fresh = [], cooled = [];
  const add = (c) => {
    if (!c) return;
    const n = normalizeAPIConfig(c);
    if (!n.url || !n.key) return;
    const id = _cdKey(c);
    if (seen.has(id)) return;
    seen.add(id);
    (_onCooldown(c) ? cooled : fresh).push(c);
  };
  add(primary);
  if (_failoverEnabled) {
    add(_failoverConfigs.find(c=>c && c.id===_failoverActiveId));
    _failoverConfigs.forEach(add);
  }
  return fresh.concat(cooled);
}

function _provName(cfg) { return (cfg && cfg.name) || normalizeAPIConfig(cfg).model || "another provider"; }

async function callAPI(config, messages, maxTokens=2000, temperature=0.7, opts={}) {
  // noFailover: used by the Settings "Test" buttons so a bad key surfaces instead of
  // being silently masked by switching to another provider.
  if (opts && opts.noFailover) return _callProvider(config, messages, maxTokens, temperature);
  const candidates = _failoverCandidates(config);
  if (!candidates.length) {
    // Preserve the original single-provider error behaviour.
    const cfg = normalizeAPIConfig(config);
    if (!cfg.url || !cfg.key) throw new Error("Missing URL or API key");
    return _callProvider(config, messages, maxTokens, temperature);
  }
  let lastErr = null;
  for (let i=0;i<candidates.length;i++) {
    const cand = candidates[i];
    try {
      const out = await _callProvider(cand, messages, maxTokens, temperature);
      if (i>0) { // we switched away from the originally-requested provider
        try { document.dispatchEvent(new CustomEvent("ielts-api-failover", {
          bubbles:true, detail:{ now:_provName(cand), from:_provName(candidates[0]) }
        })); } catch{}
      }
      return out;
    } catch(e) {
      lastErr = e;
      if (_isSwitchableError(e)) _setCooldown(cand, e);
      const hasNext = i < candidates.length-1;
      if (hasNext && _isSwitchableError(e)) {
        const next = candidates[i+1];
        console.warn(`[failover] ${_provName(cand)} failed (${e.message}) → switching to ${_provName(next)}`);
        try { document.dispatchEvent(new CustomEvent("ielts-api-failover-try", {
          bubbles:true, detail:{ failed:_provName(cand), reason:String(e.message||"").slice(0,120), next:_provName(next) }
        })); } catch{}
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("All configured providers failed");
}

async function _callProvider(config, messages, maxTokens=2000, temperature=0.7) {
  const cfg = normalizeAPIConfig(config);
  const {url,model,key,format} = cfg;
  if (!url||!key) throw new Error("Missing URL or API key");

  // Gemini: throttle first, then retry up to 2× on 429 with backoff.
  if (format === "gemini") {
    await _geminiThrottle(model);
    const RETRY_DELAYS = [10000, 35000]; // 10s → 35s
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        return await _callAPIOnce(cfg, messages, maxTokens, temperature);
      } catch(e) {
        const is429 = e.message.includes("Rate limited (429)") && !e.nonRetryable;
        if (is429 && attempt < RETRY_DELAYS.length) {
          const delaySec = Math.round(RETRY_DELAYS[attempt] / 1000);
          console.info(`[Gemini] 429 — auto-retry ${attempt+1}/2 in ${delaySec}s…`);
          // Broadcast so any UI layer can show a "Retrying…" notice
          try { document.dispatchEvent(new CustomEvent("ielts-api-retry", {
            bubbles:true, detail:{provider:"Gemini", delaySec, attempt:attempt+1}
          })); } catch{}
          await _geminiThrottle(model); // re-enter the queue after waiting
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        throw e;
      }
    }
  }
  return _callAPIOnce(cfg, messages, maxTokens, temperature);
}

async function _callAPIOnce(config, messages, maxTokens=2000, temperature=0.7) {
  const {url,model,key,format} = normalizeAPIConfig(config);
  if (!url||!key) throw new Error("Missing URL or API key");
  let fetchUrl, opts;
  const sysMsg = messages.find(m=>m.role==="system");
  const userMsgs = messages.filter(m=>m.role!=="system");
  // 60s timeout — protects UI from hanging providers (especially free tiers under load)
  const ctrl = new AbortController();
  const timeoutId = setTimeout(()=>ctrl.abort(), 60000);
  if (format==="gemini") {
    // Combine system + user into single text block (Gemini handles single-part content best)
    const combined = (sysMsg ? sysMsg.content+"\n\n" : "") + userMsgs.map(m=>m.content).join("\n\n");
    fetchUrl = `${url}${url.includes("?")?"&":"?"}key=${key}`;
    opts = {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:combined}]}],generationConfig:{temperature,maxOutputTokens:maxTokens}}),signal:ctrl.signal};
  } else if (format==="anthropic") {
    fetchUrl = url;
    const body = {model,max_tokens:maxTokens,messages:normalizeAnthropicMessages(messages)};
    if (sysMsg) body.system = sysMsg.content;
    opts = {method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body),signal:ctrl.signal};
  } else {
    fetchUrl = url;
    opts = {method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model,messages,max_tokens:maxTokens,temperature}),signal:ctrl.signal};
  }
  let res;
  try {
    const useProxy = canUseAIProxyForUrl(fetchUrl);
    res = await fetch(useProxy ? "/api/ai-proxy" : fetchUrl, useProxy ? proxyFetchOptions(fetchUrl, opts) : opts);
  } catch(e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('Request timed out after 60s — provider too slow or unreachable. Try again or switch provider.');
    // Network-level error (CORS, DNS, offline)
    const directFile = typeof location !== "undefined" && location.protocol === "file:";
    throw new Error(`Network error: ${e.message}. ${directFile ? "index.html double-click mode cannot use the local proxy; use Gemini/Anthropic direct if available, or run node scripts/serve.mjs for OpenAI/Custom providers that block browser CORS." : "If direct browser fetch is blocked, run node scripts/serve.mjs and open http://localhost:5173 so the app can use its local provider proxy."}`);
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    let errText = "";
    try { errText = await res.text(); } catch {}
    const snippet = errText.slice(0,180).replace(/\n/g," ");
    if (res.status===401||res.status===403) { let _host=""; try{_host=new URL(url).host;}catch{} throw new Error(`Invalid API key (${res.status}) for the ACTIVE provider${model?` "${model}"`:""}${_host?` @ ${_host}`:""}. In Settings, make sure THIS provider is the one set as Active (the ✓ / highlighted one) — clicking "Test" on a provider does NOT make it active — and that its saved key is valid. ${snippet?"· "+snippet:""}`); }
    if (res.status===429) {
      let hint = "";
      const isQuotaIssue = /insufficient[_ ]quota|exceeded.*quota|billing|payment|credits?\s*(left|remaining|exhausted)|no credits/i.test(errText);
      const isGeminiZeroQuota = url.includes("generativelanguage.googleapis.com") && /limit:\s*0|GenerateRequestsPerDayPerProjectPerModel-FreeTier/i.test(errText) && /free[_ ]tier|generate_content_free_tier/i.test(errText);
      if (url.includes("api.openai.com")) hint = isQuotaIssue ? "OpenAI quota exhausted — add billing at platform.openai.com/account/billing OR use Gemini (free)" : "OpenAI rate limit — wait 20s";
      else if (url.includes("openrouter.ai")) hint = "OpenRouter free tier is very limited (50 req/day if no credits). Try Gemini directly OR add $5+ credits to OpenRouter";
      else if (url.includes("groq.com")) hint = "Groq rate limit (30 req/min on free tier) — wait 60s OR switch to Together AI / NVIDIA NIM";
      else if (url.includes("api.cerebras.ai")) hint = "Cerebras rate limit — free tier ~1M tokens/day. Wait or switch to Gemini";
      else if (url.includes("api.sambanova.ai")) hint = "SambaNova rate limit (free tier ~10 rpm) — wait 60s OR try Gemini";
      else if (url.includes("api.together.xyz")) hint = "Together AI: free Llama-3.3-70B-Instruct-Turbo-Free has ~60 rpm limit. Wait or top up $1+";
      else if (url.includes("integrate.api.nvidia.com")) hint = "NVIDIA NIM: free 1000 credits/account. Check usage at build.nvidia.com OR switch to Gemini";
      else if (url.includes("api.hyperbolic.xyz")) hint = isQuotaIssue ? "Hyperbolic free credits exhausted — top up at app.hyperbolic.xyz/billing" : "Hyperbolic rate limit — wait 30s";
      else if (url.includes("api.anthropic.com")) hint = isQuotaIssue ? "Anthropic credit balance low — top up at console.anthropic.com/settings/billing" : "Anthropic burst limit — wait 30s";
      else if (url.includes("api.mistral.ai")) hint = "Mistral rate limit (free experimental tier ~1 rpm) — wait 60s OR add payment";
      else if (url.includes("api.x.ai")) hint = isQuotaIssue ? "xAI credits exhausted — top up at console.x.ai" : "xAI rate limit — wait 30s";
      else if (url.includes("open.bigmodel.cn")) hint = "Zhipu GLM: free model glm-4-flash has rate limits — wait 60s OR switch to Gemini";
      else if (url.includes("api.moonshot.cn")) hint = "Kimi account balance = 0 — nạp tiền tại platform.moonshot.cn/fee. Hoặc dùng Gemini (miễn phí)";
      else if (url.includes("deepseek.com")) hint = "DeepSeek balance issue — check platform.deepseek.com/usage";
      else if (url.includes("generativelanguage.googleapis.com")) {
        if (isGeminiZeroQuota) hint = "Gemini key was accepted, but this Google project currently has 0 usable generate quota. Check Google AI Studio quota/billing, enable quota for the project, create a key from another project, or switch provider.";
        else if (model && model.includes("2.5-pro")) hint = "Gemini 2.5 Pro quota hit — free tier is only 5 RPM + 25 req/day total. Switch to Gemini 2.0 Flash (same key, 15 RPM + 1500 req/day — much better for multi-step tasks)";
        else hint = "Gemini 2.0 Flash rate limit — auto-retry failed after 2 attempts (all 3 attempts hit 15 req/min). Wait ~60s then retry, or the app is making too many calls in one minute";
      }
      else hint = isQuotaIssue ? "Quota/billing issue — check provider account" : "Burst rate limit — wait 30s and retry";
      const err = new Error(`Rate limited (429) · ${hint} · response: ${snippet}`);
      if (isGeminiZeroQuota) err.nonRetryable = true;
      throw err;
    }
    if (res.status===404) throw new Error(`Model/URL not found (404). Model "${model}" may be deprecated. ${snippet?"· "+snippet:""}`);
    if (res.status===400) throw new Error(`Bad request (400) · ${snippet}`);
    if (res.status>=500) throw new Error(`Provider server error (${res.status}). Try again or switch provider.`);
    throw new Error(`API ${res.status} · ${snippet}`);
  }
  let d;
  try { d = await res.json(); }
  catch(e) { throw new Error(`Invalid JSON response: ${e.message}`); }
  if (format==="gemini") {
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const block = d.promptFeedback?.blockReason || d.candidates?.[0]?.finishReason;
      throw new Error(`Empty Gemini response${block?` (${block})`:""}`);
    }
    return text;
  }
  if (format==="anthropic") {
    const at = Array.isArray(d.content) ? d.content.filter(b=>b && (b.type==="text"||b.text)).map(b=>b.text||"").join("") : "";
    if (!at) throw new Error(`Empty Anthropic response${d.stop_reason?` (${d.stop_reason})`:""}.`);
    return at;
  }
  const msg = d.choices?.[0]?.message || {};
  // Some reasoning models (e.g. Groq gpt-oss) can leave message.content empty and put the
  // answer in reasoning_content/reasoning — fall back to those before erroring.
  let content = msg.content;
  if ((content==null || content==="") && (msg.reasoning_content || msg.reasoning)) content = msg.reasoning_content || msg.reasoning;
  if (content==null || content==="") throw new Error(`No content in response. Body: ${JSON.stringify(d).slice(0,150)}`);
  return content;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCAL IELTS-FIGHTER GRADER — fine-tuned Mistral-7B QLoRA served by Ollama
// Full-replacement writing grader: when the local model is reachable, essay
// grading routes here (its bands are produced by a model fine-tuned on 9k+
// IELTS essays). Falls back automatically to the cloud `config` grader when the
// local server is unreachable, disabled, or returns unparseable output.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LOCAL_GRADER_URL_DEFAULT = "http://localhost:11434/v1/chat/completions";
const LOCAL_GRADER_MODEL = "ielts-fighter";

function localGraderUrl(state) {
  const u = state && typeof state.localGraderUrl==="string" && state.localGraderUrl.trim();
  return u || LOCAL_GRADER_URL_DEFAULT;
}
function localGraderEnabled(state) {
  // Default ON (full replacement). User can switch off in Settings.
  return !state || state.useLocalGrader !== false;
}

// Session-cached health probe so machines without Ollama pay at most one quick
// check (and re-check at most every 20s). Connection-refused resolves fast.
let _localGraderHealth = { url:null, ok:false, ts:0 };
async function localGraderHealthy(state) {
  if (!localGraderEnabled(state)) return false;
  const url = localGraderUrl(state);
  const now = Date.now();
  if (_localGraderHealth.url===url && (now-_localGraderHealth.ts)<20000) return _localGraderHealth.ok;
  const base = url.replace(/\/v1\/.*$/,"");
  let ok = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 1500);
    const r = await fetch(base+"/api/version", { signal: ctrl.signal });
    clearTimeout(t);
    ok = r.ok;
  } catch { ok = false; }
  _localGraderHealth = { url, ok, ts: now };
  return ok;
}
// Force the next call to re-probe (used by the Settings "Test connection" button).
function resetLocalGraderHealth() { _localGraderHealth = { url:null, ok:false, ts:0 }; }

function localGraderInstruction(taskType, state) {
  const first = taskType==="task2" ? "Task Response" : "Task Achievement";
  const firstPfx = taskType==="task2" ? "TR" : "TA";
  const kind = taskType==="task2" ? "Task 2 essay" : "Task 1 report";
  const styleText = {
    coach: "FEEDBACK STYLE = COACH. Mention one strength before each weakness, explain why each fix helps.",
    direct: "FEEDBACK STYLE = DIRECT. Terse, no filler. State exactly what is wrong.",
    examiner: "FEEDBACK STYLE = EXAMINER. Formal IELTS band-descriptor language, reference descriptors explicitly."
  }[state?.feedbackStyle||"coach"];
  const goalNote = state?.writingGoal ? `\nSTUDENT GOAL: "${state.writingGoal}". Reference this where relevant.` : "";
  const calText = (state && typeof buildMarkingCalibrationText==="function") ? buildMarkingCalibrationText(state) : "";
  const calBlock = calText ? `\n${calText}` : "";
  return `You are a strict but fair IELTS examiner. Assess the IELTS Academic Writing ${kind} below against the exact question/prompt provided.
${styleText}${goalNote}${calBlock}
Output band scores in EXACTLY this format (number 4.0–9.0, half-bands allowed, nothing else on these lines):
${first}: <score>
Coherence and Cohesion: <score>
Lexical Resource: <score>
Grammatical Range and Accuracy: <score>
Overall: <score>
Then write a line beginning "Feedback:" followed by 3-5 specific sentences.
Then a prompt-fit block in EXACTLY this format (compare the essay against the EXACT question — penalize memorised/generic essays, missing parts, or off-topic content):
PROMPTFIT: <one sentence: how well the essay answers THIS exact prompt>
OFFTOPIC: <comma-separated irrelevant/memorised/off-topic parts, or "none">
Then 3-4 task-audit lines in EXACTLY this format:
AUDIT | pass|warning|fail | <audit item> | <specific evidence>
Then per-criterion detail, one line each in EXACTLY this format:
${firstPfx} STRENGTH: <one specific strength sentence>
${firstPfx} WEAKNESS: <one specific weakness sentence>
${firstPfx} WHY NOT HIGHER: <one sentence explaining the band ceiling>
CC STRENGTH: <one sentence>
CC WEAKNESS: <one sentence>
CC WHY NOT HIGHER: <one sentence>
LR STRENGTH: <one sentence>
LR WEAKNESS: <one sentence>
LR WHY NOT HIGHER: <one sentence>
GRA STRENGTH: <one sentence>
GRA WEAKNESS: <one sentence>
GRA WHY NOT HIGHER: <one sentence>
For Lexical Resource: reward natural, accurate collocations, NOT rare words. Flag rare/sophisticated words used in the wrong context or unnatural collocations (e.g. "make a research") as category "collocation" — misused ambitious vocabulary should LOWER the LR band, not raise it.
Then list 3-8 specific mistakes, copy quoted text VERBATIM from the essay:
MISTAKE | <category> | <exact words from essay> | <short fix>
Allowed categories: logic, cohesion, evidence, explanation, vocabulary, collocation, repetition, grammar, coherence
Then tag 2-4 sentences (copy VERBATIM from essay):
ANNOT | strong|improve|error | <exact sentence from essay> | <under 15 words why>
Then ONE personalised drill targeting the weakest criterion, in EXACTLY this format:
DRILL | <short drill title> | <a 10-minute exercise tied to this essay> | <a short worked example under 30 words>
Then up to 4 topic vocabulary items the essay could have used but did not, one per line:
VOCAB | <word or short phrase> | <why it fits this topic>
Then ONE memorised/template risk line (is this a genuine answer to THIS exact prompt, or pre-memorised/template/over-generic?):
MEMRISK | low|medium|high | <comma-separated concrete signals, or "none"> | <one-line note>`;
}

// Tolerant single-line band extraction. Matches "Task Response: 7.5",
// "Band Score (Lexical Resource): 7", "Coherence and Cohesion - 6.5", etc.
function _extractBand(text, labelPattern) {
  const m = text.match(new RegExp(labelPattern+"[^\\d\\n]*?([4-9](?:\\.\\d)?)", "i"));
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) ? Math.round(v*2)/2 : null; // snap to half-band
}

function parseLocalGradeText(text, taskType, essay) {
  const firstKey = taskType==="task2" ? "tr" : "ta";
  const firstLabel = taskType==="task2" ? "Task\\s+Response" : "Task\\s+Achievement";
  const firstPfx = taskType==="task2" ? "TR" : "TA";
  const bands = {
    [firstKey]: _extractBand(text, firstLabel),
    cc: _extractBand(text, "Coherence\\s+and\\s+Cohesion"),
    lr: _extractBand(text, "Lexical\\s+Resource"),
    gra: _extractBand(text, "Grammatical\\s+Range\\s+and\\s+Accuracy")
  };
  const present = Object.values(bands).filter(b=>b!=null);
  if (present.length < 3) throw new Error("could not parse band scores from local model output");
  const avg = Math.round((present.reduce((a,b)=>a+b,0)/present.length)*2)/2;
  Object.keys(bands).forEach(k=>{ if (bands[k]==null) bands[k]=avg; });

  // Per-criterion detail: "TR STRENGTH: ...", "CC WEAKNESS: ...", "LR WHY NOT HIGHER: ..."
  const _line = (pfx, fieldRe) => {
    const m = text.match(new RegExp("^\\s*"+pfx+"\\s+"+fieldRe+"\\s*:\\s*(.+)$","im"));
    return m ? m[1].trim() : "";
  };
  const pfxMap = [[firstPfx, firstKey], ["CC","cc"], ["LR","lr"], ["GRA","gra"]];
  const criteriaDetail = {};
  for (const [pfx, key] of pfxMap) {
    const s = _line(pfx,"STRENGTH"), w = _line(pfx,"WEAKNESS");
    const why = _line(pfx,"WHY\\s*NOT\\s*HIGHER");
    criteriaDetail[key] = {band:bands[key], strengths:s?[s]:[], weaknesses:w?[w]:[], whyNotHigher:why};
  }

  // Mistakes: "MISTAKE | category | exact quote | fix"
  const mistakes = [];
  const reM = /MISTAKE\s*\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|\s*([^\n]+)/gi;
  let mm; while ((mm=reM.exec(text))&&mistakes.length<10) mistakes.push({category:mm[1].trim(),quote:mm[2].trim(),fix:mm[3].trim()});

  // Annotations: "ANNOT | strong|improve|error | exact sentence | comment"
  const annotations = [];
  const reA = /ANNOT\s*\|\s*(strong|improve|error)\s*\|\s*([^|\n]{10,}?)\s*\|\s*([^\n]+)/gi;
  let am; while ((am=reA.exec(text))&&annotations.length<6) annotations.push({sentence:am[2].trim(),tag:am[1].toLowerCase(),comment:am[3].trim()});

  // Prompt fit: "PROMPTFIT: ..." + "OFFTOPIC: a, b" (off-topic detection on the default local path)
  const pfM = text.match(/^\s*PROMPTFIT\s*:\s*(.+)$/im);
  const otM = text.match(/^\s*OFFTOPIC\s*:\s*(.+)$/im);
  let promptFit;
  if (pfM || otM) {
    const offRaw = otM ? otM[1].trim() : "";
    const offTopic = (offRaw && !/^none\.?$/i.test(offRaw)) ? offRaw.split(/\s*[,;]\s*/).map(s=>s.trim()).filter(Boolean) : [];
    promptFit = { summary: pfM ? pfM[1].trim() : "", covered: [], missing: [], offTopic, scoreImpact: "" };
  }

  // Task audit: "AUDIT | pass|warning|fail | item | note"
  const taskAudit = [];
  const reAu = /AUDIT\s*\|\s*(pass|warning|fail)\s*\|\s*([^|\n]+?)\s*\|\s*([^\n]+)/gi;
  let au; while ((au=reAu.exec(text))&&taskAudit.length<6) taskAudit.push({status:au[1].toLowerCase(),label:au[2].trim(),note:au[3].trim()});

  // Personalised drill: "DRILL | title | instruction | example"
  let personalizedDrill;
  const dM = text.match(/^\s*DRILL\s*\|\s*([^|\n]*?)\s*\|\s*([^|\n]+?)\s*\|\s*([^\n]+)$/im);
  if (dM) personalizedDrill = {title:dM[1].trim(), instruction:dM[2].trim(), example:dM[3].trim()};

  // Topic vocabulary the essay could have used: "VOCAB | word | why"
  const topicVocab = [];
  const reV = /^\s*VOCAB\s*\|\s*([^|\n]+?)\s*\|\s*([^\n]+)$/gim;
  let vm; while ((vm=reV.exec(text))&&topicVocab.length<6) topicVocab.push({word:vm[1].trim(), reason:vm[2].trim()});

  // Memorised/template risk: "MEMRISK | low|medium|high | signals | note"
  let memorisedRisk;
  const mrM = text.match(/^\s*MEMRISK\s*\|\s*(low|medium|high)\s*\|\s*([^|\n]*)\|\s*([^\n]+)$/im);
  if (mrM) {
    const sigRaw = mrM[2].trim();
    const signals = (sigRaw && !/^none\.?$/i.test(sigRaw)) ? sigRaw.split(/\s*[,;]\s*/).map(s=>s.trim()).filter(Boolean) : [];
    memorisedRisk = { level: mrM[1].toLowerCase(), signals, note: mrM[3].trim() };
  }

  // Feedback prose — cut before structured sections
  let fb = "";
  const fbM = text.match(/Feedback\s*:?\s*([\s\S]+)$/i);
  if (fbM) {
    let raw = fbM[1];
    const cut = re => { const i = raw.search(re); if (i>-1) raw = raw.slice(0,i); };
    cut(/\n\s*PROMPTFIT\s*:/i);
    cut(/\n\s*OFFTOPIC\s*:/i);
    cut(/\n\s*AUDIT\s*\|/i);
    cut(new RegExp("(?:^|\\n)\\s*(?:"+firstPfx+"|CC|LR|GRA)\\s+(?:STRENGTH|WEAKNESS|WHY)","i"));
    cut(/\n\s*MISTAKE\s*\|/i);
    cut(/\n\s*ANNOT\s*\|/i);
    cut(/\n\s*DRILL\s*\|/i);
    cut(/\n\s*VOCAB\s*\|/i);
    cut(/\n\s*MEMRISK\s*\|/i);
    fb = raw;
  }
  const cleanFb = fb.replace(/\*\*/g,"").replace(/^[-•*]\s*/gm,"").trim();
  const firstLine = s => (s||"").split(/\n/).map(x=>x.trim()).filter(Boolean)[0]||"";
  const strengthM = cleanFb.match(/Strengths?\s*:?\s*([\s\S]*?)(?:Areas?\s+for\s+Improvement|Improvements?|Weakness|$)/i);
  const improveM = cleanFb.match(/(?:Areas?\s+for\s+Improvement|Improvements?|Weakness(?:es)?)\s*:?\s*([\s\S]*)$/i);

  const partial = {
    ...criteriaDetail,
    mistakes,
    annotations,
    overallComment: cleanFb.slice(0,700) || "Graded by the local fine-tuned IELTS examiner model.",
    topStrength: firstLine(strengthM&&strengthM[1]) || criteriaDetail[firstKey]?.strengths?.[0] || undefined,
    topPriority: firstLine(improveM&&improveM[1]) || criteriaDetail[firstKey]?.weaknesses?.[0] || undefined,
    localGraded: true,
    sourceNote: "Graded by the local fine-tuned IELTS examiner model (Mistral-7B QLoRA via Ollama)."
  };
  if (promptFit) partial.promptFit = promptFit;
  if (taskAudit.length) partial.taskAudit = taskAudit;
  if (personalizedDrill) partial.personalizedDrill = personalizedDrill;
  if (topicVocab.length) partial.topicRelevantUnusedAWL = topicVocab;
  if (memorisedRisk) partial.memorisedRisk = memorisedRisk;
  return normalizeWritingExaminerResult(partial, taskType, essay);
}

// Grade ONE essay with the local model. `userContent` is the same question+essay
// block the cloud grader sends as its user message. Throws on connection/parse
// failure so the caller can fall back to the cloud `config` grader.
async function gradeWritingLocal(state, taskType, userContent, essay) {
  const url = localGraderUrl(state);
  const ctrl = new AbortController();
  const timeoutId = setTimeout(()=>ctrl.abort(), 180000);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LOCAL_GRADER_MODEL,
        messages: [
          { role:"system", content: localGraderInstruction(taskType, state) },
          { role:"user", content: userContent }
        ],
        temperature: 0.1, max_tokens: 1900, stream: false
      }),
      signal: ctrl.signal
    });
  } catch(e) {
    clearTimeout(timeoutId);
    throw new Error(e.name==="AbortError" ? "local grader timed out (180s)" : `local grader unreachable: ${e.message}`);
  }
  clearTimeout(timeoutId);
  if (!res.ok) { let t=""; try{t=await res.text();}catch{} throw new Error(`local grader HTTP ${res.status} ${t.slice(0,120)}`); }
  let d; try { d = await res.json(); } catch(e) { throw new Error(`local grader bad JSON: ${e.message}`); }
  const content = d.choices?.[0]?.message?.content;
  if (!content) throw new Error("local grader returned empty content");
  return parseLocalGradeText(content, taskType, essay);
}

// Focused micro-grader for the Theory "Try it" boxes: scores a short attempt at ONE
// skill (not a full essay) and returns { band, feedback, source }.
// Tries local model first; falls back to cloud `config` if local is unavailable or fails.
async function gradeTheoryAttempt(state, concept, attempt, config) {
  const sys = `You are an IELTS writing coach. The student is practising this specific skill:\n"${concept}"\nAssess ONLY their short attempt below for that skill — judge it as a focused exercise, NOT a full essay. Reply in EXACTLY this format and nothing else:\nBand: <number from 4.0 to 9.0>\nFeedback: <2-4 sentences — first what works, then the single most important improvement, quoting their own words>`;
  const _parse = text => {
    const bm = text.match(/Band\s*:?\s*([4-9](?:\.[0-9])?)/i);
    const fm = text.match(/Feedback\s*:?\s*([\s\S]+)$/i);
    return {
      band: bm ? Math.round(parseFloat(bm[1])*2)/2 : null,
      feedback: (fm ? fm[1] : text).replace(/\*\*/g,"").replace(/^\s*[-•*]\s*/gm,"").trim().slice(0,600)
    };
  };
  // Try local first
  if (localGraderEnabled(state)) {
    const url = localGraderUrl(state);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 60000);
      const res = await fetch(url, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({model:LOCAL_GRADER_MODEL, messages:[{role:"system",content:sys},{role:"user",content:attempt}], temperature:0.2, max_tokens:320, stream:false}),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (res.ok) {
        const d = await res.json();
        const text = d.choices?.[0]?.message?.content || "";
        if (text) return { ..._parse(text), source:"local" };
      }
      console.warn("[theory] local grader HTTP", res.status, "— falling back to cloud");
    } catch(e) {
      console.warn("[theory] local grader failed:", e.message, "— falling back to cloud");
    }
  }
  // Cloud fallback
  if (!config) throw new Error("Feedback unavailable: local model offline and no cloud API configured. Go to Settings to add an API key.");
  const raw = await callAPI(config, [{role:"system",content:sys},{role:"user",content:attempt}], 400, 0.7);
  return { ..._parse(raw), source:"cloud" };
}

function extractJSONCandidate(text) {
  const clean = String(text||"")
    .replace(/```(?:json)?/gi,"")
    .replace(/```/g,"")
    .trim();
  const start = clean.search(/[\{\[]/);
  if (start < 0) return clean;
  const open = clean[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i=start;i<clean.length;i++) {
    const c = clean[i];
    if (esc) { esc=false; continue; }
    if (c === "\\") { esc=true; continue; }
    if (c === '"') { inStr=!inStr; continue; }
    if (inStr) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return clean.slice(start,i+1).trim();
    }
  }
  return clean.slice(start).trim();
}

function repairJSONText(text) {
  return String(text||"")
    .replace(/^\uFEFF/,"")
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/,\s*([}\]])/g,"$1")
    .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/g,'$1"$2":')
    .trim();
}

function balanceJSONText(text) {
  let r=String(text||""), braces=0, brackets=0, inStr=false, esc=false;
  for (const c of r) {
    if (esc){esc=false;continue} if (c==='\\'){esc=true;continue}
    if (c==='"'){inStr=!inStr;continue} if (inStr) continue;
    if (c==='{') braces++; else if (c==='}') braces--;
    if (c==='[') brackets++; else if (c===']') brackets--;
  }
  if (inStr) r+='"';
  for (let i=0;i<brackets;i++) r+=']';
  for (let i=0;i<braces;i++) r+='}';
  return r;
}

// Escape stray double-quotes and raw control chars INSIDE string values — the most common
// way AI-generated JSON breaks (a passage value contains an unescaped " or a real newline).
// Heuristic: a " inside a string is a terminator only if the following syntax still
// looks like JSON (key colon, close bracket/brace, or comma plus a real next item).
function repairJSONStrings(text) {
  const s = String(text||"");
  const nextNonSpace = (from) => {
    let j = from;
    while (j < s.length && (s[j]===" "||s[j]==="\t"||s[j]==="\n"||s[j]==="\r")) j++;
    return j;
  };
  const literalAt = (idx) => /^(true|false|null)(?=\s*[,}\]])/.test(s.slice(idx));
  const numberAt = (idx) => /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?(?=\s*[,}\]])/.test(s.slice(idx));
  const quotedTokenEndsBefore = (idx, allowedNext) => {
    if (s[idx] !== '"') return false;
    let esc2 = false;
    for (let k=idx+1;k<s.length;k++) {
      const ch = s[k];
      if (esc2) { esc2 = false; continue; }
      if (ch === "\\") { esc2 = true; continue; }
      if (ch === '"') {
        const after = s[nextNonSpace(k+1)];
        return allowedNext.includes(after);
      }
      if (ch === "\n" || ch === "\r") return false;
    }
    return false;
  };
  const commaReallyEndsString = (commaIdx, stack) => {
    const k = nextNonSpace(commaIdx+1);
    const after = s[k];
    if (after === undefined) return true;
    const top = stack[stack.length-1];
    if (top === "{") {
      return after === "}" || quotedTokenEndsBefore(k, [":"]);
    }
    if (top === "[") {
      return after === "]" || after === "{" || after === "[" ||
        quotedTokenEndsBefore(k, [",", "]", "}"]) || literalAt(k) || numberAt(k);
    }
    return after === "}" || after === "]" || after === "{" || after === "[" ||
      quotedTokenEndsBefore(k, [":", ",", "]", "}"]) || literalAt(k) || numberAt(k);
  };
  const stack = [];
  let out = "", inStr = false, esc = false;
  for (let i=0;i<s.length;i++) {
    const c = s[i];
    if (esc) { out+=c; esc=false; continue; }
    if (c === "\\") { out+=c; esc=true; continue; }
    if (!inStr) {
      out+=c;
      if (c === "{") stack.push("{");
      else if (c === "[") stack.push("[");
      else if ((c === "}" && stack[stack.length-1] === "{") || (c === "]" && stack[stack.length-1] === "[")) stack.pop();
      if (c === '"') inStr=true;
      continue;
    }
    if (c === '"') {
      const j = nextNonSpace(i+1);
      const nxt = s[j];
      if (nxt===undefined || nxt===":" || nxt==="}" || nxt==="]" || (nxt==="," && commaReallyEndsString(j, stack))) { out+=c; inStr=false; }
      else out+='\\"';
      continue;
    }
    if (c === "\n") { out+="\\n"; continue; }
    if (c === "\r") { out+="\\r"; continue; }
    if (c === "\t") { out+="\\t"; continue; }
    out+=c;
  }
  return out;
}

function repairJSONMissingCommas(text) {
  const s = String(text||"");
  let out = "", inStr = false, esc = false, lastSig = "";
  const insertCommaIfNeeded = () => {
    if (lastSig === "value") out += ",";
  };
  for (let i=0;i<s.length;i++) {
    const c = s[i];
    if (esc) { out+=c; esc=false; continue; }
    if (c === "\\") { out+=c; esc=true; continue; }
    if (inStr) {
      out+=c;
      if (c === '"') { inStr=false; lastSig="value"; }
      continue;
    }
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { out+=c; continue; }
    if (c === '"') { insertCommaIfNeeded(); out+=c; inStr=true; continue; }
    if (c === "{" || c === "[") { insertCommaIfNeeded(); out+=c; lastSig="open"; continue; }
    if (c === "}" || c === "]") { out+=c; lastSig="value"; continue; }
    if (c === ",") { out+=c; lastSig="comma"; continue; }
    if (c === ":") { out+=c; lastSig="colon"; continue; }
    out+=c;
    if (c === "e" || c === "E" || c === "." || c === "+" || c === "-" || /[0-9a-zA-Z]/.test(c)) lastSig = "value";
  }
  return out;
}

// Strip // line comments and /* */ block comments that live OUTSIDE strings (AI sometimes adds
// explanatory comments, which are invalid JSON → "Expected ',' or ']'").
function stripJSONComments(text) {
  const s = String(text||"");
  let out = "", inStr = false, esc = false;
  for (let i=0;i<s.length;i++) {
    const c = s[i];
    if (inStr) { out+=c; if(esc){esc=false;} else if(c==="\\"){esc=true;} else if(c==='"'){inStr=false;} continue; }
    if (c==='"') { out+=c; inStr=true; continue; }
    if (c==="/" && s[i+1]==="/") { while (i<s.length && s[i]!=="\n") i++; out+="\n"; continue; }
    if (c==="/" && s[i+1]==="*") { i+=2; while (i<s.length && !(s[i]==="*" && s[i+1]==="/")) i++; i++; continue; }
    out+=c;
  }
  return out;
}

function safeJSON(text) {
  const candidate = extractJSONCandidate(text);
  const repaired = repairJSONText(candidate);
  const singleQuoteRepaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g,(_,s)=>JSON.stringify(s.replace(/\\'/g,"'")));
  const stringRepaired = repairJSONStrings(candidate);
  const commaRepaired = repairJSONMissingCommas(repaired);
  const stringCommaRepaired = repairJSONMissingCommas(stringRepaired);
  // Comment-stripped chain: strip comments, then fix strings, then missing commas.
  const noComments = stripJSONComments(repaired);
  const noCommentsFull = repairJSONMissingCommas(repairJSONStrings(noComments));
  const attempts = [
    String(text||"").trim(),
    candidate,
    repaired,
    commaRepaired,
    balanceJSONText(commaRepaired),
    balanceJSONText(candidate),
    balanceJSONText(repaired),
    stringRepaired,
    balanceJSONText(stringRepaired),
    stringCommaRepaired,
    balanceJSONText(stringCommaRepaired),
    noComments,
    noCommentsFull,
    balanceJSONText(noCommentsFull),
    repairJSONStrings(repaired),
    balanceJSONText(repairJSONStrings(repaired)),
    singleQuoteRepaired,
    balanceJSONText(singleQuoteRepaired)
  ].filter(Boolean);
  let lastError = null;
  for (const attempt of attempts) {
    try { return JSON.parse(attempt); }
    catch(e) { lastError = e; }
  }
  throw lastError || new Error("Invalid JSON from AI response");
}


// ─── STUDY PLAN HELPERS (F1 daily-plan sort easy→hard + F2 horizon plan draft) ──
// Default skill difficulty order (easy→hard). User-reorderable via opts.skillOrder
// (stored at state.studyPlans.skillOrder). Order chosen with the user: Vocab is the
// gentlest on-ramp, Writing the most demanding.
const STUDY_SKILL_ORDER = ["vocab","listening","reading","speaking","writing"];

// Deterministic baseline sort: by skill-order index, then estimated minutes. Used as
// the offline fallback AND as the grounding hint for the AI refine pass.
function _baselineSortItems(items, skillOrder) {
  const order = (Array.isArray(skillOrder)&&skillOrder.length?skillOrder:STUDY_SKILL_ORDER).map(s=>String(s).toLowerCase());
  const rank = s => { const i = order.indexOf(String(s||"").toLowerCase()); return i<0 ? order.length : i; };
  const arr = (items||[]).map((it,idx)=>({...it, _idx:idx}));
  arr.sort((a,b)=> rank(a.skill)-rank(b.skill) || (Number(a.estMins)||0)-(Number(b.estMins)||0) || a._idx-b._idx);
  const n = arr.length;
  return arr.map((it,i)=>{
    const d = n<=1 ? "easy" : i < n/3 ? "easy" : i < (2*n)/3 ? "medium" : "hard";
    const { _idx, ...rest } = it;
    return { ...rest, difficulty: rest.difficulty||d, reason: rest.reason||`Ordered by your skill priority (${rest.skill||"task"}).` };
  });
}

// F1: order a daily plan's items easy→hard. Returns a NEW array, each item annotated
// {difficulty:"easy|medium|hard", reason}. NEVER throws: with no AI config (or on any AI
// error) it returns the deterministic baseline so the daily plan always works offline.
async function sortPlanByDifficulty(config, items, opts={}) {
  const list = Array.isArray(items)?items.filter(Boolean):[];
  const baseline = _baselineSortItems(list, opts.skillOrder);
  if (list.length<=1 || !config) return baseline;
  const order = (Array.isArray(opts.skillOrder)&&opts.skillOrder.length?opts.skillOrder:STUDY_SKILL_ORDER);
  const sys = `You order an IELTS learner's daily study items from EASIEST to HARDEST to build momentum. Baseline skill difficulty (easiest→hardest): ${order.join(" → ")}. Respect this as the primary signal but you may fine-tune using each item's effort (estMins) and cognitive load. Return ONLY JSON.`;
  const user = `ITEMS (JSON):\n${JSON.stringify(list.map(it=>({id:it.id,title:it.title,skill:it.skill,estMins:it.estMins||null})))}\n\nReturn JSON: {"order":[{"id":"<item id>","difficulty":"easy|medium|hard","reason":"<=12 words why>"}]} — include EVERY id exactly once, ordered easiest first.`;
  try {
    const parsed = safeJSON(await callAPI(config,[{role:"system",content:sys},{role:"user",content:user}], 700, 0.2));
    const ranked = Array.isArray(parsed?.order)?parsed.order:[];
    if (!ranked.length) return baseline;
    const byId = new Map(list.map(it=>[String(it.id),it]));
    const out = [];
    ranked.forEach(r=>{ const it=byId.get(String(r.id)); if(it && !out.find(o=>o.id===it.id)) out.push({...it, difficulty:["easy","medium","hard"].includes(String(r.difficulty))?r.difficulty:"medium", reason:String(r.reason||"").slice(0,80)}); });
    baseline.forEach(b=>{ if(!out.find(o=>o.id===b.id)) out.push(b); }); // keep any AI-dropped items
    return out.length?out:baseline;
  } catch(e){ console.warn("[plan] sortPlanByDifficulty AI failed, using baseline:", e.message); return baseline; }
}

// Compact learner profile from state for F2 planning (keeps the prompt small).
function buildLearnerProfile(state) {
  const s = state||{};
  const recent = (Array.isArray(s.bandHistory)?s.bandHistory:[]).slice(-5);
  const avg = recent.length ? Math.round((recent.reduce((a,h)=>a+(Number(h.overall)||0),0)/recent.length)*10)/10 : null;
  const critAvg = {}, critN = {};
  recent.forEach(h=>["ta","tr","cc","lr","gra"].forEach(k=>{ if(h[k]!=null){ critAvg[k]=(critAvg[k]||0)+Number(h[k]); critN[k]=(critN[k]||0)+1; }}));
  let weakest=null; Object.keys(critAvg).forEach(k=>{ const m=critAvg[k]/critN[k]; if(weakest===null||m<weakest.v) weakest={k,v:m}; });
  const examDate = s.studyPlans?.targets?.examDate || s.examDate || null;
  let daysToExam=null; if(examDate){ const d=Math.ceil((new Date(examDate)-Date.now())/86400000); if(Number.isFinite(d)) daysToExam=d; }
  return {
    targetBand: s.targetBand || s.writingGoal || null,
    avgRecentBand: avg,
    weakestWritingCriterion: weakest ? weakest.k : null,
    essaysGraded: (s.essays||[]).filter(e=>e.gradeResult).length,
    readingAttempts: (s.readingTests||[]).length,
    listeningAttempts: (s.listeningTests||[]).length,
    vocabMastered: Object.values(s.mastery||{}).filter(v=>Number(v)>=4).length,
    daysToExam,
    skillPriority: (s.studyPlans?.skillOrder)||STUDY_SKILL_ORDER
  };
}

// F2: draft a multi-horizon study plan. INTERACTIVE — the AI may FIRST ask clarifying
// questions; the user answers (+ optional free-text userInfo) and we call again; pass
// opts.finalize=true to force a final plan. Returns one of:
//   { status:"needs_info", questions:[{id,q,hint}], note }
//   { status:"draft", plan:{daily, weekly[], examCountdown, milestones[], rationale}, assumptions[] }
async function draftStudyPlan(config, state, opts={}) {
  if (!config) throw new Error("Set up an AI provider in Settings to let the AI draft your study plan.");
  const profile = buildLearnerProfile(state);
  const targets = (state?.studyPlans?.targets)||{};
  const answers = Array.isArray(opts.answers)?opts.answers:[];
  const userInfo = String(opts.userInfo||"").trim();
  const finalize = !!opts.finalize;
  const sys = `You are an IELTS study coach building a personalised study plan. The learner's skill priority easiest→hardest is: ${(profile.skillPriority||STUDY_SKILL_ORDER).join(" → ")} (start easy to build momentum). Use what you know about the learner. ${finalize?"You MUST now output a final plan (status=draft); do not ask more questions.":"If — and ONLY if — you genuinely need more information to plan well, ask up to 4 short questions (status=needs_info). Otherwise output the plan (status=draft)."} Return ONLY JSON.`;
  const user = `LEARNER PROFILE (JSON):\n${JSON.stringify(profile)}\nTARGETS (JSON):\n${JSON.stringify(targets)}\n${userInfo?`EXTRA INFO FROM LEARNER:\n${userInfo}\n`:""}${answers.length?`ANSWERS TO YOUR EARLIER QUESTIONS (JSON):\n${JSON.stringify(answers)}\n`:""}
Return EXACTLY one of:
{"status":"needs_info","questions":[{"id":"q1","q":"<short question>","hint":"<why you ask, <=12 words>"}],"note":"<one line>"}
OR
{"status":"draft","plan":{"daily":"<what to do most days>","weekly":["<weekly milestone>"],"examCountdown":"<plan vs daysToExam, or empty if no exam date>","milestones":[{"horizon":"weekly|monthly|exam","target":"<measurable>","focusSkills":["vocab|listening|reading|speaking|writing"]}],"rationale":"<2-3 sentences tying the plan to this learner>"},"assumptions":["<assumption you made>"]}`;
  const parsed = safeJSON(await callAPI(config,[{role:"system",content:sys},{role:"user",content:user}], 1600, 0.4));
  if (parsed?.status==="needs_info" && Array.isArray(parsed.questions) && parsed.questions.length && !finalize) {
    return { status:"needs_info",
      questions: parsed.questions.slice(0,4).map((q,i)=>({id:q.id||`q${i+1}`, q:String(q.q||q.question||"").slice(0,200), hint:String(q.hint||"").slice(0,120)})).filter(q=>q.q),
      note:String(parsed.note||"").slice(0,200) };
  }
  const plan = parsed?.plan && typeof parsed.plan==="object" ? parsed.plan : (parsed||{});
  return {
    status:"draft",
    plan: {
      daily: String(plan.daily||"").slice(0,400),
      weekly: Array.isArray(plan.weekly)?plan.weekly.map(x=>String(x).slice(0,160)).slice(0,8):[],
      examCountdown: String(plan.examCountdown||"").slice(0,300),
      milestones: Array.isArray(plan.milestones)?plan.milestones.slice(0,8).map(m=>({horizon:String(m.horizon||"").slice(0,20),target:String(m.target||"").slice(0,160),focusSkills:Array.isArray(m.focusSkills)?m.focusSkills.slice(0,5).map(String):[]})):[],
      rationale: String(plan.rationale||"").slice(0,500)
    },
    assumptions: Array.isArray(parsed?.assumptions)?parsed.assumptions.map(x=>String(x).slice(0,160)).slice(0,6):[]
  };
}


// ─── VOCAB LEXIS HELPERS (T1 synonyms · T2 idioms · T3 collocations) ───────────
// Both return plain objects the Vocab layer can persist into a word entry / library.
// enrichVocabLexis: get synonyms + collocations + idioms for ONE headword.
async function enrichVocabLexis(config, headword, meaning) {
  if (!config) throw new Error("Set up an AI provider in Settings to generate vocabulary lexis.");
  const hw = String(headword||"").trim();
  if (!hw) throw new Error("No headword provided.");
  const sys = "You are an IELTS vocabulary coach. For the given academic headword, return natural, accurate lexis only — no rare/archaic items, no wrong collocations. Return ONLY valid JSON.";
  const user = `HEADWORD: ${hw}${meaning?`\nMEANING: ${meaning}`:""}\nReturn JSON:\n{"synonyms":["natural synonym or near-synonym"],"antonyms":["natural antonym or near-opposite"],"collocations":[{"phrase":"common collocation using the word","example":"one short example sentence"}],"idioms":[{"idiom":"idiom/phrase related to the word or its meaning","meaning":"plain-English meaning"}]}\nGive 3-6 synonyms, 2-5 antonyms (empty array if the word has no real opposite, e.g. a concrete noun), 3-6 collocations, 1-4 idioms (idioms only if genuinely natural — empty array if none fit).`;
  const parsed = safeJSON(await callAPI(config,[{role:"system",content:sys},{role:"user",content:user}], 750, 0.3));
  const arr = x => Array.isArray(x)?x:[];
  return {
    synonyms: arr(parsed?.synonyms).map(s=>String(s).trim()).filter(Boolean).slice(0,8),
    antonyms: arr(parsed?.antonyms).map(s=>String(s).trim()).filter(Boolean).slice(0,8),
    collocations: arr(parsed?.collocations).map(c=>typeof c==="string"?{phrase:c.trim(),example:""}:{phrase:String(c?.phrase||"").trim(),example:String(c?.example||"").trim()}).filter(c=>c.phrase).slice(0,8),
    idioms: arr(parsed?.idioms).map(i=>typeof i==="string"?{idiom:i.trim(),meaning:""}:{idiom:String(i?.idiom||"").trim(),meaning:String(i?.meaning||"").trim()}).filter(i=>i.idiom).slice(0,6)
  };
}

// extractLexisFromText: scan imported text for collocations + idioms + candidate AWL-ish
// words, so the Vocab importer can add what genuinely appears to the library.
async function extractLexisFromText(config, text) {
  if (!config) throw new Error("Set up an AI provider in Settings to scan text for lexis.");
  const body = String(text||"").trim().slice(0,8000);
  if (body.length < 20) throw new Error("Not enough text to scan.");
  const sys = "You extract IELTS-useful lexis that ACTUALLY APPEARS in the supplied text. Do not invent items that are not present. Return ONLY valid JSON.";
  const user = `TEXT:\n${body}\n\nReturn JSON:\n{"collocations":[{"phrase":"collocation found in the text","example":"the clause it appears in"}],"idioms":[{"idiom":"idiom/fixed expression found in the text","meaning":"plain-English meaning"}],"words":[{"word":"useful academic headword found in the text","meaning":"short gloss"}]}\nOnly include items genuinely present. Up to 12 collocations, 8 idioms, 15 words.`;
  const parsed = safeJSON(await callAPI(config,[{role:"system",content:sys},{role:"user",content:user}], 1400, 0.2));
  const arr = x => Array.isArray(x)?x:[];
  return {
    collocations: arr(parsed?.collocations).map(c=>typeof c==="string"?{phrase:c.trim(),example:""}:{phrase:String(c?.phrase||"").trim(),example:String(c?.example||"").trim()}).filter(c=>c.phrase).slice(0,12),
    idioms: arr(parsed?.idioms).map(i=>typeof i==="string"?{idiom:i.trim(),meaning:""}:{idiom:String(i?.idiom||"").trim(),meaning:String(i?.meaning||"").trim()}).filter(i=>i.idiom).slice(0,8),
    words: arr(parsed?.words).map(w=>typeof w==="string"?{word:w.trim(),meaning:""}:{word:String(w?.word||"").trim(),meaning:String(w?.meaning||"").trim()}).filter(w=>w.word).slice(0,15)
  };
}

// Vocab quiz "write a sentence" task: check the student's ONE sentence uses the target word (or
// one of its allowed collocations/synonyms/antonyms) correctly, is on the given Writing topic,
// and is grammatical. Returns a verdict + feedback + a model sentence.
async function checkVocabSentence(config, word, alternatives, topic, sentence) {
  if (!config) throw new Error("Set up an AI provider in Settings to check your sentence.");
  const alt = (Array.isArray(alternatives)?alternatives:[]).map(x=>String(x||"").trim()).filter(Boolean).slice(0,8);
  const sys = "You are an IELTS vocabulary coach. Judge ONE student sentence: (a) does it use the target word OR one of the allowed alternatives naturally and correctly, (b) is it on the given topic, (c) is it grammatical? Be encouraging but honest. Return ONLY valid JSON.";
  const user = `TARGET WORD: ${word}\nALLOWED ALTERNATIVES (any one is acceptable instead of the word): ${alt.join(", ")||"(none)"}\nWRITING TOPIC: ${topic}\nSTUDENT SENTENCE: ${String(sentence||"").trim()}\nReturn JSON:\n{"ok":true,"usedTarget":true,"onTopic":true,"feedback":"1-2 sentences of specific, useful feedback","suggestion":"a natural model sentence using the word on this topic"}`;
  const p = safeJSON(await callAPI(config,[{role:"system",content:sys},{role:"user",content:user}], 700, 0.3));
  return { ok: !!p?.ok, usedTarget: !!p?.usedTarget, onTopic: !!p?.onTopic, feedback: String(p?.feedback||"").trim(), suggestion: String(p?.suggestion||"").trim() };
}


// ─── WRITING EXAMPLE: paragraphs + per-statement reasoning (Task 2 + Task 3) ──
// Task 3: an AI-generated model example must SHOW ITS THINKING — for each statement it
// writes, expose WHY (word/collocation choice, strategy applied, logic/grammar decision).
// WRITING_EXAMPLE_STATEMENTS_FIELD is the schema fragment the AI Example generators in
// 10-practice / 11-task2 should append so the essay arrives WITH sentence-level rationale.
const WRITING_EXAMPLE_STATEMENTS_FIELD = `"statements":[{"statement":"EXACT sentence copied verbatim from the essay above","reasoning":"why the AI wrote this sentence this way: word/collocation choice, the strategy or structure move it makes, any logic/grammar decision","tags":["strategy|collocation|vocab|logic|grammar|cohesion"]}]`;

// Full AI Example schema (paragraph-separated essay + per-sentence reasoning). Drop-in for
// the example branch of the AI Example generator in 10-practice / 11-task2.
function writingExampleSchemaJSON(taskType) {
  const words = taskType === "task2" ? "270-310 words" : "170-200 words";
  const paras = taskType === "task2" ? "Introduction, Body 1, Body 2 and Conclusion" : "Introduction, Overview, Body 1 and Body 2";
  const kind = taskType === "task2" ? "Task 2" : "Task 1";
  return `{"title":"short title","bandTarget":"Band X+","essay":"full ${kind} sample answer, ${words}, with \\n\\n between ${paras}","wordCount":0,"whyItWorks":["specific reason","how to adapt this without copying"],"usefulPhrases":["short reusable phrase, not a full sentence"],"topicVocabulary":[{"term":"high-score term or phrase","use":"when to use it","example":"short example sentence"}],${WRITING_EXAMPLE_STATEMENTS_FIELD}}`;
}

// Normalize the per-statement reasoning array (defensive against AI shape drift).
function normalizeWritingExampleStatements(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(s => {
    if (typeof s === "string") return {statement:s.trim(), reasoning:"", tags:[]};
    return {
      statement: String(s?.statement || s?.sentence || s?.text || "").trim(),
      reasoning: String(s?.reasoning || s?.why || s?.thinking || s?.explanation || "").trim(),
      tags: Array.isArray(s?.tags) ? s.tags.map(t=>String(t||"").trim()).filter(Boolean) : (s?.tag ? [String(s.tag).trim()] : [])
    };
  }).filter(s => s.statement).slice(0, 40);
}

// Standalone generator: explain an EXISTING example essay sentence-by-sentence, so the
// reasoning can be produced on demand without regenerating the essay.
async function explainWritingExample(config, taskType, promptContext, essay) {
  if (!config) throw new Error("Set up an AI provider in Settings to show the AI's thinking.");
  const body = String(essay||"").trim();
  if (body.length < 40) throw new Error("Need an example essay to explain.");
  const kind = taskType === "task2" ? "Task 2 essay" : "Task 1 report";
  const sys = `You are an IELTS writing coach. For a model ${kind}, explain the thinking behind EACH sentence: word/collocation choices, the strategy or structure move it makes, and any logic/grammar decision. Quote each sentence verbatim. Return ONLY valid JSON.`;
  const user = `${promptContext?`PROMPT CONTEXT:\n${promptContext}\n\n`:""}MODEL ESSAY:\n${body}\n\nReturn JSON:\n{${WRITING_EXAMPLE_STATEMENTS_FIELD}}`;
  const parsed = safeJSON(await callAPI(config,[{role:"system",content:sys},{role:"user",content:user}], 2200, 0.2));
  return { statements: normalizeWritingExampleStatements(parsed?.statements) };
}


// Task 1 (Reading Strategies): AI builds a WORKED EXAMPLE that applies the FIXED strategy
// steps to a real generated passage+question. Steps stay fixed; only the example is AI-made.
async function generateReadingStrategyExample(config, name, steps) {
  if (!config) throw new Error("Set up an AI provider in Settings to generate a worked example.");
  const stepList = (Array.isArray(steps)?steps:[]).map((s,i)=>`${i+1}. ${s}`).join("\n");
  const sys = "You are an IELTS Reading coach. Create a SHORT realistic worked example that demonstrates a reading strategy step-by-step on a real passage. Apply the supplied fixed steps exactly; do not change them. Return ONLY valid JSON.";
  const user = `STRATEGY: ${name}\nFIXED STEPS (apply these exactly, in order):\n${stepList}\n\nReturn JSON:\n{"passage":"a short 90-140 word IELTS-style passage on a neutral academic topic","question":"one ${name} question based on the passage (include the statement/options as appropriate)","answer":"the correct answer","walkthrough":[{"step":"the fixed step (verbatim)","action":"what the reader does at this step ON THIS passage","evidence":"an EXACT phrase quoted from the passage used here, or empty"}]}\nGive exactly one walkthrough entry per fixed step, in order. Evidence quotes must be exact substrings of the passage.`;
  const parsed = safeJSON(await callAPI(config,[{role:"system",content:sys},{role:"user",content:user}], 1700, 0.4));
  const arr = x=>Array.isArray(x)?x:[];
  return {
    passage: String(parsed?.passage||"").trim(),
    question: String(parsed?.question||"").trim(),
    answer: String(parsed?.answer||"").trim(),
    walkthrough: arr(parsed?.walkthrough).map(w=>({
      step: String(w?.step||"").trim(),
      action: String(w?.action||w?.do||"").trim(),
      evidence: String(w?.evidence||w?.quote||"").trim()
    })).filter(w=>w.action||w.step)
  };
}

// === Phase 2: Adapter — compact AWL_DATA entry -> WordCard-compatible shape ===
