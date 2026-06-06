// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARKING CALIBRATION — feed teacher-corrected essays (.docx) into the grader.
// We can't fine-tune an API model, so we use IN-CONTEXT calibration: read the
// teacher's ACTUAL edits (tracked changes), margin comments, and marks, distil
// them into a structured marking profile (rubric + verbatim error→fix pairs),
// and inject the enabled profiles — including real correction examples — into
// every grade prompt so the AI mirrors the teacher's standards AND reasoning.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// Lazy-load JSZip only when the user first uploads a .docx. Local vendor first
// keeps double-click index.html usable without depending on CDN availability.
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  const sources = ["./vendor/jszip.min.js","https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"];
  let lastError = null;
  for (const src of sources) {
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(s);
      });
      if (window.JSZip) break;
    } catch(e) { lastError = e; }
  }
  if (!window.JSZip && lastError) throw new Error("Could not load the .docx reader from local vendor or CDN.");
  if (!window.JSZip) throw new Error("JSZip failed to initialise.");
  return window.JSZip;
}

const _localName = (el) => (el.tagName || "").split(":").pop();
const _wAttr = (el, name) =>
  el.getAttribute("w:" + name) ?? el.getAttributeNS(W_NS, name) ?? el.getAttribute(name);

// Fallback plain-text extractor (used only if DOM parsing fails).
function _crudeXmlToText(xml) {
  const ta = document.createElement("textarea");
  ta.innerHTML = String(xml || "")
    .replace(/<\/w:p>/g, "\n").replace(/<w:tab\b[^>]*\/?>/g, "\t")
    .replace(/<w:br\b[^>]*\/?>/g, "\n").replace(/<[^>]+>/g, "");
  return ta.value.replace(/\n{3,}/g, "\n\n").trim();
}

// RICH extractor: preserves the teacher's marking signal.
//   [- deleted ]   = text the teacher crossed out (tracked deletion)
//   [+ inserted ]  = text the teacher added (tracked insertion)
//   ~~struck~~     = strikethrough     ==highlighted==     «red»…«/red» = red ink
//   📝[author: …]  = a margin comment, placed at the spot it was anchored to
async function extractDocxText(file) {
  const JSZip = await loadJSZip();
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const docXml = zip.file("word/document.xml");
  if (!docXml) throw new Error("Not a valid .docx (missing word/document.xml).");

  const parser = new DOMParser();

  // 1) Build comment map: id -> {author, text}
  const comments = {};
  const cFile = zip.file("word/comments.xml");
  if (cFile) {
    try {
      const cdoc = parser.parseFromString(await cFile.async("string"), "application/xml");
      for (const c of Array.from(cdoc.getElementsByTagName("w:comment"))) {
        const id = _wAttr(c, "id");
        const author = _wAttr(c, "author") || "";
        const text = Array.from(c.getElementsByTagName("w:t")).map(t => t.textContent).join("").trim();
        if (id != null) comments[id] = { author, text };
      }
    } catch { /* ignore comment parse failure */ }
  }

  // 2) Walk the document body in order, emitting annotated text.
  const docString = await docXml.async("string");
  let doc;
  try { doc = parser.parseFromString(docString, "application/xml"); } catch { doc = null; }
  if (!doc || doc.getElementsByTagName("parsererror").length) {
    return _crudeXmlToText(docString); // graceful fallback
  }
  const body = doc.getElementsByTagName("w:body")[0] || doc.documentElement;

  const out = [];
  const usedComments = new Set();

  function runMarkers(rEl) {
    const rpr = Array.from(rEl.children).find(ch => _localName(ch) === "rPr");
    let pre = "", post = "";
    if (rpr) {
      const props = Array.from(rpr.getElementsByTagName("*"));
      const has = (n) => props.some(x => _localName(x) === n);
      const hl = props.find(x => _localName(x) === "highlight");
      const colorEl = props.find(x => _localName(x) === "color");
      const color = (colorEl && _wAttr(colorEl, "val")) || "";
      const reddish = /^(FF0000|C00000|FF3333|E00000|red)$/i.test(color);
      if (has("strike") || has("dstrike")) { pre = "~~" + pre; post = post + "~~"; }
      if (hl && (_wAttr(hl, "val") || "none") !== "none") { pre = "==" + pre; post = post + "=="; }
      else if (reddish) { pre = "«red»" + pre; post = post + "«/red»"; }
    }
    return [pre, post];
  }

  function walk(node, inDel) {
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType !== 1) continue;
      const tag = _localName(n);
      if (tag === "p") { walk(n, inDel); out.push("\n"); }
      else if (tag === "tab") out.push("\t");
      else if (tag === "br") out.push("\n");
      else if (tag === "ins") { out.push("[+"); walk(n, inDel); out.push("]"); }
      else if (tag === "del") { out.push("[-"); walk(n, true); out.push("]"); }
      else if (tag === "r") {
        const [pre, post] = inDel ? ["", ""] : runMarkers(n);
        if (pre) out.push(pre);
        walk(n, inDel);
        if (post) out.push(post);
      }
      else if (tag === "t") out.push(n.textContent);
      else if (tag === "delText") out.push(n.textContent);
      else if (tag === "commentReference") {
        const id = _wAttr(n, "id");
        const c = comments[id];
        if (c) { out.push(` 📝[${c.author ? c.author + ": " : "teacher: "}${c.text}]`); usedComments.add(id); }
      }
      else walk(n, inDel); // descend into body/tables/sdt/etc.
    }
  }
  walk(body, false);

  let text = out.join("")
    .replace(/\r/g, "")
    .replace(/\[\+\s*\]/g, "").replace(/\[-\s*\]/g, "")   // drop empty edit markers
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // Append any comments that had no in-text anchor so nothing is lost.
  const leftover = Object.entries(comments).filter(([id]) => !usedComments.has(id));
  if (leftover.length) {
    text += "\n\n--- TEACHER COMMENTS (unanchored) ---\n" +
      leftover.map(([, c]) => `${c.author ? c.author + ": " : ""}${c.text}`).join("\n");
  }
  return text;
}

