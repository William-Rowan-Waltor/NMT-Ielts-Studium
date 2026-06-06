const TASK2_TYPES = [
  {id:"opinion",label:"Opinion",hint:"Answer agree/disagree or extent questions with a clear position."},
  {id:"discussion",label:"Discussion",hint:"Discuss both views, then give your opinion."},
  {id:"problem_solution",label:"Problem-Solution",hint:"Explain causes or problems, then give specific practical solutions."},
  {id:"two_part",label:"Two-part",hint:"Answer each prompt question directly, usually one body per question."},
  {id:"advantages",label:"Adv vs Disadv",hint:"Cover advantages/disadvantages or evaluate whether one side outweighs the other."},
  {id:"posneg",label:"Pos/Neg Dev",hint:"Evaluate whether a trend is largely positive or negative and give a clear verdict."}
];

const TASK2_TYPE_ALIASES = {
  problem: "problem_solution",
  twopart: "two_part",
  advdis: "advantages",
  positive_negative: "posneg",
  pos_neg: "posneg"
};

function normalizeTask2Type(id) {
  const key = String(id || "opinion");
  return TASK2_TYPE_ALIASES[key] || key;
}

function task2DrillChecks(mode, text, taskType) {
  const value = String(text || "").trim();
  const lower = value.toLowerCase();
  const wordCount = value ? value.split(/\s+/).filter(Boolean).length : 0;
  const sentenceCount = value ? value.split(/[.!?]+/).filter(Boolean).length : 0;
  const hasPosition = /\b(agree|disagree|argue|believe|view|should|must|need|outweigh|positive|negative|benefit|harmful|effective|necessary)\b/.test(lower);
  const hasReason = /\b(because|since|as|therefore|this means|this allows|this leads|due to|result)\b/.test(lower);
  const hasConnector = /\b(however|therefore|moreover|furthermore|in contrast|by contrast|as a result|for this reason|nevertheless|consequently|while|although)\b/.test(lower);
  const mentionsBothSides = /\b(although|while|whereas|both|however|on the other hand)\b/.test(lower);
  const isDiscussion = ["discussion","advantages","posneg"].includes(normalizeTask2Type(taskType));

  if (mode === "topic") {
    return [
      {label:"States one clear body-paragraph claim", ok:wordCount >= 10 && sentenceCount <= 2},
      {label:"Explains a reason, not just an example", ok:hasReason || /\b(can|may|helps|reduces|improves|causes|creates|prevents)\b/.test(lower)},
      {label:"Avoids starting as an example", ok:!/^for example\b/.test(lower)}
    ];
  }

  if (mode === "cohesion") {
    return [
      {label:"Uses a logical connector", ok:hasConnector},
      {label:"Links cause, contrast, or result clearly", ok:hasReason || mentionsBothSides},
      {label:"Works as one transition sentence", ok:wordCount >= 8 && sentenceCount <= 2}
    ];
  }

  return [
    {label:"Gives a direct position", ok:hasPosition},
    {label:"Answers the question type", ok:!isDiscussion || mentionsBothSides || /\b(outweigh|positive|negative)\b/.test(lower)},
    {label:"Short enough for an introduction thesis", ok:wordCount >= 12 && wordCount <= 38 && sentenceCount <= 2}
  ];
}

function Task2MicroDrills({promptText,question,taskType,plan,setPlan}) {
  const [mode,setMode] = useState("thesis");
  const [answer,setAnswer] = useState("");
  const checks = task2DrillChecks(mode, answer, taskType);
  const passed = checks.filter(item=>item.ok).length;
  const hints = [
    question?.taskRequirement,
    question?.topic,
    ...(Array.isArray(question?.ideas) ? question.ideas : []),
    ...(Array.isArray(question?.requirements) ? question.requirements : [])
  ].filter(Boolean).slice(0,3);
  const starters = mode === "thesis"
    ? ["Although this view has merit,", "I believe this approach is", "The advantages outweigh the disadvantages because"]
    : mode === "topic"
      ? ["One major reason is that", "This problem is mainly caused by", "A practical solution would be to"]
      : ["As a result,", "However, this argument is weaker because", "This creates a clear link between"];
  const addToPlan = () => {
    const clean = answer.trim();
    if (!clean) return;
    const label = mode === "thesis" ? "Thesis drill" : mode === "topic" ? "Topic sentence drill" : "Cohesion drill";
    setPlan(`${plan ? `${plan.trim()}\n\n` : ""}${label}: ${clean}`);
  };
  const insertScaffold = () => {
    const scaffold = [
      "Task 2 plan:",
      "Introduction: Paraphrase the issue, then give a direct thesis that answers every part of the question.",
      "Body 1: Topic sentence, reason, specific example, and link back to the question.",
      "Body 2: Topic sentence, reason, specific example, and comparison/contrast if the question requires it.",
      "Conclusion: Restate the position and the main reason without adding a new idea."
    ].join("\n");
    setPlan(`${plan ? `${plan.trim()}\n\n` : ""}${scaffold}`);
  };
  const label = mode === "thesis" ? "Write one thesis sentence" : mode === "topic" ? "Write one body topic sentence" : "Write one linking sentence";
  const placeholder = mode === "thesis"
    ? "Although ..., I believe ..."
    : mode === "topic"
      ? "One major reason is that ..."
      : "As a result, this argument is stronger because ...";

  return <div style={{border:"1px solid var(--border)",borderRadius:8,padding:12,margin:"0 0 14px",background:"color-mix(in srgb, var(--surface) 92%, var(--orchid))"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:10}}>
      <div>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink3)"}}>Task 2 micro-drill</div>
        <div style={{fontSize:12,color:"var(--ink2)",marginTop:3}}>Build the thesis, body claim, and transition before expanding into a full essay.</div>
      </div>
      <div className="mode-toggle" style={{margin:0}}>
        <button className={`mode-btn ${mode==="thesis"?"active":""}`} onClick={()=>setMode("thesis")}>Thesis</button>
        <button className={`mode-btn ${mode==="topic"?"active":""}`} onClick={()=>setMode("topic")}>Topic sentence</button>
        <button className={`mode-btn ${mode==="cohesion"?"active":""}`} onClick={()=>setMode("cohesion")}>Cohesion</button>
      </div>
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {starters.map(starter=><button key={starter} className="btn bg bsm" onClick={()=>setAnswer(prev=>prev.trim()?`${prev.trim()} ${starter}`:starter)}>{starter}</button>)}
      <button className="btn bo bsm" onClick={insertScaffold}>Insert plan scaffold</button>
    </div>
    <div className="field" style={{marginBottom:10}}>
      <div className="field-label">{label}</div>
      <textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={placeholder} style={{minHeight:74}}/>
    </div>
    {hints.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {hints.map((hint,idx)=><span key={idx} className="chip" style={{maxWidth:"100%"}}>{String(hint).slice(0,120)}</span>)}
    </div>}
    {!hints.length&&promptText&&<div className="alert ai" style={{marginBottom:10}}>Use the prompt above: make the sentence answer the exact question, not only the topic.</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginBottom:10}}>
      {checks.map(item=><div key={item.label} style={{fontSize:12,color:item.ok?"var(--leaf)":"var(--ink3)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",background:"var(--surface)"}}>{item.ok?"OK":"Needs work"} - {item.label}</div>)}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span style={{fontSize:12,color:passed===checks.length?"var(--leaf)":"var(--ink3)"}}>{passed}/{checks.length} checks passed</span>
      <button className="btn bo bsm" onClick={addToPlan} disabled={!answer.trim()}>Add to plan</button>
    </div>
  </div>;
}

