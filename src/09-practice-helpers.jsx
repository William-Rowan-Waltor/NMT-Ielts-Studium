function PracticeChartCanvas({genData}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(()=>{
    if (!canvasRef.current||!genData?.chartData) return;
    if (chartRef.current) chartRef.current.destroy();
    // Era-aware palette: primary series = era accent (--leaf), axes/legend follow era ink,
    // pie slice borders match the era background so it fits light + dark eras.
    const _cs = getComputedStyle(document.documentElement);
    const _v = (n,d)=>{const x=_cs.getPropertyValue(n).trim();return x||d;};
    const eraBg=_v('--bg','#09090b'), grid=_v('--border','#22222b'), tick=_v('--ink3','#4e4e5c'), legend=_v('--ink2','#8a8a98');
    const pal = [_v('--leaf','#a3e635'),'#60a5fa','#fb7185','#c084fc','#fbbf24','#34d399'];
    const data = JSON.parse(JSON.stringify(genData.chartData));
    if (genData.chartType==='line') {
      (data.datasets||[]).forEach((ds,i)=>{ds.borderColor=pal[i%pal.length];ds.backgroundColor=pal[i%pal.length]+'15';ds.tension=.4;ds.pointRadius=3;ds.borderWidth=2;});
    } else if (genData.chartType==='bar') {
      (data.datasets||[]).forEach((ds,i)=>{ds.backgroundColor=pal[i%pal.length]+'bb';ds.borderRadius=4;});
    } else if (genData.chartType==='pie') {
      const ds=data.datasets[0];ds.backgroundColor=(data.labels||[]).map((_,i)=>pal[i%pal.length]+'cc');ds.borderColor=eraBg;ds.borderWidth=2;
    }
    chartRef.current = new Chart(canvasRef.current, {
      type:genData.chartType,data,
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:genData.chartType==='pie'?'right':'top',labels:{color:legend,font:{size:11}}}},
        scales:genData.chartType!=='pie'?{x:{grid:{color:grid},ticks:{color:tick,font:{size:10}}},y:{grid:{color:grid},ticks:{color:tick,font:{size:10}}}}:{}}
    });
    return ()=>chartRef.current?.destroy();
  },[genData]);
  return <div className="chart-wrap"><canvas ref={canvasRef}/></div>;
}

// F5: Mini canvas — renders a single chart from {chartType, chartData} (used by mixed/multiple)
function MiniChartCanvas({chartType, chartData}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(()=>{
    if (!canvasRef.current||!chartData) return;
    if (chartRef.current) chartRef.current.destroy();
    // Era-aware palette (see PracticeChartCanvas).
    const _cs = getComputedStyle(document.documentElement);
    const _v = (n,d)=>{const x=_cs.getPropertyValue(n).trim();return x||d;};
    const eraBg=_v('--bg','#09090b'), grid=_v('--border','#22222b'), tick=_v('--ink3','#4e4e5c'), legend=_v('--ink2','#8a8a98');
    const pal = [_v('--leaf','#a3e635'),'#60a5fa','#fb7185','#c084fc','#fbbf24','#34d399'];
    const data = JSON.parse(JSON.stringify(chartData));
    if (chartType==='line') {
      (data.datasets||[]).forEach((ds,i)=>{ds.borderColor=pal[i%pal.length];ds.backgroundColor=pal[i%pal.length]+'15';ds.tension=.4;ds.pointRadius=3;ds.borderWidth=2;});
    } else if (chartType==='bar') {
      (data.datasets||[]).forEach((ds,i)=>{ds.backgroundColor=pal[i%pal.length]+'bb';ds.borderRadius=4;});
    } else if (chartType==='pie') {
      const ds=data.datasets[0]; if(ds){ds.backgroundColor=(data.labels||[]).map((_,i)=>pal[i%pal.length]+'cc');ds.borderColor=eraBg;ds.borderWidth=2;}
    }
    chartRef.current = new Chart(canvasRef.current, {
      type:chartType, data,
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:chartType==='pie'?'bottom':'top',labels:{color:legend,font:{size:10}}}},
        scales:chartType!=='pie'?{x:{grid:{color:grid},ticks:{color:tick,font:{size:9}}},y:{grid:{color:grid},ticks:{color:tick,font:{size:9}}}}:{}}
    });
    return ()=>chartRef.current?.destroy();
  },[chartType, chartData]);
  return <div style={{position:"relative",height:240}}><canvas ref={canvasRef}/></div>;
}

