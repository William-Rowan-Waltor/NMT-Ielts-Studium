const WRITING_TASK1_TYPES = [
  {id:"line",label:"Line"},
  {id:"bar",label:"Bar"},
  {id:"pie",label:"Pie"},
  {id:"table",label:"Table"},
  {id:"mixed",label:"Mixed"},
  {id:"multiple",label:"Multiple"},
  {id:"process",label:"Process"},
  {id:"map",label:"Map"}
];

const WRITING_TASK2_TYPES = [
  {id:"opinion",label:"Opinion"},
  {id:"discussion",label:"Discussion"},
  {id:"problem_solution",label:"Problem-Solution"},
  {id:"two_part",label:"Two-part"},
  {id:"advantages",label:"Adv vs Disadv"},
  {id:"posneg",label:"Pos/Neg Dev"},
  {id:"own",label:"Own prompt"}
];

const WRITING_TASK2_TYPE_ALIASES = {
  problem: "problem_solution",
  twopart: "two_part",
  advdis: "advantages",
  positive_negative: "posneg",
  pos_neg: "posneg"
};

const WRITING_ISSUE_RULES = [
  {id:"overview",label:"Task 1 overview",terms:["overview","overall trend","main feature","key feature"]},
  {id:"data",label:"Data selection",terms:["data","figure","number","comparison","compare","specific detail","key detail"]},
  {id:"thesis",label:"Task 2 position",terms:["thesis","position","opinion","stance","answer the question"]},
  {id:"development",label:"Idea development",terms:["develop","development","example","support","explain","specific","extended"]},
  {id:"cohesion",label:"Coherence and cohesion",terms:["cohesion","coherent","paragraph","linking","transition","logical","organisation","organization"]},
  {id:"vocab",label:"Lexical resource",terms:["vocabulary","lexical","word choice","collocation","repetition","precise"]},
  {id:"grammar",label:"Grammar accuracy",terms:["grammar","sentence","clause","tense","agreement","punctuation","complex structure"]},
  {id:"response",label:"Task response",terms:["off topic","relevance","fully address","both parts","prompt"]}
];

function roundHalf(n) {
  return Math.round((Number(n)||0)*2)/2;
}

function writingTaskType(entry) {
  return entry?.taskType || "task1";
}

function normalizeWritingTask2Type(id) {
  const key = String(id || "own");
  return WRITING_TASK2_TYPE_ALIASES[key] || key;
}

function task2TypeLabel(id) {
  const normalized = normalizeWritingTask2Type(id);
  return (WRITING_TASK2_TYPES.find(t=>t.id===normalized)?.label || id || "Task 2");
}

function task1TypeLabel(id) {
  return (WRITING_TASK1_TYPES.find(t=>t.id===id)?.label || id || "Task 1");
}

function getLatestGradedEssay(essays, taskType) {
  return (essays||[]).filter(e=>writingTaskType(e)===taskType && e.gradeResult?.overall!=null)[0] || null;
}

function predictWritingBand(task1Band, task2Band) {
  if (task1Band==null || task2Band==null) return null;
  const raw = (Number(task1Band) + Number(task2Band)*2) / 3;
  return {raw, rounded:roundHalf(raw)};
}

function getWritingCoverage(essays) {
  const task1Done = new Set();
  const task2Done = new Set();
  (essays||[]).forEach(e=>{
    if (writingTaskType(e)==="task1" && e.chartType) task1Done.add(e.chartType);
    if (writingTaskType(e)==="task2") task2Done.add(normalizeWritingTask2Type(e.task2Type || e.questionData?.type || "own"));
  });
  return {
    task1: WRITING_TASK1_TYPES.map(t=>({...t,done:task1Done.has(t.id)})),
    task2: WRITING_TASK2_TYPES.filter(t=>t.id!=="own").map(t=>({...t,done:task2Done.has(t.id)}))
  };
}