function Task2EssayChecklist({essay,promptText,taskType}) {
  const text = String(essay || "").trim();
  const lower = text.toLowerCase();
  const prompt = String(promptText || "").toLowerCase();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const paragraphCount = text ? text.split(/\n+/).map(p=>p.trim()).filter(p=>p.split(/\s+/).filter(Boolean).length >= 25).length : 0;
  const needsTwoSides = ["discussion","advantages","posneg"].includes(normalizeTask2Type(taskType)) || /\b(discuss both|advantages?.*disadvantages?|positive.*negative|outweigh)\b/.test(prompt);
  const hasTwoSideLanguage = /\b(although|while|whereas|however|on the other hand|both|in contrast|by contrast|outweigh)\b/.test(lower);
  const checks = [
    {label:"250+ words", ok:wordCount >= 250},
    {label:"Clear thesis or position", ok:/\b(i believe|i argue|this essay argues|agree|disagree|outweigh|positive|negative|should|must)\b/.test(lower)},
    {label:"Required sides covered", ok:!needsTwoSides || hasTwoSideLanguage},
    {label:"Specific support or example", ok:/\b(for example|for instance|such as|a case in point|evidence|study|survey)\b/.test(lower)},
    {label:"Visible paragraphing", ok:paragraphCount >= 3},
    {label:"Conclusion present", ok:/\b(in conclusion|to conclude|overall)\b/.test(lower)}
  ];
  const passed = checks.filter(item=>item.ok).length;

  return <div style={{border:"1px solid var(--border)",borderRadius:8,padding:10,marginTop:8,background:"var(--surface2)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:8}}>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink3)"}}>Pre-submit check</div>
      <div style={{fontSize:12,color:passed===checks.length?"var(--leaf)":"var(--ink3)"}}>{passed}/{checks.length} ready</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:7}}>
      {checks.map(item=><div key={item.label} style={{fontSize:11.5,color:item.ok?"var(--leaf)":"var(--ink3)",border:"1px solid var(--border)",borderRadius:7,padding:"7px 9px",background:"var(--surface)"}}>{item.ok?"OK":"Check"} - {item.label}</div>)}
    </div>
  </div>;
}

function normalizeTask2ExampleCompare(raw) {
  const data = raw && typeof raw==="object" ? raw : {};
  const arr = (v) => Array.isArray(v) ? v.map(x=>String(x||"").trim()).filter(Boolean).slice(0,6) : [];
  const sectionGaps = Array.isArray(data.sectionGaps) ? data.sectionGaps.map((x,i)=>({
    section: String(x?.section || x?.paragraph || `Paragraph ${i+1}`).trim(),
    studentMove: String(x?.studentMove || x?.student || "").trim(),
    exampleMove: String(x?.exampleMove || x?.example || "").trim(),
    missingMove: String(x?.missingMove || x?.gap || x?.missing || "").trim()
  })).filter(x=>x.section || x.missingMove).slice(0,5) : [];
  const drill = data.rewriteDrill && typeof data.rewriteDrill==="object" ? data.rewriteDrill : {};
  return {
    summary: String(data.summary || data.overall || "").trim(),
    sectionGaps,
    missingMoves: arr(data.missingMoves || data.missingScoringMoves),
    strongMatches: arr(data.strongMatches || data.alreadyGood),
    rewriteDrill: {
      title: String(drill.title || "Argument-gap rewrite").trim(),
      instruction: String(drill.instruction || drill.task || "").trim(),
      target: String(drill.target || drill.successCheck || "").trim()
    },
    doNotCopy: String(data.doNotCopy || data.caution || "Use the example to learn argument moves, not sentences to memorise.").trim()
  };
}

