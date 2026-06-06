const VOCAB_IMPORT_STOPWORDS = new Set([
  "about","above","after","again","against","also","although","among","and","are","because","been","before","being","below","between","both","but","can","could","did","does","doing","done","down","during","each","few","for","from","had","has","have","having","here","into","its","itself","just","more","most","much","not","now","off","once","only","other","our","ours","out","over","own","same","she","should","some","such","than","that","the","their","them","then","there","these","they","this","those","through","too","under","until","very","was","were","what","when","where","which","while","who","why","will","with","would","you","your"
]);

const IELTS_IMPORT_PRIORITY_TERMS = new Set([
  "analyse","analysis","approach","assess","benefit","challenge","change","coherent","compare","complex",
  "consequence","consistent","constraint","context","contrast","contribute","criteria","data","debate","decline",
  "demonstrate","development","economic","education","effective","evidence","factor","framework","impact","implement",
  "implication","improve","increase","influence","infrastructure","innovation","interpret","issue","maintain","method",
  "outcome","policy","population","process","proportion","quality","relevant","resource","response","sector",
  "significant","solution","strategy","structure","sustainable","trend","variation"
]);
const IELTS_IMPORT_ACADEMIC_SUFFIX_RE = /(?:tion|sion|ment|ity|ance|ence|ism|ist|ive|ous|al|ic|ary|ize|ise)$/;
const IELTS_IMPORT_ACADEMIC_PREFIX_RE = /^(?:inter|multi|macro|micro|trans|under|over|semi|sub|pre|post)/;
const VOCAB_DIRECT_TEXT_FILE_ACCEPT = ".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml";
const VOCAB_AUDIO_FILE_ACCEPT = ".mp3,.m4a,.wav,.webm,.ogg,.flac";
const VOCAB_AUDIO_FILE_EXTS = new Set(["mp3","m4a","wav","webm","ogg","flac"]);

function normalizeVocabImportWord(value) {
  return String(value||"")
    .toLowerCase()
    .trim()
    .replace(/^[^a-z]+|[^a-z-]+$/g,"")
    .replace(/[^a-z-]/g,"");
}

function uniqueVocabImportWords(words) {
  const seen = new Set();
  const out = [];
  (words||[]).forEach(raw=>{
    const w = normalizeVocabImportWord(raw);
    if (!w || w.length < 3 || w.length > 32 || seen.has(w) || VOCAB_IMPORT_STOPWORDS.has(w)) return;
    seen.add(w);
    out.push(w);
  });
  return out;
}

function extractLocalVocabListWords(text) {
  const raw = String(text||"").replace(/\r/g,"\n").trim();
  if (!raw) return [];
  const lines = raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const commaParts = raw.length <= 12000 ? raw.split(/[;,]/).map(x=>x.trim()).filter(Boolean) : [];
  const shortLines = lines.filter(line=>line.length <= 120).length;
  const markedLines = lines.filter(line=>/^\s*(?:[-*•]|\d+[.)]|[a-z][.)])\s+/i.test(line) || /[:\t]| - | – | — /.test(line)).length;
  const commaListLike = commaParts.length >= 6 && lines.length <= 8;
  const lineListLike = lines.length >= 4 && shortLines / lines.length >= 0.65 && markedLines >= Math.max(2, Math.floor(lines.length * 0.35));
  if (!commaListLike && !lineListLike) return [];
  const pieces = commaListLike ? commaParts : lines;
  const words = [];
  pieces.forEach(piece=>{
    const cleaned = piece
      .replace(/^\s*(?:[-*•]|\d+[.)]|[a-z][.)])\s*/i,"")
      .trim();
    const head = cleaned.split(/\s+(?:-|–|—)\s+|[:：\t=]/)[0].trim();
    const matches = head.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
    if (matches.length === 1) words.push(matches[0]);
    else if (matches.length > 1 && matches.length <= 3 && head.length <= 40) words.push(...matches);
  });
  return uniqueVocabImportWords(words);
}

function splitVocabImportText(text, maxChars = 5200) {
  const raw = String(text||"").replace(/\r/g,"\n").trim();
  if (!raw) return [];
  const sentenceReady = raw.replace(/([.!?])\s+/g,"$1\n");
  const blocks = sentenceReady.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  blocks.forEach(block=>{
    if (block.length > maxChars) {
      pushCurrent();
      for (let i=0; i<block.length; i+=maxChars) chunks.push(block.slice(i,i+maxChars).trim());
      return;
    }
    const next = current ? `${current}\n${block}` : block;
    if (next.length > maxChars) {
      pushCurrent();
      current = block;
    } else current = next;
  });
  pushCurrent();
  return chunks;
}

function normalizeExtractedVocabPayload(payload) {
  const arr = Array.isArray(payload) ? payload
    : Array.isArray(payload?.words) ? payload.words
    : Array.isArray(payload?.vocabulary) ? payload.vocabulary
    : Array.isArray(payload?.items) ? payload.items
    : [];
  return uniqueVocabImportWords(arr.map(item=>typeof item==="string" ? item : (item?.word || item?.lemma || item?.headword || "")));
}

function normalizeImportedLexisPayload(payload) {
  const collocations = normalizeLexisTextList(payload?.collocations || [], ["phrase","collocation","text","term"])
    .map(phrase=>({phrase, example:String((payload?.collocations||[]).find(x=>(x?.phrase||x?.collocation||x?.text)===phrase)?.example||"").trim()}));
  const idioms = normalizeIdiomList(payload?.idioms || []);
  const words = normalizeExtractedVocabPayload(payload?.words || []);
  return {collocations, idioms, words};
}