const MARKING_DISTILL_PROMPT = `You are calibrating an automated IELTS Writing examiner to match ONE specific human teacher's marking. Below is that teacher's correction of a student's essay, extracted with markup:
- [- X]  = text the TEACHER DELETED (the error / what was wrong)
- [+ Y]  = text the TEACHER INSERTED (the correction)  → so "[- X][+ Y]" means the teacher changed X into Y
- ~~Z~~ = struck through   ==Z== = highlighted   «red»Z«/red» = marked in red ink
- 📝[teacher: ...] = a margin comment, shown right after the text it refers to

Read it CLOSELY. Your job is to capture HOW THIS TEACHER THINKS, not generic IELTS advice. Mine every edit and comment.

Return ONLY valid JSON (no markdown, no fence):
{
  "strictness": "lenient | standard | strict — plus a short reason grounded in what you saw",
  "recurringErrors": ["specific error types the teacher repeatedly fixes or flags"],
  "priorities": ["what the teacher rewards / insists on (e.g. 'clear overview', 'precise data verbs')"],
  "rubric": {
    "taskResponse": "what this teacher checks for task response / achievement (1-2 lines)",
    "coherence": "their stance on cohesion/paragraphing",
    "lexis": "their stance on vocabulary/collocation",
    "grammar": "their stance on grammar range & accuracy"
  },
  "commentStyle": "one line: tone + language + typical length of the teacher's feedback",
  "correctionPairs": [
    {"error": "verbatim wrong text", "fix": "verbatim corrected text", "why": "the teacher's rule/reason (infer from the edit or comment)"}
  ]
}
Include UP TO 12 of the most representative correctionPairs (real ones from the text — do not invent). Keep each field concise.`;

