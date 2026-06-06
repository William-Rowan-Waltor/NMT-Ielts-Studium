// EN_GLOSS: hand-crafted plain-English glosses for high-frequency AWL headwords.
// Used as the *anchor* for definition synthesis — avoids circular self-referencing definitions.
// Coverage: ~80 most-used AWL words (Sub 1-3 priority). Fallback for others uses templates.
const EN_GLOSS = {
  "analyse":"to examine something in detail in order to understand or explain it",
  "approach":"a particular way of dealing with a problem or task",
  "area":"a part of a place, subject, or activity",
  "assess":"to judge or decide the amount, value, quality, or importance of something",
  "assume":"to accept that something is true without proof, often for reasoning purposes",
  "authority":"the power or right to give orders, or an official body with this power",
  "available":"able to be used, obtained, or accessed",
  "benefit":"a helpful or useful effect that something has",
  "concept":"an abstract idea or general notion",
  "consist":"to be composed or made up of specific parts",
  "constitute":"to be the parts that together form something; to make up",
  "context":"the circumstances or background that surround an event or text",
  "contract":"a written legal agreement; or, to become smaller in size",
  "create":"to bring something into existence",
  "data":"facts or information collected for analysis",
  "define":"to state precisely what something means or to mark its limits clearly",
  "derive":"to obtain or come from a source or origin",
  "distribute":"to share something out among a group, or spread over an area",
  "economy":"the system of how a country produces, distributes, and uses money and goods",
  "environment":"the natural world; or the surroundings in which something exists",
  "establish":"to set up or found something on a firm basis",
  "estimate":"to calculate approximately the value, size, or quantity of something",
  "evident":"clearly seen or understood; obvious",
  "export":"to send goods or services to another country for sale",
  "factor":"one of several things that contribute to a result",
  "finance":"the management of money; or to provide funding for something",
  "formula":"a mathematical rule, chemical recipe, or fixed method",
  "function":"the purpose or role something serves; how it operates",
  "identify":"to recognize and name; to establish identity",
  "income":"money received, especially from work or investments",
  "indicate":"to point out or show; to be a sign of",
  "individual":"a single person or thing, considered separately from a group",
  "interpret":"to explain the meaning of; to understand in a particular way",
  "involve":"to include as a necessary part; to engage someone in an activity",
  "issue":"an important topic or problem; or to officially produce/give out",
  "labour":"physical or mental work; or the workforce",
  "legal":"relating to or permitted by the law",
  "legislate":"to make or enact laws",
  "major":"important, serious, or large in scale",
  "method":"a particular way of doing something; a procedure",
  "occur":"to happen or take place",
  "percent":"per hundred; expressing a proportion out of 100",
  "period":"a length of time; or a particular era",
  "policy":"a plan or course of action adopted by a government or organization",
  "principle":"a fundamental truth, rule, or belief that guides behaviour",
  "proceed":"to continue or move forward with an action",
  "process":"a series of actions taken to achieve a result",
  "require":"to need something; to demand by rule or necessity",
  "research":"systematic investigation to establish facts or develop knowledge",
  "respond":"to react or reply to something",
  "role":"the function or position someone or something has",
  "section":"a distinct part or division of something",
  "sector":"a distinct area of an economy or society",
  "significant":"important, noticeable, or large enough to matter",
  "similar":"having qualities in common; alike but not identical",
  "source":"the origin or starting point of something",
  "specific":"clearly defined or particular; not general",
  "structure":"the arrangement of parts that form something; or to organize systematically",
  "theory":"a set of ideas explaining how something works",
  "vary":"to differ or change from one case to another",
  "primary":"first in importance, order, or development",
  "tradition":"a long-established custom or belief passed through generations",
  "parameter":"a numerical or measurable factor that defines the limits of a system",
  "notion":"a belief, idea, or concept",
  "bond":"a strong connection between people; or a financial debt instrument",
  "estate":"a large area of land; or all the property a person owns",
  "definite":"clearly fixed, certain, or unambiguous",
  "dispose":"to get rid of something; or to arrange in a position",
  "dynamic":"characterized by constant change, energy, or activity"
};

