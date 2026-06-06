// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TTS — Web Speech API (built-in browser, free, no setup)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _cachedVoice = null;
function pickBestEnglishVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (_cachedVoice) return _cachedVoice;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const isEnglish = (v) => v.lang && v.lang.toLowerCase().startsWith("en");
  const score = (v) => {
    let s = 0;
    if (!isEnglish(v)) return -1;
    const n = (v.name || "").toLowerCase();
    if (n.includes("natural")) s += 10;
    if (n.includes("neural")) s += 10;
    if (n.includes("google")) s += 7;
    if (n.includes("premium")) s += 6;
    if (n.includes("enhanced")) s += 5;
    if (v.localService === false) s += 4;
    if (v.lang === "en-GB" || v.lang === "en-US") s += 2;
    return s;
  };
  _cachedVoice = voices.filter(isEnglish).sort((a,b)=>score(b)-score(a))[0] || voices[0] || null;
  return _cachedVoice;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { _cachedVoice = null; pickBestEnglishVoice(); };
}

function speakText(text, opts = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(trimmed);
  utter.lang = opts.lang || "en-US";
  utter.rate = opts.rate ?? 0.95;
  utter.pitch = opts.pitch ?? 1.0;
  const voice = pickBestEnglishVoice();
  if (voice) utter.voice = voice;
  if (opts.onEnd) utter.onend = opts.onEnd;
  if (opts.onError) utter.onerror = opts.onError;
  window.speechSynthesis.speak(utter);
  return utter;
}

function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}

// Pick up to n DISTINCT English voices (best quality first) for multi-speaker playback.
function pickEnglishVoices(n = 4) {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const all = window.speechSynthesis.getVoices() || [];
  const en = all.filter(v => v.lang && v.lang.toLowerCase().startsWith("en"));
  if (!en.length) return [];
  const score = (v) => { const x = (v.name||"").toLowerCase(); let s=0;
    if (x.includes("natural")||x.includes("neural")) s+=10; if (x.includes("google")) s+=7;
    if (x.includes("premium")||x.includes("enhanced")) s+=5; if (v.localService===false) s+=4;
    if (v.lang==="en-GB"||v.lang==="en-US") s+=2; return s; };
  const sorted = en.slice().sort((a,b)=>score(b)-score(a));
  const out=[], seen=new Set();
  for (const v of sorted){ if(!seen.has(v.name)){ seen.add(v.name); out.push(v); } if(out.length>=Math.max(1,n)) break; }
  return out;
}

// Split a transcript into speaker turns: [Speaker A] / Speaker A: / WOMAN: etc. (label stripped).
function _ttsDialogueTurns(text) {
  const s = String(text||"");
  const re = /\[\s*([^\]\n]{1,30}?)\s*\]|(?:^|\n)[ \t]*([A-Z][A-Za-z]*(?:\s[A-Z][A-Za-z]+){0,2})[ \t]*:/g;
  const marks = [...s.matchAll(re)];
  if (!marks.length) return [{speaker:null, text:s.replace(/\s+/g," ").trim()}];
  const turns=[];
  const pre = s.slice(0, marks[0].index).trim(); if (pre) turns.push({speaker:null, text:pre});
  for (let i=0;i<marks.length;i++){
    const m=marks[i]; const spk=(m[1]||m[2]||"").trim();
    const seg = s.slice(m.index+m[0].length, i+1<marks.length?marks[i+1].index:s.length).replace(/\s+/g," ").trim();
    if (seg) turns.push({speaker:spk, text:seg});
  }
  return turns;
}

// Speak a (possibly multi-speaker) transcript: strips "[Speaker A]"/"Speaker A:" labels and gives
// each speaker a distinct voice + pitch so a conversation no longer sounds like one robot reading
// "Speaker A:" aloud. Falls back to a single voice for monologues. opts.onEnd fires when all done.
function speakDialogue(text, opts = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  window.speechSynthesis.cancel();
  const turns = _ttsDialogueTurns(text).filter(t=>t.text);
  if (!turns.length) { if (opts.onEnd) opts.onEnd(); return null; }
  const voices = pickEnglishVoices(4);
  const styleMap = new Map();
  const styleFor = (spk) => {
    if (spk==null) return { voice: voices[0], pitch: opts.pitch ?? 1.0 };
    if (!styleMap.has(spk)) {
      const i = styleMap.size;
      // alternate pitch so even identical voices are clearly two people
      styleMap.set(spk, { voice: voices[i % (voices.length||1)] || voices[0], pitch: (opts.pitch ?? 1.0) + (i % 2 ? 0.16 : -0.12) });
    }
    return styleMap.get(spk);
  };
  let idx = 0, cancelled = false;
  const next = () => {
    if (cancelled) return;
    if (idx >= turns.length) { if (opts.onEnd) opts.onEnd(); return; }
    const t = turns[idx++];
    const u = new SpeechSynthesisUtterance(t.text);
    const st = styleFor(t.speaker);
    u.lang = (st.voice && st.voice.lang) || opts.lang || "en-US";
    u.rate = opts.rate ?? 0.95;
    u.pitch = Math.max(0, Math.min(2, st.pitch));
    if (st.voice) u.voice = st.voice;
    u.onend = next;
    u.onerror = () => { if (opts.onError) opts.onError(); next(); };
    window.speechSynthesis.speak(u);
  };
  next();
  return { cancel(){ cancelled = true; window.speechSynthesis.cancel(); } };
}

function SpeakButton({text, size = "sm", title, className = ""}) {
  const [playing, setPlaying] = useState(false);
  const supported = typeof window !== "undefined" && !!window.speechSynthesis;
  const handleClick = (e) => {
    e.stopPropagation();
    if (!supported) return;
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    speakText(text, {
      onEnd: () => setPlaying(false),
      onError: () => setPlaying(false)
    });
  };
  if (!supported) return null;
  const sizePx = size === "lg" ? 28 : size === "md" ? 22 : 18;
  const fontPx = size === "lg" ? 14 : size === "md" ? 12 : 11;
  return <button
    onClick={handleClick}
    className={className}
    title={title || `Listen: ${String(text||"").slice(0,60)}`}
    style={{
      display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:sizePx,height:sizePx,minWidth:sizePx,
      borderRadius:"50%",border:"1px solid var(--border2)",
      background:playing?"var(--orchid)":"var(--surface2)",
      color:playing?"var(--bg)":"var(--ink2)",
      cursor:"pointer",fontSize:fontPx,padding:0,marginLeft:6,
      transition:"all .15s"
    }}>{playing ? "⏸" : "🔊"}</button>;
}

function PBar({value,max,color="var(--leaf)"}) {
  return <div className="pbar"><div className="pbar-fill" style={{width:`${max>0?Math.min(100,(value/max)*100):0}%`,background:color}}/></div>;
}
function MasteryDots({m}) {
  return <div className="mdots">{[1,2,3,4,5].map(i=><div key={i} className="mdot" style={{background:i<=m?"var(--leaf)":"transparent"}}/>)}</div>;
}
function bandColor(b) {
  if (b>=7.5) return "var(--leaf)"; if (b>=6.5) return "var(--sky)";
  if (b>=5.5) return "var(--honey)"; return "var(--rose)";
}
// POS helpers — maps AI-returned POS strings to standard class codes
function posToClass(posStr) {
  if (!posStr) return "";
  const s = String(posStr).toLowerCase().trim();
  if (s.startsWith("adv") || s.includes("adverb")) return "pos-adv";
  if (s.startsWith("adj") || s.includes("adjective")) return "pos-adj";
  if (s.startsWith("v") || s.includes("verb")) return "pos-v";
  if (s.startsWith("n") || s.includes("noun")) return "pos-n";
  return "";
}
function posToShort(posStr) {
  const cls = posToClass(posStr);
  return cls==="pos-n"?"N":cls==="pos-v"?"V":cls==="pos-adj"?"ADJ":cls==="pos-adv"?"ADV":(posStr||"");
}
function Spinner() { return <span className="spin"/>; }
function Loading({text="Loading..."}) { return <div className="loading"><Spinner/><span>{text}</span></div>; }

const WORK_TAB_META = {
  writing: {tabsKey:"writingWorkTabs", draftKey:"writingDrafts", base:"Writing", emptyDraft:()=>({activePracticeTask:"task1"})},
  reading: {tabsKey:"readingWorkTabs", draftKey:"readingDraft", base:"Reading", emptyDraft:()=>({tab:"generate"})},
  listening: {tabsKey:"listeningWorkTabs", draftKey:"listeningDraft", base:"Listening", emptyDraft:()=>({tab:"generate"})}
};

function cloneWorkDraft(draft) {
  if (!draft || typeof draft !== "object") return {};
  try { return JSON.parse(JSON.stringify(draft)); }
  catch { return {...draft}; }
}

function makeWorkTabId(kind) {
  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
}

function normalizeWorkTabState(kind, rawTabs, activeDraft) {
  const now = new Date().toISOString();
  const source = rawTabs && typeof rawTabs === "object" ? rawTabs : {};
  const seen = new Set();
  let tabs = Array.isArray(source.tabs) ? source.tabs : [];
  tabs = tabs
    .filter(t=>t && typeof t === "object")
    .map((t,i)=>{
      let id = String(t.id || `${kind}-${i+1}`);
      while (seen.has(id)) id = `${kind}-${i+1}-${seen.size}`;
      seen.add(id);
      return {
        id,
        draft: cloneWorkDraft(t.draft),
        createdAt: t.createdAt || now,
        updatedAt: t.updatedAt || t.draft?.updatedAt || now
      };
    });
  if (tabs.length === 0) tabs = [{id:`${kind}-main`, draft:cloneWorkDraft(activeDraft), createdAt:now, updatedAt:activeDraft?.updatedAt || now}];
  const activeId = tabs.some(t=>t.id===source.activeId) ? source.activeId : tabs[0].id;
  const lastClosed = source.lastClosed?.tab ? {
    ...source.lastClosed,
    tab: {...source.lastClosed.tab, draft:cloneWorkDraft(source.lastClosed.tab.draft)}
  } : null;
  return {activeId, tabs, lastClosed};
}