// Build the calibration block injected into grade prompts. "" when nothing enabled.
function buildMarkingCalibrationText(state) {
  const items = (state?.markingExamples || []).filter(x => x && x.enabled);
  if (!items.length) return "";
  const join = (a) => Array.isArray(a) ? a.filter(Boolean).join("; ") : (a || "");
  const blocks = items.slice(0, 3).map(it => {
    const p = it.profile;
    if (p && typeof p === "object") {
      const lines = [`• Source "${it.name}":`];
      if (p.strictness) lines.push(`  - Strictness: ${p.strictness}`);
      const recurring = join(p.recurringErrors || p.focusErrors);
      if (recurring) lines.push(`  - Repeatedly flags: ${recurring}`);
      if (join(p.priorities)) lines.push(`  - Rewards / insists on: ${join(p.priorities)}`);
      if (p.rubric && typeof p.rubric === "object") {
        const r = p.rubric;
        const rb = [r.taskResponse && `TR: ${r.taskResponse}`, r.coherence && `CC: ${r.coherence}`, r.lexis && `LR: ${r.lexis}`, r.grammar && `GRA: ${r.grammar}`].filter(Boolean).join(" | ");
        if (rb) lines.push(`  - Teacher's rubric focus: ${rb}`);
      }
      if (p.commentStyle) lines.push(`  - Feedback voice to imitate: ${p.commentStyle}`);
      const pairs = Array.isArray(p.correctionPairs) ? p.correctionPairs.slice(0, 6) : [];
      if (pairs.length) {
        lines.push(`  - Real corrections this teacher made (mirror this judgement):`);
        pairs.forEach(pr => {
          if (!pr) return;
          const e = pr.error || "", f = pr.fix || "", w = pr.why ? ` — ${pr.why}` : "";
          if (e || f) lines.push(`      · "${e}" → "${f}"${w}`);
          else if (pr.why) lines.push(`      · ${pr.why}`);
        });
      }
      return lines.join("\n");
    }
    return `• Source "${it.name}" (raw teacher-corrected excerpt):\n${String(it.text || "").slice(0, 1200)}`;
  });
  return `

TEACHER MARKING CALIBRATION — a real human teacher corrected past student essays. Mirror their standards AND reasoning: apply the same rubric focus, weight the error types they repeatedly fix, reward what they reward, make the same kind of corrections shown below, and phrase feedback in their voice. When their standard conflicts with the generic descriptor, lean toward the teacher's pattern (keep bands within IELTS public-descriptor reality).
${blocks.join("\n")}`;
}

