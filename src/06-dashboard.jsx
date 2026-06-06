function getAWLProgressData(state) {
  // Progress is measured in DISTINCT WORDS (headwords) the learner has actually
  // studied/mastered — NOT family forms and NOT study-session counts. Every studied
  // form is collapsed to its AWL headword so one word counts once.
  const norm = (word) => String(word||"").trim().toLowerCase();
  const headwordOf = (word) => {
    const raw = norm(word);
    if (!raw) return "";
    if (typeof AWL_FORM_TO_HW !== "undefined" && AWL_FORM_TO_HW.get(raw)) return AWL_FORM_TO_HW.get(raw);
    const custom = getCustomVocabEntryForForm(raw,state);
    if (custom?.hw) return norm(custom.hw);
    return raw;
  };
  // Universe = distinct headwords across AWL + imported + cached words.
  const universe = new Set();
  (AWL_DATA||[]).forEach(entry=>{ const hw = norm(entry.hw); if (hw) universe.add(hw); });
  Object.keys(state.customVocab||{}).forEach(word=>{ const hw = headwordOf(word); if (hw) universe.add(hw); });
  Object.keys(state.wordCache||{}).forEach(word=>{ const hw = headwordOf(word); if (hw) universe.add(hw); });
  const total = Math.max(universe.size, 570);
  const levels = {1:0,2:0,3:0,4:0,5:0};
  // Per-headword highest mastery level (one word counted once at its best level).
  const headwordLevels = new Map();
  Object.entries(state.mastery||{}).forEach(([word,raw])=>{
    const level = Math.max(0,Math.min(5,Math.round(Number(raw)||0)));
    if (level > 0) {
      const hw = headwordOf(word);
      if (hw) headwordLevels.set(hw, Math.max(headwordLevels.get(hw)||0, level));
    }
  });
  // Distinct headwords the learner has touched (mastered OR studied in a session).
  const learned = new Set(headwordLevels.keys());
  Object.values(state.dailyStats||{}).forEach(day=>{
    (day?.words||[]).forEach(word=>{ const hw = headwordOf(word); if (hw) learned.add(hw); });
  });
  headwordLevels.forEach(level=>{ levels[level] += 1; });
  const learnedTotal = learned.size;
  const masteryTracked = headwordLevels.size;
  const mastered = levels[5] || 0;
  const inProgress = masteryTracked - mastered;
  return {total,levels,learnedTotal,masteryTracked,mastered,inProgress};
}

function getAWLFamilyForms(word,state={}) {
  const norm = (value) => String(value||"").trim().toLowerCase();
  const raw = norm(word);
  if (!raw) return [];
  const headword = (typeof AWL_FORM_TO_HW !== "undefined" && AWL_FORM_TO_HW.get(raw)) || raw;
  const forms = new Set();
  const add = (value) => { const key = norm(value); if (key) forms.add(key); };
  const entry = (typeof AWL_DATA_MAP !== "undefined" && AWL_DATA_MAP.get(headword)) ||
    ((AWL_DATA||[]).find(e=>norm(e.hw)===headword));
  const customEntry = getCustomVocabEntryForForm(raw,state) || getCustomVocabEntryForForm(headword,state);
  if (entry) {
    add(entry.hw);
    const fam = entry.fam || {};
    [...(fam.n||[]),...(fam.v||[]),...(fam.adj||[]),...(fam.adv||[])].forEach(add);
  } else if (customEntry) {
    add(customEntry.hw || headword);
    const fam = customEntry.fam || {};
    [...(fam.n||[]),...(fam.v||[]),...(fam.adj||[]),...(fam.adv||[])].forEach(add);
  } else add(headword);
  const cached = state.wordCache?.[headword] || state.wordCache?.[raw];
  (cached?.family||[]).forEach(add);
  return [...forms];
}

function getCustomVocabEntryForForm(word,state={}) {
  const norm = (value) => String(value||"").trim().toLowerCase();
  const raw = norm(word);
  if (!raw) return null;
  const custom = state.customVocab || {};
  if (custom[raw]) return custom[raw];
  for (const entry of Object.values(custom)) {
    if (!entry || typeof entry !== "object") continue;
    if (norm(entry.hw) === raw) return entry;
    const fam = entry.fam || {};
    const forms = [...(fam.n||[]),...(fam.v||[]),...(fam.adj||[]),...(fam.adv||[])].map(norm);
    if (forms.includes(raw)) return entry;
  }
  return null;
}