function workTabTitle(kind, draft, index) {
  const n = index + 1;
  if (kind === "writing") {
    const task = draft?.activePracticeTask || "task1";
    const labels = {task1:"Task 1", task2:"Task 2", full:"Full Test", review:"Review", theory:"Theory"};
    return `${labels[task] || "Writing"} #${n}`;
  }
  if (kind === "reading") return `${draft?.testData?.title || draft?.topic || "Reading"} #${n}`;
  if (kind === "listening") return `${draft?.testData?.title || draft?.topic || "Listening"} #${n}`;
  return `Tab ${n}`;
}

const WORK_DRAFT_META_KEYS = new Set([
  "activePracticeTask","tab","chartType","difficulty","taskType","promptMode","gradeMode",
  "practiceMode","topic","focusType","questionCount","wikiSubject","timerRunning","elapsed",
  "timerStartedAt","timerBase","activeSection","readingTheme","selectedPart","format","strictExam",
  "playbackRate","transcriptShown","audioStarted","audioFinished","updatedAt","importSourceName",
  "importLicense","importUsage","importRedistributionAllowed"
]);

function workDraftHasMeaningfulData(value, key="") {
  if (WORK_DRAFT_META_KEYS.has(key)) return false;
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return false;
  if (typeof value === "boolean") return value === true && !WORK_DRAFT_META_KEYS.has(key);
  if (Array.isArray(value)) return value.some(item=>workDraftHasMeaningfulData(item));
  if (typeof value === "object") return Object.entries(value).some(([k,v])=>workDraftHasMeaningfulData(v,k));
  return false;
}

function WorkTabBar({kind,tabs,activeId,onSelect,onNew,onClose,lastClosed,onRestore}) {
  lastClosed = lastClosed || tabs?.lastClosed || null;
  onRestore = onRestore || tabs?.restoreClosedTab || null;
  const restoreTitle = lastClosed?.title ? `Restore ${lastClosed.title}` : "Restore closed tab";
  return <div className="work-tabs" role="tablist" aria-label={`${WORK_TAB_META[kind]?.base || "Work"} tabs`}>
    <div className="work-tab-strip">
      {tabs.map((t,i)=>{
        const title = workTabTitle(kind,t.draft,i);
        const active = t.id === activeId;
        return <div key={t.id} className={`work-tab ${active?"active":""}`} role="presentation">
          <button type="button" className="work-tab-main" role="tab" aria-selected={active} title={title} onClick={()=>onSelect(t.id)}>
            <span>{title}</span>
          </button>
          {tabs.length>1&&<button type="button" className="work-tab-close" aria-label={`Close ${title}`} title="Close tab" onClick={(e)=>{e.stopPropagation(); onClose(t.id);}}>x</button>}
        </div>;
      })}
      <button type="button" className="work-tab-new" onClick={onNew}>+ New Tab</button>
      {lastClosed?.tab&&onRestore&&<button type="button" className="work-tab-new" onClick={onRestore} title={restoreTitle}>Restore closed</button>}
    </div>
  </div>;
}