function mergeVocabLexisLibrary(prev={}, scan={}) {
  const mergeBy = (existing=[], incoming=[], keyFn) => {
    const seen = new Set();
    const out = [];
    [...existing, ...incoming].forEach(item=>{
      const key = keyFn(item).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  };
  return {
    collocations: mergeBy(prev.collocations||[], scan.collocations||[], item=>item.phrase||"").slice(0,200),
    idioms: mergeBy(prev.idioms||[], scan.idioms||[], item=>item.idiom||"").slice(0,160),
    updatedAt: new Date().toISOString()
  };
}

function buildVocabImportCandidates(words,state) {
  const custom = state.customVocab || {};
  return uniqueVocabImportWords(words).map(w=>{
    const awlHead = (AWL_DATA_MAP.has(w) ? w : (typeof AWL_FORM_TO_HW !== "undefined" ? AWL_FORM_TO_HW.get(w) : ""));
    if (awlHead && AWL_DATA_MAP.has(awlHead)) return {word:w,status:"awl",sublist:AWL_DATA_MAP.get(awlHead).s,selected:false};
    const customEntry = custom[w] || (typeof getCustomVocabEntryForForm !== "undefined" ? getCustomVocabEntryForForm(w,state) : null);
    if (customEntry) return {word:w,status:"custom",sublist:null,selected:false};
    return {word:w,status:"new",sublist:null,selected:false};
  });
}

function buildVocabImportRankingProfile(state) {
  return {
    priorityWords: new Set((state?.priorityWords||[]).map(normalizeVocabImportWord)),
    recentWriting: (state?.essays||[])
      .slice(0,6)
      .map(e=>`${e.promptText||""} ${e.essay||""}`)
      .join(" ")
      .toLowerCase()
  };
}

function scoreVocabImportCandidate(candidate,index,profile) {
  if (!candidate || candidate.status !== "new") return -Infinity;
  const w = candidate.word || "";
  let score = 0;
  if (IELTS_IMPORT_PRIORITY_TERMS.has(w)) score += 12;
  if (IELTS_IMPORT_ACADEMIC_SUFFIX_RE.test(w)) score += 6;
  if (IELTS_IMPORT_ACADEMIC_PREFIX_RE.test(w)) score += 3;
  if (w.length >= 6 && w.length <= 13) score += 4;
  else if (w.length >= 14) score += 1;
  if (profile.priorityWords.has(w)) score += 8;
  if (profile.recentWriting.includes(w)) score += 3;
  if (w.includes("-")) score -= 2;
  score -= Math.min(index,200) * 0.02;
  return score;
}

function selectWeeklyVocabCandidates(candidates, limit=5, state={}) {
  const profile = buildVocabImportRankingProfile(state);
  const picked = new Set((candidates||[])
    .map((c,index)=>({index,score:scoreVocabImportCandidate(c,index,profile)}))
    .filter(x=>Number.isFinite(x.score))
    .sort((a,b)=>b.score-a.score || a.index-b.index)
    .slice(0,limit)
    .map(x=>x.index));
  return (candidates||[]).map((c,index)=>({...c,selected:picked.has(index)}));
}

function getVocabFileExt(fileName) {
  const m = String(fileName||"").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function ImportVocabView({state,setState,config,onBack}) {
  const savedImportDraft = state.vocabImportDraft || {};
  const [text,setText] = useState(()=>savedImportDraft.text || "");
  const [candidates,setCandidates] = useState(()=>Array.isArray(savedImportDraft.candidates) ? savedImportDraft.candidates : []);
  const [extracting,setExtracting] = useState(false);
  const [generating,setGenerating] = useState(false);
  const [progress,setProgress] = useState({cur:0,tot:0,word:""});
  const [errMsg,setErrMsg] = useState("");
  const [doneCount,setDoneCount] = useState(()=>Number(savedImportDraft.doneCount || 0));
  const [extractInfo,setExtractInfo] = useState(()=>savedImportDraft.extractInfo || null);
  const [lexisScan,setLexisScan] = useState(()=>savedImportDraft.lexisScan || null);
  const [failedWords,setFailedWords] = useState(()=>Array.isArray(savedImportDraft.failedWords) ? savedImportDraft.failedWords : []);
  const [fileImporting,setFileImporting] = useState("");
  const [fileMsg,setFileMsg] = useState("");

  useEffect(()=>{
    const hasDraft = !!text.trim() || candidates.length>0 || failedWords.length>0 || doneCount>0 || !!extractInfo || !!lexisScan;
    setState(s=>({
      ...s,
      vocabImportDraft: hasDraft ? {text,candidates,extractInfo,lexisScan,failedWords,doneCount,updatedAt:new Date().toISOString()} : null
    }));
  },[text,candidates,extractInfo,lexisScan,failedWords,doneCount]);

  const clearImportDraft = () => {
    if ((text.trim() || candidates.length>0) && !window.confirm("Clear the current vocab import draft?")) return;
    setText("");
    setCandidates([]);
    setExtractInfo(null);
    setLexisScan(null);
    setFailedWords([]);
    setDoneCount(0);
    setErrMsg("");
    setProgress({cur:0,tot:0,word:""});
    setState(s=>({...s,vocabImportDraft:null}));
  };

  const appendImportedText = (incoming, filename, sourceType="file") => {
    const cleaned = String(incoming||"").replace(/\r/g,"\n").trim();
    if (!cleaned) {
      setErrMsg(`No readable text found in ${filename || sourceType}.`);
      return false;
    }
    setText(prev=>prev.trim() ? `${prev.trim()}\n\n${cleaned}` : cleaned);
    setCandidates([]);
    setExtractInfo(null);
    setLexisScan(null);
    setFailedWords([]);
    setDoneCount(0);
    setErrMsg("");
    setFileMsg(`Added ${sourceType} from ${filename || "file"}. Review the text, then click Extract candidates.`);
    return true;
  };

  const importPlainTextFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setFileImporting("text"); setFileMsg(""); setErrMsg("");
    try {
      appendImportedText(await file.text(), file.name, "text");
    } catch(ex) {
      setErrMsg("Text file import failed: "+(ex.message || "unknown error"));
    } finally {
      setFileImporting("");
    }
  };

  const importAudioFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const ext = getVocabFileExt(file.name);
    if (!VOCAB_AUDIO_FILE_EXTS.has(ext)) {
      setErrMsg("Use an audio file: mp3, m4a, wav, webm, ogg, or flac.");
      return;
    }
    setFileImporting("audio"); setFileMsg(""); setErrMsg("");
    try {
      const base = String(state.speakingBackendUrl || "http://localhost:8000").replace(/\/+$/,"");
      const body = new FormData();
      body.append("audio", file);
      const res = await fetch(`${base}/api/transcribe`, {method:"POST", body});
      const json = await res.json().catch(()=>({error:`HTTP ${res.status}`}));
      if (!res.ok) throw new Error(json.error || `Transcribe failed (${res.status})`);
      const transcript = String(json.text || json.transcript || "").trim();
      if (!transcript) throw new Error("No transcript returned from speaking backend.");
      const ok = appendImportedText(transcript, file.name, "audio transcript");
      if (ok) {
        const secs = Number(json.duration_sec || json.duration || 0);
        setFileMsg(`Added audio transcript from ${file.name}${secs?` (${Math.round(secs)}s)`:""}. Review the text, then click Extract candidates.`);
      }
    } catch(ex) {
      setErrMsg("Audio transcription failed: "+(ex.message || "unknown error"));
    } finally {
      setFileImporting("");
    }
  };

  const extract = async () => {
    if (!text.trim()) { setErrMsg("Paste text first."); return; }
    setExtracting(true); setErrMsg(""); setDoneCount(0); setExtractInfo(null); setLexisScan(null); setFailedWords([]);
    try {
      const localWords = extractLocalVocabListWords(text);
      let words = [...localWords];
      let mode = localWords.length >= 3 ? "local-list" : "ai-chunks";
      let chunks = [];
      if (localWords.length < 3) {
        if (!config) throw new Error("Set up AI in Settings first, or paste a clear word list with one word per line/comma.");
        chunks = splitVocabImportText(text);
        if (!chunks.length) throw new Error("No readable text found.");
        for (let i=0; i<chunks.length; i++) {
          setProgress({cur:i+1,tot:chunks.length,word:`chunk ${i+1}`});
          const prompt = `From CHUNK ${i+1}/${chunks.length} below, extract ALL IELTS-worthy academic vocabulary.
Focus on:
- Academic words from AWL or comparable academic vocab lists
- Words useful for IELTS Writing Task 1/2 (data description, argumentation, hedging, transitions)
- Skip very common words (the, is, very, good, get, big, etc.) and proper nouns
- Skip basic A1/A2 vocab
- Use base-form / lemma only
- Single words only, not phrases

Return ONLY a JSON array of lowercase words. Do not impose a 30-word cap; include every suitable word from this chunk. No markdown, no fence.
Example: ["analyse","data","significant","approach","comprehensive"]

CHUNK:
${chunks[i]}`;
          const raw = await callAPI(config,[{role:"user",content:prompt}],1800);
          words.push(...normalizeExtractedVocabPayload(safeJSON(raw)));
        }
      }
      let scanInfo = config ? null : {skipped:true, reason:"No AI config for lexis scan."};
      if (config) {
        try {
          setProgress({cur:0,tot:0,word:"lexis scan"});
          const scan = normalizeImportedLexisPayload(await extractLexisFromText(config,text));
          words.push(...scan.words);
          scanInfo = {collocations:scan.collocations.length, idioms:scan.idioms.length, words:scan.words.length};
          if (scan.collocations.length || scan.idioms.length) {
            setState(s=>({...s,vocabLexisLibrary:mergeVocabLexisLibrary(s.vocabLexisLibrary,scan)}));
          }
        } catch(ex) {
          scanInfo = {error:ex.message || "Lexis scan failed"};
        }
      }
      const cands = selectWeeklyVocabCandidates(buildVocabImportCandidates(words,state), 5, state);
      setCandidates(cands);
      setLexisScan(scanInfo);
      setExtractInfo({mode,chunks:chunks.length,local:localWords.length,total:cands.length,newCount:cands.filter(c=>c.status==="new").length,lexis:scanInfo});
      if (!cands.length) setErrMsg("No IELTS-worthy vocabulary found. Try a longer text or paste a clearer word list.");
    } catch(e) { setErrMsg("Extract failed: "+e.message); }
    finally { setExtracting(false); setProgress({cur:0,tot:0,word:""}); }
  };

  const toggle = (i) => setCandidates(c=>c.map((x,j)=>j===i?{...x,selected:!x.selected}:x));
  const selectAll = (on) => setCandidates(c=>c.map(x=>x.status==="new"?{...x,selected:on}:x));

  const generate = async () => {
    const existingCustom = state.customVocab || {};
    const selected = candidates.filter(c=>c.selected&&c.status==="new"&&!existingCustom[c.word]);
    const alreadySaved = candidates.filter(c=>c.selected&&c.status==="new"&&existingCustom[c.word]);
    if (alreadySaved.length) setCandidates(list=>list.filter(x=>!existingCustom[x.word]));
    if (selected.length===0) { setErrMsg(alreadySaved.length ? "Selected words were already generated and removed from the queue." : "No new words selected."); return; }
    if (!config) { setErrMsg("Set up AI in Settings first."); return; }
    setGenerating(true); setErrMsg(""); setDoneCount(0); setFailedWords([]);
    setProgress({cur:0,tot:selected.length,word:""});
    const newCustom = {...(state.customVocab||{})};
    const generatedCustom = {};
    let nextId = Object.keys(newCustom).length+1;
    let done = 0;
    const failed = [];
    for (const c of selected) {
      setProgress({cur:done,tot:selected.length,word:c.word});
      try {
        const prompt = `For the academic word "${c.word}", produce a compact JSON entry matching this EXACT schema (no markdown, no preamble, no fence):
{
  "id":"custom-${String(nextId).padStart(3,"0")}",
  "s":"custom",
  "hw":"${c.word}",
  "fam":{"n":["noun forms"],"v":["verb forms"],"adj":["adjective forms"],"adv":["adverb forms"]},
  "vi":"concise Vietnamese gloss",
  "t1":"IELTS Task 1 example sentence (chart/data/trend context)",
  "ex":"general academic example (using a non-headword family form if possible)",
  "col":["collocation 1","collocation 2","collocation 3"],
  "synonyms":["precise academic synonym 1","precise academic synonym 2"],
  "antonyms":["precise academic antonym 1","precise academic antonym 2"],
  "idioms":[{"idiom":"relevant idiom or fixed expression","meaning":"plain English meaning","example":"short natural example"}]
}
Rules:
- Include all genuine family forms; use [] for POS categories that don't apply (e.g. verb-only words have n:[], adj:[], adv:[]).
- Both t1 and ex must contain at least one family-form word (so the quiz engine can derive fill-blanks).
- Keep sentences 12–22 words each.
- vi: 2–6 Vietnamese words. No English.
- col: real attested collocations, lowercase, no period.
- synonyms: precise near-synonyms useful for IELTS, not random loose words.
- antonyms: precise opposites/near-opposites; use [] if the word has no real opposite (e.g. a concrete noun).
- idioms: only natural fixed expressions related to the word/topic; use [] if none are natural.`;
        const raw = await callAPI(config,[{role:"user",content:prompt}],600);
        const entry = safeJSON(raw);
        if (entry&&entry.hw) {
          // Normalize: ensure hw is the word, sublist is "custom"
          entry.hw = c.word;
          entry.s = "custom";
          entry.fam = entry.fam||{n:[],v:[],adj:[],adv:[]};
          entry.col = entry.col||[];
          entry.synonyms = entry.synonyms||[];
          entry.antonyms = entry.antonyms||[];
          entry.idioms = entry.idioms||[];
          newCustom[c.word] = entry;
          generatedCustom[c.word] = entry;
          nextId++; done++;
          setState(s=>({...s,customVocab:{...(s.customVocab||{}),[c.word]:entry}}));
          setDoneCount(done);
          setCandidates(list=>list.filter(x=>x.word!==c.word));
        }
      } catch(e) {
        failed.push({word:c.word,error:e.message || "generation failed"});
        console.error("gen failed for",c.word,e);
      }
    }
    setState(s=>({...s,customVocab:{...(s.customVocab||{}),...generatedCustom}}));
    setDoneCount(done);
    setFailedWords(failed);
    if (failed.length) setErrMsg(`${failed.length} word${failed.length===1?"":"s"} failed. They stay selected below; click Generate again to retry.`);
    else setErrMsg("");
    // Remove generated words from candidate list so user sees remaining
    setCandidates(c=>c.filter(x=>!(x.selected&&x.status==="new"&&generatedCustom[x.word])));
    setGenerating(false);
    setProgress({cur:done,tot:selected.length,word:""});
  };

  const newCount = candidates.filter(c=>c.status==="new").length;
  const dupeCount = candidates.length-newCount;
  const selectedCount = candidates.filter(c=>c.selected&&c.status==="new").length;
  const customTotal = Object.keys(state.customVocab||{}).length;

  return <div className="canvas fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <button className="btn bg bsm" onClick={onBack}>← Back</button>
      <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>{customTotal} custom words saved</span>
    </div>
    <h1 className="title-x">Import <em>Vocabulary</em></h1>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>Paste text</div>
      <textarea value={text} onChange={e=>{setText(e.target.value);setExtractInfo(null);setLexisScan(null);setFileMsg("");setCandidates([]);setFailedWords([]);setDoneCount(0);}}
        placeholder="Paste an English article, reading passage, essay, or word list. The app extracts broadly, then auto-selects 5 useful new words for this week."
        style={{width:"100%",minHeight:140,background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--ink)",padding:10,borderRadius:8,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5}}/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:10}}>
        <MarkItDownUploader compact label="Import doc" hint="Convert a document to text first." disabled={extracting||generating||!!fileImporting}
          onResult={r=>appendImportedText(r.markdown, r.filename, "document")}/>
        <label className={`btn bg bsm${extracting||generating||!!fileImporting?" disabled":""}`} style={{cursor:extracting||generating||fileImporting?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:5}}>
          {fileImporting==="text"?<><Spinner/> Reading...</>:"Import text file"}
          <input type="file" accept={VOCAB_DIRECT_TEXT_FILE_ACCEPT} onChange={importPlainTextFile} disabled={extracting||generating||!!fileImporting} style={{display:"none"}}/>
        </label>
        <label className={`btn bg bsm${extracting||generating||!!fileImporting?" disabled":""}`} style={{cursor:extracting||generating||fileImporting?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:5}}>
          {fileImporting==="audio"?<><Spinner/> Transcribing...</>:"Import audio"}
          <input type="file" accept={VOCAB_AUDIO_FILE_ACCEPT} onChange={importAudioFile} disabled={extracting||generating||!!fileImporting} style={{display:"none"}}/>
        </label>
        <span style={{fontSize:10.5,color:"var(--ink3)",lineHeight:1.4}}>Text works in double-click mode. Docs/images need local server. Audio needs speaking backend.</span>
      </div>
      {fileMsg&&<div className="alert ai mt8" style={{marginBottom:0}}>{fileMsg}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:"var(--ink3)"}}>
          {extractInfo
            ? `${extractInfo.total} candidates · ${extractInfo.newCount} new · ${extractInfo.mode==="local-list"?"list parsed locally":`${extractInfo.chunks} AI chunks`}`
            : `${text.length} chars · full input processed`}
        </span>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(text.trim()||candidates.length>0||failedWords.length>0)&&<button className="btn bg bsm" disabled={extracting||generating} onClick={clearImportDraft}>Clear draft</button>}
          <button className="btn bp bsm" disabled={extracting||!text.trim()} onClick={extract}>
            {extracting?<><Spinner/> Extracting{progress.tot?` ${progress.cur}/${progress.tot}`:""}...</>:"✨ Extract candidates"}
          </button>
        </div>
      </div>
      {lexisScan&&<div className={`alert ${lexisScan.error?"aw":"ai"} mt8`} style={{marginBottom:0}}>
        {lexisScan.error
          ? `Lexis scan skipped: ${lexisScan.error}`
          : lexisScan.skipped
            ? lexisScan.reason
            : `Lexis saved: ${lexisScan.collocations||0} collocation${(lexisScan.collocations||0)===1?"":"s"}, ${lexisScan.idioms||0} idiom${(lexisScan.idioms||0)===1?"":"s"}, ${lexisScan.words||0} candidate word${(lexisScan.words||0)===1?"":"s"}.`}
      </div>}
      {errMsg&&<div className="alert ar mt8" style={{marginBottom:0}}>⚠ {errMsg}</div>}
    </div>

    {candidates.length>0&&<div className="card mb14">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div className="card-h" style={{margin:0}}><div className="cdot"/>Candidates · <span style={{color:"var(--leaf)"}}>{newCount} new</span>{dupeCount>0&&<span style={{color:"var(--ink3)"}}> · {dupeCount} dup</span>}</div>
        {newCount>0&&<div style={{display:"flex",gap:6}}>
          <button className="btn bg bsm" onClick={()=>selectAll(true)}>Select all</button>
          <button className="btn bg bsm" onClick={()=>selectAll(false)}>None</button>
        </div>}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {candidates.map((c,i)=>{
          const isDupe = c.status!=="new";
          const dupeLabel = c.status==="awl"?`Sub ${c.sublist}`:"custom";
          return <button key={i} onClick={()=>!isDupe&&toggle(i)} disabled={isDupe}
            style={{
              background: isDupe?"var(--surface2)":(c.selected?"var(--leaf)":"var(--surface)"),
              color: isDupe?"var(--ink3)":(c.selected?"var(--bg)":"var(--ink)"),
              border:`1px solid ${c.selected&&!isDupe?"var(--leaf)":"var(--border)"}`,
              borderRadius:6,padding:"5px 10px",fontSize:12,cursor:isDupe?"not-allowed":"pointer",
              opacity:isDupe?0.55:1,fontFamily:"'Geist Mono',monospace",fontWeight:c.selected?600:400
            }}>
            {c.word}{isDupe&&<span style={{fontSize:9,marginLeft:5,color:"var(--ink3)"}}>({dupeLabel})</span>}
          </button>;
        })}
      </div>
      {newCount>5&&<div className="alert ai" style={{marginBottom:12,fontSize:11.5}}>
        Recommended queue: 5 high-utility new words are selected. Select more only if you will review them today; otherwise leave the rest for a later import/session.
      </div>}
      <button className="btn bp" disabled={generating||selectedCount===0} onClick={generate}>
        {generating
          ?<><Spinner/> Generating {progress.cur}/{progress.tot}{progress.word?`: ${progress.word}`:""}...</>
          :`✦ Generate ${selectedCount} entr${selectedCount===1?"y":"ies"}`}
      </button>
      {failedWords.length>0&&<div className="alert aw" style={{marginTop:12,marginBottom:0,fontSize:11.5,lineHeight:1.55}}>
        <strong>{failedWords.length} failed:</strong> {failedWords.map(f=>f.word).join(", ")}. Failed words remain selected, so the same button retries them.
        <div style={{marginTop:6,color:"var(--ink3)"}}>
          {failedWords.slice(0,4).map(f=><div key={f.word}><code>{f.word}</code>: {f.error}</div>)}
          {failedWords.length>4&&<div>+ {failedWords.length-4} more</div>}
        </div>
      </div>}
    </div>}

    {doneCount>0&&!generating&&<div className="alert ag">✓ <strong>{doneCount}</strong> word{doneCount>1?"s":""} added to your custom vocab. They behave like AWL entries — load instantly offline, work in quiz/study mode. Sublist label: <code>custom</code>.</div>}
  </div>;
}

