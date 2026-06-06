const READING_SOURCE_POLICY = "AI-generated original IELTS-style practice. Not official IELTS, Cambridge, British Council, IDP, IELTS Online Tests, Mini IELTS, or paid textbook material.";

const READING_TOPICS = [
  "science and technology",
  "environment and climate",
  "history and archaeology",
  "education and learning",
  "urban development",
  "health and psychology",
  "business and work",
  "culture and society"
];

// All recognised reading question types (for rendering + validation).
const READING_TYPES = [
  {id:"mixed",label:"Mixed set"},
  {id:"true_false_not_given",label:"True / False / Not Given"},
  {id:"yes_no_not_given",label:"Yes / No / Not Given"},
  {id:"matching_information",label:"Matching information"},
  {id:"matching_headings",label:"Matching headings"},
  {id:"matching_features",label:"Matching features"},
  {id:"matching_sentence_endings",label:"Matching sentence endings"},
  {id:"multiple_choice",label:"Multiple choice"},
  {id:"multiple_choice_multiple",label:"Multiple choice - multiple answers"},
  {id:"sentence_completion",label:"Sentence completion"},
  {id:"summary_completion",label:"Summary completion"},
  {id:"note_completion",label:"Note completion"},
  {id:"table_completion",label:"Table completion"},
  {id:"flow_chart_completion",label:"Flow-chart completion"},
  {id:"diagram_label_completion",label:"Diagram label completion"},
  {id:"short_answer",label:"Short answer"}
];

// All types are now focusable. Each has a dedicated generator path.
const READING_FOCUS_TYPES = [
  {id:"mixed",label:"Mixed set (recommended)"},
  {id:"true_false_not_given",label:"True / False / Not Given"},
  {id:"yes_no_not_given",label:"Yes / No / Not Given (opinions)"},
  {id:"matching_information",label:"Matching information"},
  {id:"matching_headings",label:"Matching headings"},
  {id:"matching_features",label:"Matching features"},
  {id:"matching_sentence_endings",label:"Matching sentence endings"},
  {id:"multiple_choice",label:"Multiple choice"},
  {id:"multiple_choice_multiple",label:"Multiple choice — multiple answers"},
  {id:"sentence_completion",label:"Sentence completion"},
  {id:"summary_completion",label:"Summary completion"},
  {id:"note_completion",label:"Note completion"},
  {id:"table_completion",label:"Table completion"},
  {id:"flow_chart_completion",label:"Flow-chart completion"},
  {id:"diagram_label_completion",label:"Diagram label completion"},
  {id:"short_answer",label:"Short answer"}
];

const READING_COMPLETION_TYPES = [
  "sentence_completion",
  "summary_completion",
  "note_completion",
  "table_completion",
  "flow_chart_completion",
  "diagram_label_completion",
  "short_answer"
];

const READING_SELECT_TYPES = [
  "true_false_not_given",
  "yes_no_not_given",
  "matching_information",
  "matching_headings",
  "matching_features",
  "matching_sentence_endings",
  "multiple_choice"
];

const READING_MODE_META = {
  mini:{label:"Mini drill",questions:8,duration:900,passages:1},
  section:{label:"Single section",questions:13,duration:1200,passages:1},
  full:{label:"Full test",questions:40,duration:3600,passages:3}
};

function readingTypeLabel(id) {
  return (READING_TYPES.find(t=>t.id===id)?.label || id || "Reading");
}

function normalizeReadingAnswer(value) {
  return String(value||"")
    .toLowerCase()
    .replace(/[.,;:!?()[\]"']/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function readingChoiceValue(option) {
  const text = String(option||"").trim();
  const m = text.match(/^([A-Z]|[ivxlcdm]+)\s*[\.\)]\s+/i);
  if (!m) return text;
  const token = m[1];
  return /^[ivxlcdm]+$/i.test(token) && token.length > 1 ? token.toLowerCase() : token.toUpperCase();
}

function splitReadingAnswerList(value) {
  if (Array.isArray(value)) return value.map(x=>String(x).trim()).filter(Boolean);
  return String(value||"").split(/[,;/\s]+/).map(x=>x.trim()).filter(Boolean);
}

function countReadingAnswerWords(value) {
  const clean = String(value||"").trim().replace(/\s+/g," ");
  return clean ? clean.split(" ").length : 0;
}

function readingWordLimit(question) {
  if (Number(question.wordLimit) > 0) return Number(question.wordLimit);
  const text = `${question.instruction||""} ${question.prompt||""}`.toUpperCase();
  if (text.includes("NO MORE THAN ONE WORD")) return 1;
  if (text.includes("NO MORE THAN TWO WORDS")) return 2;
  if (text.includes("NO MORE THAN THREE WORDS")) return 3;
  return null;
}

function isReadingAnswerCorrect(question, answer) {
  if (question.type === "multiple_choice_multiple") {
    const expected = splitReadingAnswerList(question.answer).map(x=>normalizeReadingAnswer(x)).sort();
    const given = splitReadingAnswerList(answer).map(x=>normalizeReadingAnswer(x)).sort();
    return expected.length > 0 && expected.length === given.length && expected.every((x,i)=>x===given[i]);
  }
  const limit = READING_COMPLETION_TYPES.includes(question.type) ? readingWordLimit(question) : null;
  if (limit && countReadingAnswerWords(answer) > limit) return false;
  const expected = Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length
    ? [question.answer, ...question.acceptedAnswers]
    : [question.answer];
  const given = normalizeReadingAnswer(answer);
  if (!given) return false;
  return expected.some(x=>normalizeReadingAnswer(x)===given);
}

function readingEstimatedBand(score,total) {
  if (!total) return 0;
  const raw40 = total === 40 ? score : Math.round((score / total) * 40);
  if (raw40 >= 39) return 9.0;
  if (raw40 >= 37) return 8.5;
  if (raw40 >= 35) return 8.0;
  if (raw40 >= 33) return 7.5;
  if (raw40 >= 30) return 7.0;
  if (raw40 >= 27) return 6.5;
  if (raw40 >= 23) return 6.0;
  if (raw40 >= 19) return 5.5;
  if (raw40 >= 15) return 5.0;
  if (raw40 >= 13) return 4.5;
  if (raw40 >= 10) return 4.0;
  if (raw40 >= 8) return 3.5;
  if (raw40 >= 6) return 3.0;
  if (raw40 >= 4) return 2.5;
  return raw40 > 0 ? 2.0 : 0;
}

function formatReadingTime(seconds) {
  const s = Math.max(0, Math.floor(seconds||0));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}

function paragraphLetter(i) {
  return String.fromCharCode(65+i);
}

function normalizeReadingQuestion(q, i, sectionIndex, fallbackType) {
  const type = q?.type || fallbackType || "multiple_choice";
  const id = q?.id || `s${sectionIndex+1}q${i+1}`;
  return {
    id:String(id),
    sectionIndex,
    type,
    sourceNumber:q?.sourceNumber ?? null,
    prompt:q?.prompt || q?.question || "",
    instruction:q?.instruction || "",
    options:Array.isArray(q?.options) ? q.options : [],
    answer:q?.answer ?? "",
    acceptedAnswers:Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [],
    explanation:q?.explanation || "",
    skill:q?.skill || "Reading detail",
    paragraph:q?.paragraph || q?.paragraphRef || "",
    anchor:q?.anchor || "",
    trap:q?.trap || "",
    wordLimit:q?.wordLimit || null,
    group:q?.group || q?.questionGroup || ""
  };
}

function normalizeReadingSection(raw, index, fallbackTopic, fallbackDifficulty, fallbackType) {
  const passage = raw?.passage || raw || {};
  const paragraphs = Array.isArray(passage.paragraphs) ? passage.paragraphs : [];
  const questions = (Array.isArray(raw?.questions) ? raw.questions : [])
    .map((q,i)=>normalizeReadingQuestion(q,i,index,fallbackType))
    .filter(q=>q.prompt && q.answer !== "");
  const id = raw?.id || `section-${index+1}`;
  return {
    id,
    number:index+1,
    title:passage.title || raw?.title || `Academic Reading Passage ${index+1}`,
    topic:passage.topic || raw?.topic || fallbackTopic,
    topicTags:Array.isArray(passage.topic_tags) ? passage.topic_tags : (Array.isArray(raw?.topicTags) ? raw.topicTags : []),
    level:passage.level || raw?.level || fallbackDifficulty,
    sourceNote:passage.sourceNote || raw?.sourceNote || READING_SOURCE_POLICY,
    paragraphs,
    headings:Array.isArray(raw?.headings) ? raw.headings : (Array.isArray(passage.headings) ? passage.headings : []),
    features:Array.isArray(raw?.features) ? raw.features : [],
    vocabulary:Array.isArray(raw?.vocabulary) ? raw.vocabulary : (Array.isArray(passage.vocabulary) ? passage.vocabulary : []),
    questions
  };
}

function normalizeReadingTest(data, fallbackTopic, fallbackDifficulty, fallbackType, fallbackMode="mini") {
  const rawSections = Array.isArray(data?.sections) && data.sections.length
    ? data.sections
    : [{id:"section-1",passage:data?.passage||data,questions:data?.questions||[],headings:data?.headings||[],features:data?.features||[],vocabulary:data?.vocabulary||[]}];
  const sections = rawSections.map((s,i)=>normalizeReadingSection(s,i,fallbackTopic,fallbackDifficulty,fallbackType));
  let n = 1;
  const preserveQuestionNumbers = data?.preserveQuestionNumbers === true;
  sections.forEach(section=>{
    section.questions.forEach(q=>{
      const sourceNumber = String(q.sourceNumber ?? "").trim();
      if (preserveQuestionNumbers && sourceNumber) {
        const numericSource = Number(sourceNumber);
        q.number = Number.isFinite(numericSource) ? numericSource : sourceNumber;
        if (Number.isFinite(numericSource)) n = Math.max(n,numericSource+1);
        else n += 1;
      } else q.number = n++;
      q.sectionId = section.id;
    });
  });
  const questions = sections.flatMap(s=>s.questions);
  const mode = data?.mode || (sections.length >= 3 ? "full" : fallbackMode);
  const title = data?.title || (sections.length >= 3 ? "Full Academic Reading Test" : sections[0]?.title || "Academic Reading Practice");
  const durationSeconds = Number(data?.durationSeconds) || READING_MODE_META[mode]?.duration || Math.max(600,questions.length*90);
  return {
    id:data?.id || Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    mode,
    title,
    sourcePolicy:data?.sourcePolicy || READING_SOURCE_POLICY,
    durationSeconds,
    preserveQuestionNumbers,
    sections,
    questions,
    topic:data?.topic || sections[0]?.topic || fallbackTopic,
    level:data?.level || fallbackDifficulty,
    qualityWarnings:Array.isArray(data?.qualityWarnings) ? data.qualityWarnings : []
  };
}

function readingSelectOptions(question, section) {
  if (question.type === "true_false_not_given") return ["TRUE","FALSE","NOT GIVEN"];
  if (question.type === "yes_no_not_given") return ["YES","NO","NOT GIVEN"];
  if (question.type === "matching_information") {
    return question.options?.length ? question.options : (section?.paragraphs||[]).map((_,i)=>paragraphLetter(i));
  }
  if (question.type === "matching_headings") return question.options?.length ? question.options : (section?.headings||[]);
  if (question.type === "matching_features") return question.options?.length ? question.options : (section?.features||[]);
  if (question.type === "matching_sentence_endings") return question.options || [];
  if (question.type === "multiple_choice") return question.options || [];
  if (question.type === "multiple_choice_multiple") return question.options || [];
  return [];
}

function plainSectionText(section) {
  return (section?.paragraphs || []).join(" ");
}

function validateReadingTest(test, expectedTotal=null) {
  const warnings = [];
  const add = (severity, message) => warnings.push({severity,message});
  if (!test.sections.length) add("error","No reading sections were generated.");
  if (test.mode === "full" && test.sections.length !== 3) add("error","A full test must contain exactly 3 passages.");
  if (expectedTotal && test.questions.length !== expectedTotal) add(test.mode==="full"?"error":"warning",`Expected ${expectedTotal} questions, got ${test.questions.length}.`);
  const seen = new Set();
  test.sections.forEach((section,si)=>{
    if (section.paragraphs.length < 3) add("warning",`Section ${si+1} has fewer than 3 paragraphs.`);
    const sectionText = normalizeReadingAnswer(plainSectionText(section));
    section.questions.forEach(q=>{
      if (seen.has(q.id)) add("warning",`Duplicate question id: ${q.id}.`);
      seen.add(q.id);
      if (!READING_TYPES.some(t=>t.id===q.type)) add("warning",`Question ${q.number} uses unknown type "${q.type}".`);
      if (q.type === "true_false_not_given" && !["TRUE","FALSE","NOT GIVEN"].includes(String(q.answer).toUpperCase())) add("error",`Question ${q.number} has invalid TFNG answer.`);
      if (q.type === "yes_no_not_given" && !["YES","NO","NOT GIVEN"].includes(String(q.answer).toUpperCase())) add("error",`Question ${q.number} has invalid YNNG answer.`);
      if (READING_COMPLETION_TYPES.includes(q.type)) {
        const answers = [q.answer, ...(q.acceptedAnswers||[])].filter(Boolean).map(normalizeReadingAnswer);
        if (!answers.some(a=>a && sectionText.includes(a))) add("warning",`Question ${q.number} answer may not be taken exactly from the passage.`);
        if (!readingWordLimit(q)) add("warning",`Question ${q.number} is a completion item without a word limit.`);
      }
      if (READING_SELECT_TYPES.includes(q.type)) {
        const opts = readingSelectOptions(q, section).map(readingChoiceValue).map(normalizeReadingAnswer);
        if (opts.length && !opts.includes(normalizeReadingAnswer(q.answer))) add("warning",`Question ${q.number} answer is not in its option list.`);
      }
      if (q.anchor && !sectionText.includes(normalizeReadingAnswer(q.anchor))) add("warning",`Question ${q.number} anchor is not an exact phrase in the passage.`);
    });
  });
  return warnings;
}

function makeDemoReadingTest() {
  return normalizeReadingTest({
    mode:"section",
    sourcePolicy:READING_SOURCE_POLICY,
    durationSeconds:1200,
    sections:[{
      passage:{
        title:"The Slow Return of Urban Wetlands",
        topic:"environment and climate",
        level:"Band 7.0",
        sourceNote:READING_SOURCE_POLICY,
        paragraphs:[
          "For much of the twentieth century, wetlands within large cities were treated as inconvenient spaces. They were drained for roads, filled for housing, or hidden behind industrial land. In recent decades, however, planners have begun to reassess their value. A wetland can store rainwater during storms, filter pollutants before they reach rivers, and provide cooler air during heatwaves.",
          "The change in attitude has been driven partly by cost. Concrete drainage systems are expensive to expand, especially when rainfall becomes less predictable. Restored wetlands cannot replace engineered infrastructure entirely, but they can reduce pressure on it. In one coastal district, a network of ponds and reed beds lowered peak flood levels after heavy rain, while also creating public walking routes.",
          "There are trade-offs. Wetlands require space, and land in cities is politically sensitive. Some residents worry about mosquitoes or unpleasant smells, although these problems are usually linked to poor water movement rather than wetlands themselves. Successful projects therefore depend on careful design, regular maintenance, and clear communication with local communities.",
          "Researchers caution that the benefits should not be exaggerated. A small wetland beside an apartment block will not solve regional flooding. Yet when many small sites are connected, they can form a useful environmental system. The most effective urban wetland schemes are those treated not as decoration, but as working parts of the city."
        ]
      },
      headings:["i. A limited but useful role","ii. Public fears and design conditions","iii. Earlier attitudes to urban wetlands","iv. Cost pressures behind restoration","v. A complete solution to city flooding"],
      questions:[
        {id:"demo1",type:"matching_headings",prompt:"Paragraph A",options:["i. A limited but useful role","ii. Public fears and design conditions","iii. Earlier attitudes to urban wetlands","iv. Cost pressures behind restoration","v. A complete solution to city flooding"],answer:"iii",explanation:"Paragraph A explains that wetlands used to be drained, filled, or hidden.",skill:"main idea",paragraph:"A"},
        {id:"demo2",type:"matching_headings",prompt:"Paragraph B",options:["i. A limited but useful role","ii. Public fears and design conditions","iii. Earlier attitudes to urban wetlands","iv. Cost pressures behind restoration","v. A complete solution to city flooding"],answer:"iv",explanation:"Paragraph B focuses on drainage costs and pressure on infrastructure.",skill:"main idea",paragraph:"B"},
        {id:"demo3",type:"true_false_not_given",prompt:"In the twentieth century, urban wetlands were often removed or concealed.",answer:"TRUE",explanation:"Paragraph A says they were drained, filled, or hidden.",skill:"locating detail",paragraph:"A",anchor:"drained for roads, filled for housing, or hidden"},
        {id:"demo4",type:"true_false_not_given",prompt:"Restored wetlands can completely replace concrete drainage systems.",answer:"FALSE",explanation:"Paragraph B says they cannot replace engineered infrastructure entirely.",skill:"distinguishing contradiction",paragraph:"B",anchor:"cannot replace engineered infrastructure entirely"},
        {id:"demo5",type:"true_false_not_given",prompt:"The coastal district project was opposed by most local residents.",answer:"NOT GIVEN",explanation:"Opposition in that district is not mentioned.",skill:"not given recognition",paragraph:"B"},
        {id:"demo6",type:"multiple_choice",prompt:"What is one reason planners have become more interested in wetlands?",options:["A. They are cheaper to build than all roads.","B. They can reduce pressure on drainage systems.","C. They remove the need for public parks.","D. They prevent all heatwaves."],answer:"B",explanation:"Paragraph B says restored wetlands can reduce pressure on drainage infrastructure.",skill:"detail",paragraph:"B"},
        {id:"demo7",type:"sentence_completion",instruction:"NO MORE THAN TWO WORDS",prompt:"Wetlands can filter pollutants before they reach ____.",answer:"rivers",acceptedAnswers:["the rivers"],wordLimit:2,explanation:"Paragraph A mentions filtering pollutants before they reach rivers.",skill:"word matching",paragraph:"A",anchor:"before they reach rivers"},
        {id:"demo8",type:"short_answer",instruction:"NO MORE THAN ONE WORD",prompt:"What problem do residents sometimes associate with wetlands besides unpleasant smells?",answer:"mosquitoes",wordLimit:1,explanation:"Paragraph C names mosquitoes and smells.",skill:"scanning",paragraph:"C",anchor:"mosquitoes or unpleasant smells"},
        {id:"demo9",type:"multiple_choice",prompt:"According to the final paragraph, small wetlands are most useful when they are...",options:["A. privately owned.","B. connected with other sites.","C. built beside every apartment.","D. used mainly as decoration."],answer:"B",explanation:"Paragraph D says connected small sites can form a useful environmental system.",skill:"inference",paragraph:"D"},
        {id:"demo10",type:"sentence_completion",instruction:"NO MORE THAN ONE WORD",prompt:"The best schemes treat wetlands as ____ parts of the city.",answer:"working",wordLimit:1,explanation:"The final sentence says they are working parts of the city.",skill:"sentence completion",paragraph:"D",anchor:"working parts of the city"}
      ],
      vocabulary:[
        {word:"reassess",meaning:"consider again"},
        {word:"infrastructure",meaning:"basic physical systems of a city"},
        {word:"trade-offs",meaning:"disadvantages accepted for benefits"}
      ]
    }]
  },"environment and climate","Band 7.0","mixed","section");
}

// ─── MULTI-STEP READING GENERATION ──────────────────────────────────────────

function formatWithLabels(paragraphs) {
  return paragraphs.map(p => `[Paragraph ${p.label}]\n${p.text}`).join("\n\n");
}

function buildPassagePrompt(topic, sectionDifficulty, targetBand, fewShotExamples, sourceText, correctiveNote) {
  const targetWords = sectionDifficulty === 1 ? 700 : sectionDifficulty === 2 ? 800 : 880;
  const shots = (fewShotExamples || []).filter(Boolean);
  const fewShotBlock = shots.length > 0
    ? `\nFEW-SHOT REFERENCE${shots.length>1?"S":""} (match this style, structure, register, and density — do NOT copy content or reuse facts):\n${shots.map((e,i)=>`--- Reference ${i+1} ---\n${formatFewShotPassage(e)}`).join("\n\n")}\n\nAVOID overlapping with the reference topic — your passage must cover different facts, examples, and arguments.\n`
    : "";
  const sourceBlock = sourceText && String(sourceText).trim().length > 200
    ? `\nSOURCE MATERIAL — use ONLY facts (names, dates, numbers, places, expert names, mechanisms) that appear in this text. Do not invent statistics or attribute claims to people not mentioned here. Paraphrase heavily:\n${String(sourceText).slice(0,8000)}\n`
    : "";
  const corrective = correctiveNote ? `\nCRITICAL CORRECTION: ${correctiveNote}\n` : "";
  return {
    maxTokens: 4000,
    system: `You are an IELTS Academic Reading passage editor with 15 years of Cambridge Assessment experience. You produce passages indistinguishable from official Cambridge IELTS materials. Return only strict JSON.`,
    user: `Write an original IELTS Academic Reading passage.

TOPIC: ${topic}
SECTION DIFFICULTY: ${sectionDifficulty} (1=easier, 2=medium, 3=harder/more academic)
TARGET BAND: ${targetBand}
${sourceBlock}${fewShotBlock}${corrective}

REQUIREMENTS:
- Length: ${targetWords} words (±50 tolerance)
- Register: formal academic, third person only, no contractions, no colloquialisms, no rhetorical questions
- Structure: 6-8 paragraphs labeled A–H; each paragraph has ONE clear central idea
- First paragraph: introduces topic, hooks reader, gives context
- Middle paragraphs: develop different aspects (history, mechanism, examples, debates)
- Final paragraph: implications, future outlook, or unresolved questions
- At least ONE paragraph with a nuanced/contested claim (essential for T/F/NG questions)
- At least ONE paragraph contrasting two viewpoints or approaches
- 8-12 academic words at B2-C1 level; 2-4 discipline-specific terms with context clues
- Mix sentence lengths; passive voice ~25%; vary sentence openings
- Content: 3-5 specific data points (years, percentages, names, places); 1 named expert with paraphrased view; 1 historical reference; 1 mechanism/process explanation
- Avoid: bullet points, subheadings, "AI tells" phrases (furthermore/it should be noted/in conclusion), Wikipedia-style openings

Return strict JSON:
{"title":"Compelling academic title (5-10 words)","paragraphs":[{"label":"A","text":"full paragraph text"},{"label":"B","text":"full paragraph text"}],"word_count":${targetWords},"topic_tags":["tag1","tag2"]}`
  };
}

function buildTFNGPrompt(passageText, n, nTrue, nFalse, nNG) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for True/False/Not Given questions. Return only strict JSON.`,
    user: `Write ${n} True/False/Not Given questions based on this passage.

PASSAGE:
${passageText}

REQUIRED MIX: ${nTrue} TRUE, ${nFalse} FALSE, ${nNG} NOT GIVEN
ORDER: questions must follow passage order (Q1 from early paragraphs, last Q from late paragraphs)

RULES:
- TRUE: paraphrases a factual statement the passage makes; use synonyms / changed voice; never copy 5+ consecutive words
- FALSE: DIRECTLY contradicts a specific passage claim (opposite quantifier, opposite direction, wrong attribution) — not just absent
- NOT GIVEN: plausible statement, related topic, but NO sentence confirms or denies it

QUANTIFIER LOGIC (critical for FALSE vs NOT GIVEN distinction):
- Passage "many" → statement "some" = TRUE (wide set contains narrow set)
- Passage "some" → statement "many" = NOT GIVEN (cannot generalise upward)
- Passage "few" (no article, negative tone) → statement "some" = FALSE (sentiment opposite)
- Passage "a few" (positive tone) → statement "some" ≈ TRUE
- Belief / suggestion in passage → "proven" / "established" in statement = FALSE (epistemic mismatch)
Use at least one of these traps in a FALSE or NOT GIVEN item.

TRAPS to include: synonym swap, active↔passive voice, opposite quantifier, sentiment flip, belief↔proof confusion, wrong attribution

DO NOT: confuse FALSE with NOT GIVEN; copy 5+ words verbatim; make statements answerable from general knowledge alone

Return strict JSON:
{"questions":[{"order":1,"statement":"...","answer":"TRUE","evidence":{"paragraph":"B","sentence_quote":"exact sentence from passage","reasoning":"why this answer"},"trap_type":"synonym_swap | quantifier_shift | sentiment_flip | belief_vs_proof | wrong_attribution"}]}`
  };
}

function buildMCQPrompt(passageText, n) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Multiple Choice questions. Return only strict JSON.`,
    user: `Write ${n} multiple choice questions based on this passage.

PASSAGE:
${passageText}

REQUIREMENTS:
- Each question: 1 correct answer + 3 distractors
- Include at least 1 detail question, 1 inference or author's-view question
- Vary subtypes: detail, main idea, inference, author's view, vocabulary-in-context
- Stems must be specific ("According to paragraph C, the primary reason X happens is...")

DISTRACTOR TYPES (use at least 2 per question):
- Type A: true information but doesn't answer the question
- Type B: partially correct (half matches, half wrong)
- Type C: reasonable assumption not stated in passage
- Type D: opposite of what passage says

AVOID: options dramatically different in length; "all/none of the above"; overlapping options; correct answer always B or C

Return strict JSON:
{"questions":[{"order":1,"question":"According to paragraph C, the primary reason...","question_subtype":"detail","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"B","evidence":{"paragraph":"C","sentence_quote":"...","why_correct":"..."}}]}`
  };
}

