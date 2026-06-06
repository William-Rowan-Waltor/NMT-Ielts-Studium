const IELTS_WRITING_SOURCE_NOTE = "Aligned to public IELTS Writing band-descriptor concepts; not an official IELTS examiner score.";

function writingCriteria(taskType) {
  return taskType==="task2"
    ? [{k:"tr",n:"TR",full:"Task Response"},{k:"cc",n:"CC",full:"Coherence & Cohesion"},{k:"lr",n:"LR",full:"Lexical Resource"},{k:"gra",n:"GRA",full:"Grammatical Range & Accuracy"}]
    : [{k:"ta",n:"TA",full:"Task Achievement"},{k:"cc",n:"CC",full:"Coherence & Cohesion"},{k:"lr",n:"LR",full:"Lexical Resource"},{k:"gra",n:"GRA",full:"Grammatical Range & Accuracy"}];
}

function criterionBand(result, key) {
  if (!result) return null;
  const item = result[key] || (key==="tr" ? result.ta : null);
  return item?.band ?? null;
}

function normalizeCriterion(value) {
  const v = value && typeof value==="object" ? value : {};
  return {
    band: Number(v.band)||0,
    strengths: Array.isArray(v.strengths) ? v.strengths : [],
    weaknesses: Array.isArray(v.weaknesses) ? v.weaknesses : [],
    evidence: Array.isArray(v.evidence) ? v.evidence : [],
    whyNotHigher: v.whyNotHigher || v.why_not_higher || ""
  };
}

function roundWritingBand(n) {
  return Math.round((Number(n)||0)*2)/2;
}

function normalizeMistakeCorrections(items) {
  if (!Array.isArray(items)) return [];
  return items.map(x=>{
    if (typeof x==="string") return {original:"",fixed:"",issue:"Correction",explanation:x};
    return {
      original: String(x?.original || x?.before || x?.error || "").trim(),
      fixed: String(x?.fixed || x?.after || x?.correction || "").trim(),
      issue: String(x?.issue || x?.type || x?.category || "Correction").trim(),
      explanation: String(x?.explanation || x?.why || x?.comment || "").trim()
    };
  }).filter(x=>x.original || x.fixed || x.explanation);
}

function examinerScoreSummary(result, taskType) {
  const a = result?.examinerA?.overall ?? result?.examinerA?.band;
  const b = result?.examinerB?.overall ?? result?.examinerB?.band;
  const final = result?.overall;
  const nums = [a,b,final].filter(x=>Number.isFinite(Number(x))).map(Number);
  if (!nums.length) return null;
  const low = roundWritingBand(Math.min(...nums));
  const high = roundWritingBand(Math.max(...nums));
  const spread = high - low;
  return {
    low, high, spread,
    label: spread <= .5 ? "High confidence" : spread <= 1 ? "Moderate confidence" : "Low confidence",
    note: taskType==="task2" ? "Task 2 score is still weighted twice in full Writing." : "Task 1 contributes one third of the full Writing score."
  };
}

function defaultTaskAudit(taskType, wordCount) {
  if (taskType==="task2") {
    return [
      {label:"All parts answered",status:"review",note:"Check whether each part of the prompt is explicitly addressed."},
      {label:"Clear position",status:"review",note:"Position should remain stable from introduction to conclusion."},
      {label:"Ideas developed",status:"review",note:"Body paragraphs need explanation plus relevant examples."},
      {label:"Word count",status:wordCount>=250?"pass":"warning",note:wordCount>=250?"Meets the 250+ word target.":"Below the 250-word exam target."}
    ];
  }
  return [
    {label:"Overview present",status:"review",note:"Task 1 needs a clear overall summary of main trends/features."},
    {label:"Key features selected",status:"review",note:"Do not describe every number; choose the most important comparisons."},
    {label:"Data accuracy",status:"review",note:"Figures and units should match the visual exactly."},
    {label:"Word count",status:wordCount>=150?"pass":"warning",note:wordCount>=150?"Meets the 150+ word target.":"Below the 150-word exam target."}
  ];
}

