const NAV_ITEMS = [
  {id:"dashboard",icon:"◈",label:"Dashboard"},
  {id:"vocab",icon:"✦",label:"Vocab"},
  {id:"practice",icon:"◎",label:"Writing"},
  {id:"reading",icon:"R",label:"Reading"},
  {id:"listening",icon:"L",label:"Listening"},
  {id:"speaking",icon:"S",label:"Speaking"},
  {id:"settings",icon:"⚙",label:"Settings"}
];

// ─── Gemini retry toast ──────────────────────────────────────────────────────
// Listens for the custom event dispatched by callAPI on 429 auto-retry.
// Shows a small, unobtrusive pill at the bottom-right so the user knows
// the app is working rather than frozen.
function GeminiRetryToast() {
  const [msg,setMsg] = useState("");
  const timerRef = useRef(null);
  useEffect(()=>{
    const handler = (e) => {
      const {provider,delaySec,attempt} = e.detail || {};
      setMsg(`${provider||"AI"} rate limit — auto-retrying ${attempt}/2 in ${delaySec}s…`);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(()=>setMsg(""), (delaySec+4)*1000);
    };
    document.addEventListener("ielts-api-retry", handler);
    return ()=>{ document.removeEventListener("ielts-api-retry", handler); clearTimeout(timerRef.current); };
  },[]);
  if (!msg) return null;
  return <div style={{
    position:"fixed",bottom:72,right:16,zIndex:9999,
    background:"var(--surface2)",border:"1px solid var(--honey)",color:"var(--honey)",
    borderRadius:8,padding:"8px 14px",fontSize:12,lineHeight:1.4,maxWidth:300,
    boxShadow:"0 8px 24px color-mix(in srgb, var(--bg) 42%, transparent)",fontFamily:"'Geist Mono',monospace",
    animation:"none",pointerEvents:"none"
  }}>⏳ {msg}</div>;
}
// ─────────────────────────────────────────────────────────────────────────────

// Failover toast: shows when callAPI auto-switches to another provider (or is trying to),
// so the user knows their AI task kept running on a different provider.
function FailoverToast() {
  const [msg,setMsg] = useState("");
  const [tone,setTone] = useState("honey");
  const timerRef = useRef(null);
  useEffect(()=>{
    const show = (text, t, ms) => {
      setMsg(text); setTone(t);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(()=>setMsg(""), ms);
    };
    const onTry = (e) => { const d=e.detail||{}; show(`${d.failed||"Provider"} unavailable — switching to ${d.next||"another provider"}…`, "honey", 8000); };
    const onOk  = (e) => { const d=e.detail||{}; show(`Switched to ${d.now||"another provider"} — task continued.`, "leaf", 6000); };
    document.addEventListener("ielts-api-failover-try", onTry);
    document.addEventListener("ielts-api-failover", onOk);
    return ()=>{ document.removeEventListener("ielts-api-failover-try", onTry); document.removeEventListener("ielts-api-failover", onOk); clearTimeout(timerRef.current); };
  },[]);
  if (!msg) return null;
  const color = tone==="leaf" ? "var(--leaf)" : "var(--honey)";
  return <div style={{
    position:"fixed",bottom:108,right:16,zIndex:9999,
    background:"var(--surface2)",border:`1px solid ${color}`,color,
    borderRadius:8,padding:"8px 14px",fontSize:12,lineHeight:1.4,maxWidth:320,
    boxShadow:"0 8px 24px color-mix(in srgb, var(--bg) 42%, transparent)",fontFamily:"'Geist Mono',monospace",
    animation:"none",pointerEvents:"none"
  }}>{tone==="leaf"?"✓":"⇄"} {msg}</div>;
}
// ─────────────────────────────────────────────────────────────────────────────