function MarkingCalibrationPage({ state, setState, config }) {
  const items = state.markingExamples || [];
  const [busy, setBusy] = useState("");      // "" | "parsing" | "distilling"
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [showRaw, setShowRaw] = useState(null);

  const distil = async (text) => {
    const prompt = `${MARKING_DISTILL_PROMPT}\n\nTEACHER-CORRECTED MATERIAL:\n${String(text).slice(0, 16000)}`;
    const raw = await callAPI(config, [{ role: "user", content: prompt }], 2500, 0.1);
    return safeJSON(raw);
  };

  const addExample = async (name, text) => {
    const clean = String(text || "").trim();
    if (clean.length < 40) { setErr("That file/text is too short to learn from (need at least ~40 characters)."); setBusy(""); return; }
    setErr(""); setOkMsg("");
    let profile = null;
    if (config) {
      setBusy("distilling");
      try { profile = await distil(clean); }
      catch (e) { setErr(`Saved, but AI distillation failed (raw text will be used instead): ${e.message}`); }
    }
    const item = {
      id: `mk-${Date.now()}`,
      name: name || "Pasted correction",
      date: new Date().toISOString(),
      text: clean.slice(0, 20000),
      charCount: clean.length,
      profile,
      enabled: true
    };
    setState(s => ({ ...s, markingExamples: [item, ...(s.markingExamples || [])].slice(0, 30) }));
    setBusy("");
    const pairN = profile && Array.isArray(profile.correctionPairs) ? profile.correctionPairs.length : 0;
    setOkMsg(profile ? `Learned "${item.name}" — captured ${pairN} correction${pairN === 1 ? "" : "s"} + a marking profile that will guide future grading.` : `Saved "${item.name}" (raw text — set up AI to distil a profile).`);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setErr(""); setOkMsg(""); setBusy("parsing");
    try {
      let text;
      if (/\.docx$/i.test(file.name)) {
        // Use the rich DOCX extractor: reads tracked changes, comments, highlights.
        text = await extractDocxText(file);
      } else {
        // All other formats (PDF, PPTX, XLSX, TXT, HTML, CSV, image…) via markitdown.
        const result = await callMarkItDown(file);
        text = result.markdown;
      }
      await addExample(file.name.replace(/\.[^.]+$/, ""), text);
    } catch (ex) {
      setErr(`Could not read file: ${ex.message}`);
      setBusy("");
    }
  };

  const submitPaste = async () => {
    if (!pasteText.trim()) { setErr("Paste the corrected text first."); return; }
    await addExample(pasteName.trim() || "Pasted correction", pasteText);
    setPasteText(""); setPasteName(""); setShowPaste(false);
  };

  const toggle = (id) => setState(s => ({ ...s, markingExamples: (s.markingExamples || []).map(x => x.id === id ? { ...x, enabled: !x.enabled } : x) }));
  const remove = (id) => setState(s => ({ ...s, markingExamples: (s.markingExamples || []).filter(x => x.id !== id) }));
  const redistil = async (it) => {
    if (!config) { setErr("Set up an AI config in Settings to distil a profile."); return; }
    setBusy("distilling"); setErr("");
    try {
      const profile = await distil(it.text || "");
      setState(s => ({ ...s, markingExamples: (s.markingExamples || []).map(x => x.id === it.id ? { ...x, profile } : x) }));
      setOkMsg(`Re-distilled "${it.name}".`);
    } catch (e) { setErr(`Re-distil failed: ${e.message}`); }
    finally { setBusy(""); }
  };

  const enabledCount = items.filter(x => x.enabled).length;
  const arr = (a) => Array.isArray(a) ? a.filter(Boolean) : [];

  return <div className="fu">
    <div className="alert ai" style={{ marginBottom: 14 }}>
      <strong>How this works:</strong> API models can't be fine-tuned here, so your corrections are used as <em>in-context calibration</em>. The reader keeps your <strong>tracked changes (error → fix), margin comments anchored to the sentence, and red/highlight marks</strong>, then distils a marking profile <em>and verbatim correction examples</em>. Every <strong>enabled</strong> source — examples included — is injected into the grader so it mirrors your standards <em>and</em> reasoning. Applies to <strong>Task 1 &amp; Task 2</strong>.
      {!config && <div style={{ marginTop: 6, color: "var(--honey)" }}>⚠ No AI config set — files will be saved as raw text. Add a provider in Settings for a real profile.</div>}
    </div>

    <div className="card mb14">
      <div className="card-h"><div className="cdot" /> Add a teacher-corrected file</div>
      <div style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 10 }}>
        Upload a corrected essay file. <strong>.docx tracked changes, comments, highlights are all read and learned.</strong> Other formats (PDF, PPTX, XLSX, TXT, HTML, CSV, image) are extracted via MarkItDown (requires <code>node scripts/serve.mjs</code>). Use &quot;See what the AI read&quot; to verify.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label className={`btn bp bsm`} style={{ cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy === "parsing" ? <><Spinner /> Reading…</> : busy === "distilling" ? <><Spinner /> Learning…</> : "📄 Upload file"}
          <input type="file" accept={".docx,"+MARKITDOWN_ACCEPT} onChange={onFile} disabled={!!busy} style={{ display: "none" }} />
        </label>
        <button className="btn bg bsm" onClick={() => setShowPaste(v => !v)} disabled={!!busy}>{showPaste ? "Cancel paste" : "✎ Paste text instead"}</button>
        <span style={{ marginLeft: "auto", fontFamily: "'Geist Mono',monospace", fontSize: 11, color: "var(--ink3)" }}>{enabledCount}/{items.length} active</span>
      </div>
      {showPaste && <div style={{ marginTop: 10 }}>
        <input value={pasteName} onChange={e => setPasteName(e.target.value)} placeholder="Label (e.g. 'Minh – Task 2 essay 3 corrections')"
          style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--ink)", padding: "8px 10px", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste the corrected essay + your comments/fixes here…"
          style={{ width: "100%", minHeight: 120, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--ink)", padding: 10, borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
        <button className="btn bp bsm" style={{ marginTop: 8 }} disabled={!!busy || !pasteText.trim()} onClick={submitPaste}>{busy === "distilling" ? <><Spinner /> Learning…</> : "Add this correction"}</button>
      </div>}
      {err && <div className="alert ar" style={{ marginTop: 10, marginBottom: 0 }}>⚠ {err}</div>}
      {okMsg && !err && <div className="alert ag" style={{ marginTop: 10, marginBottom: 0 }}>✓ {okMsg}</div>}
    </div>

    {items.length === 0
      ? <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: "26px 16px" }}>
          No correction files yet. Upload one and your next grading will calibrate to it.
        </div>
      : <div className="card">
          <div className="card-h"><div className="cdot" /> Your marking sources ({items.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {items.map(it => {
              const open = expanded === it.id;
              const rawOpen = showRaw === it.id;
              const p = it.profile;
              const pairs = p && Array.isArray(p.correctionPairs) ? p.correctionPairs : [];
              return <div key={it.id} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${it.enabled ? "var(--leaf)" : "var(--border)"}`, borderRadius: 8, padding: "10px 12px", background: "var(--surface2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!it.enabled} onChange={() => toggle(it.id)} />
                    <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{it.name}</span>
                  </label>
                  {!p && <span className="chip" style={{ color: "var(--honey)" }}>raw text</span>}
                  {p && <span className="chip cs">profiled{pairs.length ? ` · ${pairs.length} fixes` : ""}</span>}
                  <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--ink3)", fontFamily: "'Geist Mono',monospace" }}>
                    {it.charCount} chars · {new Date(it.date).toLocaleDateString()}
                  </span>
                </div>

                {p && typeof p === "object" && <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink2)", lineHeight: 1.55 }}>
                  {p.strictness && <div><strong style={{ color: "var(--ink)" }}>Strictness:</strong> {p.strictness}</div>}
                  {arr(p.recurringErrors || p.focusErrors).length > 0 && <div style={{ marginTop: 4 }}><strong style={{ color: "var(--ink)" }}>Repeatedly flags:</strong> {arr(p.recurringErrors || p.focusErrors).join("; ")}</div>}
                  {arr(p.priorities).length > 0 && <div style={{ marginTop: 4 }}><strong style={{ color: "var(--ink)" }}>Rewards:</strong> {arr(p.priorities).join("; ")}</div>}
                  {open && <>
                    {p.rubric && typeof p.rubric === "object" && <div style={{ marginTop: 6 }}>
                      <strong style={{ color: "var(--ink)" }}>Rubric focus:</strong>
                      <ul style={{ margin: "3px 0 0 0", paddingLeft: 18 }}>
                        {p.rubric.taskResponse && <li><strong>TR:</strong> {p.rubric.taskResponse}</li>}
                        {p.rubric.coherence && <li><strong>CC:</strong> {p.rubric.coherence}</li>}
                        {p.rubric.lexis && <li><strong>LR:</strong> {p.rubric.lexis}</li>}
                        {p.rubric.grammar && <li><strong>GRA:</strong> {p.rubric.grammar}</li>}
                      </ul>
                    </div>}
                    {p.commentStyle && <div style={{ marginTop: 6 }}><strong style={{ color: "var(--ink)" }}>Feedback voice:</strong> {p.commentStyle}</div>}
                    {pairs.length > 0 && <div style={{ marginTop: 6 }}>
                      <strong style={{ color: "var(--ink)" }}>Corrections learned ({pairs.length}):</strong>
                      <ul style={{ margin: "3px 0 0 0", paddingLeft: 18 }}>
                        {pairs.slice(0, 12).map((pr, i) => <li key={i} style={{ marginBottom: 2 }}>
                          {pr?.error ? <><span style={{ color: "var(--rose)", textDecoration: "line-through" }}>{pr.error}</span> → <span style={{ color: "var(--leaf)" }}>{pr.fix}</span></> : null}
                          {pr?.why ? <span style={{ color: "var(--ink3)" }}> — {pr.why}</span> : null}
                        </li>)}
                      </ul>
                    </div>}
                  </>}
                </div>}

                {rawOpen && <pre style={{ marginTop: 8, maxHeight: 240, overflow: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "var(--ink2)", whiteSpace: "pre-wrap", lineHeight: 1.5, fontFamily: "'Geist Mono',monospace" }}>{it.text || "(empty)"}</pre>}

                <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                  {p && <button className="btn bg bsm" onClick={() => setExpanded(open ? null : it.id)}>{open ? "Less" : "Details"}</button>}
                  <button className="btn bg bsm" onClick={() => setShowRaw(rawOpen ? null : it.id)}>{rawOpen ? "Hide source" : "👁 See what the AI read"}</button>
                  {config && <button className="btn bg bsm" disabled={!!busy} onClick={() => redistil(it)}>↻ Re-distil</button>}
                  <button className="btn bg bsm" style={{ color: "var(--rose)" }} onClick={() => remove(it.id)}>Delete</button>
                </div>
              </div>;
            })}
          </div>
        </div>}
  </div>;
}