// — Precise mistakes: categories + deterministic detector + model-mistake normaliser —
const MISTAKE_CATS = {
  logic:       {label:"Weak logic between ideas", color:"var(--rose)"},
  cohesion:    {label:"Cohesion / linking",       color:"var(--honey)"},
  evidence:    {label:"Weak evidence / example",  color:"var(--honey)"},
  explanation: {label:"Unclear explanation",      color:"var(--sky)"},
  vocabulary:  {label:"Low lexical sophistication",color:"var(--orchid)"},
  collocation: {label:"Unnatural collocation / misused word",color:"var(--orchid)"},
  repetition:  {label:"Repeated wording",         color:"var(--honey)"},
  grammar:     {label:"Grammar",                  color:"var(--rose)"},
  coherence:   {label:"Incoherent / hard to follow",color:"var(--rose)"}
};
const _MISTAKE_STOPWORDS = new Set("the a an and or but so to of in on at for with as is are was were be been being it its this that these those i you he she they we my your his her their our me him them us do does did have has had will would can could should may might must not no nor than then there here which who whom whose what when where why how all any some such only own same too very just more most much many few also into from out about over under again because however therefore thus moreover furthermore".split(/\s+/));
function _mistakeCategory(c) {
  c = String(c||"").toLowerCase().trim();
  if (MISTAKE_CATS[c]) return c;
  if (/cohes|link|connect|transition|signpost/.test(c)) return "cohesion";
  if (/logic|reason|argu|contradict/.test(c)) return "logic";
  if (/evidence|example|support|develop|elaborat/.test(c)) return "evidence";
  if (/explain|explanation|clarity|unclear|vague|ambigu/.test(c)) return "explanation";
  if (/colloc|word\s*pairing|unnatural|misused|wrong word|awkward phras/.test(c)) return "collocation";
  if (/vocab|lexical|word choice|sophistic|simplistic|basic word/.test(c)) return "vocabulary";
  if (/repeat|repetit|overus/.test(c)) return "repetition";
  if (/gramm|tense|article|agreement|punctuat|spelling/.test(c)) return "grammar";
  if (/coheren|flow|confus|hard to follow|disjoint/.test(c)) return "coherence";
  return "explanation";
}
// Deterministic, AI-free checks: overused words, repeated sentence openers, run-on sentences.
function detectMechanicalIssues(essay) {
  const text = String(essay||"");
  const words = text.toLowerCase().match(/[a-z][a-z'-]*/g) || [];
  const total = words.length;
  const freq = {};
  for (const w of words) { if (w.length < 4 || _MISTAKE_STOPWORDS.has(w)) continue; freq[w] = (freq[w]||0)+1; }
  const threshold = total > 220 ? 5 : 4;
  const repeatedWords = Object.entries(freq).filter(([,c])=>c>=threshold).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([word,count])=>({word,count}));
  const sentences = text.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
  const openerCount = {};
  sentences.forEach(s=>{ const m=s.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)/); if(m){ const k=m[1].toLowerCase(); openerCount[k]=(openerCount[k]||0)+1; } });
  const repeatedOpeners = Object.entries(openerCount).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([opener,count])=>({opener,count}));
  const longSentences = sentences.filter(s=>(s.match(/[a-z][a-z'-]*/gi)||[]).length>=45).slice(0,3).map(s=>s.length>90?s.slice(0,90)+"…":s);
  return { repeatedWords, repeatedOpeners, longSentences, wordCount: total };
}
function normalizeMistakes(raw, essay) {
  const arr = Array.isArray(raw) ? raw : [];
  const text = String(essay||"");
  const out = [];
  for (const m of arr) {
    if (!m) continue;
    const quote = String(m.quote||m.sentence||m.text||"").trim();
    if (!quote) continue;
    const ql = quote.toLowerCase();
    // Drop template/placeholder echoes (the model sometimes parrots the format example).
    if (quote.startsWith("<") || ql.includes("exact words") || ql.includes("copied from the essay") || ql.includes("words copied") || ql==="quote" || ql==="exact sentence") continue;
    let fix = String(m.fix||m.suggestion||m.comment||m.why||"").trim();
    if (fix.startsWith("<") || /^short fix$/i.test(fix)) fix = "";
    out.push({
      category: _mistakeCategory(m.category||m.tag||m.type),
      quote: quote.slice(0,220),
      fix: fix.slice(0,220),
      inEssay: text ? text.includes(quote.slice(0,40)) : false
    });
    if (out.length >= 10) break;
  }
  return out;
}

function normalizeWritingExaminerResult(raw, taskType, essay) {
  const result = raw?.final && typeof raw.final==="object" ? {...raw.final, ...raw, final:raw.final} : {...(raw||{})};
  const criteria = writingCriteria(taskType);
  criteria.forEach(({k})=>{
    const source = result[k] || (k==="tr" ? result.ta : null);
    result[k] = normalizeCriterion(source);
  });
  if (taskType==="task2") result.ta = result.tr;
  if (!result.overall) {
    result.overall = roundWritingBand(criteria.reduce((sum,c)=>sum+(Number(result[c.k]?.band)||0),0)/4);
  } else result.overall = roundWritingBand(result.overall);
  if (!result.overallComment) result.overallComment = "Estimated band based on IELTS public descriptor concepts.";
  if (!result.topPriority) result.topPriority = "Improve the weakest criterion with a focused rewrite.";
  if (!result.topStrength) result.topStrength = "Review the criterion breakdown for the strongest feature.";
  if (!Array.isArray(result.annotations)) result.annotations = [];
  result.annotations = result.annotations.filter(a=>a && a.sentence && essay.includes(a.sentence));
  // Precise mistakes: model-reported list (preferred) → fall back to error/improve annotations.
  result.mistakes = normalizeMistakes(result.mistakes, essay);
  if (!result.mistakes.length) {
    result.mistakes = result.annotations
      .filter(a=>a.tag==="error"||a.tag==="improve")
      .slice(0,6)
      .map(a=>({category:a.tag==="error"?"grammar":"explanation", quote:String(a.sentence).slice(0,220), fix:String(a.comment||"").slice(0,220), inEssay:true}));
  }
  result.mechanicalIssues = detectMechanicalIssues(essay);
  result.fixedEssay = typeof result.fixedEssay==="string" ? enforceWritingEssayParagraphs(result.fixedEssay, taskType) : "";
  result.fixedEssayError = result.fixedEssayError || "";
  result.mistakeCorrections = normalizeMistakeCorrections(result.mistakeCorrections || result.corrections || result.fixedEssayCorrections);
  if (!Array.isArray(result.topicRelevantUnusedAWL)) result.topicRelevantUnusedAWL = [];
  if (!result.promptFit || typeof result.promptFit!=="object") result.promptFit = {};
  result.promptFit = {
    summary: result.promptFit.summary || "Prompt alignment was not returned by the examiner.",
    covered: Array.isArray(result.promptFit.covered) ? result.promptFit.covered : [],
    missing: Array.isArray(result.promptFit.missing) ? result.promptFit.missing : [],
    offTopic: Array.isArray(result.promptFit.offTopic) ? result.promptFit.offTopic : [],
    scoreImpact: result.promptFit.scoreImpact || ""
  };
  { const mr = result.memorisedRisk && typeof result.memorisedRisk==="object" ? result.memorisedRisk : {};
    const lvl = String(mr.level||"").toLowerCase();
    result.memorisedRisk = {
      level: (lvl==="high"||lvl==="medium"||lvl==="low") ? lvl : "low",
      signals: Array.isArray(mr.signals) ? mr.signals.filter(Boolean).slice(0,6) : [],
      note: mr.note || ""
    };
  }
  if (!Array.isArray(result.taskAudit)) result.taskAudit = defaultTaskAudit(taskType, essay.trim().split(/\s+/).filter(Boolean).length);
  if (!result.band7GapDrill || typeof result.band7GapDrill!=="object") {
    result.band7GapDrill = {
      title:"Band 7 gap rewrite",
      targetCriterion:criteria.sort((a,b)=>(result[a.k]?.band||0)-(result[b.k]?.band||0))[0]?.full || "weakest criterion",
      instruction:"Rewrite the weakest paragraph once, focusing only on the criterion with the lowest band.",
      successCheck:"The rewritten version should be clearer, more specific, and easier to score at Band 7."
    };
  }
  result.confidence = result.confidence || examinerScoreSummary(result, taskType);
  result.sourceNote = result.sourceNote || IELTS_WRITING_SOURCE_NOTE;
  return result;
}

async function ensureWritingFixResult(config, taskType, promptContext, essay, result) {
  if (!config || !essay?.trim() || (result?.fixedEssay && result?.mistakeCorrections?.length)) return result;
  const kind = taskType==="task2" ? "Task 2 essay" : "Task 1 report";
  const argLevel = taskType==="task2"
    ? " Work at the ARGUMENT level, not just grammar: ensure a clear thesis/position, one focused topic sentence per body paragraph, developed support/examples, a brief concession where useful, and a conclusion that restates the position — but KEEP the student's own position and ideas (do not swap in a different opinion or a memorised model answer)."
    : " Keep it at the reporting level: clear overview of the main trends/features, accurate data support and comparisons; do not invent figures the student didn't use.";
  try {
    const raw = await callAPI(config,[
      {role:"system",content:`You are an IELTS writing correction coach. Create a corrected version of the student's ${kind} after grading. Preserve the student's intended meaning and position; fix grammar, word choice, cohesion, and unclear phrasing.${argLevel} Do not write a totally different essay. Return ONLY valid JSON.`},
      {role:"user",content:`PROMPT CONTEXT:
${promptContext}

EXAMINER RESULT SUMMARY:
Overall ${result?.overall || "unknown"}; top priority: ${result?.topPriority || "unknown"}.

STUDENT ESSAY:
${essay}

Return this JSON:
{"fixedEssay":"full corrected essay preserving the student's meaning, with \\n\\n between paragraphs (intro / body paragraphs / conclusion or overview)","mistakeCorrections":[{"original":"exact problematic phrase or sentence","fixed":"corrected version","issue":"grammar|vocabulary|cohesion|task response","explanation":"why this fix is better"}]}`}
    ],2200,0.1);
    const fix = safeJSON(raw);
    return normalizeWritingExaminerResult({...result,...fix},taskType,essay);
  } catch(e) {
    return normalizeWritingExaminerResult({...result,fixedEssayError:e.message},taskType,essay);
  }
}

function writingExaminerPromptAddendum(taskType) {
  const first = taskType==="task2" ? "tr" : "ta";
  const firstName = taskType==="task2" ? "Task Response" : "Task Achievement";
  const auditFocus = taskType==="task2"
    ? "all parts answered, position clarity, idea development, paragraph focus, word count"
    : "overview, key feature selection, accurate data support, comparisons, word count";
  const promptAnchor = taskType==="task2"
    ? "Task Response must be scored by comparing the essay with the exact question: answer type, all question parts, position, relevance, and idea development. Penalize generic memorised essays, missing parts, unclear position, or examples that do not support the prompt."
    : "Task Achievement must be scored by comparing the essay with the exact Task 1 prompt and visual context. Check overview, key feature selection, comparisons, data accuracy, units, and whether the essay invents or omits important information. If the student supplied only a text prompt without data, state that limitation clearly instead of guessing hidden figures.";
  return `Use public IELTS Writing band-descriptor concepts. Be conservative: if evidence is mixed, choose the lower plausible half-band.
Run TWO independent examiner passes internally:
- examinerA = strict examiner
- examinerB = standard examiner
Then produce final criterion scores.

For each criterion, include strengths, weaknesses, evidence from the essay, and whyNotHigher.
Lexical Resource rule: reward natural, accurate collocations — NOT rare words. Explicitly flag unnatural collocations and sophisticated/rare words used in the wrong context (e.g. "make a research", "do a mistake", "a plethora of problem"). Do NOT raise the LR band for ambitious vocabulary that is misused; misuse should lower it. Put each such error in mistakes[] with category "collocation".
Prompt-anchored scoring rule: ${promptAnchor}
Task audit focus: ${auditFocus}.
Fixed essay rule: include a corrected essay that preserves the student's meaning and indicates the most important mistakes. Separate paragraphs with \\n\\n (intro / body paragraphs / conclusion or overview). Do not replace the student's ideas with a memorised model answer.
Memorised/template detection: judge whether the essay looks pre-memorised or template-driven rather than a genuine response to THIS prompt — signals include generic essay-bank phrasing, an introduction/conclusion that ignores the exact question wording, padding sentences with no content, examples that fit any topic, and over-rehearsed linking. Report memorisedRisk.level = low|medium|high with concrete signals and a one-line note. High/medium memorised content should NOT be rewarded in Task Response.

Return ONLY valid JSON:
{"examinerA":{"overall":6.5,"${first}":6.5,"cc":6.5,"lr":6.5,"gra":6.5,"summary":"strict score rationale"},"examinerB":{"overall":7.0,"${first}":7.0,"cc":7.0,"lr":7.0,"gra":7.0,"summary":"standard score rationale"},"${first}":{"band":7.0,"strengths":["specific"],"weaknesses":["specific"],"evidence":["short quoted evidence"],"whyNotHigher":"why this is not a higher band for ${firstName}"},"cc":{"band":7.0,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"lr":{"band":7.0,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"gra":{"band":7.0,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"overall":7.0,"overallComment":"2-3 sentence examiner-style assessment","promptFit":{"summary":"how well the essay answers this exact prompt","covered":["prompt demand covered"],"missing":["prompt demand missing or weak"],"offTopic":["irrelevant or memorised content"],"scoreImpact":"how prompt fit affected ${firstName}"},"taskAudit":[{"label":"audit item","status":"pass|warning|fail","note":"specific evidence"}],"memorisedRisk":{"level":"low|medium|high","signals":["concrete sign this looks memorised/template, or empty if genuine"],"note":"one line on whether this reads as a genuine answer to THIS prompt"},"topPriority":"single highest-impact fix","topStrength":"strongest scoring feature","band7GapDrill":{"title":"short drill name","targetCriterion":"criterion name","instruction":"10-minute rewrite task","successCheck":"how the student knows it improved"},"personalizedDrill":{"title":"short drill name","instruction":"10-minute exercise","example":"short worked example under 30 words"},"fixedEssay":"full corrected essay preserving the student's meaning, with \\n\\n between paragraphs","mistakeCorrections":[{"original":"exact problematic phrase or sentence","fixed":"corrected version","issue":"grammar|vocabulary|cohesion|task response","explanation":"why this fix is better"}],"topicRelevantUnusedAWL":[{"word":"policy","reason":"fits the topic"}],"mistakes":[{"category":"logic|cohesion|evidence|explanation|vocabulary|collocation|repetition|grammar|coherence","quote":"EXACT words copied from the essay","fix":"short concrete fix"}],"annotations":[{"sentence":"EXACT sentence copied from essay","tag":"strong|improve|error","comment":"under 15 words"}]}`;
}

function normalizeTopicVocabulary(items) {
  if (!Array.isArray(items)) return [];
  return items.map(x=>{
    if (typeof x==="string") return {term:x,use:"",example:""};
    return {
      term: String(x?.term || x?.word || x?.phrase || "").trim(),
      use: String(x?.use || x?.meaning || x?.reason || x?.function || "").trim(),
      example: String(x?.example || x?.sentence || "").trim()
    };
  }).filter(x=>x.term);
}

function normalizeWritingAidResult(raw, kind) {
  const data = raw && typeof raw==="object" ? raw : {};
  if (kind==="example") {
    return {
      title: data.title || "AI sample answer",
      essay: data.essay || data.answer || "",
      bandTarget: data.bandTarget || data.targetBand || "",
      wordCount: Number(data.wordCount) || (data.essay ? String(data.essay).trim().split(/\s+/).filter(Boolean).length : 0),
      whyItWorks: Array.isArray(data.whyItWorks) ? data.whyItWorks : [],
      usefulPhrases: Array.isArray(data.usefulPhrases) ? data.usefulPhrases : [],
      topicVocabulary: normalizeTopicVocabulary(data.topicVocabulary || data.highScoreTerms || data.topicTerms),
      statements: normalizeWritingExampleStatements(data.statements || data.reasoning || data.thinking)
    };
  }
  return {
    title: data.title || "Opinions & Structures",
    recommendedApproach: data.recommendedApproach || data.recommended_approach || "",
    possibleOpinions: Array.isArray(data.possibleOpinions) ? data.possibleOpinions : [],
    overviewOptions: Array.isArray(data.overviewOptions) ? data.overviewOptions : [],
    mainIdeas: Array.isArray(data.mainIdeas) ? data.mainIdeas : [],
    recommendedStructure: Array.isArray(data.recommendedStructure) ? data.recommendedStructure : [],
    mustMention: Array.isArray(data.mustMention) ? data.mustMention : [],
    avoid: Array.isArray(data.avoid) ? data.avoid : [],
    languageMoves: Array.isArray(data.languageMoves) ? data.languageMoves : [],
    topicVocabulary: normalizeTopicVocabulary(data.topicVocabulary || data.highScoreTerms || data.topicTerms)
  };
}

function formatWritingAidPlan(data, taskType) {
  if (!data) return "";
  const lines = [];
  lines.push(`${taskType==="task2" ? "Task 2" : "Task 1"} plan: ${data.title || "Opinions & Structures"}`);
  if (data.recommendedApproach) lines.push(`\nApproach: ${data.recommendedApproach}`);
  if (data.overviewOptions?.length) lines.push(`\nOverview options:\n${data.overviewOptions.map((x,i)=>`${i+1}. ${x}`).join("\n")}`);
  if (data.possibleOpinions?.length) {
    lines.push("\nPossible opinions:");
    data.possibleOpinions.forEach((op,i)=>{
      const stance = typeof op==="string" ? op : (op.stance || op.position || `Option ${i+1}`);
      const thesis = typeof op==="string" ? "" : (op.thesis || "");
      lines.push(`${i+1}. ${stance}${thesis ? ` - Thesis: ${thesis}` : ""}`);
    });
  }
  if (data.mainIdeas?.length) lines.push(`\nMain ideas:\n${data.mainIdeas.map((x,i)=>`${i+1}. ${typeof x==="string" ? x : (x.idea || x.point || JSON.stringify(x))}`).join("\n")}`);
  if (data.recommendedStructure?.length) {
    lines.push("\nStructure:");
    data.recommendedStructure.forEach((p,i)=>{
      const name = p.paragraph || p.name || `Paragraph ${i+1}`;
      const focus = p.focus || p.keyPoint || p.content || "";
      lines.push(`${name}: ${focus}`);
    });
  }
  if (data.mustMention?.length) lines.push(`\nMust mention:\n${data.mustMention.map(x=>`- ${x}`).join("\n")}`);
  if (data.languageMoves?.length) lines.push(`\nUseful language moves:\n${data.languageMoves.map(x=>`- ${x}`).join("\n")}`);
  if (data.topicVocabulary?.length) lines.push(`\nHigh-score topic vocabulary:\n${data.topicVocabulary.map(x=>`- ${x.term}${x.use ? `: ${x.use}` : ""}${x.example ? ` (e.g. ${x.example})` : ""}`).join("\n")}`);
  if (data.avoid?.length) lines.push(`\nAvoid:\n${data.avoid.map(x=>`- ${x}`).join("\n")}`);
  return lines.join("\n");
}

function mergeTopicVocabulary(...sources) {
  const seen = new Set();
  const out = [];
  sources.flat().filter(Boolean).forEach(item=>{
    const v = typeof item==="string" ? {term:item,use:"",example:""} : item;
    const term = String(v.term || v.word || v.phrase || "").trim();
    if (!term) return;
    const key = term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      term,
      use: String(v.use || v.meaning || v.reason || v.function || "").trim(),
      example: String(v.example || v.sentence || "").trim()
    });
  });
  return out;
}

function WritingTopicVocabularyPanel({items}) {
  const vocab = mergeTopicVocabulary(items || []);
  if (!vocab.length) return null;
  return <div className="card" style={{background:"var(--surface2)",marginTop:12,borderTop:"2px solid var(--orchid)"}}>
    <div className="card-h"><div className="cdot" style={{background:"var(--orchid)"}}/>High-score Topic Vocabulary</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>
      {vocab.map((v,i)=><div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderLeft:"2px solid var(--orchid)",borderRadius:8,padding:"9px 10px"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--orchid)",fontWeight:700,marginBottom:3}}>{v.term}</div>
        {v.use&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.45}}>{v.use}</div>}
        {v.example&&<div style={{fontSize:11,color:"var(--ink3)",lineHeight:1.45,marginTop:4,fontStyle:"italic"}}>{v.example}</div>}
      </div>)}
    </div>
  </div>;
}

