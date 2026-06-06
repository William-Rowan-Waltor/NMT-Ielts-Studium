import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'D:/Downloads/ielts-writing-lab-v7.html';
const html = fs.readFileSync(sourcePath, 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) throw new Error(`Missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Missing end marker: ${end}`);
  return text.slice(a + start.length, b).trim();
}

function splitByMarkers(js, parts) {
  const indices = parts.map((part) => {
    const idx = js.indexOf(part.marker);
    if (idx < 0) throw new Error(`Missing JS split marker: ${part.marker}`);
    return { ...part, idx };
  }).sort((a, b) => a.idx - b.idx);
  return indices.map((part, i) => ({
    name: part.name,
    content: js.slice(part.idx, i + 1 < indices.length ? indices[i + 1].idx : js.length).trim() + '\n',
  }));
}

function write(file, content) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

const css = between(html, '<style>', '</style>') + '\n';
const js = between(html, '<script type="text/babel">', '</script>') + '\n';
fs.rmSync(path.join(root, 'src'), { recursive: true, force: true });
write('styles.css', css);

const parts = splitByMarkers(js, [
  { name: '00-data.jsx', marker: 'const {useState,useEffect,useCallback,useMemo,useRef} = React;' },
  { name: '01-awl-card-data.jsx', marker: '// === Phase 2+3: Pre-baked AWL_DATA' },
  { name: '02-api.jsx', marker: '// API LAYER' },
  { name: '03-vocab-utils.jsx', marker: '// EN_GLOSS:' },
  { name: '04-state.jsx', marker: 'const SK = "ielts_writing_lab_v1";' },
  { name: '05-common-components.jsx', marker: 'function PBar' },
  { name: '06-dashboard.jsx', marker: 'function DashboardPage' },
  { name: '07-vocab.jsx', marker: 'function ImportVocabView' },
  { name: '08-theory.jsx', marker: 'function TheoryPage' },
  { name: '09-practice-helpers.jsx', marker: 'function PracticeChartCanvas' },
  { name: '10-practice.jsx', marker: 'function PracticePage' },
  { name: '11-settings.jsx', marker: 'function SettingsPage' },
  { name: '12-app.jsx', marker: 'const NAV_ITEMS = [' },
]);
for (const part of parts) write(path.join('src', part.name), part.content);

const storageHelpers = `

const STORAGE_FILE_LABEL = "data/app-state.json";
const SERVER_STORAGE_ENDPOINT = "/api/storage";

function canUseFolderStorage() {
  try {
    return location.protocol.startsWith("http") && ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  } catch { return false; }
}

function makeStorageBundle(state=loadState(), configs=loadConfigs(), activeId=loadActiveId()) {
  return {
    version: 1,
    app: "ielts-writing-lab",
    updatedAt: new Date().toISOString(),
    keys: { state: SK, configs: CK, activeId: AK },
    state,
    configs,
    activeId
  };
}

function applyStorageBundle(bundle) {
  if (!bundle || typeof bundle !== "object") return null;
  const nextState = bundle.state && typeof bundle.state === "object" ? bundle.state : defaultState();
  const nextConfigs = Array.isArray(bundle.configs) ? bundle.configs : [];
  const nextActiveId = bundle.activeId || null;
  saveState(nextState);
  saveConfigs(nextConfigs);
  saveActiveId(nextActiveId);
  return { state: loadState(), configs: loadConfigs(), activeId: loadActiveId() };
}

async function loadFolderStorage() {
  if (!canUseFolderStorage()) return null;
  const res = await fetch(SERVER_STORAGE_ENDPOINT, { cache: "no-store" });
  if (!res.ok) throw new Error(\`Folder storage load failed (\${res.status})\`);
  const data = await res.json();
  return data?.exists === false ? null : data;
}

async function saveFolderStorage(bundle) {
  if (!canUseFolderStorage()) return null;
  const res = await fetch(SERVER_STORAGE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle)
  });
  if (!res.ok) throw new Error(\`Folder storage save failed (\${res.status})\`);
  return res.json();
}
`;
let stateFile = fs.readFileSync(path.join(root, 'src/04-state.jsx'), 'utf8');
stateFile = stateFile.replace('function saveActiveId(id) { try { if (id) localStorage.setItem(AK,id); else localStorage.removeItem(AK); } catch {} }', 'function saveActiveId(id) { try { if (id) localStorage.setItem(AK,id); else localStorage.removeItem(AK); } catch {} }' + storageHelpers);
write('src/04-state.jsx', stateFile);

