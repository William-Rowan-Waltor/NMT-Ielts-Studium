// Create the IN-PROJECT MarkItDown virtual environment used by serve.mjs's
// /api/markitdown endpoint (document → markdown for Reading/Writing/Listening imports).
//
// Run from the project folder:  node scripts/setup-markitdown.mjs
//
// Creates <project>/markitdown-venv and installs markitdown[all] into it. Keeping the venv
// inside the project means it travels with the folder. NOTE: a Python virtualenv stores
// absolute paths internally, so if you MOVE the project you must re-run this script to
// rebuild the venv (don't copy markitdown-venv by hand).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const venvDir = path.join(root, 'markitdown-venv');
const isWin = process.platform === 'win32';
const venvPy = path.join(venvDir, isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, shell: false });
  return r.status === 0;
}

function hasUv() {
  const r = spawnSync('uv', ['--version'], { stdio: 'ignore', shell: false });
  return r.status === 0;
}

if (fs.existsSync(venvPy)) {
  console.log(`markitdown-venv already exists at ${venvDir}`);
} else if (hasUv()) {
  // uv picks an available Python; pass --python only if you need a specific one.
  if (!run('uv', ['venv', venvDir])) {
    console.error('uv venv failed. If uv cannot find a Python, install one or pass --python <path>.');
    process.exit(1);
  }
} else {
  // Fallback: stdlib venv from whatever `python` is on PATH.
  if (!run(isWin ? 'python' : 'python3', ['-m', 'venv', venvDir])) {
    console.error('Could not create the venv. Install uv (https://docs.astral.sh/uv) or Python 3.11+ and retry.');
    process.exit(1);
  }
}

console.log('\nInstalling markitdown[all] (this downloads a few hundred MB the first time)...');
const ok = hasUv()
  ? run('uv', ['pip', 'install', '--python', venvPy, 'markitdown[all]'])
  : run(venvPy, ['-m', 'pip', 'install', 'markitdown[all]']);

if (!ok) { console.error('\nmarkitdown install failed.'); process.exit(1); }
console.log(`\n✅ Done. serve.mjs will use ${venvPy} for /api/markitdown.`);