// Lazy index of AWL_DATA by headword form — for cross-lookup of family members
// that have their own standalone entries (e.g. "definite" is a family member of "define"
// but ALSO has its own entry s7-015 with the correct meaning "nhất định, xác định").
let _awlFormIndex = null;
function getAwlFormIndex() {
  if (_awlFormIndex) return _awlFormIndex;
  _awlFormIndex = new Map();
  if (typeof AWL_DATA === "undefined") return _awlFormIndex;
  for (const e of AWL_DATA) _awlFormIndex.set(e.hw.toLowerCase(), e);
  return _awlFormIndex;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FAMILY_GLOSS: hand-crafted REAL meanings for high-value family forms.
// Each form has its DISTINCT meaning (not a templated wrap of the headword).
// Coverage target: top 50-80 family forms from Sub 1-3 most-used AWL words.
// For forms NOT in this dict, the morphology engine derives an approximation.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FAMILY_GLOSS = {
  // === DEFINE family ===
  "defined":      {vi:"đã được xác định; rõ ràng, có giới hạn rõ (vd: well-defined goals = mục tiêu rõ ràng)", en:"clearly outlined or specified; sharply set out"},
  "defining":     {vi:"mang tính then chốt, đặc trưng (vd: defining moment = khoảnh khắc bước ngoặt)", en:"essential to identity; decisive (e.g. defining moment)"},
  "definition":   {vi:"(1) định nghĩa, lời định nghĩa; (2) độ nét, độ phân giải (HD = high definition)", en:"(1) a statement of meaning; (2) sharpness/clarity (e.g. HD)"},
  "definitive":   {vi:"chung cuộc, đáng tin cậy nhất, không thể tranh cãi (vd: definitive guide = cẩm nang chuẩn)", en:"conclusive, authoritative, final (e.g. definitive guide)"},
  "definitely":   {vi:"chắc chắn, dứt khoát, không nghi ngờ (KHÔNG đồng nghĩa với 'define')", en:"certainly; without doubt"},
  "definitively": {vi:"một cách dứt khoát, một cách chung cuộc", en:"in a final, conclusive manner"},

  // === ANALYSE family ===
  "analysis":     {vi:"sự/việc phân tích; bản phân tích chi tiết", en:"detailed examination of elements or structure"},
  "analyses":     {vi:"các bản phân tích (số nhiều của analysis); hoặc (động từ) phân tích — ngôi 3 số ít", en:"plural of analysis; or 3rd-person singular of analyse"},
  "analyst":      {vi:"nhà/chuyên viên phân tích (vd: data analyst, financial analyst)", en:"a professional who analyses information"},
  "analysed":     {vi:"đã được phân tích (quá khứ/quá khứ phân từ)", en:"past tense or past participle of analyse"},
  "analysing":    {vi:"đang phân tích; việc phân tích", en:"present participle of analyse"},
  "analytical":   {vi:"mang tính phân tích, có tư duy phân tích (vd: analytical thinking)", en:"using or skilled in logical analysis"},
  "analytically": {vi:"một cách có phân tích, theo cách phân tích", en:"in an analytical manner"},

  // === APPROACH family ===
  "approaches":   {vi:"các phương pháp/cách tiếp cận; hoặc (v) tiếp cận — ngôi 3 số ít", en:"plural noun; or 3rd-person singular verb of approach"},
  "approached":   {vi:"đã tiếp cận; đã được tiếp cận", en:"past tense/participle of approach"},
  "approaching":  {vi:"đang đến gần, sắp tới (vd: approaching deadline)", en:"coming closer; upcoming"},
  "approachable": {vi:"dễ tiếp cận, dễ gần (về tính cách); dễ hiểu (về nội dung)", en:"easy to talk to or understand"},

  // === ASSESS family ===
  "assessment":   {vi:"sự/bài đánh giá; bài kiểm tra đánh giá", en:"the act or result of evaluation; an evaluation test"},
  "assessor":     {vi:"người đánh giá, giám định viên", en:"a person who officially evaluates"},
  "assessed":     {vi:"đã được đánh giá", en:"past tense/participle of assess"},
  "assessing":    {vi:"đang đánh giá; việc đánh giá", en:"present participle of assess"},
  "assessable":   {vi:"có thể đánh giá được", en:"capable of being evaluated"},

  // === ASSUME family ===
  "assumption":   {vi:"giả định, điều giả định (vd: underlying assumption = giả định nền tảng)", en:"a thing accepted as true without proof"},
  "assumed":      {vi:"được giả định; (tính từ) giả, không thật (vd: assumed name = tên giả)", en:"taken as true; or fake/pretended (e.g. assumed name)"},
  "assuming":     {vi:"giả sử rằng (liên từ); đang giả định", en:"supposing that (conjunction); presupposing"},

  // === CONCEPT family ===
  "conception":   {vi:"(1) sự hình thành ý tưởng; (2) sự thụ thai", en:"(1) formation of an idea; (2) the act of becoming pregnant"},
  "conceptual":   {vi:"thuộc về khái niệm, mang tính khái niệm (vd: conceptual framework)", en:"relating to abstract ideas or frameworks"},
  "conceptually": {vi:"về mặt khái niệm, một cách khái niệm", en:"in terms of concepts; in an abstract way"},
  "conceptualise":{vi:"hình thành/xây dựng khái niệm", en:"to form a concept or theoretical idea of"},

  // === CONSIST family ===
  "consistency":  {vi:"tính nhất quán; độ đặc/sệt (về vật chất)", en:"the quality of being consistent; or thickness of a substance"},
  "consistent":   {vi:"nhất quán, đồng nhất, kiên định", en:"unchanging; in agreement; reliable"},
  "consistently": {vi:"một cách nhất quán, liên tục, đều đặn", en:"in a steady, unchanging manner"},
  "inconsistency":{vi:"sự không nhất quán, sự mâu thuẫn", en:"lack of consistency; contradiction"},
  "inconsistent": {vi:"không nhất quán, mâu thuẫn", en:"not consistent; contradictory"},

  // === CREATE family ===
  "creation":     {vi:"sự sáng tạo; sản phẩm sáng tạo; (the Creation) Sáng thế", en:"the act of creating; something created"},
  "creator":      {vi:"người sáng tạo, người tạo ra; (Đấng) Tạo hóa", en:"a person who creates; (cap.) the Creator"},
  "creativity":   {vi:"tính sáng tạo, óc sáng tạo", en:"the ability to create; imaginative skill"},
  "creative":     {vi:"có óc sáng tạo, mang tính sáng tạo", en:"showing imagination or originality"},
  "creatively":   {vi:"một cách sáng tạo", en:"in a creative manner"},

  // === ECONOMY family ===
  "economics":    {vi:"kinh tế học (môn học)", en:"the study of how economies work (academic discipline)"},
  "economist":    {vi:"nhà kinh tế học", en:"an expert in economics"},
  "economic":     {vi:"thuộc về kinh tế (vd: economic growth = tăng trưởng kinh tế)", en:"relating to the economy or money"},
  "economical":   {vi:"tiết kiệm, kinh tế (về cách dùng) — KHÁC economic", en:"thrifty; avoiding waste — DIFFERENT from 'economic'"},
  "economically": {vi:"về mặt kinh tế; một cách tiết kiệm", en:"in terms of the economy; or thriftily"},
  "economise":    {vi:"tiết kiệm, sử dụng tiết kiệm", en:"to be sparing in use of resources"},

  // === ENVIRONMENT family ===
  "environmental":{vi:"thuộc về môi trường (vd: environmental impact)", en:"relating to the natural environment"},
  "environmentalist":{vi:"nhà bảo vệ môi trường, nhà hoạt động môi trường", en:"a person who works to protect nature"},
  "environmentally":{vi:"về mặt môi trường (vd: environmentally friendly)", en:"in relation to the environment"},

  // === ESTABLISH family ===
  "establishment":{vi:"(1) sự thành lập; (2) cơ sở/tổ chức đã được thiết lập; (3) the Establishment = giới quyền lực", en:"(1) act of founding; (2) an institution; (3) the ruling elite"},
  "established":  {vi:"đã được thiết lập, đã có uy tín (vd: well-established firm)", en:"firmly settled or recognized"},

  // === EVIDENT family ===
  "evidence":     {vi:"bằng chứng, chứng cứ", en:"proof; facts supporting a claim"},
  "evidential":   {vi:"có tính bằng chứng, dựa trên bằng chứng", en:"based on or providing evidence"},
  "evidently":    {vi:"rõ ràng (là); hiển nhiên", en:"clearly; as can be seen"},

  // === IDENTIFY family ===
  "identification":{vi:"sự nhận dạng; giấy tờ tùy thân (ID)", en:"the act of identifying; or identity documents"},
  "identity":     {vi:"danh tính, bản sắc, đặc tính nhận dạng", en:"who someone is; distinguishing character"},
  "identifiable": {vi:"có thể nhận dạng được, dễ nhận biết", en:"able to be recognized"},

  // === INDICATE family ===
  "indication":   {vi:"dấu hiệu, sự chỉ ra", en:"a sign or piece of information"},
  "indicator":    {vi:"chỉ số, chỉ báo (vd: economic indicator); đèn xi-nhan", en:"a measure or sign (e.g. economic indicator); turn signal"},
  "indicative":   {vi:"chỉ ra điều gì đó, biểu thị (vd: indicative of a trend)", en:"serving as a sign of (e.g. indicative of)"},

  // === SIGNIFICANT family ===
  "significance": {vi:"tầm quan trọng, ý nghĩa quan trọng", en:"importance; meaningful weight"},
  "significantly":{vi:"một cách đáng kể, một cách rõ rệt", en:"to a noticeable degree"},

  // === STRUCTURE family ===
  "structural":   {vi:"thuộc về cấu trúc, mang tính kết cấu", en:"relating to the structure or framework"},
  "structurally": {vi:"về mặt cấu trúc", en:"in terms of structure"},
  "structured":   {vi:"có cấu trúc, được tổ chức bài bản", en:"organized in a systematic way"},

  // === FUNCTION family ===
  "functional":   {vi:"có chức năng hoạt động được; thực dụng (vd: functional design)", en:"working properly; practical (e.g. functional design)"},
  "functionally": {vi:"về mặt chức năng", en:"in terms of function"},
  "functionality":{vi:"tính năng, các chức năng (vd: software functionality)", en:"the range of operations a system can perform"},

  // === INTERPRET family ===
  "interpretation":{vi:"sự diễn giải; cách hiểu; bản dịch nói", en:"an explanation of meaning; a rendition"},
  "interpreter":  {vi:"phiên dịch viên (dịch nói)", en:"a person who translates speech orally"},
  "interpretive": {vi:"mang tính diễn giải", en:"relating to interpretation"},

  // === INVOLVE family ===
  "involvement":  {vi:"sự tham gia, sự liên quan, mức độ dấn thân", en:"participation; engagement"},
  "involved":     {vi:"liên quan; phức tạp, rắc rối (vd: it's complicated and involved)", en:"connected to; or complex/complicated"},
  "involving":    {vi:"có liên quan đến, bao gồm việc", en:"including; entailing"},

  // === PRIMARY / PRIMARILY ===
  "primarily":    {vi:"chủ yếu, trước hết, ban đầu", en:"mainly; for the most part"},

  // === TRADITION family ===
  "traditional":  {vi:"truyền thống, mang tính truyền thống", en:"following established customs"},
  "traditionally":{vi:"theo truyền thống, theo lệ", en:"according to long-established practice"}
};