function collectGradeText(entry) {
  const g = entry?.gradeResult;
  if (!g) return [];
  const keys = ["ta","tr","cc","lr","gra"];
  const chunks = [g.topPriority,g.overallComment,g.ideaDevelopment,g.thesisCheck];
  keys.forEach(k=>{
    const d = g[k];
    if (!d) return;
    chunks.push(...(d.weaknesses||[]));
  });
  (g.annotations||[]).forEach(a=>{
    if (a?.tag!=="strong") chunks.push(a.comment);
  });
  return chunks.filter(Boolean).map(x=>String(x));
}

function buildWritingErrorBank(essays) {
  const buckets = WRITING_ISSUE_RULES.map(r=>({...r,count:0,evidence:[]}));
  (essays||[]).filter(e=>e.gradeResult).forEach(entry=>{
    const textItems = collectGradeText(entry);
    textItems.forEach(item=>{
      const low = item.toLowerCase();
      buckets.forEach(b=>{
        if (b.terms.some(t=>low.includes(t))) {
          b.count += 1;
          if (b.evidence.length < 3) b.evidence.push({date:entry.date,task:writingTaskType(entry),text:item});
        }
      });
    });
  });
  return buckets.filter(b=>b.count>0).sort((a,b)=>b.count-a.count).slice(0,6);
}

// Cross-attempt recurring mistakes using the STRUCTURED gradeResult.mistakes[] categories
// (not fragile prose keyword-matching). Returns categories that appear in 2+ essays,
// so the Plateau Victim sees "you keep making this error".
function buildMistakeCategoryStats(essays) {
  const graded = (essays||[]).filter(e=>e.gradeResult && Array.isArray(e.gradeResult.mistakes) && e.gradeResult.mistakes.length);
  const cats = {};
  graded.forEach(entry=>{
    const seenThisEssay = new Set();
    entry.gradeResult.mistakes.forEach(m=>{
      const cat = (typeof _mistakeCategory==="function" ? _mistakeCategory(m.category) : String(m.category||"explanation").toLowerCase());
      if (!cats[cat]) cats[cat] = {cat, hits:0, essays:0, examples:[]};
      cats[cat].hits += 1;
      if (!seenThisEssay.has(cat)) { cats[cat].essays += 1; seenThisEssay.add(cat); }
      if (cats[cat].examples.length < 3 && m.quote) cats[cat].examples.push({date:entry.date, quote:String(m.quote).slice(0,90), fix:String(m.fix||"").slice(0,90)});
    });
  });
  return {
    totalGraded: graded.length,
    recurring: Object.values(cats).filter(c=>c.essays>=2).sort((a,b)=>b.hits-a.hits),
    all: Object.values(cats).sort((a,b)=>b.hits-a.hits)
  };
}

// R7 — Shared Mistake Journal: one cross-skill view of recurring weaknesses built from
// Writing (structured mistakes[] categories), Reading & Listening (archived details[] by type).
// Data contract for the Dashboard surface (Codex wires the card):
//   { hasData:bool,
//     writing:  [{key, label, hits, attempts}],                 // recurring categories (≥2 essays), worst first
//     reading:  [{key, label, correct, total, rate}],           // weakest types (rate asc), only total≥1
//     listening:[{key, label, correct, total, rate}],
//     top: {skill:"writing|reading|listening", label, detail} | null }  // single highest-priority focus
function buildMistakeJournal(state) {
  const s = state || {};
  // Writing recurring categories
  const wStats = buildMistakeCategoryStats(s.essays || []);
  const wLabel = c => (typeof MISTAKE_CATS!=="undefined" && MISTAKE_CATS[c]?.label) || c;
  const writing = wStats.recurring.map(c=>({key:c.cat, label:wLabel(c.cat), hits:c.hits, attempts:c.essays}));
  // Reading / Listening archives → aggregate details[] by question type
  const aggregate = (tests, labelFn) => {
    const by = {};
    (tests||[]).forEach(t=>(t.details||[]).forEach(d=>{
      const k = d.type || "unknown";
      if (!by[k]) by[k] = {correct:0,total:0};
      by[k].total += 1; if (d.correct) by[k].correct += 1;
    }));
    return Object.entries(by)
      .map(([k,v])=>({key:k, label:(typeof labelFn==="function"?labelFn(k):k), correct:v.correct, total:v.total, rate:v.total?v.correct/v.total:0}))
      .sort((a,b)=>a.rate-b.rate);
  };
  const reading = aggregate(s.readingTests, typeof readingTypeLabel!=="undefined"?readingTypeLabel:null);
  const listening = aggregate(s.listeningTests, typeof listeningTypeLabel!=="undefined"?listeningTypeLabel:null);
  // Top priority focus: worst R/L type with enough attempts (total≥4, rate<0.6) → else most-recurring writing category
  let top = null;
  const rlPool = [...reading.map(x=>({...x,skill:"reading"})), ...listening.map(x=>({...x,skill:"listening"}))]
    .filter(x=>x.total>=4 && x.rate<0.6).sort((a,b)=>a.rate-b.rate);
  if (rlPool[0]) {
    const x = rlPool[0];
    top = {skill:x.skill, label:x.label, detail:`${Math.round(x.rate*100)}% correct (${x.correct}/${x.total}) across your ${x.skill} attempts`};
  } else if (writing[0]) {
    top = {skill:"writing", label:writing[0].label, detail:`appeared in ${writing[0].attempts} of your graded essays`};
  }
  const hasData = !!(writing.length || reading.length || listening.length);
  return {hasData, writing, reading, listening, top};
}