function buildMatchingHeadingsPrompt(passageText, paragraphLabels) {
  const labelsStr = Array.isArray(paragraphLabels) ? paragraphLabels.join(",") : String(paragraphLabels || "");
  const n = labelsStr.split(",").filter(Boolean).length;
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Matching Headings questions. Return only strict JSON.`,
    user: `Write matching headings questions for this passage.

PASSAGE:
${passageText}

PARAGRAPHS TO MATCH: ${labelsStr}

RULES:
- Each heading: 4-10 words, noun phrase, captures MAIN IDEA not a detail
- Heading must NOT contain verbatim words from the paragraph's topic sentence
- Generate ${n} correct headings + 3 distractor headings (${n + 3} total)
- Each distractor must be plausible and match a DETAIL or sub-idea, not the main idea
- No two headings should fit the same paragraph equally well

Return strict JSON:
{"headings_list":[{"roman":"i","text":"..."}],"matches":[{"paragraph":"B","correct_heading":"iii","why":"paragraph B main idea is X, heading iii paraphrases as Y","tempting_distractor":"vii"}],"unused_headings":["i","v"]}`
  };
}

function buildSentenceCompletionPrompt(passageText, n, wordLimit) {
  return {
    maxTokens: 2500,
    system: `You are a Cambridge IELTS item writer for Sentence Completion questions. Return only strict JSON.`,
    user: `Write ${n} sentence completion questions. Answers must be exact words from the passage.

PASSAGE:
${passageText}

WORD LIMIT: ${wordLimit}

RULES:
- Sentence stems PARAPHRASE the passage (never copy 4+ consecutive words)
- Answers fit grammatically in the blank
- Each answer uniquely determinable — only one correct answer exists in passage

AVOID: blanks fillable by multiple different answers; stems copying too much; answers requiring word-form changes

Return strict JSON:
{"instruction":"Complete the sentences below. Choose ${wordLimit} from the passage for each answer.","questions":[{"order":1,"sentence_with_blank":"The researchers found that the compound was responsible for __________.","answer":"cellular regeneration","evidence":{"paragraph":"D","sentence_quote":"exact sentence","paraphrase_check":"stem uses X, passage uses Y"}}]}`
  };
}

function buildSummaryCompletionPrompt(passageText, startPara, endPara, n, wordLimit) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Summary Completion questions. Return only strict JSON.`,
    user: `Write a summary completion task covering paragraphs ${startPara} to ${endPara} of this passage.

PASSAGE:
${passageText}

NUMBER OF BLANKS: ${n}
WORD LIMIT PER BLANK: ${wordLimit}

RULES:
- Summary covers ONLY paragraphs ${startPara} to ${endPara}
- Summary is in YOUR words (paraphrase), not copied from passage
- Each blank: 1-3 words from passage; must be a key content word (noun, verb, adjective)
- Blanks distributed throughout the summary (not all clustered)
- Use [1]___ notation for blanks in the summary text

AVOID: copying sentence structure; multiple valid answers per blank; distorting meaning

Return strict JSON:
{"instruction":"Complete the summary below. Use ${wordLimit} from the passage for each answer.","summary_text":"The discovery of [1]___ in the 1960s transformed...","blanks":[{"number":1,"answer":"bioluminescent bacteria","evidence_paragraph":"B","evidence_sentence":"exact sentence from passage"}]}`
  };
}

function buildShortAnswerPrompt(passageText, n, wordLimit) {
  return {
    maxTokens: 2500,
    system: `You are a Cambridge IELTS item writer for Short Answer questions. Return only strict JSON.`,
    user: `Write ${n} short answer questions. Answers must be exact words from the passage.

PASSAGE:
${passageText}

WORD LIMIT: ${wordLimit}

RULES:
- Questions start with Wh- words (What, Where, When, Who, Why, How, Which)
- Answers are exact words/phrases from passage — uniquely determinable
- Questions are paraphrased, not copied from passage
- Good for: facts, names, processes, locations, dates, causes

Return strict JSON:
{"instruction":"Answer the questions below. Use ${wordLimit} from the passage for each answer.","questions":[{"order":1,"question":"What compound produces the glow in fireflies?","answer":"luciferin","alternative_answers":["luciferin"],"evidence":{"paragraph":"C","sentence_quote":"exact sentence"}}]}`
  };
}

function buildMatchingInfoPrompt(passageText, n) {
  return {
    maxTokens: 2500,
    system: `You are a Cambridge IELTS item writer for Matching Information questions. Return only strict JSON.`,
    user: `Write ${n} Matching Information questions. Each statement describes a SPECIFIC piece of information (example, fact, claim, definition) found in one paragraph.

PASSAGE:
${passageText}

RULES:
- Each statement = a paraphrased detail; identify which paragraph (A, B, C, ...) contains it
- Statements are SPECIFIC details, not main ideas (main ideas → matching_headings)
- A paragraph may contain info for 2+ statements; some paragraphs may match none
- Statements do NOT need to follow passage order
- Use signal words: "a description of X", "an example of Y", "the reason for Z", "a comparison between A and B"

Return strict JSON:
{"questions":[{"order":1,"statement":"a description of how X works","correct_paragraph":"C","reasoning":"why this paragraph"}]}`
  };
}

function buildMatchingFeaturesPrompt(passageText, n) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Matching Features questions. Return only strict JSON.`,
    user: `Write ${n} Matching Features questions. Identify 4-6 named entities (people, places, organisations, theories, time periods) discussed in the passage, then write statements about characteristics that match each.

PASSAGE:
${passageText}

RULES:
- features_list = 4-6 entities labelled A, B, C... drawn from passage
- Each statement describes a characteristic / claim / role; match it to the correct feature
- Some features may match 2+ statements; some may match none
- Each statement must be uniquely determinable

Return strict JSON:
{"features_list":[{"label":"A","text":"Dr. Helen Cole"},{"label":"B","text":"Mendoza Institute"}],"questions":[{"order":1,"statement":"argued that the original theory was incomplete","correct_feature":"A","reasoning":"why"}]}`
  };
}

function buildMatchingSentenceEndingsPrompt(passageText, n) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Matching Sentence Endings. Return only strict JSON.`,
    user: `Write ${n} Matching Sentence Endings items. Each stem is a sentence beginning that must be completed using one of the endings from a list.

PASSAGE:
${passageText}

RULES:
- Generate ${n} sentence STEMS (each paraphrasing a passage idea — open-ended)
- Generate ${n + 3} ENDINGS labelled A, B, C... (so ${n} correct + 3 distractors)
- Each stem maps to exactly ONE ending; endings must NOT overlap in meaning
- Distractor endings should be plausible but contradicted by passage OR not in passage

Return strict JSON:
{"endings_list":[{"label":"A","text":"because the soil was already saturated."},{"label":"B","text":"although researchers initially doubted it."}],"questions":[{"order":1,"stem":"The flood caused unexpectedly severe damage","correct_ending":"A","reasoning":"why"}]}`
  };
}

function buildMCQMultiplePrompt(passageText, n) {
  return {
    maxTokens: 2500,
    system: `You are a Cambridge IELTS item writer for Multiple Choice — Multiple Answers questions. Return only strict JSON.`,
    user: `Write ${n} Multiple Choice (multiple answers) questions. Each question asks the candidate to choose TWO correct answers from FIVE options.

PASSAGE:
${passageText}

RULES:
- Each question has 5 options (A-E); EXACTLY TWO are correct, three are distractors
- Stem like: "Which TWO of the following are mentioned as benefits of X?"
- Both correct answers must be supported by passage; distractors should be plausible but wrong (not stated, partially correct, or opposite)

Return strict JSON:
{"questions":[{"order":1,"question":"Which TWO of the following are mentioned as advantages of urban wetlands?","options":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct_answers":["B","D"],"evidence":{"paragraph":"C","why_correct":"..."}}]}`
  };
}

function buildStructuredCompletionPrompt(passageText, n, wordLimit, format) {
  const formatHints = {
    note: `NOTES FORMAT: bullet list with section headings, blanks marked [1]___, [2]___ etc.
Example:
"Urban wetlands · Function
• store [1]___ during storms
• filter [2]___ from runoff
• provide cooler air during [3]___"`,
    table: `TABLE FORMAT: markdown table with blanks marked [1]___, [2]___ etc.
Example:
"| Year | Event |
|------|-------|
| 1923 | [1]___ |
| 1947 | [2]___ |
| 1965 | discovery of bioluminescent bacteria |"`,
    flow: `FLOW-CHART FORMAT: linear sequence of steps connected with arrows, blanks marked [1]___, [2]___ etc.
Example:
"Step 1: Collect sample → Step 2: [1]___ → Step 3: Add catalyst → Step 4: [2]___ → Step 5: Measure output"`,
    diagram: `DIAGRAM-LABEL FORMAT: description of a structure / object / system with parts labelled [1]___, [2]___ etc.
Example:
"The cell's structure (outer to inner):
- Outer layer: [1]___
- Middle layer: [2]___
- Innermost region: [3]___ containing the nucleus"`
  };
  const formatHint = formatHints[format] || formatHints.note;
  const typeLabel = {note:"Note Completion",table:"Table Completion",flow:"Flow-chart Completion",diagram:"Diagram Label Completion"}[format];

  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for ${typeLabel}. Return only strict JSON.`,
    user: `Write a ${typeLabel} task with ${n} blanks based on this passage.

PASSAGE:
${passageText}

WORD LIMIT PER BLANK: ${wordLimit}

${formatHint}

RULES:
- Each blank = a key content word (noun, verb, adjective) lifted EXACTLY from passage
- Blanks must be uniquely determinable; only ONE word fits each blank grammatically + semantically
- Distribute blanks throughout the structure, not clustered
- Do NOT blank function words (the, of, in, a/an)
- ${n} blanks total

Return strict JSON:
{"instruction":"Complete the ${format} below. Use ${wordLimit} from the passage for each answer.","structure_text":"<full text with [1]___ [2]___ markers>","blanks":[{"number":1,"answer":"rainwater","evidence_paragraph":"A","evidence_sentence":"exact sentence from passage"}]}`
  };
}

// ─── QUESTION CONVERTERS (tool JSON → app question objects) ──────────────────

function convertTFNGQuestions(raw) {
  return (raw.questions || []).map(q => ({
    type: "true_false_not_given",
    prompt: q.statement || "",
    answer: q.answer || "NOT GIVEN",
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.reasoning || ""}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
    trap: q.trap_type || "",
    skill: "Detail / inference"
  }));
}

// YES/NO/NOT GIVEN — like TFNG but about the WRITER'S claims/opinions, not facts.
function buildYNNGPrompt(passageText, n, nYes, nNo, nNG) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Yes/No/Not Given questions about the writer's views and claims. Return only strict JSON.`,
    user: `Write ${n} Yes/No/Not Given questions based on the WRITER'S opinions, claims and arguments in this passage (NOT plain facts).

PASSAGE:
${passageText}

REQUIRED MIX: ${nYes} YES, ${nNo} NO, ${nNG} NOT GIVEN
ORDER: follow passage order.

RULES:
- YES: the statement agrees with a view/claim the writer expresses (paraphrased; never copy 5+ consecutive words).
- NO: the statement contradicts a view/claim the writer expresses (opposite stance, opposite degree, wrong attribution of the view).
- NOT GIVEN: a plausible opinion on the topic, but the writer never states or implies this view.
- Target the writer's STANCE/EVALUATION ("argues", "believes", "suggests", "criticises", "doubts"), not neutral facts.
- Use traps: stance flip, degree shift (strongly↔mildly), attributing someone else's view to the writer, belief↔proof confusion.

DO NOT: confuse NO with NOT GIVEN; copy 5+ words verbatim; write fact-checkable statements answerable by general knowledge.

Return strict JSON:
{"questions":[{"order":1,"statement":"...","answer":"YES","evidence":{"paragraph":"B","sentence_quote":"exact sentence from passage","reasoning":"why this answer"},"trap_type":"stance_flip | degree_shift | wrong_attribution | belief_vs_proof"}]}`
  };
}
function convertYNNGQuestions(raw) {
  return (raw.questions || []).map(q => ({
    type: "yes_no_not_given",
    prompt: q.statement || "",
    answer: q.answer || "NOT GIVEN",
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.reasoning || ""}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
    trap: q.trap_type || "",
    skill: "Writer's view / opinion"
  }));
}

function convertMatchingInfoQuestions(raw) {
  return (raw.questions || []).map(q => ({
    type: "matching_information",
    prompt: q.statement || "",
    answer: q.correct_paragraph || "A",
    explanation: q.reasoning || "",
    paragraph: q.correct_paragraph || "",
    anchor: "",
    trap: "",
    skill: "Locating specific information"
  }));
}

function convertMatchingFeaturesQuestions(raw) {
  const featuresList = (raw.features_list || []).map(f => `${f.label}. ${f.text}`);
  return (raw.questions || []).map(q => ({
    type: "matching_features",
    prompt: q.statement || "",
    options: featuresList,
    answer: q.correct_feature || "A",
    explanation: q.reasoning || "",
    paragraph: "",
    anchor: "",
    trap: "",
    skill: "Feature-claim matching"
  }));
}

function convertMatchingSentenceEndingsQuestions(raw) {
  const endingsList = (raw.endings_list || []).map(e => `${e.label}. ${e.text}`);
  return (raw.questions || []).map(q => ({
    type: "matching_sentence_endings",
    prompt: q.stem || "",
    options: endingsList,
    answer: q.correct_ending || "A",
    explanation: q.reasoning || "",
    paragraph: "",
    anchor: "",
    trap: "",
    skill: "Sentence completion (paraphrase)"
  }));
}

function convertMCQMultipleQuestions(raw) {
  return (raw.questions || []).map(q => {
    const opts = q.options || {};
    const options = Object.entries(opts).map(([k, v]) => `${k}. ${v}`);
    const answers = Array.isArray(q.correct_answers) ? q.correct_answers : [];
    return {
      type: "multiple_choice_multiple",
      prompt: q.question || "",
      options,
      answer: answers.join(","),
      acceptedAnswers: [answers.join(", "), answers.join("")],
      explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.why_correct || ""}` : "",
      paragraph: q.evidence?.paragraph || "",
      anchor: "",
      trap: "",
      skill: "Multi-detail comprehension"
    };
  });
}

function convertStructuredCompletionQuestions(raw, completionType, wordLimitNum) {
  const inst = raw.instruction || "Complete the structure below using words from the passage.";
  const structureText = raw.structure_text || raw.summary_text || "";
  return (raw.blanks || []).map(b => {
    const sentences = structureText.split(/(?<=[.!?\n])\s+/);
    const blankMarker = `[${b.number}]___`;
    const contextSentence = sentences.find(s => s.includes(blankMarker)) || `See ${completionType}: ${blankMarker}`;
    return {
      type: completionType,
      prompt: contextSentence,
      instruction: inst,
      answer: b.answer || "",
      wordLimit: wordLimitNum,
      explanation: `Paragraph ${b.evidence_paragraph}: ${b.evidence_sentence || ""}`,
      paragraph: b.evidence_paragraph || "",
      anchor: (b.evidence_sentence || "").slice(0, 120),
      trap: "",
      skill: "Structured completion",
      group: structureText
    };
  });
}

function convertMCQQuestions(raw) {
  return (raw.questions || []).map(q => {
    const opts = q.options || {};
    const options = Object.entries(opts).map(([k, v]) => `${k}. ${v}`);
    return {
      type: "multiple_choice",
      prompt: q.question || "",
      options,
      answer: q.answer || "A",
      explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.why_correct || ""}` : "",
      paragraph: q.evidence?.paragraph || "",
      anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
      trap: q.question_subtype || "",
      skill: "Comprehension"
    };
  });
}

function convertMatchingHeadingsQuestions(raw) {
  const headingsList = (raw.headings_list || []).map(h => `${h.roman}. ${h.text}`);
  return (raw.matches || []).map(m => ({
    type: "matching_headings",
    prompt: `Paragraph ${m.paragraph}`,
    options: headingsList,
    answer: m.correct_heading || "",
    explanation: m.why || "",
    paragraph: m.paragraph || "",
    anchor: "",
    trap: m.tempting_distractor ? `Distractor: ${m.tempting_distractor}` : "",
    skill: "Main idea"
  }));
}

function convertSentenceCompletionQuestions(raw) {
  const inst = raw.instruction || "Complete the sentences. Use NO MORE THAN TWO WORDS from the passage.";
  return (raw.questions || []).map(q => ({
    type: "sentence_completion",
    prompt: q.sentence_with_blank || "",
    instruction: inst,
    answer: q.answer || "",
    wordLimit: 2,
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.paraphrase_check || ""}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
    trap: "",
    skill: "Detail and vocabulary"
  }));
}

function convertSummaryCompletionQuestions(raw) {
  const inst = raw.instruction || "Complete the summary. Use NO MORE THAN TWO WORDS from the passage.";
  const summaryText = raw.summary_text || "";
  return (raw.blanks || []).map(b => {
    const sentences = summaryText.split(/(?<=[.!?])\s+/);
    const blankMarker = `[${b.number}]___`;
    const contextSentence = sentences.find(s => s.includes(blankMarker)) || `See summary: ${blankMarker}`;
    return {
      type: "summary_completion",
      prompt: contextSentence,
      instruction: inst,
      answer: b.answer || "",
      wordLimit: 2,
      explanation: `Paragraph ${b.evidence_paragraph}: ${b.evidence_sentence || ""}`,
      paragraph: b.evidence_paragraph || "",
      anchor: (b.evidence_sentence || "").slice(0, 120),
      trap: "",
      skill: "Summary comprehension",
      group: summaryText
    };
  });
}

function convertShortAnswerQuestions(raw) {
  const inst = raw.instruction || "Answer the questions. Use NO MORE THAN THREE WORDS from the passage.";
  return (raw.questions || []).map(q => ({
    type: "short_answer",
    prompt: q.question || "",
    instruction: inst,
    answer: q.answer || "",
    acceptedAnswers: q.alternative_answers || [],
    wordLimit: 3,
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${(q.evidence.sentence_quote || "").slice(0, 100)}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 100),
    trap: "",
    skill: "Fact retrieval"
  }));
}