function useSkillWorkTabs(kind, state, setState) {
  const meta = WORK_TAB_META[kind];
  const normalized = normalizeWorkTabState(kind, state?.[meta.tabsKey], state?.[meta.draftKey]);
  const activeDraft = state?.[meta.draftKey] || {};
  const tabs = normalized.tabs.map(t=>t.id===normalized.activeId ? {...t,draft:cloneWorkDraft(activeDraft)} : t);
  const activeId = normalized.activeId;
  const saveCurrentTab = (s, tabState) => {
    const now = new Date().toISOString();
    const currentDraft = cloneWorkDraft(s?.[meta.draftKey]);
    return tabState.tabs.map(t=>t.id===tabState.activeId ? {...t,draft:currentDraft,updatedAt:currentDraft.updatedAt || now} : t);
  };
  const setScopedState = (updater) => {
    setState(prev=>{
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!next) return prev;
      const tabState = normalizeWorkTabState(kind, next[meta.tabsKey] || prev[meta.tabsKey], prev[meta.draftKey]);
      const now = new Date().toISOString();
      const nextDraft = cloneWorkDraft(next[meta.draftKey]);
      return {
        ...next,
        [meta.tabsKey]: {
          activeId: tabState.activeId,
          tabs: tabState.tabs.map(t=>t.id===tabState.activeId ? {...t,draft:nextDraft,updatedAt:nextDraft.updatedAt || now} : t),
          lastClosed: tabState.lastClosed
        }
      };
    });
  };
  const selectTab = (id) => {
    setState(s=>{
      const tabState = normalizeWorkTabState(kind, s[meta.tabsKey], s[meta.draftKey]);
      const savedTabs = saveCurrentTab(s, tabState);
      const target = savedTabs.find(t=>t.id===id) || savedTabs[0];
      return {...s,[meta.draftKey]:cloneWorkDraft(target.draft),[meta.tabsKey]:{activeId:target.id,tabs:savedTabs,lastClosed:tabState.lastClosed}};
    });
  };
  const newTab = () => {
    setState(s=>{
      const tabState = normalizeWorkTabState(kind, s[meta.tabsKey], s[meta.draftKey]);
      const savedTabs = saveCurrentTab(s, tabState);
      const fresh = {id:makeWorkTabId(kind),draft:meta.emptyDraft(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      return {...s,[meta.draftKey]:cloneWorkDraft(fresh.draft),[meta.tabsKey]:{activeId:fresh.id,tabs:[...savedTabs,fresh],lastClosed:tabState.lastClosed}};
    });
  };
  const closeTab = (id) => {
    const tabIndex = tabs.findIndex(t=>t.id===id);
    const visibleTab = tabs[tabIndex];
    const title = visibleTab ? workTabTitle(kind, visibleTab.draft, Math.max(0,tabIndex)) : "this tab";
    if (visibleTab && workDraftHasMeaningfulData(visibleTab.draft)) {
      const ok = window.confirm(`Close ${title}? You can restore the most recently closed tab from the tab bar.`);
      if (!ok) return;
    }
    setState(s=>{
      const tabState = normalizeWorkTabState(kind, s[meta.tabsKey], s[meta.draftKey]);
      const savedTabs = saveCurrentTab(s, tabState);
      if (savedTabs.length <= 1) return s;
      const idx = Math.max(0, savedTabs.findIndex(t=>t.id===id));
      const closed = savedTabs.find(t=>t.id===id);
      const remaining = savedTabs.filter(t=>t.id!==id);
      const nextActiveId = tabState.activeId===id ? (remaining[Math.max(0,idx-1)] || remaining[0]).id : tabState.activeId;
      const target = remaining.find(t=>t.id===nextActiveId) || remaining[0];
      const closedTitle = closed ? workTabTitle(kind, closed.draft, idx) : title;
      return {...s,[meta.draftKey]:cloneWorkDraft(target.draft),[meta.tabsKey]:{activeId:target.id,tabs:remaining,lastClosed:closed?{tab:{...closed,draft:cloneWorkDraft(closed.draft)},title:closedTitle,closedAt:new Date().toISOString()}:tabState.lastClosed}};
    });
  };
  const restoreClosedTab = () => {
    setState(s=>{
      const tabState = normalizeWorkTabState(kind, s[meta.tabsKey], s[meta.draftKey]);
      if (!tabState.lastClosed?.tab) return s;
      const savedTabs = saveCurrentTab(s, tabState);
      const restored = {...tabState.lastClosed.tab,id:makeWorkTabId(kind),updatedAt:new Date().toISOString(),restoredAt:new Date().toISOString()};
      return {...s,[meta.draftKey]:cloneWorkDraft(restored.draft),[meta.tabsKey]:{activeId:restored.id,tabs:[...savedTabs,restored],lastClosed:null}};
    });
  };
  tabs.lastClosed = normalized.lastClosed;
  tabs.restoreClosedTab = restoreClosedTab;
  return {kind,tabs,activeId,lastClosed:normalized.lastClosed,setScopedState,selectTab,newTab,closeTab,restoreClosedTab};
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORD CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Answer comparison: case-insensitive AND trims BOTH sides + null-safe. (Bug fix: drills used
// to trim only the user's input, so a correct answer was marked wrong when the dataset answer
// had stray whitespace, and threw if answer was undefined.)
function _ansEq(a, b) { return String(a||"").toLowerCase().trim() === String(b||"").toLowerCase().trim(); }
function FillBlanks({items}) {
  const [ans,setAns] = useState({}), [chk,setChk] = useState({});
  return <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {items.map((item,i)=>{
      const ok = chk[i]!==undefined ? _ansEq(ans[i], item.answer) : null;
      return <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 13px"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--sky)",marginBottom:5}}>{item.context}</div>
        <div style={{color:"var(--ink2)",fontSize:13,lineHeight:1.6,marginBottom:7}}>{item.sentence.replace("___","______")}</div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <input type="text" value={ans[i]||""} onChange={e=>setAns(p=>({...p,[i]:e.target.value}))}
            disabled={!!chk[i]} placeholder="Your answer..." onKeyDown={e=>e.key==="Enter"&&setChk(p=>({...p,[i]:true}))}
            style={{flex:1,borderColor:ok===true?"var(--leaf)":ok===false?"var(--rose)":"var(--border2)"}}/>
          <button className="btn bp bsm" onClick={()=>setChk(p=>({...p,[i]:true}))}>Check</button>
          {ok===true&&<span style={{color:"var(--leaf)",fontSize:16}}>✓</span>}
          {ok===false&&<span style={{color:"var(--rose)",fontSize:11}}>→ {item.answer}</span>}
        </div>
      </div>;
    })}
  </div>;
}

function WordCard({wordData,isLoading,mastery,onRegen,canRegen,onAIEnhance,canAIEnhance,onLexisEnhance,canLexisEnhance,isLexisLoading,errMsg}) {
  const [tab,setTab] = useState("defs");
  const tabs = [{id:"defs",label:"Definitions"},{id:"examples",label:"Examples"},{id:"family",label:"Family"},{id:"blanks",label:"Fill Blanks"}];
  const isT1 = wordData && TASK1_AWL.has(wordData.word);
  const famCount = wordData?.family?.length||0;
  const lexisText = (item, keys=["term","word","synonym","phrase","text"]) => typeof item === "string" ? item : (keys.map(k=>item?.[k]).find(Boolean) || "");
  const idiomPhrase = (item) => lexisText(item, ["idiom","phrase","term","text"]);
  const lexisCollocations = (wordData?._collocations?.length ? wordData._collocations : (wordData?.collocations || wordData?.col || [])).map(item=>lexisText(item, ["phrase","collocation","text","term"])).filter(Boolean);
  const lexisSynonyms = (wordData?._synonyms?.length ? wordData._synonyms : (wordData?.synonyms || [])).filter(Boolean);
  const lexisAntonyms = (wordData?._antonyms?.length ? wordData._antonyms : (wordData?.antonyms || [])).filter(Boolean);
  const lexisIdioms = (wordData?._idioms?.length ? wordData._idioms : (wordData?.idioms || [])).filter(Boolean);
  const isAIEnhanced = !!wordData?._ai_enhanced;
  if (errMsg) return <div style={{textAlign:"center",padding:40,color:"var(--rose)"}}>⚠ {errMsg}</div>;
  if (isLoading) return <Loading text="Generating word data..."/>;
  if (!wordData) return null;
  return <div className="fu">
    <div style={{textAlign:"center",marginBottom:18,position:"relative"}}>
      <div style={{position:"absolute",top:0,right:0,display:"flex",gap:6}}>
        {canLexisEnhance&&<button className="btn bo bsm" onClick={onLexisEnhance} disabled={!!isLexisLoading} title="Generate and persist synonyms, collocations, and idioms for this word">{isLexisLoading?<><Spinner/> Lexis...</>:"Lexis"}</button>}
        {canAIEnhance&&!isAIEnhanced&&<button className="btn bp bsm" onClick={onAIEnhance} title="Replace template-generated content with high-quality AI definitions, real examples, and curated family forms">✨ AI Enhance</button>}
        {canRegen&&<button className="btn bg bsm" onClick={onRegen} title="Rebuild from local data (template engine)">↻ Regen</button>}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:6,flexWrap:"wrap"}}>
        {isT1&&<span className="t1-badge">✦ Task 1 key word</span>}
        {isAIEnhanced&&<span style={{background:"var(--orchid)",color:"var(--bg)",fontSize:10,padding:"2px 6px",borderRadius:6,fontWeight:600}}>✨ AI</span>}
        {!isAIEnhanced&&wordData?._source==="prebaked"&&<span style={{background:"var(--sky)",color:"var(--bg)",fontSize:10,padding:"2px 6px",borderRadius:6,marginLeft:6,fontWeight:600}}>📦 Offline</span>}
        {famCount>1&&<span className="family-badge">{famCount} family forms</span>}
      </div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:36,fontWeight:400,color:"var(--ink)",letterSpacing:-1,lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <span>{wordData.word}</span>
        <SpeakButton text={wordData.word} size="lg" title={`Listen: ${wordData.word}`}/>
      </div>
      <div style={{color:"var(--orchid)",fontSize:13,marginTop:4,fontStyle:"italic"}}>{wordData.ipa} · {wordData.pos?.join(", ")}</div>
      <div style={{display:"flex",justifyContent:"center",marginTop:8,gap:6,alignItems:"center"}}>
        <span style={{color:"var(--ink3)",fontSize:11}}>mastery</span><MasteryDots m={mastery||0}/>
      </div>
    </div>
    <div className="word-tabs mb8">
      {tabs.map(t=><button key={t.id} className="word-tab" onClick={()=>setTab(t.id)}
        style={{background:tab===t.id?"var(--leaf)":"var(--surface2)",color:tab===t.id?"var(--bg)":"var(--ink3)"}}>{t.label}</button>)}
    </div>
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:16,minHeight:160}}>
      {tab==="defs"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {/* Main Definition — single source of truth (VI + EN) */}
        {wordData.definitions?.map((d,i)=><div key={i} style={{borderLeft:"2px solid var(--leaf)",paddingLeft:12}}>
          <div style={{display:"flex",gap:5,marginBottom:4,flexWrap:"wrap"}}>
            <span className="chip cl" style={{fontSize:10}}>{d.pos}</span>
            <span className="chip" style={{fontSize:10}}>{d.context}</span>
          </div>
          <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".06em",marginBottom:2}}>VI</div>
          <div style={{color:"var(--ink)",fontSize:14,lineHeight:1.55,marginBottom:7,fontWeight:400}}>{d.meaning}</div>
          {d.meaning_en&&<>
            <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".06em",marginBottom:2}}>EN</div>
            <div style={{color:"var(--ink2)",fontSize:13,lineHeight:1.55,fontStyle:"italic"}}>{d.meaning_en}</div>
          </>}
        </div>)}
        {/* Collocations panel — NEW: surface entry.col with pattern hints */}
        {lexisCollocations.length>0&&<div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:"2px solid var(--orchid)",borderRadius:8,padding:"11px 13px",marginTop:4}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--orchid)",marginBottom:8,textTransform:"uppercase",display:"flex",alignItems:"center",gap:6}}>
            <span>🔗 Collocations</span>
            <span style={{color:"var(--ink3)",fontWeight:400,letterSpacing:".04em",textTransform:"none",fontSize:9.5,fontStyle:"italic"}}>— typical word combinations</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {lexisCollocations.map((c,i)=>{
              const pat = detectCollocationPattern(c);
              return <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:6,padding:"6px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:13.5,color:"var(--ink)",fontStyle:"italic"}}>{c}</span>
                {pat&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",letterSpacing:".05em",whiteSpace:"nowrap"}}>{pat}</span>}
              </div>;
            })}
          </div>
        </div>}
        {(lexisSynonyms.length>0||lexisAntonyms.length>0)&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:4}}>
          {lexisSynonyms.length>0&&<div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:"2px solid var(--sky)",borderRadius:8,padding:"11px 13px"}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--sky)",marginBottom:8,textTransform:"uppercase"}}>Synonyms</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {lexisSynonyms.map((s,i)=><span key={i} className="chip cs" style={{fontSize:11}}>{lexisText(s)}</span>)}
            </div>
          </div>}
          {lexisAntonyms.length>0&&<div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:"2px solid var(--rose)",borderRadius:8,padding:"11px 13px"}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--rose)",marginBottom:8,textTransform:"uppercase"}}>Antonyms</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {lexisAntonyms.map((s,i)=><span key={i} className="chip" style={{fontSize:11,borderColor:"color-mix(in srgb,var(--rose) 40%,var(--border))"}}>{lexisText(s)}</span>)}
            </div>
          </div>}
        </div>}
        {lexisIdioms.length>0&&<div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:"2px solid var(--honey)",borderRadius:8,padding:"11px 13px",marginTop:4}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--honey)",marginBottom:8,textTransform:"uppercase"}}>Idioms and fixed expressions</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {lexisIdioms.map((it,i)=><div key={i} style={{background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--ink)",fontStyle:"italic",marginBottom:3}}>{idiomPhrase(it)}</div>
              {typeof it !== "string" && it.meaning&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.45}}>{it.meaning}</div>}
              {typeof it !== "string" && it.example&&<div style={{fontSize:11,color:"var(--ink3)",lineHeight:1.45,marginTop:4}}>{it.example}</div>}
            </div>)}
          </div>
        </div>}
        {/* Usage Tip — REPURPOSED from old "Intuition" block to give a DISTINCT pattern-anchored tip */}
        {wordData.intuition&&(wordData.intuition.vi||wordData.intuition.en)&&<div style={{background:"linear-gradient(135deg,color-mix(in srgb, var(--sky) 8%, var(--surface2)),color-mix(in srgb, var(--leaf) 6%, var(--surface2)))",borderRadius:10,padding:"10px 13px",border:"1px solid var(--border)",borderLeft:"2px solid var(--sky)"}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--sky)",marginBottom:6,textTransform:"uppercase"}}>💡 Usage Tip (Feynman)</div>
          {wordData.intuition.vi&&<div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.5,marginBottom:4}}>{wordData.intuition.vi}</div>}
          {wordData.intuition.en&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5,fontStyle:"italic"}}>{wordData.intuition.en}</div>}
          {wordData.intuition.example&&<div style={{fontSize:11,color:"var(--ink3)",marginTop:7,paddingTop:6,borderTop:"1px dashed var(--border)",fontFamily:"'Geist Mono',monospace",lineHeight:1.5}}>e.g. {wordData.intuition.example}</div>}
        </div>}
      </div>}
      {tab==="examples"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
        {wordData.examples?.map((e,i)=><div key={i} style={{background:"var(--surface2)",borderRadius:9,padding:"9px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,gap:6}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:e.context?.toLowerCase().includes("task 1")?"var(--leaf)":"var(--sky)"}}>{e.context}</div>
            <SpeakButton text={e.sentence} size="sm"/>
          </div>
          <div style={{color:"var(--ink2)",fontSize:13,lineHeight:1.6,fontStyle:"italic"}}>"{e.sentence}"</div>
        </div>)}
      </div>}
      {tab==="family"&&<div>
        {wordData.family_definitions?.length>0 ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:11,color:"var(--ink3)",marginBottom:3}}>Each form has its own meaning, word-class and context (VI + EN):</div>
            {wordData.family_definitions.map((fd,i)=>{
              const exampleFB = wordData.family_fill_blanks?.find(fb=>fb.form===fd.form);
              const isHead = fd.form===wordData.word;
              const posCls = posToClass(fd.pos);
              const accent = isHead ? "var(--leaf)" : (posCls==="pos-n"?"var(--pos-n)":posCls==="pos-v"?"var(--pos-v)":posCls==="pos-adj"?"var(--pos-adj)":posCls==="pos-adv"?"var(--pos-adv)":"var(--orchid)");
              const srcLabel = fd._source==="manual" ? "✓ thủ công" : fd._source==="cross" ? "↗ entry riêng" : fd._source==="morphology" ? "⚙ morphology" : fd._source==="template" ? "≈ approx" : null;
              const srcColor = fd._source==="manual" ? "var(--leaf)" : fd._source==="cross" ? "var(--honey)" : fd._source==="morphology" ? "var(--sky)" : "var(--ink3)";
              return <div key={i} style={{background:"var(--surface2)",borderRadius:9,padding:"11px 13px",borderLeft:`2px solid ${accent}`}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"'Fraunces',serif",fontSize:17,color:accent,fontWeight:500,letterSpacing:-.3}}>{fd.form}</span>
                  <SpeakButton text={fd.form} size="sm" title={`Listen: ${fd.form}`}/>
                  <span className={`pos-pill ${posCls}`}>{fd.pos}</span>
                  {isHead&&<span className="chip cl" style={{fontSize:9,letterSpacing:".08em"}}>HEADWORD</span>}
                  {srcLabel&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:srcColor,letterSpacing:".05em",marginLeft:"auto"}}>{srcLabel}</span>}
                </div>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--orchid)",letterSpacing:".05em",fontWeight:700,marginBottom:2}}>VI</div>
                <div style={{color:"var(--ink)",fontSize:12.5,lineHeight:1.55,marginBottom:fd.meaning_en?6:(exampleFB?5:0)}}>{fd.meaning}</div>
                {fd.meaning_en&&<>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--sky)",letterSpacing:".05em",fontWeight:700,marginBottom:2}}>EN</div>
                  <div style={{color:"var(--ink2)",fontSize:12,lineHeight:1.5,fontStyle:"italic",marginBottom:exampleFB?6:0}}>{fd.meaning_en}</div>
                </>}
                {exampleFB&&<div style={{color:"var(--ink3)",fontSize:11.5,fontStyle:"italic",lineHeight:1.5,paddingLeft:8,borderLeft:"1px solid var(--border2)",marginTop:4}}>"{exampleFB.sentence}"</div>}
              </div>;
            })}
          </div>
        ) : (
          <div>
            <div className="alert ai mb14">⚠ Old cached version (no definitions per form). Click <strong>↻ Regen</strong> at top to get updated data with per-form meanings.</div>
            <div className="chips" style={{marginBottom:0}}>
              {wordData.family?.map((f,i)=><span key={i} className={`chip ${i===0?"cl":"co"}`} style={{fontSize:12}}>{f}</span>)}
            </div>
            {wordData.family_fill_blanks?.length>0&&<div style={{marginTop:12}}>
              <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:7}}>Examples of each form in context</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {wordData.family_fill_blanks.slice(0,6).map((fb,i)=><div key={i} style={{background:"var(--surface2)",borderRadius:8,padding:"8px 11px",fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
                  <span style={{color:"var(--orchid)",fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:600,marginRight:6}}>{fb.form}</span>
                  <span style={{fontStyle:"italic"}}>{fb.sentence}</span>
                </div>)}
              </div>
            </div>}
          </div>
        )}
      </div>}
      {tab==="blanks"&&<FillBlanks items={[...(wordData.family_fill_blanks||[]),...(wordData.fill_blanks||[])].slice(0,6)}/>}
    </div>
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUIZ MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const VOCAB_WRITE_TOPICS = ["education","the environment","technology","health","work and careers","globalisation","urban life and housing","crime and punishment","media and advertising","tourism and travel","government and society","science and research"];
function QuizMode({wordIndices,wordCache,masteryMap,learnerState={},onComplete,label="Quiz",onLoadMissing,onGenMore,config}) {
  const getEnglishDefinition = (word, data, def) => {
    const fallback = (typeof BASIC_AWL_GLOSS !== "undefined" && BASIC_AWL_GLOSS[word]) || data?.intuition?.en;
    return def?.meaning_en || fallback || "An academic word used in formal writing and analysis.";
  };
  const getEnglishFamilyMeaning = (headword, form, fd) => {
    const glossary = (typeof FAMILY_GLOSS !== "undefined" && FAMILY_GLOSS[form]?.en) || "";
    return fd?.meaning_en || glossary || `${form} is a ${fd?.pos || "family form"} related to "${headword}".`;
  };
  const escapeRegExp = (s) => String(s||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const posBucket = (pos) => {
    const p = String(pos||"").toLowerCase();
    if (!p) return "word";
    if (p.includes("adverb")) return "adverb";
    if (p.includes("adjective")) return "adjective";
    if (p.includes("noun") || p.includes("plural")) return "noun";
    if (p.includes("verb") || p.includes("3rd") || p.includes("past") || p.includes("gerund") || p.includes("-ing")) return "verb";
    return p;
  };
  const learnedWordsSet = useMemo(()=>{
    const set = new Set();
    Object.values(learnerState?.dailyStats||{}).forEach(d=>(d?.words||[]).forEach(w=>set.add(w)));
    return set;
  },[learnerState?.dailyStats]);
  const savedWritingText = useMemo(()=>{
    try { return JSON.stringify([learnerState?.essays||[],learnerState?.writingDrafts||{}]).toLowerCase(); }
    catch { return ""; }
  },[learnerState?.essays,learnerState?.writingDrafts]);
  const writingProfile = useMemo(()=>{
    const hist = (learnerState?.bandHistory||[]).slice(-10);
    const avg = (key) => {
      const vals = hist.map(h=>Number(h?.[key])).filter(Number.isFinite);
      if (!vals.length) return null;
      return vals.reduce((a,b)=>a+b,0)/vals.length;
    };
    const rules = [
      {id:"grammar",label:"grammar/form accuracy",terms:["grammar","grammatical","sentence structure","verb","tense","article","plural","agreement","preposition","word form"]},
      {id:"lexical",label:"lexical precision/collocation",terms:["lexical","vocabulary","word choice","collocation","less common","repetition","paraphrase","academic vocabulary"]},
      {id:"task",label:"task understanding",terms:["overview","position","answer all","prompt","requirement","key feature","thesis","address"]},
      {id:"cohesion",label:"context and logic tracking",terms:["coherence","cohesion","paragraph","logic","linking","progression"]}
    ].map(r=>({...r,count:0}));
    let gradedCount = 0;
    const pushText = (txt) => {
      const low = String(txt||"").toLowerCase();
      if (!low) return;
      rules.forEach(r=>{ if (r.terms.some(t=>low.includes(t))) r.count += 1; });
    };
    (learnerState?.essays||[]).forEach(e=>{
      const g = e?.gradeResult;
      if (!g) return;
      gradedCount += 1;
      pushText(g.overallComment);
      pushText(g.topPriority);
      ["ta","tr","cc","lr","gra"].forEach(k=>{
        const c = g[k] || {};
        pushText(c.whyNotHigher);
        (c.weaknesses||[]).forEach(pushText);
        (c.evidence||[]).forEach(pushText);
      });
      (g.taskAudit||[]).forEach(a=>{
        if (a?.status && a.status!=="pass") pushText(`${a.label||""} ${a.note||""}`);
      });
      (g.annotations||[]).forEach(a=>{
        if (a?.tag!=="strong") pushText(a?.comment);
      });
    });
    const issues = rules.filter(r=>r.count>0).sort((a,b)=>b.count-a.count).slice(0,2);
    return {gradedCount,avgLR:avg("lr"),avgGRA:avg("gra"),avgOverall:avg("overall"),issues};
  },[learnerState?.bandHistory,learnerState?.essays]);
  const readingProfile = useMemo(()=>{
    const bySkill = {};
    let attemptCount = 0;
    (learnerState?.readingTests||[]).forEach(t=>{
      attemptCount += 1;
      (t?.details||[]).forEach(d=>{
        const key = d?.skill || d?.type || "reading questions";
        if (!bySkill[key]) bySkill[key] = {key,correct:0,total:0};
        bySkill[key].total += 1;
        if (d?.correct) bySkill[key].correct += 1;
      });
    });
    const weak = Object.values(bySkill)
      .filter(x=>x.total>=2 && x.correct<x.total)
      .sort((a,b)=>(a.correct/a.total)-(b.correct/b.total))[0] || null;
    return {attemptCount,weak};
  },[learnerState?.readingTests]);
  const textHasTerm = (text, term) => !!term && new RegExp(`\\b${escapeRegExp(String(term).toLowerCase())}\\b`,"i").test(text||"");
  const getFamilyDef = (headword, form) =>
    wordCache[headword]?.family_definitions?.find(f=>String(f.form||"").toLowerCase()===String(form||"").toLowerCase());
  const getHeadwordMeaning = (word) => {
    const data = wordCache[word];
    const d = data?.definitions?.[0];
    return data ? getEnglishDefinition(word,data,d) : "no stored English definition yet";
  };
  const getLearnerEvidence = (headword, form, selectedWord) => {
    const priorityWords = learnerState?.priorityWords||[];
    return {
      mastery: Math.max(0,Math.min(5,Number(masteryMap?.[headword]??0))),
      selectedMastery: selectedWord && masteryMap?.[selectedWord]!=null ? Math.max(0,Math.min(5,Number(masteryMap[selectedWord]||0))) : null,
      learnedBefore: learnedWordsSet.has(headword),
      usedInWriting: textHasTerm(savedWritingText,headword) || textHasTerm(savedWritingText,form),
      writingChecked: savedWritingText.length>5,
      priority: priorityWords.includes(headword),
      writingProfile,
      readingProfile
    };
  };
  const learnerCause = ({mode,headword,form,selectedWord,correctPos,selectedPos,typed,possibleAlt}) => {
    const ev = getLearnerEvidence(headword,form,selectedWord);
    const issue = (id) => ev.writingProfile?.issues?.find(x=>x.id===id);
    const issueNote = (id) => {
      const found = issue(id);
      return found ? ` This matches ${found.count} saved writing signal${found.count===1?"":"s"} about ${found.label}.` : "";
    };
    if (mode==="col") return `Likely collocation weakness: the issue is natural word pairing, not just knowing each word separately.${issueNote("lexical")}`;
    if (correctPos && selectedPos && posBucket(correctPos)!==posBucket(selectedPos)) {
      return `Likely grammar or word-family issue: the sentence needs a ${posBucket(correctPos)}, but your answer is a ${posBucket(selectedPos)}.${issueNote("grammar")}`;
    }
    if (typed && getFamilyDef(headword,typed)) return `Likely form-selection issue: you chose a real family form, but not the exact form this sentence needs.${issueNote("grammar")}`;
    if (ev.mastery<=1) return `Likely vocabulary familiarity issue: your current mastery for "${headword}" is only M${ev.mastery}/5.`;
    if (ev.selectedMastery!=null && ev.selectedMastery>ev.mastery) {
      return `Likely over-reliance on a more familiar option: your chosen word is M${ev.selectedMastery}/5 while "${headword}" is M${ev.mastery}/5.`;
    }
    if (possibleAlt) return "This may feel like a multiple-answer item because the forms are close, but the stored sentence is testing one exact form.";
    if (issue("lexical")) return `Likely lexical precision issue: your saved writing feedback has repeated vocabulary/collocation signals.${issueNote("lexical")}`;
    if (ev.readingProfile?.weak) return `Likely context-cue issue: your Reading history is weaker on "${ev.readingProfile.weak.key}" (${ev.readingProfile.weak.correct}/${ev.readingProfile.weak.total}), so the prompt clue may not have been read tightly.`;
    return "Likely meaning nuance or recall issue: you have seen the target before, but the context cue was missed.";
  };
  const DiagnosticBlock = ({mode,cur,selected,typed}) => {
    const headword = mode==="mc" ? cur.word : cur.headword;
    const answer = mode==="mc" ? cur.word : cur.answer;
    const selectedValue = (typed||selected||"").trim();
    if (!selectedValue || selectedValue.toLowerCase()===String(answer).toLowerCase()) return null;
    const correctFd = mode==="mc" ? null : getFamilyDef(headword,answer);
    const selectedFd = mode==="fb"||mode==="famMC" ? getFamilyDef(headword,selectedValue) : null;
    const correctMeaning = mode==="mc" ? cur.def : getEnglishFamilyMeaning(headword,answer,correctFd);
    const selectedMeaning = mode==="mc"
      ? getHeadwordMeaning(selectedValue)
      : selectedFd
        ? getEnglishFamilyMeaning(headword,selectedValue,selectedFd)
        : selectedValue===headword ? getHeadwordMeaning(headword) : "not a stored family form for this word";
    const correctPos = mode==="mc" ? cur.pos : (correctFd?.pos || cur.context || cur.blankPos);
    const selectedPos = mode==="mc" ? wordCache[selectedValue]?.definitions?.[0]?.pos : selectedFd?.pos;
    const possibleAlt = !!selectedFd && !!correctFd && posBucket(selectedFd.pos)===posBucket(correctFd.pos);
    const ev = getLearnerEvidence(headword,answer,mode==="mc"?selectedValue:null);
    const whyCorrect = mode==="mc"
      ? `"${answer}" matches the definition: ${correctMeaning}`
      : mode==="col"
        ? `"${cur.original}" is the stored natural collocation. The blank expects a ${cur.blankPos||"word"} in a ${cur.pattern||"collocation"} pattern.`
        : `"${answer}" fits the sentence as ${correctFd?.pos||cur.context||"the target form"}: ${correctMeaning}`;
    const whyMissed = mode==="mc"
      ? `"${selectedValue}" points to a different meaning: ${selectedMeaning}.`
      : mode==="col"
        ? `"${selectedValue}" may be a real English word, but this item tests which word naturally combines in this phrase.`
        : `"${selectedValue}" ${selectedFd?`is ${selectedFd.pos}: ${selectedMeaning}`:"is not the required stored family form for this sentence"}.`;
    const nextFocus = mode==="mc"
      ? `Review the English definition and one example sentence for "${headword}".`
      : mode==="col"
        ? `Review "${cur.original}" as a whole phrase, then make one original sentence with it.`
        : `Review the family table for "${headword}" and say the target form aloud in the sentence.`;
    const chips = [
      `target M${ev.mastery}/5`,
      ev.learnedBefore ? "seen in daily study" : "not logged in daily study",
      ev.priority ? "in priority queue" : null,
      ev.writingChecked ? (ev.usedInWriting ? "seen in saved writing" : "not found in saved writing") : null,
      ev.selectedMastery!=null ? `chosen M${ev.selectedMastery}/5` : null,
      ev.writingProfile?.gradedCount ? `${ev.writingProfile.gradedCount} graded writing` : null,
      ev.readingProfile?.attemptCount ? `${ev.readingProfile.attemptCount} reading attempt${ev.readingProfile.attemptCount===1?"":"s"}` : null
    ].filter(Boolean);
    const bandBits = [
      ev.writingProfile?.avgLR!=null ? `LR avg ${ev.writingProfile.avgLR.toFixed(1)}` : null,
      ev.writingProfile?.avgGRA!=null ? `GRA avg ${ev.writingProfile.avgGRA.toFixed(1)}` : null
    ].filter(Boolean);
    const profileNotes = [
      ev.writingProfile?.issues?.length ? `Writing pattern: ${ev.writingProfile.issues.map(i=>`${i.label} x${i.count}`).join(", ")}${bandBits.length?` (${bandBits.join(", ")})`:""}.` : null,
      ev.readingProfile?.weak ? `Reading pattern: weakest recent area is ${ev.readingProfile.weak.key} (${ev.readingProfile.weak.correct}/${ev.readingProfile.weak.total}).` : null
    ].filter(Boolean);
    return <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderLeft:"2px solid var(--rose)",borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:11.5,lineHeight:1.55,color:"var(--ink2)"}}>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--rose)",marginBottom:6}}>Diagnostic</div>
      <div style={{marginBottom:5}}><strong style={{color:"var(--ink)"}}>Why correct:</strong> {whyCorrect}</div>
      <div style={{marginBottom:5}}><strong style={{color:"var(--ink)"}}>Why yours missed:</strong> {whyMissed}</div>
      <div style={{marginBottom:7}}><strong style={{color:"var(--ink)"}}>Likely cause:</strong> {learnerCause({mode,headword,form:answer,selectedWord:mode==="mc"?selectedValue:null,correctPos,selectedPos,typed:selectedValue,possibleAlt})}</div>
      {profileNotes.length>0&&<div style={{marginBottom:7}}><strong style={{color:"var(--ink)"}}>Profile evidence:</strong> {profileNotes.join(" ")}</div>}
      <div style={{marginBottom:8}}><strong style={{color:"var(--ink)"}}>Next focus:</strong> {nextFocus}</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{chips.map(c=><span key={c} className="chip" style={{fontSize:10,padding:"3px 7px"}}>{c}</span>)}</div>
    </div>;
  };

  // Build weighted word pool (lower mastery = more weight)
  const quizWords = useMemo(()=>{
    const wt=[];
    wordIndices.forEach(ref=>{
      const w = vocabRefToWord(ref,learnerState);
      if(!w)return;
      const wg=6-(masteryMap[w]??0);
      for(let k=0;k<wg;k++)wt.push(ref);
    });
    wt.sort(()=>Math.random()-.5);
    const pk=[],seen=new Set();
    for (const ref of wt){const key=vocabRefKey(ref);if(!seen.has(key)){pk.push(ref);seen.add(key);}if(pk.length>=20)break;}
    wordIndices.forEach(ref=>{const key=vocabRefKey(ref);if(!seen.has(key)){pk.push(ref);seen.add(key);}});
    return pk.map(ref=>({w:vocabRefToWord(ref,learnerState)})).filter(x=>x.w);
  },[]);

  // Phase 1: FILL-IN-THE-BLANK — a real sentence with the word blanked → choose the word
  // (replaces the old "definition → word" guess). Antonyms are used as distractors so the
  // learner must distinguish a word from its opposite; synonyms are excluded (they'd also fit).
  const mcQs = useMemo(()=>quizWords.map(w=>{
    const data = wordCache[w.w];
    if (!data) return null;
    const d = data?.definitions?.[0];
    let cloze = "";
    const fbs = [...(data.family_fill_blanks||[]), ...(data.fill_blanks||[])];
    const hwFb = fbs.find(fb => String(fb.answer||fb.form||"").toLowerCase()===w.w.toLowerCase() && fb.sentence);
    if (hwFb) cloze = String(hwFb.sentence||"");
    else {
      const ex = (Array.isArray(data.examples)&&data.examples[0]) || d?.example || "";
      const re = new RegExp(`\\b${escapeRegExp(w.w)}\\b`,"i");
      if (ex && re.test(ex)) cloze = ex.replace(re, "___");
    }
    return {word:w.w, def:getEnglishDefinition(w.w,data,d), pos:d?.pos||data.pos||"academic word",
      cloze, antonyms:(data._antonyms||data.antonyms||[]), synonyms:(data._synonyms||data.synonyms||[])};
  }).filter(Boolean),[]);
  const mcOpts = useMemo(()=>mcQs.map(q=>{
    const syn = new Set((q.synonyms||[]).map(s=>String(s).toLowerCase()));
    const ants = (q.antonyms||[]).map(a=>String(a||"").trim()).filter(a=>a && a.toLowerCase()!==q.word.toLowerCase()).slice(0,2);
    const others = quizWords.filter(w=>w.w!==q.word && !syn.has(w.w.toLowerCase())).map(w=>w.w).sort(()=>Math.random()-.5);
    const distractors = [...ants, ...others].filter((v,i,a)=>a.findIndex(x=>x.toLowerCase()===v.toLowerCase())===i && v.toLowerCase()!==q.word.toLowerCase()).slice(0,3);
    return [q.word,...distractors].sort(()=>Math.random()-.5);
  }),[]);

  // Phase 2: Fill blank — type ANY family form (cycle through all family forms, capped at 3 per word)
  const fbQs = useMemo(()=>{
    const items=[];
    quizWords.forEach(w=>{
      const data=wordCache[w.w]; if(!data) return;
      const fams = data.family_fill_blanks||[];
      if (fams.length>0) {
        // Take up to 3 family entries, prioritizing non-headword forms for variety
        const shuffled = [...fams].sort((a,b)=>{
          const aIsHead = (a.form||a.answer)===w.w?1:0;
          const bIsHead = (b.form||b.answer)===w.w?1:0;
          return aIsHead-bIsHead; // non-headword first
        });
        shuffled.slice(0,3).forEach(fb=>items.push({...fb,headword:w.w}));
      } else if (data.fill_blanks?.[0]) {
        items.push({...data.fill_blanks[0],form:w.w,headword:w.w});
      }
    });
    return items;
  },[]);

  // Phase 3: Family POS MC — given sentence, pick which family form fits (tests word-class awareness)
  const familyMC = useMemo(()=>{
    const items=[];
    quizWords.forEach(w=>{
      const data=wordCache[w.w]; if(!data) return;
      const fams = data.family_fill_blanks||[];
      const family = data.family||[w.w];
      if (fams.length<2||family.length<2) return; // need ≥2 family forms for meaningful choice
      // Pick 1 random family fill-blank with ≥3 family forms available as distractors
      const pool = fams.filter(fb=>fb.form&&fb.answer);
      if (pool.length===0) return;
      const pick = pool[Math.floor(Math.random()*pool.length)];
      const distractors = family.filter(f=>f!==pick.answer).slice(0,3);
      if (distractors.length<2) return;
      const options = [pick.answer,...distractors].sort(()=>Math.random()-.5);
      items.push({headword:w.w,sentence:pick.sentence,answer:pick.answer,options,context:pick.context});
    });
    return items;
  },[]);

  // V6 Phase 4: Collocation cloze — given a typical collocation with one word blanked,
  // pick the natural choice from 4 AWL options of the same POS.
  // Pedagogical goal: train *collocational competence*, the highest-value LR feature.
  //
  // Strategy per word: scan its collocations, prefer blanking the word that is NOT
  // a family member of the headword (user already knows family — too easy).
  // Cap at 1 cloze per word to keep quiz length reasonable.
  const colQs = useMemo(()=>{
    const items = [];
    quizWords.forEach(w => {
      const data = wordCache[w.w]; if (!data) return;
      const cols = data._collocations || [];
      if (cols.length === 0) return;
      // Family forms (lowercased) — used to decide which word in the collocation is "given"
      const famLower = new Set((data.family || [w.w]).map(f => f.toLowerCase()));

      // Try each collocation until we find one with a usable blank
      let chosen = null;
      for (const col of cols) {
        const parts = col.trim().toLowerCase().split(/\s+/);
        if (parts.length < 2 || parts.length > 4) continue;
        let pattern = detectCollocationPattern(col);
        // Skip patterns where blanking is awkward or trivial
        if (pattern === "prep + phrase" || pattern === "single" || !pattern) continue;

        // V6: Confident POS detection per word — check 3 sources in priority:
        //   1. AWL pool membership (strongest signal — explicitly tagged)
        //   2. Suffix match (-ly → adv, -al/ic/ous/ive → adj)
        //   3. unknown (don't use this position as blank)
        const wordPos = (w) => {
          for (const p of ["adj","adv","v","n"]) {
            if (COLLOC_DISTRACTOR_POOL[p].includes(w)) return p;
          }
          if (ADV_SUFFIX.test(w)) return "adv";
          if (ADJ_SUFFIX.test(w) && w.length > 4) return "adj"; // 4-char cutoff to avoid false positives
          return null;
        };
        const posPerWord = parts.map(wordPos);

        // Refine pattern from confident POS data (overrides naive suffix-only detection)
        if (parts.length === 2) {
          const a = posPerWord[0], b = posPerWord[1];
          if (a === "adj" && (b === "n" || b === null)) pattern = "adj + noun";
          else if (a === "adv") pattern = "adv + verb/adj";
          else if (a === "v" && b === "n") pattern = "verb + noun";
          else if (a === "v" && !b) pattern = "verb + prep";
        }

        // Pick blank position with FOUR quality gates:
        //   gate 1: not a stopword (would make a meaningless blank)
        //   gate 2: not a family form (user already knows headword family)
        //   gate 3: has confident POS (for plausible distractors)
        //   gate 4: ≥3 characters (short words are too guessable)
        const candidates = parts.map((p, i) => {
          if (STOPWORDS_FOR_CLOZE.has(p)) return null;
          if (p.length < 3) return null;
          const isFamily = famLower.has(p) || [...famLower].some(ff => ff.length > 3 && p.includes(ff));
          if (isFamily) return null;
          if (!posPerWord[i]) return null;
          return i;
        }).filter(i => i !== null);
        if (candidates.length === 0) continue;

        const blankIdx = candidates[0];
        const answer = parts[blankIdx];
        const posKey = posPerWord[blankIdx];

        const distractors = pickCollocDistractors(answer, posKey, famLower, 3);
        if (distractors.length < 3) continue;
        const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
        // Build display: replace blanked part with "_____"
        const displayed = parts.map((p, i) => i === blankIdx ? "_____" : p).join(" ");
        chosen = {
          headword: w.w,
          original: col,
          displayed,
          answer,
          options,
          pattern,
          blankPos: posKey
        };
        break; // one cloze per word — keep quiz balanced
      }
      if (chosen) items.push(chosen);
    });
    return items;
  },[]);

  // Phase 5: WRITE — produce ONE sentence using the word (or a collocation/synonym/antonym) on a
  // Writing topic; an AI coach checks it. Only when an AI provider is configured.
  const writeQs = useMemo(()=>{
    if (!config) return [];
    const items = [];
    quizWords.forEach((w,idx)=>{
      const data = wordCache[w.w]; if (!data) return;
      const alts = [
        ...((data._collocations||data.collocations||[]).slice(0,2).map(c=>typeof c==="string"?c:(c?.phrase||""))),
        ...((data._synonyms||data.synonyms||[]).slice(0,2)),
        ...((data._antonyms||data.antonyms||[]).slice(0,1))
      ].map(x=>String(x||"").trim()).filter(Boolean);
      items.push({word:w.w, headword:w.w, alternatives:alts, topic:VOCAB_WRITE_TOPICS[idx % VOCAB_WRITE_TOPICS.length]});
    });
    return items.slice(0,3); // keep the writing task short
  },[]);

  const [phase,setPhase]=useState("mc");
  const [qi,setQi]=useState(0);
  const [score,setScore]=useState(0);
  const [ans,setAns]=useState("");
  const [chk,setChk]=useState(false);
  const [selectedOpt,setSelectedOpt]=useState(null);
  const [results,setResults]=useState([]);
  const [genBusy,setGenBusy]=useState(false);
  const [writeAns,setWriteAns]=useState("");
  const [writeBusy,setWriteBusy]=useState(false);
  const [writeResult,setWriteResult]=useState(null);

  // V6: Phase 4 (col) is now part of the totalQ + prog calc
  const totalQ = mcQs.length+fbQs.length+familyMC.length+colQs.length+writeQs.length;
  const curArr = phase==="mc"?mcQs:phase==="fb"?fbQs:phase==="famMC"?familyMC:phase==="col"?colQs:writeQs;
  const cur = curArr[qi];
  const prog = phase==="mc"
    ? qi
    : phase==="fb"
      ? mcQs.length+qi
      : phase==="famMC"
        ? mcQs.length+fbQs.length+qi
        : phase==="col"
          ? mcQs.length+fbQs.length+familyMC.length+qi
          : mcQs.length+fbQs.length+familyMC.length+colQs.length+qi;

  if (totalQ===0) {
    const missing = vocabRefsToWords(wordIndices,learnerState).filter(w=>w&&!wordCache[w]);
    return <div style={{textAlign:"center",padding:40,color:"var(--ink2)"}}>
      <div style={{fontSize:32,marginBottom:12}}>⏳</div>
      <div style={{marginBottom:14}}>{missing.length>0 ? `${missing.length} word${missing.length>1?"s":""} not loaded yet.` : "No quiz data available."}</div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
        {missing.length>0&&onLoadMissing&&<button className="btn bp" disabled={genBusy} onClick={async()=>{
          setGenBusy(true);
          try { await onLoadMissing(missing); } finally { setGenBusy(false); }
        }}>{genBusy?<><Spinner/> Loading {missing.length}...</>:`⚡ Gen quiz now (${missing.length})`}</button>}
        <button className="btn bg" onClick={()=>onComplete([])}>Back</button>
      </div>
    </div>;
  }

  const handleMC = opt=>{
    if (chk) return; setSelectedOpt(opt); setChk(true);
    const ok=opt===cur.word; if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.word,form:cur.word,phase:"mc",correct:ok}]);
  };
  const handleFB = ()=>{
    if (chk||!ans.trim()) return; setChk(true);
    const ok=_ansEq(ans, cur.answer); if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.headword,form:cur.form||cur.answer,phase:"fb",correct:ok}]);
  };
  const handleFamilyMC = opt=>{
    if (chk) return; setSelectedOpt(opt); setChk(true);
    const ok=opt===cur.answer; if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.headword,form:cur.answer,phase:"famMC",correct:ok}]);
  };
  // V6: handle collocation cloze MC
  const handleCol = opt=>{
    if (chk) return; setSelectedOpt(opt); setChk(true);
    const ok=opt===cur.answer; if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.headword,form:cur.answer,phase:"col",correct:ok}]);
  };
  const next=()=>{
    setChk(false);setAns("");setSelectedOpt(null);setWriteAns("");setWriteResult(null);
    if (qi+1>=curArr.length) {
      // Phase transition order: mc → fb → famMC → col → write → result
      if (phase==="mc"&&fbQs.length>0) {setPhase("fb");setQi(0);}
      else if ((phase==="mc"||phase==="fb")&&familyMC.length>0) {setPhase("famMC");setQi(0);}
      else if ((phase==="mc"||phase==="fb"||phase==="famMC")&&colQs.length>0) {setPhase("col");setQi(0);}
      else if (phase!=="write"&&writeQs.length>0) {setPhase("write");setQi(0);}
      else setPhase("result");
    } else setQi(i=>i+1);
  };
  const submitWrite = async ()=>{
    if (writeBusy || !writeAns.trim() || writeResult) return;
    setWriteBusy(true);
    try {
      const r = await checkVocabSentence(config, cur.word, cur.alternatives, cur.topic, writeAns.trim());
      setWriteResult(r);
      if (r.ok) setScore(s=>s+1);
      setResults(rs=>[...rs,{word:cur.headword,form:cur.word,phase:"write",correct:!!r.ok}]);
    } catch(e) {
      setWriteResult({ok:false,feedback:"Check failed: "+e.message,suggestion:""});
    } finally { setWriteBusy(false); }
  };

  if (phase==="result") {
    // Group results by headword, count correct/total
    const byWord=results.reduce((a,r)=>{if(!a[r.word])a[r.word]={c:0,t:0,forms:new Set()};a[r.word].t++;if(r.correct)a[r.word].c++;a[r.word].forms.add(r.form);return a},{});
    const phaseStats = results.reduce((a,r)=>{if(!a[r.phase])a[r.phase]={c:0,t:0};a[r.phase].t++;if(r.correct)a[r.phase].c++;return a},{});
    return <div style={{textAlign:"center"}} className="fu">
      <div style={{fontSize:48,marginBottom:8}}>{score>=totalQ*.8?"🏆":score>=totalQ*.5?"💪":"📖"}</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:32,color:"var(--ink)",marginBottom:4}}>{score} / {totalQ}</div>
      <div style={{color:"var(--ink3)",marginBottom:18}}>{Math.round(score/totalQ*100)}% correct</div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:18}}>
        {phaseStats.mc&&<span className="chip cs">Fill the blank: {phaseStats.mc.c}/{phaseStats.mc.t}</span>}
        {phaseStats.fb&&<span className="chip co">Family fill: {phaseStats.fb.c}/{phaseStats.fb.t}</span>}
        {phaseStats.famMC&&<span className="chip cl">Form picker: {phaseStats.famMC.c}/{phaseStats.famMC.t}</span>}
        {phaseStats.col&&<span className="chip ch">Collocation: {phaseStats.col.c}/{phaseStats.col.t}</span>}
        {phaseStats.write&&<span className="chip" style={{borderColor:"var(--orchid)",color:"var(--orchid)"}}>Sentence writing: {phaseStats.write.c}/{phaseStats.write.t}</span>}
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:13,marginBottom:18,textAlign:"left"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:9}}>Per Word · forms tested</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {Object.entries(byWord).map(([w,s])=><span key={w} className={`chip ${s.c===s.t?"cl":s.c===0?"cr":"ch"}`} title={`Forms: ${[...s.forms].join(", ")}`}>{w} {s.c}/{s.t}<span style={{color:"var(--ink3)",marginLeft:3,fontSize:9}}>({s.forms.size}f)</span></span>)}
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn bp" onClick={()=>onComplete(results)}>Done ✓</button>
        {onGenMore&&<button className="btn bs" disabled={genBusy} onClick={async()=>{
          setGenBusy(true);
          try { await onGenMore(quizWords.map(w=>w.w)); } finally { setGenBusy(false); }
        }}>{genBusy?<><Spinner/> Generating...</>:"+ Gen more questions"}</button>}
      </div>
    </div>;
  }

  // Progress + phase label
  const phaseLabel = phase==="mc"?"Fill in the blank"
    :phase==="fb"?"Type the family form"
    :phase==="famMC"?"Pick the correct form"
    :phase==="col"?"Collocation cloze"
    :"Write a sentence";
  // V6: dynamic phase counter — total phases depends on which arrays have items
  const activePhases = [mcQs.length>0,fbQs.length>0,familyMC.length>0,colQs.length>0,writeQs.length>0].filter(Boolean).length;
  const phaseNum = phase==="mc"?1:phase==="fb"?2:phase==="famMC"?3:phase==="col"?4:5;
  return <div className="fu">
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11,color:"var(--ink3)"}}>
        <span>{phaseLabel} <span style={{color:"var(--ink3)",fontSize:10}}>· Phase {phaseNum}/{Math.max(activePhases,1)}</span></span>
        <span>{prog+1}/{totalQ}</span>
      </div>
      <PBar value={prog+1} max={totalQ}/>
    </div>

    {phase==="mc"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:13}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--sky)",marginBottom:7}}>{cur.cloze ? "Fill in the blank — choose the word" : `Match this definition (${cur.pos})`}</div>
        <div style={{color:"var(--ink)",fontSize:14.5,lineHeight:1.7,fontFamily:cur.cloze?"'Fraunces',serif":"inherit"}}>{cur.cloze ? cur.cloze.replace(/_+/g,"_______") : cur.def}</div>
        {cur.cloze && <div style={{color:"var(--ink3)",fontSize:11.5,marginTop:6,fontStyle:"italic"}}>Meaning: {cur.def}</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {mcOpts[qi]?.map(opt=>{
          let bg="var(--surface2)",border="var(--border2)",col="var(--ink)";
          if (chk){if(opt===cur.word){bg="color-mix(in srgb, var(--leaf) 12%, var(--surface2))";border="var(--leaf)";col="var(--leaf)";}
            else if(opt===selectedOpt){bg="color-mix(in srgb, var(--rose) 14%, var(--surface2))";border="var(--rose)";col="var(--rose)";}
            else {bg="var(--surface2)";border="var(--border2)";col="var(--ink3)";}}
          return <button key={opt} onClick={()=>handleMC(opt)} style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:10,padding:"11px 8px",cursor:chk?"default":"pointer",fontSize:13,fontWeight:500,transition:"all .13s"}}>{opt}</button>;
        })}
      </div>
      {chk&&<div style={{marginTop:10,background:"var(--surface)",border:`1px solid ${selectedOpt===cur.word?"var(--leaf)":"var(--rose)"}`,borderRadius:8,padding:"9px 12px",fontSize:12.5,lineHeight:1.5,color:selectedOpt===cur.word?"var(--leaf)":"var(--rose)"}}>
        {selectedOpt===cur.word?"✓ Correct":<>✗ Your answer: <strong>{selectedOpt}</strong> · Correct: <strong>{cur.word}</strong></>}
      </div>}
      {chk&&selectedOpt!==cur.word&&<div style={{marginTop:10}}><DiagnosticBlock mode="mc" cur={cur} selected={selectedOpt}/></div>}
      {chk&&<button className="btn bp" style={{width:"100%",marginTop:12,justifyContent:"center"}} onClick={next}>Next →</button>}
    </div>}

    {phase==="fb"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--sky)"}}>{cur.context||"family form"}</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>family of: {cur.headword}</div>
        </div>
        <div style={{color:"var(--ink2)",fontSize:14,lineHeight:1.6}}>{cur.sentence.replace("___","_______")}</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <input type="text" value={ans} onChange={e=>setAns(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!chk&&handleFB()} disabled={chk}
          placeholder="Type the exact form..." autoFocus
          style={{borderColor:chk?(_ansEq(ans, cur.answer)?"var(--leaf)":"var(--rose)"):"var(--border2)"}}/>
        <button className="btn bp" onClick={handleFB} disabled={chk||!ans.trim()}>Check</button>
      </div>
      {chk&&(()=>{
        const correct = _ansEq(ans, cur.answer);
        const fd = wordCache[cur.headword]?.family_definitions?.find(f=>f.form===cur.answer);
        return <div>
          <div style={{color:correct?"var(--leaf)":"var(--rose)",fontSize:13,marginBottom:8}}>
            {correct?"✓ Correct!":<>✗ Your answer: <strong>{ans.trim()}</strong> · Correct: <strong>{cur.answer}</strong></>}
          </div>
          <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--leaf)",fontWeight:500}}>{fd?.form||cur.answer}</span>
              <span className={`pos-pill ${posToClass(fd?.pos||"form")}`}>{fd?.pos||"form"}</span>
            </div>
            <div style={{color:"var(--ink2)",fontSize:11.5,lineHeight:1.5}}>{getEnglishFamilyMeaning(cur.headword,cur.answer,fd)}</div>
          </div>
          {!correct&&<DiagnosticBlock mode="fb" cur={cur} typed={ans.trim()}/>}
          <button className="btn bp" style={{width:"100%",justifyContent:"center"}} onClick={next}>Next →</button>
        </div>;
      })()}
    </div>}

    {phase==="famMC"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:13}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--leaf)"}}>Pick the form that fits</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{cur.headword} family</div>
        </div>
        <div style={{color:"var(--ink2)",fontSize:14,lineHeight:1.6}}>{cur.sentence.replace(cur.answer,"_______")}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {cur.options.map(opt=>{
          let bg="var(--surface2)",border="var(--border2)",col="var(--ink)";
          if (chk){if(opt===cur.answer){bg="color-mix(in srgb, var(--leaf) 12%, var(--surface2))";border="var(--leaf)";col="var(--leaf)";}
            else if(opt===selectedOpt){bg="color-mix(in srgb, var(--rose) 14%, var(--surface2))";border="var(--rose)";col="var(--rose)";}
            else {bg="var(--surface2)";border="var(--border2)";col="var(--ink3)";}}
          return <button key={opt} onClick={()=>handleFamilyMC(opt)} style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:10,padding:"11px 8px",cursor:chk?"default":"pointer",fontSize:13,fontWeight:500,fontFamily:"'Geist Mono',monospace",transition:"all .13s"}}>{opt}</button>;
        })}
      </div>
      {chk&&(()=>{
        const fd = wordCache[cur.headword]?.family_definitions?.find(f=>f.form===cur.answer);
        return <div style={{marginTop:12}}>
          <div style={{color:selectedOpt===cur.answer?"var(--leaf)":"var(--rose)",fontSize:13,marginBottom:8}}>
            {selectedOpt===cur.answer?"✓ Correct!":<>✗ Your answer: <strong>{selectedOpt}</strong> · Correct: <strong>{cur.answer}</strong></>}
          </div>
          <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--leaf)",fontWeight:500}}>{fd?.form||cur.answer}</span>
              <span className={`pos-pill ${posToClass(fd?.pos||"form")}`}>{fd?.pos||"form"}</span>
            </div>
            <div style={{color:"var(--ink2)",fontSize:11.5,lineHeight:1.5}}>{getEnglishFamilyMeaning(cur.headword,cur.answer,fd)}</div>
          </div>
          {selectedOpt!==cur.answer&&<DiagnosticBlock mode="famMC" cur={cur} selected={selectedOpt}/>}
          <button className="btn bp" style={{width:"100%",justifyContent:"center"}} onClick={next}>Next →</button>
        </div>;
      })()}
    </div>}

    {/* V6: Phase 4 — Collocation cloze */}
    {phase==="col"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:13}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,flexWrap:"wrap",gap:5}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--honey)"}}>Which word naturally fits?</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{cur.headword} · {cur.pattern}</div>
        </div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:"var(--ink)",lineHeight:1.4,fontStyle:"italic",letterSpacing:-.3,textAlign:"center",padding:"10px 0"}}>{cur.displayed}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {cur.options.map(opt=>{
          let bg="var(--surface2)",border="var(--border2)",col="var(--ink)";
          if (chk){if(opt===cur.answer){bg="color-mix(in srgb, var(--leaf) 12%, var(--surface2))";border="var(--leaf)";col="var(--leaf)";}
            else if(opt===selectedOpt){bg="color-mix(in srgb, var(--rose) 14%, var(--surface2))";border="var(--rose)";col="var(--rose)";}
            else {bg="var(--surface2)";border="var(--border2)";col="var(--ink3)";}}
          return <button key={opt} onClick={()=>handleCol(opt)} style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:10,padding:"11px 8px",cursor:chk?"default":"pointer",fontSize:13,fontWeight:500,fontFamily:"'Geist Mono',monospace",transition:"all .13s"}}>{opt}</button>;
        })}
      </div>
      {chk&&<div style={{marginTop:12}}>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderLeft:"2px solid var(--honey)",borderRadius:8,padding:"10px 13px",marginBottom:10}}>
          <div style={{color:selectedOpt===cur.answer?"var(--leaf)":"var(--rose)",fontSize:13,marginBottom:7}}>
            {selectedOpt===cur.answer?"✓ Correct!":<>✗ Your answer: <strong>{selectedOpt}</strong> · Correct: <strong>{cur.answer}</strong></>}
          </div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--honey)",marginBottom:4}}>Natural collocation</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",fontStyle:"italic",letterSpacing:-.2}}>{cur.original}</div>
          <div style={{fontSize:11,color:"var(--ink3)",marginTop:5,lineHeight:1.5}}>This is the natural pairing in academic English. The other options exist but don't combine as commonly with <strong style={{color:"var(--ink2)"}}>{cur.headword}</strong>.</div>
        </div>
        {selectedOpt!==cur.answer&&<DiagnosticBlock mode="col" cur={cur} selected={selectedOpt}/>}
        <button className="btn bp" style={{width:"100%",justifyContent:"center"}} onClick={next}>Next →</button>
      </div>}
    </div>}

    {phase==="write"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--orchid)",marginBottom:7}}>Write one sentence · topic: {cur.topic}</div>
        <div style={{color:"var(--ink)",fontSize:14,lineHeight:1.6}}>Write <strong>one</strong> sentence about <strong>{cur.topic}</strong> using <strong style={{color:"var(--orchid)"}}>{cur.word}</strong>{cur.alternatives?.length>0 && <> — or one of: {cur.alternatives.map((a,i)=><span key={i} className="chip cs" style={{fontSize:11,margin:"0 3px"}}>{a}</span>)}</>}.</div>
      </div>
      <textarea className="era-input" value={writeAns} onChange={e=>setWriteAns(e.target.value)} disabled={!!writeResult||writeBusy}
        placeholder={`e.g. a sentence about ${cur.topic} using "${cur.word}"…`} rows={3} style={{width:"100%",resize:"vertical"}}
        onKeyDown={e=>{ if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)) submitWrite(); }}/>
      {!writeResult && <button className="btn bp" style={{width:"100%",justifyContent:"center",marginTop:10}} onClick={submitWrite} disabled={writeBusy||!writeAns.trim()}>{writeBusy?<><Spinner/> Checking…</>:"Check with AI"}</button>}
      {writeResult && <div style={{marginTop:12}}>
        <div style={{background:"var(--surface)",border:`1px solid ${writeResult.ok?"var(--leaf)":"var(--rose)"}`,borderRadius:8,padding:"10px 13px",marginBottom:10}}>
          <div style={{color:writeResult.ok?"var(--leaf)":"var(--rose)",fontSize:13,fontWeight:600,marginBottom:5}}>
            {writeResult.ok?"✓ Good sentence":"✗ Needs work"} <span style={{fontSize:10.5,color:"var(--ink3)",fontWeight:400}}>· {writeResult.usedTarget?"used target":"target not used"} · {writeResult.onTopic?"on topic":"off topic"}</span>
          </div>
          {writeResult.feedback&&<div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55}}>{writeResult.feedback}</div>}
          {writeResult.suggestion&&<div style={{marginTop:7}}><div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--leaf)",marginBottom:3}}>Model sentence</div><div style={{fontFamily:"'Fraunces',serif",fontSize:13.5,color:"var(--ink)",fontStyle:"italic",lineHeight:1.5}}>{writeResult.suggestion}</div></div>}
        </div>
        <button className="btn bp" style={{width:"100%",justifyContent:"center"}} onClick={next}>Next →</button>
      </div>}
    </div>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARKITDOWN UPLOADER — upload any document, get Markdown back for AI use.