// SUFFIX_DERIVATION: rules for deriving meaning from a base form by suffix transformation.
// Each rule says: if a form ends in X, look for source POS Y within family, then transform.
const SUFFIX_DERIVATION = [
  // Adverbs (-ly) — derive from adjective sibling (KEY: -ly is almost always from adj, not verb)
  {suffix:"ically",sourcePos:"adj", vi:(b)=>`một cách ${b}`,                                 en:(b)=>`in a ${b} manner`},
  {suffix:"ly",    sourcePos:"adj", vi:(b)=>`một cách ${b}`,                                 en:(b)=>`in a ${b} manner`},
  // Nouns of process/result (-tion, -sion, -ment, -ance, -ence) — from verb
  {suffix:"ation", sourcePos:"v",   vi:(b)=>`sự/việc ${b}; quá trình ${b}; kết quả việc ${b}`, en:(b)=>`the act, process, or result of ${b}`},
  {suffix:"tion",  sourcePos:"v",   vi:(b)=>`sự/việc ${b}; kết quả việc ${b}`,                 en:(b)=>`the act, process, or result of ${b}`},
  {suffix:"sion",  sourcePos:"v",   vi:(b)=>`sự/việc ${b}; kết quả việc ${b}`,                 en:(b)=>`the act or result of ${b}`},
  {suffix:"ment",  sourcePos:"v",   vi:(b)=>`sự/việc ${b}; trạng thái ${b}`,                   en:(b)=>`the act, state, or result of ${b}`},
  {suffix:"ance",  sourcePos:"v",   vi:(b)=>`sự/việc ${b}`,                                    en:(b)=>`the act or quality of ${b}`},
  {suffix:"ence",  sourcePos:"v",   vi:(b)=>`sự/việc ${b}`,                                    en:(b)=>`the act or quality of ${b}`},
  // Agent nouns (-er, -or, -ist) — from verb or noun
  {suffix:"er",    sourcePos:"v",   vi:(b)=>`người ${b}; người làm việc ${b}`,                 en:(b)=>`one who ${b}s`},
  {suffix:"or",    sourcePos:"v",   vi:(b)=>`người/thứ ${b}`,                                  en:(b)=>`one or that which ${b}s`},
  {suffix:"ist",   sourcePos:"n",   vi:(b)=>`chuyên gia về ${b}; người theo/làm ${b}`,         en:(b)=>`a specialist or practitioner of ${b}`},
  // Quality nouns (-ity, -ness) — from adjective
  {suffix:"ity",   sourcePos:"adj", vi:(b)=>`tính ${b}; trạng thái ${b}`,                      en:(b)=>`the quality or state of being ${b}`},
  {suffix:"ness",  sourcePos:"adj", vi:(b)=>`tính ${b}; sự ${b}`,                              en:(b)=>`the quality or state of being ${b}`},
  // Adjectives — various
  {suffix:"able",  sourcePos:"v",   vi:(b)=>`có thể ${b} được`,                                en:(b)=>`capable of being ${b}d`},
  {suffix:"ible",  sourcePos:"v",   vi:(b)=>`có thể ${b} được`,                                en:(b)=>`capable of being ${b}d`},
  {suffix:"ive",   sourcePos:"v",   vi:(b)=>`mang tính ${b}; có xu hướng ${b}`,                en:(b)=>`tending to ${b}; characterized by ${b}`},
  {suffix:"ical",  sourcePos:"n",   vi:(b)=>`thuộc về ${b}; có tính ${b}`,                     en:(b)=>`relating to ${b}; pertaining to ${b}`},
  {suffix:"al",    sourcePos:"n",   vi:(b)=>`thuộc về ${b}; liên quan đến ${b}`,               en:(b)=>`relating to ${b}`},
  {suffix:"ic",    sourcePos:"n",   vi:(b)=>`thuộc về ${b}; mang tính ${b}`,                   en:(b)=>`relating to or characteristic of ${b}`},
  // Verbalizers
  {suffix:"ize",   sourcePos:"adj", vi:(b)=>`làm cho trở nên ${b}; ${b} hoá`,                  en:(b)=>`to make or become ${b}`},
  {suffix:"ise",   sourcePos:"adj", vi:(b)=>`làm cho trở nên ${b}; ${b} hoá`,                  en:(b)=>`to make or become ${b}`},
  // Verb inflections (handled with extra care: -ed and -ing are very POS-ambiguous)
  {suffix:"ed",    sourcePos:"v",   vi:(b)=>`đã ${b}; được ${b} (quá khứ/quá khứ phân từ)`,    en:(b)=>`past tense or past participle of ${b}`},
  {suffix:"ing",   sourcePos:"v",   vi:(b)=>`đang ${b}; việc ${b} (hiện tại phân từ / danh động từ)`, en:(b)=>`present participle / gerund of ${b}`}
];