// F5: Multi-chart layout (mixed + multiple) — 2-col grid
function MultiChartRender({items}) {
  if (!items||!items.length) return <div style={{color:"var(--ink3)",fontStyle:"italic"}}>No chart data.</div>;
  return <div style={{display:"grid",gridTemplateColumns:items.length>1?"1fr 1fr":"1fr",gap:14}}>
    {items.map((it,i)=><div key={i}>
      {it.caption&&<div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)",marginBottom:5,letterSpacing:".05em",textTransform:"uppercase"}}>{it.caption}</div>}
      <MiniChartCanvas chartType={it.chartType||"bar"} chartData={it.chartData}/>
    </div>)}
  </div>;
}

// F5: Table render
function PracticeTableRender({data}) {
  if (!data||!data.headers||!data.rows) return <div style={{color:"var(--ink3)",fontStyle:"italic"}}>No table data.</div>;
  return <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr>{data.headers.map((h,i)=><th key={i} style={{textAlign:i===0?"left":"right",padding:"8px 10px",borderBottom:"2px solid var(--border2)",color:"var(--ink)",fontFamily:"'Geist Mono',monospace",fontSize:11,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
      <tbody>{data.rows.map((row,ri)=><tr key={ri} style={{borderBottom:"1px solid var(--border)"}}>
        {row.map((cell,ci)=><td key={ci} style={{textAlign:ci===0?"left":"right",padding:"8px 10px",color:ci===0?"var(--ink)":"var(--ink2)",fontFamily:ci===0?"inherit":"'Geist Mono',monospace",fontSize:ci===0?13:12}}>{cell}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

// F5: Process diagram render — numbered steps with arrows
function ProcessRender({steps}) {
  if (!steps||!steps.length) return <div style={{color:"var(--ink3)",fontStyle:"italic"}}>No process steps.</div>;
  return <div style={{display:"flex",flexDirection:"column",gap:0}}>
    {steps.map((step,i)=><div key={i}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",background:"var(--surface2)",borderRadius:8,border:"1px solid var(--border)"}}>
        <div style={{flexShrink:0,width:30,height:30,borderRadius:"50%",background:"var(--leaf)",color:"#09090b",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Geist Mono',monospace",fontSize:13,fontWeight:700}}>{i+1}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--ink)",marginBottom:3,fontWeight:500}}>{step.label||step.title||`Step ${i+1}`}</div>
          {step.description&&<div style={{color:"var(--ink2)",fontSize:12.5,lineHeight:1.5}}>{step.description}</div>}
        </div>
      </div>
      {i<steps.length-1&&<div style={{textAlign:"center",color:"var(--ink3)",fontSize:18,lineHeight:1,padding:"3px 0"}}>↓</div>}
    </div>)}
  </div>;
}

// F5: Map render — before/after side-by-side
function MapRender({elements}) {
  if (!elements||(!elements.before&&!elements.after)) return <div style={{color:"var(--ink3)",fontStyle:"italic"}}>No map data.</div>;
  const Panel = ({title, items, accent}) => <div style={{flex:1,background:"var(--surface2)",border:`1px solid ${accent}`,borderRadius:10,padding:12}}>
    <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:accent,marginBottom:10,fontWeight:700}}>{title}</div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {(items||[]).map((el,i)=><div key={i} style={{borderLeft:`2px solid ${accent}`,paddingLeft:10}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:13,color:"var(--ink)",fontWeight:500,marginBottom:2}}>{el.label}</div>
        {el.desc&&<div style={{color:"var(--ink2)",fontSize:11.5,lineHeight:1.5}}>{el.desc}</div>}
      </div>)}
    </div>
  </div>;
  return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
    <Panel title="Before" items={elements.before} accent="var(--orchid)"/>
    <Panel title="After" items={elements.after} accent="var(--leaf)"/>
  </div>;
}

// F5: Smart dispatcher — picks render path by chartType
function PracticeVisualRender({genData}) {
  if (!genData) return null;
  const t = genData.chartType;
  if (t==="line"||t==="bar"||t==="pie") return genData.chartData ? <PracticeChartCanvas genData={genData}/> : null;
  if (t==="table") return <PracticeTableRender data={genData.chartData}/>;
  if (t==="process") return <ProcessRender steps={genData.processSteps}/>;
  if (t==="map") return <MapRender elements={genData.mapElements}/>;
  if (t==="mixed"||t==="multiple") return <MultiChartRender items={genData.chartDataMultiple}/>;
  return null;
}

// V6: Revision Queue — derive due/upcoming essays from archive
function getDueRevisits(essays, now=Date.now()) {
  if (!Array.isArray(essays)) return [];
  return essays
    .filter(e => e.gradeResult && e.revisitDue && !e.revisitedAt && e.revisitDue <= now)
    .sort((a,b) => a.revisitDue - b.revisitDue); // oldest due first
}
function getUpcomingRevisits(essays, now=Date.now(), withinMs=7*86400000) {
  if (!Array.isArray(essays)) return [];
  return essays
    .filter(e => e.gradeResult && e.revisitDue && !e.revisitedAt && e.revisitDue > now && e.revisitDue <= now+withinMs)
    .sort((a,b) => a.revisitDue - b.revisitDue);
}

// V6: AnnotatedEssay — render essay with inline color highlights from AI annotations.
// Tags: "strong" (green), "improve" (amber), "error" (rose). Hover shows comment.
function AnnotatedEssay({essay, annotations, showAnnotations}) {
  const [openIdx, setOpenIdx] = useState(null);
  if (!essay) return null;
  if (!showAnnotations || !annotations || annotations.length === 0) {
    return <div style={{fontSize:13.5,color:"var(--ink)",lineHeight:1.85,fontFamily:"'Fraunces',serif",fontWeight:300,whiteSpace:"pre-wrap"}}>{essay}</div>;
  }
  // Sort annotations by their position in essay so we can walk through linearly without conflicts.
  // Each annotation has {sentence, tag, comment}. We splice the essay into runs:
  //   [plain] [annotated] [plain] [annotated] ...
  const sorted = annotations
    .map(a => ({...a, pos: essay.indexOf(a.sentence)}))
    .filter(a => a.pos >= 0)
    .sort((a,b) => a.pos - b.pos);

  // Drop overlapping annotations (keep earlier one) — defensive against AI returning overlapping picks
  const nonOverlapping = [];
  let nextValidStart = 0;
  for (const a of sorted) {
    if (a.pos >= nextValidStart) {
      nonOverlapping.push(a);
      nextValidStart = a.pos + a.sentence.length;
    }
  }

  const segs = [];
  let cursor = 0;
  nonOverlapping.forEach((a, i) => {
    if (a.pos > cursor) segs.push({type:"plain", text: essay.slice(cursor, a.pos)});
    segs.push({type:"anno", text: a.sentence, tag: a.tag, comment: a.comment, key: i});
    cursor = a.pos + a.sentence.length;
  });
  if (cursor < essay.length) segs.push({type:"plain", text: essay.slice(cursor)});

  const tagColor = (tag) => tag==="strong" ? "var(--leaf)" : tag==="improve" ? "var(--honey)" : "var(--rose)";
  const tagStyle = (tag, active) => {
    const base = {borderRadius:3,padding:"1px 3px",cursor:"pointer",borderBottom:"2px solid",transition:"background .15s"};
    const bg = tag==="strong" ? "rgba(163,230,53,.10)" : tag==="improve" ? "rgba(251,191,36,.12)" : "rgba(244,63,94,.10)";
    return {...base, background: active ? "color-mix(in srgb, "+tagColor(tag)+" 26%, transparent)" : bg, borderBottomColor: tagColor(tag)};
  };
  const open = segs.find((s,i)=>s.type==="anno" && i===openIdx);

  return <div>
    <div style={{fontSize:13.5,color:"var(--ink)",lineHeight:1.95,fontFamily:"'Fraunces',serif",fontWeight:300,whiteSpace:"pre-wrap"}}>
      {segs.map((s,i) => s.type === "plain"
        ? <span key={i}>{s.text}</span>
        : <span key={i} style={tagStyle(s.tag, i===openIdx)} title={`[${s.tag.toUpperCase()}] ${s.comment}`}
            role="button" tabIndex={0}
            onClick={()=>setOpenIdx(i===openIdx?null:i)}
            onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpenIdx(i===openIdx?null:i); } }}>{s.text}</span>
      )}
    </div>
    {/* Tap/click an annotation to pin its comment here (touch-friendly; desktop hover tooltip still works) */}
    {open
      ? <div style={{marginTop:10,padding:"9px 12px",background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`2px solid ${tagColor(open.tag)}`,borderRadius:8}}>
          <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:tagColor(open.tag),marginRight:8}}>{open.tag}</span>
          <span style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55}}>{open.comment}</span>
        </div>
      : <div style={{marginTop:8,fontSize:11,color:"var(--ink3)",fontStyle:"italic"}}>Tap a highlighted phrase to see the note.</div>}
  </div>;
}

// Task 2: render an essay/answer as properly separated paragraphs (real <p> spacing, not a
// single cramped pre-wrap blob). Splits on blank lines, falling back to single newlines.
function WritingParagraphs({text, style, gap=12}) {
  const clean = String(text||"").replace(/\r\n?/g,"\n").trim();
  if (!clean) return null;
  let paras = clean.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  if (paras.length < 2) paras = clean.split(/\n+/).map(p=>p.trim()).filter(Boolean);
  return <div>{paras.map((p,i)=><p key={i} style={{margin:0,marginBottom:i<paras.length-1?gap:0,...(style||{})}}>{p}</p>)}</div>;
}

// Task 3: show the AI's thinking for a generated example. For each statement the AI wrote,
// reveal WHY (word/collocation choice, strategy applied, logic/grammar fix). Renders BOTH
// (1) the essay with each statement inline-highlighted + tap-to-reveal, AND
// (2) a full "AI's thinking" panel listing every statement with its reasoning + tags.
const WRITING_THINK_TAGS = {
  strategy:{label:"strategy",color:"var(--sky)"},
  collocation:{label:"collocation",color:"var(--leaf)"},
  vocab:{label:"vocabulary",color:"var(--orchid)"},
  vocabulary:{label:"vocabulary",color:"var(--orchid)"},
  logic:{label:"logic",color:"var(--honey)"},
  grammar:{label:"grammar",color:"var(--rose)"},
  cohesion:{label:"cohesion",color:"var(--sky)"}
};
function writingThinkTagMeta(tag){ return WRITING_THINK_TAGS[String(tag||"").toLowerCase()] || {label:String(tag||"note"),color:"var(--ink3)"}; }
function writingThinkTagChips(tags, size){
  const fs = size==="sm" ? 8.5 : 9;
  return (Array.isArray(tags)?tags:[]).map((t,i)=>{ const m=writingThinkTagMeta(t);
    return <span key={i} style={{fontFamily:"'Geist Mono',monospace",fontSize:fs,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:m.color,border:`1px solid ${m.color}`,borderRadius:4,padding:"1px 5px"}}>{m.label}</span>; });
}

function WritingExampleReasoning({essay, statements, accent="var(--orchid)"}) {
  const [openIdx,setOpenIdx] = useState(null);
  const list = (Array.isArray(statements)?statements:[]).map((s,idx)=>({
    idx,
    statement: String(s?.statement||s?.sentence||s?.text||"").trim(),
    reasoning: String(s?.reasoning||s?.why||s?.thinking||s?.explanation||"").trim(),
    tags: Array.isArray(s?.tags)?s.tags:(s?.tag?[s.tag]:[])
  })).filter(s=>s.statement);
  if (!essay || !list.length) return null;
  // Locate each statement inside the essay (same approach as AnnotatedEssay).
  const located = list.map(s=>({...s,pos:essay.indexOf(s.statement)})).filter(s=>s.pos>=0).sort((a,b)=>a.pos-b.pos);
  const nonOverlap=[]; let nextStart=0;
  for(const s of located){ if(s.pos>=nextStart){ nonOverlap.push(s); nextStart=s.pos+s.statement.length; } }
  const segs=[]; let cur=0;
  nonOverlap.forEach(s=>{ if(s.pos>cur) segs.push({type:"plain",text:essay.slice(cur,s.pos)}); segs.push({type:"stmt",...s}); cur=s.pos+s.statement.length; });
  if(cur<essay.length) segs.push({type:"plain",text:essay.slice(cur)});
  const open = nonOverlap.find(s=>s.idx===openIdx);
  return <div>
    <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.9,fontFamily:"'Fraunces',serif",fontWeight:300,whiteSpace:"pre-wrap",background:"var(--surface)",border:"1px solid var(--border)",borderLeft:`2px solid ${accent}`,borderRadius:8,padding:"12px 14px"}}>
      {segs.length ? segs.map((s,i)=> s.type==="plain"
        ? <span key={i}>{s.text}</span>
        : <span key={i} role="button" tabIndex={0} title="Tap to see why the AI wrote this"
            onClick={()=>setOpenIdx(openIdx===s.idx?null:s.idx)}
            onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpenIdx(openIdx===s.idx?null:s.idx); } }}
            style={{cursor:"pointer",borderBottom:`2px solid ${accent}`,background:openIdx===s.idx?`color-mix(in srgb, ${accent} 24%, transparent)`:`color-mix(in srgb, ${accent} 8%, transparent)`,borderRadius:3,padding:"1px 2px",transition:"background .15s"}}>{s.statement}</span>
      ) : <span>{essay}</span>}
    </div>
    {open
      ? <div style={{marginTop:10,padding:"9px 12px",background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`2px solid ${accent}`,borderRadius:8}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:5}}>{writingThinkTagChips(open.tags)}</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55}}>{open.reasoning || "(no reasoning provided)"}</div>
        </div>
      : <div style={{marginTop:8,fontSize:11,color:"var(--ink3)",fontStyle:"italic"}}>Tap a highlighted sentence to see the AI's reasoning, or read the full breakdown below.</div>}
    <div style={{marginTop:12}}>
      <div className="sl">AI's thinking — sentence by sentence</div>
      <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:6}}>
        {list.map((s,i)=><div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 11px"}}>
          <div style={{fontSize:12,color:"var(--ink)",fontFamily:"'Fraunces',serif",lineHeight:1.5,marginBottom:5}}>{s.statement}</div>
          {s.tags.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:s.reasoning?5:0}}>{writingThinkTagChips(s.tags,"sm")}</div>}
          {s.reasoning&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>{s.reasoning}</div>}
        </div>)}
      </div>
    </div>
  </div>;
}