function WritingAidPanel({kind,data,taskType,onUseEssay,onUsePlan}) {
  if (!data) return null;
  const isExample = kind==="example";
  const accent = isExample ? "var(--orchid)" : "var(--sky)";
  return <div className="card" style={{background:"var(--surface2)",marginTop:12,borderTop:`2px solid ${accent}`}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:10}}>
      <div className="card-h" style={{margin:0}}><div className="cdot" style={{background:accent}}/>{isExample ? "AI Example" : "Opinions & Structures"}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {isExample && data.essay && onUseEssay && <button className="btn bg bsm" onClick={()=>onUseEssay(data.essay)}>Use as essay</button>}
        {!isExample && onUsePlan && <button className="btn bg bsm" onClick={()=>onUsePlan(formatWritingAidPlan(data,taskType))}>Use as plan</button>}
      </div>
    </div>
    <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",marginBottom:8}}>{data.title}</div>
    {isExample ? <>
      <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",marginBottom:10}}>{data.bandTarget ? `Target: ${data.bandTarget} - ` : ""}{data.wordCount || 0} words{data.statements?.length ? " · tap a sentence to see the AI's thinking" : ""}</div>
      {data.statements?.length
        ? <WritingExampleReasoning essay={data.essay} statements={data.statements} accent={accent}/>
        : <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderLeft:`2px solid ${accent}`,borderRadius:8,padding:"12px 14px"}}>
            <WritingParagraphs text={data.essay} style={{fontSize:13,color:"var(--ink)",lineHeight:1.75,fontFamily:"'Fraunces',serif",fontWeight:300}}/>
          </div>}
      {data.whyItWorks?.length>0&&<div style={{marginTop:10,fontSize:12,color:"var(--ink2)",lineHeight:1.6}}><strong>Why it works:</strong> {data.whyItWorks.join("; ")}</div>}
      {data.usefulPhrases?.length>0&&<div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>{data.usefulPhrases.map((p,i)=><span key={i} className="chip cs">{p}</span>)}</div>}
    </> : <>
      {data.recommendedApproach&&<div className="alert ai" style={{marginBottom:10}}>{data.recommendedApproach}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
        {data.possibleOpinions?.length>0&&<div><div className="sl">Possible opinions</div>{data.possibleOpinions.map((op,i)=><div key={i} style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:6}}>{typeof op==="string" ? op : <><strong>{op.stance || op.position || `Option ${i+1}`}:</strong> {op.thesis || op.useWhen || ""}</>}</div>)}</div>}
        {data.overviewOptions?.length>0&&<div><div className="sl">Overview options</div>{data.overviewOptions.map((x,i)=><div key={i} style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:6}}>{x}</div>)}</div>}
        {data.mainIdeas?.length>0&&<div><div className="sl">Main ideas</div>{data.mainIdeas.map((x,i)=><div key={i} style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:6}}>{typeof x==="string" ? x : (x.idea || x.point || JSON.stringify(x))}</div>)}</div>}
        {data.recommendedStructure?.length>0&&<div><div className="sl">Structure</div>{data.recommendedStructure.map((p,i)=><div key={i} style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:6}}><strong>{p.paragraph || p.name || `Paragraph ${i+1}`}:</strong> {p.focus || p.keyPoint || p.content || ""}</div>)}</div>}
      </div>
      {data.mustMention?.length>0&&<div style={{marginTop:10}}><div className="sl">Must mention</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{data.mustMention.map((x,i)=><span key={i} className="chip ch">{x}</span>)}</div></div>}
      {data.avoid?.length>0&&<div style={{marginTop:10,fontSize:12,color:"var(--honey)",lineHeight:1.6}}><strong>Avoid:</strong> {data.avoid.join("; ")}</div>}
      {data.languageMoves?.length>0&&<div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>{data.languageMoves.map((p,i)=><span key={i} className="chip cs">{p}</span>)}</div>}
    </>}
  </div>;
}