// Find the best "source form" for a suffix-derived form within the family.
// Returns the source form's vi/en, or null if no good source found.
function findFamilySource(form, sourcePosKey, fam, hwVi, hwEn) {
  const candidates = (fam[sourcePosKey] || []).filter(x => x !== form);
  // Prefer cross-lookup sources (they have authoritative meanings)
  const idx = getAwlFormIndex();
  for (const cand of candidates) {
    const cross = idx.get(cand.toLowerCase());
    if (cross) {
      const crossEn = EN_GLOSS[cross.hw.toLowerCase()] || cross.vi;
      return { vi: cross.vi, en: EN_GLOSS[cross.hw.toLowerCase()] || cross.vi };
    }
    // Also check if candidate is in FAMILY_GLOSS itself
    const fg = FAMILY_GLOSS[cand.toLowerCase()];
    if (fg) return { vi: fg.vi, en: fg.en };
  }
  // Fallback to headword meaning
  return { vi: hwVi, en: hwEn };
}

// Try morphological derivation. Returns {vi, en, sourceForm} or null if no rule matches.
function deriveByMorphology(form, fam, hwVi, hwEn) {
  const lower = form.toLowerCase();
  for (const rule of SUFFIX_DERIVATION) {
    if (!lower.endsWith(rule.suffix)) continue;
    if (lower.length <= rule.suffix.length + 1) continue; // need actual stem
    const src = findFamilySource(form, rule.sourcePos, fam, hwVi, hwEn);
    return {
      vi: rule.vi(src.vi),
      en: rule.en(src.en),
      _suffix: rule.suffix
    };
  }
  return null;
}

// Synthesize a non-circular EN definition.
// Priority: (1) hand-crafted EN_GLOSS, (2) pattern-based fallback using collocations + POS role.
function synthesizeEN(hw, primaryPOS, entry) {
  const gloss = EN_GLOSS[hw.toLowerCase()];
  if (gloss) return gloss;

  const pos = primaryPOS?.[0] || "word";
  const cols = entry.col || [];
  const roleByPos = {
    "verb":      "An academic verb describing an action or process",
    "noun":      "An academic noun referring to a concept, thing, or entity",
    "adjective": "An academic adjective describing a quality or property",
    "adverb":    "An academic adverb describing manner, degree, or frequency"
  };
  const role = roleByPos[pos] || "An academic vocabulary item";
  const patterns = cols.slice(0, 2).map(c => `"${c}"`).join(", ");
  const patternLine = patterns ? ` Typical usage: ${patterns}.` : "";
  return `${role}.${patternLine} See examples for context.`;
}

// Generate VI + EN meaning for a SINGLE family form using a 4-strategy cascade:
//   1. SELF — if form === hw, use entry's own vi/en
//   2. MANUAL — hand-crafted FAMILY_GLOSS override (highest quality)
//   3. CROSS — if form has its own AWL entry, use that entry's vi/en
//   4. MORPHOLOGY — suffix-rule derivation with chain lookup (adj→adv etc.)
//   5. TEMPLATE — final POS-aware fallback with explicit "approximation" tag
function generateFamilyMeaning(form, pos, hw, baseVi, baseEn, fam) {
  // Strategy 1: SELF
  if (form.toLowerCase() === hw.toLowerCase()) {
    return { vi: baseVi, en: baseEn, source: "self" };
  }

  // Strategy 2: MANUAL hand-crafted gloss (preferred — most accurate)
  const manual = FAMILY_GLOSS[form.toLowerCase()];
  if (manual) {
    return { vi: manual.vi, en: manual.en, source: "manual" };
  }

  // Strategy 3: CROSS-LOOKUP
  const idx = getAwlFormIndex();
  const cross = idx.get(form.toLowerCase());
  if (cross && cross.hw.toLowerCase() !== hw.toLowerCase()) {
    const crossEn = EN_GLOSS[cross.hw.toLowerCase()] || synthesizeEN(cross.hw, [pos], cross);
    return {
      vi: cross.vi,
      en: crossEn,
      source: "cross"
    };
  }

  // Strategy 4: MORPHOLOGY — derive from sibling form by suffix
  const derived = fam ? deriveByMorphology(form, fam, baseVi, baseEn) : null;
  if (derived) {
    return { vi: derived.vi, en: derived.en, source: "morphology" };
  }

  // Strategy 5: TEMPLATE fallback (with explicit honesty about approximation)
  const tplVi = {
    "noun":      `(danh từ) ≈ sự/việc/kết quả "${hw}" — tra từ điển để chính xác`,
    "verb":      `(động từ — biến thể của "${hw}") ${baseVi}`,
    "adjective": `(tính từ) ≈ liên quan đến "${hw}" — tra từ điển để chính xác`,
    "adverb":    `(trạng từ) ≈ một cách "${hw}" — tra từ điển để chính xác`
  };
  const tplEn = {
    "noun":      `(noun) approximation — form of "${hw}"; check dictionary for exact meaning`,
    "verb":      `(verb form of "${hw}") inflected for tense/aspect`,
    "adjective": `(adjective) approximation — related to "${hw}"; check dictionary for exact meaning`,
    "adverb":    `(adverb) approximation — in a manner related to "${hw}"; check dictionary`
  };
  return {
    vi: tplVi[pos] || `Biến thể của "${hw}" — ${baseVi}`,
    en: tplEn[pos] || `Family form of "${hw}" — see headword for meaning`,
    source: "template"
  };
}