function WritingScorePredictorPanel({state}) {
  const essays = state.essays || [];
  const t1 = getLatestGradedEssay(essays,"task1");
  const t2 = getLatestGradedEssay(essays,"task2");
  const predicted = predictWritingBand(t1?.gradeResult?.overall, t2?.gradeResult?.overall);
  const full = (state.writingTests||[])[0];
  return <div className="card">
    <div className="card-h"><div className="cdot"/>Overall Writing Predictor</div>
    <div className="cols-3" style={{marginBottom:10}}>
      <div><div className="sl">Latest Task 1</div><div className="sv" style={{color:t1?bandColor(t1.gradeResult.overall):"var(--ink3)"}}>{t1?t1.gradeResult.overall.toFixed(1):"-"}</div></div>
      <div><div className="sl">Latest Task 2</div><div className="sv" style={{color:t2?bandColor(t2.gradeResult.overall):"var(--ink3)"}}>{t2?t2.gradeResult.overall.toFixed(1):"-"}</div></div>
      <div><div className="sl">Predicted Writing</div><div className="sv" style={{color:predicted?bandColor(predicted.rounded):"var(--ink3)"}}>{predicted?predicted.rounded.toFixed(1):"-"}</div></div>
    </div>
    <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55}}>
      Formula: Task 1 + Task 2 + Task 2, divided by 3. {full?`Last full test: Band ${full.writingBand?.toFixed?.(1)||full.writingBand}.`:"Run Full Test Mode for a cleaner estimate."}
    </div>
  </div>;
}

function WritingCoveragePanel({state}) {
  const coverage = getWritingCoverage(state.essays||[]);
  const done1 = coverage.task1.filter(t=>t.done).length;
  const done2 = coverage.task2.filter(t=>t.done).length;
  const Tile = ({item}) => <span className="sublist-btn" style={{cursor:"default",borderColor:item.done?"rgba(163,230,53,.35)":"var(--border2)",color:item.done?"var(--leaf)":"var(--ink3)",background:item.done?"rgba(163,230,53,.09)":"var(--surface2)"}}>{item.done?"done ":"todo "}{item.label}</span>;
  return <div className="card">
    <div className="card-h"><div className="cdot"/>Task Coverage Tracker</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div><div className="sl" style={{marginBottom:8}}>Task 1 {done1}/{coverage.task1.length}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{coverage.task1.map(t=><Tile key={t.id} item={t}/>)}</div></div>
      <div><div className="sl" style={{marginBottom:8}}>Task 2 {done2}/{coverage.task2.length}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{coverage.task2.map(t=><Tile key={t.id} item={t}/>)}</div></div>
    </div>
  </div>;
}