function normalizeWordFormAnswer(value) {
  return String(value||"").toLowerCase().trim().replace(/[^a-z'-]/g,"");
}

function getWordFormCardData(word,state={}) {
  const raw = normalizeVocabWord(word);
  if (!raw) return null;
  const cached = state.wordCache?.[raw];
  if (cached?.family_fill_blanks?.length || cached?.fill_blanks?.length) return cached;
  const awlHead = (typeof AWL_FORM_TO_HW !== "undefined" && AWL_FORM_TO_HW.get(raw)) || raw;
  const awlEntry = typeof AWL_DATA_MAP !== "undefined" ? AWL_DATA_MAP.get(awlHead) : null;
  if (awlEntry) return awlEntryToWordCardData(awlEntry);
  const customEntry = state.customVocab?.[raw] || (typeof getCustomVocabEntryForForm !== "undefined" ? getCustomVocabEntryForForm(raw,state) : null);
  if (customEntry) return awlEntryToWordCardData(customEntry);
  return cached || null;
}

function buildWordFormTransformDrills(refs,state={},limit=12) {
  const words = [];
  const addWord = (word) => {
    const w = normalizeVocabWord(word);
    if (w && !words.includes(w)) words.push(w);
  };
  vocabRefsToWords(refs,state).forEach(addWord);
  (state.priorityWords||[]).forEach(addWord);
  Object.values(state.dailyStats||{}).slice(-7).forEach(day=>(day?.words||[]).forEach(addWord));
  Object.keys(state.customVocab||{}).forEach(addWord);
  if (words.length < 8) AWL_WORDS.slice(0,80).forEach(w=>addWord(w.w));

  const drills = [];
  const seen = new Set();
  for (const word of words) {
    const card = getWordFormCardData(word,state);
    if (!card) continue;
    const headword = normalizeVocabWord(card.word || word);
    const familyDefs = card.family_definitions || [];
    const blanks = [...(card.family_fill_blanks||[]),...(card.fill_blanks||[])];
    let addedForWord = 0;
    for (const blank of blanks) {
      const answer = normalizeWordFormAnswer(blank.answer || blank.form);
      const sentence = String(blank.sentence||"").trim();
      if (!answer || !sentence || answer === headword) continue;
      const key = `${headword}:${answer}:${sentence}`;
      if (seen.has(key)) continue;
      const def = familyDefs.find(d=>normalizeWordFormAnswer(d.form)===answer) || {};
      seen.add(key);
      drills.push({
        id:key,
        headword,
        answer,
        sentence,
        context:blank.context || def.pos || "word form",
        pos:def.pos || "",
        meaning_en:def.meaning_en || "",
        family:(card.family||[]).slice(0,10)
      });
      addedForWord++;
      if (addedForWord >= 2 || drills.length >= limit) break;
    }
    if (drills.length >= limit) break;
  }
  return drills;
}

function WordFormDrillView({state,setState,refs,onBack}) {
  const drills = useMemo(()=>buildWordFormTransformDrills(refs,state,12),[refs,state.wordCache,state.customVocab,state.mastery,state.dailyStats]);
  const [idx,setIdx] = useState(0);
  const [answer,setAnswer] = useState("");
  const [checked,setChecked] = useState(null);
  const [results,setResults] = useState([]);
  const [finished,setFinished] = useState(false);
  const today = TODAY();
  const cur = drills[idx];

  const recordResults = (finalResults) => {
    setState(s=>{
      const mastery = {...(s.mastery||{})};
      const touched = new Set();
      finalResults.forEach(r=>{
        touched.add(r.headword);
        const curLevel = Number(mastery[r.headword]||0);
        const delta = r.correct ? 1 : -0.5;
        mastery[r.headword] = Math.max(0,Math.min(5,Math.round(curLevel + delta)));
      });
      const prevStat = s.dailyStats?.[today] || {target:0,extra:0,words:[]};
      const prevWords = new Set(prevStat.words||[]);
      const newWords = [...touched].filter(w=>!prevWords.has(w));
      return {
        ...s,
        mastery,
        dailyStats:{
          ...(s.dailyStats||{}),
          [today]:{
            target:prevStat.target||0,
            extra:(prevStat.extra||0)+newWords.length,
            words:[...(prevStat.words||[]),...newWords]
          }
        }
      };
    });
  };

  const check = () => {
    if (!cur || checked) return;
    const user = normalizeWordFormAnswer(answer);
    const correct = user === cur.answer;
    const result = {...cur,user,correct};
    setChecked(result);
    setResults(prev=>[...prev,result]);
  };
  const next = () => {
    if (!checked) return;
    if (idx + 1 >= drills.length) {
      recordResults([...results,checked].filter((r,i,arr)=>arr.findIndex(x=>x.id===r.id)===i));
      setFinished(true);
    } else {
      setIdx(i=>i+1);
      setAnswer("");
      setChecked(null);
    }
  };

  if (!drills.length) return <div className="canvas fu">
    <button className="btn bg bsm" onClick={onBack} style={{marginBottom:14}}>Back</button>
    <h1 className="title-x">Word-form <em>Drill</em></h1>
    <div className="alert aw">No word-family data is available yet. Study or import a few vocab cards first.</div>
  </div>;

  if (finished) {
    const correct = results.filter(r=>r.correct).length;
    return <div className="canvas" style={{textAlign:"center",paddingTop:50}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:26,color:"var(--ink)",marginBottom:8}}>Word-form drill complete</div>
      <div style={{color:"var(--ink2)",fontSize:14,marginBottom:18}}>{correct}/{results.length} correct</div>
      <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
        <button className="btn bg" onClick={onBack}>Back to Vocab</button>
        <button className="btn bp" onClick={()=>{setIdx(0);setAnswer("");setChecked(null);setResults([]);setFinished(false);}}>Retry</button>
      </div>
    </div>;
  }

  return <div className="canvas fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <button className="btn bg bsm" onClick={onBack}>Back</button>
      <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>Word-form drill {idx+1}/{drills.length}</span>
    </div>
    <PBar value={idx+1} max={drills.length}/>
    <div className="card mt14">
      <div className="card-h"><div className="cdot" style={{background:"var(--honey)"}}/>Transform the word form</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <span className="chip cl">base: {cur.headword}</span>
        {cur.pos && <span className="chip cs">{cur.pos}</span>}
        {cur.context && <span className="chip">{cur.context}</span>}
      </div>
      <div style={{fontSize:18,lineHeight:1.65,color:"var(--ink)",marginBottom:14}}>{cur.sentence}</div>
      <form onSubmit={e=>{e.preventDefault(); checked?next():check();}}>
        <input className="input era-input" autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} disabled={!!checked}
          placeholder={`Correct form of "${cur.headword}"`} style={{marginBottom:10}}/>
        {checked && <div className={`alert ${checked.correct?"ag":"ar"}`} style={{marginBottom:10}}>
          {checked.correct ? "Correct." : `Correct answer: ${cur.answer}`}
          {cur.meaning_en && <div style={{marginTop:5,color:"var(--ink2)"}}>{cur.meaning_en}</div>}
        </div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn bp" disabled={!answer.trim() && !checked} type="submit">{checked ? (idx+1>=drills.length?"Finish":"Next") : "Check"}</button>
          {cur.family?.length>0 && <span style={{fontSize:11,color:"var(--ink3)",alignSelf:"center"}}>Family: {cur.family.join(", ")}</span>}
        </div>
      </form>
    </div>
  </div>;
}

function buildVocabLexisItems(state={}, type="collocations", limit=16) {
  const items = [];
  const seen = new Set();
  const inferImportedLexisLabel = (phrase) => {
    const words = String(phrase||"").toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
    return words.find(w=>!VOCAB_IMPORT_STOPWORDS.has(w)) || "Imported text";
  };
  const push = (item) => {
    const phrase = String(item.phrase||"").trim();
    const key = `${type}:${phrase}`.toLowerCase();
    if (!item.word || !phrase || seen.has(key)) return;
    seen.add(key);
    items.push({...item, phrase});
  };
  const addImportedPhrase = (raw, fields=[], fallbackMeaning="Imported lexis from your text.") => {
    if (!raw) return;
    const phrase = typeof raw === "string"
      ? raw
      : fields.map(field=>raw?.[field]).find(Boolean) || raw?.phrase || raw?.text || raw?.term || "";
    const cleanPhrase = String(phrase||"").trim();
    if (!cleanPhrase) return;
    push({
      word: inferImportedLexisLabel(cleanPhrase),
      phrase: cleanPhrase,
      meaning: typeof raw === "object" && raw?.meaning
        ? raw.meaning
        : (type === "collocations" && typeof detectCollocationPattern === "function" ? detectCollocationPattern(cleanPhrase) : fallbackMeaning),
      example: typeof raw === "object" ? String(raw?.example||"").trim() : ""
    });
  };
  const addCard = (word, data) => {
    if (!word || !data) return;
    const card = data.definitions ? data : awlEntryToWordCardData(data);
    const lexis = normalizeWordLexis(card);
    if (type === "idioms") {
      lexis.idioms.forEach(it => push({
        word,
        phrase: it.idiom,
        meaning: it.meaning || "Fixed expression. Use it only when the context naturally fits.",
        example: it.example || ""
      }));
    } else {
      lexis.collocations.forEach(phrase => push({
        word,
        phrase,
        meaning: typeof detectCollocationPattern === "function" ? detectCollocationPattern(phrase) : "natural word combination",
        example: ""
      }));
    }
  };

  Object.entries(state.wordCache||{}).forEach(([word,data])=>addCard(word,data));
  Object.entries(state.customVocab||{}).forEach(([word,entry])=>addCard(word,entry));
  const importedLibrary = state.vocabLexisLibrary || {};
  if (type === "idioms") {
    (importedLibrary.idioms||[]).forEach(item=>addImportedPhrase(item,["idiom","phrase"],"Imported fixed expression. Use it only when the context naturally fits."));
  } else {
    (importedLibrary.collocations||[]).forEach(item=>addImportedPhrase(item,["phrase","collocation"],"Imported natural word combination."));
  }
  if (type === "collocations") {
    AWL_DATA.forEach(entry=>addCard(entry.hw, entry));
  }
  return items.slice(0, limit);
}

function LexisDrillView({state,type,onBack}) {
  const items = useMemo(()=>buildVocabLexisItems(state,type,16),[state.wordCache,state.customVocab,state.vocabLexisLibrary,type]);
  const [idx,setIdx] = useState(0);
  const [revealed,setRevealed] = useState(false);
  const [results,setResults] = useState([]);
  const isIdioms = type === "idioms";
  const cur = items[idx];
  const done = idx >= items.length;
  const mark = (known) => {
    setResults(r=>[...r,{phrase:cur.phrase,word:cur.word,known}]);
    setRevealed(false);
    setIdx(i=>i+1);
  };

  if (!items.length) return <div className="canvas fu">
    <button className="btn bg bsm" onClick={onBack} style={{marginBottom:14}}>Back</button>
    <h1 className="title-x">Learn <em>{isIdioms?"Idioms":"Collocations"}</em></h1>
    <div className="alert aw">No {isIdioms?"idioms":"collocations"} are available yet. Enrich a few word cards first, or import/generate vocab with lexis.</div>
  </div>;

  if (done) {
    const known = results.filter(r=>r.known).length;
    return <div className="canvas fu" style={{textAlign:"center",paddingTop:50}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:28,color:"var(--ink)",marginBottom:6}}>{isIdioms?"Idioms":"Collocations"} drill complete</div>
      <div style={{color:"var(--ink2)",fontSize:14,marginBottom:16}}>{known}/{results.length} marked as known</div>
      <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
        <button className="btn bg" onClick={onBack}>Back to Vocab</button>
        <button className="btn bp" onClick={()=>{setIdx(0);setRevealed(false);setResults([]);}}>Retry</button>
      </div>
    </div>;
  }

  return <div className="canvas fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <button className="btn bg bsm" onClick={onBack}>Back</button>
      <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>{isIdioms?"Idioms":"Collocations"} {idx+1}/{items.length}</span>
    </div>
    <PBar value={idx+1} max={items.length}/>
    <div className="card mt14">
      <div className="card-h"><div className="cdot" style={{background:isIdioms?"var(--honey)":"var(--orchid)"}}/>{isIdioms?"Fixed expression":"Natural collocation"}</div>
      <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>Headword</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:34,color:"var(--ink)",marginBottom:10}}>{cur.word}</div>
      {isIdioms
        ? <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:"var(--honey)",fontStyle:"italic",marginBottom:12}}>{cur.phrase}</div>
        : <div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6,marginBottom:12}}>Try to recall a natural phrase that uses this word, then reveal the answer.</div>}
      {revealed&&<div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
        {!isIdioms&&<div style={{fontFamily:"'Fraunces',serif",fontSize:23,color:"var(--orchid)",fontStyle:"italic",marginBottom:5}}>{cur.phrase}</div>}
        {cur.meaning&&<div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55}}>{cur.meaning}</div>}
        {cur.example&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55,marginTop:6}}>{cur.example}</div>}
      </div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {!revealed
          ? <button className="btn bp" onClick={()=>setRevealed(true)}>Reveal</button>
          : <>
              <button className="btn bs" onClick={()=>mark(true)}>I know this</button>
              <button className="btn bg" onClick={()=>mark(false)}>Need review</button>
            </>}
      </div>
    </div>
  </div>;
}