// Requires node scripts/serve.mjs (provides /api/markitdown via Python markitdown).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Every extension here has a dedicated MarkItDown converter in the installed build.
// (Audio .mp3/.m4a need ffmpeg on PATH — omitted by default; .wav transcription also needs ffmpeg.)
const MARKITDOWN_ACCEPT = ".pdf,.docx,.pptx,.xlsx,.xls,.csv,.txt,.md,.json,.html,.htm,.xml,.epub,.ipynb,.msg,.jpg,.jpeg,.png,.zip";
const MARKITDOWN_LABELS = "PDF · Word · PowerPoint · Excel (.xlsx/.xls) · CSV · Text · Markdown · JSON · HTML · XML · EPUB · Jupyter (.ipynb) · Outlook (.msg) · Image (JPG/PNG) · ZIP";

// Encode an ArrayBuffer to base64 in chunks (avoids stack overflow for large files).
function _arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

// Call the /api/markitdown server endpoint.
// Returns { markdown, filename } or throws with a helpful message.
async function callMarkItDown(file) {
  if (!folderStorageAvailable())
    throw new Error("Document upload requires the local server — run: node scripts/serve.mjs");
  const buf = await file.arrayBuffer();
  const data = _arrayBufferToBase64(buf);
  const res = await fetch("/api/markitdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, data })
  });
  const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
  if (!json.markdown) throw new Error("Empty content returned from markitdown");
  return { markdown: json.markdown, filename: json.filename || file.name };
}