const settingsHelpers = `

  const exportAllData = () => {
    const bundle = makeStorageBundle(state, configs, activeId);
    const blob = new Blob([JSON.stringify(bundle,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = \`ielts-writing-lab-backup-\${TODAY()}.json\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importAllData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const applied = applyStorageBundle(JSON.parse(String(reader.result||"{}")));
        if (!applied) throw new Error("Bad backup file");
        setState(applied.state);
        setConfigs(applied.configs);
        setActiveId(applied.activeId);
        alert("Imported app data. If you are running via node scripts\\\\serve.mjs, it will sync into data/app-state.json automatically.");
      } catch(err) {
        alert("Import failed: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };
`;
let settings = fs.readFileSync(path.join(root, 'src/11-settings.jsx'), 'utf8');
settings = settings.replace('  const resetVocab = () => { if (window.confirm("Reset all vocab progress? This cannot be undone.")) setState({...state,mastery:{},completedDays:{},wordCache:{},priorityWords:[],startDate:TODAY(),dailyStats:{}}); };', '  const resetVocab = () => { if (window.confirm("Reset all vocab progress? This cannot be undone.")) setState({...state,mastery:{},completedDays:{},wordCache:{},priorityWords:[],startDate:TODAY(),dailyStats:{}}); };' + settingsHelpers);
settings = settings.replace('        <button className="btn bg bsm" onClick={resetVocab}>Reset Vocab Progress</button>', '        <button className="btn bs bsm" onClick={exportAllData}>Export All Data JSON</button>\n        <label className="btn bg bsm" style={{cursor:"pointer"}}>Import Data JSON<input type="file" accept="application/json,.json" onChange={importAllData} style={{display:"none"}}/></label>\n        <button className="btn bg bsm" onClick={resetVocab}>Reset Vocab Progress</button>');
settings = settings.replace('        All data stored locally in your browser (localStorage). <strong style={{color:"var(--honey)"}}>⚠ API keys are saved as plaintext</strong> — any browser extension or XSS exploit could read them.', '        When opened through <strong style={{color:"var(--leaf)"}}>node scripts\\serve.mjs</strong>, data also syncs to <strong style={{color:"var(--ink2)"}}>data/app-state.json</strong> in this folder. Double-click mode still uses browser localStorage only.<br/>\n        All data stored locally in your browser (localStorage). <strong style={{color:"var(--honey)"}}>⚠ API keys are saved as plaintext</strong> — any browser extension or XSS exploit could read them.');
write('src/11-settings.jsx', settings);

const appStorage = `
  const [folderStorage,setFolderStorage] = useState(()=>{
    const enabled = canUseFolderStorage();
    return {enabled,ready:!enabled,status:enabled?\`Syncing \${STORAGE_FILE_LABEL}...\`:"Browser localStorage",path:STORAGE_FILE_LABEL};
  });
  const folderStorageLoadedRef = useRef(!canUseFolderStorage());

  useEffect(()=>{
    if (!canUseFolderStorage()) return;
    let cancelled = false;
    (async()=>{
      try {
        const bundle = await loadFolderStorage();
        if (cancelled) return;
        if (bundle) {
          const applied = applyStorageBundle(bundle);
          if (applied) {
            setStateRaw(applied.state);
            setConfigsRaw(applied.configs);
            setActiveIdRaw(applied.activeId);
          }
          setFolderStorage({enabled:true,ready:true,status:\`Loaded \${STORAGE_FILE_LABEL}\`,path:STORAGE_FILE_LABEL});
        } else {
          await saveFolderStorage(makeStorageBundle(state,configs,activeId));
          if (!cancelled) setFolderStorage({enabled:true,ready:true,status:\`Created \${STORAGE_FILE_LABEL}\`,path:STORAGE_FILE_LABEL});
        }
      } catch(e) {
        if (!cancelled) setFolderStorage({enabled:true,ready:false,status:\`Folder sync error: \${e.message}\`,path:STORAGE_FILE_LABEL});
      } finally {
        folderStorageLoadedRef.current = true;
      }
    })();
    return ()=>{ cancelled = true; };
  },[]);

  useEffect(()=>{
    if (!canUseFolderStorage() || !folderStorageLoadedRef.current) return;
    const id = setTimeout(()=>{
      saveFolderStorage(makeStorageBundle(state,configs,activeId))
        .then(()=>setFolderStorage(s=>({...s,enabled:true,ready:true,status:\`Saved \${STORAGE_FILE_LABEL} \${new Date().toLocaleTimeString()}\`})))
        .catch(e=>setFolderStorage(s=>({...s,enabled:true,ready:false,status:\`Folder sync error: \${e.message}\`})));
    },400);
    return ()=>clearTimeout(id);
  },[state,configs,activeId]);
`;
let app = fs.readFileSync(path.join(root, 'src/12-app.jsx'), 'utf8');
app = app.replace('  const config = useMemo(()=>configs.find(c=>c.id===activeId)||null,[configs,activeId]);', '  const config = useMemo(()=>configs.find(c=>c.id===activeId)||null,[configs,activeId]);\n' + appStorage);
app = app.replace('        <span style={{color:"var(--ink2)"}}>Band</span> target {state.targetBand||7.0}<br/>\n        <span style={{color:"var(--ink2)"}}>Archive</span>', '        <span style={{color:"var(--ink2)"}}>Band</span> target {state.targetBand||7.0}<br/>\n        <span style={{color:"var(--ink2)"}}>Storage</span> {folderStorage.enabled?(folderStorage.ready?"folder":"syncing"):"browser"}<br/>\n        <span style={{color:"var(--ink2)"}}>Archive</span>');
write('src/12-app.jsx', app);

execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
console.log('Regenerated source from original and reapplied folder storage changes.');
