// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPEAKING LAB — IELTS Speaking practice (record → local ASR → AI examiner)
// Companion server: speaking-backend/ (FastAPI + faster-whisper + Claude)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEFAULT_SPEAKING_BACKEND = "http://localhost:8000";

const SPEAKING_PARTS = [
  {
    id: "part1",
    label: "Part 1",
    title: "Personal introduction & interview",
    blurb: "4-5 short questions about familiar topics. ~30 seconds per answer.",
    durationHint: 60
  },
  {
    id: "part2",
    label: "Part 2",
    title: "Individual long turn (cue card)",
    blurb: "1 minute to prepare, 1-2 minutes to speak from a cue card.",
    durationHint: 120
  },
  {
    id: "part3",
    label: "Part 3",
    title: "Two-way discussion",
    blurb: "Abstract follow-up questions linked to Part 2. ~60-90 seconds per turn.",
    durationHint: 90
  }
];

const CRITERIA_META = [
  { id: "fluency_score",      label: "Fluency & Coherence",       short: "F&C" },
  { id: "lexical_score",      label: "Lexical Resource",          short: "LR"  },
  { id: "grammar_score",      label: "Grammatical Range & Acc.",  short: "GR"  },
  { id: "pronunciation_score",label: "Pronunciation",             short: "PR", approx: true }
];