function buildAndConvertQuestions(qGroup, passageText) {
  const {type, params} = qGroup;
  const tfngN = params.n || 4;
  const nTrue = params.nTrue ?? Math.max(1, Math.floor(tfngN * 0.4));
  const nFalse = params.nFalse ?? Math.max(1, Math.floor(tfngN * 0.35));
  const nNG = params.nNG ?? Math.max(0, tfngN - nTrue - nFalse);
  const wlNum = (wl) => wl?.includes("ONE WORD") ? 1 : wl?.includes("THREE WORDS") ? 3 : 2;
  switch (type) {
    case "tfng": return {prompt: buildTFNGPrompt(passageText, tfngN, nTrue, nFalse, nNG), convert: convertTFNGQuestions};
    case "ynng": return {prompt: buildYNNGPrompt(passageText, tfngN, nTrue, nFalse, nNG), convert: convertYNNGQuestions};
    case "mcq": return {prompt: buildMCQPrompt(passageText, params.n || 3), convert: convertMCQQuestions};
    case "mcq_multiple": return {prompt: buildMCQMultiplePrompt(passageText, params.n || 2), convert: convertMCQMultipleQuestions};
    case "matching_info": return {prompt: buildMatchingInfoPrompt(passageText, params.n || 5), convert: convertMatchingInfoQuestions};
    case "matching_headings": return {prompt: buildMatchingHeadingsPrompt(passageText, params.paragraphLabels || "B,C,D,E"), convert: convertMatchingHeadingsQuestions};
    case "matching_features": return {prompt: buildMatchingFeaturesPrompt(passageText, params.n || 5), convert: convertMatchingFeaturesQuestions};
    case "matching_endings": return {prompt: buildMatchingSentenceEndingsPrompt(passageText, params.n || 5), convert: convertMatchingSentenceEndingsQuestions};
    case "sentence_completion": return {prompt: buildSentenceCompletionPrompt(passageText, params.n || 3, params.wordLimit || "NO MORE THAN TWO WORDS"), convert: convertSentenceCompletionQuestions};
    case "summary_completion": return {prompt: buildSummaryCompletionPrompt(passageText, params.startPara || "B", params.endPara || "D", params.n || 5, params.wordLimit || "NO MORE THAN TWO WORDS"), convert: convertSummaryCompletionQuestions};
    case "note_completion": return {prompt: buildStructuredCompletionPrompt(passageText, params.n || 5, params.wordLimit || "NO MORE THAN TWO WORDS", "note"), convert: r => convertStructuredCompletionQuestions(r, "note_completion", wlNum(params.wordLimit))};
    case "table_completion": return {prompt: buildStructuredCompletionPrompt(passageText, params.n || 5, params.wordLimit || "NO MORE THAN TWO WORDS", "table"), convert: r => convertStructuredCompletionQuestions(r, "table_completion", wlNum(params.wordLimit))};
    case "flow_completion": return {prompt: buildStructuredCompletionPrompt(passageText, params.n || 5, params.wordLimit || "NO MORE THAN TWO WORDS", "flow"), convert: r => convertStructuredCompletionQuestions(r, "flow_chart_completion", wlNum(params.wordLimit))};
    case "diagram_completion": return {prompt: buildStructuredCompletionPrompt(passageText, params.n || 5, params.wordLimit || "NO MORE THAN TWO WORDS", "diagram"), convert: r => convertStructuredCompletionQuestions(r, "diagram_label_completion", wlNum(params.wordLimit))};
    case "short_answer": return {prompt: buildShortAnswerPrompt(passageText, params.n || 3, params.wordLimit || "NO MORE THAN THREE WORDS"), convert: convertShortAnswerQuestions};
    default: return null;
  }
}

function extractHeadingOptions(questions) {
  const mq = questions.find(q => q.type === "matching_headings" && Array.isArray(q.options) && q.options.length);
  return mq ? mq.options : [];
}

function getReadingQuestionMix(mode, focusType, questionCount, paragraphLabels, section) {
  const midLabels = paragraphLabels.slice(1, paragraphLabels.length - 1).join(",") || paragraphLabels.join(",");
  const startPara = paragraphLabels[1] || paragraphLabels[0];
  const endPara = paragraphLabels[Math.min(3, paragraphLabels.length - 1)];

  if (mode === "full") {
    if (section === 1) return [
      {type:"tfng", label:"T/F/NG", params:{n:4,nTrue:1,nFalse:2,nNG:1}},
      {type:"mcq", label:"multiple choice", params:{n:3}},
      {type:"short_answer", label:"short answer", params:{n:3,wordLimit:"NO MORE THAN THREE WORDS"}},
      {type:"sentence_completion", label:"sentence completion", params:{n:3,wordLimit:"NO MORE THAN TWO WORDS"}}
    ];
    if (section === 2) return [
      {type:"matching_headings", label:"matching headings", params:{paragraphLabels:midLabels}},
      {type:"summary_completion", label:"summary completion", params:{startPara,endPara,n:5,wordLimit:"NO MORE THAN TWO WORDS"}},
      {type:"mcq", label:"multiple choice", params:{n:3}}
    ];
    return [
      {type:"tfng", label:"T/F/NG", params:{n:5,nTrue:1,nFalse:2,nNG:2}},
      {type:"mcq", label:"multiple choice", params:{n:4}},
      {type:"matching_headings", label:"matching headings", params:{paragraphLabels:midLabels}}
    ];
  }

  // Helper builders for the mix entries
  const tfng = (n, nTrue, nFalse, nNG) => ({type:"tfng",label:"T/F/NG",params:{n,nTrue,nFalse,nNG}});
  const ynng = (n, nY, nN, nNG) => ({type:"ynng",label:"Y/N/NG",params:{n,nTrue:nY,nFalse:nN,nNG}});
  const mcq = (n) => ({type:"mcq",label:"multiple choice",params:{n}});
  const mcqM = (n) => ({type:"mcq_multiple",label:"MCQ multiple",params:{n}});
  const matchInfo = (n) => ({type:"matching_info",label:"matching information",params:{n}});
  const matchHead = () => ({type:"matching_headings",label:"matching headings",params:{paragraphLabels:midLabels}});
  const matchFeat = (n) => ({type:"matching_features",label:"matching features",params:{n}});
  const matchEnd = (n) => ({type:"matching_endings",label:"matching sentence endings",params:{n}});
  const sentComp = (n) => ({type:"sentence_completion",label:"sentence completion",params:{n,wordLimit:"NO MORE THAN TWO WORDS"}});
  const sumComp = (n) => ({type:"summary_completion",label:"summary completion",params:{startPara,endPara,n,wordLimit:"NO MORE THAN TWO WORDS"}});
  const noteComp = (n) => ({type:"note_completion",label:"note completion",params:{n,wordLimit:"NO MORE THAN TWO WORDS"}});
  const tableComp = (n) => ({type:"table_completion",label:"table completion",params:{n,wordLimit:"NO MORE THAN TWO WORDS"}});
  const flowComp = (n) => ({type:"flow_completion",label:"flow-chart completion",params:{n,wordLimit:"NO MORE THAN TWO WORDS"}});
  const diagramComp = (n) => ({type:"diagram_completion",label:"diagram label completion",params:{n,wordLimit:"NO MORE THAN TWO WORDS"}});
  const shortAns = (n) => ({type:"short_answer",label:"short answer",params:{n,wordLimit:"NO MORE THAN THREE WORDS"}});

  const SECTION_MIXES = {
    "mixed": [tfng(4,1,2,1), mcq(4), shortAns(3), sentComp(2)],
    "true_false_not_given": [tfng(7,2,3,2), mcq(3), shortAns(3)],
    "yes_no_not_given": [ynng(7,2,3,2), mcq(3), shortAns(3)],
    "matching_information": [matchInfo(7), mcq(3), shortAns(3)],
    "matching_headings": [matchHead(), sumComp(5), mcq(3)],
    "matching_features": [matchFeat(7), mcq(3), shortAns(3)],
    "matching_sentence_endings": [matchEnd(6), tfng(4,1,2,1), mcq(3)],
    "multiple_choice": [mcq(7), tfng(3,1,1,1), shortAns(3)],
    "multiple_choice_multiple": [mcqM(3), mcq(4), tfng(6,2,2,2)],
    "sentence_completion": [sentComp(6), tfng(4,1,2,1), mcq(3)],
    "summary_completion": [sumComp(6), tfng(4,1,2,1), mcq(3)],
    "note_completion": [noteComp(6), tfng(4,1,2,1), mcq(3)],
    "table_completion": [tableComp(6), tfng(4,1,2,1), mcq(3)],
    "flow_chart_completion": [flowComp(6), tfng(4,1,2,1), mcq(3)],
    "diagram_label_completion": [diagramComp(6), tfng(4,1,2,1), mcq(3)],
    "short_answer": [shortAns(6), tfng(4,1,2,1), mcq(3)],
  };

  if (mode === "section") return SECTION_MIXES[focusType] || SECTION_MIXES["mixed"];

  // Mini mode — scale to questionCount
  const half = Math.ceil(questionCount / 2);
  const rest = questionCount - half;
  const halfT = Math.max(1, Math.floor(half * 0.4));
  const halfF = Math.max(1, Math.floor(half * 0.35));
  const halfNG = Math.max(0, half - halfT - halfF);
  const MINI_MIXES = {
    "mixed": [tfng(half, halfT, halfF, halfNG), mcq(rest)],
    "true_false_not_given": [tfng(half+1, 2, 2, Math.max(0, half-3)), mcq(Math.max(2, rest-1))],
    "yes_no_not_given": [ynng(half+1, 2, 2, Math.max(0, half-3)), mcq(Math.max(2, rest-1))],
    "matching_information": [matchInfo(half+1), mcq(Math.max(2, rest-1))],
    "matching_headings": [matchHead(), mcq(Math.max(3, rest))],
    "matching_features": [matchFeat(half+1), mcq(Math.max(2, rest-1))],
    "matching_sentence_endings": [matchEnd(half), mcq(rest)],
    "multiple_choice": [mcq(half+1), tfng(Math.max(2, rest-1), 1, 1, Math.max(0, rest-3))],
    "multiple_choice_multiple": [mcqM(Math.max(2, Math.floor(questionCount/3))), mcq(Math.ceil(questionCount/2)), tfng(Math.max(2, questionCount-Math.ceil(questionCount/2)-Math.max(2, Math.floor(questionCount/3))), 1, 1, 0)],
    "sentence_completion": [sentComp(half), mcq(rest)],
    "summary_completion": [sumComp(half), mcq(rest)],
    "note_completion": [noteComp(half), mcq(rest)],
    "table_completion": [tableComp(half), mcq(rest)],
    "flow_chart_completion": [flowComp(half), mcq(rest)],
    "diagram_label_completion": [diagramComp(half), mcq(rest)],
    "short_answer": [shortAns(half), mcq(rest)],
  };
  return MINI_MIXES[focusType] || MINI_MIXES["mixed"];
}

// ─── LIBRARY IMPORT CONVERTER (Python tool JSON → app format) ────────────────

function convertToolPassageToApp(toolJson) {
  const passage = toolJson.passage || {};
  const paragraphs = (passage.paragraphs || []).map(p => typeof p === "string" ? p : (p.text || ""));
  const questions = [];
  for (const q of (toolJson.questions || [])) {
    if (q.type === "tfng") {
      questions.push({type:"true_false_not_given",prompt:q.statement||"",answer:q.answer||"NOT GIVEN",explanation:q.evidence?`Paragraph ${q.evidence.paragraph}: ${q.evidence.reasoning||""}`:"",paragraph:q.evidence?.paragraph||"",anchor:(q.evidence?.sentence_quote||"").slice(0,120),trap:q.trap_type||"",skill:"Detail / inference"});
    } else if (q.type === "mcq") {
      const opts = q.options || {};
      const options = Object.entries(opts).map(([k,v])=>`${k}. ${v}`);
      questions.push({type:"multiple_choice",prompt:q.question||"",options,answer:q.answer||"A",explanation:q.evidence?`Paragraph ${q.evidence.paragraph}: ${q.evidence.why_correct||""}`:"",paragraph:q.evidence?.paragraph||"",anchor:(q.evidence?.sentence_quote||"").slice(0,120),trap:"",skill:"Comprehension"});
    } else if (q.type === "matching_headings") {
      const headingsList = (q.headings_list||[]).map(h=>`${h.roman}. ${h.text}`);
      for (const m of (q.matches||[])) {
        questions.push({type:"matching_headings",prompt:`Paragraph ${m.paragraph}`,options:headingsList,answer:m.correct_heading||"",explanation:m.why||"",paragraph:m.paragraph||"",anchor:"",trap:m.tempting_distractor?`Distractor: ${m.tempting_distractor}`:"",skill:"Main idea"});
      }
    } else if (q.type === "summary_completion") {
      const inst = q.instruction || "Complete the summary. Use NO MORE THAN TWO WORDS from the passage.";
      const summaryText = q.summary_text || "";
      for (const b of (q.blanks||[])) {
        const sentences = summaryText.split(/(?<=[.!?])\s+/);
        const blankMarker = `[${b.number}]___`;
        const ctx = sentences.find(s=>s.includes(blankMarker)) || `See summary: ${blankMarker}`;
        questions.push({type:"summary_completion",prompt:ctx,instruction:inst,answer:b.answer||"",wordLimit:2,explanation:`Paragraph ${b.evidence_paragraph}: ${b.evidence_sentence||""}`,paragraph:b.evidence_paragraph||"",anchor:(b.evidence_sentence||"").slice(0,120),trap:"",skill:"Summary comprehension",group:summaryText});
      }
    } else if (q.type === "sentence_completion") {
      const inst = q.instruction || "Complete the sentences. Use NO MORE THAN TWO WORDS from the passage.";
      for (const sq of (q.questions||[])) {
        questions.push({type:"sentence_completion",prompt:sq.sentence_with_blank||"",instruction:inst,answer:sq.answer||"",wordLimit:2,explanation:sq.evidence?`Paragraph ${sq.evidence.paragraph}: ${sq.evidence.paraphrase_check||""}`:"",paragraph:sq.evidence?.paragraph||"",anchor:(sq.evidence?.sentence_quote||"").slice(0,120),trap:"",skill:"Detail and vocabulary"});
      }
    } else if (q.type === "short_answer") {
      const inst = q.instruction || "Answer the questions. Use NO MORE THAN THREE WORDS from the passage.";
      for (const sq of (q.questions||[])) {
        questions.push({type:"short_answer",prompt:sq.question||"",instruction:inst,answer:sq.answer||"",acceptedAnswers:sq.alternative_answers||[],wordLimit:3,explanation:sq.evidence?`Paragraph ${sq.evidence.paragraph}: ${(sq.evidence.sentence_quote||"").slice(0,100)}`:"",paragraph:sq.evidence?.paragraph||"",anchor:(sq.evidence?.sentence_quote||"").slice(0,100),trap:"",skill:"Fact retrieval"});
      }
    }
  }
  return {
    mode: "section",
    title: passage.title || toolJson.id || "Imported Passage",
    durationSeconds: 1200,
    sourcePolicy: READING_SOURCE_POLICY,
    importedFrom: "reading-tool",
    importedId: toolJson.id,
    sections: [{
      id: "section-1",
      passage: {title:passage.title||"",topic:(passage.topic_tags||[]).join(", ")||"Academic",level:`Band ${passage.estimated_band||7.0}`,sourceNote:READING_SOURCE_POLICY,paragraphs},
      headings: [],
      features: [],
      questions,
      vocabulary: []
    }]
  };
}

// ─── DATASET HELPERS (few-shot bank built from saved passages) ───────────────

function formatFewShotPassage(entry) {
  if (!entry?.testData?.sections?.[0]) return "";
  const passage = entry.testData.sections[0].passage || {};
  const paragraphs = passage.paragraphs || [];
  const labels = entry.paragraphLabels || paragraphs.map((_, i) => String.fromCharCode(65 + i));
  return `TITLE: ${entry.title || passage.title || "Untitled"}\n\n` +
    paragraphs.map((text, i) => `[Paragraph ${labels[i] || String.fromCharCode(65+i)}]\n${text}`).join("\n\n");
}

function pickFewShotExamples(dataset, topic, section, count) {
  const want = Math.max(0, count || 1);
  if (want === 0) return [];
  const available = (dataset || []).filter(e => e && e.useAsFewShot !== false && e.testData?.sections?.[0]);
  if (available.length === 0) return [];
  const topicLower = String(topic || "").toLowerCase();
  const topicMatches = available.filter(e =>
    String(e.topic || "").toLowerCase().includes(topicLower) ||
    (e.topicTags || []).some(t => topicLower.includes(String(t).toLowerCase()) || String(t).toLowerCase().includes(topicLower))
  );
  const sectionMatches = available.filter(e => e.section === section);
  // Prefer matches on topic, then section, then anything
  const pool = topicMatches.length > 0 ? topicMatches : (sectionMatches.length > 0 ? sectionMatches : available);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, want);
}