function AWLProgressBars({progress}) {
  const segments = [
    {level:1,label:"M1",count:progress.levels[1]||0,color:"var(--sky)"},
    {level:2,label:"M2",count:progress.levels[2]||0,color:"var(--pos-adj)"},
    {level:3,label:"M3",count:progress.levels[3]||0,color:"var(--honey)"},
    {level:4,label:"M4",count:progress.levels[4]||0,color:"var(--orchid)"},
    {level:5,label:"M5",count:progress.levels[5]||0,color:"var(--leaf)"}
  ];
  return <>
    <div className="awl-progress-row">
      <span>Mastery</span>
      <span><strong style={{color:"var(--leaf)"}}>{progress.masteryTracked}</strong> / {progress.total} <em>{progress.mastered} M5</em></span>
    </div>
    <div className="awl-stack-bar" title={`M1 ${progress.levels[1]||0} · M2 ${progress.levels[2]||0} · M3 ${progress.levels[3]||0} · M4 ${progress.levels[4]||0} · M5 ${progress.levels[5]||0}`}>
      {segments.map(s=>s.count>0&&<div key={s.level} className="awl-stack-seg" style={{width:`${(s.count/progress.total)*100}%`,minWidth:4,background:s.color}}/>)}
    </div>
    <div className="awl-level-legend">
      {segments.map(s=><span key={s.level}><i style={{background:s.color}}/> {s.label} {s.count}</span>)}
    </div>
    <div className="awl-progress-row total">
      <span>Total learned</span>
      <span><strong style={{color:"var(--sky)"}}>{progress.learnedTotal}</strong> / {progress.total}</span>
    </div>
    <div className="awl-total-bar">
      <div style={{width:`${(progress.learnedTotal/progress.total)*100}%`,minWidth:progress.learnedTotal>0?4:0}}/>
    </div>
    <div className="awl-progress-note">Counts distinct words (headwords) you have studied — family forms of the same word count once.</div>
  </>;
}

function getDashboardNextStep(state,{hasConfig,todayDone,todayEntry,priorityCount,dueCount}) {
  if (!hasConfig) return {
    title:"Connect one AI provider",
    body:"Generation, grading, AI examples, and feedback need one active provider.",
    action:"Open Settings",
    page:"settings",
    accent:"var(--sky)",
    tag:"setup"
  };
  if (priorityCount > 0) return {
    title:"Clear priority vocab",
    body:`${priorityCount} words from your essays are waiting. Finish these before adding more.`,
    action:"Start boost",
    page:"vocab",
    accent:"var(--leaf)",
    tag:"vocab"
  };
  if (!todayDone && todayEntry) return {
    title:"Do today's vocab session",
    body:todayEntry.type==="learn" ? `${todayEntry.wordIndices?.length||state.wordsPerDay||3} words scheduled today.` : `${todayEntry.wordIndices?.length||0} review words scheduled today.`,
    action:"Start vocab",
    page:"vocab",
    accent:"var(--leaf)",
    tag:"daily"
  };
  if (dueCount > 0) return {
    title:"Rewrite a due essay",
    body:`${dueCount} graded essay${dueCount===1?"":"s"} should be rewritten from scratch now.`,
    action:"Open Writing",
    page:"practice",
    accent:"var(--orchid)",
    tag:"revision"
  };
  if (!(state.essays||[]).length && !(state.bandHistory||[]).length) return {
    title:"Write one starter essay",
    body:"Create one short Writing attempt first; the app can build feedback and vocab debt from it.",
    action:"Start Writing",
    page:"practice",
    accent:"var(--orchid)",
    tag:"writing"
  };
  if (!(state.readingTests||[]).length) return {
    title:"Run one Reading mini drill",
    body:"Add a low-pressure Reading result so weak question types can start appearing.",
    action:"Open Reading",
    page:"reading",
    accent:"var(--sky)",
    tag:"reading"
  };
  if (!(state.listeningTests||[]).length) return {
    title:"Try one Listening transcript drill",
    body:"Use transcript practice first; real-audio work can come later.",
    action:"Open Listening",
    page:"listening",
    accent:"var(--honey)",
    tag:"listening"
  };
  return {
    title:"Do the next Writing attempt",
    body:"You have enough history for targeted feedback; keep the loop moving with one fresh essay.",
    action:"Open Writing",
    page:"practice",
    accent:"var(--orchid)",
    tag:"next"
  };
}

function DashboardNextStep({step,goTo}) {
  if (!step) return null;
  return <div className="card mb14" style={{borderLeft:`2px solid ${step.accent}`}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:220}}>
        <div className="card-h" style={{marginBottom:7}}><div className="cdot" style={{background:step.accent}}/>Next Step · {step.tag}</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:"var(--ink)",lineHeight:1.2,marginBottom:5}}>{step.title}</div>
        <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55}}>{step.body}</div>
      </div>
      <button className="btn bp" onClick={()=>goTo(step.page)}>{step.action}</button>
    </div>
  </div>;
}