// No-backend warm-up: local question bank + self-assessment so the gentlest users
// (beginners, "Silent Speaker") can practise speaking WITHOUT the Python backend.
const WARMUP_BANK = {
  part1: [
    "Do you work or are you a student?",
    "What do you usually do in your free time?",
    "Do you prefer mornings or evenings? Why?",
    "How often do you use public transport?",
    "What kind of music do you enjoy, and why?",
    "Do you like cooking? Why or why not?",
    "Tell me about your hometown."
  ],
  part2: [
    {cue:"Describe a place where you like to relax.", bullets:["where it is","how often you go there","what you do there","and explain why it helps you relax"]},
    {cue:"Describe a skill you would like to learn.", bullets:["what the skill is","why you want to learn it","how you would learn it","and explain how it would help you"]},
    {cue:"Describe a memorable journey you took.", bullets:["where you went","who you went with","what happened","and explain why it was memorable"]},
    {cue:"Describe a person who has influenced you.", bullets:["who the person is","how you know them","what they did","and explain how they influenced you"]}
  ],
  part3: [
    "Why do some people find it hard to relax these days?",
    "How has technology changed the way people learn new skills?",
    "Do you think travelling is as important as people say? Why?",
    "Should schools teach life skills as well as academic subjects?"
  ]
};
const WARMUP_TIPS = [
  "Add a reason — \"…because…\"",
  "Give a concrete example — \"For instance, last week…\"",
  "Compare with the past — \"In the past… but now…\"",
  "Add a feeling/opinion — \"What I really like is…\"",
  "Extend with a result — \"…which means that…\""
];
function fmtClock(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

// Self-contained warm-up card — own state, no backend, no AI, no scoring.
function SpeakingWarmup({defaultOpen, setState}) {
  const [open,setOpen] = useState(!!defaultOpen);
  const [wpart,setWpart] = useState("part1");
  const [q,setQ] = useState(null);
  const [prep,setPrep] = useState(0);
  const [speak,setSpeak] = useState(0);
  const [running,setRunning] = useState(false);
  const [ratings,setRatings] = useState({});
  const [transcript,setTranscript] = useState("");
  const [saved,setSaved] = useState(false);
  const prepR = useRef(null), spkR = useRef(null);
  useEffect(()=>()=>{ clearInterval(prepR.current); clearInterval(spkR.current); },[]);
  const target = wpart==="part2"?120:wpart==="part3"?75:35;
  const switchPart = (p)=>{ setWpart(p); setQ(null); setSpeak(0); setRunning(false); setRatings({}); setTranscript(""); setSaved(false); setPrep(0); clearInterval(spkR.current); clearInterval(prepR.current); };
  const newQ = ()=>{
    const b = WARMUP_BANK[wpart]||[];
    setQ(b[Math.floor(Math.random()*b.length)]);
    setSpeak(0); setRunning(false); setRatings({}); setTranscript(""); setSaved(false); clearInterval(spkR.current);
    if (wpart==="part2"){ setPrep(60); clearInterval(prepR.current); prepR.current=setInterval(()=>setPrep(t=>{ if(t<=1){clearInterval(prepR.current);return 0;} return t-1; }),1000); }
    else setPrep(0);
  };
  const toggleSpeak = ()=>{ if(running){ clearInterval(spkR.current); setRunning(false); } else { setRunning(true); spkR.current=setInterval(()=>setSpeak(t=>t+1),1000); } };
  const saveAttempt = ()=>{
    if (!q || typeof setState!=="function") return;
    const qt = wpart==="part2" ? (q.cue||"") : String(q||"");
    const attempt = {
      id:`offline-${Date.now()}`,
      date:new Date().toISOString(),
      offline:true,
      part:wpart,
      topic:"self-practice",
      question_text:qt,
      overall_band:null,
      transcript:transcript.trim(),
      durationSec:speak,
      feedback:{selfRatings:ratings}
    };
    setState(s=>({...s, speakingTests:[attempt, ...((s.speakingTests)||[])].slice(0,200)}));
    setSaved(true);
  };
  const crit = [["fc","Fluency"],["lr","Vocabulary"],["gr","Grammar"],["pr","Pronunciation"]];
  const levels = [["low","Shaky","var(--rose)"],["ok","OK","var(--honey)"],["good","Good","var(--leaf)"]];
  return <div className="card" style={{marginBottom:14,borderLeft:"2px solid var(--sky)"}}>
    <div className="card-h" style={{cursor:"pointer",margin:0}} onClick={()=>setOpen(o=>!o)}>
      <div className="cdot" style={{background:"var(--sky)"}}/>Warm-up — no backend needed {open?"▾":"▸"}
    </div>
    {open&&<div style={{marginTop:10}}>
      <div className="why" style={{marginBottom:10}}>Practise speaking out loud with a prompt + timer + self-check. No recording or AI — great before a full scored attempt, or when the backend isn't running.</div>
      <div className="mode-toggle" style={{marginBottom:10}}>
        {SPEAKING_PARTS.map(p=><button key={p.id} className={`mode-btn ${wpart===p.id?"active":""}`} onClick={()=>switchPart(p.id)}>{p.label}</button>)}
      </div>
      <button className="btn bp bsm" onClick={newQ}>{q?"↻ New question":"Show a question"}</button>
      {q&&<div style={{marginTop:12}}>
        {wpart==="part2"
          ? <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 14px"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:15,color:"var(--ink)",marginBottom:7}}>{q.cue}</div>
              <div style={{fontSize:11,color:"var(--ink3)",marginBottom:4}}>You should say:</div>
              <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.6}}>{q.bullets.map((b,i)=><li key={i}>{b}</li>)}</ul>
            </div>
          : <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 14px",fontFamily:"'Fraunces',serif",fontSize:15,color:"var(--ink)"}}>{q}</div>}
        {wpart==="part2"&&prep>0&&<div style={{marginTop:10,fontSize:12.5,color:"var(--honey)"}}>Preparation: <strong style={{fontFamily:"'Geist Mono',monospace"}}>{fmtClock(prep)}</strong> — jot ideas, then start speaking.</div>}
        <div style={{display:"flex",gap:10,alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
          <button className={`btn bsm ${running?"bg":"bp"}`} onClick={toggleSpeak}>{running?"■ Stop":"● Start speaking"}</button>
          <span style={{fontFamily:"'Geist Mono',monospace",fontSize:15,color:speak>target?"var(--rose)":"var(--ink)"}}>{fmtClock(speak)}</span>
          <span style={{fontSize:11,color:"var(--ink3)"}}>target ≈ {fmtClock(target)}{speak>target?" · good length!":""}</span>
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontSize:11,color:"var(--ink3)",marginBottom:6}}>Keep going — try one of these to say more:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{WARMUP_TIPS.map((t,i)=><span key={i} style={{fontSize:11,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:6,padding:"3px 8px",color:"var(--ink2)"}}>{t}</span>)}</div>
        </div>
        <div style={{marginTop:14}}>
          <div style={{fontSize:11,color:"var(--ink3)",marginBottom:6}}>Quick self-check (how did that feel?):</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
            {crit.map(([k,label])=><div key={k} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:11.5,color:"var(--ink2)",marginBottom:5}}>{label}</div>
              <div style={{display:"flex",gap:4}}>{levels.map(([v,lbl,c])=><button key={v} onClick={()=>setRatings(r=>({...r,[k]:v}))} style={{flex:1,fontSize:10.5,padding:"3px 0",borderRadius:5,cursor:"pointer",border:`1px solid ${ratings[k]===v?c:"var(--border)"}`,background:ratings[k]===v?`color-mix(in srgb, ${c} 18%, transparent)`:"transparent",color:ratings[k]===v?c:"var(--ink3)"}}>{lbl}</button>)}</div>
            </div>)}
          </div>
        </div>
        <div style={{marginTop:14}}>
          <div style={{fontSize:11,color:"var(--ink3)",marginBottom:6}}>Self-transcript (optional) — type what you said to spot gaps:</div>
          <textarea className="era-input" value={transcript} onChange={e=>{setTranscript(e.target.value);setSaved(false);}} rows="2" placeholder="Write or paste roughly what you said…" style={{resize:"vertical"}}/>
        </div>
        {typeof setState==="function" && <div style={{display:"flex",gap:10,alignItems:"center",marginTop:10,flexWrap:"wrap"}}>
          <button className="btn bg bsm" onClick={saveAttempt} disabled={saved}>{saved?"✓ Saved to recent attempts":"Save this practice"}</button>
          <span style={{fontSize:11,color:"var(--ink3)"}}>Saved locally — no scoring, just your own record.</span>
        </div>}
      </div>}
    </div>}
  </div>;
}