/**
 * MarkItDownUploader — drop zone + file picker that converts any document to Markdown.
 *
 * Props:
 *   onResult(result)   called with { markdown, filename } on success
 *   label              button label (default "📎 Upload document")
 *   hint               optional description shown below the button
 *   disabled           disable the control
 *   compact            show as a simple inline button instead of a card
 */
function MarkItDownUploader({ onResult, label, hint, disabled, compact }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastFile, setLastFile] = useState("");
  const isLocal = folderStorageAvailable();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setLoading(true); setErr(""); setLastFile("");
    try {
      const result = await callMarkItDown(file);
      setLastFile(file.name);
      onResult(result);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  };

  const btnLabel = label || "📎 Upload document";
  const noticeColor = isLocal ? "var(--ink3)" : "var(--honey)";

  if (compact) {
    return <span>
      <label className={`btn bg bsm${disabled||loading?" disabled":""}`} style={{cursor:disabled||loading?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:5}}>
        {loading ? <><Spinner/> Converting…</> : btnLabel}
        <input type="file" accept={MARKITDOWN_ACCEPT} onChange={onFile} disabled={disabled||loading} style={{display:"none"}}/>
      </label>
      {lastFile&&!loading&&<span style={{fontSize:10.5,color:"var(--leaf)",marginLeft:8}}>✓ {lastFile}</span>}
      {err&&<span style={{fontSize:10.5,color:"var(--rose)",marginLeft:8,lineHeight:1.4}}>{err}</span>}
    </span>;
  }

  return <div className="card" style={{marginBottom:12}}>
    <div className="card-h"><div className="cdot"/>Import from document</div>
    <div style={{fontSize:11.5,color:"var(--ink3)",marginBottom:8,lineHeight:1.55}}>
      {hint || "Upload a document — content is extracted and used as source material for AI generation or grading."}
      <br/><span style={{color:noticeColor,fontSize:10.5}}>
        {isLocal ? `Supports: ${MARKITDOWN_LABELS}` : "⚠ Requires local server: run node scripts/serve.mjs"}
      </span>
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <label className={`btn bp bsm`} style={{cursor:disabled||loading||!isLocal?"not-allowed":"pointer",opacity:!isLocal?0.45:1}}>
        {loading ? <><Spinner/> Converting…</> : btnLabel}
        <input type="file" accept={MARKITDOWN_ACCEPT} onChange={onFile} disabled={disabled||loading||!isLocal} style={{display:"none"}}/>
      </label>
      {lastFile&&!loading&&<span style={{fontSize:11,color:"var(--leaf)"}}>✓ {lastFile}</span>}
    </div>
    {err&&<div className="alert ar" style={{marginTop:8,marginBottom:0,fontSize:11.5,lineHeight:1.5}}>{err}</div>}
  </div>;
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BandHistoryChart({history, era}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(()=>{
    if (!canvasRef.current||!history.length) return;
    if (chartRef.current) chartRef.current.destroy();
    // Era-aware palette (deterministic from DESIGN_ERAS — no getComputedStyle timing race).
    const eraDef = (typeof DESIGN_ERAS !== "undefined") ? DESIGN_ERAS.find(e=>e.id===era) : null;
    const V = (eraDef && eraDef.vars) ? eraDef.vars : null;
    const leaf = (V&&V.leaf)||"#a3e635", orchid = (V&&V.orchid)||"#c084fc";
    const ink2 = (V&&V.ink2)||"#8a8a98", ink3 = (V&&V.ink3)||"#4e4e5c", grid = (V&&V.border)||"#22222b";
    const rgba = (hex,a)=>{ try { return _hexToRgba(hex,a); } catch { return hex; } };
    const labels = history.slice(-12).map(h=>h.date.slice(5));
    const overall = history.slice(-12).map(h=>h.overall);
    const lr = history.slice(-12).map(h=>h.lr);
    chartRef.current = new Chart(canvasRef.current, {
      type:'line',
      data:{labels,datasets:[
        {label:'Overall',data:overall,borderColor:leaf,backgroundColor:rgba(leaf,.10),tension:.4,pointRadius:4,borderWidth:2,pointBackgroundColor:leaf},
        {label:'LR',data:lr,borderColor:orchid,backgroundColor:rgba(orchid,.06),tension:.4,pointRadius:3,borderWidth:1.5,borderDash:[4,3],pointBackgroundColor:orchid}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:ink2,font:{size:11,family:'Geist'}}}},
        scales:{x:{grid:{color:grid},ticks:{color:ink3,font:{size:10}}},y:{min:4,max:9,grid:{color:grid},ticks:{color:ink3,font:{size:10},stepSize:.5}}}}
    });
    return ()=>chartRef.current?.destroy();
  },[history, era]);
  if (!history.length) return <div className="empty"><div className="empty-icon">📊</div><div>Grade an essay to see band history.</div></div>;
  return <div style={{height:220}}><canvas ref={canvasRef}/></div>;
}