function writingGenerationQualityRules(taskType) {
  if (taskType==="task2") {
    return `Make the Task 2 question realistic for IELTS Academic: answerable in 40 minutes, not overly broad, and with a clear question type.
Include hidden assessment fields: requirements, planningHints, commonTrap, expectedPositionOptions, and band7MustDo.
Avoid copyrighted or official IELTS/Cambridge wording. Generate an original IELTS-style question.`;
  }
  return `Make the Task 1 data realistic for IELTS Academic: clear main trend, one secondary trend, one exception or contrast, and enough data for comparisons.
Include hidden assessment fields: keyFeatures, expectedOverview, mustMention, commonTrap, and band7MustDo.
Avoid copyrighted or official IELTS/Cambridge wording. Generate original IELTS-style data.`;
}

function FixedEssayPanel({result}) {
  if (!result?.fixedEssay && !result?.mistakeCorrections?.length && !result?.fixedEssayError) return null;
  return <div className="card">
    <div className="card-h"><div className="cdot" style={{background:"var(--orchid)"}}/>Fixed Essay</div>
    {result.fixedEssay
      ? <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:"2px solid var(--orchid)",borderRadius:8,padding:"12px 14px"}}>
          <WritingParagraphs text={result.fixedEssay} style={{fontSize:13,color:"var(--ink)",lineHeight:1.75,fontFamily:"'Fraunces',serif",fontWeight:300}}/>
        </div>
      : <div className="alert aw" style={{marginBottom:0}}>Could not generate a fixed essay: {result.fixedEssayError}</div>}
    {result.mistakeCorrections?.length>0&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
      {result.mistakeCorrections.map((m,i)=><div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 11px"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".09em",textTransform:"uppercase",color:"var(--orchid)",marginBottom:6}}>{m.issue || "Correction"}</div>
        {(m.original||m.fixed)&&<div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.6,marginBottom:6}}>
          {m.original&&<><span style={{color:"var(--rose)",textDecoration:"line-through"}}>{m.original}</span>{m.fixed&&<span style={{color:"var(--ink3)"}}> → </span>}</>}
          {m.fixed&&<span style={{color:"var(--leaf)"}}>{m.fixed}</span>}
        </div>}
        {m.explanation&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>{m.explanation}</div>}
      </div>)}
    </div>}
  </div>;
}