function sectionFromBand(level) {
  const n = parseFloat(String(level || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return 2;
  return n >= 8 ? 3 : n >= 7 ? 2 : 1;
}

function buildDatasetEntryFromCompleteTest(testData, source="imported") {
  const sections = Array.isArray(testData?.sections) ? testData.sections : [];
  if (!sections.length) return null;
  const paragraphs = sections.flatMap(section=>section?.passage?.paragraphs || section?.paragraphs || []);
  const wordCount = paragraphs.reduce((sum,p)=>sum+(typeof p==="string" ? p.trim().split(/\s+/).filter(Boolean).length : 0),0);
  const questions = sections.flatMap(section=>section?.questions || []);
  const first = sections[0] || {};
  const firstPassage = first.passage || {};
  const topics = sections.map(section=>section?.passage?.topic || section?.topic || "").filter(Boolean);
  const tags = [...new Set(sections.flatMap(section=>section?.passage?.topic_tags || section?.topicTags || []).filter(Boolean))];
  return {
    id: `${source}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}_complete`,
    source,
    title: testData.title || first.title || firstPassage.title || "Imported Reading Test",
    topic: topics.join(", ") || "Academic",
    topicTags: tags,
    level: firstPassage.level || first.level || "",
    section: sections.length===1 ? sectionFromBand(firstPassage.level || first.level) : "multi",
    passageCount: sections.length,
    questionCount: questions.length,
    wordCount,
    paragraphLabels: (firstPassage.paragraphs || first.paragraphs || []).map((_,i)=>String.fromCharCode(65+i)),
    testData,
    useAsFewShot: true,
    createdAt: new Date().toISOString()
  };
}

function buildDatasetEntryFromTest(testData, source, sectionIdx) {
  const idx = sectionIdx || 0;
  const section = testData?.sections?.[idx];
  if (!section) return null;
  const passage = section.passage || {};
  const paragraphs = passage.paragraphs || [];
  const wordCount = paragraphs.reduce((sum, p) => sum + (typeof p === "string" ? p.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  return {
    id: `${source}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}_${idx}`,
    source,
    title: section.title || passage.title || testData.title || "Untitled",
    topic: passage.topic || section.topic || "",
    topicTags: passage.topic_tags || [],
    level: passage.level || section.level || "",
    section: sectionFromBand(passage.level || section.level),
    questionCount: (section.questions || []).length,
    wordCount,
    paragraphLabels: paragraphs.map((_, i) => String.fromCharCode(65 + i)),
    testData: {
      mode: "section",
      title: section.title || passage.title || "Untitled",
      durationSeconds: 1200,
      sourcePolicy: testData.sourcePolicy || READING_SOURCE_POLICY,
      sections: [{...section, id: "section-1"}]
    },
    useAsFewShot: true,
    createdAt: new Date().toISOString()
  };
}

// ─── WIKIPEDIA SOURCING (CORS-enabled REST API) ──────────────────────────────

async function fetchWikipediaSource(subject) {
  const query = String(subject || "").trim();
  if (!query) throw new Error("No subject provided.");
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
  let searchData;
  try {
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`Wikipedia search HTTP ${searchRes.status}`);
    searchData = await searchRes.json();
  } catch(e) { throw new Error(`Wikipedia search failed: ${e.message}`); }
  const title = searchData?.[1]?.[0];
  const url = searchData?.[3]?.[0];
  if (!title) throw new Error(`No Wikipedia article found for "${query}". Try a more specific term.`);
  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exlimit=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*&redirects=1`;
  let extractData;
  try {
    const extractRes = await fetch(extractUrl);
    if (!extractRes.ok) throw new Error(`Wikipedia fetch HTTP ${extractRes.status}`);
    extractData = await extractRes.json();
  } catch(e) { throw new Error(`Wikipedia fetch failed: ${e.message}`); }
  const pages = extractData?.query?.pages || {};
  const page = Object.values(pages)[0];
  const text = String(page?.extract || "").trim();
  if (text.length < 1000) throw new Error(`Wikipedia article "${title}" has too little content (${text.length} chars) for a reliable source.`);
  return { title, url: url || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, text: text.slice(0, 8000) };
}

// ─── AI-TELL DETECTION + AUTO-RETRY ──────────────────────────────────────────

const AI_TELL_PATTERNS = [
  {re: /\bit is important to note\b/i, label: "it is important to note"},
  {re: /\bit should be noted\b/i, label: "it should be noted"},
  {re: /\bin conclusion\b/i, label: "in conclusion"},
  {re: /\bto conclude\b/i, label: "to conclude"},
  {re: /\bfirst and foremost\b/i, label: "first and foremost"},
  {re: /\bin today'?s (?:fast-paced|modern|increasingly|ever-changing)\b/i, label: "in today's [modern/fast-paced] ..."},
  {re: /\bdelve(?:s|d|ing)?\s+into\b/i, label: "delve into"},
  {re: /\btapestry of\b/i, label: "tapestry of"},
  {re: /\bin the realm of\b/i, label: "in the realm of"},
  {re: /\bnavigat(?:e|es|ing) the (?:complexities|challenges|landscape)\b/i, label: "navigate the complexities"},
  {re: /\bunderscores? the (?:importance|need|significance)\b/i, label: "underscores the importance"},
  {re: /\bplays? a (?:crucial|vital|pivotal|key|significant) role in\b/ig, label: "plays a crucial role in (overused)", threshold: 2},
  {re: /\bmoreover\b/ig, label: "moreover (overused)", threshold: 3},
  {re: /\bfurthermore\b/ig, label: "furthermore (overused)", threshold: 3},
];

function detectAITells(text) {
  const hits = [];
  for (const {re, label, threshold} of AI_TELL_PATTERNS) {
    if (threshold) {
      const matches = String(text).match(re);
      if (matches && matches.length >= threshold) hits.push(`${label} ×${matches.length}`);
    } else {
      const m = String(text).match(re);
      if (m) hits.push(label);
    }
  }
  return hits;
}

function normalizeReadingMarkText(text) {
  return String(text||"").trim().replace(/\s+/g," ").toLowerCase();
}

function readingMarkMatchesSelection(selectionText, markText) {
  const selected = normalizeReadingMarkText(selectionText);
  const mark = normalizeReadingMarkText(markText);
  return !!selected && !!mark && (selected === mark || selected.includes(mark) || mark.includes(selected));
}

function addReadingHighlights(text, marks, onMarkClick) {
  const terms = (marks||[])
    .map(m=>typeof m === "string" ? {text:m,type:"highlight"} : m)
    .map(m=>({...m,text:String(m?.text||"").trim()}))
    .filter(m=>m.text.length >= 3)
    .slice(-18);
  if (!terms.length) return text;
  let parts = [{text,mark:false}];
  terms.forEach(term=>{
    const lowerTerm = term.text.toLowerCase();
    parts = parts.flatMap(part=>{
      if (part.mark) return [part];
      const lower = part.text.toLowerCase();
      const out = [];
      let pos = 0, idx = lower.indexOf(lowerTerm);
      while (idx >= 0) {
        if (idx > pos) out.push({text:part.text.slice(pos,idx),mark:false});
        out.push({text:part.text.slice(idx,idx+term.text.length),mark:true,type:term.type||"highlight",note:term.note||"",id:term.id||"",sectionId:term.sectionId||"",sourceText:term.text});
        pos = idx + term.text.length;
        idx = lower.indexOf(lowerTerm,pos);
      }
      if (pos < part.text.length) out.push({text:part.text.slice(pos),mark:false});
      return out.length ? out : [part];
    });
  });
  return parts.map((p,i)=>{
    if (!p.mark) return <React.Fragment key={i}>{p.text}</React.Fragment>;
    const interactive = !!onMarkClick;
    const openMark = (e) => {
      if (!interactive) return;
      e.preventDefault();
      e.stopPropagation();
      onMarkClick(p,e);
    };
    return <mark
      key={i}
      id={p.id?`reading-mark-${p.id}`:undefined}
      className={`reading-mark ${p.type==="note"?"reading-note-mark":"reading-highlight-mark"}`}
      title={p.note||""}
      role={interactive?"button":undefined}
      tabIndex={interactive?0:undefined}
      onClick={openMark}
      onKeyDown={interactive?(e)=>{ if (e.key==="Enter"||e.key===" ") openMark(e); }:undefined}
    >{p.text}</mark>;
  });
}

function readingQuestionGroups(questions) {
  const groups = [];
  (questions||[]).forEach(q=>{
    const key = q.group || q.type || "reading";
    const last = groups[groups.length-1];
    if (!last || last.key !== key) groups.push({key,type:q.type,label:q.group || readingTypeLabel(q.type),questions:[q]});
    else last.questions.push(q);
  });
  return groups;
}

function readingOptionParts(option) {
  const text = String(option||"").trim();
  const value = readingChoiceValue(text);
  const m = text.match(/^([A-Z]|[ivxlcdm]+)\s*[\.\)]\s*(.*)$/i);
  return {value, label:m ? (m[2] || text) : text, raw:text};
}

function ReadingSegmentedAnswer({options,value,onChange,disabled,variant=""}) {
  return <div className={`reading-segmented ${variant}`}>
    {options.map(opt=>{
      const selected = String(value||"") === String(opt);
      return <button type="button" key={opt} data-answer-value={opt} className={selected?"selected":""} disabled={disabled} onClick={()=>onChange(opt)}>{opt}</button>;
    })}
  </div>;
}

function ReadingOptionCards({options,value,onChange,disabled,mode="radio"}) {
  const values = mode==="checkbox" ? (Array.isArray(value) ? value : splitReadingAnswerList(value)) : [];
  return <div className={`reading-option-cards ${mode}`}>
    {(options||[]).map(opt=>{
      const p = readingOptionParts(opt);
      const selected = mode==="checkbox" ? values.includes(p.value) : String(value||"") === String(p.value);
      return <button type="button" key={p.raw} data-answer-value={p.value} className={`reading-choice-card ${selected?"selected":""}`} disabled={disabled} onClick={()=>{
        if (mode==="checkbox") onChange(selected ? values.filter(x=>x!==p.value) : [...values,p.value]);
        else onChange(p.value);
      }}>
        <span className="reading-choice-key">{p.value}</span>
        <span className="reading-choice-text">{p.label}</span>
      </button>;
    })}
  </div>;
}

function ReadingHeadingPicker({question,section,value,onChange,disabled}) {
  const options = readingSelectOptions(question, section);
  return <div className="reading-heading-picker">
    {options.map(opt=>{
      const p = readingOptionParts(opt);
      const selected = String(value||"") === String(p.value);
      return <button type="button" key={p.raw} data-answer-value={p.value} className={selected?"selected":""} disabled={disabled} onClick={()=>onChange(p.value)}>
        <span>{p.value}</span>
        <strong>{p.label}</strong>
      </button>;
    })}
  </div>;
}

function ReadingSelectAnswer({options,value,onChange,disabled,placeholder="Choose"}) {
  return <select className="reading-answer-select" value={String(value||"")} disabled={disabled} onChange={e=>onChange(e.target.value)}>
    <option value="">{placeholder}</option>
    {options.map(opt=>{
      const p = readingOptionParts(opt);
      return <option key={p.raw} value={p.value}>{p.raw}</option>;
    })}
  </select>;
}

function ReadingLetterPicker({options,value,onChange,disabled,variant=""}) {
  return <div className={`reading-letter-picker ${variant}`}>
    {(options||[]).map(opt=>{
      const p = readingOptionParts(opt);
      const selected = String(value||"") === String(p.value);
      return <button
        type="button"
        key={p.raw}
        className={selected?"selected":""}
        title={p.raw}
        aria-label={p.raw}
        disabled={disabled}
        onClick={()=>onChange(p.value)}
      >{p.value}</button>;
    })}
  </div>;
}

function ReadingMatchingHeadingAnswer({question,section,value,onChange,disabled}) {
  const options = readingSelectOptions(question, section);
  return <div className="reading-matching-row heading">
    <div className="reading-match-stem">{question.prompt}</div>
    <ReadingSelectAnswer options={options} value={value} onChange={onChange} disabled={disabled} placeholder="Heading"/>
  </div>;
}

function ReadingMatchingInfoAnswer({question,section,value,onChange,disabled}) {
  const options = readingSelectOptions(question, section);
  return <div className="reading-matching-row info">
    <div className="reading-match-label">Paragraph</div>
    <ReadingLetterPicker options={options} value={value} onChange={onChange} disabled={disabled} variant="paragraphs"/>
  </div>;
}

function ReadingMatchingFeatureAnswer({question,section,value,onChange,disabled}) {
  return <ReadingLetterPicker options={readingSelectOptions(question, section)} value={value} onChange={onChange} disabled={disabled} variant="features"/>;
}

function ReadingMatchingEndingAnswer({question,section,value,onChange,disabled}) {
  return <div className="reading-ending-answer">
    <div className="reading-ending-stem">{question.prompt}</div>
    <ReadingLetterPicker options={readingSelectOptions(question, section)} value={value} onChange={onChange} disabled={disabled} variant="endings"/>
  </div>;
}

function ReadingCompletionInput({question,value,onChange,disabled}) {
  const wordLimit = readingWordLimit(question);
  const placeholder = wordLimit ? `${wordLimit} word${wordLimit>1?"s":""} max` : "answer";
  return <input className="reading-answer-input" type="text" value={String(value||"")} onChange={e=>onChange(e.target.value)} disabled={disabled} placeholder={placeholder}/>;
}

function ReadingInlineCompletion({question,value,onChange,disabled}) {
  const parts = String(question.prompt||"").split(/_{2,}|\[[^\]]*\]/);
  if (parts.length < 2) return <div className="reading-completion-line"><span>{question.prompt}</span><ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/></div>;
  return <div className="reading-completion-line">
    <span>{parts[0]}</span>
    <ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/>
    <span>{parts.slice(1).join(" ")}</span>
  </div>;
}

function ReadingCompletionFrame({question,value,onChange,disabled,kind}) {
  const label = {
    summary_completion:"Summary",
    note_completion:"Notes",
    table_completion:"Table",
    flow_chart_completion:"Flow chart",
    diagram_label_completion:"Diagram label"
  }[kind] || "Completion";
  return <div className={`reading-completion-frame ${kind}`}>
    <div className="reading-completion-title">{label}</div>
    <div className="reading-completion-content">
      <span>{question.prompt}</span>
      <ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/>
    </div>
  </div>;
}

function ReadingShortAnswer({question,value,onChange,disabled}) {
  return <div className="reading-short-answer">
    <div className="reading-short-label">Answer</div>
    <ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/>
  </div>;
}

function ReadingAnswerControl({question,section,value,onChange,submitted}) {
  const disabled = !!submitted;
  const type = question.type;
  if (type === "true_false_not_given") return <ReadingSegmentedAnswer options={["TRUE","FALSE","NOT GIVEN"]} value={value} onChange={onChange} disabled={disabled} variant="tfng"/>;
  if (type === "yes_no_not_given") return <ReadingSegmentedAnswer options={["YES","NO","NOT GIVEN"]} value={value} onChange={onChange} disabled={disabled} variant="tfng"/>;
  if (type === "matching_information") return <ReadingMatchingInfoAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "matching_headings") return <ReadingMatchingHeadingAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "matching_features") return <ReadingMatchingFeatureAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "matching_sentence_endings") return <ReadingMatchingEndingAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "multiple_choice") return <ReadingOptionCards options={question.options||[]} value={value} onChange={onChange} disabled={disabled} mode="radio"/>;
  if (type === "multiple_choice_multiple") return <ReadingOptionCards options={question.options||[]} value={value} onChange={onChange} disabled={disabled} mode="checkbox"/>;
  if (type === "sentence_completion") return <ReadingInlineCompletion question={question} value={value} onChange={onChange} disabled={disabled}/>;
  if (["summary_completion","note_completion","table_completion","flow_chart_completion","diagram_label_completion"].includes(type)) return <ReadingCompletionFrame question={question} value={value} onChange={onChange} disabled={disabled} kind={type}/>;
  if (type === "short_answer") return <ReadingShortAnswer question={question} value={value} onChange={onChange} disabled={disabled}/>;
  return <ReadingShortAnswer question={question} value={value} onChange={onChange} disabled={disabled}/>;
}

function ReadingQuestion({question,section,value,onChange,submitted,onToggleFlag,flagged,config,onStrategyFocus}) {
  const [showStrategy,setShowStrategy] = useState(false);
  const strategyItem = readingStrategyItemForType(question.type);
  const correct = submitted && isReadingAnswerCorrect(question,value);
  const wrong = submitted && !correct;
  const type = question.type;
  const answerValue = value ?? (type==="multiple_choice_multiple" ? [] : "");
  const statusClass = submitted ? (correct ? "correct" : "wrong") : "";
  const promptInsideControl = ["matching_headings","matching_sentence_endings","sentence_completion","summary_completion","note_completion","table_completion","flow_chart_completion","diagram_label_completion"].includes(type);
  return <div id={`reading-q-${question.id}`} className={`reading-q ${statusClass} ${flagged?"flagged":""}`}>
    <div className="reading-q-num">{question.number}</div>
    <div className="reading-q-body">
      <div className="reading-q-top">
        <div className="reading-q-meta">
          <span>{readingTypeLabel(type)}</span>
          {question.paragraph&&<span>Paragraph {question.paragraph}</span>}
        </div>
        <div className="reading-q-actions">
          {submitted&&<span className={`reading-status ${correct?"ok":"bad"}`}>{correct?"correct":"review"}</span>}
          {strategyItem&&<button className={`reading-flag ${showStrategy?"active":""}`} onClick={()=>{ const n=!showStrategy; setShowStrategy(n); if(onStrategyFocus) onStrategyFocus(n?question:null,section); }} title="Show the strategy + scan this question's paragraph in the passage">{showStrategy?"Hide strategy":"🎯 Strategy"}</button>}
          <button className={`reading-flag ${flagged?"active":""}`} onClick={()=>onToggleFlag(question.id)} disabled={submitted} title="Flag for review">{flagged?"Flagged":"Flag"}</button>
        </div>
      </div>
      {question.instruction&&<div className="reading-instruction">{question.instruction}</div>}
      {!promptInsideControl&&<div className="reading-prompt">{question.prompt}</div>}
      <ReadingAnswerControl question={question} section={section} value={answerValue} onChange={onChange} submitted={submitted}/>
      {submitted&&<div className="reading-feedback">
        <strong>Answer: {Array.isArray(question.answer)?question.answer.join(", "):question.answer}</strong>
        {question.explanation&&<span> - {question.explanation}</span>}
        {question.anchor&&<div className="reading-anchor">Evidence: "{question.anchor}"</div>}
        {wrong&&question.trap&&<div className="reading-trap">Trap: {question.trap}</div>}
      </div>}
      {showStrategy&&strategyItem&&<div style={{marginTop:10}}><ReadingQuestionStrategy question={question} section={section} item={strategyItem} submitted={submitted} onFocus={()=>onStrategyFocus&&onStrategyFocus(question,section)}/></div>}
    </div>
  </div>;
}

function ReadingAnswerSheet({testData,answers,result,flags,activeSection,setActiveSection}) {
  if (!testData) return null;
  const answered = testData.questions.filter(q=>{
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : !!String(v||"").trim();
  }).length;
  const jump = (q) => {
    setActiveSection(q.sectionIndex);
    setTimeout(()=>document.getElementById(`reading-q-${q.id}`)?.scrollIntoView({behavior:"smooth",block:"center"}),80);
  };
  return <div className="reading-sheet">
    <div className="reading-sheet-top">
      <span>Answer Sheet</span>
      <strong>{answered}/{testData.questions.length}</strong>
    </div>
    <div className="reading-sheet-grid">
      {testData.questions.map(q=>{
        const v = answers[q.id];
        const has = Array.isArray(v) ? v.length > 0 : !!String(v||"").trim();
        const d = result?.details?.find(x=>x.id===q.id);
        const classes = [
          "reading-sheet-btn",
          q.sectionIndex===activeSection ? "active" : "",
          has ? "answered" : "",
          flags[q.id] ? "flagged" : "",
          d ? (d.correct ? "correct" : "wrong") : ""
        ].filter(Boolean).join(" ");
        return <button key={q.id} onClick={()=>jump(q)} className={classes}>{q.number}</button>;
      })}
    </div>
  </div>;
}

function ReadingSelectionToolbar({selection,onHighlight,onUnhighlight,onNote,onClose}) {
  if (!selection) return null;
  return <div className="reading-selection-toolbar" style={{left:selection.x,top:selection.y}} onMouseDown={e=>e.preventDefault()}>
    {selection.canUnhighlight
      ? <button type="button" className="danger" onClick={onUnhighlight}>Unhighlight</button>
      : <button type="button" onClick={onHighlight}>Highlight</button>}
    <button type="button" onClick={onNote}>Note</button>
    <button type="button" className="icon" onClick={onClose}>x</button>
  </div>;
}

function ReadingMarkPopover({mark,onUnhighlight,onClose}) {
  if (!mark) return null;
  return <div className={`reading-mark-popover ${mark.type==="note"?"note":""}`} style={{left:mark.x,top:mark.y}} onMouseDown={e=>e.stopPropagation()}>
    <div className="reading-mark-popover-text">"{mark.text}"</div>
    {mark.type==="note"&&<p>{mark.note}</p>}
    <div className="reading-mark-popover-actions">
      {mark.type==="highlight"&&<button type="button" className="danger" onClick={onUnhighlight}>Unhighlight</button>}
      <button type="button" onClick={onClose}>Close</button>
    </div>
  </div>;
}

// R12 — Reading scan / paraphrase-match micro-drill. Offline, no AI: read a paraphrased
// prompt, click the sentence in the paragraph it matches. Trains scanning + paraphrase
// recognition (the core Reading skill). Self-contained state.
const SCAN_DRILL_BANK = [
  {topic:"Urban wetlands", sentences:[
    "For much of the twentieth century, city wetlands were drained, filled, or hidden behind industrial land.",
    "Restored wetlands can store rainwater during storms and filter pollutants before they reach rivers.",
    "They cannot replace engineered drainage entirely, but they do reduce the pressure on it.",
    "Some residents worry about mosquitoes, though this is usually caused by poor water movement.",
    "The most effective schemes treat wetlands as working parts of the city, not decoration."
  ], prompts:[
    {prompt:"Which sentence says wetlands used to be removed or covered up?", answer:0},
    {prompt:"Which sentence says wetlands ease the load on built drainage systems?", answer:2},
    {prompt:"Which sentence links mosquito problems to water that does not move well?", answer:3}
  ]},
  {topic:"Remote work", sentences:[
    "The shift to remote work accelerated sharply after 2020 as companies adopted video tools.",
    "Employees often report saving time and money by avoiding the daily commute.",
    "However, some managers argue that spontaneous collaboration suffers when teams are apart.",
    "Studies suggest productivity can rise for focused tasks but fall for creative teamwork.",
    "Many firms have therefore settled on hybrid arrangements as a compromise."
  ], prompts:[
    {prompt:"Which sentence says working from home grew quickly after a particular year?", answer:0},
    {prompt:"Which sentence claims teamwork on creative tasks may decline?", answer:3},
    {prompt:"Which sentence gives the managers' worry about being apart?", answer:2}
  ]},
  {topic:"Sleep", sentences:[
    "Adults are generally advised to get between seven and nine hours of sleep each night.",
    "Short-term sleep loss impairs concentration and slows reaction times.",
    "Over longer periods, poor sleep is linked to weaker immune function and weight gain.",
    "Screens before bed can delay sleep by suppressing the hormone melatonin.",
    "Experts recommend a consistent schedule and a dark, cool bedroom."
  ], prompts:[
    {prompt:"Which sentence connects ongoing poor sleep to problems like weight gain?", answer:2},
    {prompt:"Which sentence explains how devices at night interfere with falling asleep?", answer:3},
    {prompt:"Which sentence gives the recommended nightly sleep range?", answer:0}
  ]}
];
function ReadingScanDrill({defaultOpen}) {
  const [open,setOpen] = useState(!!defaultOpen);
  const [round,setRound] = useState(null);
  const [pIdx,setPIdx] = useState(0);
  const [picked,setPicked] = useState(null);
  const [score,setScore] = useState(0);
  const [done,setDone] = useState(false);
  const [secs,setSecs] = useState(0);
  const [running,setRunning] = useState(false);
  const tRef = useRef(null);
  useEffect(()=>()=>clearInterval(tRef.current),[]);
  const start = ()=>{
    const r = SCAN_DRILL_BANK[Math.floor(Math.random()*SCAN_DRILL_BANK.length)];
    setRound(r); setPIdx(0); setPicked(null); setScore(0); setDone(false); setSecs(0); setRunning(true);
    clearInterval(tRef.current); tRef.current=setInterval(()=>setSecs(s=>s+1),1000);
  };
  const stopTimer = ()=>{ clearInterval(tRef.current); setRunning(false); };
  const prompt = round?.prompts[pIdx];
  const pick = (i)=>{ if(picked!==null||!prompt) return; setPicked(i); if(i===prompt.answer) setScore(s=>s+1); };
  const next = ()=>{ if(!round) return; if(pIdx+1>=round.prompts.length){ setDone(true); stopTimer(); return; } setPIdx(pIdx+1); setPicked(null); };
  return <div className="card mb14" style={{borderLeft:"2px solid var(--leaf)"}}>
    <div className="card-h" style={{cursor:"pointer",margin:0}} onClick={()=>setOpen(o=>!o)}>
      <div className="cdot" style={{background:"var(--leaf)"}}/>Scan &amp; paraphrase drill {open?"▾":"▸"}
    </div>
    {open&&<div style={{marginTop:10}}>
      <div className="why" style={{marginBottom:10}}>Read the clue, then click the sentence it paraphrases. Builds scanning speed + paraphrase recognition — no AI needed.</div>
      {!round||done
        ? <div>
            {done&&<div style={{margin:"4px 0 10px",fontSize:14,color:"var(--ink)"}}>Score: <strong style={{color:score>=round.prompts.length-1?"var(--leaf)":score>=Math.ceil(round.prompts.length/2)?"var(--honey)":"var(--rose)"}}>{score} / {round.prompts.length}</strong> · {secs}s</div>}
            <button className="btn bp bsm" onClick={start}>{done?"↻ New paragraph":"Start drill"}</button>
          </div>
        : <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>{round.topic} · clue {pIdx+1}/{round.prompts.length}</span>
              <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>{secs}s · {score} ✓</span>
            </div>
            <div style={{fontSize:13,color:"var(--ink)",fontWeight:600,marginBottom:10,lineHeight:1.5}}>{prompt.prompt}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {round.sentences.map((s,i)=>{
                const isAns = i===prompt.answer;
                const chosen = picked===i;
                let bd="var(--border)", bg="var(--surface)";
                if(picked!==null){ if(isAns){bd="var(--leaf)";bg="color-mix(in srgb,var(--leaf) 12%,var(--surface))";} else if(chosen){bd="var(--rose)";bg="color-mix(in srgb,var(--rose) 12%,var(--surface))";} }
                return <button key={i} onClick={()=>pick(i)} disabled={picked!==null}
                  style={{textAlign:"left",fontSize:12.5,lineHeight:1.55,color:"var(--ink2)",background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:"8px 11px",cursor:picked!==null?"default":"pointer"}}>{s}</button>;
              })}
            </div>
            {picked!==null&&<div style={{display:"flex",gap:10,alignItems:"center",marginTop:10,flexWrap:"wrap"}}>
              <span style={{fontSize:12.5,color:picked===prompt.answer?"var(--leaf)":"var(--rose)"}}>{picked===prompt.answer?"✓ Correct":"✗ The highlighted sentence is the match"}</span>
              <button className="btn bp bsm" onClick={next}>{pIdx+1>=round.prompts.length?"Finish":"Next clue →"}</button>
            </div>}
          </div>}
    </div>}
  </div>;
}

// #6 — Notes drawer: all notes across passages with jump-to-mark, delete, and copy-all.
function ReadingNotesDrawer({open, onClose, notesBySection, sections, onJump, onDelete}) {
  if (!open) return null;
  const groups = (sections||[]).map((sec,idx)=>({sec,idx,items:(notesBySection?.[sec.id]||[])})).filter(g=>g.items.length>0);
  const total = groups.reduce((n,g)=>n+g.items.length,0);
  const copyAll = () => {
    const text = groups.map(g=>`# Passage ${g.idx+1}: ${g.sec.title}\n`+g.items.map(it=>`- "${it.text}" — ${it.note}`).join("\n")).join("\n\n");
    try { navigator.clipboard?.writeText(text); } catch(e){}
  };
  return <div className="reading-notes-drawer-overlay" onMouseDown={onClose}>
    <div className="reading-notes-drawer" onMouseDown={e=>e.stopPropagation()}>
      <div className="reading-notes-drawer-head">
        <strong>Notes ({total})</strong>
        <div style={{display:"flex",gap:6}}>
          {total>0&&<button className="reading-control-btn muted" onClick={copyAll}>Copy all</button>}
          <button className="reading-control-btn muted" onClick={onClose}>Close</button>
        </div>
      </div>
      {total===0
        ? <div className="empty" style={{padding:24}}>No notes yet. Select text in a passage and choose <strong>Note</strong>.</div>
        : <div className="reading-notes-drawer-body">
            {groups.map(g=><div key={g.sec.id} className="reading-notes-drawer-group">
              <div className="reading-notes-drawer-passage">Passage {g.idx+1}: {g.sec.title}</div>
              {g.items.map(it=><div key={it.id} className="reading-notes-drawer-item">
                <div className="reading-notes-drawer-quote" onClick={()=>onJump(g.idx,it)} title="Jump to this mark">"{it.text}"</div>
                <div className="reading-notes-drawer-note">{it.note}</div>
                <div className="reading-notes-drawer-actions">
                  <button onClick={()=>onJump(g.idx,it)}>Jump</button>
                  <button className="danger" onClick={()=>onDelete(g.sec.id,it.id)}>Delete</button>
                </div>
              </div>)}
            </div>)}
          </div>}
    </div>
  </div>;
}

function ReadingPassage({section,highlights,notes,onSelection,onMarkClick,onClearHighlights,spotlight}) {
  useEffect(()=>{
    if (!spotlight || spotlight.sectionId !== section.id || spotlight.paraIdx==null || spotlight.paraIdx<0) return;
    const el = document.getElementById(`rpara-${section.id}-${spotlight.paraIdx}`);
    if (el) { try { el.scrollIntoView({behavior:"smooth",block:"center"}); } catch { el.scrollIntoView(); } }
  },[spotlight?.nonce]);
  const snippets = highlights?.[section.id] || [];
  const sectionNotes = notes?.[section.id] || [];
  const marks = [
    ...sectionNotes.map(n=>({text:n.text,type:"note",note:n.note,id:n.id,sectionId:section.id})),
    ...snippets.map((s,i)=>typeof s === "string" ? {text:s,type:"highlight",id:`highlight-${i}`,sectionId:section.id} : {...s,type:s.type||"highlight",id:s.id||`highlight-${i}`,sectionId:section.id})
  ];
  return <div className="reading-passage-pane">
    <div className="reading-pane-head">
      <div>
        <div className="reading-pane-label">Passage {section.number}</div>
        <div className="reading-passage-title">{section.title}</div>
        <div className="reading-passage-source">{section.sourceNote}</div>
      </div>
      <div className="reading-pane-actions">
        {(snippets.length>0||sectionNotes.length>0)&&<button className="reading-tool-btn muted" onClick={onClearHighlights}>Clear marks</button>}
      </div>
    </div>
    <div className="reading-passage-body" onMouseUp={onSelection} onTouchEnd={onSelection}>
      {section.paragraphs.map((p,i)=>{
        const isSpot = spotlight && spotlight.sectionId===section.id && spotlight.paraIdx===i;
        return <p key={i} id={`rpara-${section.id}-${i}`} className={isSpot?"rs-scanning":""}>
          {isSpot && <span className="rs-scanline"/>}
          <strong>Paragraph {paragraphLetter(i)} </strong>
          {isSpot ? _strategyHighlightParagraph(p, spotlight.anchor, spotlight.keywords, spotlight.answer) : addReadingHighlights(p,marks,onMarkClick)}
        </p>;
      })}
    </div>
    {section.vocabulary?.length>0&&<div className="reading-glossary">
      <div className="reading-bank-title">Glossary</div>
      <div className="reading-bank-items">{section.vocabulary.map((v,i)=><span key={i}>{v.word}: {v.meaning}</span>)}</div>
    </div>}
    {sectionNotes.length>0&&<div className="reading-notes-panel">
      <div className="reading-bank-title">Notes</div>
      {sectionNotes.map((n,i)=><div key={n.id||i} className="reading-note-item">
        <div>"{n.text}"</div>
        <p>{n.note}</p>
      </div>)}
    </div>}
  </div>;
}

function ReadingBank({title,items}) {
  if (!items?.length) return null;
  return <div className="reading-bank">
    <div className="reading-bank-title">{title}</div>
    <div className="reading-bank-list">{items.map((h,i)=><div key={i}>{h}</div>)}</div>
  </div>;
}

function ReadingQuestionOptionBank({group,section}) {
  const first = group.questions[0];
  let title = "";
  let items = [];
  if (group.type === "matching_sentence_endings") {
    title = "Ending Bank";
    items = first?.options || [];
  } else if (group.type === "matching_headings" && !(section?.headings||[]).length) {
    title = "Heading Bank";
    items = readingSelectOptions(first, section);
  } else if (group.type === "matching_features" && !(section?.features||[]).length) {
    title = "Feature Bank";
    items = readingSelectOptions(first, section);
  }
  if (!items.length) return null;
  return <div className={`reading-q-option-bank ${group.type}`}>
    <div className="reading-bank-title">{title}</div>
    <div className="reading-q-option-list">
      {items.map(opt=>{
        const p = readingOptionParts(opt);
        return <div key={p.raw} className="reading-q-option-item">
          <span>{p.value}</span>
          <strong>{p.label}</strong>
        </div>;
      })}
    </div>
  </div>;
}

function ReadingQuestionGroup({group,section,answers,result,flags,setAnswers,toggleFlag,config,onStrategyFocus}) {
  const first = group.questions[0]?.number;
  const last = group.questions[group.questions.length-1]?.number;
  return <section className="reading-q-group">
    <div className="reading-q-group-head">
      <span>{group.label}</span>
      <strong>Questions {first}{first!==last?`-${last}`:""}</strong>
    </div>
    <ReadingQuestionOptionBank group={group} section={section}/>
    {group.questions.map(q=><ReadingQuestion key={q.id} question={q} section={section} value={answers[q.id]} submitted={!!result} onChange={v=>setAnswers(a=>({...a,[q.id]:v}))} flagged={!!flags[q.id]} onToggleFlag={toggleFlag} config={config} onStrategyFocus={onStrategyFocus}/>)}
  </section>;
}

function readingResultStats(details) {
  const byType = {};
  const bySkill = {};
  details.forEach(d=>{
    const type = d.type || "unknown";
    const skill = d.skill || "Reading detail";
    if (!byType[type]) byType[type] = {correct:0,total:0};
    if (!bySkill[skill]) bySkill[skill] = {correct:0,total:0};
    byType[type].total += 1;
    bySkill[skill].total += 1;
    if (d.correct) { byType[type].correct += 1; bySkill[skill].correct += 1; }
  });
  const weakTypes = Object.entries(byType).map(([k,v])=>({key:k,...v,rate:v.correct/v.total})).sort((a,b)=>a.rate-b.rate).slice(0,4);
  const weakSkills = Object.entries(bySkill).map(([k,v])=>({key:k,...v,rate:v.correct/v.total})).sort((a,b)=>a.rate-b.rate).slice(0,4);
  return {byType,bySkill,weakTypes,weakSkills};
}

// Deterministic "what to drill next" mapping per reading question type — no AI call.
function readingDrillSuggestion(type) {
  const map = {
    true_false_not_given: "Drill TRUE/FALSE/NOT GIVEN: underline the qualifier (all/some/never) and decide if the passage CONFIRMS, CONTRADICTS, or is SILENT. NOT GIVEN = the passage simply does not say.",
    yes_no_not_given: "Drill YES/NO/NOT GIVEN on writer's opinion: separate what the author CLAIMS from what is merely mentioned. NOT GIVEN = the view is never stated.",
    matching_headings: "Drill headings: read the first + last sentence of each paragraph for the MAIN idea, not a detail that also appears in a wrong heading.",
    matching_information: "Drill 'which paragraph contains…': scan for the specific detail, not the topic — the detail can sit in any paragraph.",
    matching_features: "Drill matching to people/things: track WHO said/did WHAT; watch for two options that are deliberately similar.",
    matching_sentence_endings: "Drill sentence endings: check the sentence still reads grammatically AND matches the passage meaning, not just a keyword.",
    multiple_choice: "Drill MCQ: eliminate options that are true-but-irrelevant or partly-true; the answer must fully match the passage.",
    multiple_choice_multiple: "Drill multi-select MCQ: verify EACH chosen option against the text independently — partial overlap is a trap.",
    sentence_completion: "Drill completion: copy the EXACT word(s) from the passage and obey the word limit; check singular/plural.",
    summary_completion: "Drill summary completion: the summary paraphrases the passage — find the synonym, then take the exact word that fits the gap grammatically.",
    note_completion: "Drill note completion: locate the section the note summarises, then lift the exact term within the word limit.",
    table_completion: "Drill table completion: match the row/column label to the passage, then take the exact figure/term.",
    short_answer: "Drill short answer: answer with words taken from the passage only, within the word limit."
  };
  return map[type] || "Re-read the evidence sentence, then re-attempt this question type with the word/qualifier rule in mind.";
}

function ReadingReviewPanel({result}) {
  if (!result) return null;
  const stats = readingResultStats(result.details || []);
  const wrong = (result.details||[]).filter(d=>!d.correct);
  const overTime = result.elapsedSeconds > (result.durationSeconds || 3600);
  return <div className="fu">
    <div className="card" style={{borderLeft:"2px solid var(--leaf)"}}>
      <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}>
        <div className="overall-big" style={{color:bandColor(result.band)}}>{result.score}/{result.total}</div>
        <div>
          <div className="sl">Estimated Academic Reading Band</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:30,color:bandColor(result.band),lineHeight:1.1}}>{result.band.toFixed(1)}</div>
          <div style={{fontSize:12,color:"var(--ink3)",lineHeight:1.5,marginTop:4}}>Time used {formatReadingTime(result.elapsedSeconds)}{overTime?" - over target time":""}</div>
        </div>
      </div>
    </div>
    <div className="cols-2">
      <div className="insight-box fix">
        <div className="insight-h" style={{color:"var(--orchid)"}}>Weakest Question Types</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{stats.weakTypes.map(x=><span key={x.key} className="sublist-btn" style={{cursor:"default"}}>{readingTypeLabel(x.key)} {x.correct}/{x.total}</span>)}</div>
      </div>
      <div className="insight-box win">
        <div className="insight-h" style={{color:"var(--leaf)"}}>Reading Skills</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{stats.weakSkills.map(x=><span key={x.key} className="sublist-btn" style={{cursor:"default"}}>{x.key} {x.correct}/{x.total}</span>)}</div>
      </div>
    </div>
    {wrong.length>0&&<div className="card">
      <div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Review Missed Questions</div>
      <div style={{display:"grid",gap:8}}>
        {wrong.slice(0,12).map(d=><div key={d.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px"}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--rose)",marginBottom:4}}>Q{d.number} · {readingTypeLabel(d.type)}{d.paragraph?` · ¶ ${d.paragraph}`:""}{d.skill?` · ${d.skill}`:""}</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.5,marginBottom:5}}>{d.prompt}</div>
          <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>Your answer: <span style={{color:"var(--honey)"}}>{Array.isArray(d.userAnswer)?d.userAnswer.join(", "):(d.userAnswer||"(blank)")}</span> · Correct: <span style={{color:"var(--leaf)"}}>{Array.isArray(d.answer)?d.answer.join(", "):d.answer}</span></div>
          {d.anchor&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.5,marginTop:6,paddingLeft:8,borderLeft:"2px solid var(--leaf)"}}><strong style={{color:"var(--leaf)"}}>Where to look{d.paragraph?` (¶ ${d.paragraph})`:""}:</strong> "{d.anchor}"</div>}
          {d.trap&&<div style={{fontSize:11.5,color:"var(--honey)",lineHeight:1.5,marginTop:5}}><strong>Why the trap worked:</strong> {d.trap}</div>}
          {d.explanation&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5,marginTop:5}}><strong style={{color:"var(--ink2)"}}>Explanation:</strong> {d.explanation}</div>}
          <div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.5,marginTop:6,paddingTop:6,borderTop:"1px dashed var(--border)"}}><span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--orchid)",fontWeight:700,letterSpacing:".06em",marginRight:6}}>DRILL NEXT</span>{readingDrillSuggestion(d.type)}</div>
        </div>)}
      </div>
    </div>}
  </div>;
}