// V6: Render the topic-relevant Word Debt section
function WordDebtPanel({items, state, setState}) {
  const [added, setAdded] = useState(false);
  if (!items || items.length === 0) return null;
  const handleAdd = () => {
    const words = items.map(it => it.word).filter(w => w && AWL_FORM_TO_HW.has(w.toLowerCase()));
    if (words.length === 0) return;
    setState(s => ({...s, priorityWords: [...new Set([...s.priorityWords, ...words])]}));
    setAdded(true);
  };
  return <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:"2px solid var(--honey)",borderRadius:10,padding:"12px 14px",marginTop:14}}>
    <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--honey)",textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
      <span>💡 Word Debt — Words you know but didn't use</span>
      <span style={{color:"var(--ink3)",fontWeight:400,letterSpacing:".04em",textTransform:"none",fontSize:9.5,fontStyle:"italic"}}>— topic-relevant only</span>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:added?0:9}}>
      {items.map((it,i)=>
        <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:6,padding:"6px 10px",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--ink)",fontWeight:500,minWidth:80}}>{it.word}</span>
          <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",letterSpacing:".05em"}}>M{state.mastery?.[it.word]||0}</span>
          <span style={{fontSize:11.5,color:"var(--ink2)",fontStyle:"italic",flex:1,minWidth:120,lineHeight:1.5}}>{it.reason||""}</span>
        </div>
      )}
    </div>
    {!added && <button className="btn bs bsm" onClick={handleAdd}>+ Add {items.length} word{items.length>1?"s":""} to Priority Queue</button>}
    {added && <div className="alert ag mt8" style={{marginBottom:0}}>✓ Added. Go to <strong>Vocab → Priority Boost</strong> to drill them.</div>}
  </div>;
}