// R12 — minimal-pair listening/pronunciation drill. Offline (browser TTS), no backend.
// Plays one of a confusable pair; the user picks which sound they heard.
const MINIMAL_PAIRS = [
  {a:"ship",b:"sheep",hint:"short /ɪ/ vs long /iː/"},
  {a:"bit",b:"beat",hint:"/ɪ/ vs /iː/"},
  {a:"full",b:"fool",hint:"/ʊ/ vs /uː/"},
  {a:"live",b:"leave",hint:"/ɪ/ vs /iː/"},
  {a:"cat",b:"cut",hint:"/æ/ vs /ʌ/"},
  {a:"three",b:"tree",hint:"/θ/ vs /t/"},
  {a:"vest",b:"west",hint:"/v/ vs /w/"},
  {a:"rice",b:"lice",hint:"/r/ vs /l/"},
  {a:"pull",b:"pool",hint:"/ʊ/ vs /uː/"},
  {a:"man",b:"men",hint:"/æ/ vs /e/"},
  {a:"thin",b:"tin",hint:"/θ/ vs /t/"},
  {a:"berry",b:"very",hint:"/b/ vs /v/"}
];
function SpeakingMinimalPairDrill({defaultOpen}) {
  const N = 8;
  const [open,setOpen] = useState(!!defaultOpen);
  const [pair,setPair] = useState(null);
  const [said,setSaid] = useState(null);   // "a" | "b"
  const [picked,setPicked] = useState(null);
  const [score,setScore] = useState(0);
  const [round,setRound] = useState(0);
  const [done,setDone] = useState(false);
  const supported = typeof window!=="undefined" && !!window.speechSynthesis;
  useEffect(()=>()=>stopSpeaking(),[]);
  const play = (p,s)=>{ if(p&&s) speakText(p[s],{rate:0.9}); };
  const nextPair = ()=>{ const p=MINIMAL_PAIRS[Math.floor(Math.random()*MINIMAL_PAIRS.length)]; const s=Math.random()<0.5?"a":"b"; setPair(p); setSaid(s); setPicked(null); setTimeout(()=>play(p,s),160); };
  const start = ()=>{ setScore(0); setRound(1); setDone(false); nextPair(); };
  const pick = (which)=>{ if(picked||!pair) return; setPicked(which); if(which===said) setScore(s=>s+1); };
  const next = ()=>{ if(round>=N){ setDone(true); setPair(null); stopSpeaking(); return; } setRound(r=>r+1); nextPair(); };
  return <div className="card" style={{marginBottom:14,borderLeft:"2px solid var(--honey)"}}>
    <div className="card-h" style={{cursor:"pointer",margin:0}} onClick={()=>setOpen(o=>!o)}>
      <div className="cdot" style={{background:"var(--honey)"}}/>Minimal-pair ear training {open?"▾":"▸"}
    </div>
    {open&&<div style={{marginTop:10}}>
      {!supported&&<div className="why" style={{color:"var(--honey)",marginBottom:8}}>Your browser has no speech synthesis, so playback won't work here.</div>}
      <div className="why" style={{marginBottom:10}}>Listen and choose which word you heard. Trains the confusable sounds (e.g. ship/sheep, rice/lice) that hurt both listening and pronunciation. No AI needed.</div>
      {!pair
        ? <div>
            {done&&<div style={{margin:"4px 0 10px",fontSize:14,color:"var(--ink)"}}>Score: <strong style={{color:score>=7?"var(--leaf)":score>=5?"var(--honey)":"var(--rose)"}}>{score} / {N}</strong></div>}
            <button className="btn bp bsm" onClick={start} disabled={!supported}>{done?"↻ New set":"Start ear training"}</button>
          </div>
        : <div>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)",marginBottom:8}}>Item {round}/{N} · {pair.hint} · {score} ✓</div>
            <button className="btn bg bsm" onClick={()=>play(pair,said)} disabled={!supported} style={{marginBottom:10}}>▶ Play again</button>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["a","b"].map(which=>{
                const isHeard = which===said;
                const chosen = picked===which;
                let bd="var(--border)", bg="var(--surface)";
                if(picked){ if(isHeard){bd="var(--leaf)";bg="color-mix(in srgb,var(--leaf) 12%,var(--surface))";} else if(chosen){bd="var(--rose)";bg="color-mix(in srgb,var(--rose) 12%,var(--surface))";} }
                return <button key={which} onClick={()=>pick(which)} disabled={!!picked}
                  style={{flex:"1 1 120px",fontFamily:"'Fraunces',serif",fontSize:18,color:"var(--ink)",background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:"12px",cursor:picked?"default":"pointer"}}>{pair[which]}</button>;
              })}
            </div>
            {picked&&<div style={{display:"flex",gap:10,alignItems:"center",marginTop:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:picked===said?"var(--leaf)":"var(--rose)"}}>{picked===said?"✓ Correct":`✗ It was "${pair[said]}"`}</span>
              <button className="btn bp bsm" onClick={next}>{round>=N?"Finish":"Next →"}</button>
            </div>}
          </div>}
    </div>}
  </div>;
}