function ErrorBankPanel({state}) {
  const issues = buildWritingErrorBank(state.essays||[]);
  const catStats = buildMistakeCategoryStats(state.essays||[]);
  const catLabel = c => (typeof MISTAKE_CATS!=="undefined" && MISTAKE_CATS[c]?.label) || c;
  const catColor = c => (typeof MISTAKE_CATS!=="undefined" && MISTAKE_CATS[c]?.color) || "var(--orchid)";
  return <div className="card">
    <div className="card-h"><div className="cdot"/>Error Bank</div>
    {catStats.recurring.length>0&&<div style={{marginBottom:12}}>
      <div className="sl" style={{marginBottom:6}}>Recurring mistake categories (across {catStats.totalGraded} graded essays)</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {catStats.recurring.map(c=><div key={c.cat} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`2px solid ${catColor(c.cat)}`,borderRadius:8,padding:"10px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
            <strong style={{color:"var(--ink)"}}>{catLabel(c.cat)}</strong>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:catColor(c.cat)}}>{c.hits}× across {c.essays} essays</span>
            {c.essays>=3&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--rose)",textTransform:"uppercase",letterSpacing:".06em"}}>persistent</span>}
          </div>
          {c.examples[0]&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>e.g. "{c.examples[0].quote}"{c.examples[0].fix?` → ${c.examples[0].fix}`:""}</div>}
        </div>)}
      </div>
    </div>}
    {issues.length===0 && catStats.recurring.length===0
      ? <div className="empty" style={{padding:18}}><div>No repeated writing pattern yet.</div><div style={{fontSize:11,color:"var(--ink3)",marginTop:5}}>Grade a few essays to let the app detect recurring weaknesses.</div></div>
      : issues.length>0&&<div>
        {catStats.recurring.length>0&&<div className="sl" style={{marginBottom:6}}>Other patterns in feedback</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{issues.map(issue=><div key={issue.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><strong style={{color:"var(--ink)"}}>{issue.label}</strong><span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--orchid)"}}>{issue.count} hits</span></div>
          {issue.evidence[0]&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>{issue.evidence[0].date} - {issue.evidence[0].text}</div>}
        </div>)}</div>
      </div>}
  </div>;
}