// Detect grammatical pattern of a collocation string (heuristic, used as display hint).
function detectCollocationPattern(c) {
  if (!c) return null;
  const words = c.trim().toLowerCase().split(/\s+/);
  if (words.length < 2) return "single";
  const first = words[0], last = words[words.length - 1];
  const PREPS = new Set(["by","in","on","at","of","to","for","with","from","into","under","over"]);
  if (PREPS.has(first)) return "prep + phrase";
  if (first.endsWith("ly")) return "adv + verb/adj";
  const ADJ_ENDS = ["al","ic","ous","ive","ble","ful","less","ed","ing","ary","ant","ent"];
  if (ADJ_ENDS.some(e => first.endsWith(e)) && words.length === 2) return "adj + noun";
  // 2-word + last is preposition → phrasal verb pattern
  if (PREPS.has(last)) return "verb + prep";
  return "verb + noun";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// V6: Collocation Quiz — distractor pool + POS inference
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Built once at module load. Each POS bucket holds DEDUPED forms from AWL_DATA's
// declared family lists. Used to generate quiz distractors of matching POS.
const COLLOC_DISTRACTOR_POOL = (() => {
  const pool = { adj: new Set(), adv: new Set(), v: new Set(), n: new Set() };
  for (const entry of AWL_DATA) {
    for (const f of (entry.fam?.adj || [])) if (f) pool.adj.add(f.toLowerCase());
    for (const f of (entry.fam?.adv || [])) if (f) pool.adv.add(f.toLowerCase());
    for (const f of (entry.fam?.v   || [])) if (f) pool.v.add(f.toLowerCase());
    for (const f of (entry.fam?.n   || [])) if (f) pool.n.add(f.toLowerCase());
  }
  return { adj: [...pool.adj], adv: [...pool.adv], v: [...pool.v], n: [...pool.n] };
})();

// V6: Stopwords / function words — never blank these (cloze becomes meaningless).
const STOPWORDS_FOR_CLOZE = new Set([
  "the","and","but","for","with","from","into","this","that","than","when","where",
  "what","who","why","how","over","under","through","very","more","most","much",
  "such","some","any","all","one","two","one's","its","our","their"
]);
// Pattern hints that suggest a word is genuinely adj/adv via suffix
const ADJ_SUFFIX = /(al|ic|ous|ive|ble|ful|less|ed|ing|ary|ant|ent|ish|ese|ar|ial)$/;
const ADV_SUFFIX = /ly$/;

// Given a collocation pattern + blank position, infer the POS of the blanked word.
function inferBlankPos(pattern, blankIdx) {
  if (pattern === "adj + noun")     return blankIdx === 0 ? "adj" : "n";
  if (pattern === "adv + verb/adj") return blankIdx === 0 ? "adv" : "v";
  if (pattern === "verb + noun")    return blankIdx === 0 ? "v"   : "n";
  if (pattern === "verb + prep")    return "v";
  return null;
}

// Pick N distractors of given POS, excluding the answer + any family-of-answer words.
function pickCollocDistractors(answer, posKey, excludeSet = new Set(), n = 3) {
  if (!posKey) return [];
  const pool = COLLOC_DISTRACTOR_POOL[posKey] || [];
  const ans = answer.toLowerCase();
  const picks = pool
    .filter(w => w !== ans && !excludeSet.has(w))
    .sort(() => Math.random() - 0.5)
    .slice(0, n);
  return picks;
}

function normalizeLexisTextList(value, keys=["term","word","phrase","collocation","text"]) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const text = typeof item === "string"
      ? item
      : keys.map(k=>item?.[k]).find(Boolean);
    const clean = String(text||"").trim().replace(/\s+/g," ");
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
}

function normalizeIdiomList(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const phrase = typeof item === "string"
      ? item
      : (item?.idiom || item?.phrase || item?.term || item?.text);
    const clean = String(phrase||"").trim().replace(/\s+/g," ");
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push({
      idiom: clean,
      meaning: typeof item === "string" ? "" : String(item?.meaning || item?.meaning_en || item?.definition || "").trim(),
      example: typeof item === "string" ? "" : String(item?.example || item?.sentence || "").trim()
    });
  }
  return out;
}

function normalizeWordLexis(entry={}) {
  const collocations = normalizeLexisTextList([
    ...(Array.isArray(entry.col) ? entry.col : []),
    ...(Array.isArray(entry.collocations) ? entry.collocations : []),
    ...(Array.isArray(entry._collocations) ? entry._collocations : [])
  ], ["phrase","collocation","text","term"]);
  const synonyms = normalizeLexisTextList([
    ...(Array.isArray(entry.synonyms) ? entry.synonyms : []),
    ...(Array.isArray(entry._synonyms) ? entry._synonyms : [])
  ], ["term","word","synonym","phrase","text"]);
  const antonyms = normalizeLexisTextList([
    ...(Array.isArray(entry.antonyms) ? entry.antonyms : []),
    ...(Array.isArray(entry._antonyms) ? entry._antonyms : [])
  ], ["term","word","antonym","phrase","text"]);
  const idioms = normalizeIdiomList([
    ...(Array.isArray(entry.idioms) ? entry.idioms : []),
    ...(Array.isArray(entry._idioms) ? entry._idioms : [])
  ]);
  return {collocations, synonyms, antonyms, idioms, _collocations: collocations, _synonyms: synonyms, _antonyms: antonyms, _idioms: idioms};
}