function StorageErrorToast() {
  const [msg,setMsg] = useState("");
  const timerRef = useRef(null);
  useEffect(()=>{
    const handler = (e) => {
      setMsg(e.detail?.message || "Browser storage save failed.");
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(()=>setMsg(""), 12000);
    };
    window.addEventListener(STORAGE_SAVE_ERROR_EVENT, handler);
    return ()=>{ window.removeEventListener(STORAGE_SAVE_ERROR_EVENT, handler); clearTimeout(timerRef.current); };
  },[]);
  if (!msg) return null;
  return <div style={{
    position:"fixed",bottom:72,left:16,zIndex:9999,
    background:"var(--surface2)",border:"1px solid var(--rose)",color:"var(--rose)",
    borderRadius:8,padding:"8px 14px",fontSize:12,lineHeight:1.4,maxWidth:360,
    boxShadow:"0 8px 24px color-mix(in srgb, var(--bg) 42%, transparent)",fontFamily:"'Geist Mono',monospace",
    animation:"none",pointerEvents:"none"
  }}>Storage warning: {msg}</div>;
}

function StudyPlanReminderToast({state,setState,setPage}) {
  const [reminder,setReminder] = useState(null);
  const [leaving,setLeaving] = useState(false);
  const clearTimerRef = useRef(null);
  const skillPages = {writing:"practice",reading:"reading",listening:"listening",speaking:"speaking",vocab:"vocab",review:"dashboard"};

  useEffect(()=>{
    const toMinutes = (time) => {
      const m = /^(\d{2}):(\d{2})$/.exec(time||"");
      return m ? Number(m[1])*60 + Number(m[2]) : null;
    };
    const tick = () => {
      const plans = typeof normalizeStudyPlans === "function" ? normalizeStudyPlans(state.studyPlans) : (state.studyPlans || {});
      const today = TODAY();
      const daily = plans.dailyPlan || {};
      if (daily.date !== today) return;
      const now = new Date();
      const nowMins = now.getHours()*60 + now.getMinutes();
      const due = (daily.items||[]).find(item=>{
        const itemMins = toMinutes(item.time);
        const stamp = `${today} ${item.time}`;
        return itemMins !== null && itemMins <= nowMins && !item.done && item.notifiedAt !== stamp;
      });
      if (!due) return;
      const stamp = `${today} ${due.time}`;
      setReminder(due);
      setLeaving(false);
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(()=>{
        setLeaving(true);
        clearTimerRef.current = setTimeout(()=>setReminder(null), 320);
      }, 7000);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification("Study Plan reminder", {body:due.title}); } catch {}
      }
      setState(s=>{
        const current = typeof normalizeStudyPlans === "function" ? normalizeStudyPlans(s.studyPlans) : (s.studyPlans || {});
        return {
          ...s,
          studyPlans:{
            ...current,
            dailyPlan:{
              ...(current.dailyPlan||{}),
              items:((current.dailyPlan||{}).items||[]).map(item=>item.id===due.id?{...item,notifiedAt:stamp}:item)
            }
          }
        };
      });
    };
    tick();
    const id = setInterval(tick, 30000);
    return ()=>{ clearInterval(id); clearTimeout(clearTimerRef.current); };
  },[state.studyPlans]);

  if (!reminder) return null;
  return <div className="era-toast-host" style={{bottom:122}}>
    <div className={`era-toast t-sky ${leaving?"leaving":""}`}>
      <div style={{flex:1,minWidth:0}}>
        <div className="era-toast-title">Study reminder</div>
        <div className="era-toast-body">{reminder.title}</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <button className="btn bsm bg" onClick={()=>setReminder(null)}>Dismiss</button>
          <button className="btn bsm bp" onClick={()=>{setReminder(null);setPage(skillPages[reminder.skill]||"dashboard");}}>Open</button>
        </div>
      </div>
      <button className="era-toast-x" onClick={()=>setReminder(null)}>x</button>
    </div>
  </div>;
}