function DashboardMistakeJournal({journal,goTo}) {
  if (!journal?.hasData) return null;
  const sectionMeta = {
    writing:{label:"Writing",page:"practice",action:"Open Writing",accent:"var(--orchid)"},
    reading:{label:"Reading",page:"reading",action:"Open Reading",accent:"var(--sky)"},
    listening:{label:"Listening",page:"listening",action:"Open Listening",accent:"var(--honey)"}
  };
  const sections = [
    {key:"writing",items:journal.writing||[],stat:(item)=>`${item.hits||0} hit${item.hits===1?"":"s"} / ${item.attempts||0} essay${item.attempts===1?"":"s"}`},
    {key:"reading",items:journal.reading||[],stat:(item)=>`${Math.round((item.rate||0)*100)}% correct / ${item.correct||0}/${item.total||0}`},
    {key:"listening",items:journal.listening||[],stat:(item)=>`${Math.round((item.rate||0)*100)}% correct / ${item.correct||0}/${item.total||0}`}
  ].filter(section=>section.items.length>0);
  const topMeta = sectionMeta[journal.top?.skill] || {};

  return <div className="card mb14" style={{borderLeft:"2px solid var(--rose)"}}>
    <div className="card-h" style={{marginBottom:8}}><div className="cdot" style={{background:"var(--rose)"}}/>Mistake Journal</div>
    {journal.top && <div style={{
      display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap",
      padding:"9px 10px",borderRadius:8,background:"color-mix(in srgb, var(--rose) 10%, var(--surface2))",
      border:"1px solid color-mix(in srgb, var(--rose) 28%, var(--border))",marginBottom:10
    }}>
      <div style={{flex:1,minWidth:220}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,color:"var(--rose)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>
          Focus across all skills {topMeta.label?`/ ${topMeta.label}`:""}
        </div>
        <div style={{fontSize:14,color:"var(--ink)",fontWeight:700,lineHeight:1.25}}>{journal.top.label}</div>
        {journal.top.detail && <div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.45,marginTop:3}}>{journal.top.detail}</div>}
      </div>
      {topMeta.page && <button className="btn bsm bp" onClick={()=>goTo(topMeta.page)}>{topMeta.action}</button>}
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>
      {sections.map(section=>{
        const meta = sectionMeta[section.key];
        return <div key={section.key} style={{padding:"9px 10px",borderRadius:8,background:"var(--surface2)",border:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:7}}>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,color:"var(--ink)",fontWeight:700}}>
              <span style={{width:7,height:7,borderRadius:999,background:meta.accent,display:"inline-block"}}/>
              {meta.label}
            </div>
            <button className="btn bsm" onClick={()=>goTo(meta.page)}>{meta.action}</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {section.items.slice(0,3).map(item=><div key={item.key||item.label} style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
              <span style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.35,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span>
              <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,color:"var(--ink3)",whiteSpace:"nowrap"}}>{section.stat(item)}</span>
            </div>)}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function DashboardLearnerPathRescue({state,setState,goTo,awlProgress}) {
  const essayCount = (state.essays||[]).length + (state.bandHistory||[]).length;
  const readingCount = (state.readingTests||[]).length;
  const listeningCount = (state.listeningTests||[]).length;
  const speakingCount = (state.speakingAttempts||state.speakingHistory||[]).length;
  const learned = awlProgress?.learnedTotal || 0;
  const hasProgress = essayCount>0 || readingCount>0 || listeningCount>0 || speakingCount>0 || learned>=5;
  const missingTrack = !state.learnerMode;
  const shouldShow = missingTrack || !hasProgress;
  if (!shouldShow) return null;
  const applyTrack = (mode,page,patch={}) => {
    setState?.(s=>({
      ...s,
      onboardingComplete:true,
      learnerMode:mode,
      targetBand:patch.targetBand ?? s.targetBand ?? 6.5,
      wordsPerDay:patch.wordsPerDay ?? s.wordsPerDay ?? 3,
      activeSublists:patch.activeSublists || s.activeSublists || [1,2,3],
      ...patch
    }));
    goTo(page);
  };
  const restartGuide = () => setState?.(s=>({...s,onboardingComplete:false}));
  const tracks = [
    {id:"starter-writing",label:"Writing starter",body:"Small AWL load plus one Task 1 or Task 2 attempt.",page:"practice",accent:"var(--orchid)",patch:{targetBand:6.5,activeSublists:[1,2,3],wordsPerDay:3}},
    {id:"vocab-first",label:"Vocab first",body:"Five words per day, then quiz before full skill practice.",page:"vocab",accent:"var(--leaf)",patch:{targetBand:6.5,activeSublists:[1,2,3],wordsPerDay:5}},
    {id:"balanced",label:"Full-skill balance",body:"Keep all four skills visible and use the daily study plan.",page:"dashboard",accent:"var(--sky)",patch:{targetBand:7.0,activeSublists:[1,2,3,4],wordsPerDay:4}}
  ];
  return <div className="card mb14" style={{borderLeft:"2px solid var(--sky)"}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:9}}>
      <div>
        <div className="card-h" style={{marginBottom:5}}><div className="cdot" style={{background:"var(--sky)"}}/>Learning Path Rescue</div>
        <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55}}>
          {missingTrack ? "Choose a clear study track so the dashboard stops feeling generic." : "You have little recorded progress. Pick one concrete route for the next session."}
        </div>
      </div>
      <button className="btn bg bsm" onClick={restartGuide}>Restart guide</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
      {tracks.map(track=><button key={track.id} className="btn bg" onClick={()=>applyTrack(track.id,track.page,track.patch)}
        style={{height:"auto",textAlign:"left",justifyContent:"flex-start",alignItems:"stretch",padding:0,overflow:"hidden"}}>
        <span style={{display:"block",width:4,background:track.accent,flexShrink:0}}/>
        <span style={{display:"block",padding:"9px 10px"}}>
          <span style={{display:"block",fontSize:12.5,color:"var(--ink)",fontWeight:700,marginBottom:3}}>{track.label}</span>
          <span style={{display:"block",fontSize:11,color:"var(--ink3)",lineHeight:1.45}}>{track.body}</span>
        </span>
      </button>)}
    </div>
  </div>;
}