function PreciseMistakesPanel({result}) {
  const mistakes = Array.isArray(result?.mistakes) ? result.mistakes : [];
  const mech = result?.mechanicalIssues || {};
  const repeatedWords = mech.repeatedWords || [];
  const repeatedOpeners = mech.repeatedOpeners || [];
  const longSentences = mech.longSentences || [];
  if (!mistakes.length && !repeatedWords.length && !repeatedOpeners.length && !longSentences.length) return null;
  const groups = {};
  mistakes.forEach(m=>{ (groups[m.category] = groups[m.category] || []).push(m); });
  const orderedCats = Object.keys(MISTAKE_CATS).filter(c=>groups[c]);
  return <div className="card">
    <div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Precise Mistakes</div>
    <div style={{fontSize:11,color:"var(--ink3)",marginBottom:10,lineHeight:1.5}}>Specific issues tied to the exact text, grouped by type. Repetition checks are computed directly from your essay.</div>
    {orderedCats.map(cat=>{
      const meta = MISTAKE_CATS[cat];
      return <div key={cat} style={{marginBottom:11}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
          <span style={{width:8,height:8,borderRadius:2,background:meta.color,flexShrink:0}}/>
          <span style={{fontSize:12,color:"var(--ink)",fontWeight:600}}>{meta.label}</span>
          <span style={{fontSize:10,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>{groups[cat].length}</span>
        </div>
        {groups[cat].map((m,i)=><div key={i} style={{borderLeft:`2px solid ${meta.color}`,background:"var(--surface2)",borderRadius:"0 7px 7px 0",padding:"7px 10px",marginBottom:6}}>
          {m.quote&&<div style={{fontSize:12,color:"var(--ink2)",fontStyle:"italic",lineHeight:1.5,marginBottom:m.fix?4:0}}>"{m.quote}"{m.inEssay===false&&<span style={{fontStyle:"normal",fontSize:9.5,color:"var(--ink3)",marginLeft:5}}>(paraphrased)</span>}</div>}
          {m.fix&&<div style={{fontSize:11.5,color:"var(--leaf)",lineHeight:1.5}}>→ {m.fix}</div>}
        </div>)}
      </div>;
    })}
    {repeatedWords.length>0&&<div style={{marginTop:6,marginBottom:9}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span style={{width:8,height:8,borderRadius:2,background:MISTAKE_CATS.repetition.color,flexShrink:0}}/><span style={{fontSize:12,color:"var(--ink)",fontWeight:600}}>Overused words</span></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{repeatedWords.map((w,i)=><span key={i} className="chip ch" title="Vary this with synonyms">{w.word} ×{w.count}</span>)}</div>
    </div>}
    {repeatedOpeners.length>0&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.55,marginBottom:longSentences.length?8:0}}>
      <strong style={{color:"var(--honey)"}}>Repetitive sentence openers:</strong> {repeatedOpeners.map(o=>`"${o.opener}…" ×${o.count}`).join(", ")} — vary how sentences begin.
    </div>}
    {longSentences.length>0&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.55}}>
      <strong style={{color:"var(--sky)"}}>Possible run-on sentences ({longSentences.length}):</strong> {longSentences.map((s,i)=><span key={i} style={{display:"block",color:"var(--ink3)",fontStyle:"italic",marginTop:3}}>"{s}"</span>)}
    </div>}
  </div>;
}