function BandDescriptorPanel() {
  const rows = [
    {task:"Task 1",first:"Task Achievement",focus:"clear overview, key features, accurate comparisons"},
    {task:"Task 2",first:"Task Response",focus:"clear position, complete answer, developed ideas"},
    {task:"Both",first:"Coherence & Cohesion",focus:"logical paragraphing and controlled linking"},
    {task:"Both",first:"Lexical Resource",focus:"topic vocabulary, collocation, low repetition"},
    {task:"Both",first:"GRA",focus:"sentence range and grammatical accuracy"}
  ];
  return <div className="card">
    <div className="card-h"><div className="cdot"/>Band Descriptor View</div>
    <div style={{display:"flex",flexDirection:"column",gap:7}}>{rows.map(r=><div key={r.task+r.first} style={{display:"grid",gridTemplateColumns:"90px 170px 1fr",gap:10,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 11px",fontSize:12,lineHeight:1.5}}>
      <strong style={{color:"var(--leaf)"}}>{r.task}</strong><span style={{color:"var(--ink)"}}>{r.first}</span><span style={{color:"var(--ink3)"}}>{r.focus}</span>
    </div>)}</div>
  </div>;
}

function RewriteTrainerPanel({state,setState,config}) {
  const graded = (state.essays||[]).filter(e=>e.gradeResult).slice(0,30);
  const [selectedId,setSelectedId] = useState(graded[0]?.id || "");
  const [focus,setFocus] = useState("topPriority");
  const [rewrite,setRewrite] = useState("");
  const [checking,setChecking] = useState(false);
  const [result,setResult] = useState(null);
  const selected = graded.find(e=>e.id===selectedId) || graded[0];
  useEffect(()=>{ if (!selectedId && graded[0]) setSelectedId(graded[0].id); },[graded.length]);

  const checkRewrite = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    if (!selected) { alert("Grade an essay first."); return; }
    if (rewrite.trim().split(/\s+/).length < 25) { alert("Paste a rewritten paragraph or section first."); return; }
    setChecking(true); setResult(null);
    const sys = `You are an IELTS writing coach. Compare the student's rewrite with their original essay and prior feedback. Return ONLY valid JSON: {"verdict":"better|same|worse","bandImpact":"+0.5 / 0 / -0.5 estimate","whatImproved":["specific improvement"],"stillWeak":["specific weakness"],"nextRewrite":"one concrete rewrite instruction"}`;
    try {
      const raw = await callAPI(config,[{role:"system",content:sys},{role:"user",content:`Task: ${writingTaskType(selected)}\nFocus: ${focus}\nQuestion:\n${selected.promptText||""}\nPrior top priority:\n${selected.gradeResult?.topPriority||""}\nOriginal essay:\n${selected.essay}\n\nStudent rewrite:\n${rewrite}`}],1200,0.1);
      setResult(safeJSON(raw));
    } catch(e) { alert("Rewrite check error: "+e.message); }
    finally { setChecking(false); }
  };

  return <div className="card">
    <div className="card-h"><div className="cdot"/>Rewrite Trainer</div>
    {graded.length===0 ? <div className="empty" style={{padding:18}}>Grade an essay first, then rewrite its weakest section here.</div> : <>
      <div className="cols-2">
        <div className="field"><div className="field-label">Essay</div><select value={selected?.id||""} onChange={e=>setSelectedId(e.target.value)}>{graded.map(e=><option key={e.id} value={e.id}>{e.date} - {writingTaskType(e).toUpperCase()} - Band {e.gradeResult.overall}</option>)}</select></div>
        <div className="field"><div className="field-label">Rewrite focus</div><select value={focus} onChange={e=>setFocus(e.target.value)}><option value="topPriority">Top priority</option><option value="overview">Task 1 overview</option><option value="thesis">Task 2 thesis</option><option value="body">Body paragraph</option><option value="cohesion">Cohesion only</option><option value="vocab">Vocabulary only</option><option value="grammar">Grammar only</option></select></div>
      </div>
      {selected&&<div className="alert ai" style={{marginBottom:12}}>Priority from last grade: {selected.gradeResult?.topPriority || "No priority saved."}</div>}
      <textarea value={rewrite} onChange={e=>setRewrite(e.target.value)} placeholder="Paste your rewritten paragraph or improved section here..." style={{minHeight:150}}/>
      <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
        <button className="btn bp" onClick={checkRewrite} disabled={checking||!config}>{checking?<><Spinner/> Checking...</>:"Check rewrite"}</button>
        {!config&&<span style={{fontSize:11,color:"var(--ink3)"}}>AI config required.</span>}
      </div>
      {result&&<div className="card" style={{background:"var(--surface2)",marginTop:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}><strong style={{color:result.verdict==="better"?"var(--leaf)":result.verdict==="worse"?"var(--rose)":"var(--honey)"}}>{result.verdict}</strong><span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>Estimated impact: {result.bandImpact}</span></div>
        {result.whatImproved?.length>0&&<div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.6,marginBottom:6}}><strong>Improved:</strong> {result.whatImproved.join("; ")}</div>}
        {result.stillWeak?.length>0&&<div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.6,marginBottom:6}}><strong>Still weak:</strong> {result.stillWeak.join("; ")}</div>}
        {result.nextRewrite&&<div style={{fontSize:12,color:"var(--orchid)",lineHeight:1.6}}><strong>Next:</strong> {result.nextRewrite}</div>}
      </div>}
    </>}
  </div>;
}

function WritingReviewDashboard({state,setState,config}) {
  return <div className="fu">
    <div className="cols-2"><WritingScorePredictorPanel state={state}/><ErrorBankPanel state={state}/></div>
    <WritingCoveragePanel state={state}/>
    <div className="cols-2 mt14"><BandDescriptorPanel/><RewriteTrainerPanel state={state} setState={setState} config={config}/></div>
  </div>;
}