function awlEntryToWordCardData(entry) {
  const hw = entry.hw;
  const fam = entry.fam || {n:[],v:[],adj:[],adv:[]};
  const lexis = normalizeWordLexis(entry);

  // Flat family list (deduped, hw first)
  const flatFam = [];
  const seen = new Set();
  const pushF = (x) => { if(x && !seen.has(x)) { seen.add(x); flatFam.push(x); } };
  pushF(hw);
  [...(fam.v||[]),...(fam.n||[]),...(fam.adj||[]),...(fam.adv||[])].forEach(pushF);

  // Auto-detect inflected forms appearing in t1/ex but missing from declared family.
  // Heuristic: any word in sentences that starts with hw (or hw stem) and is longer
  // by ≤5 chars is treated as a plausible inflection (e.g. technique→techniques).
  // Safe because we only add forms actually used in our own example sentences.
  const hwLower = hw.toLowerCase();
  const hwStem = hwLower.endsWith("e") ? hwLower.slice(0,-1) : hwLower;
  const sentenceText = [entry.t1, entry.ex, ...(entry.col||[])].filter(Boolean).join(" ").toLowerCase();
  const tokens = sentenceText.match(/[a-z]+/g) || [];
  for (const t of tokens) {
    if (flatFam.includes(t)) continue;
    if (t.length <= hw.length) continue;
    if (t.startsWith(hwLower) || t.startsWith(hwStem)) {
      const suffix = t.startsWith(hwLower) ? t.slice(hwLower.length) : t.slice(hwStem.length);
      // Plausible English inflection suffixes (≤5 chars, no consonant clusters at start)
      if (suffix.length > 0 && suffix.length <= 5) pushF(t);
    }
  }

  // POS-of-form lookup
  const posOf = (form) => {
    if ((fam.v||[]).includes(form)) return "verb";
    if ((fam.n||[]).includes(form)) return "noun";
    if ((fam.adj||[]).includes(form)) return "adjective";
    if ((fam.adv||[]).includes(form)) return "adverb";
    if (form === hw) {
      if ((fam.v||[]).length) return "verb";
      if ((fam.n||[]).length) return "noun";
      if ((fam.adj||[]).length) return "adjective";
      if ((fam.adv||[]).length) return "adverb";
    }
    return "word";
  };

  const primaryPOS = [];
  if ((fam.v||[]).length) primaryPOS.push("verb");
  if ((fam.n||[]).length) primaryPOS.push("noun");
  if ((fam.adj||[]).length) primaryPOS.push("adjective");
  if ((fam.adv||[]).length) primaryPOS.push("adverb");

  // Per-form meaning: VI + EN, using 5-strategy cascade (self → manual → cross → morphology → template)
  const baseEn = entry.en || synthesizeEN(hw, primaryPOS, entry);
  const family_definitions = flatFam.map(form => {
    const formPos = posOf(form);
    const m = generateFamilyMeaning(form, formPos, hw, entry.vi, baseEn, fam);
    return {
      form,
      pos: formPos,
      meaning: m.vi,          // Vietnamese — distinct per form
      meaning_en: m.en,       // English — distinct per form
      _source: m.source       // "self" | "manual" | "cross" | "morphology" | "template"
    };
  });

  const definitions = [{
    pos: posOf(hw) || "word",
    meaning: entry.vi,
    meaning_en: baseEn,
    context: "academic"
  }];

  // Intuition: now DISTINCT from definition — it's a Feynman-style "what-it-does" framing
  // anchored on the example sentence + collocation pattern, not a duplicate of the definition.
  const firstCol = (entry.col || [])[0];
  const intuition = entry.intuition || {
    vi: firstCol
      ? `Mẹo dùng: thường đi với "${firstCol}". Quan sát cách dùng trong ví dụ phía dưới.`
      : `Quan sát cách dùng trong ví dụ phía dưới để nắm pattern thực tế.`,
    en: firstCol
      ? `Quick handle: typically paired with "${firstCol}". Watch the example below to internalize the pattern.`
      : `Watch how this word behaves in the example below to internalize its usage.`,
    example: entry.t1
  };

  const examples = [
    {context:"Task 1 IELTS", sentence: entry.t1},
    {context:"academic",     sentence: entry.ex}
  ];

  // Regex-safe escape
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Find LONGEST family form appearing in a sentence (word-boundary, case-insensitive).
  // Sorting flatFam by length DESC ensures e.g. "analyses" wins over "analyse" when both match.
  const formsByLength = [...flatFam].sort((a,b) => b.length - a.length);
  const findLongestFormIn = (sentence) => {
    if (!sentence) return null;
    for (const f of formsByLength) {
      const re = new RegExp("\\b" + esc(f) + "\\b", "i");
      if (re.test(sentence)) return f;
    }
    return null;
  };

  // Blank-out a target form (case-insensitive, single replacement)
  const blankOut = (sentence, target) => {
    const re = new RegExp("\\b" + esc(target) + "\\b", "i");
    return sentence.replace(re, "___");
  };

  // Build family_fill_blanks: scan t1, ex, then collocations.
  // Dedup by `form` so each form appears at most once.
  const ffbMap = new Map(); // form -> {form, sentence, answer, context}

  const tryAdd = (sentence, label) => {
    const form = findLongestFormIn(sentence);
    if (!form || ffbMap.has(form)) return;
    ffbMap.set(form, {
      form,
      sentence: blankOut(sentence, form),
      answer: form,
      context: `${label} — ${posOf(form)}`
    });
  };

  tryAdd(entry.t1, "Task 1");
  tryAdd(entry.ex, "academic");
  for (const col of (entry.col||[])) {
    if (ffbMap.size >= 5) break;
    tryAdd(col, "collocation");
  }

  // If still <2, scan all sources for ANY remaining family form (not just longest)
  if (ffbMap.size < 2) {
    const sources = [
      {text: entry.t1, label: "Task 1"},
      {text: entry.ex, label: "academic"},
      ...(entry.col||[]).map(c => ({text:c, label:"collocation"}))
    ];
    for (const f of flatFam) {
      if (ffbMap.has(f)) continue;
      const re = new RegExp("\\b" + esc(f) + "\\b", "i");
      for (const src of sources) {
        if (re.test(src.text)) {
          ffbMap.set(f, {
            form: f,
            sentence: blankOut(src.text, f),
            answer: f,
            context: `${src.label} — ${posOf(f)}`
          });
          break;
        }
      }
      if (ffbMap.size >= 2) break;
    }
  }

  // Order: hw form first if present, then others
  const family_fill_blanks = [];
  if (ffbMap.has(hw)) family_fill_blanks.push(ffbMap.get(hw));
  ffbMap.forEach((v,k) => { if (k !== hw) family_fill_blanks.push(v); });

  // fill_blanks (simple Blanks tab): take first 2 from family_fill_blanks (or all if fewer)
  const fill_blanks = family_fill_blanks.slice(0,2).map(fb => ({
    sentence: fb.sentence,
    answer: fb.answer,
    context: fb.context
  }));

  const t1_relevance = (typeof TASK1_AWL !== "undefined" && TASK1_AWL.has(hw))
    ? "high" : "medium";

  return {
    word: hw,
    ipa: "",
    pos: primaryPOS,
    definitions,
    family: flatFam,
    family_definitions,
    examples,
    fill_blanks,
    family_fill_blanks,
    t1_relevance,
    intuition,
    version: 7,
    _source: "prebaked",
    _sublist: entry.s,
    _vi: entry.vi,
    collocations: lexis.collocations,
    synonyms: lexis.synonyms,
    antonyms: lexis.antonyms,
    idioms: lexis.idioms,
    _collocations: lexis._collocations,
    _synonyms: lexis._synonyms,
    _antonyms: lexis._antonyms,
    _idioms: lexis._idioms
  };
}