function WritingExaminerPanels({result,taskType}) {
  if (!result) return null;
  const confidence = result.confidence || examinerScoreSummary(result, taskType);
  const criteria = writingCriteria(taskType);
  return <div className="fu">
    <div className="cols-2">
      {result.localGraded && !Number.isFinite(Number(result.examinerA?.overall))
        ? <div className="card">
          <div className="card-h"><div className="cdot"/>Examiner Double Marking</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,marginBottom:6}}>Single marking by the local fine-tuned model — independent A/B double-marking is <strong style={{color:"var(--ink)"}}>not available</strong> on the local grader.</div>
          <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55}}>For a confidence range from two independent passes, grade this essay with a cloud provider in Settings.</div>
        </div>
      : confidence&&<div className="card">
        <div className="card-h"><div className="cdot"/>Examiner Double Marking</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          <div><div className="sl">Examiner A</div><div className="sv" style={{color:bandColor(result.examinerA?.overall)}}>{result.examinerA?.overall?.toFixed?.(1)||"-"}</div></div>
          <div><div className="sl">Examiner B</div><div className="sv" style={{color:bandColor(result.examinerB?.overall)}}>{result.examinerB?.overall?.toFixed?.(1)||"-"}</div></div>
          <div><div className="sl">{confidence.label}</div><div className="sv" style={{color:confidence.spread<=.5?"var(--leaf)":confidence.spread<=1?"var(--honey)":"var(--rose)"}}>{confidence.low.toFixed(1)}-{confidence.high.toFixed(1)}</div></div>
        </div>
        <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55}}>{confidence.note}</div>
      </div>}
      {(()=>{ const nextBand = Math.min(9, roundWritingBand((Number(result.overall)||6.5)+0.5));
        return <div className="card">
        <div className="card-h"><div className="cdot"/>Next Band Blocker → {nextBand.toFixed(1)}</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",marginBottom:5}}>{result.band7GapDrill?.title || "Focused rewrite"}</div>
        <div style={{fontSize:12,color:"var(--ink3)",lineHeight:1.55,marginBottom:7}}><strong style={{color:"var(--orchid)"}}>Target:</strong> {result.band7GapDrill?.targetCriterion || "weakest criterion"} <span style={{color:"var(--ink3)"}}>· to reach Band {nextBand.toFixed(1)}</span></div>
        <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6}}>{result.band7GapDrill?.instruction}</div>
        {result.band7GapDrill?.successCheck&&<div style={{fontSize:11.5,color:"var(--leaf)",lineHeight:1.55,marginTop:8}}>Success check: {result.band7GapDrill.successCheck}</div>}
      </div>; })()}
    </div>
    {result.taskAudit?.length>0&&<div className="card">
      <div className="card-h"><div className="cdot"/>Task Response Audit</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
        {result.taskAudit.map((item,i)=>{
          const color = item.status==="pass" ? "var(--leaf)" : item.status==="fail" ? "var(--rose)" : "var(--honey)";
          return <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`2px solid ${color}`,borderRadius:8,padding:"9px 10px"}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color,letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>{item.status || "review"}</div>
            <div style={{fontSize:12.5,color:"var(--ink)",lineHeight:1.45,marginBottom:4}}>{item.label}</div>
            <div style={{fontSize:11.2,color:"var(--ink3)",lineHeight:1.45}}>{item.note}</div>
          </div>;
        })}
      </div>
    </div>}
    {result.promptFit&&<div className="card">
      <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Prompt Fit</div>
      <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,marginBottom:10}}>{result.promptFit.summary}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
        <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px"}}><div className="sl">Covered</div><div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>{result.promptFit.covered?.length ? result.promptFit.covered.join("; ") : "-"}</div></div>
        <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px"}}><div className="sl">Missing / Weak</div><div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>{result.promptFit.missing?.length ? result.promptFit.missing.join("; ") : "-"}</div></div>
        <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px"}}><div className="sl">Score impact</div><div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>{result.promptFit.scoreImpact || "-"}</div></div>
      </div>
      {result.promptFit.offTopic?.length>0&&<div style={{fontSize:11.5,color:"var(--rose)",lineHeight:1.5,marginTop:9}}>Off-topic or generic content: {result.promptFit.offTopic.join("; ")}</div>}
      {result.memorisedRisk && result.memorisedRisk.level!=="low" && (()=>{ const hi=result.memorisedRisk.level==="high"; const c=hi?"var(--rose)":"var(--honey)";
        return <div style={{marginTop:10,padding:"9px 11px",background:"var(--surface2)",border:`1px solid ${c}`,borderRadius:8}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,letterSpacing:".08em",textTransform:"uppercase",color:c,marginBottom:4}}>⚠ Memorised / template risk: {result.memorisedRisk.level}</div>
          {result.memorisedRisk.note&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.5,marginBottom:result.memorisedRisk.signals.length?4:0}}>{result.memorisedRisk.note}</div>}
          {result.memorisedRisk.signals.length>0&&<div style={{fontSize:11.2,color:"var(--ink3)",lineHeight:1.5}}>Signals: {result.memorisedRisk.signals.join("; ")}</div>}
        </div>; })()}
    </div>}
    <FixedEssayPanel result={result}/>
    <PreciseMistakesPanel result={result}/>
    <div className="card">
      <div className="card-h"><div className="cdot"/>Why Not Higher?</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
        {criteria.map(c=><div key={c.k} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:5}}>
            <strong style={{fontSize:12,color:"var(--ink)"}}>{c.full}</strong>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:bandColor(criterionBand(result,c.k))}}>{criterionBand(result,c.k)?.toFixed?.(1)||criterionBand(result,c.k)||"-"}</span>
          </div>
          <div style={{fontSize:11.2,color:"var(--ink3)",lineHeight:1.5}}>{result[c.k]?.whyNotHigher || "No higher-band blocker returned."}</div>
        </div>)}
      </div>
    </div>
  </div>;
}
