const FullTestGradeSummary = React.memo(function FullTestGradeSummary({g,kind}) {
  if (!g) return null;
  const firstKey = kind==="task2" ? "tr" : "ta";
  const firstName = kind==="task2" ? "TR" : "TA";
  return <div className="card">
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}><div className="overall-big" style={{fontSize:42,color:bandColor(g.overall)}}>{g.overall?.toFixed?.(1)||g.overall}</div><div><div className="sl">{kind==="task2"?"Task 2":"Task 1"}</div><div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.5}}>{g.overallComment}</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{[{k:firstKey,n:firstName},{k:"cc",n:"CC"},{k:"lr",n:"LR"},{k:"gra",n:"GRA"}].map(x=><div key={x.k} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:7,padding:"7px 8px",textAlign:"center"}}><div className="sl">{x.n}</div><div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:bandColor(g[x.k]?.band)}}>{g[x.k]?.band?.toFixed?.(1)||g[x.k]?.band}</div></div>)}</div>
    {g.topPriority&&<div style={{fontSize:12,color:"var(--orchid)",lineHeight:1.5,marginTop:9}}>Priority: {g.topPriority}</div>}
  </div>;
});

const FullTestTaskEditor = React.memo(function FullTestTaskEditor({kind,data,plan,setPlan,essay,setEssay,words,strictMode=false}) {
  const isT1 = kind==="task1";
  const target = isT1 ? 150 : 250;
  return <div className="fu">
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>{isT1?"Task 1":"Task 2"} Prompt</div>
      {isT1&&data&&(data.chartData||data.chartDataMultiple||data.processSteps||data.mapElements)&&<div className="chart-box"><div style={{marginBottom:10}}><div style={{fontFamily:"'Fraunces',serif",fontSize:15,color:"var(--ink)"}}>{data.title}</div><div style={{fontSize:10,color:"var(--ink3)"}}>{data.source}</div></div><PracticeVisualRender genData={data}/></div>}
      <div className="prompt-box">{data?.prompt}</div>
      {!strictMode&&<div className="kf-grid">{(isT1?(data?.keyFeatures||[]):(data?.requirements||[])).map((x,i)=><div key={i} className="kf">{x}</div>)}</div>}
    </div>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>Planning Mode</div>
      <textarea value={plan} onChange={e=>setPlan(e.target.value)} placeholder={isT1?"Plan: overview, key feature 1, key feature 2, comparisons...":"Plan: thesis, body idea 1 + example, body idea 2 + example, conclusion..."} style={{minHeight:110}}/>
      {!strictMode&&data?.planningHints?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{data.planningHints.map((h,i)=><span key={i} className="sublist-btn" style={{cursor:"default"}}>{h}</span>)}</div>}
    </div>
    <div className="card">
      <div className="card-h"><div className="cdot"/>Write {isT1?"Task 1":"Task 2"}</div>
      <textarea value={essay} onChange={e=>setEssay(e.target.value)} placeholder={isT1?"Write Task 1 response here...":"Write Task 2 essay here..."} style={{minHeight:isT1?220:300}}/>
      <div className="word-count-bar" style={{color:words>=target?"var(--leaf)":words>=target*.75?"var(--honey)":"var(--rose)"}}>{words} words{words>0&&words<target?` (target ${target}+)`:""}</div>
    </div>
  </div>;
});

