import fs from 'node:fs';
import path from 'node:path';

const defaultEdgeLevelDb = path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/User Data/Default/Local Storage/leveldb');
const leveldbDir = process.argv[2] || defaultEdgeLevelDb;
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/, '$1')), '..');
const outFile = path.join(projectRoot, 'data', 'app-state.json');
const wanted = new Set(['ielts_writing_lab_v1', 'ielts_lab_configs', 'ielts_lab_active']);

function readVarint(b, p) { let x=0, s=0, i=p; while (i<b.length) { const c=b[i++]; x |= (c & 0x7f) << s; if (!(c & 0x80)) return [x, i]; s += 7; } throw new Error('bad varint'); }
function readHandle(b, p) { let offset, size; [offset,p]=readVarint(b,p); [size,p]=readVarint(b,p); return [{offset,size},p]; }
function snappy(raw) { let p=0, outLen; [outLen,p]=readVarint(raw,p); const out=Buffer.alloc(outLen); let o=0; while(p<raw.length){ const tag=raw[p++], type=tag&3; if(type===0){ let len=tag>>2; if(len<60) len+=1; else { const bytes=len-59; len=0; for(let i=0;i<bytes;i++) len|=raw[p++]<<(8*i); len+=1; } raw.copy(out,o,p,p+len); p+=len; o+=len; } else { let len, off; if(type===1){ len=((tag>>2)&7)+4; off=((tag&0xe0)<<3)|raw[p++]; } else if(type===2){ len=(tag>>2)+1; off=raw[p]|(raw[p+1]<<8); p+=2; } else { len=(tag>>2)+1; off=raw[p]|(raw[p+1]<<8)|(raw[p+2]<<16)|(raw[p+3]<<24); p+=4; } for(let i=0;i<len;i++) out[o+i]=out[o-off+i]; o+=len; } } return out; }
function readBlock(fileBuf, h) { const raw=fileBuf.slice(h.offset, h.offset+h.size); const type=fileBuf[h.offset+h.size]; if(type===0) return raw; if(type===1) return snappy(raw); throw new Error('unsupported compression '+type); }
function* blockEntries(block) { const n=block.readUInt32LE(block.length-4); const limit=block.length-4*(n+1); let p=0, prev=Buffer.alloc(0); while(p<limit){ let shared, non, vlen; [shared,p]=readVarint(block,p); [non,p]=readVarint(block,p); [vlen,p]=readVarint(block,p); const key=Buffer.concat([prev.slice(0,shared), block.slice(p,p+non)]); p+=non; const value=block.slice(p,p+vlen); p+=vlen; prev=key; yield {key,value}; } }
function decodeValue(value) { if (!value.length) return ''; if (value[0] === 0) return value.slice(1).toString('utf16le'); if (value[0] === 1) return value.slice(1).toString('utf8'); return value.toString('utf8'); }
function seqFromInternalKey(key) { if (key.length < 8) return 0n; return key.readBigUInt64LE(key.length-8) >> 8n; }
function storageName(userKey) { const marker = Buffer.from('\x00\x01'); const idx = userKey.lastIndexOf(marker); if (idx < 0) return null; return userKey.slice(idx + marker.length).toString('utf8'); }

const records = new Map();
for (const file of fs.readdirSync(leveldbDir)) {
  if (!/\.(ldb|log)$/i.test(file)) continue;
  const full = path.join(leveldbDir, file);
  const fileBuf = fs.readFileSync(full);
  if (file.endsWith('.log')) continue;
  try {
    const footer = fileBuf.slice(fileBuf.length - 48);
    let p = 0, meta, index;
    [meta,p] = readHandle(footer,p);
    [index,p] = readHandle(footer,p);
    const indexBlock = readBlock(fileBuf, index);
    for (const ie of blockEntries(indexBlock)) {
      let h; [h] = readHandle(ie.value, 0);
      const dataBlock = readBlock(fileBuf, h);
      for (const e of blockEntries(dataBlock)) {
        const userKey = e.key.slice(0, -8);
        const name = storageName(userKey);
        if (!wanted.has(name)) continue;
        const seq = seqFromInternalKey(e.key);
        const old = records.get(name);
        if (!old || seq > old.seq) records.set(name, {seq, value: decodeValue(e.value)});
      }
    }
  } catch {
    // Ignore unrelated/corrupt/locked table files.
  }
}

for (const key of wanted) {
  if (!records.has(key)) throw new Error(`Missing ${key} in ${leveldbDir}`);
}

const state = JSON.parse(records.get('ielts_writing_lab_v1').value);
const configs = JSON.parse(records.get('ielts_lab_configs').value);
const activeId = records.get('ielts_lab_active').value;
const bundle = {
  version: 1,
  app: 'ielts-writing-lab',
  updatedAt: new Date().toISOString(),
  migratedFrom: 'Microsoft Edge localStorage LevelDB',
  keys: { state: 'ielts_writing_lab_v1', configs: 'ielts_lab_configs', activeId: 'ielts_lab_active' },
  state,
  configs,
  activeId
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(bundle, null, 2), 'utf8');
console.log(JSON.stringify({
  wrote: outFile,
  essays: Array.isArray(state.essays) ? state.essays.length : 0,
  masteredWords: state.mastery ? Object.keys(state.mastery).length : 0,
  configs: configs.length,
  activeId,
  containsApiKeys: configs.some(c => !!c.key)
}, null, 2));