// ── Reading Strategies (Task 1): animated, step-by-step walkthroughs ─────────
// Fixed steps come from READING_STRATEGIES (src/04b-reading-strategies.js, seeded from the
// eBook); the animation shows HOW each sub-skill / question type is applied. demo.type maps
// to a stage archetype below. (SEED engine — Codex refines dataset wording on Friday.)
const READING_STRATEGY_SAMPLE = {
  title: "Urban Beekeeping",
  paragraphs: [
    ["Cities are becoming unlikely havens for honeybees.", "Rooftops and parks now host thousands of hives.", "Researchers say urban bees often outperform rural ones."],
    ["One key reason is variety.", "Parks, gardens and balconies supply diverse flowers across many months.", "This steady food keeps colonies strong."],
    ["However, problems remain.", "Pollution can taint nectar and space is limited.", "Experts argue that careful planning is essential."]
  ]
};
// Representative sample QUESTION per question-type id, shown beside the strategy. ev=[para,sentence]
// points to the evidence sentence the strategy "finds" in the passage.
const READING_STRATEGY_QSAMPLE = {
  "short-answer": { kind:"short", q:"What can contaminate the nectar that bees collect?", answer:"Pollution", ev:[2,1] },
  "multiple-choice": { kind:"options", q:"According to the passage, why do urban bees often thrive?", options:["Cities have fewer predators","City plants supply varied flowers for many months","Beekeepers feed them sugar","Pollution helps the hives"], answer:1, ev:[1,1] },
  "summary-completion": { kind:"gap", q:"City colonies stay strong because parks and gardens supply ____ across many months.", answer:"diverse flowers", ev:[1,1] },
  "matching-sentences": { kind:"match", q:"Match the beginning to its ending.", begin:"Urban bees often do better than rural ones", endings:["because pollution taints their nectar.","because city plants flower over many months.","although they face no real challenges."], answer:1, ev:[1,1] },
  "sentence-completion": { kind:"gap", q:"A steady supply of food keeps colonies ____.", answer:"strong", ev:[1,2] },
  "tfng": { kind:"statement", q:"Urban bees often perform better than rural bees.", choices:["TRUE","FALSE","NOT GIVEN"], answer:0, ev:[0,2] },
  "ynng": { kind:"statement", q:"The writer believes careful planning is essential for urban beekeeping.", choices:["YES","NO","NOT GIVEN"], answer:0, ev:[2,2] },
  "matching-headings": { kind:"headings", q:"Choose the best heading for each paragraph.", headings:["A surprising urban home","Why city bees thrive","Challenges that remain"], answer:"¶1 → i · ¶2 → ii · ¶3 → iii", ev:[0,0] },
  "labelling-diagram": { kind:"gap", q:"Hives are placed on city ____ and in parks.", answer:"rooftops", ev:[0,1] },
  "matching-names": { kind:"match", q:"Who makes each claim?", begin:"Urban bees outperform rural ones —", endings:["Beekeepers","Researchers","Farmers"], answer:1, ev:[0,2] },
  "matching-information": { kind:"short", q:"Which paragraph describes the problems urban bees face?", answer:"Paragraph 3", ev:[2,0] },
  "table-completion": { kind:"gap", q:"Problem → ____ can taint the nectar.", answer:"Pollution", ev:[2,1] }
};
// Decide how the passage animates + which sample question (if any) to show.
function _readingStrategyDemo(item) {
  const sample = READING_STRATEGY_QSAMPLE[item.id] || null;
  if (sample) return { mode:"spotlight", evidence:sample.ev, sample };
  const sub = {
    "skimming":{mode:"skim"}, "scanning":{mode:"spotlight",evidence:[1,1]},
    "close-reading":{mode:"spotlight",evidence:[1,1]}, "new-words":{mode:"spotlight",evidence:[2,1]},
    "context":{mode:"spotlight",evidence:[2,1]}, "topic-sentences":{mode:"topics"},
    "vocabulary-building":{mode:"diagram"}
  };
  return { sample:null, ...(sub[item.id] || {mode:"skim"}) };
}

// Passage on top — smooth spotlight / scan-dim / skim highlighting driven by step progress.
function ReadingStrategyPassage({mode, evidence, progress, beat, playing}) {
  const paras = READING_STRATEGY_SAMPLE.paragraphs;
  const phase = progress < 0.55 ? "scan" : "found"; // locate first, then read closely
  const evP = evidence ? evidence[0] : -1, evS = evidence ? evidence[1] : -1;
  // skim: reveal first & last sentence of each paragraph progressively.
  const picks = [];
  if (mode==="skim") paras.forEach((para,p)=>{ picks.push(p+"-0"); if(para.length>1) picks.push(p+"-"+(para.length-1)); });
  const upTo = picks.slice(0, 1 + (beat % picks.length || 0));
  const cls = (p,s)=>{
    if (mode==="topics") return s===0 ? "rs-hit" : "rs-soft";
    if (mode==="skim") return upTo.includes(p+"-"+s) ? "rs-hit" : "rs-soft";
    // spotlight
    if (phase==="found" && p===evP && s===evS) return "rs-hit";
    return "rs-soft";
  };
  const dimmed = mode==="spotlight"; // dim the whole passage a little while spotlighting/scanning
  return <div className={`rstage ${dimmed?"rs-dimmed":""} ${playing?"":"rs-paused"}`}>
    {mode==="spotlight" && phase==="scan" && <div className="rs-scanbar"/>}
    <div className="rstage-title">{READING_STRATEGY_SAMPLE.title}</div>
    {paras.map((para,p)=><p key={p} className="rstage-para">
      {para.map((sn,s)=><span key={s} className={cls(p,s)}>{sn} </span>)}
    </p>)}
  </div>;
}

// The sample QUESTION shown beside the strategy (mirrors the real test layout).
function ReadingStrategyQuestion({sample, reveal}) {
  if (!sample) return null;
  const k = sample.kind;
  const ans = sample.answer;
  return <div className="rs-q">
    <div className="rs-q-stem">{sample.q}</div>
    {k==="options" && <div className="rs-q-opts">{sample.options.map((o,i)=><div key={i} className={`rs-q-opt ${reveal&&i===ans?"pick":""}`}><b>{String.fromCharCode(65+i)}</b> {o}</div>)}</div>}
    {k==="statement" && <div className="rs-q-opts rs-q-row">{sample.choices.map((c,i)=><span key={i} className={`rs-q-chip ${reveal&&i===ans?"pick":""}`}>{c}</span>)}</div>}
    {k==="match" && <><div className="rs-q-begin">{sample.begin}…</div><div className="rs-q-opts">{sample.endings.map((e,i)=><div key={i} className={`rs-q-opt ${reveal&&i===ans?"pick":""}`}>{String.fromCharCode(65+i)}. {e}</div>)}</div></>}
    {k==="headings" && <div className="rs-q-opts">{sample.headings.map((h,i)=><div key={i} className="rs-q-opt"><b>{["i","ii","iii","iv"][i]}</b> {h}</div>)}{reveal&&<div className="rs-q-ans">{ans}</div>}</div>}
    {(k==="gap"||k==="short") && reveal && <div className="rs-q-ans">Answer: <b>{ans}</b></div>}
    {(k==="options"||k==="statement"||k==="match") && reveal && <div className="rs-q-ans">Answer: <b>{k==="match"?sample.endings[ans]:(k==="options"?String.fromCharCode(65+ans):sample.choices[ans])}</b></div>}
  </div>;
}

// Vocabulary Building: plain static diagram (no animation), per user request.
function ReadingVocabDiagram() {
  const nodes = [["Read","Read & listen to genuine English daily"],["Record","Note every new word in a system"],["Review","Revisit regularly so it sticks"]];
  return <div className="rs-vocab">
    {nodes.map(([t,d],i)=><React.Fragment key={i}>
      <div className="rs-vocab-box"><div className="rs-vocab-h">{t}</div><div className="rs-vocab-d">{d}</div></div>
      {i<2 && <span className="rs-vocab-arrow">→</span>}
    </React.Fragment>)}
  </div>;
}

// Map an app question-type id (READING_TYPES) → a READING_STRATEGIES question-type entry.
const READING_TYPE_TO_STRATEGY = {
  true_false_not_given:"tfng", yes_no_not_given:"ynng",
  matching_information:"matching-information", matching_headings:"matching-headings",
  matching_features:"matching-names", matching_sentence_endings:"matching-sentences",
  multiple_choice:"multiple-choice", multiple_choice_multiple:"multiple-choice",
  sentence_completion:"sentence-completion", summary_completion:"summary-completion",
  note_completion:"summary-completion", table_completion:"table-completion",
  flow_chart_completion:"table-completion", diagram_label_completion:"labelling-diagram",
  short_answer:"short-answer"
};
function readingStrategyItemForType(appType) {
  if (typeof READING_STRATEGIES==="undefined" || !READING_STRATEGIES) return null;
  const sid = READING_TYPE_TO_STRATEGY[appType];
  if (!sid) return null;
  return (READING_STRATEGIES.questionTypes||[]).find(q=>q.id===sid) || null;
}
// Reverse: a strategy id → a representative app focus type, so "see it on a real passage"
// can generate a real focused Test of that question type.
const STRATEGY_TO_FOCUS = {
  tfng:"true_false_not_given", ynng:"yes_no_not_given",
  "matching-information":"matching_information", "matching-headings":"matching_headings",
  "matching-names":"matching_features", "matching-sentences":"matching_sentence_endings",
  "multiple-choice":"multiple_choice", "sentence-completion":"sentence_completion",
  "summary-completion":"summary_completion", "table-completion":"table_completion",
  "labelling-diagram":"diagram_label_completion", "short-answer":"short_answer"
};