function DashboardStudyPlan({state,setState,goTo,config}) {
  const plans = typeof normalizeStudyPlans === "function" ? normalizeStudyPlans(state.studyPlans) : (state.studyPlans || {});
  const targets = plans.targets || {};
  const dailyPlan = plans.dailyPlan || {date:TODAY(),items:[]};
  const items = dailyPlan.items || [];
  const skillOrder = plans.skillOrder || ["vocab","listening","reading","speaking","writing"];
  const horizonPlan = plans.horizonPlan || {status:"none",draft:null,confirmed:null,qa:[]};
  const [draft,setDraft] = useState({title:"",skill:"writing",estMins:25,time:"",difficulty:"medium"});
  const [permission,setPermission] = useState(()=>typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [sorting,setSorting] = useState(false);
  const [planBusy,setPlanBusy] = useState(false);
  const [planError,setPlanError] = useState("");
  const [userInfo,setUserInfo] = useState("");
  const [answerDrafts,setAnswerDrafts] = useState({});
  const today = TODAY();
  const doneCount = items.filter(item=>item.done).length;
  const totalMins = items.reduce((sum,item)=>sum+(Number(item.estMins)||0),0);
  const skillPages = {writing:"practice",reading:"reading",listening:"listening",speaking:"speaking",vocab:"vocab",review:"dashboard"};
  const skillLabels = {writing:"Writing",reading:"Reading",listening:"Listening",speaking:"Speaking",vocab:"Vocab",review:"Review"};
  const diffRank = {easy:1,medium:2,hard:3};
  const activeDraft = horizonPlan.draft?.status === "draft" ? horizonPlan.draft : null;
  const confirmedDraft = horizonPlan.confirmed?.status === "draft" ? horizonPlan.confirmed : null;
  const updatePlans = (fn) => setState?.(s=>{
    const current = typeof normalizeStudyPlans === "function" ? normalizeStudyPlans(s.studyPlans) : (s.studyPlans || {});
    const next = fn(current);
    return {...s,studyPlans:typeof normalizeStudyPlans === "function" ? normalizeStudyPlans(next) : next};
  });
  const updateTarget = (key,value) => updatePlans(plans=>({...plans,targets:{...(plans.targets||{}),[key]:value}}));
  const addItem = () => {
    const title = draft.title.trim();
    if (!title) return;
    updatePlans(plans=>({
      ...plans,
      dailyPlan:{
        ...(plans.dailyPlan||{}),
        date:today,
        sortedByAI:false,
        items:[...((plans.dailyPlan||{}).items||[]),{
          id:`plan-${Date.now()}`,
          title:title.slice(0,120),
          skill:draft.skill,
          estMins:Math.max(1,Math.min(240,Math.round(Number(draft.estMins)||25))),
          time:draft.time,
          difficulty:draft.difficulty,
          reason:"",
          done:false
        }]
      }
    }));
    setDraft(d=>({...d,title:""}));
  };
  const patchItem = (id,patch) => updatePlans(plans=>({
    ...plans,
    dailyPlan:{...(plans.dailyPlan||{}),items:((plans.dailyPlan||{}).items||[]).map(item=>item.id===id?{...item,...patch}:item)}
  }));
  const removeItem = (id) => updatePlans(plans=>({
    ...plans,
    dailyPlan:{...(plans.dailyPlan||{}),items:((plans.dailyPlan||{}).items||[]).filter(item=>item.id!==id)}
  }));
  const startToday = () => updatePlans(plans=>({...plans,dailyPlan:{date:today,items:[],sortedByAI:false}}));
  const sortEasyHard = () => updatePlans(plans=>({
    ...plans,
    dailyPlan:{...(plans.dailyPlan||{}),items:[...((plans.dailyPlan||{}).items||[])].sort((a,b)=>(diffRank[a.difficulty]||2)-(diffRank[b.difficulty]||2)),sortedByAI:false}
  }));
  const requestNotify = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };
  const moveSkill = (skill,dir) => updatePlans(plans=>{
    const order = [...(plans.skillOrder||skillOrder)];
    const i = order.indexOf(skill);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return plans;
    [order[i],order[j]] = [order[j],order[i]];
    return {...plans,skillOrder:order};
  });
  const aiSort = async () => {
    if (!items.length || sorting) return;
    setSorting(true); setPlanError("");
    try {
      const sorted = await sortPlanByDifficulty(config, items, {skillOrder});
      updatePlans(plans=>({
        ...plans,
        dailyPlan:{...(plans.dailyPlan||{}),items:sorted,sortedByAI:!!config}
      }));
    } catch(e) {
      setPlanError(e.message || "AI sort failed.");
    } finally {
      setSorting(false);
    }
  };
  const currentQuestions = horizonPlan.draft?.status === "needs_info" ? (horizonPlan.draft.questions||[]) : [];
  const answeredTurns = () => currentQuestions
    .map(q=>({q:q.q,a:String(answerDrafts[q.id]||"").trim()}))
    .filter(turn=>turn.q && turn.a);
  const draftPlan = async ({finalize=false}={}) => {
    setPlanBusy(true); setPlanError("");
    try {
      const qa = [...(horizonPlan.qa||[]),...answeredTurns()];
      const result = await draftStudyPlan(config, {...state,studyPlans:plans}, {answers:qa,userInfo,finalize});
      updatePlans(plans=>({
        ...plans,
        horizonPlan:{
          ...(plans.horizonPlan||{}),
          status:"drafting",
          draft:result,
          qa,
          updatedAt:new Date().toISOString()
        }
      }));
      setAnswerDrafts({});
    } catch(e) {
      setPlanError(e.message || "AI plan draft failed.");
    } finally {
      setPlanBusy(false);
    }
  };
  const acceptPlan = () => updatePlans(plans=>({
    ...plans,
    horizonPlan:{
      ...(plans.horizonPlan||{}),
      status:"confirmed",
      confirmed:(plans.horizonPlan||{}).draft,
      updatedAt:new Date().toISOString()
    }
  }));
  const resetPlanDraft = () => updatePlans(plans=>({
    ...plans,
    horizonPlan:{status:"none",draft:null,confirmed:null,qa:[],updatedAt:null}
  }));

  return <div className="card mt14">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:10}}>
      <div className="card-h" style={{marginBottom:0}}><div className="cdot" style={{background:"var(--sky)"}}/>Study Plan</div>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)"}}>
        {doneCount}/{items.length} done {items.length>0&&`/ ${totalMins} min`}
      </div>
    </div>

    <div className="sl" style={{marginBottom:7}}>Your targets</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
      {[["daily","Daily","e.g. 30 mins + 5 new words"],["weekly","Weekly","e.g. 1 Writing task + 2 Reading"],["monthly","Monthly","e.g. reach Band 6.5"],["yearly","Yearly","e.g. Band 7.5 overall"]].map(([k,lbl,ph])=>
        <label key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:11,color:"var(--ink3)"}}>{lbl} target</span>
          <input className="era-input" value={targets[k]||""} onChange={e=>updateTarget(k,e.target.value)} placeholder={ph} maxLength={300}/>
        </label>)}
      <label style={{display:"flex",flexDirection:"column",gap:4}}>
        <span style={{fontSize:11,color:"var(--ink3)"}}>Exam date</span>
        <input className="era-input" type="date" value={targets.examDate||""} onChange={e=>updateTarget("examDate",e.target.value)}/>
      </label>
    </div>

    <div style={{padding:"9px 10px",border:"1px solid var(--border)",borderRadius:8,background:"var(--surface2)",marginBottom:10}}>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:7}}>Skill order for easy-hard planning</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {skillOrder.map((skill,index)=><div key={skill} style={{display:"inline-flex",alignItems:"center",gap:5,border:"1px solid var(--border)",borderRadius:8,padding:"5px 7px",background:"var(--surface)"}}>
          <span style={{fontSize:11.5,color:"var(--ink2)"}}>{index+1}. {skillLabels[skill]||skill}</span>
          <button className="btn bsm bg" disabled={index===0} onClick={()=>moveSkill(skill,-1)}>Up</button>
          <button className="btn bsm bg" disabled={index===skillOrder.length-1} onClick={()=>moveSkill(skill,1)}>Down</button>
        </div>)}
      </div>
    </div>

    <div style={{padding:"10px",border:"1px solid var(--border)",borderRadius:8,background:"var(--surface2)",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:8}}>
        <div>
          <div style={{fontSize:13,color:"var(--ink)",fontWeight:700}}>AI Horizon Plan</div>
          <div style={{fontSize:11,color:"var(--ink3)",marginTop:2}}>AI can ask questions first, then draft a plan you accept.</div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button className="btn bl bsm" disabled={planBusy || !config} onClick={()=>draftPlan()}>{planBusy?"Working...":"Draft with AI"}</button>
          <button className="btn bg bsm" disabled={planBusy || !config} onClick={()=>draftPlan({finalize:true})}>Finalise</button>
          {activeDraft && <button className="btn bp bsm" onClick={acceptPlan}>Accept</button>}
          {(horizonPlan.draft||horizonPlan.confirmed) && <button className="btn bg bsm" onClick={resetPlanDraft}>Reset</button>}
        </div>
      </div>
      {!config && <div className="alert aw" style={{marginBottom:8}}>Add an AI provider in Settings before drafting a plan.</div>}
      <textarea className="era-input" value={userInfo} onChange={e=>setUserInfo(e.target.value)} rows="2" placeholder="Extra info for AI: weak skills, schedule, exam date constraints..." style={{resize:"vertical",marginBottom:8}}/>
      {currentQuestions.length>0 && <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:8}}>
        {currentQuestions.map(q=><label key={q.id} style={{display:"block"}}>
          <div style={{fontSize:11.5,color:"var(--ink2)",marginBottom:4}}>{q.q} {q.hint&&<span style={{color:"var(--ink3)"}}>({q.hint})</span>}</div>
          <input className="era-input" value={answerDrafts[q.id]||""} onChange={e=>setAnswerDrafts(d=>({...d,[q.id]:e.target.value}))} placeholder="Your answer"/>
        </label>)}
      </div>}
      {planError && <div className="alert ar" style={{marginBottom:8}}>{planError}</div>}
      {(activeDraft || confirmedDraft) && <div style={{border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px",background:"var(--surface)"}}>
        {confirmedDraft && <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,color:"var(--leaf)",marginBottom:5}}>CONFIRMED PLAN</div>}
        <div style={{fontSize:12.5,color:"var(--ink)",lineHeight:1.5}}>{(confirmedDraft||activeDraft).plan?.daily}</div>
        {!!(confirmedDraft||activeDraft).plan?.weekly?.length && <ul style={{margin:"7px 0 0 18px",padding:0,fontSize:11.5,color:"var(--ink2)",lineHeight:1.45}}>
          {(confirmedDraft||activeDraft).plan.weekly.slice(0,4).map((item,i)=><li key={i}>{item}</li>)}
        </ul>}
        {(confirmedDraft||activeDraft).plan?.examCountdown && <div style={{fontSize:11.5,color:"var(--ink2)",marginTop:7}}>{(confirmedDraft||activeDraft).plan.examCountdown}</div>}
        {(confirmedDraft||activeDraft).plan?.rationale && <div style={{fontSize:11.5,color:"var(--ink3)",marginTop:7}}>{(confirmedDraft||activeDraft).plan.rationale}</div>}
      </div>}
    </div>

    {dailyPlan.date !== today && <div className="alert aw" style={{marginBottom:10}}>
      This plan is from {dailyPlan.date}. <button className="btn bsm bg" onClick={startToday} style={{marginLeft:8}}>Start today</button>
    </div>}

    <div className="sl" style={{marginBottom:7}}>Add a study item for today</div>
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
      <label style={{display:"flex",flexDirection:"column",gap:4}}>
        <span style={{fontSize:11,color:"var(--ink3)"}}>Study item</span>
        <input className="era-input" value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter") addItem();}} placeholder="e.g. Practise TFNG reading, 8 questions" maxLength={120}/>
      </label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <label style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:11,color:"var(--ink3)"}}>Skill</span>
          <select className="era-input" value={draft.skill} onChange={e=>setDraft(d=>({...d,skill:e.target.value}))}>
            {Object.entries(skillLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:11,color:"var(--ink3)"}}>Minutes</span>
          <input className="era-input" type="number" min="1" max="240" value={draft.estMins} onChange={e=>setDraft(d=>({...d,estMins:e.target.value}))}/>
        </label>
        <label style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:11,color:"var(--ink3)"}}>Reminder time</span>
          <input className="era-input" type="time" value={draft.time} onChange={e=>setDraft(d=>({...d,time:e.target.value}))}/>
        </label>
        <label style={{display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:11,color:"var(--ink3)"}}>Difficulty</span>
          <select className="era-input" value={draft.difficulty} onChange={e=>setDraft(d=>({...d,difficulty:e.target.value}))}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
        </label>
      </div>
    </div>

    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:items.length?10:0}}>
      <button className="btn bp bsm" onClick={addItem}>Add item</button>
      {items.length>1 && <button className="btn bg bsm" onClick={sortEasyHard}>Sort easy-hard</button>}
      {items.length>1 && <button className="btn bl bsm" disabled={sorting} onClick={aiSort}>{sorting?"Sorting...":"AI sort"}</button>}
      {permission==="default" && <button className="btn bl bsm" onClick={requestNotify}>Allow browser reminders</button>}
      {permission==="granted" && <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--leaf)",alignSelf:"center"}}>Browser reminders on while app is open</span>}
    </div>

    {items.length>0 && <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {items.map(item=>{
        const accent = item.done ? "var(--leaf)" : item.difficulty==="hard" ? "var(--rose)" : item.difficulty==="easy" ? "var(--sky)" : "var(--honey)";
        return <div key={item.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 9px",border:"1px solid var(--border)",borderRadius:8,background:"var(--surface2)"}}>
          <input type="checkbox" checked={!!item.done} onChange={e=>patchItem(item.id,{done:e.target.checked})}/>
          <div style={{flex:"1 1 190px",minWidth:0}}>
            <div style={{fontSize:12.5,color:item.done?"var(--ink3)":"var(--ink)",textDecoration:item.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,color:"var(--ink3)",marginTop:2}}>
              {skillLabels[item.skill]||item.skill} / {item.estMins||0} min {item.time&&`/ ${item.time}`}
            </div>
            {item.reason && <div style={{fontSize:10.5,color:"var(--ink3)",marginTop:3}}>{item.reason}</div>}
          </div>
          <select className="era-input" value={item.time||""} onChange={e=>patchItem(item.id,{time:e.target.value,notifiedAt:""})} title="Reminder time" style={{width:96,flex:"0 0 auto"}}>
            <option value="">No time</option>
            {["06:00","07:00","08:00","09:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:accent,textTransform:"uppercase",minWidth:54}}>{item.difficulty||"medium"}</span>
          <button className="btn bsm" onClick={()=>goTo(skillPages[item.skill]||"dashboard")}>Open</button>
          <button className="btn bsm bg" onClick={()=>removeItem(item.id)}>Del</button>
        </div>;
      })}
    </div>}
  </div>;
}

function DashboardPage({state,setState,goTo,hasConfig=false,config=null}) {
  const today = TODAY();
  const schedule = useMemo(()=>getSchedule(state.startDate, state.wordsPerDay, state.activeSublists),[state.startDate, state.wordsPerDay, state.activeSublists]);
  const todayEntry = schedule.find(d=>d.date===today);
  const todayDone = !!state.completedDays[today];
  // V5: streak — DST-safe (addDays), and counts past streak even if today not yet done.
  // Behaviour: if today is done → today counted; else start counting from YESTERDAY backward.
  const streak = useMemo(()=>{
    let s = 0;
    let d = new Date();
    if (!state.completedDays[localDateStr(d)]) d = addDays(d, -1);
    while (state.completedDays[localDateStr(d)]) { s++; d = addDays(d, -1); }
    return s;
  },[state.completedDays]);
  const awlProgress = useMemo(()=>getAWLProgressData(state),[state.mastery,state.dailyStats,state.wordCache,state.customVocab]);
  const mastered = awlProgress.mastered;
  // V5 FIX: Avg Band — denominator must be the slice length, not full history length.
  // Old: slice(-5).reduce/Math.min(5, length) → wrong when length > 5
  const recentBands = state.bandHistory.slice(-5);
  const avgBand = recentBands.length ? (recentBands.reduce((a,h)=>a+h.overall,0)/recentBands.length).toFixed(1) : "—";
  const priorityCount = state.priorityWords.length;
  // V5: real progress today (target + extra) from dailyStats
  const todayStats = state.dailyStats?.[today] || {target:0, extra:0, words:[]};
  const todayWordsLearned = todayStats.words?.length || 0;
  const dueCount = getDueRevisits(state.essays||[]).length;
  const nextStep = useMemo(()=>getDashboardNextStep(state,{hasConfig,todayDone,todayEntry,priorityCount,dueCount}),[state,hasConfig,todayDone,todayEntry,priorityCount,dueCount]);
  const mistakeJournal = useMemo(()=>typeof buildMistakeJournal === "function" ? buildMistakeJournal(state) : null,[state]);

  return <div className="fu">
    <div className="kicker">IELTS Writing Lab · Dashboard</div>
    <h1 className="title-x">Your <em>Progress</em></h1>
    <DashboardNextStep step={nextStep} goTo={goTo}/>
    <DashboardMistakeJournal journal={mistakeJournal} goTo={goTo}/>
    <DashboardLearnerPathRescue state={state} setState={setState} goTo={goTo} awlProgress={awlProgress}/>
    <DashboardStudyPlan state={state} setState={setState} goTo={goTo} config={config}/>

    <div className="cols-4">
      {[
        {v:`${streak}🔥`,l:"Streak",cl:""},
        {v:mastered,l:"Vocab Mastered",cl:"sc-sky"},
        {v:avgBand,l:"Avg Band",cl:"sc-orchid"},
        {v:state.bandHistory.length,l:"Essays Graded",cl:"sc-honey"}
      ].map(s=>
        <div key={s.l} className={`card stat-card ${s.cl}`} style={{textAlign:"center"}}>
          <div className="sv">{s.v}</div><div className="sl">{s.l}</div>
        </div>
      )}
    </div>

    <div className="cols-2">
      <div className="card">
        <div className="card-h"><div className="cdot"/>{todayDone?"Today · Done ✓":"Today's Task"}</div>
        {todayDone
          ? <div>
              <div style={{textAlign:"center",padding:"4px 0 10px",color:"var(--leaf)"}}>Daily target done! 🎓</div>
              {/* V5: show real progress + offer to keep learning */}
              <div style={{fontSize:11,color:"var(--ink3)",textAlign:"center",marginBottom:8}}>
                Learned today: <strong style={{color:"var(--ink2)"}}>{todayWordsLearned}</strong> word{todayWordsLearned===1?"":"s"}
                {todayStats.extra>0 && <span style={{color:"var(--honey)",marginLeft:6}}>· +{todayStats.extra} extra 🚀</span>}
              </div>
              <button className="btn bl bsm" style={{width:"100%",justifyContent:"center"}} onClick={()=>goTo("vocab")}>
                Continue learning →
              </button>
            </div>
          : todayEntry
            ? <div>
                <div style={{color:"var(--ink)",fontSize:14,fontWeight:500,marginBottom:4}}>
                  {todayEntry.type==="review7"?"📚 Weekly Review":todayEntry.type==="review3"?"🔄 3-Day Review":`📖 ${todayEntry.wordIndices?.length||state.wordsPerDay||3} New Words`}
                </div>
                <div style={{color:"var(--ink3)",fontSize:11,marginBottom:12}}>
                  {todayEntry.type==="learn"?`Words: ${todayEntry.wordIndices.map(i=>AWL_WORDS[i]?.w).join(", ")}`:`${todayEntry.wordIndices.length} words to review`}
                </div>
                <button className="btn bp bsm" onClick={()=>goTo("vocab")}>Start →</button>
              </div>
            : <div style={{color:"var(--ink3)"}}>You've completed all 570 words! 🎓</div>
        }
        {/* V5: priority shows regardless of todayDone — power users want to push further */}
        {priorityCount > 0 && <div className="alert ag mt8" style={{marginBottom:0}}>
          ✦ {priorityCount} priority vocab words from your essays → <span onClick={()=>goTo("vocab")} style={{cursor:"pointer",textDecoration:"underline"}}>Boost session</span>
        </div>}
      </div>
      <div className="card">
        <div className="card-h"><div className="cdot"/>Vocab Progress</div>
        <AWLProgressBars progress={awlProgress}/>
      </div>
    </div>

    {/* V6 NEW: 14-day learning heatmap from dailyStats (real progress, not just done/not-done) */}
    <div className="card mt14">
      <div className="card-h"><div className="cdot"/>Last 14 Days · Real Learning</div>
      <LearningHeatmap dailyStats={state.dailyStats||{}} wordsPerDay={state.wordsPerDay||3}/>
    </div>

    {/* V6 NEW: Revision Queue — graded essays due to be re-written */}
    {(()=>{
      const due = getDueRevisits(state.essays||[]);
      const upcoming = getUpcomingRevisits(state.essays||[]);
      if (due.length === 0 && upcoming.length === 0) return null;
      return <div className="card mt14" style={due.length>0?{borderLeft:"2px solid var(--orchid)"}:{}}>
        <div className="card-h"><div className="cdot" style={{background:"var(--orchid)"}}/>🔁 Revision Queue {due.length>0&&<span style={{fontSize:10,color:"var(--orchid)",marginLeft:6,fontFamily:"'Geist Mono',monospace",letterSpacing:".05em"}}>· {due.length} due</span>}</div>
        {due.length > 0 && <div style={{marginBottom:upcoming.length>0?11:0}}>
          <div style={{fontSize:11,color:"var(--ink3)",marginBottom:7}}>Write each one again from scratch, then compare bands:</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {due.slice(0,3).map(e=>{
              const daysOverdue = Math.floor((Date.now()-e.revisitDue)/DAY_MS);
              return <div key={e.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:"var(--surface2)",borderRadius:7,border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:15,color:bandColor(e.gradeResult.overall),fontWeight:500,flexShrink:0}}>{e.gradeResult.overall.toFixed(1)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11.5,color:"var(--ink2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(e.promptText||"(no prompt)").slice(0,80)}</div>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",marginTop:2}}>{e.date} · {daysOverdue===0?"due today":`${daysOverdue}d overdue`}</div>
                </div>
                <button className="btn bp bsm" onClick={()=>goTo("practice")} style={{flexShrink:0}}>Revisit →</button>
              </div>;
            })}
            {due.length > 3 && <div style={{fontSize:10.5,color:"var(--ink3)",textAlign:"center",fontStyle:"italic",marginTop:3}}>+ {due.length-3} more in Writing → Archive → Revisit due</div>}
          </div>
        </div>}
        {upcoming.length > 0 && <div>
          <div style={{fontSize:10.5,color:"var(--ink3)",fontStyle:"italic"}}>📅 {upcoming.length} more coming up this week</div>
        </div>}
      </div>;
    })()}

    <div className="card mt14">
      <div className="card-h"><div className="cdot"/>Band Score History</div>
      <BandHistoryChart history={state.bandHistory} era={state.designEra}/>
    </div>

    {state.bandHistory.length > 0 && <div className="card mt14">
      <div className="card-h"><div className="cdot"/>Recent Sessions</div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {state.bandHistory.slice(-5).reverse().map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,background:"var(--surface2)"}}>
          <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)"}}>{h.date}</span>
          <span style={{fontFamily:"'Fraunces',serif",fontSize:18,color:bandColor(h.overall),letterSpacing:-.02,marginLeft:"auto"}}>{h.overall.toFixed(1)}</span>
          {["ta","cc","lr","gra"].map(k=><span key={k} style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{k.toUpperCase()}: <span style={{color:bandColor(h[k])}}>{h[k]}</span></span>)}
        </div>)}
      </div>
    </div>}
  </div>;
}

