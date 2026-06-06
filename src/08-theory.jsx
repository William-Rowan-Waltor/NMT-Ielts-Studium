// Essay parts the student can practise, per task. Each part offers an AI "Generate
// Example" (cloud provider) + a local-model instant-feedback "Try it". The question
// can be the built-in default or the student's own pasted prompt.
const ESSAY_PARTS = {
  task1: [
    {id:"intro",    label:"Introduction",   desc:"Paraphrase the prompt — what the visual shows, the time frame, and the units. Change the wording, keep the meaning."},
    {id:"overview", label:"Overview",       desc:"State the 1–2 most significant overall trends or features. Do NOT quote specific numbers."},
    {id:"body",     label:"Body paragraph", desc:"Describe the key features in detail with accurate data and clear comparisons."}
  ],
  task2: [
    {id:"intro",      label:"Introduction",   desc:"Paraphrase the question, then state a clear thesis (your position)."},
    {id:"body",       label:"Body paragraph", desc:"One topic sentence (a single main idea) + explanation + a specific supporting example."},
    {id:"conclusion", label:"Conclusion",     desc:"Restate your position and summarise the main reasons. Introduce no new ideas."}
  ]
};
const DEFAULT_THEORY_Q = {
  task1: "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020.",
  task2: "Some people think children should learn a second language at primary school. To what extent do you agree or disagree?"
};