function ReadingStrategyWalkthrough({item, config, onPractice}) {
  const steps = item.strategySteps || item.steps || [];
  const [beat,setBeat] = useState(0);
  const [playing,setPlaying] = useState(true);
  const [example,setExample] = useState(null);
  const [exLoading,setExLoading] = useState(false);
  const [exErr,setExErr] = useState("");
  const [exOpen,setExOpen] = useState(null); // which walkthrough row is expanded (evidence highlight)
  const timer = useRef(null);
  const makeExample = async () => {
    setExLoading(true); setExErr(""); setExOpen(null);
    try { setExample(await generateReadingStrategyExample(config, item.name, steps)); }
    catch(e){ setExErr(e.message||String(e)); }
    finally { setExLoading(false); }
  };
  const highlightEvidence = (text, evidence) => {
    if (!evidence || !text.includes(evidence)) return text;
    const i = text.indexOf(evidence);
    return <>{text.slice(0,i)}<span className="rs-hit">{evidence}</span>{text.slice(i+evidence.length)}</>;
  };
  useEffect(()=>{
    if (!playing) { if(timer.current){clearInterval(timer.current);timer.current=null;} return; }
    timer.current = setInterval(()=>setBeat(b=>b+1), 2100);
    return ()=>{ if(timer.current){clearInterval(timer.current);timer.current=null;} };
  },[playing]);
  useEffect(()=>{ setBeat(0); setPlaying(true); setExample(null); setExErr(""); setExOpen(null); },[item.id]);
  const curStep = steps.length ? beat % steps.length : 0;
  const demo = _readingStrategyDemo(item);
  const progress = steps.length ? (curStep+1)/steps.length : 1;
  const reveal = progress >= 0.55;
  return <div className="card" style={{borderTop:"2px solid var(--sky)"}}>
    <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>{item.name}{item.seed&&<span className="rs-seed" title="Seed content — to be verified against the source guide">seed</span>}</div>
    {(item.blurb||item.definition)&&<div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55,marginBottom:10}}>{item.blurb||item.definition}</div>}
    {/* Passage on top (full width) — or a static diagram for Vocabulary Building */}
    {demo.mode==="diagram"
      ? <ReadingVocabDiagram/>
      : <div className="rs-stage-wrap"><ReadingStrategyPassage mode={demo.mode} evidence={demo.evidence} progress={progress} beat={beat} playing={playing}/></div>}
    {item.demo?.caption&&demo.mode!=="diagram"&&<div className="rs-caption">{item.demo.caption}</div>}
    <div className="rs-controls">
      <button className="btn bsm bo" onClick={()=>setPlaying(p=>!p)}>{playing?"❚❚ Pause":"▶ Play"}</button>
      <button className="btn bsm bg" onClick={()=>{setBeat(0);setPlaying(true);}}>↻ Replay</button>
      <button className="btn bsm bg" onClick={()=>setBeat(b=>b+1)} disabled={playing}>Step ›</button>
    </div>
    {/* Question (left) + Strategy steps (right), side by side */}
    <div className={demo.sample ? "rs-grid" : ""} style={{marginTop:12}}>
      {demo.sample && <div><div className="sl">Question</div><ReadingStrategyQuestion sample={demo.sample} reveal={reveal}/></div>}
      <div>
        <div className="sl">Strategy — step by step</div>
        <ol className="rs-steps">
          {steps.map((st,i)=><li key={i} className={i===curStep?"rs-step-on":""}>{st}</li>)}
        </ol>
      </div>
    </div>
    <div className="rs-meta">
      {item.skillsTested?.length>0&&<div><div className="sl">Skills tested</div><ul className="rs-list">{item.skillsTested.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      {item.commonProblems?.length>0&&<div><div className="sl" style={{color:"var(--rose)"}}>Common problems</div><ul className="rs-list">{item.commonProblems.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      {item.tips?.length>0&&<div><div className="sl" style={{color:"var(--leaf)"}}>Tips</div><ul className="rs-list">{item.tips.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    </div>
    {item.example&&<div style={{marginTop:10,fontSize:11.5,color:"var(--ink3)",fontStyle:"italic",lineHeight:1.5}}>e.g. {item.example}</div>}
    {onPractice && STRATEGY_TO_FOCUS[item.id] && <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)"}}>
      <button className="btn bsm bp" onClick={()=>onPractice(STRATEGY_TO_FOCUS[item.id])}>📝 See it on a real passage →</button>
      <div style={{fontSize:11,color:"var(--ink3)",marginTop:6,lineHeight:1.5}}>Generates a real passage with <strong>{item.name}</strong> questions and opens it in the Test tab, so you can apply these steps yourself.</div>
    </div>}
  </div>;
}

function ReadingStrategiesView({config, onPractice}) {
  const data = (typeof READING_STRATEGIES!=="undefined" && READING_STRATEGIES) || {subSkills:[],questionTypes:[]};
  const [sel,setSel] = useState(()=>({kind:"questionTypes", id:(data.questionTypes[0]||{}).id}));
  const list = sel.kind==="subSkills" ? data.subSkills : data.questionTypes;
  const item = list.find(x=>x.id===sel.id) || list[0];
  return <div className="fu">
    <div className="card" style={{borderTop:"2px solid var(--sky)"}}>
      <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Reading Strategies</div>
      <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55}}>Animated, step-by-step strategies for every question type and the reading sub-skills behind them. Pick one to watch how it is solved.{data.seed&&<span style={{color:"var(--ink3)"}}> (Seed content from a study guide — wording under review.)</span>}</div>
    </div>
    <div className="card">
      <div className="sl">Question types</div>
      <div className="rs-pills">{data.questionTypes.map(q=><button key={q.id} className={`rs-pill ${sel.kind==="questionTypes"&&sel.id===q.id?"on":""}`} onClick={()=>setSel({kind:"questionTypes",id:q.id})}>{q.name}</button>)}</div>
      <div className="sl" style={{marginTop:12}}>Reading sub-skills</div>
      <div className="rs-pills">{data.subSkills.map(s=><button key={s.id} className={`rs-pill rs-pill-sub ${sel.kind==="subSkills"&&sel.id===s.id?"on":""}`} onClick={()=>setSel({kind:"subSkills",id:s.id})}>{s.name}</button>)}</div>
    </div>
    {item&&<ReadingStrategyWalkthrough item={item} config={config} onPractice={onPractice} key={(sel.kind)+"-"+item.id}/>}
  </div>;
}

// Per-question strategy: apply the fixed steps to the ACTUAL question + passage the user is
// on (NOT the canned Theory sample). Evidence/answer are revealed only after submission so it
// doesn't spoil an in-progress test.
// Split a question stem into segments, flagging the KEYWORDS to scan for (numbers, proper
// nouns, quoted phrases) so they can be highlighted.
function _readingKeywordSegments(text) {
  const s = String(text||"");
  const re = /(\b\d[\d,.%/:\-]*\b|"[^"]{1,40}"|'[^']{1,40}'|\b[A-Z][A-Za-z]{2,}\b)/g;
  const segs = []; let last=0, m;
  while ((m = re.exec(s))) {
    if (m.index>last) segs.push({t:s.slice(last,m.index),hit:false});
    segs.push({t:m[0],hit:true}); last = m.index+m[0].length;
  }
  if (last<s.length) segs.push({t:s.slice(last),hit:false});
  return segs.length ? segs : [{t:s,hit:false}];
}

// Render a passage paragraph with the answer sentence (anchor) strongly highlighted and the
// question keywords lightly highlighted — used while a per-question strategy is scanning it.
const _RS_STOPWORDS = new Set(["the","and","that","this","with","from","they","have","which","were","been","their","there","about","into","than","when","what","also","such","these","those","would","could","other","some","more","most","over","while","because","however"]);
function _strategyHighlightParagraph(text, anchor, keywords, answer, revealSecs=5) {
  const t = String(text||""); if (!t) return t;
  const len = t.length || 1;
  // IMPORTANT WORDS to highlight: question keywords + answer content words + the paragraph's
  // own proper nouns & numbers (so meaningful words always get highlighted, even via synonyms).
  const want = new Set();
  (keywords||[]).forEach(k=>{ const c=String(k||"").trim(); if(c.length>=2) want.add(c.toLowerCase()); });
  String(answer||"").split(/\s+/).forEach(w=>{ const c=w.replace(/[^A-Za-z0-9]/g,""); if(c.length>=4) want.add(c.toLowerCase()); });
  (t.match(/\b\d[\d.,%]*\b|\b[A-Z][A-Za-z]{2,}\b/g)||[]).forEach(w=>want.add(w.toLowerCase()));
  _RS_STOPWORDS.forEach(w=>want.delete(w));
  const terms = [...want].filter(Boolean).sort((a,b)=>b.length-a.length);
  const kwRe = terms.length ? new RegExp("\\b("+terms.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")\\b","gi") : null;
  const sents = t.match(/[^.!?]+[.!?]*\s*/g) || [t];
  // Which sentence holds the answer: exact anchor, else the sentence with the most important hits.
  let ansIdx = -1;
  if (anchor && t.includes(anchor)) { const pos=t.indexOf(anchor); let acc=0; for(let i=0;i<sents.length;i++){ acc+=sents[i].length; if(pos<acc){ansIdx=i;break;} } }
  if (ansIdx<0) { let best=0,bi=-1; sents.forEach((s,i)=>{ const lc=s.toLowerCase(); let c=0; terms.forEach(tm=>{ if(lc.includes(tm)) c++; }); if(c>best){best=c;bi=i;} }); ansIdx=bi; }
  const delayFor = (off)=> (((off/len)*(revealSecs||5))).toFixed(2)+"s"; // stagger ≈ vertical position
  const renderWords = (chunk, baseOff, kp) => {
    if (!kwRe || !chunk) return [chunk];
    const out=[]; let last=0,m; kwRe.lastIndex=0;
    while ((m=kwRe.exec(chunk))) { if(m.index>last) out.push(chunk.slice(last,m.index)); out.push(<mark key={kp+m.index} className="rs-kw-p rs-reveal" style={{animationDelay:delayFor(baseOff+m.index)}}>{m[0]}</mark>); last=m.index+m[0].length; if(m.index===kwRe.lastIndex) kwRe.lastIndex++; }
    if (last<chunk.length) out.push(chunk.slice(last));
    return out;
  };
  let base = 0;
  return <>{sents.map((s,i)=>{
    const off = base; base += s.length;
    if (i===ansIdx) return <mark key={i} className="rs-ans-p rs-reveal" style={{animationDelay:delayFor(off)}}>{renderWords(s,off,"a"+i)}</mark>;
    return <span key={i}>{renderWords(s,off,"s"+i)}</span>;
  })}</>;
}

// Which passage paragraph index a question points at (for scroll + spotlight on the real passage).
function _readingTargetParaIdx(question, section) {
  const paras = (section?.paragraphs || []).map(p=>typeof p==="string"?p:(p?.text||""));
  const anchor = String(question?.anchor || question?.evidenceQuote || question?.evidence || "").trim();
  if (anchor) { const i = paras.findIndex(p=>String(p).includes(anchor)); if (i>=0) return i; }
  const pl = question?.paragraph;
  if (typeof pl==="string" && /^[A-Za-z]$/.test(pl.trim())) { const i = pl.trim().toUpperCase().charCodeAt(0)-65; if (i>=0 && i<paras.length) return i; }
  if (typeof pl==="number" && pl>=0 && pl<paras.length) return pl;
  return -1;
}

function ReadingQuestionStrategy({question, section, item, submitted, onFocus}) {
  const steps = item?.strategySteps || item?.steps || [];
  const ans = Array.isArray(question?.answer) ? question.answer.join(", ") : (question?.answer ?? "");
  const [beat,setBeat] = useState(0);
  const [playing,setPlaying] = useState(true);
  const timer = useRef(null);
  useEffect(()=>{
    if (!playing) { if(timer.current){clearInterval(timer.current);timer.current=null;} return; }
    timer.current = setInterval(()=>setBeat(b=>b+1), 2000);
    return ()=>{ if(timer.current){clearInterval(timer.current);timer.current=null;} };
  },[playing]);
  const curStep = steps.length ? beat % steps.length : 0;
  const qSegs = _readingKeywordSegments(question.prompt || question.instruction || readingTypeLabel(question.type));
  const hasPara = _readingTargetParaIdx(question, section) >= 0;
  return <div className="card" style={{borderTop:"2px solid var(--sky)"}}>
    <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>{item.name} — applied to this question{item.seed&&<span className="rs-seed" title="Seed content — to be verified against the source guide">seed</span>}</div>
    <div className="rs-grid">
      <div>
        <div className="sl">This question <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ink3)"}}>— scan for the highlighted keywords</span></div>
        <div className="rs-q">
          <div className="rs-q-stem">Q{question.number}. {qSegs.map((s,i)=>s.hit?<span key={i} className="rs-kw">{s.t}</span>:<span key={i}>{s.t}</span>)}</div>
          {Array.isArray(question.options)&&question.options.length>0&&<div className="rs-q-opts">{question.options.map((o,i)=><div key={i} className="rs-q-opt">{typeof o==="string"?o:(o.text||o.label||"")}</div>)}</div>}
          {submitted
            ? <div className="rs-q-ans">Answer: <b>{ans}</b></div>
            : <div style={{fontSize:11,color:"var(--ink3)",marginTop:6,fontStyle:"italic"}}>Answer hidden until you submit — use the steps to find it in the passage.</div>}
        </div>
        {hasPara && onFocus && <div className="rs-controls" style={{marginTop:8}}>
          <button className="btn bsm bp" onClick={onFocus}>▶ Show on the passage</button>
          <button className="btn bsm bg" onClick={()=>{setBeat(0);setPlaying(true);}}>↻ Replay steps</button>
          <button className="btn bsm bo" onClick={()=>setPlaying(p=>!p)}>{playing?"❚❚ Pause":"▶ Play"}</button>
        </div>}
      </div>
      <div>
        <div className="sl">Strategy — applied to THIS question</div>
        <ol className="rs-steps">{steps.map((st,i)=><li key={i} className={i===curStep?"rs-step-on":""}>{st}</li>)}</ol>
      </div>
    </div>
    <div style={{marginTop:8,fontSize:11,color:"var(--ink3)",fontStyle:"italic"}}>{hasPara ? "👈 The passage on the left scrolls to this question's paragraph and the scan animation plays over it." : "Tip: scan the passage for the highlighted keywords above."}</div>
    {submitted && question.explanation && <div style={{marginTop:8,fontSize:12,color:"var(--ink2)",lineHeight:1.5}}><strong>Why:</strong> {question.explanation}</div>}
    {item.tips?.length>0 && <div style={{marginTop:10}}><div className="sl" style={{color:"var(--leaf)"}}>Tips</div><ul className="rs-list">{item.tips.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
  </div>;
}

function ReadingPage({state,setState,config}) {
  const workTabs = useSkillWorkTabs("reading",state,setState);
  return <ReadingWorkspace key={workTabs.activeId} state={state} setState={workTabs.setScopedState} config={config} workTabs={workTabs}/>;
}

function ReadingWorkspace({state,setState,config,workTabs}) {
  const savedDraft = state.readingDraft || {};
  const [tab,setTab] = useState(()=>savedDraft.tab || "generate");
  const [practiceMode,setPracticeMode] = useState(()=>savedDraft.practiceMode || "mini");
  const [strictMock,setStrictMock] = useState(()=>savedDraft.strictMock ?? false);
  const [topic,setTopic] = useState(()=>savedDraft.topic || "science and technology");
  const [difficulty,setDifficulty] = useState(()=>savedDraft.difficulty || "7.0");
  const [focusType,setFocusType] = useState(()=>savedDraft.focusType || "mixed");
  const [pendingPractice,setPendingPractice] = useState(null); // strategy "see it on a real passage" → auto-generate a focused Test
  const [strategySpot,setStrategySpot] = useState(null); // {sectionId,paraIdx,nonce} — per-question "🎯 Strategy" scrolls + animates the real passage
  const [questionCount,setQuestionCount] = useState(()=>savedDraft.questionCount || 8);
  const [testData,setTestData] = useState(()=>savedDraft.testData || null);
  const [answers,setAnswers] = useState(()=>savedDraft.answers || {});
  const [result,setResult] = useState(()=>savedDraft.result || null);
  const [genLoading,setGenLoading] = useState(false);
  const [genStatus,setGenStatus] = useState("");
  const [wikiSubject,setWikiSubject] = useState(()=>savedDraft.wikiSubject || "");
  const [docSource,setDocSource] = useState(null); // { filename, markdown } uploaded via MarkItDown
  const [readingDataset,setReadingDataset] = useState(()=>state.readingDataset||[]);
  const [datasetFilter,setDatasetFilter] = useState("all");
  const [seedTitle,setSeedTitle] = useState("");
  const [seedTopic,setSeedTopic] = useState("");
  const [seedDifficulty,setSeedDifficulty] = useState("7.0");
  const [seedParagraphs,setSeedParagraphs] = useState("");
  const [docBuilding,setDocBuilding] = useState(false); // AI building a practice test from an uploaded doc
  const [docBuildMsg,setDocBuildMsg] = useState("");
  const [timerRunning,setTimerRunning] = useState(()=>!!savedDraft.timerRunning);
  const [elapsed,setElapsed] = useState(()=>savedDraft.elapsed || 0);
  const [timerStartedAt,setTimerStartedAt] = useState(()=>savedDraft.timerStartedAt || null);
  const [timerBase,setTimerBase] = useState(()=>savedDraft.timerBase || 0);
  const [activeSection,setActiveSection] = useState(()=>savedDraft.activeSection || 0);
  const [flags,setFlags] = useState(()=>savedDraft.flags || {});
  const [highlights,setHighlights] = useState(()=>savedDraft.highlights || {});
  const [readingNotes,setReadingNotes] = useState(()=>savedDraft.readingNotes || {});
  const [selectionToolbar,setSelectionToolbar] = useState(null);
  const [activeMark,setActiveMark] = useState(null);
  const [readingTheme,setReadingTheme] = useState(()=>savedDraft.readingTheme || "light");
  const archive = state.readingTests || [];
  const [warnOpen, setWarnOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(()=>{ setState(s=>({...s,readingDataset})); },[readingDataset]);

  const addToDataset = (entries) => {
    const list = Array.isArray(entries) ? entries : [entries];
    const valid = list.filter(Boolean);
    if (valid.length === 0) return;
    setReadingDataset(prev=>{
      const existingIds = new Set(prev.map(e=>e.id));
      return [...prev, ...valid.filter(e=>!existingIds.has(e.id))];
    });
  };

  const handleLibraryImport = async (e) => {
    const files = Array.from(e.target.files||[]);
    e.target.value = "";
    const newEntries = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const toolJson = JSON.parse(text);
        // Support both tool format and exported dataset format
        if (Array.isArray(toolJson)) {
          // Exported dataset bundle
          for (const entry of toolJson) {
            if (entry?.testData?.sections?.[0]) newEntries.push({...entry, source: entry.source||"imported"});
          }
        } else if (toolJson?.testData?.sections) {
          // Single exported entry
          newEntries.push({...toolJson, source: toolJson.source||"imported"});
        } else {
          // Python tool format
          const converted = convertToolPassageToApp(toolJson);
          const entry = buildDatasetEntryFromTest(converted, "imported", 0);
          if (entry) {
            entry.id = toolJson.id || entry.id;
            entry.wordCount = toolJson.passage?.word_count || entry.wordCount;
            entry.topicTags = toolJson.passage?.topic_tags || [];
            newEntries.push(entry);
          }
        }
      } catch(err) { alert(`Failed to import ${file.name}: ${err.message}`); }
    }
    addToDataset(newEntries);
  };

  const loadDatasetEntry = (entry) => {
    const normalized = normalizeReadingTest(entry.testData, entry.topic, entry.level, "mixed", "section");
    normalized.qualityWarnings = [];
    loadTest(normalized);
  };

  const removeDatasetEntry = (id) => {
    if (!window.confirm("Remove this passage from the dataset?")) return;
    setReadingDataset(prev=>prev.filter(e=>e.id!==id));
  };

  const toggleFewShot = (id) => {
    setReadingDataset(prev=>prev.map(e=>e.id===id?{...e,useAsFewShot:e.useAsFewShot===false}:e));
  };

  const exportDataset = () => {
    if (readingDataset.length === 0) { alert("Dataset is empty."); return; }
    const blob = new Blob([JSON.stringify(readingDataset, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts-reading-dataset-${TODAY()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearDataset = () => {
    if (!window.confirm(`Remove all ${readingDataset.length} dataset entries? This cannot be undone.`)) return;
    setReadingDataset([]);
  };

  const addSeedPassage = () => {
    const title = seedTitle.trim();
    const paraText = seedParagraphs.trim();
    if (!title || !paraText) { alert("Title and paragraphs are required."); return; }
    const paragraphs = paraText.split(/\n\s*\n+/).map(p=>p.trim()).filter(Boolean);
    if (paragraphs.length < 3) { alert("Please paste at least 3 paragraphs separated by blank lines."); return; }
    const topic = seedTopic.trim();
    const level = `Band ${seedDifficulty}`;
    const wordCount = paragraphs.reduce((sum,p)=>sum+p.split(/\s+/).filter(Boolean).length, 0);
    const entry = {
      id: `seed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,
      source: "seed",
      title,
      topic,
      topicTags: topic ? topic.split(/[,;]/).map(s=>s.trim()).filter(Boolean) : [],
      level,
      section: sectionFromBand(level),
      questionCount: 0,
      wordCount,
      paragraphLabels: paragraphs.map((_,i)=>String.fromCharCode(65+i)),
      testData: {
        mode: "section",
        title,
        durationSeconds: 1200,
        sourcePolicy: "User-added reference passage",
        sections: [{
          id: "section-1",
          passage: {title,topic,level,sourceNote:"User-added reference passage",paragraphs,topic_tags:[]},
          headings: [],
          features: [],
          questions: [],
          vocabulary: []
        }]
      },
      useAsFewShot: true,
      createdAt: new Date().toISOString()
    };
    addToDataset(entry);
    setSeedTitle(""); setSeedTopic(""); setSeedParagraphs("");
    alert("Reference passage added to dataset. It will be used as a style anchor in future generations.");
  };

  // Upload a real reading document -> AI removes extraction noise while preserving every original
  // passage and question, then moves answer-key material into hidden grading fields.
  const buildPracticeTestFromDoc = async (uploaded) => {
    if (!config) { setDocBuildMsg("⚠ Set up an AI provider in Settings first."); return; }
    const md = String(uploaded?.markdown || "").trim();
    if (md.length < 200) { setDocBuildMsg("⚠ The document has too little text to build a test."); return; }
    setDocBuilding(true); setDocBuildMsg(`Filtering "${uploaded.filename}" — preserving every passage and question…`);
    try {
      // callJson: callAPI + safeJSON with ONE strict-JSON retry on parse failure.
      const callJson = async (sysP, userP, maxTok, validate) => {
        let out=null, err="";
        for (let a=0; a<2 && !out; a++) {
          const u = a===0 ? userP : `${userP}\n\nYour previous reply was NOT valid JSON (parser: ${err}). Reply with STRICT valid JSON ONLY: escape every double-quote inside strings as \\", no // or /* */ comments, no trailing commas, nothing outside the single JSON object.`;
          const raw = await callAPI(config,[{role:"system",content:sysP},{role:"user",content:u}], maxTok, 0.12);
          try { const j = safeJSON(raw); validate(j); out = j; } catch(e) { err = e.message; }
        }
        if (!out) throw new Error(err || "Invalid JSON");
        return out;
      };
      const preserveSys = `You are a LOSSLESS parser for uploaded IELTS Reading tests. Filter extraction noise, but preserve the COMPLETE original test.

NON-NEGOTIABLE PRESERVATION RULES:
- Keep EVERY reading passage, EVERY passage sentence, EVERY original question, every instruction, every option/heading/feature bank, and their original order.
- NEVER summarise, shorten, paraphrase, replace, merge, reorder, or invent passages or questions.
- Do NOT generate a new 8-13 question set. The output question count MUST equal the number of questions in the uploaded document.
- Allowed visible-text edits only: remove unambiguous OCR/control-character garbage, page numbers, repeated running headers/footers, and answer annotations that leak the correct answer.
- Move answers from an answer key or inline answer annotation into each question's hidden "answer" field. Do not expose those answers in passage/prompt/instruction text.
- If the document has no answer key, derive the best-supported answer from the preserved passage WITHOUT changing or omitting the question.
- Keep separate uploaded passages as separate sections. Do not discard later passages because the document is long.

Use ONLY these app question type ids:
true_false_not_given, yes_no_not_given, matching_information, matching_headings, matching_features, matching_sentence_endings, multiple_choice, multiple_choice_multiple, sentence_completion, summary_completion, note_completion, table_completion, flow_chart_completion, diagram_label_completion, short_answer.
Map an unusual type to the closest id, but preserve its exact visible wording.

Return ONLY strict JSON in this app-native shape:
{"title":"original test title or filename title","sourcePassageCount":1,"sourceQuestionCount":13,"sections":[{"id":"section-1","passage":{"title":"original passage title","topic":"short topic","level":"Band 7.0","sourceNote":"User-uploaded reading test","topic_tags":["tag"],"paragraphs":["complete paragraph 1 verbatim","complete paragraph 2 verbatim"]},"headings":["i. original heading"],"features":["A. original feature"],"questions":[{"sourceNumber":1,"type":"multiple_choice","prompt":"original question wording without leaked answer","instruction":"original instruction","options":["A. original option","B. original option"],"answer":"A","acceptedAnswers":[],"paragraph":"","anchor":"","wordLimit":null,"group":"Questions 1-4"}]}]}`;
      const extracted = await callJson(preserveSys, `RAW UPLOADED DOCUMENT - process ALL content between the markers:\n<document>\n${md}\n</document>`, 16000, j=>{
        if (!Array.isArray(j?.sections) || !j.sections.length) throw new Error("no passages in the response");
        const passageCount = Number(j.sourcePassageCount);
        const questionCount = Number(j.sourceQuestionCount);
        const actualQuestions = j.sections.reduce((sum,section)=>sum+(Array.isArray(section?.questions)?section.questions.length:0),0);
        if (!Number.isFinite(passageCount) || passageCount !== j.sections.length) throw new Error("AI did not preserve every passage");
        if (!Number.isFinite(questionCount) || questionCount < 1 || questionCount !== actualQuestions) throw new Error("AI did not preserve every question");
        j.sections.forEach((section,index)=>{
          if (!Array.isArray(section?.passage?.paragraphs) || !section.passage.paragraphs.some(Boolean)) throw new Error(`passage ${index+1} is empty`);
          if (!Array.isArray(section?.questions) || !section.questions.length) throw new Error(`passage ${index+1} has no preserved questions`);
          if (section.questions.some(q=>q?.sourceNumber==null || !String(q.sourceNumber).trim() || !String(q?.prompt||"").trim() || q?.answer==null || String(q.answer).trim()==="")) throw new Error(`passage ${index+1} contains an incomplete question`);
          section.questions.forEach((q,questionIndex)=>{ q.id = `upload-s${index+1}-q${questionIndex+1}`; });
        });
      });
      const filenameTitle = String(uploaded.filename||"").replace(/\.[^.]+$/,"");
      const mode = extracted.sections.length===3 ? "full" : "section";
      const converted = normalizeReadingTest({
        ...extracted,
        title: extracted.title || filenameTitle || "Imported Reading Test",
        mode,
        preserveQuestionNumbers: true,
        durationSeconds: mode==="full" ? 3600 : Math.max(1200, Number(extracted.sourceQuestionCount||0)*90),
        sourcePolicy: "User-uploaded reading test cleaned and structured by AI."
      }, "Academic", "Band 7.0", "mixed", mode);
      if (converted.questions.length !== Number(extracted.sourceQuestionCount)) throw new Error("Some uploaded questions were lost during normalization.");
      converted.qualityWarnings = validateReadingTest(converted);
      const entry = buildDatasetEntryFromCompleteTest(converted, "imported");
      if (!entry) throw new Error("Could not build a dataset entry.");
      addToDataset(entry);
      setDocBuildMsg(`✓ Added "${entry.title}" — preserved ${entry.passageCount} passage${entry.passageCount===1?"":"s"} and all ${entry.questionCount} questions. Click Practice below.`);
    } catch(e) {
      setDocBuildMsg(`✗ ${e.message}`);
    } finally { setDocBuilding(false); }
  };

  const filteredDataset = readingDataset.filter(e => {
    if (datasetFilter === "all") return true;
    if (datasetFilter === "generated") return e.source === "generated";
    if (datasetFilter === "imported") return e.source === "imported";
    if (datasetFilter === "seed") return e.source === "seed";
    if (datasetFilter === "fewshot") return e.useAsFewShot !== false;
    return true;
  });
  const fewShotCount = readingDataset.filter(e => e.useAsFewShot !== false).length;

  useEffect(()=>{
    setState(s=>({
      ...s,
      readingDraft:{tab,practiceMode,strictMock,topic,difficulty,focusType,questionCount,wikiSubject,testData,answers,result,timerRunning,elapsed,timerStartedAt,timerBase,activeSection,flags,highlights,readingNotes,readingTheme,updatedAt:new Date().toISOString()}
    }));
  },[tab,practiceMode,strictMock,topic,difficulty,focusType,questionCount,wikiSubject,testData,answers,result,timerRunning,elapsed,timerStartedAt,timerBase,activeSection,flags,highlights,readingNotes,readingTheme]);

  useEffect(()=>{
    if (!timerRunning || !timerStartedAt) return;
    const tick = () => setElapsed(timerBase + Math.floor((Date.now()-timerStartedAt)/1000));
    tick();
    const id = setInterval(tick,1000);
    return ()=>clearInterval(id);
  },[timerRunning,timerStartedAt,timerBase]);

  useEffect(()=>{
    if (!selectionToolbar && !activeMark) return;
    const closeFloatingUi = (e) => {
      if (e.target?.closest?.(".reading-selection-toolbar,.reading-mark-popover")) return;
      setSelectionToolbar(null);
      setActiveMark(null);
    };
    const closeOnEscape = (e) => {
      if (e.key === "Escape") {
        setSelectionToolbar(null);
        setActiveMark(null);
      }
    };
    document.addEventListener("mousedown", closeFloatingUi);
    document.addEventListener("touchstart", closeFloatingUi);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeFloatingUi);
      document.removeEventListener("touchstart", closeFloatingUi);
      document.removeEventListener("keydown", closeOnEscape);
    };
  },[selectionToolbar,activeMark]);

  const getRunningElapsed = () => timerRunning && timerStartedAt
    ? timerBase + Math.floor((Date.now()-timerStartedAt)/1000)
    : elapsed;

  const expectedQuestions = practiceMode === "full" ? 40 : practiceMode === "section" ? 13 : questionCount;
  const currentSection = testData?.sections?.[activeSection] || testData?.sections?.[0] || null;
  const duration = testData?.durationSeconds || READING_MODE_META[practiceMode]?.duration || 900;
  const remaining = Math.max(0,duration-elapsed);
  const answeredCount = testData ? testData.questions.filter(q=>{
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : !!String(v||"").trim();
  }).length : 0;

  const startReadingTimer = (seconds=0) => {
    setTimerBase(seconds);
    setElapsed(seconds);
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
  };

  const pauseReadingTimer = () => {
    const next = getRunningElapsed();
    setElapsed(next);
    setTimerBase(next);
    setTimerStartedAt(null);
    setTimerRunning(false);
  };

  const resumeReadingTimer = () => {
    setTimerBase(elapsed);
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
  };

  const loadTest = (data) => {
    const normalized = normalizeReadingTest(data, topic, `Band ${difficulty}`, focusType, data.mode || practiceMode);
    setTestData(normalized);
    setAnswers({});
    setResult(null);
    setFlags({});
    setHighlights({});
    setReadingNotes({});
    setSelectionToolbar(null);
    setActiveMark(null);
    setActiveSection(0);
    setTab("test");
    startReadingTimer(0);
  };

  const generateReadingTest = async () => {
    if (!config) { alert("Set up your AI config in Settings first, or use the demo passage."); return; }
    setGenLoading(true);
    setGenStatus("Starting...");
    try {
      if (practiceMode === "full") {
        await generateFullTest();
      } else {
        await generateSinglePassageTest();
      }
    } catch(e) { alert("Reading generation error: "+e.message); }
    finally { setGenLoading(false); setGenStatus(""); }
  };

  // Strategy "see it on a real passage": set a focused mini test, then auto-generate once
  // the state has settled (so generation reads the right focus/mode), landing in the Test tab.
  const practiceStrategyType = (appFocusType) => {
    if (!config) { alert("Set up your AI config in Settings first to generate a practice passage."); return; }
    setPracticeMode("mini");
    setFocusType(appFocusType);
    setTab("generate");
    setPendingPractice(appFocusType);
  };
  useEffect(()=>{
    if (pendingPractice && practiceMode==="mini" && focusType===pendingPractice && !genLoading) {
      setPendingPractice(null);
      generateReadingTest();
    }
  },[pendingPractice, practiceMode, focusType]);

  // Per-question "🎯 Strategy": scroll the real passage to the question's paragraph and keep a
  // continuous scan line + keyword/answer highlights on it until the strategy is closed.
  const focusStrategyParagraph = (question, section) => {
    if (!question) { setStrategySpot(null); return; }
    const idx = _readingTargetParaIdx(question, section);
    if (idx < 0) { setStrategySpot(null); return; }
    const keywords = _readingKeywordSegments(question.prompt || question.instruction || "")
      .filter(s=>s.hit).map(s=>s.t.replace(/^["']|["']$/g,"").trim()).filter(s=>s.length>=2);
    const anchor = String(question?.anchor || question?.evidenceQuote || question?.evidence || "").trim();
    const answer = Array.isArray(question?.answer) ? question.answer.join(" ") : String(question?.answer||"");
    setStrategySpot({sectionId: section.id, paraIdx: idx, keywords, anchor, answer, nonce: Date.now()});
  };

  const runPassageGeneration = async (topicForGen, sectionDiff, bandForGen, fewShot, sourceText, statusPrefix) => {
    let corrective = "";
    let passageData = null;
    for (let attempt = 0; attempt <= 1; attempt++) {
      const stepLabel = attempt === 0 ? "Generating passage" : "Retrying passage (AI-tell detected)";
      const refNote = fewShot.length > 0 ? ` · ${fewShot.length} reference` : "";
      const srcNote = sourceText ? ` · Wikipedia-grounded` : "";
      setGenStatus(`${statusPrefix||""}${stepLabel}${refNote}${srcNote}...`);
      const passagePrompt = buildPassagePrompt(topicForGen, sectionDiff, bandForGen, fewShot, sourceText, corrective);
      const passageRaw = await callAPI(config, [{role:"system",content:passagePrompt.system},{role:"user",content:passagePrompt.user}], passagePrompt.maxTokens);
      passageData = safeJSON(passageRaw);
      const fullText = (passageData.paragraphs||[]).map(p=>p.text||"").join(" ");
      const tells = detectAITells(fullText);
      if (tells.length === 0 || attempt === 1) {
        if (tells.length > 0) console.warn("[reading] AI-tells remain after retry:", tells);
        return passageData;
      }
      corrective = `Your previous draft used AI-tell phrases (${tells.join("; ")}). Rewrite from scratch WITHOUT any of those phrases. Use natural Cambridge-style transitions instead.`;
    }
    return passageData;
  };

  const generateSinglePassageTest = async () => {
    const sectionDiff = parseFloat(difficulty) >= 8.0 ? 3 : parseFloat(difficulty) >= 7.0 ? 2 : 1;
    const fewShot = pickFewShotExamples(readingDataset, topic, sectionDiff, 1);
    let sourceText = "";
    let wikiTitle = "";
    if (docSource && docSource.markdown) {
      // Document source takes priority over Wikipedia.
      setGenStatus(`Using uploaded document "${docSource.filename}" as source…`);
      sourceText = docSource.markdown;
    } else if (wikiSubject.trim()) {
      try {
        setGenStatus(`Fetching Wikipedia source for "${wikiSubject.trim()}"...`);
        const src = await fetchWikipediaSource(wikiSubject.trim());
        sourceText = src.text;
        wikiTitle = src.title;
      } catch(e) {
        if (!window.confirm(`${e.message}\n\nContinue without Wikipedia source?`)) throw new Error("Cancelled by user.");
      }
    }
    const passageData = await runPassageGeneration(topic, sectionDiff, difficulty, fewShot, sourceText, "");
    const paragraphs = passageData.paragraphs || [];
    if (paragraphs.length < 4) throw new Error("Passage generation returned too few paragraphs. Try again.");
    const passageWithLabels = formatWithLabels(paragraphs);
    const paragraphLabels = paragraphs.map(p => p.label);
    const questionMix = getReadingQuestionMix(practiceMode, focusType, questionCount, paragraphLabels, sectionDiff);
    let allQuestions = [];
    for (let qi = 0; qi < questionMix.length; qi++) {
      const qGroup = questionMix[qi];
      setGenStatus(`Generating ${qGroup.label} questions... (${qi+2}/${questionMix.length+1})`);
      const built = buildAndConvertQuestions(qGroup, passageWithLabels);
      if (!built) continue;
      const qRaw = await callAPI(config, [{role:"system",content:built.prompt.system},{role:"user",content:built.prompt.user}], built.prompt.maxTokens);
      const qData = safeJSON(qRaw);
      allQuestions = [...allQuestions, ...built.convert(qData)];
    }
    const test = {
      mode: practiceMode,
      title: passageData.title || `Academic Reading: ${topic}`,
      durationSeconds: READING_MODE_META[practiceMode].duration,
      sourcePolicy: READING_SOURCE_POLICY,
      sections: [{
        id: "section-1",
        passage: {title:passageData.title||"",topic,level:`Band ${difficulty}`,sourceNote:READING_SOURCE_POLICY,paragraphs:paragraphs.map(p=>p.text),topic_tags:passageData.topic_tags||[]},
        headings: extractHeadingOptions(allQuestions),
        features: [],
        questions: allQuestions,
        vocabulary: []
      }]
    };
    let normalized = normalizeReadingTest(test, topic, `Band ${difficulty}`, focusType, practiceMode);
    const warnings = validateReadingTest(normalized, expectedQuestions);
    normalized.qualityWarnings = warnings;
    if (normalized.questions.length < Math.min(4, expectedQuestions)) throw new Error("Generated reading set is incomplete.");
    // Save to dataset for future few-shot use
    const entry = buildDatasetEntryFromTest(test, "generated", 0);
    if (entry) { entry.topicTags = passageData.topic_tags || []; entry.wordCount = passageData.word_count || entry.wordCount; addToDataset(entry); }
    loadTest(normalized);
  };

  const generateFullTest = async () => {
    const sections = [];
    const passageMeta = [];
    for (let si = 0; si < 3; si++) {
      const sectionNum = si + 1;
      const topicForSection = READING_TOPICS[Math.floor(Math.random() * READING_TOPICS.length)];
      const bandForSection = si === 0 ? "6.5" : si === 1 ? "7.0" : "7.5";
      const fewShot = pickFewShotExamples(readingDataset, topicForSection, sectionNum, 1);
      const passageData = await runPassageGeneration(topicForSection, sectionNum, bandForSection, fewShot, "", `Passage ${sectionNum}/3 (${topicForSection}) · `);
      const paragraphs = passageData.paragraphs || [];
      if (paragraphs.length < 4) throw new Error(`Passage ${sectionNum} generation returned too few paragraphs.`);
      const passageWithLabels = formatWithLabels(paragraphs);
      const paragraphLabels = paragraphs.map(p => p.label);
      const questionMix = getReadingQuestionMix("full", "mixed", 13, paragraphLabels, sectionNum);
      let sectionQuestions = [];
      for (let qi = 0; qi < questionMix.length; qi++) {
        const qGroup = questionMix[qi];
        setGenStatus(`Passage ${sectionNum}/3: ${qGroup.label}...`);
        const built = buildAndConvertQuestions(qGroup, passageWithLabels);
        if (!built) continue;
        const qRaw = await callAPI(config, [{role:"system",content:built.prompt.system},{role:"user",content:built.prompt.user}], built.prompt.maxTokens);
        const qData = safeJSON(qRaw);
        sectionQuestions = [...sectionQuestions, ...built.convert(qData)];
      }
      sections.push({
        id: `section-${sectionNum}`,
        passage: {title:passageData.title||`Passage ${sectionNum}`,topic:topicForSection,level:`Band ${bandForSection}`,sourceNote:READING_SOURCE_POLICY,paragraphs:paragraphs.map(p=>p.text),topic_tags:passageData.topic_tags||[]},
        headings: extractHeadingOptions(sectionQuestions),
        features: [],
        questions: sectionQuestions,
        vocabulary: []
      });
      passageMeta.push({topicTags: passageData.topic_tags || [], wordCount: passageData.word_count || 0});
    }
    const test = {mode:"full",title:"Full IELTS Academic Reading Test",durationSeconds:3600,sourcePolicy:READING_SOURCE_POLICY,sections};
    let normalized = normalizeReadingTest(test, topic, `Band ${difficulty}`, "mixed", "full");
    const warnings = validateReadingTest(normalized, 40);
    normalized.qualityWarnings = warnings;
    const fatalWarnings = warnings.filter(w=>w.severity==="error");
    if (normalized.questions.length !== 40 || fatalWarnings.length) {
      const reason = fatalWarnings.map(w=>w.message).join(" ") || `Expected 40 questions, got ${normalized.questions.length}.`;
      throw new Error(`Full test generation failed quality check. ${reason}`);
    }
    if (normalized.questions.length < 20) throw new Error("Full test generation incomplete — fewer than 20 questions generated.");
    // Save each passage to dataset
    const newEntries = sections.map((_, idx) => {
      const entry = buildDatasetEntryFromTest(test, "generated", idx);
      if (entry && passageMeta[idx]) { entry.topicTags = passageMeta[idx].topicTags; if (passageMeta[idx].wordCount) entry.wordCount = passageMeta[idx].wordCount; }
      return entry;
    });
    addToDataset(newEntries);
    loadTest(normalized);
  };

  const submitAnswers = () => {
    if (!testData) return;
    const elapsedForResult = getRunningElapsed();
    setTimerRunning(false);
    setTimerStartedAt(null);
    setTimerBase(elapsedForResult);
    setElapsed(elapsedForResult);
    const details = testData.questions.map(q=>{
      const section = testData.sections[q.sectionIndex] || {};
      return {
        id:q.id,
        number:q.number,
        sectionNumber:(q.sectionIndex||0)+1,
        sectionTitle:section.title,
        type:q.type,
        prompt:q.prompt,
        answer:q.answer,
        acceptedAnswers:q.acceptedAnswers,
        userAnswer:answers[q.id] || "",
        correct:isReadingAnswerCorrect(q, answers[q.id]),
        explanation:q.explanation,
        skill:q.skill,
        paragraph:q.paragraph,
        anchor:q.anchor,
        trap:q.trap
      };
    });
    const score = details.filter(d=>d.correct).length;
    const total = details.length;
    const summary = {
      id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      date:TODAY(),
      savedAt:new Date().toISOString(),
      mode:testData.mode,
      title:testData.title,
      topic:testData.topic,
      focusType,
      sourcePolicy:testData.sourcePolicy || READING_SOURCE_POLICY,
      score,
      total,
      band:readingEstimatedBand(score,total),
      elapsedSeconds:elapsedForResult,
      durationSeconds:testData.durationSeconds,
      sections:testData.sections,
      questions:testData.questions,
      answers,
      details,
      flags,
      highlights,
      readingNotes,
      readingTheme,
      qualityWarnings:testData.qualityWarnings || []
    };
    setResult(summary);
    setState(s=>({...s, readingTests:[summary,...(s.readingTests||[])]}));
  };

  const loadArchive = (entry) => {
    const restored = normalizeReadingTest(entry, entry.topic || "Reading", entry.level || "Band 7.0", entry.focusType || "mixed", entry.mode || "mini");
    restored.qualityWarnings = entry.qualityWarnings || [];
    setTestData(restored);
    setAnswers(entry.answers || {});
    setResult(entry);
    setFlags(entry.flags || {});
    setHighlights(entry.highlights || {});
    setReadingNotes(entry.readingNotes || {});
    setSelectionToolbar(null);
    setActiveMark(null);
    setReadingTheme(entry.readingTheme || "light");
    setElapsed(entry.elapsedSeconds || 0);
    setTimerBase(entry.elapsedSeconds || 0);
    setTimerStartedAt(null);
    setTimerRunning(false);
    setActiveSection(0);
    setTab("test");
  };

  const deleteArchive = (id) => {
    if (!window.confirm("Delete this Reading attempt?")) return;
    setState(s=>({...s, readingTests:(s.readingTests||[]).filter(x=>x.id!==id)}));
  };

  const resetCurrentTest = () => {
    if (testData && !result && !window.confirm("Clear the current unsaved Reading test?")) return;
    setTestData(null); setAnswers({}); setResult(null); setFlags({}); setHighlights({}); setReadingNotes({}); setSelectionToolbar(null); setActiveMark(null); setElapsed(0); setTimerBase(0); setTimerStartedAt(null); setTimerRunning(false); setTab("generate");
  };

  const toggleFlag = (id) => setFlags(f=>({...f,[id]:!f[id]}));

  const getSelectedReadingText = () => String(window.getSelection?.().toString() || "").trim().replace(/\s+/g," ");

  const handleReadingSelection = () => {
    if (!currentSection) return;
    setTimeout(()=>{
      const selected = getSelectedReadingText();
      if (!selected) { setSelectionToolbar(null); return; }
      const selection = window.getSelection?.();
      if (!selection || selection.rangeCount === 0) return;
      const pane = document.querySelector(".reading-passage-pane");
      if (pane && selection.anchorNode && !pane.contains(selection.anchorNode)) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;
      setSelectionToolbar({
        sectionId:currentSection.id,
        text:selected.slice(0,180),
        canUnhighlight:(highlights[currentSection.id]||[]).some(h=>readingMarkMatchesSelection(selected,typeof h === "string" ? h : h.text)),
        x:Math.min(window.innerWidth-170,Math.max(12,rect.left+(rect.width/2)-78)),
        y:Math.max(12,rect.top-46)
      });
      setActiveMark(null);
    },0);
  };

  const addHighlightFromToolbar = () => {
    if (!selectionToolbar) return;
    setHighlights(h=>{
      const cur = h[selectionToolbar.sectionId]||[];
      if (cur.some(item=>readingMarkMatchesSelection(selectionToolbar.text,typeof item === "string" ? item : item.text))) return h;
      const id = "hl-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      return {...h, [selectionToolbar.sectionId]:[...cur,{id,text:selectionToolbar.text,type:"highlight"}]};
    });
    setSelectionToolbar(null);
    window.getSelection?.().removeAllRanges?.();
  };

  // Remove ONE highlight precisely. Prefer the mark's stable id; fall back to removing the
  // FIRST text match only (legacy string highlights) so identical phrases aren't all wiped.
  const removeHighlightMark = (sectionId, mark) => {
    if (!sectionId || !mark) return;
    setHighlights(h=>{
      const cur = h[sectionId]||[];
      let next;
      const byId = mark.id && cur.some(item=>typeof item!=="string" && item.id===mark.id);
      if (byId) {
        next = cur.filter(item=>typeof item==="string" || item.id!==mark.id);
      } else {
        let removed=false;
        next = cur.filter(item=>{
          const t = typeof item==="string" ? item : item.text;
          if (!removed && mark.text && readingMarkMatchesSelection(mark.text,t)) { removed=true; return false; }
          return true;
        });
      }
      return {...h,[sectionId]:next};
    });
    setSelectionToolbar(null);
    setActiveMark(null);
    window.getSelection?.().removeAllRanges?.();
  };

  const removeHighlightFromToolbar = () => {
    if (!selectionToolbar) return;
    removeHighlightMark(selectionToolbar.sectionId, {text:selectionToolbar.text});
  };

  const addNoteFromToolbar = () => {
    if (!selectionToolbar) return;
    const note = window.prompt("Add a note for this selection:");
    if (!note?.trim()) { setSelectionToolbar(null); return; }
    const item = {
      id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      text:selectionToolbar.text,
      note:note.trim(),
      createdAt:new Date().toISOString()
    };
    setReadingNotes(n=>({
      ...n,
      [selectionToolbar.sectionId]:[...(n[selectionToolbar.sectionId]||[]),item]
    }));
    setSelectionToolbar(null);
    window.getSelection?.().removeAllRanges?.();
  };

  const deleteReadingNote = (sectionId, id) => {
    setReadingNotes(n=>({...n,[sectionId]:(n[sectionId]||[]).filter(it=>it.id!==id)}));
  };
  const jumpToReadingNote = (sectionIndex, note) => {
    setNotesOpen(false);
    setActiveSection(sectionIndex);
    setTimeout(()=>{
      const el = note?.id && document.getElementById(`reading-mark-${note.id}`);
      if (el) el.scrollIntoView({behavior:"smooth",block:"center"});
      else document.querySelector(".reading-passage-pane")?.scrollIntoView({behavior:"smooth",block:"start"});
    },90);
  };

  const openReadingMarkPopover = (mark,e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveMark({
      ...mark,
      text:mark.sourceText || mark.text,
      x:Math.min(window.innerWidth-240,Math.max(12,rect.left+(rect.width/2)-105)),
      y:Math.max(12,rect.top-62)
    });
    setSelectionToolbar(null);
    window.getSelection?.().removeAllRanges?.();
  };

  const average = archive.length ? archive.reduce((sum,x)=>sum+(x.score/(x.total||1)),0)/archive.length : 0;
  const typeStats = {};
  const skillStats = {};
  archive.forEach(a=>(a.details||[]).forEach(d=>{
    const key = d.type || "unknown";
    if (!typeStats[key]) typeStats[key] = {correct:0,total:0};
    typeStats[key].total += 1;
    if (d.correct) typeStats[key].correct += 1;
    const sk = d.skill || "Reading detail";
    if (!skillStats[sk]) skillStats[sk] = {correct:0,total:0};
    skillStats[sk].total += 1;
    if (d.correct) skillStats[sk].correct += 1;
  }));
  const rankReading = obj => Object.entries(obj).map(([k,v])=>({k,...v,rate:v.total?v.correct/v.total:0})).sort((a,b)=>a.rate-b.rate);
  const weakTypeList = rankReading(typeStats);
  const weakSkillList = rankReading(skillStats).slice(0,6);

  return <div className={`canvas fu ${tab==="test"&&testData?"reading-canvas":""} ${readingTheme==="dark"?"reading-dark":""}`}>
    <div className="kicker">IELTS Academic - Reading</div>
    <h1 className="title-x">Reading <em>Lab</em></h1>
    <WorkTabBar kind="reading" tabs={workTabs.tabs} activeId={workTabs.activeId} onSelect={workTabs.selectTab} onNew={workTabs.newTab} onClose={workTabs.closeTab}/>
    <div className="mode-toggle">
      <button className={`mode-btn ${tab==="generate"?"active":""}`} onClick={()=>setTab("generate")}>Generate</button>
      <button className={`mode-btn ${tab==="test"?"active":""}`} onClick={()=>setTab("test")}>Test</button>
      <button className={`mode-btn ${tab==="dataset"?"active":""}`} onClick={()=>setTab("dataset")}>Dataset {readingDataset.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:3}}>({readingDataset.length})</span>}</button>
      <button className={`mode-btn ${tab==="archive"?"active":""}`} onClick={()=>setTab("archive")}>Archive {archive.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:3}}>({archive.length})</span>}</button>
      <button className={`mode-btn ${tab==="theory"?"active":""}`} onClick={()=>setTab("theory")}>📖 Theory</button>
      <button className={`mode-btn ${tab==="strategies"?"active":""}`} onClick={()=>setTab("strategies")}>🎯 Strategies</button>
    </div>

    {tab==="theory"&&<ReadingTheoryView/>}
    {tab==="strategies"&&<ReadingStrategiesView config={config} onPractice={practiceStrategyType}/>}

    {tab==="generate"&&<div className="fu">
      <ReadingScanDrill/>
      <div className="card mb14">
        <div className="card-h"><div className="cdot"/>Reading Source</div>
        <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.65}}>
          Multi-step pipeline: passage generated first with Cambridge-style style specs, then each question type generated separately with specialist item-writer prompts. Produces significantly more authentic T/F/NG, MCQ, and completion questions than single-shot generation.
        </div>
      </div>
      <div className="card">
        <div className="mode-toggle" style={{marginBottom:12}}>
          {Object.entries(READING_MODE_META).map(([id,m])=><button key={id} className={`mode-btn ${practiceMode===id?"active":""}`} onClick={()=>setPracticeMode(id)}>{m.label}</button>)}
        </div>
        <div className="row-f">
          <div className="field"><div className="field-label">Topic</div><select value={topic} onChange={e=>setTopic(e.target.value)}>{READING_TOPICS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="field"><div className="field-label">Difficulty</div><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{["5.5","6.0","6.5","7.0","7.5","8.0"].map(x=><option key={x} value={x}>Band {x}</option>)}</select></div>
          <div className="field"><div className="field-label">Question focus</div><select value={focusType} onChange={e=>setFocusType(e.target.value)} disabled={practiceMode==="full"}>{READING_FOCUS_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          {practiceMode==="mini"&&<div className="field" style={{maxWidth:120}}><div className="field-label">Questions</div><select value={questionCount} onChange={e=>setQuestionCount(Number(e.target.value))}>{[6,8,10,12].map(n=><option key={n} value={n}>{n}</option>)}</select></div>}
        </div>
        {practiceMode!=="full"&&<div className="field" style={{marginTop:10}}>
          <div className="field-label">Source material (optional — grounds facts in real content)</div>
          <input type="text" value={wikiSubject} onChange={e=>setWikiSubject(e.target.value)} placeholder="Wikipedia topic (e.g., bioluminescence, urban planning)" style={{width:"100%"}}/>
          <div style={{fontSize:10.5,color:"var(--ink3)",marginTop:3,lineHeight:1.5}}>Wikipedia: AI extracts real names/dates/numbers from the article. To use your OWN document, upload it in the <strong>Dataset</strong> tab — it's saved and reused as a reference for every generation. Leave blank to let the AI invent facts.</div>
        </div>}
        <label style={{display:"flex",gap:8,alignItems:"center",marginTop:12,fontSize:12.5,color:"var(--ink2)",cursor:"pointer"}}>
          <input type="checkbox" checked={strictMock} onChange={e=>setStrictMock(e.target.checked)}/>
          <span><strong style={{color:"var(--ink)"}}>Strict mock mode</strong> — exam simulation: timer can't be paused and quality-check hints are hidden during the test.</span>
        </label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12,alignItems:"center"}}>
          <button className="btn bp" onClick={generateReadingTest} disabled={genLoading||!config}>{genLoading?<><Spinner/> {genStatus||"Generating..."}</>:`Generate ${READING_MODE_META[practiceMode].label}`}</button>
          <button className="btn bs" onClick={()=>loadTest(makeDemoReadingTest())} disabled={genLoading}>Use demo section</button>
          <span style={{fontSize:11,color:"var(--ink3)"}}>{READING_MODE_META[practiceMode].passages} passage{READING_MODE_META[practiceMode].passages>1?"s":""} · {READING_MODE_META[practiceMode].questions} questions · {Math.round(READING_MODE_META[practiceMode].duration/60)} min · {practiceMode==="full"?"~12 API calls":practiceMode==="section"?"~4 API calls":"~3 API calls"}</span>
        </div>
        {!config&&<div className="alert aw mt8">AI config required for generation. Demo section works offline.</div>}
      </div>
    </div>}

    {tab==="dataset"&&<div className="fu">
      <div className="card mb14">
        <div className="card-h"><div className="cdot"/>Reading Dataset</div>
        <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.65}}>
          Every generated and imported passage is saved here. When you generate a new test, one matching passage from this dataset is used as a few-shot style reference — the AI matches its register, structure, and density while creating new content. Toggle <strong>Few-shot</strong> per entry to include/exclude it from the reference pool.
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10,alignItems:"center"}}>
          <label className="btn bp" style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
            Import JSON
            <input type="file" accept=".json" multiple style={{display:"none"}} onChange={handleLibraryImport}/>
          </label>
          <button className="btn bs" onClick={exportDataset} disabled={readingDataset.length===0}>Export dataset</button>
          <button className="btn" onClick={clearDataset} disabled={readingDataset.length===0} style={{color:"var(--rose)"}}>Clear all</button>
          <span style={{fontSize:11,color:"var(--ink3)",marginLeft:"auto"}}>{readingDataset.length} total · {fewShotCount} active as few-shot</span>
        </div>
      </div>
      <div className="card mb14">
        <div className="card-h"><div className="cdot" style={{background:"var(--honey)"}}/>Add gold reference passage</div>
        <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.65,marginBottom:10}}>
          Paste a real Cambridge IELTS passage (or any Band 7+ academic passage you trust), or upload a document below. Even 1-2 high-quality references dramatically lift the style fidelity of every future generation — the underlying tool's README calls this the single biggest quality lever.
        </div>
        <div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>
          <div style={{fontSize:12.5,fontWeight:600,color:"var(--ink1)",marginBottom:3}}>📎 Upload a reading test → AI preserves the complete test</div>
          <div style={{fontSize:11,color:"var(--ink3)",marginBottom:8,lineHeight:1.5}}>Upload a real reading passage or past paper (PDF / DOCX / PPTX / TXT). The AI filters extraction noise and leaked answers while preserving <strong>every passage and every original question</strong>, including instructions, options, numbering, and order. Needs an AI provider configured.</div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <MarkItDownUploader compact label={docBuilding?"Building…":"📎 Upload reading test"} disabled={docBuilding||!config} onResult={r=>buildPracticeTestFromDoc(r)}/>
            {docBuilding&&<Spinner/>}
            {!config&&<span style={{fontSize:10.5,color:"var(--honey)"}}>⚠ Set an AI provider in Settings first.</span>}
          </div>
          {docBuildMsg&&<div style={{marginTop:7,fontSize:11.5,lineHeight:1.5,color:docBuildMsg.startsWith("✓")?"var(--leaf)":(docBuildMsg.startsWith("✗")||docBuildMsg.startsWith("⚠"))?"var(--rose)":"var(--ink2)"}}>{docBuildMsg}</div>}
        </div>
        <div style={{fontSize:12,fontWeight:600,color:"var(--ink1)",marginBottom:6}}>Or add a passage manually (reference only — no questions)</div>
        <div className="row-f">
          <div className="field"><div className="field-label">Title</div><input type="text" value={seedTitle} onChange={e=>setSeedTitle(e.target.value)} placeholder="e.g., The hidden life of trees"/></div>
          <div className="field"><div className="field-label">Topic / tags</div><input type="text" value={seedTopic} onChange={e=>setSeedTopic(e.target.value)} placeholder="e.g., biology, ecology"/></div>
          <div className="field" style={{maxWidth:140}}><div className="field-label">Band</div><select value={seedDifficulty} onChange={e=>setSeedDifficulty(e.target.value)}>{["6.0","6.5","7.0","7.5","8.0"].map(x=><option key={x} value={x}>Band {x}</option>)}</select></div>
        </div>
        <div className="field" style={{marginTop:8}}>
          <div className="field-label">Paragraphs (separate with one blank line · paragraph labels added automatically)</div>
          <textarea value={seedParagraphs} onChange={e=>setSeedParagraphs(e.target.value)} rows={8} placeholder={"First paragraph text here.\n\nSecond paragraph text here.\n\nThird paragraph text here."} style={{width:"100%",fontFamily:"inherit",fontSize:13,lineHeight:1.5,padding:8,border:"1px solid var(--border)",borderRadius:6,background:"var(--surface2)",color:"var(--ink1)",resize:"vertical"}}/>
        </div>
        <button className="btn bp" onClick={addSeedPassage} disabled={!seedTitle.trim()||!seedParagraphs.trim()} style={{marginTop:10}}>Add as reference</button>
      </div>
      {readingDataset.length>0&&<div className="mode-toggle" style={{marginBottom:10}}>
        {[{id:"all",label:"All"},{id:"generated",label:"Generated"},{id:"imported",label:"Imported"},{id:"seed",label:"Seed"},{id:"fewshot",label:"Few-shot only"}].map(f=>(
          <button key={f.id} className={`mode-btn ${datasetFilter===f.id?"active":""}`} onClick={()=>setDatasetFilter(f.id)}>{f.label}</button>
        ))}
      </div>}
      {readingDataset.length===0
        ? <div className="empty" style={{padding:28}}>Dataset is empty. Generate a test, or import JSON files from the IELTS Reading Tool (<code>data/approved/*.json</code>) or a previously exported dataset.</div>
        : filteredDataset.length===0
          ? <div className="empty" style={{padding:20}}>No entries match this filter.</div>
          : <div style={{display:"grid",gap:10}}>
              {filteredDataset.map(entry=>{
                const isFewShot = entry.useAsFewShot !== false;
                const badgeColor = entry.source==="generated" ? "var(--orchid)" : entry.source==="seed" ? "var(--honey)" : "var(--leaf)";
                const canPractice = (entry.questionCount||0) > 0;
                return <div key={entry.id} className="card" style={{padding:"12px 14px",opacity:isFewShot?1:0.7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,padding:"1px 6px",borderRadius:4,background:badgeColor,color:"#fff",textTransform:"uppercase",letterSpacing:0.5}}>{entry.source||"imported"}</span>
                        {isFewShot&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,padding:"1px 6px",borderRadius:4,background:"var(--surface2)",color:"var(--ink2)",border:"1px solid var(--border)"}}>FEW-SHOT</span>}
                        <span style={{fontWeight:600,fontSize:13.5,color:"var(--ink1)"}}>{entry.title}</span>
                      </div>
                      <div style={{fontSize:11.5,color:"var(--ink3)"}}>{entry.topic||"—"}{entry.level?` · ${entry.level}`:""} · {entry.passageCount>1?`${entry.passageCount} passages`:`Section ${entry.section||"?"}`} · {entry.questionCount} questions{entry.wordCount?` · ${entry.wordCount} words`:""}{entry.topicTags?.length>0?` · ${entry.topicTags.slice(0,3).join(", ")}`:""}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      <button className="btn" style={{fontSize:12,padding:"5px 10px"}} onClick={()=>toggleFewShot(entry.id)} title={isFewShot?"Disable as few-shot reference":"Enable as few-shot reference"}>{isFewShot?"In pool":"Off pool"}</button>
                      {canPractice&&<button className="btn bp" style={{fontSize:12,padding:"5px 10px"}} onClick={()=>loadDatasetEntry(entry)}>Practice</button>}
                      <button className="btn" style={{fontSize:12,padding:"5px 10px",color:"var(--rose)"}} onClick={()=>removeDatasetEntry(entry.id)}>Remove</button>
                    </div>
                  </div>
                </div>;
              })}
            </div>
      }
    </div>}

    {tab==="test"&&<div className="fu reading-test">
      {!testData ? <div className="empty" style={{padding:28}}>Generate or load a Reading test first.</div> : <>
        <div className="reading-exam-bar">
          <div className="reading-exam-title">
            <span>IELTS Academic Reading</span>
            <strong>{testData.title}</strong>
          </div>
          <div className="reading-exam-stats">
            <span>{testData.questions.length} questions</span>
            <span>{answeredCount} answered</span>
            <span>{Object.values(flags).filter(Boolean).length} flagged</span>
            {(()=>{ const nc=Object.values(readingNotes||{}).reduce((n,arr)=>n+(arr?.length||0),0); return nc>0?<button className="reading-control-btn" onClick={()=>setNotesOpen(true)}>{nc} note{nc!==1?"s":""}</button>:null; })()}
            {testData.qualityWarnings?.length>0&&(!strictMock||result)&&<button className="reading-control-btn" style={{color:"var(--honey)"}} onClick={()=>setWarnOpen(w=>!w)}>{testData.qualityWarnings.length} check{testData.qualityWarnings.length!==1?"s":""}</button>}
            {strictMock&&!result&&<span className="reading-control-btn" style={{color:"var(--orchid)",cursor:"default"}}>Strict mock</span>}
            <div className={`reading-time ${remaining<300&&!result?"urgent":""}`}>
              <small>{result?"time used":"time left"}</small>
              <strong>{result?formatReadingTime(elapsed):formatReadingTime(remaining)}</strong>
            </div>
            {!result&&!strictMock&&<button className="reading-control-btn" onClick={timerRunning?pauseReadingTimer:resumeReadingTimer}>{timerRunning?"Pause":"Resume"}</button>}
            <button className="reading-control-btn muted" onClick={()=>setReadingTheme(t=>t==="light"?"dark":"light")}>{readingTheme==="light"?"Dark":"Light"}</button>
            <button className="reading-control-btn muted" onClick={resetCurrentTest}>New</button>
          </div>
        </div>
        {warnOpen&&testData.qualityWarnings?.length>0&&<div className="reading-warn-panel">
          {testData.qualityWarnings.map((w,i)=><div key={i} className={`reading-warn-item ${w.severity}`}>{w.severity==="error"?"✗":"!"} {w.message}</div>)}
        </div>}
        <ReadingNotesDrawer open={notesOpen} onClose={()=>setNotesOpen(false)} notesBySection={readingNotes} sections={testData.sections} onJump={jumpToReadingNote} onDelete={deleteReadingNote}/>

        {testData.sections.length>1&&<div className="reading-section-tabs">
          {testData.sections.map((s,i)=><button key={s.id} className={`reading-section-tab ${activeSection===i?"active":""}`} onClick={()=>setActiveSection(i)}>
            <span>Passage {i+1}</span>
            <strong>{s.questions.length}</strong>
          </button>)}
        </div>}

        <div className="reading-workstation">
          {currentSection&&<ReadingPassage
            section={currentSection}
            highlights={highlights}
            notes={readingNotes}
            spotlight={strategySpot}
            onSelection={handleReadingSelection}
            onMarkClick={openReadingMarkPopover}
            onClearHighlights={()=>{
              setHighlights(h=>({...h,[currentSection.id]:[]}));
              setReadingNotes(n=>({...n,[currentSection.id]:[]}));
              setSelectionToolbar(null);
              setActiveMark(null);
            }}
          />}
          <ReadingSelectionToolbar selection={selectionToolbar} onHighlight={addHighlightFromToolbar} onUnhighlight={removeHighlightFromToolbar} onNote={addNoteFromToolbar} onClose={()=>setSelectionToolbar(null)}/>
          <ReadingMarkPopover mark={activeMark} onUnhighlight={()=>removeHighlightMark(activeMark?.sectionId,activeMark)} onClose={()=>setActiveMark(null)}/>
          <div className="reading-question-pane">
            <ReadingAnswerSheet testData={testData} answers={answers} result={result} flags={flags} activeSection={activeSection} setActiveSection={setActiveSection}/>
            <div className="reading-question-scroll">
              <ReadingBank title="Heading Bank" items={currentSection?.headings||[]}/>
              <ReadingBank title="Feature Bank" items={currentSection?.features||[]}/>
              {readingQuestionGroups(currentSection?.questions||[]).map(group=><ReadingQuestionGroup key={group.key+group.questions[0]?.id} group={group} section={currentSection} answers={answers} result={result} flags={flags} setAnswers={setAnswers} toggleFlag={toggleFlag} config={config} onStrategyFocus={focusStrategyParagraph}/>)}
              {!result&&<div className="reading-panel-actions"><button className="reading-submit-btn" onClick={submitAnswers}>Submit answers</button></div>}
              {result&&<ReadingReviewPanel result={result}/>}
            </div>
          </div>
        </div>
      </>}
    </div>}

    {tab==="archive"&&<div className="fu">
      <div className="cols-3">
        <div className="card stat-card"><div className="sv">{archive.length}</div><div className="sl">Attempts</div></div>
        <div className="card stat-card sc-sky"><div className="sv">{archive.length?Math.round(average*100):0}%</div><div className="sl">Avg accuracy</div></div>
        <div className="card stat-card sc-orchid"><div className="sv">{archive[0]?.band?.toFixed?.(1)||"-"}</div><div className="sl">Latest band</div></div>
      </div>
      {weakTypeList.length>0&&<div className="card">
        <div className="card-h"><div className="cdot"/>Question Type Accuracy <span style={{fontSize:10,color:"var(--ink3)",fontWeight:400,marginLeft:4}}>weakest first</span></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{weakTypeList.map(x=><span key={x.k} className="sublist-btn" style={{cursor:"default",borderColor:x.rate<0.6?"var(--rose)":x.rate<0.8?"var(--honey)":"var(--border2)",color:x.rate<0.6?"var(--rose)":"var(--ink2)"}}>{readingTypeLabel(x.k)} {x.correct}/{x.total} ({Math.round(x.rate*100)}%)</span>)}</div>
        {weakSkillList.length>0&&<><div className="sl" style={{margin:"12px 0 6px"}}>By skill (weakest first)</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{weakSkillList.map(x=><span key={x.k} className="sublist-btn" style={{cursor:"default",borderColor:x.rate<0.6?"var(--rose)":x.rate<0.8?"var(--honey)":"var(--border2)",color:x.rate<0.6?"var(--rose)":"var(--ink2)"}}>{x.k} {x.correct}/{x.total} ({Math.round(x.rate*100)}%)</span>)}</div></>}
        {archive.length>=2&&weakTypeList[0]&&weakTypeList[0].rate<0.6&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5,marginTop:10}}>Focus next: <strong style={{color:"var(--rose)"}}>{readingTypeLabel(weakTypeList[0].k)}</strong> is your weakest recurring type at {Math.round(weakTypeList[0].rate*100)}% across {archive.length} attempts.</div>}
      </div>}
      {archive.length===0 ? <div className="empty" style={{padding:28}}>No Reading attempts yet.</div> : <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {archive.map(a=><div key={a.id} className="card" style={{padding:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.title}</div>
              <div style={{fontSize:11,color:"var(--ink3)",marginTop:3}}>{a.date} - {a.mode||"practice"} - {a.score}/{a.total} - Band {a.band?.toFixed?.(1)||a.band} - {formatReadingTime(a.elapsedSeconds||0)}</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button className="btn bs bsm" onClick={()=>loadArchive(a)}>Review</button>
              <button className="btn bg bsm" onClick={()=>deleteArchive(a.id)} style={{color:"var(--rose)"}}>Delete</button>
            </div>
          </div>
        </div>)}
      </div>}
    </div>}
  </div>;
}