function Task2ExampleComparePanel({data,onUseDrill}) {
  if (!data) return null;
  return <div className="card" style={{background:"var(--surface2)",marginTop:12,borderTop:"2px solid var(--leaf)"}}>
    <div className="card-h"><div className="cdot" style={{background:"var(--leaf)"}}/>Compare With My Essay</div>
    {data.summary&&<div className="alert ai" style={{marginBottom:10}}>{data.summary}</div>}
    {data.sectionGaps?.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,marginBottom:10}}>
      {data.sectionGaps.map((gap,i)=><div key={i} style={{border:"1px solid var(--border)",borderLeft:"2px solid var(--leaf)",borderRadius:8,padding:"9px 10px",background:"var(--surface)"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--leaf)",fontWeight:700,marginBottom:5}}>{gap.section}</div>
        {gap.studentMove&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.45,marginBottom:4}}>You: {gap.studentMove}</div>}
        {gap.exampleMove&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.45,marginBottom:4}}>Example: {gap.exampleMove}</div>}
        {gap.missingMove&&<div style={{fontSize:12,color:"var(--ink)",lineHeight:1.5}}>Add: {gap.missingMove}</div>}
      </div>)}
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>
      {data.missingMoves?.length>0&&<div><div className="sl">Missing argument moves</div>{data.missingMoves.map((x,i)=><div key={i} style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:5}}>- {x}</div>)}</div>}
      {data.strongMatches?.length>0&&<div><div className="sl">Already working</div>{data.strongMatches.map((x,i)=><div key={i} style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:5}}>- {x}</div>)}</div>}
    </div>
    {(data.rewriteDrill?.instruction||data.rewriteDrill?.target)&&<div style={{marginTop:10,borderTop:"1px dashed var(--border)",paddingTop:10}}>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"var(--orchid)",marginBottom:5}}>Rewrite drill - {data.rewriteDrill.title}</div>
      {data.rewriteDrill.instruction&&<div style={{fontSize:12.5,color:"var(--ink)",lineHeight:1.55}}>{data.rewriteDrill.instruction}</div>}
      {data.rewriteDrill.target&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5,marginTop:5}}>Target: {data.rewriteDrill.target}</div>}
      {onUseDrill&&<button className="btn bo bsm" style={{marginTop:8}} onClick={()=>onUseDrill(data.rewriteDrill)}>Add drill to plan</button>}
    </div>}
    {data.doNotCopy&&<div style={{fontSize:11,color:"var(--honey)",lineHeight:1.5,marginTop:10}}>{data.doNotCopy}</div>}
  </div>;
}