// V5: 14-day learning heatmap. Renders one cell per day showing how many words user
// actually learned (target + extra). Color intensity scales with count.
function LearningHeatmap({dailyStats, wordsPerDay}) {
  const cells = [];
  const target = Math.max(1, wordsPerDay);
  for (let i = 13; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const key = localDateStr(d);
    const stat = dailyStats[key];
    const count = stat?.words?.length || 0;
    const extra = stat?.extra || 0;
    // Intensity: 0 = empty, target-met = mid, target+extra = bright
    let bg, label;
    if (count === 0) { bg = "var(--surface2)"; label = "—"; }
    else if (count < target) { bg = "color-mix(in srgb, var(--honey) 28%, var(--surface2))"; label = `${count}`; }
    else if (extra === 0) { bg = "color-mix(in srgb, var(--leaf) 45%, var(--surface2))"; label = `${count}`; }
    else { bg = "color-mix(in srgb, var(--leaf) 78%, var(--surface2))"; label = `${count}🚀`; }
    cells.push({key, label, bg, count, extra, isToday: i===0, day: d.getDate()});
  }
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(14,1fr)",gap:4,marginBottom:8}}>
      {cells.map(c=>
        <div key={c.key} title={`${c.key}: ${c.count} words${c.extra?` (+${c.extra} extra)`:""}`}
             style={{aspectRatio:"1",borderRadius:5,background:c.bg,border:c.isToday?"1.5px solid var(--leaf)":"1px solid var(--border)",
                     display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontFamily:"'Geist Mono',monospace",
                     color:c.count>0?"var(--ink)":"var(--ink3)",fontWeight:c.count>0?700:400}}>
          {c.label}
        </div>
      )}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>
      <span>14 days ago</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{display:"inline-flex",gap:3,alignItems:"center"}}><span style={{width:9,height:9,background:"color-mix(in srgb, var(--honey) 28%, var(--surface2))",borderRadius:2,display:"inline-block"}}/>partial</span>
        <span style={{display:"inline-flex",gap:3,alignItems:"center"}}><span style={{width:9,height:9,background:"color-mix(in srgb, var(--leaf) 45%, var(--surface2))",borderRadius:2,display:"inline-block"}}/>on target</span>
        <span style={{display:"inline-flex",gap:3,alignItems:"center"}}><span style={{width:9,height:9,background:"color-mix(in srgb, var(--leaf) 78%, var(--surface2))",borderRadius:2,display:"inline-block"}}/>+ extra 🚀</span>
      </div>
      <span>today</span>
    </div>
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: VOCAB (AWL DAILY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