// Part-by-part practice: pick a part (Intro/Overview/Body/Conclusion), optionally
// paste your own question, generate a Band 8+ model example (cloud), then write your
// own attempt and get instant feedback from the local IELTS model. All colours are
// era-aware (var(--*) tokens) so it fits every Design Era.
function TheoryPartPractice({taskType, config, state}) {
  const parts = ESSAY_PARTS[taskType] || ESSAY_PARTS.task2;
  const [partId,setPartId] = useState(parts[0].id);
  const [ownQ,setOwnQ] = useState("");
  const [genVisual,setGenVisual] = useState(null); // full genData for Task 1 visual
  const [qLoading,setQLoading] = useState(false);
  const [qErr,setQErr] = useState("");
  const [example,setExample] = useState("");
  const [exLoading,setExLoading] = useState(false);
  const [exErr,setExErr] = useState("");
  const [attempt,setAttempt] = useState("");
  const [fb,setFb] = useState(null);
  const [fbLoading,setFbLoading] = useState(false);
  const [fbErr,setFbErr] = useState("");

  const part = parts.find(p=>p.id===partId) || parts[0];
  const taskName = taskType==="task2" ? "Task 2 essay" : "Task 1 report";
  const question = ownQ.trim() || DEFAULT_THEORY_Q[taskType];
  const partLower = part.label.toLowerCase();

  const switchPart = (id) => { setPartId(id); setExample(""); setExErr(""); setFb(null); setFbErr(""); setAttempt(""); };

  const generateQuestion = async () => {
    if (!config) { setQErr("Set up an AI provider in Settings first."); return; }
    setQLoading(true); setQErr(""); setGenVisual(null);

    if (taskType === "task2") {
      // Task 2: text-only question
      try {
        const raw = await callAPI(config,[
          {role:"system",content:"You generate realistic IELTS exam questions. Output only the question text, nothing else."},
          {role:"user",content:"Generate a realistic IELTS Academic Writing Task 2 question on any topic. Write it exactly as it would appear on an IELTS exam — include the discussion statement and the instruction (e.g. 'To what extent do you agree or disagree?', or 'Discuss both views and give your opinion.'). Output ONLY the question text."}
        ],200,1.0);
        setOwnQ(String(raw||"").trim()); setExample(""); setFb(null);
      } catch(e) { setQErr("Could not generate: " + e.message); }
      setQLoading(false); return;
    }

    // Task 1: full visual genData (same schema as 10-practice.jsx)
    const types = ["line","bar","pie","table","mixed","multiple","process","map"];
    const chartType = types[Math.floor(Math.random()*types.length)];
    const shapeSpecs = {
      line:     `"chartData":{"labels":["2010","2012","2014","2016","2018","2020"],"datasets":[{"label":"Category A","data":[25,32,28,45,52,60]},{"label":"Category B","data":[40,38,35,30,28,25]}]}`,
      bar:      `"chartData":{"labels":["2010","2015","2020"],"datasets":[{"label":"Group A","data":[35,42,58]},{"label":"Group B","data":[28,33,45]}]}`,
      pie:      `"chartData":{"labels":["Category A","Category B","Category C","Category D"],"datasets":[{"label":"Share %","data":[35,25,22,18]}]}`,
      table:    `"chartData":{"headers":["Country","2010","2015","2020"],"rows":[["UK",45,55,68],["Germany",52,61,71],["France",40,48,55],["Italy",38,44,50]]}`,
      mixed:    `"chartDataMultiple":[{"chartType":"bar","caption":"Total volume","chartData":{"labels":["2010","2015","2020"],"datasets":[{"label":"Total","data":[100,135,180]}]}},{"chartType":"pie","caption":"2020 breakdown","chartData":{"labels":["A","B","C"],"datasets":[{"label":"Share","data":[50,30,20]}]}}]`,
      multiple: `"chartDataMultiple":[{"chartType":"pie","caption":"2010","chartData":{"labels":["A","B","C","D"],"datasets":[{"label":"2010","data":[40,30,20,10]}]}},{"chartType":"pie","caption":"2020","chartData":{"labels":["A","B","C","D"],"datasets":[{"label":"2020","data":[25,35,25,15]}]}}]`,
      process:  `"processSteps":[{"label":"Stage 1","description":"First stage description"},{"label":"Stage 2","description":"Second stage"},{"label":"Stage 3","description":"Third stage"},{"label":"Stage 4","description":"Fourth stage"},{"label":"Stage 5","description":"Final stage"}]`,
      map:      `"mapElements":{"before":[{"label":"Park (centre)","desc":"large open green space"},{"label":"Houses (north)","desc":"row of detached houses"},{"label":"Road (east)","desc":"narrow single-lane road"}],"after":[{"label":"Shopping centre","desc":"replaces former park"},{"label":"Apartments (north)","desc":"houses replaced by blocks"},{"label":"Dual carriageway (east)","desc":"road widened"}]}`
    };
    const typeDesc = {
      line:"a line graph showing change over time across 2+ categories",
      bar:"a bar chart comparing 2-3 categories across time points or groups",
      pie:"a pie chart showing proportional breakdown of 4 categories summing to 100%",
      table:"a data table with 3-5 rows and 3-4 columns",
      mixed:"two charts of DIFFERENT types on related data",
      multiple:"two charts of the SAME type comparing different periods",
      process:"a process diagram with 4-7 sequential stages",
      map:"a before/after map comparison"
    };
    const isPlural = ["map","mixed","multiple"].includes(chartType);
    const noun = chartType==="process"?"diagram":chartType==="map"?"maps":chartType;
    const genPrompt = `Create an IELTS Writing Task 1 practice question. Visual type: ${chartType} (${typeDesc[chartType]}).
QUALITY RULES: ${typeof writingGenerationQualityRules==="function"?writingGenerationQualityRules("task1"):"Use realistic data, avoid generic titles, vary topics."}
Return ONLY valid JSON (no markdown fence):
{
  "prompt":"The ${noun} below ${isPlural?"show":"shows"}...",
  "title":"Specific descriptive chart title",
  "source":"Source: [realistic institution], [year]",
  "chartType":"${chartType}",
  ${shapeSpecs[chartType]},
  "keyFeatures":["Key feature 1","Key feature 2","Key feature 3"]
}
CRITICAL: Use the EXACT JSON shape for chartType="${chartType}" shown above.`;
    try {
      const text = await callAPI(config,[{role:"user",content:genPrompt}],1400,1.0);
      const d = safeJSON(text);
      if (!d || !d.prompt) throw new Error("Invalid response from AI");
      setGenVisual(d); setOwnQ(d.prompt); setExample(""); setFb(null);
    } catch(e) { setQErr("Could not generate: " + e.message); }
    setQLoading(false);
  };
  // Era-aware textarea styling (no hardcoded colours).
  const taField = {width:"100%",background:"var(--bg)",border:"1px solid var(--border)",color:"var(--ink)",padding:10,borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.6,resize:"vertical",boxSizing:"border-box"};

  const generateExample = async () => {
    if (!config) { setExErr("Set up an AI provider in Settings to generate examples."); return; }
    setExLoading(true); setExErr(""); setExample("");
    try {
      const raw = await callAPI(config, [
        {role:"system",content:`You are an IELTS writing tutor. Write a Band 8+ model ${partLower} for an IELTS Academic Writing ${taskName} that answers the question below. Output ONLY the ${partLower} text itself — no headings, no labels, no commentary.`},
        {role:"user",content:`Question:\n${question}\n\nWrite only the ${partLower} (${part.desc})`}
      ], 600, 0.6);
      setExample(String(raw||"").trim());
    } catch(e) { setExErr("Could not generate: " + e.message); }
    setExLoading(false);
  };

  const getFeedback = async () => {
    const wc = attempt.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 4) { setFbErr("Write a few more words first."); setFb(null); return; }
    setFbLoading(true); setFbErr(""); setFb(null);
    try {
      const concept = `The ${partLower} of an IELTS ${taskName}. ${part.desc} The question is: "${question}"`;
      const r = await gradeTheoryAttempt(state, concept, attempt.trim(), config);
      setFb(r);
    } catch(e) { setFbErr("Feedback failed: " + e.message); }
    setFbLoading(false);
  };

  return <div className="card" style={{background:"var(--surface2)",marginBottom:16,borderLeft:"2px solid var(--leaf)"}}>
    <div className="card-h" style={{marginBottom:8}}><div className="cdot" style={{background:"var(--leaf)"}}/>Practice by part — model example + instant feedback</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
      {parts.map(p=><button key={p.id} className={`btn ${partId===p.id?"bp":"bg"} bsm`} onClick={()=>switchPart(p.id)}>{p.label}</button>)}
    </div>
    <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:10}}>{part.desc}</div>

    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
      <span className="field-label" style={{margin:0}}>Question</span>
      <button className="btn bg bsm" onClick={generateQuestion} disabled={qLoading} style={{fontSize:11,padding:"2px 9px"}}>
        {qLoading?<><Spinner/> Generating…</>:"🎲 Generate question"}
      </button>
      {(ownQ||genVisual)&&<button className="btn bg bsm" onClick={()=>{setOwnQ("");setGenVisual(null);setExample("");setFb(null);}} style={{fontSize:11,padding:"2px 8px",color:"var(--ink3)"}}>✕ Clear</button>}
      {qErr&&<span style={{fontSize:11,color:"var(--honey)"}}>{qErr}</span>}
    </div>
    {genVisual&&<div className="chart-box" style={{marginBottom:8}}>
      <div style={{marginBottom:8}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--ink)",lineHeight:1.3}}>{genVisual.title}</div>
        {genVisual.source&&<div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)",marginTop:2}}>{genVisual.source}</div>}
      </div>
      {(genVisual.chartData||genVisual.chartDataMultiple||genVisual.processSteps||genVisual.mapElements)&&<PracticeVisualRender genData={genVisual}/>}
      {genVisual.keyFeatures?.length>0&&<div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
        {genVisual.keyFeatures.map((f,i)=><div key={i} style={{fontSize:11,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"3px 8px",color:"var(--ink2)"}}>{f}</div>)}
      </div>}
    </div>}
    <textarea value={ownQ} onChange={e=>{setOwnQ(e.target.value);if(genVisual)setGenVisual(null);}} placeholder={DEFAULT_THEORY_Q[taskType]}
      style={{...taField,minHeight:genVisual?38:46,marginBottom:8}}/>

    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:example?10:0}}>
      <button className="btn bs bsm" onClick={generateExample} disabled={exLoading}>{exLoading?<><Spinner/> Generating…</>:"✨ Generate Example"}</button>
      {exErr&&<span style={{fontSize:11,color:"var(--honey)",lineHeight:1.4}}>{exErr}</span>}
    </div>
    {example&&<div style={{fontSize:12.5,color:"var(--ink)",lineHeight:1.7,background:"var(--surface)",border:"1px solid var(--border)",borderLeft:"2px solid var(--sky)",borderRadius:8,padding:"11px 13px",marginBottom:12,whiteSpace:"pre-wrap"}}>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,letterSpacing:".08em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:5}}>Model {part.label} · Band 8+</div>
      {example}
    </div>}

    <div className="field-label" style={{marginBottom:4}}>Your attempt — write the {partLower}</div>
    <textarea value={attempt} onChange={e=>setAttempt(e.target.value)} placeholder={`Write your ${partLower} here…`}
      style={{...taField,minHeight:68}}/>
    <div style={{display:"flex",gap:10,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
      <button className="btn bp bsm" onClick={getFeedback} disabled={fbLoading}>{fbLoading?<><Spinner/> Grading…</>:"Get feedback"}</button>
      {fb&&fb.band!=null&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:13,color:bandColor(fb.band)}}>Band {fb.band.toFixed(1)}</span>}
      {fbErr&&<span style={{fontSize:11,color:"var(--honey)",lineHeight:1.4}}>{fbErr}</span>}
    </div>
    {fb&&fb.feedback&&<div style={{marginTop:10,fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",whiteSpace:"pre-wrap"}}>
      {fb.source==="cloud"&&<div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>via cloud API</div>}
      {fb.feedback}
    </div>}
  </div>;
}

function TheoryPage({embedded=false, state, config}) {
  const [tab,setTab] = useState("line");
  const [innerTab,setInnerTab] = useState(0);
  const sections = [
    {id:"line",label:"Line",grp:"Chart Types"},
    {id:"bar",label:"Bar",grp:"Chart Types"},
    {id:"pie",label:"Pie",grp:"Chart Types"},
    {id:"table",label:"Table",grp:"Chart Types"},
    {id:"process",label:"Process",grp:"Other"},
    {id:"map",label:"Map",grp:"Other"},
    {id:"mixed",label:"Multiple",grp:"Other"},
    {id:"structure",label:"Structure",grp:"Essentials"},
    {id:"rubric",label:"Rubric",grp:"Essentials"}
  ];

  const InnerTabs = ({tabs,active,onChange})=><div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid var(--border)",paddingBottom:0}}>
    {tabs.map((t,i)=><button key={i} onClick={()=>onChange(i)} style={{padding:"7px 14px",background:"transparent",border:"none",borderBottom:`2px solid ${active===i?"var(--leaf)":"transparent"}`,color:active===i?"var(--leaf)":"var(--ink3)",fontSize:12.5,fontWeight:active===i?500:400,cursor:"pointer",marginBottom:-1,transition:"all .13s"}}>{t}</button>)}
  </div>;

  return <div className={embedded ? "fu" : "canvas fu"}>
    {!embedded&&<>
      <div className="kicker">Study Guide · Theory</div>
      <h1 className="title-x">Task 1 <em>Guide</em></h1>
    </>}
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:22}}>
      {["Chart Types","Other","Essentials"].map(grp=><div key={grp} style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink3)",marginRight:6,minWidth:80}}>{grp}</span>
        {sections.filter(s=>s.grp===grp).map(s=><button key={s.id} className={`btn ${tab===s.id?"bp":"bg"} bsm`} onClick={()=>{setTab(s.id);setInnerTab(0);}}>{s.label}</button>)}
      </div>)}
    </div>
    <TheoryPartPractice taskType="task1" config={config} state={state}/>

    {tab==="line"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Một line chart kể một <strong>câu chuyện</strong>: cái gì cao, cái gì thấp, ai vượt ai. Nhiệm vụ không phải đọc từng điểm dữ liệu — mà kể câu chuyện đó bằng tiếng Anh học thuật.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Model Answer","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, it is clear that <span className="slot">[main trend]</span>,{"\n"}while <span className="slot">[contrasting point]</span>.</div>
          <div className="why">NO numbers in overview. States biggest trend + 1 contrast. Missing this = Band ≤6.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Trend Sentence</div>
          <div className="pattern"><span className="slot">[Subject]</span> <span className="slot">[verb]</span> <span className="slot">[adverb]</span>{"\n"}from <span className="slot">[X]</span> to <span className="slot">[Y]</span>{"\n"}between <span className="slot">[year1]</span> and <span className="slot">[year2]</span>.</div>
          <div className="why">4-slot formula. Vary verb + adverb — never repeat "increased significantly" 5×.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Peak / Trough</div>
          <div className="pattern"><span className="slot">[Subject]</span> reached a peak of <span className="slot">[value]</span>{"\n"}in <span className="slot">[year]</span>, before <span className="slot">[verb-ing]</span> to <span className="slot">[value]</span>.</div>
          <div className="why">Use when curve has a clear turning point. Examiners want to see you notice it.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Crossover</div>
          <div className="pattern">While <span className="slot">[A]</span> initially led, the two figures{"\n"}crossed around <span className="slot">[year]</span>. By <span className="slot">[year2]</span>,{"\n"}<span className="slot">[B]</span> had surpassed <span className="slot">[A]</span>.</div>
          <div className="why">Crossover = score opportunity. Past perfect "had surpassed" boosts GRA.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Trend Verbs</div>
          <div className="chip-tier">Strong rise</div><div className="chips"><span className="chip cs">surge</span><span className="chip cs">soar</span><span className="chip cs">rocket</span><span className="chip cs">leap</span></div>
          <div className="chip-tier">Gradual rise</div><div className="chips"><span className="chip">climb</span><span className="chip">rise steadily</span><span className="chip">edge up</span><span className="chip">grow gradually</span></div>
          <div className="chip-tier">Strong fall</div><div className="chips"><span className="chip cr">plummet</span><span className="chip cr">plunge</span><span className="chip cr">tumble</span><span className="chip cr">crash</span></div>
          <div className="chip-tier">Gradual fall</div><div className="chips"><span className="chip">dip</span><span className="chip cl">decline</span><span className="chip">drop slightly</span><span className="chip">slip</span></div>
          <div className="chip-tier">Stable</div><div className="chips"><span className="chip ch">level off</span><span className="chip ch">plateau</span><span className="chip ch">stabilise</span><span className="chip cl">fluctuate</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Adverbs + Approximation</div>
          <div className="chip-tier">Strong</div><div className="chips"><span className="chip cr">dramatically</span><span className="chip cr">sharply</span><span className="chip cl">significantly</span><span className="chip">considerably</span></div>
          <div className="chip-tier">Moderate</div><div className="chips"><span className="chip">steadily</span><span className="chip">gradually</span><span className="chip">noticeably</span></div>
          <div className="chip-tier">Weak</div><div className="chips"><span className="chip">slightly</span><span className="chip">marginally</span><span className="chip">moderately</span></div>
          <div className="chip-tier">Approximation</div><div className="chips"><span className="chip co">approximately</span><span className="chip co">roughly</span><span className="chip">around</span><span className="chip">just over</span><span className="chip">nearly</span></div>
          <div className="why" style={{marginTop:10}}>Can't remember exact number? Use approximation. Examiner grades HOW you express, not exactness.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="card">
        <div className="card-h"><div className="cdot"/>Band 7 Model Answer · 184 words</div>
        <div className="model-ans">
          <p>The line graph illustrates the <span className="hl">percentage of households</span> in four countries that owned a computer between 1995 and 2015.</p>
          <p><span className="b7">Overall</span>, it is clear that computer ownership <span className="b7">rose considerably</span> in all four nations over the period, with Country A consistently recording the highest figures throughout.</p>
          <p>In 1995, Country A had the greatest proportion of computer-owning households at 20%, and this figure <span className="hl">surged steadily</span> to reach 80% by 2015. Country B followed a similar upward trend, <span className="hl">climbing from</span> 15% to approximately 68% over the same period. <span className="nb">Notably</span>, Countries B and C <span className="hl">crossed paths</span> around 2005, after which C maintained a slightly higher rate.</p>
          <p>Country D <span className="hl">started at the lowest point</span> of just 5% in 1995; however, it experienced the most <span className="hl">dramatic relative growth</span>, eventually reaching 55% by 2015 — an <span className="hl">elevenfold increase</span> over two decades.</p>
          <div className="annotation"><strong style={{color:"var(--orchid)"}}>Why Band 7:</strong> Overview clear (no numbers) ▸ 4 different trend verbs ▸ Crossover noted with exact year ▸ Uncommon: "elevenfold increase" ▸ Complex: "after which C maintained" (relative clause).</div>
        </div>
      </div>}
      {innerTab===3&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Overview in paragraph 2 (no numbers)","Highlight ≥2 key features","Cite specific data in body","Select carefully, don't describe everything"]},
          {c:"var(--sky)",h:"✓ Coherence & Cohesion",items:["4 clear paragraphs: intro/overview/body1/body2","Varied linking words","Avoid starting 3 sentences with 'The'","Never repeat 'however, however'"]},
          {c:"var(--rose)",h:"✓ Lexical Resource",items:["≥3 different trend verbs","Paraphrase the task question","Less common vocab (elevenfold, hover)","No verb repetition within one paragraph"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Mix simple + complex sentences","Passive when needed (was recorded)","Simple past for completed data","Relative clauses (which, after which)"]},
          {c:"var(--honey)",h:"⚠ Common Mistakes",items:["Missing overview → Band ≤6","Copying the question verbatim","Using 'increase' throughout","Ignoring crossover points"]},
          {c:"var(--ink3)",h:"📏 Word Count",items:["Minimum: 150 words","Optimal: 165–185 words","Avoid: >220 words","20 minutes / 20% of Writing"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="bar"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Bar chart = <strong>comparison</strong>. The x-axis is usually categories, not time. Your job: find the highest, the lowest, and the most interesting gap or reversal.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Comparison Pattern</div>
          <div className="pattern"><span className="slot">[A]</span> had the highest <span className="slot">[measure]</span>{"\n"}at <span className="slot">[X]</span>, followed by <span className="slot">[B]</span> at <span className="slot">[Y]</span>.</div>
          <div className="why">Ranking with specific values. Don't just say "A was more than B".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Contrast Pattern</div>
          <div className="pattern">While <span className="slot">[A]</span> recorded <span className="slot">[high value]</span>,{"\n"}<span className="slot">[B]</span> showed a much lower figure{"\n"}of only <span className="slot">[low value]</span>.</div>
          <div className="why">"While" signals contrast elegantly. More sophisticated than "but".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Grouped Bar Pattern</div>
          <div className="pattern">In <span className="slot">[category 1]</span>, <span className="slot">[A]</span> was{"\n"}considerably higher than <span className="slot">[B]</span>;{"\n"}however, this pattern reversed in <span className="slot">[category 2]</span>.</div>
          <div className="why">Reversals are scoring opportunities. Examiners want you to notice inversions.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview for Bar Chart</div>
          <div className="pattern">Overall, <span className="slot">[A]</span> consistently dominated{"\n"}across most categories, while <span className="slot">[B]</span>{"\n"}recorded the lowest figures throughout.</div>
          <div className="why">Same rule: overview has no specific numbers. States dominant feature + contrast.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Comparison Phrases</div>
          <div className="chips"><span className="chip cs">significantly higher than</span><span className="chip cs">considerably more than</span><span className="chip">approximately double</span><span className="chip">roughly twice as much</span><span className="chip cl">in contrast</span><span className="chip cl">by contrast</span></div>
          <div className="chip-tier">Proportion language</div>
          <div className="chips"><span className="chip co">proportion</span><span className="chip co">percentage</span><span className="chip">share</span><span className="chip">fraction</span><span className="chip">majority</span><span className="chip">minority</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Ranking Language</div>
          <div className="chips"><span className="chip cr">the highest figure</span><span className="chip cr">the lowest rate</span><span className="chip ch">the second highest</span><span className="chip">at the top</span><span className="chip">at the bottom</span></div>
          <div className="chip-tier">Exception signals</div>
          <div className="chips"><span className="chip">the only exception</span><span className="chip">notably</span><span className="chip">in contrast</span><span className="chip">despite this</span></div>
          <div className="why" style={{marginTop:8}}>Exceptions = key features. Always note the outlier in your body paragraph.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-2">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Overview: identify dominant category","Note at least 1 interesting comparison","Include data from ≥2 categories in body","Don't describe every single bar"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Comparatives: higher than, as high as","Superlatives: the highest, the most","Past simple for past data","Present simple if no time given"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="pie"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Pie chart = <strong>proportions of a whole</strong>. Tổng luôn = 100%. Tìm slice <strong>lớn nhất</strong>, <strong>nhỏ nhất</strong>, và 1 cặp đáng so sánh. <strong>Không bao giờ</strong> mô tả từng slice một.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Proportion Pattern</div>
          <div className="pattern"><span className="slot">[Category]</span> made up{"\n"}<span className="slot">[X%]</span> of the total,{"\n"}representing the largest share.</div>
          <div className="why">3 verbs phải xoay vòng: "made up" / "accounted for" / "represented".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Comparison Pattern</div>
          <div className="pattern">In contrast, <span className="slot">[Category B]</span>{"\n"}constituted only <span className="slot">[Y%]</span>,{"\n"}roughly <span className="slot">[half/double]</span> the figure for <span className="slot">[A]</span>.</div>
          <div className="why">Multiplicative comparison ("roughly double") ăn điểm LR cao hơn "more than".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Two-Pie Comparison</div>
          <div className="pattern">While <span className="slot">[A]</span> dominated in <span className="slot">[year1]</span>{"\n"}at <span className="slot">[X%]</span>, by <span className="slot">[year2]</span> its share had{"\n"}<span className="slot">[fallen/risen]</span> to <span className="slot">[Y%]</span>.</div>
          <div className="why">Past perfect "had fallen" → boost GRA. Dùng khi 2 pie ở 2 thời điểm khác nhau.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, <span className="slot">[A]</span> was the predominant{"\n"}<span className="slot">[category]</span>, while <span className="slot">[B]</span> made up{"\n"}the smallest proportion.</div>
          <div className="why">Overview KHÔNG số. Chỉ dominant + smallest. Đó là 2 key features bắt buộc.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Proportion Verbs</div>
          <div className="chip-tier">Showing percentage</div>
          <div className="chips"><span className="chip cl">make up</span><span className="chip cl">account for</span><span className="chip cl">represent</span><span className="chip">constitute</span><span className="chip">comprise</span></div>
          <div className="chip-tier">Size language</div>
          <div className="chips"><span className="chip cs">the largest share</span><span className="chip cs">the dominant proportion</span><span className="chip">the smallest portion</span><span className="chip">a minor fraction</span></div>
          <div className="chip-tier">Categorisation</div>
          <div className="chips"><span className="chip co">majority</span><span className="chip co">minority</span><span className="chip">half</span><span className="chip">a third</span><span className="chip">two-fifths</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Approximation Phrases</div>
          <div className="chip-tier">Near round numbers</div>
          <div className="chips"><span className="chip">just over</span><span className="chip">just under</span><span className="chip">close to</span><span className="chip">approximately</span><span className="chip">roughly</span><span className="chip">around</span></div>
          <div className="chip-tier">Comparative scale</div>
          <div className="chips"><span className="chip ch">twice as much as</span><span className="chip ch">half of</span><span className="chip">three times the figure for</span><span className="chip">a quarter of</span></div>
          <div className="why" style={{marginTop:8}}>Pie thường có số tròn (15%, 30%). Vẫn dùng "approximately 15%" để tự nhiên hơn.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Pie Specifics",items:["Verify total = 100% (or near)","Identify largest + smallest","Group small slices if many","Note any 'Other' category"]},
          {c:"var(--rose)",h:"✓ Lexical Resource",items:["≥3 proportion verbs (make up / account for / represent)","Use 'majority/minority' once","Avoid repeating 'percent' — vary with 'share/proportion'","Approximation chữ thay vì số liên tục"]},
          {c:"var(--honey)",h:"⚠ Common Mistakes",items:["Listing all slices in order","Forgetting overview","Using 'increase' for pie chart (không có time!)","Saying 'percent' 7 lần"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="table"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Table là <strong>data-dense nhất</strong>. Quy tắc số 1: <strong>không mô tả tất cả</strong>. Chọn 3-4 features đáng kể (highest, lowest, biggest change, exception) và dùng để xây overview + body.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Ranking Pattern</div>
          <div className="pattern">Among the <span className="slot">[N categories]</span>,{"\n"}<span className="slot">[A]</span> recorded the highest figure{"\n"}at <span className="slot">[X]</span>, followed by <span className="slot">[B]</span> at <span className="slot">[Y]</span>.</div>
          <div className="why">Bắt đầu với "Among" — examiner thấy bạn đang chọn lọc, không mô tả hết.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Range Pattern</div>
          <div className="pattern">Figures ranged from <span className="slot">[low]</span>{"\n"}in <span className="slot">[category]</span> to as high as{"\n"}<span className="slot">[high]</span> in <span className="slot">[category]</span>.</div>
          <div className="why">"Ranged from X to Y" gói gọn nhiều data points trong 1 câu — sang & hiệu quả.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Change Pattern (over time)</div>
          <div className="pattern">The most striking change occurred in{"\n"}<span className="slot">[category]</span>, where the figure{"\n"}<span className="slot">[verb]</span> from <span className="slot">[X]</span> to <span className="slot">[Y]</span>.</div>
          <div className="why">"The most striking change" = key feature. Dùng khi table có ≥2 thời điểm.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Exception Pattern</div>
          <div className="pattern">The only exception to this trend was{"\n"}<span className="slot">[category]</span>, which <span className="slot">[verb]</span>{"\n"}while others <span className="slot">[verb]</span>.</div>
          <div className="why">Examiner LOVES exceptions. Một table có outlier = cơ hội ăn điểm Task Achievement.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Selection Language</div>
          <div className="chip-tier">Highlighting key data</div>
          <div className="chips"><span className="chip cl">most notably</span><span className="chip cl">most strikingly</span><span className="chip cs">remarkably</span><span className="chip">in particular</span><span className="chip">interestingly</span></div>
          <div className="chip-tier">Range expressions</div>
          <div className="chips"><span className="chip co">ranged from X to Y</span><span className="chip co">varied between</span><span className="chip">spanned</span><span className="chip">extended from</span></div>
          <div className="chip-tier">Picking out</div>
          <div className="chips"><span className="chip">among these</span><span className="chip">of all categories</span><span className="chip">the only exception</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cross-Comparison</div>
          <div className="chip-tier">Pattern matching</div>
          <div className="chips"><span className="chip cs">similarly</span><span className="chip cs">likewise</span><span className="chip">in the same vein</span><span className="chip">following a comparable pattern</span></div>
          <div className="chip-tier">Contrast</div>
          <div className="chips"><span className="chip cr">in contrast</span><span className="chip cr">conversely</span><span className="chip">on the other hand</span><span className="chip">whereas</span></div>
          <div className="why" style={{marginTop:8}}>Table có ≥2 chiều (row × column) → CC band cần linking words đa dạng.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Selection Strategy",items:["Chọn 3-4 features (KHÔNG nhiều hơn)","Always identify highest + lowest","Look for biggest gap or change","Find any exception/outlier"]},
          {c:"var(--sky)",h:"✓ Structure",items:["Para 1: paraphrase task","Para 2: overview (2 main features, no numbers)","Para 3: top 2 features + data","Para 4: contrasting/exception + data"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Describing every cell","Random number listing","Reading table top-to-bottom","Forgetting units (%, $, kg)"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="process"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Process diagram = <strong>không có số, không so sánh</strong>. Chỉ có <strong>chuỗi các bước</strong>. Yêu cầu: passive voice + sequential connectors + accurate vocabulary cho từng giai đoạn.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Opening Pattern</div>
          <div className="pattern">The diagram illustrates how{"\n"}<span className="slot">[product]</span> is produced{"\n"}in <span className="slot">[N]</span> distinct stages.</div>
          <div className="why">Đếm số stage và state ngay đầu — examiner thấy bạn đã grasp toàn bộ process.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, the process begins with{"\n"}<span className="slot">[input]</span> and ends with{"\n"}<span className="slot">[output]</span>, involving <span className="slot">[key actions]</span>.</div>
          <div className="why">Overview cho process = input → output + 1 key transformation. Không có "main trend".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Sequential Pattern</div>
          <div className="pattern">In the first stage, <span className="slot">[X]</span> is{"\n"}<span className="slot">[verb-passive]</span>. Subsequently, the{"\n"}<span className="slot">[material]</span> is then <span className="slot">[verb-passive]</span>.</div>
          <div className="why">Passive voice dominant. Active voice OK cho natural processes (the river flows).</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cyclic Pattern</div>
          <div className="pattern">The final stage produces <span className="slot">[output]</span>,{"\n"}which is then returned to <span className="slot">[start]</span>,{"\n"}completing the cycle.</div>
          <div className="why">Nếu cyclic, KHÔNG QUÊN nhắc "completing the cycle" — đó là feature key.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Sequence Connectors</div>
          <div className="chip-tier">Beginning</div>
          <div className="chips"><span className="chip cl">initially</span><span className="chip cl">in the first stage</span><span className="chip">to begin with</span><span className="chip">at the outset</span></div>
          <div className="chip-tier">Middle</div>
          <div className="chips"><span className="chip cs">subsequently</span><span className="chip cs">next</span><span className="chip">then</span><span className="chip">after this</span><span className="chip">following this</span><span className="chip">at this point</span></div>
          <div className="chip-tier">End</div>
          <div className="chips"><span className="chip co">finally</span><span className="chip co">in the final stage</span><span className="chip">ultimately</span><span className="chip">lastly</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Process Verbs (Passive)</div>
          <div className="chip-tier">Industrial</div>
          <div className="chips"><span className="chip cr">is heated</span><span className="chip cr">is filtered</span><span className="chip">is mixed with</span><span className="chip">is separated</span><span className="chip">is collected</span><span className="chip">is cooled</span></div>
          <div className="chip-tier">Transformation</div>
          <div className="chips"><span className="chip ch">is converted into</span><span className="chip ch">is transformed</span><span className="chip">is broken down</span><span className="chip">is produced</span><span className="chip">is formed</span></div>
          <div className="why" style={{marginTop:8}}>Tense rule: present simple passive cho timeless processes. Past simple passive nếu nói về historical process.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["State number of stages clearly","Cover ALL stages (don't skip)","Identify if linear or cyclic","Note any branching/parallel paths"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Passive voice dominant","Present simple for ongoing processes","'which' relative clauses for adding info","No subject jumping (keep -ing consistent)"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Active voice everywhere","Personal pronouns (you, we, they)","Numbers/percentages (none in process!)","Comparing efficiency"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="map"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Map = <strong>before/after</strong> tại một địa điểm (thường 2 hoặc 3 thời điểm). Cần: <strong>past simple passive</strong> + <strong>compass directions</strong> + <strong>position language</strong>. Đừng kể từng building — chọn ra 3-4 thay đổi đáng kể.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Change Pattern</div>
          <div className="pattern">The <span className="slot">[feature]</span> in the <span className="slot">[direction]</span>{"\n"}was demolished and replaced by{"\n"}a new <span className="slot">[feature]</span>.</div>
          <div className="why">"Was demolished and replaced" = chuỗi 2 verbs passive — sang & ăn điểm GRA.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Addition Pattern</div>
          <div className="pattern">A <span className="slot">[new feature]</span> was constructed{"\n"}to the <span className="slot">[direction]</span> of the{"\n"}<span className="slot">[existing landmark]</span>.</div>
          <div className="why">"To the north of X" — relative direction. Tốt hơn "in the north" chung chung.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Removal Pattern</div>
          <div className="pattern">The <span className="slot">[feature]</span> that once stood{"\n"}in the <span className="slot">[location]</span> had been{"\n"}removed by <span className="slot">[year]</span>.</div>
          <div className="why">"Had been removed" = past perfect passive. Boost GRA mạnh.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Preservation Pattern</div>
          <div className="pattern">The <span className="slot">[feature]</span> in the centre{"\n"}remained unchanged throughout{"\n"}the period.</div>
          <div className="why">Examiner muốn thấy bạn note CẢ những thứ KHÔNG thay đổi.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Directions & Position</div>
          <div className="chip-tier">Compass</div>
          <div className="chips"><span className="chip cs">in the north</span><span className="chip cs">to the south of</span><span className="chip">in the eastern part</span><span className="chip">towards the west</span><span className="chip">in the northeast corner</span></div>
          <div className="chip-tier">Relative position</div>
          <div className="chips"><span className="chip co">adjacent to</span><span className="chip co">alongside</span><span className="chip">opposite</span><span className="chip">next to</span><span className="chip">surrounded by</span><span className="chip">between X and Y</span></div>
          <div className="chip-tier">Centre/edge</div>
          <div className="chips"><span className="chip">in the centre</span><span className="chip">on the outskirts</span><span className="chip">at the edge of</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Change Verbs (Passive)</div>
          <div className="chip-tier">Build / add</div>
          <div className="chips"><span className="chip cl">was constructed</span><span className="chip cl">was built</span><span className="chip">was erected</span><span className="chip">was established</span></div>
          <div className="chip-tier">Remove / change</div>
          <div className="chips"><span className="chip cr">was demolished</span><span className="chip cr">was replaced by</span><span className="chip cr">was converted into</span><span className="chip">was redeveloped</span></div>
          <div className="chip-tier">Expand / preserve</div>
          <div className="chips"><span className="chip ch">was expanded</span><span className="chip ch">was extended</span><span className="chip">remained unchanged</span><span className="chip">was preserved</span></div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Identify 3-4 main changes","Note what stayed the same","Use compass directions","Mention scale if shown"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Past simple passive (was built)","Past perfect for sequenced changes","Relative clauses (which was once)","Comparatives with map context"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Listing every single building","Vague directions ('over there')","Forgetting the unchanged parts","Wrong tense (uses present)"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="mixed"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Multiple/Mixed charts = 2 visuals (line + pie, hoặc 2 bar, etc.). <strong>Quy tắc số 1</strong>: group features <strong>theo theme</strong>, không phải theo chart. Cross-reference data giữa 2 chart để show synthesis.
      </div>
      <InnerTabs tabs={["Strategy","Patterns","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Structure Strategy</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.65,fontWeight:300}}>
            <p style={{marginBottom:8}}><strong style={{color:"var(--leaf)"}}>Para 1 (Intro):</strong> Paraphrase BOTH charts in 1 sentence each.</p>
            <p style={{marginBottom:8}}><strong style={{color:"var(--leaf)"}}>Para 2 (Overview):</strong> 1 key feature from chart A + 1 key feature from chart B (no numbers).</p>
            <p style={{marginBottom:8}}><strong style={{color:"var(--leaf)"}}>Para 3 (Body 1):</strong> Detail chart A with specific data.</p>
            <p><strong style={{color:"var(--leaf)"}}>Para 4 (Body 2):</strong> Detail chart B + 1 cross-reference if possible.</p>
          </div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cross-Reference</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.65,fontWeight:300}}>
            <p style={{marginBottom:8}}>The killer feature for Band 7+. Example: nếu line chart show population growth và pie show city distribution → connect:</p>
            <p style={{padding:"8px 11px",background:"var(--surface2)",borderRadius:7,fontStyle:"italic",color:"var(--ink2)",borderLeft:"2px solid var(--leaf)"}}>"This population surge coincided with X representing 45% of urban density — likely a contributing factor."</p>
            <p style={{marginTop:8,color:"var(--ink3)"}}>Use words: coincided with, corresponded to, alongside, in parallel with.</p>
          </div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Intro Pattern</div>
          <div className="pattern">The <span className="slot">[chart A type]</span> illustrates{"\n"}<span className="slot">[topic A]</span>, while the{"\n"}<span className="slot">[chart B type]</span> shows{"\n"}<span className="slot">[topic B]</span>.</div>
          <div className="why">"While" connects 2 chart references trong 1 câu — efficient + sang.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, <span className="slot">[feature A]</span> shows{"\n"}<span className="slot">[trend]</span>, whereas <span className="slot">[feature B]</span>{"\n"}reveals <span className="slot">[contrasting pattern]</span>.</div>
          <div className="why">1 key feature mỗi chart, không trùng nhau. "Whereas" tạo nice contrast.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cross-Reference Pattern</div>
          <div className="pattern">Notably, <span className="slot">[chart A datapoint]</span> coincided{"\n"}with <span className="slot">[chart B datapoint]</span>, suggesting{"\n"}a possible relationship.</div>
          <div className="why">Cross-reference giữa 2 chart = signature feature của Band 7+. KHÔNG bỏ qua.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Transition Pattern</div>
          <div className="pattern">Turning to the <span className="slot">[chart B]</span>,{"\n"}a different picture emerges:{"\n"}<span className="slot">[main point]</span>.</div>
          <div className="why">Transition giữa 2 body paragraphs. "Turning to" / "Moving to" — natural cohesion.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Cover BOTH charts","≥1 feature from each in overview","Make at least 1 cross-reference","Don't ignore the smaller chart"]},
          {c:"var(--sky)",h:"✓ Coherence",items:["Clear paragraph for each chart","Smooth transition ('Turning to')","Linking ideas across charts","No abrupt jumps"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Describing chart A fully, then B","Forgetting one chart in overview","No cross-reference attempt","Treating it as 2 separate tasks"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="structure"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">4-Paragraph Formula</div>
        Band 7+ essays follow a clear 4-paragraph structure. The <strong>Overview is the most important paragraph</strong> — it determines your Task Achievement band.
      </div>
      {[
        {n:"1",name:"Introduction",desc:"Paraphrase the task question. Do NOT copy verbatim. ~25 words.",wc:"~25 words"},
        {n:"2",name:"Overview ★ Most Important",desc:"State 2 main trends/features WITHOUT specific data. Start with 'Overall, ...' Missing this = Band ≤6.",wc:"~35 words"},
        {n:"3",name:"Body Paragraph 1",desc:"Main trend / highest category with specific data points. 2–3 sentences, ≥2 data points.",wc:"~60 words"},
        {n:"4",name:"Body Paragraph 2",desc:"Contrasting trend / second feature + exception if any. Compare with body 1.",wc:"~60 words"}
      ].map(s=><div key={s.n} className="struct-row">
        <div className="snum">{s.n}</div>
        <div style={{flex:1}}><div className="sname">{s.name}</div><div className="sdesc">{s.desc}</div></div>
        <div className="swc">{s.wc}</div>
      </div>)}
      <div className="alert ai mt14">Total: ~180 words. Sweet spot — enough to cover key features without eating into Task 2 time.</div>
      <div className="cols-2 mt14">
        <div className="card"><div className="card-h"><div className="cdot"/>Time Allocation</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:12,lineHeight:2,color:"var(--ink2)"}}>
            <div>00:00 → 02:00 &nbsp;<span style={{color:"var(--ink3)"}}>Read, identify features</span></div>
            <div>02:00 → 04:00 &nbsp;<span style={{color:"var(--ink3)"}}>Plan (select 4 features)</span></div>
            <div>04:00 → 17:00 &nbsp;<span style={{color:"var(--leaf)"}}>Write</span></div>
            <div>17:00 → 20:00 &nbsp;<span style={{color:"var(--ink3)"}}>Check tense + spelling</span></div>
          </div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Paraphrase Rules</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.7,fontWeight:300}}>
            <p><strong style={{color:"var(--ink)"}}>"shows"</strong> → illustrates, depicts, presents</p>
            <p><strong style={{color:"var(--ink)"}}>"the number of"</strong> → the figures for, the quantity of</p>
            <p><strong style={{color:"var(--ink)"}}>"between 1990 and 2020"</strong> → over a 30-year period</p>
            <p><strong style={{color:"var(--ink)"}}>"in four countries"</strong> → across four nations</p>
          </div>
        </div>
      </div>
    </div>}

    {tab==="rubric"&&<div className="fu">
      <div className="alert ai">Each criterion = 25% of score. Overall = average of 4, rounded to nearest 0.5.</div>
      <div className="cols-2">
        {[
          {h:"Task Achievement (25%)",c:"var(--leaf)",items:[
            {b:"Band 8",d:"Covers all requirements; highlights key features clearly."},
            {b:"Band 7",d:"Clear overview of main trends; key features highlighted but could be extended."},
            {b:"Band 6",d:"Overview with info appropriately selected; details may be irrelevant.",col:"var(--honey)"},
            {b:"Band 5",d:"Recounts detail mechanically with no clear overview.",col:"var(--rose)"}
          ]},
          {h:"Coherence & Cohesion (25%)",c:"var(--sky)",items:[
            {b:"Band 8",d:"Sequences information logically; manages all aspects of cohesion well."},
            {b:"Band 7",d:"Logical with clear progression; cohesive devices used appropriately."},
            {b:"Band 6",d:"Information arranged coherently; cohesion may be faulty/mechanical.",col:"var(--honey)"},
            {b:"Band 5",d:"Lacks overall progression; inadequate or over-use of cohesive devices.",col:"var(--rose)"}
          ]},
          {h:"Lexical Resource (25%)",c:"var(--orchid)",items:[
            {b:"Band 8",d:"Wide range, fluent and flexible; skilfully uses uncommon items."},
            {b:"Band 7",d:"Sufficient range for flexibility; less common items with style awareness."},
            {b:"Band 6",d:"Adequate range; attempts less common vocab with some inaccuracy.",col:"var(--honey)"},
            {b:"Band 5",d:"Limited range, minimally adequate; noticeable errors in spelling.",col:"var(--rose)"}
          ]},
          {h:"Grammatical Range & Accuracy (25%)",c:"var(--rose)",items:[
            {b:"Band 8",d:"Wide range of structures; majority of sentences error-free."},
            {b:"Band 7",d:"Variety of complex structures; frequent error-free sentences; few errors."},
            {b:"Band 6",d:"Mix of simple and complex; some errors rarely reduce communication.",col:"var(--honey)"},
            {b:"Band 5",d:"Limited range; complex sentences less accurate than simple.",col:"var(--rose)"}
          ]}
        ].map((cr,i)=><div key={i} className="card">
          <div className="card-h"><div className="cdot" style={{background:cr.c}}/>{cr.h}</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {cr.items.map((it,j)=><div key={j} style={{fontSize:12,lineHeight:1.6,color:"var(--ink2)",fontWeight:300}}>
              <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:it.col||cr.c,fontWeight:500}}>{it.b}</span> — {it.d}
            </div>)}
          </div>
        </div>)}
      </div>
    </div>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WRITING THEORY WRAPPER — Task 1 + Task 2 sub-tabs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function WritingTheoryView({state, config}) {
  const [sub,setSub] = useState("task1");
  return <div className="canvas fu">
    <div className="kicker">Study Guide · Writing</div>
    <h1 className="title-x">Writing <em>Theory</em></h1>
    <div className="mode-toggle" style={{marginBottom:18}}>
      <button className={`mode-btn ${sub==="task1"?"active":""}`} onClick={()=>setSub("task1")}>Task 1 Guide</button>
      <button className={`mode-btn ${sub==="task2"?"active":""}`} onClick={()=>setSub("task2")}>Task 2 Guide</button>
    </div>
    {sub==="task1" ? <TheoryPage embedded={true} state={state} config={config}/> : <Task2TheoryView state={state} config={config}/>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INLINE THEORY: WRITING TASK 2
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Task2TheoryView({state, config}) {
  const [tab,setTab] = useState("opinion");
  const sections = [
    {id:"opinion",label:"Opinion",grp:"Question Types"},
    {id:"discussion",label:"Discussion",grp:"Question Types"},
    {id:"problem",label:"Problem-Solution",grp:"Question Types"},
    {id:"twopart",label:"Two-part",grp:"Question Types"},
    {id:"advdis",label:"Adv vs Disadv",grp:"Question Types"},
    {id:"posneg",label:"Pos/Neg Dev",grp:"Question Types"},
    {id:"structure",label:"Structure",grp:"Essentials"},
    {id:"cohesion",label:"Cohesion",grp:"Essentials"},
    {id:"vocabulary",label:"Vocabulary",grp:"Essentials"},
    {id:"grammar",label:"Grammar",grp:"Essentials"},
    {id:"rubric",label:"Rubric & Time",grp:"Essentials"},
    {id:"traps",label:"Common Traps",grp:"Warnings"}
  ];

  return <div className="fu">
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
      {["Question Types","Essentials","Warnings"].map(grp=><div key={grp} style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink3)",marginRight:6,minWidth:88}}>{grp}</span>
        {sections.filter(s=>s.grp===grp).map(s=><button key={s.id} className={`btn ${tab===s.id?"bp":"bg"} bsm`} onClick={()=>setTab(s.id)}>{s.label}</button>)}
      </div>)}
    </div>
    <TheoryPartPractice taskType="task2" config={config} state={state}/>

    {tab==="opinion"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Opinion essay (Agree/Disagree) chỉ cần 1 thứ: <strong>bạn đứng ở đâu phải rõ ngay từ intro</strong>. Examiner đếm xem position của bạn có nhất quán từ intro → body → conclusion không. "Tôi nửa đồng ý nửa không" mà không hedge khéo = Band 5.5.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Thesis Pattern</div>
          <div className="pattern">I <span className="slot">[largely/strongly/partly]</span> agree that <span className="slot">[paraphrased claim]</span>,{"\n"}although <span className="slot">[brief hedge / counter-acknowledgment]</span>.</div>
          <div className="why">"Largely/partly" cho phép nuance — Band 7+. Tránh "I totally agree" (cứng, không academic).</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Body Topic Sentence</div>
          <div className="pattern">The principal reason for supporting this view{"\n"}is that <span className="slot">[topic word phrase]</span> <span className="slot">[verb]</span> <span className="slot">[effect]</span>.</div>
          <div className="why">Bắt đầu bằng "Firstly, secondly" = Band 5.5 cohesion. Dùng noun phrase signposting.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Counter-paragraph (optional)</div>
          <div className="pattern">Admittedly, opponents argue that <span className="slot">[counter]</span>.{"\n"}However, this overlooks <span className="slot">[your rebuttal]</span>.</div>
          <div className="why">Concession + refutation = Band 7+ CC. Bỏ qua = an toàn nhưng cap Band 6.5.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Conclusion</div>
          <div className="pattern">In conclusion, while <span className="slot">[brief concession]</span>,{"\n"}<span className="slot">[restated position]</span> for the reasons outlined.</div>
          <div className="why">Conclusion phải match thesis. Mâu thuẫn intro/conclusion = -0.5 TR.</div>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Checklist</div>
        <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.6}}>
          <li>Position rõ ngay câu 2-3 của intro (không đợi đến body)</li>
          <li>2 body paragraphs ủng hộ position của mình, mỗi cái 1 lý do MẠNH</li>
          <li>Conclusion KHÔNG được mâu thuẫn intro</li>
          <li>Đếm chữ: 260-290 từ là sweet spot (250 = đủ; 320+ = drift)</li>
        </ul>
      </div>
    </div>}

    {tab==="discussion"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        "Discuss both views <strong>and</strong> give your own opinion." — chữ "and" này là band-killer nếu quên. Phải <strong>nêu opinion trong intro</strong>, không phải đợi đến conclusion.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Intro Pattern</div>
          <div className="pattern">While some argue <span className="slot">[view A]</span>, others maintain that{"\n"}<span className="slot">[view B]</span>. This essay will examine both perspectives{"\n"}before arguing that <span className="slot">[your opinion]</span>.</div>
          <div className="why">3 việc trong intro: (1) acknowledge view A, (2) acknowledge view B, (3) STATE opinion. Bỏ #3 = -0.5 TR.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Body 1 — View you DISAGREE with</div>
          <div className="pattern">Proponents of <span className="slot">[view A]</span> argue that <span className="slot">[reason]</span>.{"\n"}They cite <span className="slot">[example]</span>. However, this fails to account{"\n"}for <span className="slot">[weakness]</span>.</div>
          <div className="why">Trình bày fair (3-4 câu), sau đó counter ngắn (1 câu). Đừng strawman.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Body 2 — View you AGREE with</div>
          <div className="pattern">In my view, <span className="slot">[view B]</span> is more compelling.{"\n"}This is because <span className="slot">[main reason]</span>, as evidenced by{"\n"}<span className="slot">[concrete example or data]</span>.</div>
          <div className="why">Body 2 dài hơn body 1 ~25%. Đây là position chính.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Anti-pattern</div>
          <div className="pattern" style={{textDecoration:"line-through",color:"var(--rose)"}}>In conclusion, I think both views have merit{"\n"}and it depends on the situation.</div>
          <div className="why">"Fence-sitting" = Band ≤6 TR. Phải CAM KẾT một bên (kèm hedge nếu muốn).</div>
        </div>
      </div>
    </div>}

    {tab==="problem"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Problem-Solution test 2 thứ: (1) nguyên nhân <strong>thật sự</strong> không phải triệu chứng, (2) giải pháp <strong>cụ thể</strong> với agent (ai làm) và mechanism (làm sao). "Government should do more" = Band 5.5.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Body 1 — Problem</div>
          <div className="pattern">A primary cause of <span className="slot">[issue]</span> lies in <span className="slot">[root cause]</span>.{"\n"}When <span className="slot">[condition]</span> occurs, <span className="slot">[effect chain]</span>,{"\n"}ultimately leading to <span className="slot">[the issue]</span>.</div>
          <div className="why">Chain reasoning (condition → effect → issue) thể hiện depth. "Many factors" = vague, mất điểm.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Body 2 — Solution</div>
          <div className="pattern">An effective remedy would involve <span className="slot">[agent: government/companies/individuals]</span>{"\n"}<span className="slot">[action verb]</span> <span className="slot">[specific mechanism]</span>.{"\n"}For instance, <span className="slot">[concrete example with detail]</span>.</div>
          <div className="why">Mỗi solution phải có: AGENT (ai) + MECHANISM (làm thế nào) + EXAMPLE. Thiếu agent = Band 6.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Solution verbs (Band 7+)</div>
          <div className="chips">
            <span className="chip">implement</span><span className="chip">enforce</span><span className="chip">subsidise</span><span className="chip">incentivise</span><span className="chip">mandate</span><span className="chip">levy</span><span className="chip">curb</span><span className="chip">phase out</span>
          </div>
          <div className="why">Tránh "stop", "make", "do" — quá generic.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Anti-pattern</div>
          <div className="pattern" style={{textDecoration:"line-through",color:"var(--rose)"}}>The government should solve this problem{"\n"}by raising awareness and educating people.</div>
          <div className="why">"Raising awareness" + "educating" — clichés. Phải mechanism cụ thể (vd: media campaign trên TV trong giờ vàng + curriculum reform lớp 9).</div>
        </div>
      </div>
    </div>}

    {tab==="twopart"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Two-part question có 2 (đôi khi 3) câu hỏi. Việc thường mắc nhất: <strong>quên câu thứ 2</strong>. Plan trong 5 phút — đánh dấu mỗi câu hỏi và assign 1 body paragraph.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Mapping rule</div>
          <div className="pattern">Question 1 → Body 1{"\n"}Question 2 → Body 2{"\n"}(Question 3 nếu có → merge với Body 2 hoặc tách)</div>
          <div className="why">1-to-1 mapping. Nếu trộn cả 2 câu hỏi vào 1 body, examiner sẽ thấy bạn chưa "address" đủ.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Intro Pattern</div>
          <div className="pattern"><span className="slot">[Context sentence about topic]</span>.{"\n"}This essay will first examine <span className="slot">[Q1 paraphrased]</span>,{"\n"}before discussing <span className="slot">[Q2 paraphrased]</span>.</div>
          <div className="why">Signal cả 2 câu hỏi trong intro — examiner thấy bạn nhận diện được nhiệm vụ.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Common variants</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>"Why...? Is it positive or negative?"</li>
            <li>"What are the causes? What can be done?"</li>
            <li>"What is the problem? Who is responsible?"</li>
          </ul>
          <div className="why">Mỗi câu hỏi thường yêu cầu thinking style khác nhau (cause/effect, evaluation, prescription).</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Conclusion</div>
          <div className="pattern">In summary, <span className="slot">[answer Q1 in 1 line]</span>,{"\n"}while <span className="slot">[answer Q2 in 1 line]</span>.</div>
          <div className="why">Conclusion trả lời cả 2 câu một cách rõ ràng, không phải tóm tắt body.</div>
        </div>
      </div>
    </div>}

    {tab==="advdis"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        2 biến thể: (a) "Discuss advantages AND disadvantages" — neutral, không cần opinion; (b) "Do the advantages OUTWEIGH the disadvantages?" — phải có evaluation. Đọc kỹ — nhầm = Band 5.5 TR.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Variant A — Pure A&D</div>
          <div className="pattern">Body 1: One key advantage is that <span className="slot">[benefit + mechanism]</span>.{"\n"}Body 2: On the other hand, a notable drawback is{"\n"}<span className="slot">[downside + mechanism]</span>.</div>
          <div className="why">Cân bằng (1 adv + 1 disadv là đủ). Conclusion: tóm tắt cả hai, KHÔNG cần opinion.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Variant B — Outweigh</div>
          <div className="pattern">Thesis: While X has its merits, I believe its drawbacks{"\n"}<span className="slot">[outweigh / are eclipsed by]</span> its advantages,{"\n"}primarily because <span className="slot">[main reason]</span>.</div>
          <div className="why">Phải CAM KẾT một bên trong intro. Body 1 = bên ít quan trọng hơn (concession), Body 2 = bên bạn agree.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Evaluation language</div>
          <div className="chips">
            <span className="chip cs">far outweigh</span><span className="chip cs">significantly outstrip</span><span className="chip">marginally exceed</span><span className="chip cr">pale in comparison to</span><span className="chip cr">are eclipsed by</span><span className="chip">render insignificant</span>
          </div>
          <div className="why">Variant B cần cường độ rõ ràng. "Slightly" / "marginally" cho hedge; "far" / "significantly" cho strong stance.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Tell apart at the question</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>"Discuss the advantages and disadvantages" → Variant A</li>
            <li>"Do advantages outweigh disadvantages?" → Variant B</li>
            <li>"Is this a positive or negative development?" → Variant B (evaluation)</li>
          </ul>
        </div>
      </div>
    </div>}

    {tab==="posneg"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Đề bài mô tả một <strong>thực trạng / xu hướng</strong> đang diễn ra, rồi hỏi "Is this a positive or negative development?". Nhiệm vụ kép: (1) xác nhận thực trạng trong intro, (2) <strong>đưa ra verdict rõ</strong> — positive hoặc negative. Viết như Adv/Disadv mà không commit verdict = Band 5.5 TR.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Nhận dạng đề</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>Cấu trúc: <em>"[Trend/situation]. Is this a positive or negative development?"</em></li>
            <li>Không hỏi agree/disagree, không hỏi outweigh</li>
            <li>Yêu cầu: <strong>evaluation</strong> — bạn ĐÁNH GIÁ xu hướng đó tốt hay xấu</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Intro Pattern</div>
          <div className="pattern"><span className="slot">[Paraphrase the trend]</span> has become{"\n"}increasingly prevalent in recent decades.{"\n"}In my view, this is largely a <span className="slot">[positive/negative]</span>{"\n"}development, primarily because <span className="slot">[main reason]</span>.</div>
          <div className="why">2 việc: (1) xác nhận thực trạng, (2) đưa verdict ngay. Không đợi đến conclusion.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Body structure</div>
          <div className="pattern">Body 1: <span className="slot">[Lý do mạnh nhất cho verdict]</span>{"\n"}→ explain → example → link{"\n"}Body 2: <span className="slot">[Lý do 2 HOẶC concession + rebuttal]</span>{"\n"}→ "Admittedly, ... However, ..."</div>
          <div className="why">Nếu verdict là "largely positive" — Body 1 = main positive, Body 2 = concede 1 negative BUT rebut. Không chia đều 50/50.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Verdict language</div>
          <div className="chips">
            <span className="chip cs">largely positive</span><span className="chip cs">broadly beneficial</span><span className="chip cr">predominantly negative</span><span className="chip cr">deeply concerning</span><span className="chip">a double-edged development</span>
          </div>
          <div className="why">"Largely/broadly" cho phép concession ở body 2 mà vẫn giữ verdict. Tránh "both positive and negative" không kèm verdict — quá vague, Band ≤6 TR.</div>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Checklist</div>
        <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.6}}>
          <li>Intro: paraphrase <strong>thực trạng</strong> + đưa verdict ngay (không đợi đến body)</li>
          <li>Body 1: lý do mạnh nhất ủng hộ verdict (TEEL)</li>
          <li>Body 2: concession nhẹ → rebuttal → verdict vẫn giữ vững</li>
          <li>Conclusion: restate trend + confirm verdict bằng từ mới</li>
          <li><strong>Không</strong> liệt kê adv/disadv đều nhau rồi để examiner tự kết luận</li>
        </ul>
      </div>
    </div>}

    {tab==="structure"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Mọi Task 2 essay đều có công thức 4 đoạn: <strong>Intro · Body 1 · Body 2 · Conclusion</strong>. Examiner đếm các phần này như checklist. Thiếu intro / conclusion = -1 band CC.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Intro Hook (Band 7+)</div>
          <div className="pattern">It is increasingly argued that <span className="slot">[paraphrased topic]</span>{"\n"}<span className="slot">[verb]</span> <span className="slot">[effect on society]</span>.{"\n"}This essay will <span className="slot">[map of body paragraphs]</span>,{"\n"}arguing that <span className="slot">[thesis]</span>.</div>
          <div className="why">Hook + Map + Thesis = 3 câu intro. Không quá 60 từ. Tránh "Nowadays, in modern society..."</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Body — TEEL</div>
          <div className="pattern"><strong>T</strong>opic: One reason is...{"\n"}<strong>E</strong>xplain: This is because...{"\n"}<strong>E</strong>xample: For instance, in <span className="slot">[country/study/year]</span>...{"\n"}<strong>L</strong>ink: As a result...</div>
          <div className="why">4 câu cho 1 body paragraph (~90 từ). Thiếu Example = -0.5 TR. Thiếu Link = -0.5 CC.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Conclusion</div>
          <div className="pattern">In conclusion, <span className="slot">[restate position in NEW words]</span>.{"\n"}Although <span className="slot">[concession]</span>, the evidence suggests{"\n"}<span className="slot">[final stance + forward-look]</span>.</div>
          <div className="why">Conclusion = paraphrase intro thesis + 1 câu "so what". Không thêm idea mới.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Word count target</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>Intro: 45-65 từ</li>
            <li>Mỗi Body: 90-115 từ</li>
            <li>Conclusion: 45-65 từ</li>
            <li><strong>Total: 270-300 từ</strong> (250 = floor, 320 = drift)</li>
          </ul>
        </div>
      </div>
    </div>}

    {tab==="cohesion"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Cohesion (CC band) test khả năng nối ý — KHÔNG phải số lượng "Firstly, secondly, finally". Band 7+ dùng <strong>reference</strong> (this, such) và <strong>substitution</strong>, KHÔNG lạm dụng connectors.
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Connectors theo chức năng</div>
        <div className="chip-tier">Contrast (Band 7+)</div>
        <div className="chips"><span className="chip">However</span><span className="chip">Conversely</span><span className="chip">By contrast</span><span className="chip">Nevertheless</span><span className="chip">That said</span><span className="chip cs">Be that as it may</span></div>
        <div className="chip-tier">Cause</div>
        <div className="chips"><span className="chip">Because</span><span className="chip">Owing to</span><span className="chip">Stemming from</span><span className="chip">In light of</span><span className="chip">Given that</span></div>
        <div className="chip-tier">Result</div>
        <div className="chips"><span className="chip">Consequently</span><span className="chip">As a result</span><span className="chip">Therefore</span><span className="chip">This leads to</span><span className="chip cs">whereby</span></div>
        <div className="chip-tier">Addition</div>
        <div className="chips"><span className="chip cr">Moreover</span><span className="chip cr">Furthermore</span><span className="chip">In addition</span><span className="chip">What is more</span><span className="chip">Coupled with this</span></div>
        <div className="why">Đỏ = đừng lạm dụng (max 1 lần/essay). Band 7+ ưu tiên reference (*such practices*, *this phenomenon*) hơn là connectors.</div>
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Reference patterns</div>
          <div className="pattern">..., a trend which <span className="slot">[verb]</span>...{"\n"}This <span className="slot">[abstract noun]</span> reflects...{"\n"}Such <span className="slot">[plural noun]</span> typically result in...</div>
          <div className="why">Thay vì lặp danh từ, dùng "this trend / this shift / such practices" — Band 7+ CC.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Substitution</div>
          <div className="pattern">One group <span className="slot">[does X]</span>; another <span className="slot">[does Y]</span>.{"\n"}Some people prefer A; others, B.{"\n"}If so, <span className="slot">[consequence]</span> follows.</div>
          <div className="why">"another" thay "another group"; "so" thay clause trước → tight cohesion.</div>
        </div>
      </div>
    </div>}

    {tab==="vocabulary"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Lexical Resource (LR) <strong>không phải</strong> dùng từ to. Là dùng từ <strong>đúng ngữ cảnh</strong>. Một "compelling argument" hợp văn cảnh = Band 7. Hai "tapestry of complexities" sai văn cảnh = Band 6.
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Upgrade ladder — common adjectives</div>
        <div className="chip-tier">important</div>
        <div className="chips"><span className="chip">significant</span><span className="chip">crucial</span><span className="chip">pivotal</span><span className="chip">indispensable</span><span className="chip">paramount</span></div>
        <div className="chip-tier">big (problem/effect)</div>
        <div className="chips"><span className="chip">substantial</span><span className="chip">considerable</span><span className="chip">profound</span><span className="chip">far-reaching</span><span className="chip">sweeping</span></div>
        <div className="chip-tier">bad</div>
        <div className="chips"><span className="chip">detrimental</span><span className="chip">deleterious</span><span className="chip">pernicious</span><span className="chip">adverse</span><span className="chip">untenable</span></div>
        <div className="chip-tier">good</div>
        <div className="chips"><span className="chip">beneficial</span><span className="chip">advantageous</span><span className="chip">conducive</span><span className="chip">favourable</span><span className="chip">expedient</span></div>
        <div className="why">Mỗi essay dùng 4-6 từ trong các nhóm này. Lặp 1 từ 3+ lần = -0.5 LR.</div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Power collocations</div>
        <div className="chips" style={{lineHeight:2}}>
          <span className="chip">a compelling argument</span><span className="chip">a pressing issue</span><span className="chip">profound implications</span><span className="chip">wholly dependent on</span><span className="chip">strikingly different from</span><span className="chip">a glaring shortcoming</span><span className="chip">an indispensable role</span><span className="chip">deeply entrenched</span><span className="chip">manifest itself in</span><span className="chip">at the heart of</span>
        </div>
        <div className="why">2-3 collocation đúng văn cảnh nâng LR từ 6.5 → 7.5. Học theo cụm, không học rời.</div>
      </div>
    </div>}

    {tab==="grammar"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        GRA Band 7 = "wide range of structures" + "majority error-free". Mỗi essay phải có ÍT NHẤT: 2 complex sentences, 1 conditional, 1 relative clause, 1 passive — và tất cả phải đúng.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Cleft sentences</div>
          <div className="pattern">What makes <span className="slot">[X]</span> particularly significant{"\n"}is that <span className="slot">[consequence]</span>.</div>
          <div className="why">Cleft (What/It is...) tạo emphasis + variety. Examiner nhận ra ngay — Band 7+ marker.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Mixed conditional</div>
          <div className="pattern">Had <span className="slot">[past action]</span>, <span className="slot">[present result]</span>{"\n"}would not <span className="slot">[verb]</span>.</div>
          <div className="why">Mixed conditional (past condition → present result) thể hiện thinking sophistication. 1 lần/essay là đủ.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Inversion (formal)</div>
          <div className="pattern">Not only does <span className="slot">[X]</span> <span className="slot">[verb]</span>,{"\n"}but it also <span className="slot">[verb 2]</span>.{"\n"}{"\n"}Rarely have <span className="slot">[plural noun]</span> <span className="slot">[past participle]</span>.</div>
          <div className="why">Inversion sau "not only", "rarely", "seldom", "no sooner". Dùng 1 lần/essay max.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Participle clauses (Band 8)</div>
          <div className="pattern"><span className="slot">[Verb-ing]</span> <span className="slot">[object]</span>, governments can <span className="slot">[verb]</span>.{"\n"}<span className="slot">[Verb-ed]</span> by <span className="slot">[noun]</span>, these policies <span className="slot">[verb]</span>.</div>
          <div className="why">Mở câu bằng -ing hoặc -ed clause = compact + variety. 1-2 lần/essay = Band 7.5+.</div>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Lỗi GRA điển hình Band 6→7</div>
        <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.65}}>
          <li>S-V agreement: "A number of factors <strong>is</strong>..." → phải là <strong>are</strong></li>
          <li>Article: bỏ "a/the" trước countable singular ("Government should...")</li>
          <li>Tense shift: trộn present/past trong cùng paragraph mà không lý do</li>
          <li>Dangling modifier: "Walking to school, the rain started..." (rain không walking)</li>
          <li>Wrong preposition: "discuss <strong>about</strong>" (chỉ "discuss"), "depend <strong>of</strong>" (phải "on")</li>
        </ul>
      </div>
    </div>}

    {tab==="rubric"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        4 tiêu chí, mỗi cái 25%. <strong>Yếu nhất kéo điểm chung xuống</strong> — không phải trung bình. Band 7 + 7 + 7 + 5 = Band 6.5. Nên đánh đều thay vì cố Band 9 ở 1 cái.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>TR — Task Response</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:11.5,lineHeight:1.55,color:"var(--ink2)"}}>
            <li><strong>B6:</strong> address task, position clear nhưng có thể chưa nhất quán</li>
            <li><strong>B7:</strong> clear position throughout, mỗi idea developed đủ</li>
            <li><strong>B8:</strong> well-developed response, ideas relevant + extended</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>CC — Coherence & Cohesion</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:11.5,lineHeight:1.55,color:"var(--ink2)"}}>
            <li><strong>B6:</strong> logical sequence, connectors có khi sai/over-use</li>
            <li><strong>B7:</strong> clear progression, range of cohesive devices, reference khéo</li>
            <li><strong>B8:</strong> skilful management of paragraphs, không lạm dụng connectors</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>LR — Lexical Resource</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:11.5,lineHeight:1.55,color:"var(--ink2)"}}>
            <li><strong>B6:</strong> adequate range, 1-2 errors gây nhiễu</li>
            <li><strong>B7:</strong> sufficient flexibility, less common items, collocations đúng</li>
            <li><strong>B8:</strong> wide range, rare items used precisely + naturally</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>GRA — Grammatical Range & Accuracy</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:11.5,lineHeight:1.55,color:"var(--ink2)"}}>
            <li><strong>B6:</strong> mix simple+complex, errors có nhưng meaning clear</li>
            <li><strong>B7:</strong> variety of complex structures, majority error-free</li>
            <li><strong>B8:</strong> wide range + flexibility, rare/minor errors only</li>
          </ul>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>40-min time budget</div>
        <div className="pattern"><strong>5'</strong> Plan: brainstorm + outline 2 body topics{"\n"}<strong>30'</strong> Write: intro 5' · body 1 10' · body 2 10' · conclusion 5'{"\n"}<strong>5'</strong> Check: tense, S-V agreement, article, spelling</div>
        <div className="why">Check phase tăng GRA accuracy ~0.5 band. Đừng skip dù viết chậm.</div>
      </div>
    </div>}

    {tab==="traps"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Top 7 lỗi học sinh Band 5-6 hay mắc — fix là tăng ngay 0.5-1 band. Đây là <strong>checklist trước khi nộp</strong>.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>1. Memorized openers</div>
          <div className="pattern" style={{textDecoration:"line-through",color:"var(--rose)"}}>In today's modern fast-paced world,{"\n"}it is widely believed that...</div>
          <div className="why">Examiner thấy memorized phrase = Band cap 6. Mở bằng claim cụ thể về topic.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>2. Vague examples</div>
          <div className="pattern" style={{textDecoration:"line-through",color:"var(--rose)"}}>For example, many people experience{"\n"}this problem in their lives.</div>
          <div className="why">"Many people / some studies" = generic. Phải có name/place/year/percentage (kể cả giả lập): "A 2019 LSE study found 62%..."</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>3. Position drift</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Intro: "I disagree that..."{"\n"}Conclusion: "Both views have merit."</div>
          <div className="why">Mâu thuẫn intro/conclusion = -1 TR. Plan position trước khi viết, stick to it.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>4. Connector overdose</div>
          <div className="pattern" style={{textDecoration:"line-through",color:"var(--rose)"}}>Firstly... Moreover... Furthermore...{"\n"}In addition... Finally...</div>
          <div className="why">5+ connectors/essay = examiner highlight và trừ điểm CC. Max 1 connector/paragraph.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>5. Repeating the question</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Q: "Do you agree that schools should..."{"\n"}Essay: "I agree that schools should..."</div>
          <div className="why">Direct copy = 0 contribution to LR. Phải paraphrase 70%+ word khi rephrase đề.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>6. Under/over word count</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>240 từ → TR -0.5 penalty{"\n"}340+ từ → quality declines</div>
          <div className="why">Target 270-300. Đếm trước khi nộp.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>7. Pronoun confusion ("you", "we")</div>
          <div className="pattern" style={{textDecoration:"line-through",color:"var(--rose)"}}>You can see that we need to change...</div>
          <div className="why">Task 2 = academic register, 3rd person. "Individuals / people / one" thay cho "you/we".</div>
        </div>
      </div>
    </div>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INLINE THEORY: READING LAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ReadingTheoryView() {
  const [tab,setTab] = useState("tfng");
  const sections = [
    {id:"tfng",label:"T/F/NG",grp:"Question Types"},
    {id:"headings",label:"Matching Headings",grp:"Question Types"},
    {id:"matchinfo",label:"Matching Info",grp:"Question Types"},
    {id:"mcq",label:"MCQ",grp:"Question Types"},
    {id:"completion",label:"Completion",grp:"Question Types"},
    {id:"shortanswer",label:"Short Answer",grp:"Question Types"},
    {id:"diagram",label:"Diagram/Flow",grp:"Question Types"},
    {id:"timing",label:"Time Strategy",grp:"Essentials"},
    {id:"skimscan",label:"Skim/Scan/Deep",grp:"Essentials"},
    {id:"paraphrase",label:"Paraphrase Gym",grp:"Essentials"},
    {id:"wordlimit",label:"Word-limit Rules",grp:"Essentials"},
    {id:"vocab",label:"Academic Verbs",grp:"Vocab"}
  ];

  return <div className="fu">
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
      {["Question Types","Essentials","Vocab"].map(grp=><div key={grp} style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink3)",marginRight:6,minWidth:88}}>{grp}</span>
        {sections.filter(s=>s.grp===grp).map(s=><button key={s.id} className={`btn ${tab===s.id?"bp":"bg"} bsm`} onClick={()=>setTab(s.id)}>{s.label}</button>)}
      </div>)}
    </div>

    {tab==="tfng"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Giám khảo IELTS <strong>không dịch từ theo nghĩa từ điển</strong> — họ test khả năng tư duy <strong>logic và tập hợp</strong>. Bẫy chính: lượng từ (quantifiers) và sắc thái (sentiment) bị paraphrase.
      </div>

      <div className="card"><div className="card-h"><div className="cdot"/>3 nguyên tắc cốt lõi</div>
        <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.7}}>
          <li><strong>TRUE</strong> = passage paraphrase / xác nhận trực tiếp 1 câu. Evidence từ 1-2 câu, không phải suy luận xa.</li>
          <li><strong>FALSE</strong> = passage <em>contradict trực tiếp</em>: opposite quantifier (all ↔ some), opposite direction (rose ↔ fell), wrong attribution.</li>
          <li><strong>NOT GIVEN</strong> = topic có thể được nói, nhưng <em>claim cụ thể</em> không được confirm hay deny. "Feels almost there" = thường NG.</li>
        </ul>
      </div>

      <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--honey)"}}/>Ma trận logic lượng từ (Quantifier Matrix)</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:12,borderCollapse:"collapse",color:"var(--ink2)"}}>
            <thead>
              <tr style={{background:"var(--surface2)"}}>
                <th style={{padding:"6px 8px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Passage</th>
                <th style={{padding:"6px 8px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Statement</th>
                <th style={{padding:"6px 8px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Đáp án</th>
                <th style={{padding:"6px 8px",textAlign:"left",borderBottom:"1px solid var(--border)"}}>Logic</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}><strong>Many</strong> (nhiều)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Some (một vài)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",color:"var(--leaf)",fontWeight:600}}>TRUE</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Tập hợp "Nhiều" ⊇ "Một vài"</td></tr>
              <tr><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}><strong>Some</strong> (một vài)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Many (nhiều)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",color:"var(--honey)",fontWeight:600}}>NOT GIVEN</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Hẹp → Rộng không suy diễn được</td></tr>
              <tr><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}><strong>A few</strong> (một vài, KĐ)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Some (một vài)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",color:"var(--leaf)",fontWeight:600}}>TRUE</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Sắc thái + số lượng ≈ Some</td></tr>
              <tr><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}><strong>Few</strong> (rất ít, phủ định)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Some (một vài)</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",color:"var(--rose)",fontWeight:600}}>FALSE / NG</td><td style={{padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>Sắc thái phủ định ↔ khẳng định</td></tr>
              <tr><td style={{padding:"6px 8px"}}><strong>Some</strong></td><td style={{padding:"6px 8px"}}>Few / A few</td><td style={{padding:"6px 8px",color:"var(--honey)",fontWeight:600}}>NOT GIVEN</td><td style={{padding:"6px 8px"}}>Rộng (Some) → Hẹp (Few/A few)</td></tr>
            </tbody>
          </table>
        </div>
        <div className="why">Ghi nhớ: "<strong>A few</strong>" = khẳng định ("có vài cái"), "<strong>Few</strong>" (không "a") = phủ định ("gần như không có"). Hai từ này <em>trái ngược sắc thái</em>.</div>
      </div>

      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Lỗi 1 — Đánh đồng "Few" và "A few"</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Passage: "<strong>Few</strong> scientists believed in the theory."{"\n"}Statement: "<strong>Some</strong> scientists accepted it."{"\n"}{"\n"}→ Học sinh chọn TRUE vì "few ≈ some". <strong>SAI.</strong>{"\n"}→ Đúng: <strong>FALSE</strong> (Few = phủ định mệnh đề)</div>
          <div className="why">"A few friends" = có vài bạn (vui). "Few friends" = chẳng có mấy (cô đơn).</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Lỗi 2 — Suy diễn "phòng khách"</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Passage: "<strong>Some</strong> tech companies face layoffs."{"\n"}Statement: "<strong>Many</strong> tech companies are struggling."{"\n"}{"\n"}→ Học sinh: "Kinh tế khó khăn thì chắc chắn nhiều..." → TRUE. <strong>SAI.</strong>{"\n"}→ Đúng: <strong>NOT GIVEN</strong></div>
          <div className="why">Dùng <em>logic văn bản</em>, không dùng <em>logic đời thực</em>. Passage không cho info về quy mô = NG.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Lỗi 3 — Lượng từ vs Tần suất</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Passage: "<strong>Many</strong> people change careers."{"\n"}Statement: "People <strong>often</strong> change careers."{"\n"}{"\n"}→ "Nhiều người đổi nghề" ≠ "Mỗi người thường xuyên đổi nghề"{"\n"}→ Đúng: <strong>NOT GIVEN</strong></div>
          <div className="why">Phân biệt: quantifier (số lượng người/vật) ≠ frequency (tần suất hành động trong thời gian).</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Lỗi 4 — Bẫy belief vs proof</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Passage: "Many scientists <strong>believe</strong> X."{"\n"}Statement: "X is <strong>proven</strong>."{"\n"}{"\n"}→ Đúng: <strong>FALSE</strong> (belief ≠ proof){"\n"}{"\n"}Statement: "Y is also believed."{"\n"}→ Đúng: <strong>NOT GIVEN</strong> (Y không được nhắc)</div>
        </div>
      </div>

      <div className="card"><div className="card-h"><div className="cdot"/>Paraphrase bank — Lượng từ thay thế</div>
        <div className="chip-tier">MANY → đại đa số / chiếm đa số</div>
        <div className="chips"><span className="chip">a majority of</span><span className="chip">the vast majority of</span><span className="chip">a significant number of</span><span className="chip">a substantial number of</span><span className="chip">numerous</span><span className="chip">countless</span><span className="chip">widespread</span><span className="chip">prevalent</span><span className="chip">ubiquitous</span><span className="chip">a wealth of</span><span className="chip">a myriad of</span></div>
        <div className="chip-tier">SOME → một phần / vừa phải</div>
        <div className="chips"><span className="chip">a proportion of</span><span className="chip">a percentage of</span><span className="chip">certain</span><span className="chip">a selection of</span><span className="chip">a variety of</span><span className="chip">a handful of</span></div>
        <div className="chip-tier">FEW → cực kỳ ít / hiếm hoi (phủ định)</div>
        <div className="chips"><span className="chip cr">a minority of</span><span className="chip cr">scarce</span><span className="chip cr">negligible</span><span className="chip cr">insignificant</span><span className="chip cr">hardly any</span><span className="chip cr">scarcely any</span><span className="chip cr">limited</span><span className="chip cr">restricted</span></div>
        <div className="why">Chip đỏ = sắc thái phủ định. Khi gặp "limited success" trong passage = "thành công rất ít" — gần như thất bại, KHÔNG phải "có một chút thành công".</div>
      </div>

      <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Chiến thuật mũi tên logic (khi đi thi)</div>
        <ol style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.7}}>
          <li>Khoanh tròn <strong>tất cả quantifier</strong> trong cả passage và statement</li>
          <li>Vẽ <strong>mũi tên logic</strong> theo nguyên tắc:
            <ul style={{marginTop:4,paddingLeft:18}}>
              <li><strong>Rộng (passage) → Hẹp (statement):</strong> chọn <span style={{color:"var(--leaf)",fontWeight:600}}>TRUE</span> (vd: Many → Some)</li>
              <li><strong>Hẹp (passage) → Rộng (statement):</strong> chọn <span style={{color:"var(--honey)",fontWeight:600}}>NOT GIVEN</span> (vd: Some → Many)</li>
              <li><strong>Sắc thái khẳng định ↔ phủ định:</strong> chọn <span style={{color:"var(--rose)",fontWeight:600}}>FALSE</span> (vd: Few ↔ Some)</li>
            </ul>
          </li>
          <li>Nếu phân vân giữa FALSE và NG → mặc định <strong>NG</strong> (FALSE cần evidence contradict cụ thể)</li>
        </ol>
      </div>

      <div className="card"><div className="card-h"><div className="cdot"/>Technique workflow</div>
        <ol style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.65}}>
          <li>Đọc statement, gạch chân <strong>2-3 keyword</strong> + <strong>khoanh quantifier</strong></li>
          <li>Scan passage tìm keyword (hoặc synonym của nó)</li>
          <li>Đọc kỹ 2-3 câu xung quanh keyword</li>
          <li>So sánh quantifier statement vs passage — apply mũi tên logic</li>
          <li>So sánh meaning chính — confirm? contradict? silent?</li>
          <li>Khi phân vân: <strong>FALSE đòi evidence rõ ràng, NG không đòi</strong> → default NG</li>
        </ol>
      </div>
    </div>}

    {tab==="headings"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Test khả năng nhận diện <strong>main idea</strong> của paragraph (không phải chi tiết). Bẫy chính: heading chứa keyword nổi bật của 1 chi tiết — học sinh chọn heading đó vì keyword match.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Technique</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12.5,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>Đọc <strong>câu đầu + câu cuối</strong> paragraph (topic + concluding)</li>
            <li>Tự tóm tắt ý chính trong 5-8 từ</li>
            <li>So với headings — heading nào <strong>paraphrase</strong> tóm tắt của bạn</li>
            <li>Loại bỏ heading chỉ match 1 detail</li>
          </ol>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Pre-process headings</div>
          <div className="pattern">Trước khi đọc passage, đọc list headings.{"\n"}Phân loại sơ: cause / effect / comparison / shift...{"\n"}Mỗi heading nên fit 1 category.</div>
          <div className="why">Có context trước → đọc passage nhanh hơn 30-40%.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Trap — Detail match</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Paragraph C: "[main idea about migration]...{"\n"}A famous example is the monarch butterfly..."</div>
          <div className="why">Heading "The monarch butterfly's journey" — bẫy. Đúng heading là về migration concept, không phải butterfly example.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Distractor headings</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>Heading match 1 detail (không phải main idea)</li>
            <li>Heading quá rộng (cover whole passage, không phải 1 paragraph)</li>
            <li>Heading paraphrase từ paragraph khác</li>
            <li>Heading về topic không có trong passage</li>
          </ul>
        </div>
      </div>
    </div>}

    {tab==="matchinfo"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Khác Matching Headings: đây là <strong>chi tiết cụ thể</strong>, không phải main idea. Câu hỏi: "Which paragraph contains [specific fact]?" — và <strong>thứ tự có thể không theo passage</strong>.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Technique</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12.5,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>Đọc statement cần tìm — gạch chân unique keyword (tên riêng, số, năm)</li>
            <li>Scan toàn bộ passage tìm keyword đó</li>
            <li>Confirm: đoạn đó có <em>match</em> nội dung statement không (không chỉ keyword)</li>
            <li>Move on — đừng đọc từng đoạn từ đầu</li>
          </ol>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Note</div>
          <div className="pattern">1 paragraph có thể chứa info cho 2+ statements.{"\n"}1 paragraph có thể không chứa info cho statement nào.{"\n"}Statements <strong>không theo thứ tự</strong> passage.</div>
          <div className="why">Đừng giả định "câu hỏi 1 phải ở đầu passage". Có thể ở giữa.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Pacing tip</div>
          <div className="pattern">Làm Matching Info <strong>SAU CÙNG</strong> trong section{"\n"}— sau khi đã đọc passage cho các câu hỏi khác.{"\n"}Bạn đã quen với passage, scan nhanh hơn.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Trap</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Statement: "an example of an animal{"\n"}adapting to urban environments"</div>
          <div className="why">Đoạn nói về urban animals nhưng không có "example" — không match. Phải có cả ý "adapting" + "example".</div>
        </div>
      </div>
    </div>}

    {tab==="mcq"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        MCQ test ability phân biệt <strong>option đúng vs option "đúng một nửa"</strong>. 4 options thường có: 1 đúng, 1 ngược, 1 đúng-nhưng-không-trả-lời-câu-hỏi, 1 plausible-not-stated.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Distractor types</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.6,color:"var(--ink2)"}}>
            <li><strong>True-not-asked:</strong> đúng trong passage nhưng không trả lời câu hỏi</li>
            <li><strong>Half-correct:</strong> nửa đúng nửa altered</li>
            <li><strong>Plausible-not-stated:</strong> nghe hợp lý nhưng passage không nói</li>
            <li><strong>Opposite:</strong> ngược với passage (catches careless readers)</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Technique</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12.5,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>Đọc <strong>STEM trước, options sau</strong> — tránh prime bias</li>
            <li>Tìm answer trong passage trước khi xem options</li>
            <li>Eliminate options 1 cái 1 cái với lý do cụ thể</li>
            <li>Còn 2 lựa chọn → so sánh từng word</li>
          </ol>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Common stem mistake</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Stem: "What does the author <strong>suggest</strong>?"</div>
          <div className="why">"Suggest" = implication, không phải fact. Tìm câu mà passage <em>imply</em>, không phải <em>state directly</em>.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Stem keywords</div>
          <div className="chips">
            <span className="chip">according to</span><span className="chip">main reason</span><span className="chip">primary purpose</span><span className="chip">suggests</span><span className="chip">implies</span><span className="chip">it can be inferred</span><span className="chip">most likely</span>
          </div>
          <div className="why">Mỗi stem word đòi hỏi cách tìm khác nhau. "According to" = direct quote. "Implies" = read between lines.</div>
        </div>
      </div>
    </div>}

    {tab==="completion"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Sentence/Summary/Note/Table/Flow-chart completion — tất cả test 2 thứ: (1) tìm đúng từ trong passage, (2) <strong>fit grammar</strong> vào blank. Đếm chữ chính xác.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Technique</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12.5,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>Đọc instructions: bao nhiêu chữ tối đa?</li>
            <li>Đọc câu có blank — đoán <strong>part of speech</strong> cần (noun? verb? adj?)</li>
            <li>Scan passage tìm từ match grammar + meaning</li>
            <li>Copy exact wording (không change form)</li>
          </ol>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Word-limit pedant</div>
          <div className="pattern">"NO MORE THAN TWO WORDS":{"\n"}- "bioluminescent bacteria" = 2 words ✓{"\n"}- "the deep sea" = 3 words ✗{"\n"}- "a/an/the" đếm là 1 word</div>
          <div className="why">Đếm chữ là band-killer thường gặp nhất ở completion. Đếm 2 lần trước khi nộp.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Trap — wrong form</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Passage: "...the protein <strong>produced</strong> by..."{"\n"}Blank needs noun: "_____ of energy"</div>
          <div className="why">Câu trả lời là "production" — nhưng passage chỉ có "produced". Phải tìm noun form trong câu khác của passage.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Summary completion strategy</div>
          <div className="pattern">Summary là 1 section của passage (không phải toàn bộ).{"\n"}Identify <strong>which paragraphs</strong> summary covers,{"\n"}rồi đọc kỹ chỉ những đoạn đó.</div>
          <div className="why">Summary thường paraphrase passage. Tìm key concept, không phải exact phrase.</div>
        </div>
      </div>
    </div>}

    {tab==="shortanswer"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Wh-questions với answer 1-3 từ <strong>lấy trực tiếp từ passage</strong>. Đơn giản nhất trong các dạng. Bẫy: chọn đúng word answer đúng câu hỏi (không phải word gần đó).
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Technique</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12.5,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>Identify Wh-word: What/Where/When/Who/Why/How</li>
            <li>Mỗi Wh đòi hỏi loại answer: WHO → người, WHEN → time, WHY → reason</li>
            <li>Tìm câu trong passage trả lời chính xác</li>
            <li>Copy exact words (không paraphrase)</li>
          </ol>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Common Wh-patterns</div>
          <div className="chips" style={{lineHeight:2}}>
            <span className="chip">What chemical</span><span className="chip">Which year</span><span className="chip">Where</span><span className="chip">How many</span><span className="chip">Why does</span><span className="chip">Who first</span>
          </div>
          <div className="why">"What chemical" — phải là tên hóa chất, không phải properties. "How many" — phải có number/quantity.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Trap — near word</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Q: "What compound causes the glow?"{"\n"}Passage: "...the enzyme luciferase{"\n"}acts on the compound luciferin..."</div>
          <div className="why">Đáp án là "luciferin" (compound) — KHÔNG phải "luciferase" (enzyme). Đọc kỹ part-of-speech.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Word-limit care</div>
          <div className="pattern">"NO MORE THAN THREE WORDS AND/OR A NUMBER":{"\n"}- "$5 million" = 1 number + 1 word ✓{"\n"}- "five million dollars" = 3 words ✓{"\n"}- "1.5 billion dollars" = 1 number + 2 words ✓</div>
        </div>
      </div>
    </div>}

    {tab==="diagram"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Diagram label / Flow-chart completion — đọc <strong>diagram trước</strong> để hiểu structure, sau đó tìm trong passage theo thứ tự diagram. Đừng đọc passage trước.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Technique</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12.5,lineHeight:1.6,color:"var(--ink2)"}}>
            <li>Đọc tiêu đề diagram + tất cả labels có sẵn</li>
            <li>Hiểu structure (process? cycle? cross-section?)</li>
            <li>Đoán type of word cần điền (vật, vị trí, hành động...)</li>
            <li>Scan passage theo order của diagram</li>
            <li>Copy exact word từ passage</li>
          </ol>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Flow-chart strategy</div>
          <div className="pattern">Flow-chart thường theo TIME order trong passage.{"\n"}Step 1 → tìm ở đầu passage{"\n"}Step N → tìm ở cuối</div>
          <div className="why">Khác Matching Info — flow-chart steps có thứ tự cố định trong passage.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Diagram label tip</div>
          <div className="pattern">Cấu trúc passage cho diagram thường có:{"\n"}- "consists of...", "located between..."{"\n"}- "X connects to Y", "above the..."</div>
          <div className="why">Spatial language là signal cho diagram answers.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Trap</div>
          <div className="pattern" style={{color:"var(--ink3)"}}>Passage có 2 names cho 1 part{"\n"}(scientific vs common name)</div>
          <div className="why">Diagram label có thể yêu cầu 1 trong 2. Kiểm tra word-limit để biết chọn cái nào.</div>
        </div>
      </div>
    </div>}

    {tab==="timing"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        60 phút cho 3 passages + 40 questions. <strong>Section 1 ngắn nhất, Section 3 khó nhất</strong>. Phân bổ thời gian KHÔNG ĐỀU. Đa số học sinh chết ở Section 3 vì hết giờ.
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Recommended pacing</div>
        <div className="pattern"><strong>Section 1</strong> (easier): 17 phút (13 questions){"\n"}<strong>Section 2</strong> (medium): 20 phút (13 questions){"\n"}<strong>Section 3</strong> (hard): 23 phút (14 questions){"\n"}<strong>Đệm + transfer:</strong> không có thêm — answer ghi thẳng vào answer sheet</div>
        <div className="why">3 + 3 = 6 phút cho passage tổng quan, 14 phút cho questions trong Section 1.</div>
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Per-question budget</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>Easy questions (T/F/NG, MCQ Section 1): ~60s</li>
            <li>Matching headings (5 questions): 5-7 min total</li>
            <li>Completion: ~75s each</li>
            <li>Section 3 inference MCQ: ~120s each</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Decision rules</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>Question >90s mà chưa ra → SKIP, mark, quay lại sau</li>
            <li>5 phút cuối → guess all blanks (no penalty for wrong)</li>
            <li>Mỗi 13 questions phải làm xong trong khung của section đó</li>
          </ul>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Order strategy</div>
        <ol style={{margin:0,paddingLeft:18,fontSize:12.5,color:"var(--ink2)",lineHeight:1.65}}>
          <li>Đọc passage (3 phút) — overview, không cần hiểu hết</li>
          <li>Làm question theo thứ tự xuất hiện trong passage</li>
          <li>Matching Information / Headings — làm SAU CÙNG trong section (đã quen passage)</li>
          <li>Transfer answers vào sheet ngay khi xong từng câu, không để cuối</li>
        </ol>
      </div>
    </div>}

    {tab==="skimscan"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        3 reading modes. Học sinh Band 6 dùng 1 mode (deep) cho tất cả → hết giờ. Band 7+ chuyển mode theo task: <strong>skim</strong> cho overview, <strong>scan</strong> cho keywords, <strong>deep</strong> chỉ khi cần.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Skim (45-60s/passage)</div>
          <div className="pattern">Đọc <strong>tiêu đề + câu đầu mỗi đoạn + câu cuối passage</strong>.{"\n"}Mục tiêu: nắm topic + structure của passage.{"\n"}KHÔNG cần hiểu chi tiết.</div>
          <div className="why">Skim trước khi xem questions giúp orient. Đọc 1 lần đầu = 30% hiểu là OK.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Scan (15-30s/keyword)</div>
          <div className="pattern">Mắt chạy nhanh tìm <strong>unique keyword</strong>:{"\n"}- Tên riêng (in hoa){"\n"}- Số/năm/percentage{"\n"}- Technical terms</div>
          <div className="why">Scan không đọc — chỉ tìm shape của keyword. Dùng cho Matching Info, Short Answer.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Deep read (slow)</div>
          <div className="pattern">Đọc kỹ 2-4 câu xung quanh keyword đã scan ra.{"\n"}Hiểu nghĩa, paraphrase, suy luận.{"\n"}Dùng cho MCQ inference, T/F/NG, summary.</div>
          <div className="why">Deep read chỉ 5-10% passage. Đừng deep-read cả passage = chết.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Workflow</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>Skim passage (60s)</li>
            <li>Đọc question — identify keyword</li>
            <li>Scan để tìm location</li>
            <li>Deep-read 2-4 câu để answer</li>
            <li>Next question</li>
          </ol>
        </div>
      </div>
    </div>}

    {tab==="paraphrase"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        IELTS Reading test ability nhận <strong>paraphrase</strong>. Câu hỏi gần như không bao giờ dùng exact word của passage. Người Band 6 tìm keyword → fail vì keyword khác form. Band 7+ học cụm paraphrase trước.
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Common paraphrase pairs</div>
        <div className="chip-tier">Increase / decrease</div>
        <div className="chips"><span className="chip">rise ↔ ascend, climb, soar, surge</span></div>
        <div className="chips"><span className="chip">decrease ↔ wane, dwindle, decline, dip</span></div>
        <div className="chip-tier">Cause / result</div>
        <div className="chips"><span className="chip">cause ↔ trigger, give rise to, prompt, induce</span></div>
        <div className="chips"><span className="chip">result ↔ outcome, consequence, repercussion</span></div>
        <div className="chip-tier">Important</div>
        <div className="chips"><span className="chip">important ↔ pivotal, crucial, significant, paramount</span></div>
        <div className="chip-tier">Many / few</div>
        <div className="chips"><span className="chip">many ↔ numerous, a multitude of, an array of</span></div>
        <div className="chips"><span className="chip">few ↔ a handful of, sparse, limited</span></div>
        <div className="chip-tier">Show / prove</div>
        <div className="chips"><span className="chip">show ↔ demonstrate, illustrate, reveal, indicate</span></div>
        <div className="chips"><span className="chip">prove ↔ establish, confirm, substantiate</span></div>
        <div className="chip-tier">Use / apply</div>
        <div className="chips"><span className="chip">use ↔ employ, utilise, harness, leverage</span></div>
        <div className="chip-tier">Difficult / easy</div>
        <div className="chips"><span className="chip">difficult ↔ challenging, daunting, formidable</span></div>
        <div className="chips"><span className="chip">easy ↔ straightforward, effortless, accessible</span></div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Structural paraphrases</div>
        <div className="pattern">Active ↔ Passive: "The team built X" ↔ "X was built by the team"{"\n"}Noun ↔ Verb: "the discovery of" ↔ "discovered"{"\n"}Question ↔ Statement: "Why does X?" ↔ "X occurs because..."</div>
        <div className="why">Đáp án thường ở dạng grammatical khác với question.</div>
      </div>
    </div>}

    {tab==="wordlimit"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Lỗi <strong>over word-limit</strong> = automatic 0 cho câu đó, dù answer ý đúng. Phải đếm chữ cẩn thận. Đây là <em>technicality</em> mà examiner áp dụng nghiêm.
      </div>
      <div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Word counting rules</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li><strong>Articles</strong> (a/an/the): đếm là 1 word</li>
            <li><strong>Hyphenated</strong> ("self-aware"): đếm là 1 word</li>
            <li><strong>Numbers</strong>: "50%" = 1 word; "fifty percent" = 2 words</li>
            <li><strong>Compound nouns</strong> ("car park"): 2 words</li>
            <li><strong>Possessive 's</strong>: không tách word ("Tom's book" = 2 words)</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Common limits</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li><strong>"ONE WORD ONLY"</strong>: cực kỳ hiếm, thường 1 noun</li>
            <li><strong>"NO MORE THAN TWO WORDS"</strong>: phổ biến — completion</li>
            <li><strong>"NO MORE THAN THREE WORDS"</strong>: short answer</li>
            <li><strong>"AND/OR A NUMBER"</strong>: numbers KHÔNG đếm vào limit</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Examples (NO MORE THAN TWO WORDS)</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>"bioluminescent bacteria" → 2 words ✓</li>
            <li>"deep-sea organisms" → 2 words ✓ (hyphen)</li>
            <li>"the deep sea" → 3 words ✗</li>
            <li>"3,000 metres" → 1 number + 1 word ✓</li>
            <li>"three thousand metres" → 3 words ✗</li>
          </ul>
        </div>
        <div className="card"><div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Final check ritual</div>
          <ol style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
            <li>Đọc lại instructions của question group</li>
            <li>Đếm word của EACH answer trong group</li>
            <li>Nếu over → xem có dạng compact hơn không (digit thay text)</li>
          </ol>
        </div>
      </div>
    </div>}

    {tab==="vocab"&&<div className="fu">
      <div className="intuition"><div className="int-tag">Intuition</div>
        Reading test có ~5-8 từ học thuật mỗi passage. Học theo <strong>chức năng trong văn academic</strong> (mô tả nghiên cứu, đối lập, hedge, evaluate) — hiệu quả hơn học rời.
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Describe research / claims</div>
        <div className="chips">
          <span className="chip">propose</span><span className="chip">posit</span><span className="chip">contend</span><span className="chip">maintain</span><span className="chip">assert</span><span className="chip">postulate</span><span className="chip">hypothesise</span><span className="chip">infer</span><span className="chip">deduce</span><span className="chip">surmise</span>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Show / demonstrate evidence</div>
        <div className="chips">
          <span className="chip">demonstrate</span><span className="chip">illustrate</span><span className="chip">reveal</span><span className="chip">indicate</span><span className="chip">corroborate</span><span className="chip">substantiate</span><span className="chip">vindicate</span><span className="chip">attest to</span><span className="chip">bear out</span>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Contrast / refute</div>
        <div className="chips">
          <span className="chip">refute</span><span className="chip">debunk</span><span className="chip">contradict</span><span className="chip">undermine</span><span className="chip">call into question</span><span className="chip">cast doubt on</span><span className="chip">dispute</span><span className="chip">overturn</span>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Hedge (uncertainty)</div>
        <div className="chips">
          <span className="chip">tend to</span><span className="chip">appear to</span><span className="chip">it is likely that</span><span className="chip">suggest</span><span className="chip">imply</span><span className="chip">may well</span><span className="chip">arguably</span><span className="chip">putative</span><span className="chip">presumably</span>
        </div>
        <div className="why">Hedge words quan trọng cho T/F/NG. "Suggests" ≠ "proves" — bẫy thường gặp.</div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Evaluate / judge</div>
        <div className="chips">
          <span className="chip">commend</span><span className="chip">extol</span><span className="chip">deride</span><span className="chip">disparage</span><span className="chip">scrutinise</span><span className="chip">interrogate</span><span className="chip">advocate</span><span className="chip">condemn</span>
        </div>
      </div>
      <div className="card"><div className="card-h"><div className="cdot"/>Change / shift</div>
        <div className="chips">
          <span className="chip">undergo</span><span className="chip">manifest</span><span className="chip">emerge</span><span className="chip">evolve</span><span className="chip">stem from</span><span className="chip">give way to</span><span className="chip">supersede</span><span className="chip">precipitate</span>
        </div>
      </div>
    </div>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: PRACTICE (Generate + Write + Grade + Bridge)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