function Task2Page({state,setState,config,embedded=false}) {
  const savedDraft = state.writingDrafts?.task2 || {};
  const [tab,setTab] = useState(()=>savedDraft.tab || "question");
  const [taskType,setTaskType] = useState(()=>normalizeTask2Type(savedDraft.taskType || "opinion"));
  const [difficulty,setDifficulty] = useState(()=>savedDraft.difficulty || "7.0");
  const [question,setQuestion] = useState(()=>savedDraft.question || null);
  const [promptMode,setPromptMode] = useState(()=>savedDraft.promptMode || "generated");
  const [ownPrompt,setOwnPrompt] = useState(()=>savedDraft.ownPrompt || "");
  const [essay,setEssay] = useState(()=>savedDraft.essay || "");
  const [plan,setPlan] = useState(()=>savedDraft.plan || "");
  const [aiExample,setAiExample] = useState(()=>savedDraft.aiExample || null);
  const [aiStructure,setAiStructure] = useState(()=>savedDraft.aiStructure || null);
  const [aiCompare,setAiCompare] = useState(()=>savedDraft.aiCompare || null);
  const [aiToolLoading,setAiToolLoading] = useState("");
  const [genLoading,setGenLoading] = useState(false);
  const [gradeLoading,setGradeLoading] = useState(false);
  const [gradeResult,setGradeResult] = useState(()=>savedDraft.gradeResult || null);
  const [vocabInsights,setVocabInsights] = useState(()=>savedDraft.vocabInsights || null);
  const [saveMsg,setSaveMsg] = useState("");
  const [showAnnotations,setShowAnnotations] = useState(true);
  const [expandedId,setExpandedId] = useState(null);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const task2Essays = (state.essays||[]).filter(e=>e.taskType==="task2");
  const selectedType = TASK2_TYPES.find(t=>t.id===normalizeTask2Type(taskType)) || TASK2_TYPES[0];
  const targetBand = state.targetBand || 7.0;
  const promptText = promptMode==="generated" ? (question?.prompt || "") : ownPrompt;
  const bandLabel = (value, fallback="?") => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(1) : (value == null || value === "" ? fallback : String(value));
  };

  useEffect(()=>{
    setState(s => ({
      ...s,
      writingDrafts: {
        ...(s.writingDrafts || {}),
        task2: {
          tab,
          taskType,
          difficulty,
          question,
          promptMode,
          ownPrompt,
          essay,
          plan,
          aiExample,
          aiStructure,
          aiCompare,
          gradeResult,
          vocabInsights,
          updatedAt: new Date().toISOString()
        }
      }
    }));
  },[tab,taskType,difficulty,question,promptMode,ownPrompt,essay,plan,aiExample,aiStructure,aiCompare,gradeResult,vocabInsights]);

  const typeLabel = (id) => (TASK2_TYPES.find(t=>t.id===normalizeTask2Type(id))?.label || id || "Task 2");

  const makeTask2Entry = (gradeResultArg=null, vocabInsightsArg=null) => {
    const now = Date.now();
    return {
      id: now.toString(36) + Math.random().toString(36).slice(2,7),
      taskType:"task2",
      task2Type: promptMode==="generated" ? normalizeTask2Type(question?.type || taskType) : "own",
      savedAt: new Date(now).toISOString(),
      date: TODAY(),
      promptText,
      questionData: promptMode==="generated" ? (question || null) : null,
      plan,
      essay,
      wordCount,
      gradeResult: gradeResultArg,
      vocabInsights: vocabInsightsArg,
      aiCompare: aiCompare || null,
      feedbackStyle: state.feedbackStyle || "coach",
      isDraft: !gradeResultArg,
      revisitDue: null,
      revisitedAt: null,
      revisitedFromId: null
    };
  };

  // Find an existing Task 2 essay matching the current prompt — for upsert (1 prompt = 1 record).
  // Skips revisit children so revisits always create new records.
  const findMatchingTask2EssayId = (allEssays) => {
    for (const e of allEssays) {
      if (e.taskType !== "task2") continue;
      if (e.revisitedFromId) continue;
      if (promptMode === "generated") {
        if (question?.prompt && e.questionData?.prompt && e.questionData.prompt === question.prompt) return e.id;
      } else {
        const op = (ownPrompt || "").trim();
        if (op && e.promptText && e.promptText.trim() === op) return e.id;
      }
    }
    return null;
  };

  const saveCurrentEssay = (gradeResultArg=gradeResult, vocabInsightsArg=vocabInsights, auto=false) => {
    if (!essay.trim() || wordCount < 20) {
      if (!auto) setSaveMsg("Too short to save. Write at least 20 words.");
      return null;
    }
    if (!promptText.trim()) {
      if (!auto) setSaveMsg("Add or generate a Task 2 question before saving.");
      return null;
    }
    const entry = makeTask2Entry(gradeResultArg || null, vocabInsightsArg || null);
    const allEssays = state.essays || [];
    const targetId = findMatchingTask2EssayId(allEssays);

    if (targetId) {
      // UPDATE existing record (same prompt = same record)
      setState(s => ({
        ...s,
        essays: (s.essays || []).map(e =>
          e.id === targetId
            ? {
                ...entry,
                id: targetId,
                date: e.date,                         // preserve first-write date
                revisitedFromId: e.revisitedFromId,
                revisitedAt: e.revisitedAt,
                revisitDue: e.revisitDue
              }
            : e
        )
      }));
      setSaveMsg(auto
        ? `Auto-saved (updated existing record, ${entry.wordCount} words).`
        : (gradeResultArg ? "Updated existing Task 2 record with grade." : "Updated existing Task 2 draft."));
      setTimeout(()=>setSaveMsg(""),3500);
      return {...entry, id: targetId};
    } else {
      // INSERT new record
      setState(s=>({...s, essays:[entry, ...(s.essays||[])]}));
      setSaveMsg(auto
        ? `Auto-saved new Task 2 (${entry.wordCount} words).`
        : (gradeResultArg ? "Saved new Task 2 with grade." : "Saved new Task 2 draft."));
      setTimeout(()=>setSaveMsg(""),3500);
      return entry;
    }
  };

  const generateQuestion = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    setGenLoading(true); setQuestion(null); setGradeResult(null); setVocabInsights(null);
    const goalContext = [
      `Target Band ${targetBand}.`,
      state.writingGoal ? `Student writing goal: ${state.writingGoal}` : null,
      state.examDate ? `Exam date: ${state.examDate}` : null
    ].filter(Boolean).join(" ");
    const prompt = `Create one IELTS Academic Writing Task 2 practice question.
Question type: ${selectedType.label} (${selectedType.hint})
Difficulty: Band ${difficulty}
Student context: ${goalContext || "none"}
Quality rules: ${writingGenerationQualityRules("task2")}

Return ONLY valid JSON, no markdown:
{
  "type":"${selectedType.id}",
  "topic":"specific topic area",
  "prompt":"full IELTS Task 2 question, including 'Give reasons for your answer and include any relevant examples...'",
  "requirements":["what the answer must do","second requirement","third requirement"],
  "planningHints":["paragraph 1 focus","paragraph 2 focus","position or example hint"],
  "commonTrap":"one likely mistake students make with this question",
  "expectedPositionOptions":["reasonable position 1","reasonable position 2"],
  "band7MustDo":["answer every part","clear position throughout","develop main ideas with examples"]
}

Make the question realistic, not too broad, and suitable for a 250+ word essay in 40 minutes.`;
    try {
      const raw = await callAPI(config,[{role:"user",content:prompt}],1200);
      const data = safeJSON(raw);
      data.type = normalizeTask2Type(data.type || selectedType.id);
      if (!Array.isArray(data.requirements)) data.requirements = [];
      if (!Array.isArray(data.planningHints)) data.planningHints = [];
      setQuestion(data);
      setPromptMode("generated");
    } catch(e) { alert("Question error: "+e.message); }
    finally { setGenLoading(false); }
  };

  const buildTask2PromptContext = () => `IELTS ACADEMIC WRITING TASK 2 PROMPT CONTEXT
Prompt source: ${promptMode==="generated" ? "Generated in app" : "User-provided"}
Question type: ${typeLabel(question?.type || taskType)}
Question:
${promptText || "(missing)"}

Hidden checklist, if generated:
${question ? JSON.stringify({
  requirements: question.requirements,
  planningHints: question.planningHints,
  commonTrap: question.commonTrap,
  expectedPositionOptions: question.expectedPositionOptions,
  band7MustDo: question.band7MustDo
}, null, 2) : "No hidden checklist. Infer requirements only from the user's pasted question."}`;

  const generateTask2Aid = async (kind) => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    if (!promptText.trim()) { alert("Add or generate a Task 2 question first."); return; }
    setAiToolLoading(kind);
    try {
      const isExample = kind==="example";
      const sys = isExample
        ? `You are an IELTS Writing Task 2 coach. Write one original Band ${difficulty}+ sample answer for the exact prompt as a reference model, not a memorization template. The answer must directly satisfy the question type and all parts. Use explicit blank lines between essay paragraphs: Introduction, Body 1, Body 2, Conclusion. Return ONLY valid JSON.`
        : `You are an IELTS Writing Task 2 coach. Build a practical planning sheet for the exact prompt. Include possible opinions, thesis options, paragraph structure, main ideas, examples, and traps. Return ONLY valid JSON.`;
      const schema = isExample
        ? `{"title":"short title","bandTarget":"Band ${difficulty}+","essay":"full Task 2 sample answer, 270-310 words, with \\n\\n between Introduction, Body 1, Body 2 and Conclusion","wordCount":285,"whyItWorks":["specific reason","how to adapt this without copying"],"usefulPhrases":["short reusable phrase, not a full sentence"],"topicVocabulary":[{"term":"high-score topic term or phrase","use":"why it fits this prompt","example":"short example sentence"}],${WRITING_EXAMPLE_STATEMENTS_FIELD}}`
        : `{"title":"Task 2 opinions and structure","recommendedApproach":"one-sentence recommendation","possibleOpinions":[{"stance":"clear position","thesis":"one-sentence thesis","useWhen":"when this angle fits"}],"mainIdeas":[{"idea":"body idea","example":"specific example"}],"recommendedStructure":[{"paragraph":"Introduction","focus":"what to write"},{"paragraph":"Body 1","focus":"main idea and support"},{"paragraph":"Body 2","focus":"main idea and support"},{"paragraph":"Conclusion","focus":"what to restate"}],"mustMention":["prompt requirement"],"avoid":["common trap"],"languageMoves":["useful phrase or structure"],"topicVocabulary":[{"term":"high-score topic term or phrase","use":"why it fits this prompt","example":"short example sentence"}]}`;
      const raw = await callAPI(config,[
        {role:"system",content:sys},
        {role:"user",content:`${buildTask2PromptContext()}

Student planning notes, if any:
${plan || "(none)"}

Return JSON schema:
${schema}`}
      ], isExample ? 2600 : 1700);
      const data = prepareWritingAidForDisplay(normalizeWritingAidResult(safeJSON(raw), kind), kind, "task2");
      if (isExample) { setAiExample(data); setAiCompare(null); }
      else setAiStructure(data);
    } catch(e) { alert(`${kind==="example" ? "AI Example" : "Opinions & Structures"} error: `+e.message); }
    finally { setAiToolLoading(""); }
  };

  const compareTask2WithExample = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    if (!promptText.trim()) { alert("Add or generate a Task 2 question first."); return; }
    if (!aiExample?.essay) { alert("Generate an AI Example first."); return; }
    if (wordCount < 120) { alert("Write at least 120 words before comparing with the example."); return; }
    setAiToolLoading("compare");
    try {
      const schema = `{"summary":"one specific comparison sentence","sectionGaps":[{"section":"Introduction/Body 1/Body 2/Conclusion","studentMove":"what the student's paragraph does","exampleMove":"what the example does better","missingMove":"the argument move to add"}],"missingMoves":["missing IELTS Task 2 argument/scoring move"],"strongMatches":["move the student already does well"],"rewriteDrill":{"title":"short drill name","instruction":"rewrite one specific part of the student's essay","target":"success check"},"doNotCopy":"one sentence warning not to memorise the model"}`;
      const raw = await callAPI(config,[
        {role:"system",content:"You are an IELTS Writing Task 2 coach. Compare the student's essay with the AI sample answer as a reference checklist, not as text to copy. Focus on prompt coverage, thesis, topic sentences, development, examples, concession, cohesion, and conclusion. Return ONLY valid JSON."},
        {role:"user",content:`${buildTask2PromptContext()}\n\nStudent essay (${wordCount} words):\n${essay}\n\nAI Example:\n${aiExample.essay}\n\nReturn JSON schema:\n${schema}`}
      ], 1900);
      setAiCompare(normalizeTask2ExampleCompare(safeJSON(raw)));
    } catch(e) { alert("Compare with Example error: "+e.message); }
    finally { setAiToolLoading(""); }
  };

  const addTask2CompareDrillToPlan = (drill) => {
    const text = [
      `Compare drill: ${drill?.title || "Rewrite drill"}`,
      drill?.instruction || "",
      drill?.target ? `Target: ${drill.target}` : ""
    ].filter(Boolean).join("\n");
    if (!text.trim()) return;
    setPlan(prev=>`${prev?.trim() ? `${prev.trim()}\n\n` : ""}${text}`);
    setSaveMsg("Compare drill added to Planning notes.");
    setTimeout(()=>setSaveMsg(""),2500);
  };

  const gradeEssay = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    if (!promptText.trim()) { alert("Add or generate a Task 2 question first."); return; }
    if (wordCount < 120) { alert("Task 2 grading needs at least 120 words. Aim for 250+."); return; }
    setGradeLoading(true); setGradeResult(null); setVocabInsights(null);
    const styleMap = {
      coach: "FEEDBACK STYLE = COACH. Encouraging but precise. Explain why each fix matters and give concrete next actions.",
      direct: "FEEDBACK STYLE = DIRECT. Terse, specific, no filler praise. State what to fix.",
      examiner: "FEEDBACK STYLE = EXAMINER. Formal IELTS band-descriptor language, evidence-based and dispassionate."
    };
    const styleInstr = styleMap[state.feedbackStyle||"coach"] || styleMap.coach;
    const masteredAWL = Object.entries(state.mastery||{}).filter(([_,m])=>m>=2).map(([w])=>w).slice(0,80);
    const wordDebtInstr = masteredAWL.length >= 3
      ? `\nUSER MASTERED AWL SAMPLE: ${masteredAWL.join(", ")}\nRecommend 3-5 topic-relevant mastered AWL words that would fit this essay but were not used. Return empty array if none fit.`
      : "\nUser has not mastered enough AWL vocabulary. Return topicRelevantUnusedAWL as an empty array.";
    const l1InterferenceInstr = `\n\nL1 INTERFERENCE CHECK: specifically flag Vietnamese-influenced English only when evidenced in the essay: missing articles, missing -s/-ed, literal word order/calques, "because...so", "although...but", "my family has four people", overusing "very", wrong countability, and unnatural direct translation. Explain the English rule and a natural alternative.`;
    const sys = `You are an expert IELTS examiner. Grade using IELTS Writing Task 2 public band-descriptor concepts.
Score each criterion 5.0-9.0 using half-bands. Overall = average of TR, CC, LR, GRA rounded to the nearest 0.5.

${styleInstr}${wordDebtInstr}${l1InterferenceInstr}

${writingExaminerPromptAddendum("task2")}
${buildMarkingCalibrationText(state)}

Annotation rules: choose 4-8 useful sentences. Copy each sentence verbatim from the essay so highlighting works.`;
    try {
      const userContent = `${buildTask2PromptContext()}

Student planning notes:
${plan || "(none)"}

Grade this essay against the exact prompt above, not as a generic Task 2 response.

ESSAY (${wordCount} words):
${essay}`;
      // Full replacement: route to the local fine-tuned IELTS model when reachable; else cloud.
      let result = null;
      if (await localGraderHealthy(state)) {
        try { result = await gradeWritingLocal(state, "task2", userContent, essay); }
        catch(localErr) { console.warn("[ielts-fighter] local grade failed, falling back to cloud:", localErr.message); }
      }
      if (!result) {
        const raw = await callAPI(config,[{role:"system",content:sys},{role:"user",content:userContent}],3800,0.1);
        result = normalizeWritingExaminerResult(safeJSON(raw),"task2",essay);
      }
      result = await ensureWritingFixResult(config, "task2", buildTask2PromptContext(), essay, result);
      setGradeResult(result);
      const historyEntry = {date:TODAY(),taskType:"task2",questionType:question?.type||taskType,overall:result.overall,tr:result.tr.band,ta:result.tr.band,cc:result.cc.band,lr:result.lr.band,gra:result.gra.band};
      setState(s=>({...s, bandHistory:[...(s.bandHistory||[]), historyEntry]}));
      const awlFound = extractAWLFromEssay(essay);
      const insights = buildVocabInsights(awlFound, state.mastery, result.lr.band);
      setVocabInsights(insights);
      saveCurrentEssay(result, insights, true);
    } catch(e) { alert("Grading error: "+e.message); }
    finally { setGradeLoading(false); }
  };

  const loadEntry = (entry) => {
    setQuestion(entry.questionData || null);
    setPromptMode(entry.questionData ? "generated" : "own");
    setOwnPrompt(entry.questionData ? "" : (entry.promptText || ""));
    setEssay(entry.essay || "");
    setPlan(entry.plan || "");
    setGradeResult(entry.gradeResult || null);
    setVocabInsights(entry.vocabInsights || null);
    setAiCompare(entry.aiCompare || null);
    setTaskType(entry.task2Type && entry.task2Type!=="own" ? normalizeTask2Type(entry.task2Type) : "opinion");
    setTab("write");
    setSaveMsg(`Loaded Task 2 essay from ${entry.date}.`);
    setTimeout(()=>setSaveMsg(""),3000);
  };

  const deleteEntry = (id) => {
    if (!window.confirm("Delete this Task 2 essay from archive?")) return;
    setState(s=>({...s, essays:(s.essays||[]).filter(e=>e.id!==id)}));
    if (expandedId===id) setExpandedId(null);
  };

  const exportTask2 = () => {
    if (!task2Essays.length) return;
    const blob = new Blob([JSON.stringify(task2Essays,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ielts-task2-essays-${TODAY()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderGrade = (result=gradeResult) => {
    if (!result) return null;
    const criteria = [
      {k:"tr",n:"Task Response"},
      {k:"cc",n:"Coherence & Cohesion"},
      {k:"lr",n:"Lexical Resource"},
      {k:"gra",n:"Grammar Range & Accuracy"}
    ];
    return <div className="fu">
      <div className="card mb14">
        <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
          <div className="overall-big" style={{color:bandColor(result.overall)}}>{result.overall?.toFixed?.(1)||result.overall}</div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:5}}>IELTS Writing Task 2 - Overall Band</div>
            <div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6,fontWeight:300,maxWidth:540}}>{result.overallComment}</div>
          </div>
        </div>
      </div>
      <div className="crit-grid">
        {criteria.map(({k,n})=>{
          const d = result[k] || (k==="tr" ? result.ta : null);
          if (!d) return null;
          return <div key={k} className="crit">
            <div className="crit-name">{n}</div>
            <div className="crit-band" style={{color:bandColor(d.band)}}>{d.band?.toFixed?.(1)||d.band}</div>
            <div className="crit-sub">
              {d.strengths?.length>0&&<div><div className="crit-tag" style={{color:"var(--leaf)"}}>Strengths</div><ul>{d.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
              {d.weaknesses?.length>0&&<div><div className="crit-tag" style={{color:"var(--orchid)"}}>Improve</div><ul>{d.weaknesses.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
            </div>
          </div>;
        })}
      </div>
      <div className="cols-2">
        <div className="insight-box win"><div className="insight-h" style={{color:"var(--leaf)"}}>Top Strength</div><p style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,fontWeight:300}}>{result.topStrength}</p></div>
        <div className="insight-box fix"><div className="insight-h" style={{color:"var(--orchid)"}}>Top Priority</div><p style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,fontWeight:300}}>{result.topPriority}</p></div>
      </div>
      <WritingExaminerPanels result={result} taskType="task2"/>
      {(result.thesisCheck||result.ideaDevelopment)&&<div className="card mb14">
        <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Task 2 Checks</div>
        <div className="cols-2" style={{marginBottom:0}}>
          <div><div className="sl">Thesis</div><div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6}}>{result.thesisCheck||"-"}</div></div>
          <div><div className="sl">Idea Development</div><div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6}}>{result.ideaDevelopment||"-"}</div></div>
        </div>
      </div>}
      {result.personalizedDrill&&<div style={{background:"linear-gradient(135deg,color-mix(in srgb, var(--orchid) 11%, var(--surface)),color-mix(in srgb, var(--leaf) 9%, var(--surface)))",border:"1px solid var(--border)",borderRadius:12,padding:16,marginTop:14}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--orchid)",textTransform:"uppercase",marginBottom:8}}>Personalized Drill {result.personalizedDrill.title?`- ${result.personalizedDrill.title}`:""}</div>
        {result.personalizedDrill.instruction&&<div style={{fontSize:13,color:"var(--ink)",lineHeight:1.6,marginBottom:8}}>{result.personalizedDrill.instruction}</div>}
        {result.personalizedDrill.example&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55,paddingTop:8,borderTop:"1px dashed var(--border)",fontStyle:"italic"}}>{result.personalizedDrill.example}</div>}
      </div>}
      {result.annotations&&result.annotations.length>0&&<div className="card" style={{marginTop:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:10}}>
          <div className="card-h" style={{margin:0}}><div className="cdot" style={{background:"var(--sky)"}}/>Line-by-line Feedback</div>
          <div style={{display:"flex",gap:5}}>
            <button className={`btn ${showAnnotations?"bp":"bg"} bsm`} onClick={()=>setShowAnnotations(true)}>Highlighted</button>
            <button className={`btn ${!showAnnotations?"bp":"bg"} bsm`} onClick={()=>setShowAnnotations(false)}>Plain</button>
          </div>
        </div>
        <div style={{background:"var(--bg)",borderRadius:8,padding:"14px 16px",border:"1px solid var(--border)"}}>
          <AnnotatedEssay essay={essay} annotations={result.annotations} showAnnotations={showAnnotations}/>
        </div>
      </div>}
      {result.topicRelevantUnusedAWL&&result.topicRelevantUnusedAWL.length>0&&<WordDebtPanel items={result.topicRelevantUnusedAWL} state={state} setState={setState}/>}
      {vocabInsights&&<VocabInsightsPanel insights={vocabInsights} state={state} setState={setState}/>}
    </div>;
  };

  return <div className={embedded?"fu":"canvas fu"}>
    {!embedded&&<>
      <div className="kicker">AI Tools - Task 2</div>
      <h1 className="title-x">Task 2 <em>Writing</em></h1>
    </>}
    <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:14,flexWrap:"wrap",fontSize:12}}>
      <span><span style={{color:"var(--ink3)"}}>Target</span> <strong>Band {targetBand}</strong></span>
      <span><span style={{color:"var(--ink3)"}}>Word target</span> <strong>250+</strong></span>
      <span><span style={{color:"var(--ink3)"}}>Time</span> <strong>40 min</strong></span>
      <span><span style={{color:"var(--ink3)"}}>Saved</span> <strong>{task2Essays.length}</strong></span>
    </div>
    <div className="mode-toggle">
      <button className={`mode-btn ${tab==="question"?"active":""}`} onClick={()=>setTab("question")}>Generate Question</button>
      <button className={`mode-btn ${tab==="write"?"active":""}`} onClick={()=>setTab("write")}>Write & Grade</button>
      <button className={`mode-btn ${tab==="archive"?"active":""}`} onClick={()=>setTab("archive")}>Task 2 Archive {task2Essays.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:3}}>({task2Essays.length})</span>}</button>
    </div>
    {saveMsg&&<div className="alert ai mb14" style={{marginTop:-4}}>{saveMsg}</div>}

    {tab==="question"&&<div className="fu">
      <div className="card mb14">
        <div className="row-f">
          <div className="field"><div className="field-label">Question Type</div><select value={taskType} onChange={e=>setTaskType(e.target.value)}>{TASK2_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <div className="field"><div className="field-label">Difficulty</div><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{["6.0","6.5","7.0","7.5","8.0","8.5"].map(x=><option key={x} value={x}>Band {x}</option>)}</select></div>
          <button className="btn bp" onClick={generateQuestion} disabled={genLoading}>{genLoading?<><Spinner/> Generating...</>:"Generate"}</button>
        </div>
        <div style={{fontSize:12,color:"var(--ink3)",lineHeight:1.6,marginTop:10}}>{selectedType.hint}</div>
      </div>
      {!config&&<div className="alert aw">No AI configured. Add an API key in Settings.</div>}
      {question&&<div className="card">
        <div className="card-h"><div className="cdot"/>Generated Task 2 Question - {typeLabel(question.type)}</div>
        <div className="prompt-box">{question.prompt}</div>
        <div className="kf-grid">
          {(question.requirements||[]).map((k,i)=><div className="kf" key={i}>{k}</div>)}
        </div>
        {question.planningHints?.length>0&&<div className="card" style={{background:"var(--surface2)",marginBottom:12}}>
          <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Planning Hints</div>
          <ul style={{margin:"0 0 0 18px",padding:0,color:"var(--ink2)",fontSize:12,lineHeight:1.7}}>{question.planningHints.map((h,i)=><li key={i}>{h}</li>)}</ul>
        </div>}
        {question.commonTrap&&<div className="alert aw" style={{marginBottom:12}}>Common trap: {question.commonTrap}</div>}
        <button className="btn bs" onClick={()=>setTab("write")}>Write essay with this question</button>
      </div>}
    </div>}

    {tab==="write"&&<div className="fu">
      {!config&&<div className="alert aw mb14">No AI configured. Go to Settings to add an API key.</div>}
      <div className="card mb14">
        <div className="card-h"><div className="cdot"/>Your Task 2 Essay</div>
        <div className="mode-toggle" style={{marginBottom:12}}>
          <button className={`mode-btn ${promptMode==="generated"?"active":""}`} onClick={()=>setPromptMode("generated")}>Use Generated Question</button>
          <button className={`mode-btn ${promptMode==="own"?"active":""}`} onClick={()=>setPromptMode("own")}>My Own Question</button>
        </div>
        {promptMode==="generated"&&<div className="alert ai" style={{marginBottom:12}}>{question?`Using: ${question.prompt?.slice(0,110)}...`:"No generated Task 2 question yet. Generate one first, or switch to My Own Question."}</div>}
        {promptMode==="own"&&<div className="field"><div className="field-label">Task 2 Question</div><textarea value={ownPrompt} onChange={e=>setOwnPrompt(e.target.value)} placeholder="Paste your IELTS Writing Task 2 question here..." style={{minHeight:90}}/></div>}
        <div className="field"><div className="field-label">Planning notes</div><textarea value={plan} onChange={e=>setPlan(e.target.value)} placeholder="Plan thesis, body idea 1 + example, body idea 2 + example, conclusion..." style={{minHeight:100}}/></div>
        <Task2MicroDrills promptText={promptText} question={promptMode==="generated"?question:null} taskType={taskType} plan={plan} setPlan={setPlan}/>
        <textarea value={essay} onChange={e=>setEssay(e.target.value)} placeholder="Write or paste your IELTS Writing Task 2 essay here... Aim for 250+ words." style={{minHeight:260}}/>
        <div className="word-count-bar" style={{color:wordCount>=250?"var(--leaf)":wordCount>=200?"var(--honey)":"var(--rose)"}}>{wordCount} words{wordCount>0&&wordCount<250?` (need ${250-wordCount} more for exam target)`:""}</div>
        <Task2EssayChecklist essay={essay} promptText={promptText} taskType={taskType}/>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button className="btn bp" onClick={gradeEssay} disabled={gradeLoading||!config||!promptText.trim()}>{gradeLoading?<><Spinner/> Grading...</>:"Grade Task 2"}</button>
          <button className="btn bs" onClick={()=>saveCurrentEssay(gradeResult, vocabInsights, false)} disabled={wordCount<20||!promptText.trim()}>Save{gradeResult?" with grade":" draft"}</button>
          <button className="btn bo" onClick={()=>generateTask2Aid("example")} disabled={!!aiToolLoading||!config||!promptText.trim()}>
            {aiToolLoading==="example"?<><Spinner/> Writing...</>:"AI Example"}
          </button>
          <button className="btn bo" onClick={()=>generateTask2Aid("structure")} disabled={!!aiToolLoading||!config||!promptText.trim()}>
            {aiToolLoading==="structure"?<><Spinner/> Thinking...</>:"Opinions & Structures"}
          </button>
          <button className="btn bg" onClick={compareTask2WithExample} disabled={!!aiToolLoading||!config||!aiExample?.essay||wordCount<120}>
            {aiToolLoading==="compare"?<><Spinner/> Comparing...</>:"Compare with Example"}
          </button>
          {task2Essays.length>0&&<span style={{fontSize:11,color:"var(--ink3)",marginLeft:"auto"}}>{task2Essays.length} Task 2 saved - <span onClick={()=>setTab("archive")} style={{cursor:"pointer",textDecoration:"underline"}}>view archive</span></span>}
        </div>
        <WritingAidPanel kind="structure" data={prepareWritingAidForDisplay(aiStructure,"structure","task2")} taskType="task2" onUsePlan={(text)=>{setPlan(text); setSaveMsg("AI structure copied into Planning notes."); setTimeout(()=>setSaveMsg(""),2500);}}/>
        <WritingAidPanel kind="example" data={prepareWritingAidForDisplay(aiExample,"example","task2")} taskType="task2"/>
        <Task2ExampleComparePanel data={aiCompare} onUseDrill={addTask2CompareDrillToPlan}/>
        <WritingTopicVocabularyPanel items={mergeTopicVocabulary(aiStructure?.topicVocabulary, aiExample?.topicVocabulary)}/>
      </div>
      {gradeResult&&renderGrade(gradeResult)}
    </div>}

    {tab==="archive"&&<div className="fu">
      {task2Essays.length===0
        ? <div className="empty"><div className="empty-icon">T2</div><div style={{fontSize:13,marginBottom:6}}>No Task 2 essays saved yet.</div><div style={{fontSize:11,color:"var(--ink3)"}}>Grade or save a Task 2 essay to build your archive.</div></div>
        : <>
          <div className="card mb14">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div className="card-h" style={{margin:0}}><div className="cdot"/>Task 2 Archive - {task2Essays.length} essays</div>
              <button className="btn bg bsm" onClick={exportTask2}>Export JSON</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {task2Essays.map(e=>{
              const open = expandedId===e.id;
              const band = e.gradeResult?.overall;
              return <div key={e.id} className="card" style={{padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",borderBottom:open?"1px solid var(--border)":"none"}} onClick={()=>setExpandedId(open?null:e.id)}>
                  <div style={{width:44,textAlign:"center",flexShrink:0}}>{band!=null?<div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:bandColor(band),lineHeight:1}}>{bandLabel(band)}</div>:<div style={{fontSize:13,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>DRAFT</div>}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:3}}><span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink2)"}}>{e.date}</span><span className="chip cs" style={{fontSize:9,padding:"1px 7px"}}>{typeLabel(e.task2Type)}</span><span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{e.wordCount}w</span>{!e.gradeResult&&<span className="chip ch" style={{fontSize:9,padding:"1px 7px"}}>DRAFT</span>}</div>
                    <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(e.promptText||"No prompt").slice(0,120)}{(e.promptText||"").length>120?"...":""}</div>
                  </div>
                  <div style={{fontSize:14,color:"var(--ink3)"}}>{open?"v":">"}</div>
                </div>
                {open&&<div style={{padding:"14px 16px",background:"var(--surface2)"}}>
                  <div style={{marginBottom:12}}><div className="sl">Question</div><div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55,fontStyle:"italic"}}>{e.promptText}</div></div>
                  <div style={{marginBottom:12}}><div className="sl">Essay - {e.wordCount} words</div><div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7,fontFamily:"'Fraunces',serif",fontWeight:300,whiteSpace:"pre-wrap",background:"var(--bg)",borderRadius:8,padding:"12px 14px",border:"1px solid var(--border)"}}>{e.essay}</div></div>
                  {e.gradeResult&&<div style={{marginBottom:12}}>{renderGrade(e.gradeResult)}</div>}
                  {e.aiCompare&&<div style={{marginBottom:12}}><Task2ExampleComparePanel data={e.aiCompare}/></div>}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:10,borderTop:"1px dashed var(--border)"}}>
                    <button className="btn bs bsm" onClick={()=>loadEntry(e)}>Load to editor</button>
                    <button className="btn bg bsm" onClick={()=>deleteEntry(e.id)} style={{color:"var(--rose)",marginLeft:"auto"}}>Delete</button>
                  </div>
                </div>}
              </div>;
            })}
          </div>
        </>}
    </div>}

  </div>;
}