function OnboardingWizard({state,setState,setPage,hasConfig}) {
  if (state.onboardingComplete) return null;
  const finish = (mode, page, patch={}) => {
    setState(s=>({
      ...s,
      onboardingComplete:true,
      learnerMode:mode,
      targetBand: patch.targetBand ?? s.targetBand ?? 6.5,
      wordsPerDay: patch.wordsPerDay ?? s.wordsPerDay ?? 3,
      activeSublists: patch.activeSublists || s.activeSublists || [1,2,3],
      ...patch
    }));
    setPage(page);
  };
  const dismiss = () => setState(s=>({...s,onboardingComplete:true}));
  const serverMode = canUseFolderStorage();
  return <div style={{position:"fixed",inset:0,zIndex:10000,background:"color-mix(in srgb, var(--bg) 78%, transparent)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
    <div className="card" style={{width:"min(720px,100%)",maxHeight:"92vh",overflow:"auto",boxShadow:"0 18px 60px color-mix(in srgb, var(--bg) 55%, transparent)"}}>
      <div className="kicker">First session</div>
      <h1 className="title-x" style={{marginBottom:8}}>Start with one <em>track</em></h1>
      <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,marginBottom:14}}>
        Pick one route now. You can change every setting later.
      </div>
      <div className="cols-3" style={{marginBottom:12}}>
        <button style={{textAlign:"left",cursor:"pointer",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:13,color:"var(--ink)"}} onClick={()=>finish("starter-writing","practice",{targetBand:6.5,activeSublists:[1,2,3],wordsPerDay:3})}>
          <div className="card-h"><div className="cdot"/>Writing starter</div>
          <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55}}>Band 6.5 target, Task 1/2 practice, small daily vocab load.</div>
        </button>
        <button style={{textAlign:"left",cursor:"pointer",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:13,color:"var(--ink)"}} onClick={()=>finish("vocab-first","vocab",{targetBand:6.5,activeSublists:[1,2,3],wordsPerDay:5})}>
          <div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Vocab first</div>
          <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55}}>Five focused words today, AWL sublists 1-3, then quiz.</div>
        </button>
        <button style={{textAlign:"left",cursor:"pointer",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:13,color:"var(--ink)"}} onClick={()=>finish("setup-first","settings",{activeSublists:[1,2,3],wordsPerDay:3})}>
          <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Set up AI</div>
          <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55}}>{hasConfig ? "Review your provider and storage mode." : "Add one provider key before generating or grading."}</div>
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginBottom:14}}>
        <div className="alert ai" style={{marginBottom:0}}>Browser mode: localStorage only</div>
        <div className={`alert ${serverMode?"ag":"aw"}`} style={{marginBottom:0}}>{serverMode ? "Folder storage: active" : "Folder storage: run node scripts/serve.mjs"}</div>
        <div className="alert aw" style={{marginBottom:0}}>Speaking scoring needs backend</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
        <button className="btn bg bsm" onClick={dismiss}>Skip</button>
        {!hasConfig&&<button className="btn bp bsm" onClick={()=>finish("setup-first","settings",{activeSublists:[1,2,3],wordsPerDay:3})}>Add API key</button>}
      </div>
    </div>
  </div>;
}