async function fetchWordData(word, config) {
  const prompt = `For the AWL academic word "${word}", return ONLY valid JSON (no markdown fence).

CRITICAL QUALITY RULES (these are the failure modes of template-generated cards — avoid them):
- NEVER write filler like "approximation", "form of X" alone, "see headword", "check dictionary", "An academic verb describing an action". Each entry MUST have a real, specific meaning.
- Each family form must have a DISTINCT semantic role OR a clear grammatical relation: a "process" noun is not the same as a "person who does" noun; an adjective is not the same as the verb; the plural form notes "plural of X".
- Examples must be concrete sentences with named entities or specific data — not "An academic sentence using X". Sentences should pass as real IELTS reading text.
- Definitions: Feynman style — "what it does" framing, real-world analogies welcome, NEVER circular ("analysis = the action of analysing").

INCLUDE ALL LEGITIMATE FAMILY MEMBERS — be exhaustive, not minimal:
- Major derivations: every different word class (verb → noun(s) → adjective(s) → adverb(s)). E.g. "analyse" produces analysis (noun process), analyst (noun person), analytical (adj), analytically (adv).
- Common inflections: regular plural of noun(s); -s/-ed/-ing of verb(s); -er/-est of adjective(s) IF natural. E.g. for "analyse" → also analyses, analysed, analysing; for "analysis" → analyses (plural).
- Target 6-12 forms for typical AWL words (more if word has rich morphology like "create" / "produce"; fewer if e.g. an adverb-only entry).

For each family form, produce:
- form, pos with category note (e.g. "noun (process)", "noun (person)", "noun (plural)", "verb (3rd person)", "verb (past tense)", "verb (gerund)", "adjective", "adverb")
- meaning: Vietnamese definition (5-15 words). For inflections, can briefly note relation: "dạng số nhiều của ..." / "thì quá khứ của ...".
- meaning_en: English definition (≤18 words). For inflections, can briefly note relation: "plural of X" / "past tense of Y" — but ALSO give the actual sense.
- One fill-in-blank sentence using that exact form (not interchangeable with siblings)

Bias examples toward IELTS Writing Task 1 contexts (charts, data, trends, comparisons) where natural.

Structure:
{"word":"${word}","ipa":"phonetic IPA","pos":["primary parts of speech"],
"definitions":[{"pos":"verb","meaning":"Vietnamese meaning (5-15 words, no boilerplate)","meaning_en":"clear English meaning (≤18 words)","context":"academic"}],
"family":["${word}","derivation_2","derivation_3","inflection_1","inflection_2","..."],
"family_definitions":[
  {"form":"${word}","pos":"verb","meaning":"Vietnamese cho headword","meaning_en":"English for headword"},
  {"form":"<3rd person sg>","pos":"verb (3rd person)","meaning":"dạng ngôi 3 số ít — diễn tả ...","meaning_en":"3rd person singular of <hw> — use after he/she/it"},
  {"form":"<past>","pos":"verb (past tense)","meaning":"thì quá khứ của <hw> — đã ...","meaning_en":"past tense of <hw> — completed action"},
  {"form":"<gerund>","pos":"verb (gerund / -ing)","meaning":"dạng tiếp diễn / danh động từ","meaning_en":"-ing form of <hw> — ongoing action or noun"},
  {"form":"<noun process>","pos":"noun (process / result)","meaning":"Việt cho noun process","meaning_en":"English for noun process"},
  {"form":"<noun person>","pos":"noun (person)","meaning":"người làm việc liên quan","meaning_en":"a person who performs / studies <hw>"},
  {"form":"<plural noun>","pos":"noun (plural)","meaning":"dạng số nhiều của <noun>","meaning_en":"plural form of <noun>"},
  {"form":"<adj>","pos":"adjective","meaning":"Việt cho adj","meaning_en":"English for adj"},
  {"form":"<adv>","pos":"adverb","meaning":"Việt cho adv","meaning_en":"English for adv"}
],
"examples":[
  {"context":"Task 1 IELTS","sentence":"Concrete sentence with real numbers/entities using ${word}."},
  {"context":"Task 1 IELTS","sentence":"Another Task 1 sentence with specific data."},
  {"context":"academic","sentence":"Academic sentence in a real research context."}
],
"fill_blanks":[
  {"sentence":"Task 1 sentence with ___","answer":"${word}","context":"Task 1"},
  {"sentence":"Academic sentence with ___","answer":"${word}","context":"academic"}
],
"synonyms":["precise academic synonym 1","precise academic synonym 2","near-synonym with different nuance"],
"antonyms":["precise academic antonym 1","precise academic antonym 2"],
"collocations":["natural collocation 1","natural collocation 2","natural collocation 3"],
"idioms":[
  {"idiom":"relevant idiom or fixed expression","meaning":"plain English meaning","example":"short natural example"}
],
"family_fill_blanks":[
  {"form":"${word}","sentence":"Sentence requiring base form ___","answer":"${word}","context":"verb / noun usage"},
  {"form":"form2","sentence":"Sentence requiring different form ___","answer":"form2","context":"shows the derivational shift"}
],
"intuition":{
  "vi":"Cách hiểu đơn giản bằng tiếng Việt (1 câu, dùng analogy hoặc liên hệ thực tế gần gũi với người học VN)",
  "en":"Plain-English intuition (1 sentence, analogy or concrete real-world framing — like teaching a curious beginner)",
  "example":"One vivid concrete mini-scenario (≤20 words) showing the word in natural use"
},
"t1_relevance":"high|medium|low",
"version":7}

CRITICAL:
- family_definitions: every entry MUST have BOTH "meaning" (Vietnamese) AND "meaning_en" (English).
- BE EXHAUSTIVE: include every word class derivation (verb/noun/adj/adv) PLUS common inflections (plurals, -s/-ed/-ing). Typical target 6-12 forms.
- Each entry's definition should distinguish that exact form. Inflections can note "plural of X" or "past tense of Y" but ALSO give the actual usage sense.
- "family" array and "family_definitions" array must have the SAME forms in the same order.
- antonyms: precise opposites/near-opposites only; return [] if the word has no natural academic opposite.
- intuition: Feynman style — explain to a smart 15-year-old who's never heard it. Avoid jargon; favor analogy.`;
  const text = await callAPI(config, [{role:"user",content:prompt}], 4500);
  const data = safeJSON(text);
  // CRITICAL: force version=7 regardless of what the model returns. The cache-migration
  // step in loadState drops entries with version<7. Without this, every regen would be
  // silently evicted on next app load.
  if (data && typeof data === 'object') {
    data.version = 7;
    Object.assign(data, normalizeWordLexis(data));
  }
  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRIDGE: AWL ↔ IELTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Reverse index: any family form (lowercased) → headword. Built once from AWL_DATA at init.
// V5 — Two-pass strategy ensures HEADWORDS WIN over family-of-others.
// Critical for "false friend" forms like "definite": it appears in fam of "define" (s1-016)
// BUT has its own standalone entry (s7-015) with semantically different meaning.
// Without two-pass, "definite" would map to "define" (wrong semantics).
//
// Pass 1: register every headword (highest authority).
// Pass 2: register every declared family form ONLY if not already claimed by a headword.
// Pass 3: augment with regular plurals/3rd-pers-sing (+s/+es/+ies), same priority rules:
//         headword-form-plural beats family-form-plural beats nothing.
const AWL_FORM_TO_HW = (() => {
  const m = new Map();
  const setIfFree = (form, hw) => { if (form && !m.has(form)) m.set(form, hw); };

  // PASS 1 — headwords (always win)
  for (const entry of AWL_DATA) {
    if (entry.hw) m.set(entry.hw.toLowerCase(), entry.hw); // unconditional set
  }

  // PASS 2 — declared family forms (do not overwrite a headword claim)
  for (const entry of AWL_DATA) {
    const fam = entry.fam || {};
    const families = [...(fam.n||[]), ...(fam.v||[]), ...(fam.adj||[]), ...(fam.adv||[])];
    for (const f of families) {
      if (!f || typeof f !== 'string') continue;
      setIfFree(f.toLowerCase(), entry.hw);
    }
  }

  // PASS 3 — predictable plurals / 3rd-pers-sing.
  // Snapshot keys BEFORE iterating (else we'd iterate over plurals we're creating → infinite work).
  // Three rules in priority order:
  //   1. ends in s/x/z or ch/sh → +es  (process → processes)
  //   2. ends in consonant+y    → -y+ies (category → categories)
  //   3. otherwise (not -s)     → +s   (factor → factors)
  const baseForms = [...m.entries()]; // snapshot [form, hw]
  for (const [lower, hw] of baseForms) {
    let plural = null;
    if (/[sxz]$|[cs]h$/.test(lower)) plural = lower + 'es';
    else if (/[^aeiou]y$/.test(lower)) plural = lower.slice(0,-1) + 'ies';
    else if (!lower.endsWith('s')) plural = lower + 's';
    if (plural) setIfFree(plural, hw);
  }
  return m;
})();

function extractAWLFromEssay(essay) {
  if (!essay) return [];
  const tokens = essay.toLowerCase().match(/[a-z]+/g) || [];
  const found = new Set();
  for (const t of tokens) {
    const hw = AWL_FORM_TO_HW.get(t);
    if (hw) found.add(hw);
  }
  return [...found];
}

function buildVocabInsights(usedWords, mastery, lrBand) {
  const strong = usedWords.filter(w => (mastery[w]||0) >= 3);
  const weak = usedWords.filter(w => (mastery[w]||0) < 3);
  // Suggest Task1-relevant AWL words not yet mastered
  const suggested = [...TASK1_AWL]
    .filter(w => !usedWords.includes(w) && (mastery[w]||0) < 4)
    .slice(0, 8);
  const toAdd = [...new Set([...weak, ...(lrBand < 7 ? suggested.slice(0,4) : [])])];
  return {usedWords, strong, weak, suggested, toAdd, lrBand};
}

const CUSTOM_VOCAB_REF_PREFIX = "custom:";

function normalizeVocabWord(value) {
  return String(value||"").toLowerCase().trim().replace(/[^a-z'-]/g,"");
}

function makeCustomVocabRef(word) {
  const w = normalizeVocabWord(word);
  return w ? `${CUSTOM_VOCAB_REF_PREFIX}${w}` : "";
}

function vocabRefKey(ref) {
  return typeof ref === "number" ? `awl:${ref}` : String(ref||"");
}

function vocabRefToWord(ref, state={}) {
  if (typeof ref === "number" || (typeof ref === "string" && /^\d+$/.test(ref))) {
    return AWL_WORDS[Number(ref)]?.w || "";
  }
  const raw = String(ref||"").trim();
  const word = raw.startsWith(CUSTOM_VOCAB_REF_PREFIX) ? raw.slice(CUSTOM_VOCAB_REF_PREFIX.length) : raw;
  return normalizeVocabWord(word);
}

function vocabRefsToWords(refs, state={}) {
  return (refs||[]).map(ref=>vocabRefToWord(ref,state)).filter(Boolean);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