function VocabImportedLexisPanel({library,onRemove,onClear,onOpen}) {
  const collocations = Array.isArray(library?.collocations) ? library.collocations : [];
  const idioms = Array.isArray(library?.idioms) ? library.idioms : [];
  const total = collocations.length + idioms.length;
  if (!total) return null;

  const phraseOf = (item,type) => {
    if (typeof item === "string") return item;
    return String(type === "idioms"
      ? (item?.idiom || item?.phrase || item?.text || item?.term || "")
      : (item?.phrase || item?.collocation || item?.text || item?.term || "")
    ).trim();
  };
  const meaningOf = (item,type) => {
    if (typeof item !== "object" || !item) return "";
    if (item.meaning) return String(item.meaning).trim();
    const phrase = phraseOf(item,type);
    return type === "collocations" && phrase && typeof detectCollocationPattern === "function" ? detectCollocationPattern(phrase) : "";
  };
  const renderGroup = (title,type,items,color) => {
    if (!items.length) return null;
    const shown = items.slice(0,8);
    return <div style={{flex:"1 1 280px",minWidth:0}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--ink)"}}>{title}</div>
        <span className="chip" style={{borderColor:color,color}}>{items.length}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {shown.map((item,index)=>{
          const phrase = phraseOf(item,type);
          const meaning = meaningOf(item,type);
          const example = typeof item === "object" ? String(item?.example||"").trim() : "";
          return <div key={`${type}-${index}-${phrase}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,alignItems:"start",padding:"8px 0",borderTop:"1px solid var(--border)"}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:650,color:"var(--ink)",lineHeight:1.35,overflowWrap:"anywhere"}}>{phrase}</div>
              {meaning&&<div style={{fontSize:11.5,color:"var(--ink2)",lineHeight:1.45,marginTop:3}}>{meaning}</div>}
              {example&&<div style={{fontSize:11,color:"var(--ink3)",lineHeight:1.45,marginTop:3}}>{example}</div>}
            </div>
            <button className="btn bg bsm" onClick={()=>onRemove(type,index)}>Remove</button>
          </div>;
        })}
      </div>
      {items.length>shown.length&&<div style={{fontSize:11,color:"var(--ink3)",marginTop:7}}>Showing {shown.length} of {items.length} saved.</div>}
    </div>;
  };

  return <div className="card mb14" style={{border:"1px solid color-mix(in srgb, var(--orchid) 22%, var(--border))",background:"color-mix(in srgb, var(--orchid) 4%, var(--surface))"}}>
    <div className="card-h"><div className="cdot" style={{background:"var(--orchid)"}}/>Imported Lexis Library</div>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
      <div style={{fontSize:12.5,color:"var(--ink2)"}}>{total} saved phrase{total===1?"":"s"} from imported text.</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        <button className="btn bs bsm" onClick={()=>onOpen("collocations")} disabled={!collocations.length}>Collocation drill</button>
        <button className="btn bs bsm" onClick={()=>onOpen("idioms")} disabled={!idioms.length}>Idiom drill</button>
        <button className="btn bg bsm" onClick={onClear}>Clear library</button>
      </div>
    </div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      {renderGroup("Collocations","collocations",collocations,"var(--orchid)")}
      {renderGroup("Idioms","idioms",idioms,"var(--honey)")}
    </div>
  </div>;
}

function VocabPage({state,setState,config}) {
  const [view,setView] = useState("home");
  const [studyIdx,setStudyIdx] = useState(0);
  const [wordData,setWordData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [lexisLoading,setLexisLoading] = useState("");
  const [err,setErr] = useState(null);
  const [quizKey,setQuizKey] = useState(0);
  // Dictionary lookup state
  const [dictQuery,setDictQuery] = useState("");
  const [dictWord,setDictWord] = useState(null);
  const [dictFilter,setDictFilter] = useState("all"); // all | awl | custom
  // V5: extra session size — user picks how many extra words to study past daily limit
  const [extraSize,setExtraSize] = useState(()=>{
    const saved = state.vocabSession;
    return saved?.mode==="extra" ? Math.max(1,Number(saved.extraSize)||5) : 5;
  });
  const today = TODAY();
  const schedule = useMemo(()=>getSchedule(state.startDate, state.wordsPerDay, state.activeSublists),[state.startDate, state.wordsPerDay, state.activeSublists]);
  const todayEntry = schedule.find(d=>d.date===today);
  const todayDone = !!state.completedDays[today];
  const todayWords = todayEntry?.wordIndices||[];
  // V5 — DST-safe streak (addDays), counts past streak even if today not yet done
  const streak = useMemo(()=>{
    let s=0,d=new Date();
    if(!state.completedDays[localDateStr(d)]) d=addDays(d,-1);
    while(state.completedDays[localDateStr(d)]){s++;d=addDays(d,-1);}
    return s;
  },[state.completedDays]);
  const awlProgress = useMemo(()=>getAWLProgressData(state),[state.mastery,state.dailyStats,state.wordCache,state.customVocab]);
  const mastered = awlProgress.mastered;
  const learned = awlProgress.learnedTotal;
  const wordToVocabRef = (word) => {
    const w = normalizeVocabWord(word);
    if (!w) return "";
    const awlIdx = AWL_WORDS.findIndex(a=>a.w===w);
    if (awlIdx >= 0) return awlIdx;
    return state.customVocab?.[w] ? makeCustomVocabRef(w) : "";
  };
  const priorityIdxs = useMemo(()=>(state.priorityWords||[]).map(wordToVocabRef).filter(ref=>ref!==""),[state.priorityWords,state.customVocab]);
  const customDueRefs = useMemo(()=>Object.keys(state.customVocab||{})
    .map(normalizeVocabWord)
    .filter(w=>w && (state.mastery?.[w]||0)<5)
    .slice(0,Math.max(1,extraSize))
    .map(makeCustomVocabRef),[state.customVocab,state.mastery,extraSize]);

  // Dictionary index: all 570 AWL headwords + every user-imported custom word.
  const dictIndex = useMemo(()=>{
    const arr = AWL_WORDS.map(a=>({w:a.w, s:a.s, src:"awl"}));
    for (const w of Object.keys(state.customVocab||{})) arr.push({w, s:"custom", src:"custom"});
    arr.sort((a,b)=>a.w<b.w?-1:a.w>b.w?1:0);
    return arr;
  },[state.customVocab]);

  // V5: real progress today (from dailyStats)
  const todayStats = state.dailyStats?.[today] || {target:0, extra:0, words:[]};
  const todayLearnedCount = todayStats.words?.length || 0;

  // V5: pick next N unlearned words for extra session
  // Strategy: prefer words not yet in mastery (truly new), filtered by active sublists,
  // excluding what's already scheduled for today (avoid double-counting).
  const extraIdxs = useMemo(()=>{
    const activeSet = new Set(state.activeSublists||[1,2,3,4,5,6,7,8,9,10]);
    const todaySet = new Set(todayWords);
    const learnedSet = new Set(Object.keys(state.mastery));
    const candidates = AWL_WORDS
      .map((w,i)=>({w,i}))
      .filter(x => activeSet.has(x.w.s) && !learnedSet.has(x.w.w) && !todaySet.has(x.i));
    return candidates.slice(0, extraSize).map(x=>x.i);
  },[state.activeSublists, state.mastery, todayWords, extraSize]);
  const formDrillRefs = useMemo(()=>{
    const refs = [...priorityIdxs,...customDueRefs,...todayWords,...extraIdxs];
    return refs.length ? refs : AWL_WORDS.slice(0,40).map((_,i)=>i);
  },[priorityIdxs,customDueRefs,todayWords,extraIdxs]);
  const collocationDrills = useMemo(()=>buildVocabLexisItems(state,"collocations",80),[state.wordCache,state.customVocab,state.vocabLexisLibrary]);
  const idiomDrills = useMemo(()=>buildVocabLexisItems(state,"idioms",80),[state.wordCache,state.customVocab,state.vocabLexisLibrary]);

  // V5: session mode flags
  const isBoostMode = view==="boost"||view==="boost-quiz";
  const isExtraMode = view==="extra"||view==="extra-quiz";
  const isCustomMode = view==="custom"||view==="custom-quiz";
  const studyWordList = isBoostMode ? priorityIdxs : (isCustomMode ? customDueRefs : (isExtraMode ? extraIdxs : todayWords));
  const sessionLabel = isBoostMode ? "Priority Boost" : (isCustomMode ? "Imported Vocab" : (isExtraMode ? "Extra Session" : "Study"));
  const sessionMode = isBoostMode ? "boost" : (isCustomMode ? "custom" : (isExtraMode ? "extra" : "study"));

  const sameWordIndices = (a=[],b=[]) =>
    Array.isArray(a) && Array.isArray(b) && a.length===b.length && a.every((v,i)=>vocabRefKey(v)===vocabRefKey(b[i]));

  const getResumeIndex = (mode, wordIndices) => {
    const saved = state.vocabSession;
    if (!saved || saved.mode!==mode || saved.date!==today || !Array.isArray(wordIndices) || wordIndices.length===0) return 0;
    const idx = Math.max(0,Math.min(wordIndices.length-1,Math.floor(Number(saved.index)||0)));
    if (sameWordIndices(saved.wordIndices,wordIndices)) return idx;
    const savedWord = String(saved.word||"");
    const wordIdx = savedWord ? wordIndices.findIndex(ref=>vocabRefToWord(ref,state)===savedWord) : -1;
    return wordIdx>=0 ? wordIdx : 0;
  };

  const getResumeLabel = (mode, wordIndices, fallback, prefix="Continue") => {
    const idx = getResumeIndex(mode,wordIndices);
    if (idx <= 0) return fallback;
    const word = vocabRefToWord(wordIndices[idx],state) || state.vocabSession?.word || `word ${idx+1}`;
    return `${prefix}: ${word} (${idx+1}/${wordIndices.length})`;
  };

  const persistVocabSession = (mode, index, wordIndices) => {
    if (!Array.isArray(wordIndices) || wordIndices.length===0) return;
    const safeIndex = Math.max(0,Math.min(wordIndices.length-1,Math.floor(Number(index)||0)));
    const safeList = [...wordIndices];
    const word = vocabRefToWord(safeList[safeIndex],state) || "";
    setState(s=>{
      const prev = s.vocabSession || {};
      if (prev.mode===mode && prev.date===today && prev.index===safeIndex && prev.word===word &&
          prev.extraSize===(mode==="extra"?extraSize:null) && sameWordIndices(prev.wordIndices,safeList)) return s;
      return {...s,vocabSession:{mode,date:today,index:safeIndex,word,wordIndices:safeList,extraSize:mode==="extra"?extraSize:null,updatedAt:new Date().toISOString()}};
    });
  };

  const startStudySession = (mode, wordIndices) => {
    const idx = getResumeIndex(mode,wordIndices);
    setStudyIdx(idx);
    setWordData(null);
    setErr(null);
    persistVocabSession(mode,idx,wordIndices);
    setView(mode==="study"?"study":mode);
  };

  const startQuizOnly = (mode) => {
    setStudyIdx(0);
    setView(mode==="study"?"quiz":`${mode}-quiz`);
  };

  // Force a fresh AI-generated card, replacing any template/prebaked data.
  // Used by the ✨ AI Enhance button to upgrade low-quality template cards
  // (generic "approximation" definitions, inflected forms in family, etc.)
  const enhanceWithAI = async (word) => {
    if (!config) { setErr("AI config required for enhancement. Set up in Settings."); return; }
    setLoading(true); setErr(null);
    try {
      const data = await fetchWordData(word, config);
      if (data && typeof data === "object") data._ai_enhanced = true;
      setState(s => ({...s, wordCache: {...s.wordCache, [word]: data}}));
      setWordData(data);
    } catch(e) { setErr(`AI enhance failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const enrichLexisForWord = async (word) => {
    const w = normalizeVocabWord(word);
    if (!w) return;
    if (!config) { setErr("AI config required for lexis enrichment. Set up in Settings."); return; }
    const cached = state.wordCache?.[w];
    const current = wordData?.word===w ? wordData : null;
    const custom = state.customVocab?.[w];
    const prebaked = AWL_DATA_MAP.get(w);
    const base = cached || current || (custom ? awlEntryToWordCardData(custom) : (prebaked ? awlEntryToWordCardData(prebaked) : {word:w,definitions:[]}));
    const meaning = base?.definitions?.[0]?.meaning_en || base?.definitions?.[0]?.meaning || custom?.vi || base?._vi || "";
    setLexisLoading(w); setErr(null);
    try {
      const lexis = await enrichVocabLexis(config, w, meaning);
      const normalized = normalizeWordLexis({
        ...base,
        collocations: lexis?.collocations || [],
        synonyms: lexis?.synonyms || [],
        antonyms: lexis?.antonyms || [],
        idioms: lexis?.idioms || []
      });
      const updated = {
        ...base,
        collocations: lexis?.collocations || normalized.collocations,
        synonyms: lexis?.synonyms || normalized.synonyms,
        antonyms: lexis?.antonyms || normalized.antonyms,
        idioms: lexis?.idioms || normalized.idioms,
        col: normalized.collocations,
        _collocations: normalized.collocations,
        _synonyms: normalized.synonyms,
        _antonyms: normalized.antonyms,
        _idioms: normalized.idioms,
        _ai_lexis: true
      };
      setState(s=>{
        const nextCustom = {...(s.customVocab||{})};
        if (nextCustom[w]) {
          nextCustom[w] = {
            ...nextCustom[w],
            col: normalized.collocations,
            collocations: lexis?.collocations || normalized.collocations,
            synonyms: lexis?.synonyms || normalized.synonyms,
            antonyms: lexis?.antonyms || normalized.antonyms,
            idioms: lexis?.idioms || normalized.idioms
          };
        }
        return {...s, wordCache:{...(s.wordCache||{}), [w]: updated}, customVocab: nextCustom};
      });
      setWordData(updated);
    } catch(e) { setErr(`Lexis enrichment failed: ${e.message}`); }
    finally { setLexisLoading(""); }
  };

  const loadWord = async (word) => {
    if (state.wordCache[word]) { setWordData(state.wordCache[word]); setErr(null); return; }
    // Phase 2: Check pre-baked AWL_DATA first (offline, instant)
    const prebaked = AWL_DATA_MAP.get(word);
    if (prebaked) {
      const data = awlEntryToWordCardData(prebaked);
      setState(s => ({...s, wordCache: {...s.wordCache, [word]: data}}));
      setWordData(data); setErr(null);
      return;
    }
    // F1: Check user-imported custom vocab (also offline)
    const custom = state.customVocab?.[word];
    if (custom) {
      const data = awlEntryToWordCardData(custom);
      setState(s => ({...s, wordCache: {...s.wordCache, [word]: data}}));
      setWordData(data); setErr(null);
      return;
    }
    // Fallback: AI-generated for words outside Sub 1-3
    if (!config) { setErr("Word not in offline pack. Configure AI in Settings to load."); return; }
    setLoading(true); setErr(null); setWordData(null);
    try {
      const data = await fetchWordData(word, config);
      setState(s => ({...s, wordCache: {...s.wordCache, [word]: data}}));
      setWordData(data);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  // Dictionary: select + load a word (reuses the offline→AI lookup chain in loadWord).
  const openDictWord = (w) => {
    const word = String(w||"").toLowerCase().trim().replace(/[^a-z'-]/g,"");
    if (!word) return;
    setDictWord(word);
    setErr(null);
    loadWord(word);
  };

  const recentDays = schedule.slice(0,14);

  const handleStudyDone = () => {
    const nextIdx = studyIdx+1;
    if (nextIdx < studyWordList.length) {
      persistVocabSession(sessionMode,nextIdx,studyWordList);
      setStudyIdx(nextIdx);
      setWordData(null);
      loadWord(vocabRefToWord(studyWordList[nextIdx],state));
    } else {
      // Route to appropriate quiz based on session type
      persistVocabSession(sessionMode,studyIdx,studyWordList);
      setView(isBoostMode?"boost-quiz":(isCustomMode?"custom-quiz":(isExtraMode?"extra-quiz":"quiz")));
    }
  };

  const handleStudyPrev = () => {
    if (studyIdx <= 0) return;
    const prevIdx = studyIdx - 1;
    persistVocabSession(sessionMode,prevIdx,studyWordList);
    setStudyIdx(prevIdx);
    setWordData(null);
    loadWord(vocabRefToWord(studyWordList[prevIdx],state));
  };

  const handleQuizComplete = (results) => {
    setState(s => {
      const newMastery = {...s.mastery};
      // Track per-word; quiz now provides multiple results per word (MC + family forms)
      results.forEach(r=>{
        const k=r.word||r.headword;
        if(!k)return;
        const cur=newMastery[k]??0;
        // Smaller increments since more data points per session now
        newMastery[k]=r.correct?Math.min(5,cur+0.5):Math.max(0,cur-0.5);
      });
      // Round to integers for display
      Object.keys(newMastery).forEach(k=>newMastery[k]=Math.round(newMastery[k]));
      // V5: telemetry — record real progress regardless of session type
      const studiedWords = vocabRefsToWords(studyWordList,state);
      const prevStat = s.dailyStats?.[today] || {target:0, extra:0, words:[]};
      const prevSet = new Set(prevStat.words);
      const newWordsThisSession = studiedWords.filter(w=>!prevSet.has(w));
      // Determine if this session was 'extra' (beyond daily target):
      //   - boost & extra modes → always extra
      //   - regular session after todayDone → extra
      const isExtraSession = isBoostMode || isExtraMode || isCustomMode || s.completedDays[today];
      const newStat = {
        target: isExtraSession ? prevStat.target : (todayWords.length || s.wordsPerDay || 3),
        extra: prevStat.extra + (isExtraSession ? newWordsThisSession.length : 0),
        words: [...prevStat.words, ...newWordsThisSession]
      };
      const newDailyStats = {...(s.dailyStats||{}), [today]: newStat};
      // Mark today complete: regular session completes the day; boost/extra do not flip the flag
      // (they're stretch goals on top of an already-done day, OR a way to push without forcing completion).
      const newCompleted = (isBoostMode||isExtraMode||isCustomMode) ? s.completedDays : {...s.completedDays,[today]:true};
      // Remove priority words that have reached mastery >= 4
      const newPriority = s.priorityWords.filter(w=>(newMastery[w]||0)<4);
      return {...s, mastery:newMastery, completedDays:newCompleted, priorityWords:newPriority, dailyStats:newDailyStats, vocabSession:null};
    });
    setView("done");
  };

  useEffect(()=>{
    if ((view==="study"||view==="boost"||view==="extra"||view==="custom")&&studyWordList[studyIdx]!=null) {
      loadWord(vocabRefToWord(studyWordList[studyIdx],state));
    }
  },[view,studyIdx]);

  const removeImportedLexisItem = (type,index) => {
    setState(s=>{
      const library = s.vocabLexisLibrary || {};
      const items = Array.isArray(library[type]) ? library[type] : [];
      return {
        ...s,
        vocabLexisLibrary:{
          ...library,
          [type]: items.filter((_,i)=>i!==index),
          updatedAt: new Date().toISOString()
        }
      };
    });
  };
  const clearImportedLexisLibrary = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all imported collocations and idioms?")) return;
    setState(s=>({
      ...s,
      vocabLexisLibrary:{...(s.vocabLexisLibrary||{}),collocations:[],idioms:[],updatedAt:new Date().toISOString()}
    }));
  };

  if (view==="study"||view==="boost"||view==="extra"||view==="custom") {
    const word = vocabRefToWord(studyWordList[studyIdx],state);
    return <div className="canvas fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button className="btn bg bsm" onClick={()=>{persistVocabSession(sessionMode,studyIdx,studyWordList);setView("home");}}>← Back</button>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>
          {sessionLabel} · {studyIdx+1}/{studyWordList.length}
        </span>
      </div>
      <PBar value={studyIdx+1} max={studyWordList.length}/>
      <div style={{marginTop:16}}>
        <WordCard wordData={state.wordCache[word]||wordData} isLoading={loading&&!state.wordCache[word]}
          mastery={state.mastery[word]||0} errMsg={err} canRegen={!!config}
          onRegen={()=>{setState(s => { const nc = {...s.wordCache}; delete nc[word]; return {...s, wordCache: nc}; }); loadWord(word);}}
          canAIEnhance={!!config} onAIEnhance={()=>enhanceWithAI(word)}
          canLexisEnhance={!!config} isLexisLoading={lexisLoading===word} onLexisEnhance={()=>enrichLexisForWord(word)}/>
      </div>
      {(wordData||state.wordCache[word])&&!loading&&
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button className="btn bg" style={{flex:1,justifyContent:"center"}} onClick={handleStudyPrev} disabled={studyIdx<=0}>
            ← Previous
          </button>
          <button className="btn bp" style={{flex:2,justifyContent:"center"}} onClick={handleStudyDone}>
            {studyIdx+1<studyWordList.length?"Next Word →":"Go to Quiz →"}
          </button>
        </div>}
    </div>;
  }

  if (view==="quiz"||view==="boost-quiz"||view==="extra-quiz"||view==="custom-quiz") {
    return <div className="canvas fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button className="btn bg bsm" onClick={()=>setView("home")}>← Back</button>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>Quiz · {sessionLabel}</span>
      </div>
      <QuizMode key={quizKey} wordIndices={studyWordList} wordCache={state.wordCache} masteryMap={state.mastery} learnerState={state} config={config}
        onComplete={handleQuizComplete}
        onLoadMissing={async (missing)=>{
          for (const w of missing) { try { await loadWord(w); } catch {} }
          setQuizKey(k=>k+1);
        }}
        onGenMore={async (cachedWords)=>{
          // Refresh wordData via AI for first 5 words → fresh examples & fill-blanks → reshuffled quiz
          if (!config) { alert("Set up AI in Settings to gen fresh items."); return; }
          const slice = cachedWords.slice(0,5);
          for (const w of slice) {
            try {
              const data = await fetchWordData(w, config);
              setState(s=>({...s,wordCache:{...s.wordCache,[w]:data}}));
            } catch (e) { console.error("regen failed for",w,e); }
          }
          setQuizKey(k=>k+1);
        }}/>
    </div>;
  }

  if (view==="dictionary") {
    const q = dictQuery.trim().toLowerCase();
    const customCount = dictIndex.filter(e=>e.src==="custom").length;
    const filtered = dictIndex.filter(e=>{
      if (dictFilter==="awl" && e.src!=="awl") return false;
      if (dictFilter==="custom" && e.src!=="custom") return false;
      return !q || e.w.includes(q);
    });
    const shown = filtered.slice(0,150);
    const exactExists = dictIndex.some(e=>e.w===q);
    const word = dictWord;
    return <div className="canvas fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button className="btn bg bsm" onClick={()=>{setView("home");setDictWord(null);}}>← Back</button>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>{AWL_WORDS.length} AWL · {customCount} imported</span>
      </div>
      <h1 className="title-x">Dictionary</h1>
      <div className="card mb14">
        <form onSubmit={e=>{e.preventDefault(); if(q) openDictWord(q);}}>
          <input value={dictQuery} onChange={e=>setDictQuery(e.target.value)} autoFocus
            placeholder="Search a word… (AWL + your imported vocab · press Enter to look up any word)"
            style={{width:"100%",background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--ink)",padding:"10px 12px",borderRadius:8,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
        </form>
        <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
          {[["all","All"],["awl","AWL"],["custom","Imported"]].map(([k,l])=>
            <button key={k} className={`btn ${dictFilter===k?"bp":"bg"} bsm`} onClick={()=>setDictFilter(k)}>
              {l}{k==="custom"?` (${customCount})`:""}
            </button>)}
          <span style={{marginLeft:"auto",fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>{filtered.length} match{filtered.length===1?"":"es"}</span>
        </div>
      </div>

      <div className="card mb14">
        {shown.length>0 ? <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {shown.map(e=>{
            const on = word===e.w;
            return <button key={e.w+e.src} onClick={()=>openDictWord(e.w)}
              style={{background: on?"var(--leaf)":"var(--surface)", color: on?"var(--bg)":"var(--ink)",
                border:`1px solid ${on?"var(--leaf)":"var(--border)"}`, borderRadius:6,padding:"5px 10px",
                fontSize:12,cursor:"pointer",fontFamily:"'Geist Mono',monospace",fontWeight:on?600:400}}>
              {e.w}<span style={{fontSize:9,marginLeft:5,color:on?"var(--ink)":"var(--ink3)"}}>{e.src==="custom"?"imported":"Sub "+e.s}</span>
            </button>;
          })}
        </div> : <div style={{color:"var(--ink3)",fontSize:13}}>No saved word matches "{dictQuery}".</div>}
        {filtered.length>shown.length && <div style={{fontSize:11,color:"var(--ink3)",marginTop:8}}>Showing first {shown.length} of {filtered.length} — keep typing to narrow.</div>}
        {q && !exactExists && <button className="btn bs bsm" style={{marginTop:10}} onClick={()=>openDictWord(q)}>
          🔎 Look up "{dictQuery.trim()}" with AI
        </button>}
      </div>

      {word && <WordCard wordData={state.wordCache[word]||wordData} isLoading={loading&&!state.wordCache[word]}
        mastery={state.mastery[word]||0} errMsg={err} canRegen={!!config}
        onRegen={()=>{setState(s=>{const nc={...s.wordCache};delete nc[word];return{...s,wordCache:nc};}); loadWord(word);}}
        canAIEnhance={!!config} onAIEnhance={()=>enhanceWithAI(word)}
        canLexisEnhance={!!config} isLexisLoading={lexisLoading===word} onLexisEnhance={()=>enrichLexisForWord(word)}/>}
    </div>;
  }

  if (view==="import") return <ImportVocabView state={state} setState={setState} config={config} onBack={()=>setView("home")}/>;
  if (view==="forms") return <WordFormDrillView state={state} setState={setState} refs={formDrillRefs} onBack={()=>setView("home")}/>;
  if (view==="collocations") return <LexisDrillView state={state} type="collocations" onBack={()=>setView("home")}/>;
  if (view==="idioms") return <LexisDrillView state={state} type="idioms" onBack={()=>setView("home")}/>;

  if (view==="done") return <div className="canvas" style={{textAlign:"center",paddingTop:60}}>
    <div style={{fontSize:52,marginBottom:12}}>✅</div>
    <div style={{fontFamily:"'Fraunces',serif",fontSize:24,color:"var(--ink)",marginBottom:6}}>Session Complete!</div>
    <div style={{color:"var(--ink3)",marginBottom:20}}>
      Streak: {streak+(state.completedDays[today]?0:1)}🔥 · Mastered: {mastered}
      {(state.dailyStats?.[today]?.extra||0)>0 && <span style={{color:"var(--honey)",marginLeft:8}}>· +{state.dailyStats[today].extra} extra today 🚀</span>}
    </div>
    <button className="btn bp" onClick={()=>setView("home")}>Back to Home</button>
  </div>;

  return <div className="canvas fu">
    <div className="kicker">Academic Word List + Imported Vocab</div>
    <h1 className="title-x">Vocab <em>Daily</em></h1>
    <div className="cols-3" style={{marginBottom:14}}>
      {[{v:`${streak}🔥`,l:"Streak"},{v:mastered,l:"Mastered"},{v:learned,l:"Learned"}].map(s=>
        <div key={s.l} className="card" style={{textAlign:"center"}}>
          <div className="sv">{s.v}</div><div className="sl">{s.l}</div>
        </div>)}
    </div>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>Vocab Progress</div>
      <AWLProgressBars progress={awlProgress}/>
    </div>

    <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
      <button className="btn bs bsm" onClick={()=>setView("dictionary")}>📖 Dictionary</button>
      <button className="btn bs bsm" onClick={()=>setView("import")}>+ Import vocab from text</button>
      <button className="btn bs bsm" onClick={()=>setView("forms")}>Word-form drill</button>
      <button className="btn bs bsm" onClick={()=>setView("collocations")}>Learn collocations ({collocationDrills.length})</button>
      <button className="btn bs bsm" onClick={()=>setView("idioms")} disabled={idiomDrills.length===0} title={idiomDrills.length===0?"Enrich or import vocab with idioms first.":""}>Learn idioms ({idiomDrills.length})</button>
      {Object.keys(state.customVocab||{}).length>0&&<span style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>📦 {Object.keys(state.customVocab).length} custom word{Object.keys(state.customVocab).length>1?"s":""}</span>}
    </div>

    <VocabImportedLexisPanel
      library={state.vocabLexisLibrary}
      onRemove={removeImportedLexisItem}
      onClear={clearImportedLexisLibrary}
      onOpen={setView}
    />

    {priorityIdxs.length > 0 && <div className="card mb14" style={{border:"1px solid color-mix(in srgb, var(--leaf) 28%, var(--border))",background:"color-mix(in srgb, var(--leaf) 5%, var(--surface))"}}>
      <div className="card-h"><div className="cdot"/>✦ Priority Boost · {priorityIdxs.length} words from your essays</div>
      <div className="chips mb8">
        {state.priorityWords.slice(0,8).map(w=><span key={w} className="chip cl">{w}<span style={{color:"var(--ink3)",marginLeft:3,fontSize:9}}>M{state.mastery[w]||0}</span></span>)}
        {state.priorityWords.length>8&&<span className="chip" style={{color:"var(--ink3)"}}>+{state.priorityWords.length-8} more</span>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bl bsm" onClick={()=>startStudySession("boost",priorityIdxs)}>{getResumeLabel("boost",priorityIdxs,"Study Boost Words","Continue Boost")}</button>
        <button className="btn bg bsm" onClick={()=>startQuizOnly("boost")}>Quiz Only</button>
        <button className="btn bg bsm" onClick={()=>setState(s=>({...s,priorityWords:[],vocabSession:s.vocabSession?.mode==="boost"?null:s.vocabSession}))}>Clear Queue</button>
      </div>
    </div>}

    {customDueRefs.length > 0 && <div className="card mb14" style={{border:"1px solid color-mix(in srgb, var(--sky) 28%, var(--border))",background:"color-mix(in srgb, var(--sky) 5%, var(--surface))"}}>
      <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Imported Vocab - {customDueRefs.length} due</div>
      <div className="chips mb8">
        {customDueRefs.slice(0,8).map(ref=>{
          const w = vocabRefToWord(ref,state);
          return <span key={vocabRefKey(ref)} className="chip cs">{w}<span style={{color:"var(--ink3)",marginLeft:3,fontSize:9}}>M{state.mastery[w]||0}</span></span>;
        })}
        {customDueRefs.length>8&&<span className="chip" style={{color:"var(--ink3)"}}>+{customDueRefs.length-8} more</span>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bl bsm" onClick={()=>startStudySession("custom",customDueRefs)}>{getResumeLabel("custom",customDueRefs,"Study Imported Vocab","Continue Imported")}</button>
        <button className="btn bg bsm" onClick={()=>startQuizOnly("custom")}>Quiz Only</button>
      </div>
    </div>}

    <div className="card mb14">
      <div style={{color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>
        Today · {today}
        {todayLearnedCount>0 && <span style={{color:"var(--leaf)",marginLeft:8,textTransform:"none",letterSpacing:0}}>
          · {todayLearnedCount} learned{(state.dailyStats?.[today]?.extra||0)>0?` (+${state.dailyStats[today].extra} extra)`:""}
        </span>}
      </div>
      {todayDone
        ? <div>
            <div style={{padding:"10px 0",color:"var(--leaf)",fontSize:14,fontWeight:500,textAlign:"center",marginBottom:8}}>Daily target done ✓</div>
            {/* V5: continue past limit */}
            {extraIdxs.length > 0 ? <div style={{padding:"10px 12px",background:"var(--surface2)",borderRadius:8,border:"1px dashed var(--border2)"}}>
              <div style={{fontSize:12,color:"var(--ink2)",marginBottom:7,lineHeight:1.5}}>
                Want to push further? Pick how many <strong style={{color:"var(--honey)"}}>extra words</strong> to learn today:
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:9}}>
                {[3,5,10,15].map(n=>
                  <button key={n} className={`btn ${extraSize===n?"bp":"bg"} bsm`} onClick={()=>setExtraSize(n)}>{n}</button>
                )}
                <span style={{fontSize:10,color:"var(--ink3)",alignSelf:"center",fontFamily:"'Geist Mono',monospace"}}>
                  ({extraIdxs.length} available)
                </span>
              </div>
              <div className="chips mb8">
                {extraIdxs.slice(0,8).map(ref=><span key={vocabRefKey(ref)} className="chip">{vocabRefToWord(ref,state)}</span>)}
                {extraIdxs.length>8&&<span className="chip" style={{color:"var(--ink3)"}}>+{extraIdxs.length-8}</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn bp bsm" onClick={()=>startStudySession("extra",extraIdxs)}>{getResumeLabel("extra",extraIdxs,`Study ${extraIdxs.length} extra →`,"Continue extra")}</button>
                <button className="btn bg bsm" onClick={()=>startQuizOnly("extra")}>Quiz Only</button>
              </div>
            </div> : <div style={{textAlign:"center",color:"var(--ink3)",fontSize:12,padding:"6px 0"}}>All eligible new words learned 🎓 — come back tomorrow or review!</div>}
          </div>
        : todayEntry
          ? <div>
              <div style={{color:"var(--ink)",fontSize:14,fontWeight:500,marginBottom:4}}>
                {todayEntry.type==="review7"?"📚 Weekly Review":todayEntry.type==="review3"?"🔄 3-Day Review":`📖 ${todayEntry.wordIndices?.length||state.wordsPerDay||3} New Words`}
              </div>
              <div className="chips mb8">
                {todayWords.map(ref=>{
                  const w = vocabRefToWord(ref,state);
                  return <span key={vocabRefKey(ref)} className={`chip ${state.wordCache[w]?"cl":""}`}>{w}</span>;
                })}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn bp bsm" onClick={()=>startStudySession("study",todayWords)}>{getResumeLabel("study",todayWords,"Study Words")}</button>
                <button className="btn bg bsm" onClick={()=>startQuizOnly("study")}>Quiz Only</button>
              </div>
            </div>
          : <div style={{color:"var(--ink3)"}}>All scheduled AWL words completed! 🎓</div>}
    </div>

    <div className="card">
      <div className="card-h"><div className="cdot"/>Upcoming Schedule</div>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        {recentDays.map(d=>{
          const isT=d.date===today,isP=d.date<today,done=state.completedDays[d.date];
          const tc=d.type==="review7"?"var(--honey)":d.type==="review3"?"var(--sky)":"var(--leaf)";
          const tl=d.type==="review7"?"Weekly Review":d.type==="review3"?"3-Day Review":`${d.wordIndices?.length||state.wordsPerDay||3} new`;
          // V5: surface extra-learning days
          const dayStat = state.dailyStats?.[d.date];
          const hasExtra = (dayStat?.extra||0) > 0;
          return <div key={d.date} style={{display:"flex",alignItems:"center",gap:9,padding:"5px 8px",borderRadius:7,background:isT?"color-mix(in srgb, var(--leaf) 8%, var(--surface))":"transparent",border:isT?"1px solid color-mix(in srgb, var(--leaf) 20%, var(--border))":"1px solid transparent",opacity:isP&&!done?.4:1}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:tc,flexShrink:0}}/>
            <div style={{flex:1,fontSize:11,color:isT?"var(--ink)":"var(--ink3)"}}>{d.date.slice(5)}{isT&&<span style={{color:"var(--leaf)",fontWeight:700}}> · Today</span>}</div>
            <div style={{fontSize:10,color:tc}}>{tl}</div>
            {hasExtra&&<span style={{color:"var(--honey)",fontSize:9,fontFamily:"'Geist Mono',monospace"}} title={`${dayStat.words.length} total · ${dayStat.extra} extra`}>+{dayStat.extra}🚀</span>}
            {done&&<span style={{color:"var(--leaf)",fontSize:12}}>✓</span>}
            {isP&&!done&&<span style={{color:"var(--rose)",fontSize:9}}>missed</span>}
          </div>;
        })}
      </div>
    </div>
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: THEORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