const FEEDBACK_KEY_MAP = {
  fluency_coherence: "Fluency & Coherence",
  lexical_resource: "Lexical Resource",
  grammatical_range_accuracy: "Grammatical Range & Accuracy",
  pronunciation: "Pronunciation"
};

function getSpeakingBackend(state) {
  const url = (state && state.speakingBackendUrl) || DEFAULT_SPEAKING_BACKEND;
  return String(url).replace(/\/+$/, "");
}

function formatBand(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  return (Math.round(v * 2) / 2).toFixed(1);
}

function formatTimer(secs) {
  const s = Math.max(0, Math.floor(secs || 0));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {}
  }
  return "";
}

function SpeakingPage({state, setState, config}) {
  const backend = getSpeakingBackend(state);
  const [part, setPart] = useState(() => state.speakingDraft?.part || "part1");
  const [question, setQuestion] = useState(() => state.speakingDraft?.question || null);
  const [library, setLibrary] = useState([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState("");
  const [health, setHealth] = useState({ checking: true, ok: false, msg: "Checking backend…" });
  const [phase, setPhase] = useState("idle"); // idle | recording | uploading | scoring | done | error
  const [elapsed, setElapsed] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const [score, setScore] = useState(null);
  const [fbLang, setFbLang] = useState("vi");    // feedback language: "vi" | "en"
  const [prepLeft, setPrepLeft] = useState(0);   // Part 2: 60s preparation countdown
  const [prepNotes, setPrepNotes] = useState("");
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const prepRef = useRef(null);

  const tests = state.speakingTests || [];
  const partMeta = SPEAKING_PARTS.find(p => p.id === part) || SPEAKING_PARTS[0];

  // Persist lightweight draft (which part + which question is selected)
  useEffect(() => {
    setState(s => ({ ...s, speakingDraft: { part, question, updatedAt: new Date().toISOString() }}));
  }, [part, question]);

  // Backend health check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHealth({ checking: true, ok: false, msg: "Checking backend…" });
      try {
        const r = await fetch(`${backend}/api/health`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (cancelled) return;
        const keyOk = d.examiner_key_set;
        setHealth({
          checking: false,
          ok: !!keyOk,
          msg: keyOk
            ? `Backend ready · ASR ${d.whisper_model} · Examiner ${d.examiner_model}`
            : `Backend up but EXAMINER_API_KEY missing in speaking-backend/.env`
        });
      } catch (e) {
        if (cancelled) return;
        setHealth({
          checking: false,
          ok: false,
          msg: `Cannot reach backend at ${backend}. Double-click start-speaking-backend.bat in the project folder, or start speaking-backend manually.`
        });
      }
    })();
    return () => { cancelled = true; };
  }, [backend]);

  // Cleanup recorder on unmount
  useEffect(() => () => {
    try { recRef.current?.stop?.(); } catch {}
    try { streamRef.current?.getTracks?.().forEach(t => t.stop()); } catch {}
    if (timerRef.current) clearInterval(timerRef.current);
    if (prepRef.current) clearInterval(prepRef.current);
  }, []);

  function startPrep() {
    setErrMsg("");
    setPrepLeft(60);
    if (prepRef.current) clearInterval(prepRef.current);
    prepRef.current = setInterval(() => {
      setPrepLeft(t => {
        if (t <= 1) { clearInterval(prepRef.current); prepRef.current = null; return 0; }
        return t - 1;
      });
    }, 1000);
  }
  function endPrep() {
    if (prepRef.current) { clearInterval(prepRef.current); prepRef.current = null; }
    setPrepLeft(0);
  }

  async function loadLibrary(targetPart = part) {
    setLibLoading(true); setLibErr("");
    try {
      const r = await fetch(`${backend}/api/library?part=${targetPart}&limit=10`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setLibrary(Array.isArray(data) ? data : []);
    } catch (e) {
      setLibErr(e.message || String(e));
      setLibrary([]);
    } finally {
      setLibLoading(false);
    }
  }

  async function pickRandom(targetPart = part) {
    await loadLibrary(targetPart);
    setQuestion(null);
    setScore(null);
    setPhase("idle");
    setElapsed(0);
    setErrMsg("");
    endPrep(); setPrepNotes("");
  }

  function pickFromLibrary(q) {
    setQuestion(q);
    setScore(null);
    setPhase("idle");
    setElapsed(0);
    setErrMsg("");
    endPrep(); setPrepNotes("");
  }

  async function startRecording() {
    if (!question) { setErrMsg("Choose a question first."); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setErrMsg("Your browser does not support audio recording. Try Chrome/Edge/Firefox.");
      return;
    }
    setErrMsg(""); setScore(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];
        submitAudio(blob);
      };
      mr.start(250);
      recRef.current = mr;
      setPhase("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (e) {
      setErrMsg(e.message || "Microphone permission denied.");
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { recRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks?.().forEach(t => t.stop()); } catch {}
    setPhase("uploading");
  }

  async function submitAudio(blob) {
    if (!question) { setPhase("idle"); return; }
    try {
      setPhase("scoring");
      const fd = new FormData();
      const filename = `answer.${(blob.type || "").includes("ogg") ? "ogg" : (blob.type || "").includes("mp4") ? "m4a" : "webm"}`;
      fd.append("audio", blob, filename);
      fd.append("question_text", question.question_text);
      fd.append("part", question.part);
      if (question.id) fd.append("question_id", question.id);
      const r = await fetch(`${backend}/api/score`, { method: "POST", body: fd });
      if (!r.ok) {
        const txt = await r.text().catch(()=> "");
        throw new Error(`Score failed (${r.status}): ${txt || "no body"}`);
      }
      const data = await r.json();
      if (data.no_speech) {
        const tip = (data.examiner_feedback?.next_steps_vi || []).join(" ")
          || "Mình không nghe thấy giọng nói. Kiểm tra micro và thu lại nhé.";
        setErrMsg(tip);
        setPhase("idle");
        return;
      }
      setScore(data);
      setPhase("done");
      // Save to history
      const summary = {
        id: data.id || `${Date.now()}`,
        date: new Date().toISOString(),
        part: question.part,
        topic: question.topic || "",
        question_text: question.question_text,
        overall_band: data.overall_band,
        fluency_score: data.fluency_score,
        lexical_score: data.lexical_score,
        grammar_score: data.grammar_score,
        pronunciation_score: data.pronunciation_score,
        transcript: data.user_transcript,
        feedback: data.examiner_feedback,
        durationSec: data.duration_sec
      };
      setState(s => ({ ...s, speakingTests: [summary, ...(s.speakingTests || [])].slice(0, 200) }));
    } catch (e) {
      setErrMsg(e.message || String(e));
      setPhase("error");
    }
  }

  function clearScore() { setScore(null); setPhase("idle"); setElapsed(0); endPrep(); setPrepNotes(""); }

  // ─── Render ──────────────────────────────────────────────────────────
  const recording = phase === "recording";
  const busy = phase === "uploading" || phase === "scoring";

  return <div className="canvas fu">
    <div className="kicker">Speaking · IELTS</div>
    <h1 className="title-x">Speaking <em>Lab</em></h1>

    {/* Backend status banner */}
    <div className="card" style={{marginBottom:16, borderColor: health.ok ? "var(--leaf)" : "var(--rose)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{
          display:"inline-block",width:9,height:9,borderRadius:"50%",
          background: health.checking ? "var(--ink3)" : (health.ok ? "var(--leaf)" : "var(--rose)")
        }}/>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink2)"}}>BACKEND</span>
        <span style={{fontSize:12.5,color:"var(--ink)"}}>{health.msg}</span>
        <span style={{marginLeft:"auto",fontSize:11,color:"var(--ink3)"}}>{backend}</span>
      </div>
    </div>

    <SpeakingWarmup defaultOpen={!health.checking && !health.ok} setState={setState}/>
    <SpeakingMinimalPairDrill/>

    {/* Part selector */}
    <div className="mode-toggle" style={{marginBottom:14}}>
      {SPEAKING_PARTS.map(p =>
        <button key={p.id}
          className={`mode-btn ${part===p.id?"active":""}`}
          onClick={() => { setPart(p.id); setQuestion(null); setScore(null); setPhase("idle"); setElapsed(0); setLibrary([]); endPrep(); setPrepNotes(""); }}>
          {p.label}
        </button>
      )}
    </div>

    <div className="card" style={{marginBottom:14}}>
      <div className="card-h"><div className="cdot"/>{partMeta.title}</div>
      <div className="why" style={{marginTop:6}}>{partMeta.blurb}</div>
      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
        <button className="btn bp bsm" onClick={() => pickRandom(part)} disabled={!health.ok || libLoading || recording}>
          {libLoading ? "Loading…" : "Show questions"}
        </button>
        {question && <button className="btn bg bsm" onClick={() => { setQuestion(null); setScore(null); }} disabled={recording}>
          Clear question
        </button>}
      </div>
      {libErr && <div className="why" style={{color:"var(--rose)",marginTop:8}}>Library error: {libErr}</div>}
    </div>

    {/* Library list */}
    {!question && library.length > 0 && <div className="card" style={{marginBottom:14}}>
      <div className="card-h"><div className="cdot"/>Question library · {part}</div>
      <ul style={{listStyle:"none",padding:0,margin:"10px 0 0 0",display:"flex",flexDirection:"column",gap:6}}>
        {library.map(q =>
          <li key={q.id} style={{
            border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",
            cursor:"pointer",background:"var(--surface)"
          }} onClick={() => pickFromLibrary(q)}>
            <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",textTransform:"uppercase",letterSpacing:".08em"}}>
              {q.topic} {q.difficulty ? "· " + q.difficulty : ""}
            </div>
            <div style={{fontSize:13.5,color:"var(--ink)",marginTop:3}}>{q.question_text}</div>
          </li>
        )}
      </ul>
    </div>}

    {/* Active question */}
    {question && <div className="card" style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink3)"}}>
          {question.part} · {question.topic}
        </span>
        {question.difficulty && <span className="chip" style={{fontSize:10}}>{question.difficulty}</span>}
      </div>
      <div style={{fontSize:17,color:"var(--ink)",marginTop:8,lineHeight:1.45}}>{question.question_text}</div>

      {/* Part 2 cue card */}
      {question.cue_card?.bullets && <div style={{marginTop:10,padding:"10px 14px",background:"var(--surface)",borderRadius:8,border:"1px solid var(--border)"}}>
        <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>You should say</div>
        <ul style={{margin:0,paddingLeft:18,fontSize:13.5,color:"var(--ink2)",lineHeight:1.6}}>
          {question.cue_card.bullets.map((b,i) => <li key={i}>{b}</li>)}
        </ul>
      </div>}

      {/* Part 3 follow-ups */}
      {question.follow_up && question.follow_up.length > 0 && <div style={{marginTop:10,padding:"10px 14px",background:"var(--surface)",borderRadius:8,border:"1px solid var(--border)"}}>
        <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>Follow-up</div>
        <ul style={{margin:0,paddingLeft:18,fontSize:13,color:"var(--ink2)",lineHeight:1.55}}>
          {question.follow_up.map((b,i) => <li key={i}>{b}</li>)}
        </ul>
      </div>}

      {/* Part 2 preparation (1 minute, like the real exam) */}
      {part === "part2" && !busy && !score && <div style={{marginTop:12,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8}}>
        {!recording && <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
          <span style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase"}}>Chuẩn bị</span>
          {prepLeft > 0
            ? <>
                <span style={{fontFamily:"'Geist Mono',monospace",fontSize:16,color: prepLeft<=10 ? "var(--rose)" : "var(--ink)"}}>{formatTimer(prepLeft)}</span>
                <button className="btn bp bsm" onClick={() => { endPrep(); startRecording(); }}>Start speaking →</button>
                <button className="btn bg bsm" onClick={endPrep}>Cancel</button>
              </>
            : <button className="btn bg bsm" onClick={startPrep} disabled={!health.ok}>● Prepare (1:00)</button>}
          <span style={{fontSize:11,color:"var(--ink3)"}}>1 phút lập dàn ý như thi thật</span>
        </div>}
        <textarea value={prepNotes} onChange={e => setPrepNotes(e.target.value)}
          placeholder="Ghi nhanh ý chính: what / when / where / why / how you felt…"
          style={{width:"100%",minHeight:60,resize:"vertical",fontSize:13,padding:"8px 10px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--ink)",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>}

      {/* Recording controls */}
      <div style={{marginTop:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        {!recording && !busy && prepLeft === 0 && <button className="btn bp" onClick={startRecording} disabled={!health.ok}>
          ● Record answer
        </button>}
        {recording && <button className="btn bsm" style={{background:"var(--rose)",color:"var(--bg)",border:"none"}} onClick={stopRecording}>
          ■ Stop & score
        </button>}
        {(recording || busy) && <span style={{fontFamily:"'Geist Mono',monospace",fontSize:14,color:"var(--ink2)"}}>
          {recording ? `REC ${formatTimer(elapsed)}` : phase === "uploading" ? "Uploading audio…" : "Examiner scoring…"}
        </span>}
        {recording && <span style={{fontSize:11,color:"var(--ink3)"}}>target ≈ {formatTimer(partMeta.durationHint)}</span>}
      </div>
      {errMsg && <div className="why" style={{color:"var(--rose)",marginTop:8}}>{errMsg}</div>}
    </div>}

    {/* Score display */}
    {score && <div className="card" style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)",letterSpacing:".12em",textTransform:"uppercase"}}>Overall Band</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:48,lineHeight:1,color:"var(--ink)"}}>{formatBand(score.overall_band)}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(96px, 1fr))",gap:8,flex:1,minWidth:300}}>
          {CRITERIA_META.map(c =>
            <div key={c.id} style={{padding:"10px 12px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8}}
              title={c.approx ? "Ước lượng từ văn bản + nhịp nói — chưa phân tích âm vị, chỉ tham khảo tương đối." : undefined}>
              <div style={{fontSize:10,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase"}}>{c.short}{c.approx ? " ≈" : ""}</div>
              <div style={{fontSize:22,color:"var(--ink)",fontFamily:"'Fraunces',serif"}}>{c.approx ? "≈" : ""}{formatBand(score[c.id])}</div>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {(() => { const fb=score.examiner_feedback; const hasEN = fb && ((fb.next_steps_en&&fb.next_steps_en.length) || Object.values(fb.feedback_en||{}).some(a=>a&&a.length));
            return hasEN ? <div style={{display:"inline-flex",border:"1px solid var(--border)",borderRadius:7,overflow:"hidden"}}>
              <button className="btn bsm" style={{borderRadius:0,border:"none",background:fbLang==="vi"?"var(--leaf)":"transparent",color:fbLang==="vi"?"var(--bg)":"var(--ink2)"}} onClick={()=>setFbLang("vi")}>VI</button>
              <button className="btn bsm" style={{borderRadius:0,border:"none",background:fbLang==="en"?"var(--leaf)":"transparent",color:fbLang==="en"?"var(--bg)":"var(--ink2)"}} onClick={()=>setFbLang("en")}>EN</button>
            </div> : null; })()}
          <button className="btn bg bsm" onClick={clearScore}>Try again</button>
        </div>
      </div>
      <div style={{fontSize:11,color:"var(--ink3)",marginTop:8,lineHeight:1.5}}>
        ≈ Pronunciation chỉ ước lượng từ văn bản + nhịp nói (chưa phân tích âm vị thật) — hãy xem như tham khảo tương đối, không phải điểm phát âm chính thức.
      </div>

      {/* Acoustic features (compact) */}
      {score.examiner_feedback?.acoustic_features && <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",fontSize:11,color:"var(--ink2)",fontFamily:"'Geist Mono',monospace"}}>
        {(() => {
          const a = score.examiner_feedback.acoustic_features;
          return [
            ["WPM", a.wpm],
            ["Words", a.word_count],
            ["Pauses", `${a.pause_count} (${a.long_pause_count} long)`],
            ["Fillers", `${a.filler_count} / 100w = ${a.filler_per_100w}`],
            ["TTR", a.type_token_ratio],
            ["Connectives", a.connective_count]
          ].map(([k,v],i) =>
            <span key={i} style={{padding:"4px 10px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:999}}>
              <span style={{color:"var(--ink3)"}}>{k}</span> {v}
            </span>);
        })()}
      </div>}

      {/* Transcript */}
      {score.user_transcript && <details style={{marginTop:12,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8}}>
        <summary style={{cursor:"pointer",fontSize:12,color:"var(--ink2)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase"}}>
          Your transcript
        </summary>
        <p style={{margin:"8px 0 0 0",fontSize:13.5,color:"var(--ink)",lineHeight:1.55}}>{score.user_transcript}</p>
      </details>}

      {/* Band gap — fastest route to the next half-band */}
      {score.examiner_feedback?.band_gap?.weakest_criterion && (() => {
        const g = score.examiner_feedback.band_gap;
        const en = fbLang==="en";
        const why = en && g.why_not_higher_en ? g.why_not_higher_en : g.why_not_higher_vi;
        const toImprove = en && g.to_improve_en?.length ? g.to_improve_en : g.to_improve_vi;
        return <div style={{marginTop:14,padding:"12px 14px",background:"var(--surface)",border:"1px solid var(--orchid, #c084fc)",borderRadius:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
            <span style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase"}}>{en?"Closest next band":"Gần band kế tiếp nhất"}</span>
            <span style={{fontSize:13,color:"var(--ink)",fontWeight:600}}>{g.weakest_criterion}</span>
            <span style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)"}}>{formatBand(g.current_band)} → {formatBand(g.next_band)}</span>
          </div>
          {why && <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55,marginBottom:6}}>{why}</div>}
          {toImprove?.length > 0 && <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink)",lineHeight:1.55}}>
            {toImprove.map((x,i) => <li key={i}>{x}</li>)}
          </ul>}
        </div>;
      })()}

      {/* Feedback per criterion (language-aware) */}
      <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>
        {Object.entries((() => { const fb=score.examiner_feedback||{}; const en=fbLang==="en"&&fb.feedback_en&&Object.values(fb.feedback_en).some(a=>a&&a.length); return (en?fb.feedback_en:fb.feedback_vi)||{}; })()).map(([key, bullets]) =>
          <div key={key} style={{padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8}}>
            <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>
              {FEEDBACK_KEY_MAP[key] || key}
            </div>
            <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink)",lineHeight:1.55}}>
              {(bullets || []).map((b,i) => <li key={i}>{b}</li>)}
            </ul>
            {score.examiner_feedback?.evidence?.[key]?.length > 0 && <div style={{marginTop:8,fontSize:11,color:"var(--ink3)"}}>
              <em>Evidence:</em> {score.examiner_feedback.evidence[key].map((e,i) =>
                <span key={i} style={{display:"inline-block",margin:"2px 4px 2px 0",padding:"1px 6px",background:"var(--bg2,#f5f5f7)",borderRadius:4,fontStyle:"italic"}}>"{e}"</span>
              )}
            </div>}
          </div>
        )}
      </div>

      {/* Next steps (language-aware) */}
      {(() => { const fb=score.examiner_feedback||{}; const steps = (fbLang==="en"&&fb.next_steps_en?.length)?fb.next_steps_en:fb.next_steps_vi;
        return steps?.length > 0 && <div style={{marginTop:12,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--leaf)",borderRadius:8}}>
        <div style={{fontSize:11,color:"var(--leaf)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>{fbLang==="en"?"Next steps":"Bước tiếp theo"}</div>
        <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink)",lineHeight:1.55}}>
          {steps.map((s,i) => <li key={i}>{s}</li>)}
        </ul>
      </div>; })()}
    </div>}

    {/* History */}
    {tests.length > 0 && <div className="card" style={{marginBottom:14}}>
      <div className="card-h"><div className="cdot"/>Recent attempts ({tests.length})</div>
      <ul style={{listStyle:"none",padding:0,margin:"10px 0 0 0",display:"flex",flexDirection:"column",gap:6}}>
        {tests.slice(0, 8).map(t =>
          <li key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",border:"1px solid var(--border)",borderRadius:8,background:"var(--surface)"}}>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:".08em",minWidth:60}}>{t.part}</span>
            <span style={{fontSize:12,color:"var(--ink2)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.offline ? "Self practice - " : ""}{t.question_text}</span>
            <span style={{fontFamily:t.offline?"'Geist Mono',monospace":"'Fraunces',serif",fontSize:t.offline?10:18,color:"var(--ink)",minWidth:36,textAlign:"right"}}>{t.offline ? "SELF" : formatBand(t.overall_band)}</span>
            <span style={{fontSize:11,color:"var(--ink3)",minWidth:80,textAlign:"right"}}>{new Date(t.date).toLocaleDateString()}</span>
          </li>
        )}
      </ul>
    </div>}

    {/* Help footer */}
    {!health.ok && !health.checking && <div className="card" style={{marginBottom:14,background:"var(--surface)"}}>
      <div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Backend not running</div>
      <ol style={{margin:"8px 0 0 0",paddingLeft:20,fontSize:12.5,color:"var(--ink2)",lineHeight:1.7}}>
        <li>Double-click <code>start-speaking-backend.bat</code> in the project folder</li>
        <li>Or open a terminal in the <code>speaking-backend/</code> folder</li>
        <li>Activate venv and install deps (see <code>speaking-backend/README.md</code>)</li>
        <li>Edit <code>.env</code> and paste your <code>EXAMINER_API_KEY</code> (Groq / OpenAI / etc.)</li>
        <li>Run <code>python -m src.seed_questions</code> once</li>
        <li>Start the server: <code>.\.venv\Scripts\python.exe -m uvicorn src.main:app --host 127.0.0.1 --port 8000</code></li>
        <li>Change the backend URL in <em>Settings</em> if not on the default port</li>
      </ol>
    </div>}
  </div>;
}