function FullTestMode({state,setState,config}) {
  const savedDraft = state.writingDrafts?.fullTest || {};
  const [phase,setPhase] = useState(()=>savedDraft.phase || "setup");
  const [difficulty,setDifficulty] = useState(()=>savedDraft.difficulty || "7.0");
  const [task1Type,setTask1Type] = useState(()=>savedDraft.task1Type || "line");
  const [task2Type,setTask2Type] = useState(()=>savedDraft.task2Type || "opinion");
  const [strictExamMode,setStrictExamMode] = useState(()=>savedDraft.strictExamMode ?? true);
  const [testData,setTestData] = useState(()=>savedDraft.testData || null);
  const [activeTask,setActiveTask] = useState(()=>savedDraft.activeTask || "task1");
  const [task1Plan,setTask1Plan] = useState(()=>savedDraft.task1Plan || "");
  const [task2Plan,setTask2Plan] = useState(()=>savedDraft.task2Plan || "");
  const [task1Essay,setTask1Essay] = useState(()=>savedDraft.task1Essay || "");
  const [task2Essay,setTask2Essay] = useState(()=>savedDraft.task2Essay || "");
  const [genLoading,setGenLoading] = useState(false);
  const [gradeLoading,setGradeLoading] = useState(false);
  const [gradeResult,setGradeResult] = useState(()=>savedDraft.gradeResult || null);
  const [timerStartedAt,setTimerStartedAt] = useState(()=>savedDraft.timerStartedAt || null);
  const [timerBase,setTimerBase] = useState(()=>savedDraft.timerBase || 0);
  const [elapsed,setElapsed] = useState(()=>savedDraft.elapsed || 0);
  const [timerRunning,setTimerRunning] = useState(()=>!!savedDraft.timerRunning);
  const [taskTimes,setTaskTimes] = useState(()=>savedDraft.taskTimes || {task1:0,task2:0});

  const task1Words = task1Essay.trim() ? task1Essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const task2Words = task2Essay.trim() ? task2Essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const remaining = Math.max(0, 3600 - elapsed);
  const mm = String(Math.floor(remaining/60)).padStart(2,"0");
  const ss = String(remaining%60).padStart(2,"0");

  useEffect(()=>{
    setState(s => ({
      ...s,
      writingDrafts: {
        ...(s.writingDrafts || {}),
        fullTest: {
          phase,
          difficulty,
          task1Type,
          task2Type,
          strictExamMode,
          testData,
          activeTask,
          task1Plan,
          task2Plan,
          task1Essay,
          task2Essay,
          gradeResult,
          timerStartedAt,
          timerBase,
          elapsed,
          timerRunning,
          taskTimes,
          updatedAt: new Date().toISOString()
        }
      }
    }));
  },[phase,difficulty,task1Type,task2Type,strictExamMode,testData,activeTask,task1Plan,task2Plan,task1Essay,task2Essay,gradeResult,timerStartedAt,timerBase,elapsed,timerRunning,taskTimes]);

  useEffect(()=>{
    if (!timerRunning || !timerStartedAt) return;
    const tick = () => setElapsed(timerBase + Math.floor((Date.now()-timerStartedAt)/1000));
    tick();
    const id = setInterval(tick,1000);
    return ()=>clearInterval(id);
  },[timerRunning,timerStartedAt,timerBase]);

  const getRunningElapsed = () => timerRunning && timerStartedAt
    ? timerBase + Math.floor((Date.now()-timerStartedAt)/1000)
    : elapsed;

  const getLiveTaskTimes = () => {
    const delta = timerRunning && timerStartedAt ? Math.floor((Date.now()-timerStartedAt)/1000) : 0;
    return {...taskTimes,[activeTask]:(taskTimes[activeTask]||0)+delta};
  };

  const startTimer = () => {
    setTimerBase(0);
    setElapsed(0);
    setTaskTimes({task1:0,task2:0});
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
  };

  const pauseTimer = () => {
    const nextElapsed = getRunningElapsed();
    setTaskTimes(getLiveTaskTimes());
    setElapsed(nextElapsed);
    setTimerBase(nextElapsed);
    setTimerStartedAt(null);
    setTimerRunning(false);
  };

  const resumeTimer = () => {
    setTimerBase(elapsed);
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
  };

  const toggleTimer = () => timerRunning ? pauseTimer() : resumeTimer();

  const switchActiveTask = (nextTask) => {
    if (nextTask === activeTask) return;
    const nextElapsed = getRunningElapsed();
    setTaskTimes(getLiveTaskTimes());
    setElapsed(nextElapsed);
    setTimerBase(nextElapsed);
    setActiveTask(nextTask);
    if (timerRunning) setTimerStartedAt(Date.now());
  };

  const task1ShapeSpecs = {
    line:     `"chartData":{"labels":["2010","2012","2014","2016","2018","2020"],"datasets":[{"label":"Category A","data":[25,32,28,45,52,60]},{"label":"Category B","data":[40,38,35,30,28,25]}]}`,
    bar:      `"chartData":{"labels":["2010","2015","2020"],"datasets":[{"label":"Group A","data":[35,42,58]},{"label":"Group B","data":[28,33,45]}]}`,
    pie:      `"chartData":{"labels":["Category A","Category B","Category C","Category D"],"datasets":[{"label":"Share %","data":[35,25,22,18]}]}`,
    table:    `"chartData":{"headers":["Country","2010","2015","2020"],"rows":[["UK",45,55,68],["Germany",52,61,71],["France",40,48,55],["Italy",38,44,50]]}`,
    mixed:    `"chartDataMultiple":[{"chartType":"bar","caption":"Total volume","chartData":{"labels":["2010","2015","2020"],"datasets":[{"label":"Total","data":[100,135,180]}]}},{"chartType":"pie","caption":"2020 breakdown","chartData":{"labels":["A","B","C"],"datasets":[{"label":"Share","data":[50,30,20]}]}}]`,
    multiple: `"chartDataMultiple":[{"chartType":"pie","caption":"2010","chartData":{"labels":["A","B","C","D"],"datasets":[{"label":"2010","data":[40,30,20,10]}]}},{"chartType":"pie","caption":"2020","chartData":{"labels":["A","B","C","D"],"datasets":[{"label":"2020","data":[25,35,25,15]}]}}]`,
    process:  `"processSteps":[{"label":"Stage 1","description":"First stage of the process"},{"label":"Stage 2","description":"Second stage with transformation"},{"label":"Stage 3","description":"Quality check or treatment"},{"label":"Stage 4","description":"Final output is prepared"}]`,
    map:      `"mapElements":{"before":[{"label":"Park","desc":"large open green space"},{"label":"Houses","desc":"row of houses"},{"label":"Road","desc":"single-lane road"}],"after":[{"label":"Shopping centre","desc":"replaces the park"},{"label":"Apartments","desc":"replace the houses"},{"label":"Dual carriageway","desc":"road widened"}]}`
  };

  const generateFullTest = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    setGenLoading(true); setGradeResult(null);
    const prompt = `Create a full IELTS Academic Writing practice test with Task 1 and Task 2.
Difficulty: Band ${difficulty}
Task 1 visual type: ${task1Type}. Use this exact data shape: ${task1ShapeSpecs[task1Type] || task1ShapeSpecs.line}
Task 2 type: ${task2TypeLabel(task2Type)}.
Task 1 quality rules: ${writingGenerationQualityRules("task1")}
Task 2 quality rules: ${writingGenerationQualityRules("task2")}

Return ONLY valid JSON:
{
  "task1":{"prompt":"full IELTS Task 1 prompt","title":"specific visual title","source":"Source: realistic institution, year","chartType":"${task1Type}",${task1ShapeSpecs[task1Type] || task1ShapeSpecs.line},"keyFeatures":["feature 1","feature 2","feature 3"],"planningHints":["overview focus","body paragraph 1 focus","body paragraph 2 focus"],"expectedOverview":"Band 7+ overview","mustMention":["required key feature"],"commonTrap":"likely mistake","band7MustDo":["clear overview","accurate comparisons"]},
  "task2":{"type":"${task2Type}","topic":"specific topic","prompt":"full IELTS Task 2 question","requirements":["requirement 1","requirement 2"],"planningHints":["thesis direction","body 1 idea","body 2 idea"],"commonTrap":"likely mistake","expectedPositionOptions":["reasonable position"],"band7MustDo":["answer all parts","clear position","develop examples"]}
}`;
    try {
      const raw = await callAPI(config,[{role:"user",content:prompt}],2200);
      const data = safeJSON(raw);
      if (!data.task1 || !data.task2) throw new Error("Missing task1/task2 in generated test.");
      data.task1.chartType = data.task1.chartType || task1Type;
      data.task2.type = data.task2.type || task2Type;
      if (!Array.isArray(data.task1.keyFeatures)) data.task1.keyFeatures = [];
      if (!Array.isArray(data.task1.planningHints)) data.task1.planningHints = [];
      if (!Array.isArray(data.task2.requirements)) data.task2.requirements = [];
      if (!Array.isArray(data.task2.planningHints)) data.task2.planningHints = [];
      setTestData(data);
      setPhase("test");
      setActiveTask("task1");
      startTimer();
    } catch(e) { alert("Full test generation error: "+e.message); }
    finally { setGenLoading(false); }
  };

  const normalizeTaskGrade = (result, kind) => {
    const g = result || {};
    if (kind==="task2" && !g.tr && g.ta) g.tr = g.ta;
    if (kind==="task1" && !g.ta && g.tr) g.ta = g.tr;
    const first = kind==="task2" ? "tr" : "ta";
    for (const k of [first,"cc","lr","gra"]) {
      if (!g[k]) g[k] = {band:0,strengths:[],weaknesses:[]};
      if (!Array.isArray(g[k].strengths)) g[k].strengths = [];
      if (!Array.isArray(g[k].weaknesses)) g[k].weaknesses = [];
    }
    if (kind==="task2") g.ta = g.tr;
    if (!Array.isArray(g.annotations)) g.annotations = [];
    const essay = kind==="task1" ? task1Essay : task2Essay;
    g.annotations = g.annotations.filter(a=>a && a.sentence && essay.includes(a.sentence));
    if (!g.overall) {
      const firstBand = Number(g[first]?.band)||0;
      g.overall = roundHalf((firstBand + (Number(g.cc?.band)||0) + (Number(g.lr?.band)||0) + (Number(g.gra?.band)||0))/4);
    }
    return g;
  };

  const gradeFullTest = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    if (!testData) { alert("Generate a full test first."); return; }
    if (task1Words < 80 || task2Words < 120) { alert("Write more before grading. Suggested minimum for grading: Task 1 80+ words, Task 2 120+ words."); return; }
    const elapsedForGrade = getRunningElapsed();
    const liveTaskTimes = getLiveTaskTimes();
    setElapsed(elapsedForGrade);
    setTimerBase(elapsedForGrade);
    setTaskTimes(liveTaskTimes);
    setTimerStartedAt(null);
    setGradeLoading(true); setTimerRunning(false);
    const sys = `You are an expert IELTS examiner. Grade a full IELTS Academic Writing test using public IELTS Writing band-descriptor concepts.
Task 1 criteria: TA, CC, LR, GRA. Task 2 criteria: TR, CC, LR, GRA.
Use conservative half-band scoring. Overall writing band = (Task 1 + Task 2 + Task 2) / 3 rounded to nearest 0.5.
For each task, include examinerA, examinerB, taskAudit, whyNotHigher, annotations, topPriority, topStrength, and band7GapDrill.
Return ONLY valid JSON:
{"task1":{"examinerA":{"overall":6.5,"ta":6.5,"cc":6.5,"lr":6.5,"gra":6.5,"summary":""},"examinerB":{"overall":7,"ta":7,"cc":7,"lr":7,"gra":7,"summary":""},"ta":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"cc":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"lr":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"gra":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"overall":7,"overallComment":"","taskAudit":[{"label":"Overview","status":"pass|warning|fail","note":""}],"topPriority":"","topStrength":"","band7GapDrill":{"title":"","targetCriterion":"","instruction":"","successCheck":""},"annotations":[{"sentence":"exact sentence","tag":"strong|improve|error","comment":"reason"}]},"task2":{"examinerA":{"overall":6.5,"tr":6.5,"cc":6.5,"lr":6.5,"gra":6.5,"summary":""},"examinerB":{"overall":7,"tr":7,"cc":7,"lr":7,"gra":7,"summary":""},"tr":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"cc":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"lr":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"gra":{"band":7,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"overall":7,"overallComment":"","thesisCheck":"clear|unclear|missing","ideaDevelopment":"","taskAudit":[{"label":"Position","status":"pass|warning|fail","note":""}],"topPriority":"","topStrength":"","band7GapDrill":{"title":"","targetCriterion":"","instruction":"","successCheck":""},"annotations":[{"sentence":"exact sentence","tag":"strong|improve|error","comment":"reason"}]},"overallWriting":7,"timeManagement":"comment on Task 1 vs Task 2 timing and word balance","combinedAdvice":["highest-impact next action","second action"]}`;
    const tmFallback = `Task 1: ~${Math.round((liveTaskTimes.task1||0)/60)} min for ${task1Words} words; Task 2: ~${Math.round((liveTaskTimes.task2||0)/60)} min for ${task2Words} words. Target split ≈ 20 min / 40 min.`;
    try {
      // Full replacement: grade each task with the local fine-tuned IELTS model when reachable; else one combined cloud call.
      let t1=null, t2=null, parsed=null;
      if (await localGraderHealthy(state)) {
        try {
          const t1Checklist = JSON.stringify({expectedOverview:testData.task1.expectedOverview,mustMention:testData.task1.mustMention,commonTrap:testData.task1.commonTrap,band7MustDo:testData.task1.band7MustDo});
          const t2Checklist = JSON.stringify({requirements:testData.task2.requirements,commonTrap:testData.task2.commonTrap,expectedPositionOptions:testData.task2.expectedPositionOptions,band7MustDo:testData.task2.band7MustDo});
          t1 = await gradeWritingLocal(state,"task1",`TASK 1 QUESTION:\n${testData.task1.prompt}\nTASK 1 HIDDEN CHECKLIST (grade against this):\n${t1Checklist}\nTASK 1 PLAN:\n${task1Plan}\nTASK 1 ESSAY (${task1Words} words):\n${task1Essay}`,task1Essay);
          t2 = await gradeWritingLocal(state,"task2",`TASK 2 QUESTION:\n${testData.task2.prompt}\nTASK 2 HIDDEN CHECKLIST (grade against this):\n${t2Checklist}\nTASK 2 PLAN:\n${task2Plan}\nTASK 2 ESSAY (${task2Words} words):\n${task2Essay}`,task2Essay);
        } catch(localErr) { console.warn("[ielts-fighter] full-test local grade failed, falling back to cloud:", localErr.message); t1=null; t2=null; }
      }
      if (!t1 || !t2) {
        const raw = await callAPI(config,[{role:"system",content:sys},{role:"user",content:`TASK 1 QUESTION:\n${testData.task1.prompt}\nTASK 1 HIDDEN CHECKLIST:\n${JSON.stringify({expectedOverview:testData.task1.expectedOverview,mustMention:testData.task1.mustMention,commonTrap:testData.task1.commonTrap,band7MustDo:testData.task1.band7MustDo})}\nTASK 1 PLAN:\n${task1Plan}\nTASK 1 ESSAY (${task1Words} words):\n${task1Essay}\n\nTASK 2 QUESTION:\n${testData.task2.prompt}\nTASK 2 HIDDEN CHECKLIST:\n${JSON.stringify({requirements:testData.task2.requirements,commonTrap:testData.task2.commonTrap,expectedPositionOptions:testData.task2.expectedPositionOptions,band7MustDo:testData.task2.band7MustDo})}\nTASK 2 PLAN:\n${task2Plan}\nTASK 2 ESSAY (${task2Words} words):\n${task2Essay}\n\nElapsed seconds: ${elapsedForGrade}\nTask 1 seconds: ${liveTaskTimes.task1||0}\nTask 2 seconds: ${liveTaskTimes.task2||0}\nStrict exam mode: ${strictExamMode}`}],5200);
        parsed = safeJSON(raw);
        t1 = normalizeWritingExaminerResult(parsed.task1 || parsed.t1, "task1", task1Essay);
        t2 = normalizeWritingExaminerResult(parsed.task2 || parsed.t2, "task2", task2Essay);
      }
      // Corrected essay + mistake corrections for each task (same as Task 1/2 grading).
      t1 = await ensureWritingFixResult(config, "task1", testData.task1.prompt, task1Essay, t1);
      t2 = await ensureWritingFixResult(config, "task2", testData.task2.prompt, task2Essay, t2);
      const predicted = predictWritingBand(t1.overall,t2.overall);
      const writingBand = parsed?.overallWriting ? roundHalf(parsed.overallWriting) : predicted.rounded;
      const timeManagement = parsed?.timeManagement || tmFallback;
      const combinedAdvice = (parsed?.combinedAdvice && parsed.combinedAdvice.length) ? parsed.combinedAdvice : [t2.topPriority, t1.topPriority].filter(Boolean);
      const fullTestId = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
      const now = new Date().toISOString();
      const task1Entry = {id:fullTestId+"-t1",taskType:"task1",fullTestId,testMode:true,savedAt:now,date:TODAY(),promptText:testData.task1.prompt,chartType:testData.task1.chartType,genData:testData.task1,plan:task1Plan,essay:task1Essay,wordCount:task1Words,gradeResult:t1,isDraft:false};
      const task2Entry = {id:fullTestId+"-t2",taskType:"task2",fullTestId,testMode:true,savedAt:now,date:TODAY(),promptText:testData.task2.prompt,task2Type:testData.task2.type,questionData:testData.task2,plan:task2Plan,essay:task2Essay,wordCount:task2Words,gradeResult:t2,isDraft:false};
      const summary = {id:fullTestId,date:TODAY(),savedAt:now,task1Band:t1.overall,task2Band:t2.overall,writingBand,task1Words,task2Words,elapsedSeconds:elapsedForGrade,task1Seconds:liveTaskTimes.task1||0,task2Seconds:liveTaskTimes.task2||0,strictExamMode,timeManagement,combinedAdvice};
      setState(s=>({...s, essays:[task1Entry,task2Entry,...(s.essays||[])], bandHistory:[...(s.bandHistory||[]),{date:TODAY(),taskType:"task1",overall:t1.overall,ta:t1.ta.band,cc:t1.cc.band,lr:t1.lr.band,gra:t1.gra.band},{date:TODAY(),taskType:"task2",overall:t2.overall,tr:t2.tr.band,ta:t2.tr.band,cc:t2.cc.band,lr:t2.lr.band,gra:t2.gra.band}], writingTests:[summary,...(s.writingTests||[])]}));
      setGradeResult({task1:t1,task2:t2,writingBand,timeManagement:summary.timeManagement,combinedAdvice:summary.combinedAdvice,task1Seconds:summary.task1Seconds,task2Seconds:summary.task2Seconds});
      setPhase("review");
    } catch(e) { alert("Full test grading error: "+e.message); }
    finally { setGradeLoading(false); }
  };

  const resetTest = () => {
    if (!window.confirm("Start a new full test and clear current unsaved writing?")) return;
    setPhase("setup"); setTestData(null); setTask1Essay(""); setTask2Essay(""); setTask1Plan(""); setTask2Plan(""); setGradeResult(null); setElapsed(0); setTimerBase(0); setTimerStartedAt(null); setTimerRunning(false); setTaskTimes({task1:0,task2:0});
  };

  return <div className="fu">
    <div className="card mb14">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div><div className="card-h" style={{marginBottom:4}}><div className="cdot"/>Full Test Mode</div><div style={{fontSize:12,color:"var(--ink3)",lineHeight:1.5}}>Simulate 60 minutes: Task 1 + Task 2, planning, timing, combined scoring.</div></div>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:26,color:remaining<300?"var(--rose)":"var(--leaf)"}}>{mm}:{ss}</div>
      </div>
    </div>

    {phase==="setup"&&<div className="card">
      <div className="row-f">
        <div className="field"><div className="field-label">Task 1 type</div><select value={task1Type} onChange={e=>setTask1Type(e.target.value)}>{WRITING_TASK1_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
        <div className="field"><div className="field-label">Task 2 type</div><select value={task2Type} onChange={e=>setTask2Type(e.target.value)}>{WRITING_TASK2_TYPES.filter(t=>t.id!=="own").map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
        <div className="field"><div className="field-label">Difficulty</div><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{["6.0","6.5","7.0","7.5","8.0"].map(x=><option key={x} value={x}>Band {x}</option>)}</select></div>
        <button className="btn bp" onClick={generateFullTest} disabled={genLoading||!config}>{genLoading?<><Spinner/> Generating...</>:"Generate full test"}</button>
      </div>
      <label style={{display:"flex",gap:8,alignItems:"center",marginTop:12,fontSize:12,color:"var(--ink2)"}}>
        <input type="checkbox" checked={strictExamMode} onChange={e=>setStrictExamMode(e.target.checked)}/>
        Strict exam mode: hide key features and planning hints during the test.
      </label>
      {!config&&<div className="alert aw mt8">No AI configured. Add an API key in Settings.</div>}
    </div>}

    {(phase==="test"||phase==="review")&&testData&&<>
      <div className="mode-toggle">
        <button className={`mode-btn ${activeTask==="task1"?"active":""}`} onClick={()=>switchActiveTask("task1")}>Task 1 ({task1Words}w)</button>
        <button className={`mode-btn ${activeTask==="task2"?"active":""}`} onClick={()=>switchActiveTask("task2")}>Task 2 ({task2Words}w)</button>
        <button className="mode-btn" onClick={toggleTimer}>{timerRunning?"Pause timer":"Resume timer"}</button>
      </div>
      {activeTask==="task1"
        ? <FullTestTaskEditor kind="task1" data={testData.task1} plan={task1Plan} setPlan={setTask1Plan} essay={task1Essay} setEssay={setTask1Essay} words={task1Words} strictMode={strictExamMode}/>
        : <FullTestTaskEditor kind="task2" data={testData.task2} plan={task2Plan} setPlan={setTask2Plan} essay={task2Essay} setEssay={setTask2Essay} words={task2Words} strictMode={strictExamMode}/>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
        <button className="btn bs" onClick={()=>switchActiveTask(activeTask==="task1"?"task2":"task1")}>Switch task</button>
        <button className="btn bp" onClick={gradeFullTest} disabled={gradeLoading||!config}>{gradeLoading?<><Spinner/> Grading full test...</>:"Grade full test"}</button>
        <button className="btn bg" onClick={resetTest} style={{marginLeft:"auto"}}>New test</button>
      </div>
    </>}

    {phase==="review"&&gradeResult&&<div className="fu mt14">
      <div className="card mb14" style={{borderLeft:"2px solid var(--leaf)"}}>
        <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}><div className="overall-big" style={{color:bandColor(gradeResult.writingBand)}}>{gradeResult.writingBand.toFixed(1)}</div><div><div className="sl">Predicted Writing Band</div><div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6}}>Task 2 is weighted twice. {gradeResult.timeManagement}</div></div></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          <span className="sublist-btn" style={{cursor:"default"}}>Task 1 time {Math.floor((gradeResult.task1Seconds||0)/60)}m</span>
          <span className="sublist-btn" style={{cursor:"default"}}>Task 2 time {Math.floor((gradeResult.task2Seconds||0)/60)}m</span>
        </div>
        {gradeResult.combinedAdvice?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>{gradeResult.combinedAdvice.map((a,i)=><span key={i} className="sublist-btn" style={{cursor:"default"}}>{a}</span>)}</div>}
      </div>
      <div className="cols-2"><FullTestGradeSummary g={gradeResult.task1} kind="task1"/><FullTestGradeSummary g={gradeResult.task2} kind="task2"/></div>
      <div className="cols-2"><WritingExaminerPanels result={gradeResult.task1} taskType="task1"/><WritingExaminerPanels result={gradeResult.task2} taskType="task2"/></div>
    </div>}
  </div>;
}