function VocabInsightsPanel({insights,state,setState}) {
  const [added,setAdded] = useState(false);
  const handleAdd = () => {
    setState(s => ({...s, priorityWords: [...new Set([...s.priorityWords, ...insights.toAdd])]}));
    setAdded(true);
  };
  return <div className="bridge-panel fu">
    <div className="bridge-h">Vocab <em>Insights</em> ✦</div>
    <div style={{fontSize:11.5,color:"var(--ink3)",marginBottom:14,fontWeight:300}}>
      Found <strong style={{color:"var(--ink2)"}}>{insights.usedWords.length}</strong> AWL words in your essay. LR band: <span style={{color:bandColor(insights.lrBand),fontWeight:600}}>{insights.lrBand}</span>
    </div>
    <div className="cols-2">
      {insights.strong.length>0&&<div>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--leaf)",marginBottom:6}}>✓ Used well (mastery ≥3)</div>
        <div className="chips">{insights.strong.map(w=><span key={w} className="chip cl">{w}<span style={{color:"var(--ink3)",fontSize:9,marginLeft:2}}>M{state.mastery[w]||0}</span></span>)}</div>
      </div>}
      {insights.weak.length>0&&<div>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--honey)",marginBottom:6}}>→ Strengthen (mastery &lt;3)</div>
        <div className="chips">{insights.weak.map(w=><span key={w} className="chip ch">{w}<span style={{color:"var(--ink3)",fontSize:9,marginLeft:2}}>M{state.mastery[w]||0}</span></span>)}</div>
      </div>}
    </div>
    {insights.strong.length===0&&insights.weak.length===0&&<div style={{fontSize:12,color:"var(--ink3)",fontStyle:"italic"}}>No AWL words detected in your essay — try using more academic vocabulary.</div>}
    {insights.suggested.length>0&&<div style={{marginTop:10}}>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--orchid)",marginBottom:6}}>✦ Suggested Task 1 AWL words to learn</div>
      <div className="chips">{insights.suggested.map(w=><span key={w} className="chip co">{w}</span>)}</div>
    </div>}
    {insights.toAdd.length>0&&!added&&<div style={{marginTop:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <button className="btn bl" onClick={handleAdd}>
        + Add {insights.toAdd.length} words to Priority Queue
      </button>
      <span style={{fontSize:11,color:"var(--ink3)"}}>→ Vocab Boost session</span>
    </div>}
    {added&&<div className="alert ag mt8" style={{marginBottom:0}}>✓ {insights.toAdd.length} words added to Priority Queue. Go to <strong>Vocab → Priority Boost</strong> to study them.</div>}
  </div>;
}