function App() {
  const [page,setPage] = useState("dashboard");
  const [state,setStateRaw] = useState(()=>loadState());
  const [configs,setConfigsRaw] = useState(()=>loadConfigs());
  const [activeId,setActiveIdRaw] = useState(()=>loadActiveId());
  const config = useMemo(()=>configs.find(c=>c.id===activeId)||null,[configs,activeId]);

  const [folderStorage,setFolderStorage] = useState(()=>{
    const enabled = canUseFolderStorage();
    return {enabled,ready:!enabled,status:enabled?`Syncing ${STORAGE_FILE_LABEL}...`:"Browser localStorage",path:STORAGE_FILE_LABEL};
  });
  const folderStorageLoadedRef = useRef(!canUseFolderStorage());

  useEffect(()=>{
    if (!canUseFolderStorage()) return;
    let cancelled = false;
    (async()=>{
      try {
        const bundle = await loadFolderStorage();
        if (cancelled) return;
        if (bundle) {
          const applied = applyStorageBundle(bundle);
          if (applied) {
            setStateRaw(applied.state);
            setConfigsRaw(applied.configs);
            setActiveIdRaw(applied.activeId);
          }
          setFolderStorage({enabled:true,ready:true,status:`Loaded ${STORAGE_FILE_LABEL}`,path:STORAGE_FILE_LABEL});
        } else {
          await saveFolderStorage(makeStorageBundle(state,configs,activeId));
          if (!cancelled) setFolderStorage({enabled:true,ready:true,status:`Created ${STORAGE_FILE_LABEL}`,path:STORAGE_FILE_LABEL});
        }
      } catch(e) {
        if (!cancelled) setFolderStorage({enabled:true,ready:false,status:`Folder sync error: ${e.message}`,path:STORAGE_FILE_LABEL});
      } finally {
        folderStorageLoadedRef.current = true;
      }
    })();
    return ()=>{ cancelled = true; };
  },[]);

  useEffect(()=>{ applyDesignEra(state.designEra||"modern"); },[state.designEra]);

  // Keep the API-failover registry in sync: callAPI can then transparently switch to
  // any other saved provider when the active one is rate-limited / keyless / down.
  useEffect(()=>{ registerFailoverConfigs(configs, activeId, {enabled: state.apiFailover !== false}); },[configs, activeId, state.apiFailover]);

  useEffect(()=>{
    if (!canUseFolderStorage() || !folderStorageLoadedRef.current) return;
    const id = setTimeout(()=>{
      saveFolderStorage(makeStorageBundle(state,configs,activeId))
        .then(()=>setFolderStorage(s=>({...s,enabled:true,ready:true,status:`Saved ${STORAGE_FILE_LABEL} ${new Date().toLocaleTimeString()}`})))
        .catch(e=>setFolderStorage(s=>({...s,enabled:true,ready:false,status:`Folder sync error: ${e.message}`})));
    },400);
    return ()=>clearTimeout(id);
  },[state,configs,activeId]);


  // Setters that persist to localStorage automatically (single source of truth).
  // Support BOTH object and functional updater forms — functional form is required for
  // race-safe concurrent updates (e.g. quiz batch-loading missing words).
  const setState = (ns) => {
    if (typeof ns === 'function') {
      setStateRaw(prev => { const next = ns(prev); saveState(next); return next; });
    } else { setStateRaw(ns); saveState(ns); }
  };
  const setConfigs = (nc) => {
    if (typeof nc === 'function') {
      setConfigsRaw(prev => { const next = nc(prev); saveConfigs(next); return next; });
    } else { setConfigsRaw(nc); saveConfigs(nc); }
  };
  const setActiveId = (id) => {
    if (typeof id === 'function') {
      setActiveIdRaw(prev => { const next = id(prev); saveActiveId(next); return next; });
    } else { setActiveIdRaw(id); saveActiveId(id); }
  };

  const today = TODAY();
  const schedule = useMemo(()=>getSchedule(state.startDate, state.wordsPerDay, state.activeSublists),[state.startDate, state.wordsPerDay, state.activeSublists]);
  const todayEntry = schedule.find(d=>d.date===today);
  const todayDone = !!state.completedDays[today];
  const hasPriority = state.priorityWords.length > 0;
  // V6: surface revision queue in nav
  const dueRevisitCount = useMemo(()=>getDueRevisits(state.essays||[]).length,[state.essays]);
  const navVocabProgress = useMemo(()=>getAWLProgressData(state),[state.mastery,state.dailyStats,state.wordCache,state.customVocab]);

  const pageTitle = {dashboard:"Dashboard",vocab:"Vocab",practice:"Writing",reading:"Reading",listening:"Listening",speaking:"Speaking",settings:"Settings"}[page];

  return <div className="app">
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-tag">IELTS Academic</div>
        <div className="brand-name">Writing <em>Lab</em> ✦</div>
      </div>
      <div className="nav-group">
        <div className="nav-label">Main</div>
        {NAV_ITEMS.filter(n=>n.id!=="settings").map(n=><div key={n.id} className={`ni ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
          <span style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic"}}>{n.icon}</span>
          {n.label}
          {n.id==="vocab"&&((!todayDone&&todayEntry)||hasPriority)&&<span className="ni-badge">{hasPriority?"boost":"today"}</span>}
          {n.id==="practice"&&dueRevisitCount>0&&<span className="ni-badge" style={{background:"color-mix(in srgb, var(--orchid) 16%, var(--surface2))",color:"var(--orchid)"}}>🔁{dueRevisitCount}</span>}
          <div className="ni-dot"/>
        </div>)}
      </div>
      <div className="nav-group">
        <div className="nav-label">Config</div>
        <div className={`ni ${page==="settings"?"active":""}`} onClick={()=>setPage("settings")}>
          <span style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic"}}>⚙</span>Settings
          {!config&&<span className="ni-badge" style={{background:"color-mix(in srgb, var(--rose) 16%, var(--surface2))",color:"var(--rose)"}}>!key</span>}
          <div className="ni-dot"/>
        </div>
      </div>
      <div className="sfooter">
        <span style={{color:"var(--ink2)"}}>Vocab</span> {navVocabProgress.learnedTotal}/{navVocabProgress.total}<br/>
        <span style={{color:"var(--ink2)"}}>Daily</span> {state.wordsPerDay||3} w · Sub {(state.activeSublists||[]).join(",")}<br/>
        {config?<><span style={{color:"var(--ink2)"}}>AI</span> {config.name}</>:<span style={{color:"var(--rose)"}}>⚠ No AI config</span>}<br/>
        <span style={{color:"var(--ink2)"}}>Band</span> target {state.targetBand||7.0}<br/>
        <span style={{color:"var(--ink2)"}}>Storage</span> {folderStorageAvailable()
          ? <button type="button" title="Switch storage source between browser localStorage and the data/app-state.json folder file. Reloads the page." onClick={()=>{ const next=getStorageMode()==="folder"?"browser":"folder"; setStorageMode(next); try{location.reload();}catch{} }} style={{background:"none",border:"none",padding:0,margin:0,font:"inherit",color:"var(--leaf)",cursor:"pointer",textDecoration:"underline dotted"}}>{folderStorage.enabled?(folderStorage.ready?"folder":"syncing"):"browser"} ⇄</button>
          : (folderStorage.enabled?(folderStorage.ready?"folder":"syncing"):"browser")}<br/>
        <span style={{color:"var(--ink2)"}}>Archive</span> {(state.essays||[]).length} essay{(state.essays||[]).length===1?"":"s"}<br/>
        <span style={{color:"var(--ink2)"}}>Reading</span> {(state.readingTests||[]).length} attempt{(state.readingTests||[]).length===1?"":"s"}<br/>
        <span style={{color:"var(--ink2)"}}>Speaking</span> {(state.speakingTests||[]).length} attempt{(state.speakingTests||[]).length===1?"":"s"}
      </div>
    </nav>

    <main className="main">
      <div className="topbar">
        <div className="crumb">Writing Lab · <strong>{pageTitle}</strong></div>
        {(()=>{ const svg = _eraHeroSVG(state.designEra||"modern"); return svg ? <span title={(DESIGN_ERAS.find(e=>e.id===state.designEra)||{}).label} style={{width:28,height:28,display:"block",flexShrink:0,borderRadius:5,overflow:"hidden",marginLeft:"auto",marginRight:6,opacity:.85}} dangerouslySetInnerHTML={{__html:svg}}/> : null; })()}
        <div className="target-badge" onClick={()=>setPage("settings")}>TARGET {state.targetBand||7.0}</div>
      </div>
      {page==="dashboard"&&<DashboardPage state={state} setState={setState} goTo={setPage} hasConfig={!!config} config={config}/>}
      {page==="vocab"&&<VocabPage state={state} setState={setState} config={config}/>}
      {page==="practice"&&<PracticePage state={state} setState={setState} config={config}/>}
      {page==="reading"&&<ReadingPage state={state} setState={setState} config={config}/>}
      {page==="listening"&&<ListeningPage state={state} setState={setState} config={config}/>}
      {page==="speaking"&&<SpeakingPage state={state} setState={setState} config={config}/>}
      {page==="settings"&&<SettingsPage state={state} setState={setState} configs={configs} setConfigs={setConfigs} activeId={activeId} setActiveId={setActiveId}/>}
    </main>

    <nav className="bn">
      {NAV_ITEMS.map(n=><div key={n.id} className={`bni ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
        <div className="bni-icon">{n.icon}</div>{n.label}
      </div>)}
    </nav>
    <GeminiRetryToast/>
    <FailoverToast/>
    <StorageErrorToast/>
    <StudyPlanReminderToast state={state} setState={setState} setPage={setPage}/>
    <OnboardingWizard state={state} setState={setState} setPage={setPage} hasConfig={!!config}/>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
