// Copies the compiled page and points its Firebase imports at the fake. Run after `node build-precompile.mjs`:
//   node tools/rehearsal/build.mjs <out-dir>     then serve <out-dir> and open index.html?reset=1
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path'; import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..'), out = process.argv[2];
if (!out) { console.error('usage: node tools/rehearsal/build.mjs <out-dir>'); process.exit(2); }
mkdirSync(out, { recursive: true });
let html = readFileSync(join(root, 'build', 'index.html'), 'utf8'), n = 0;
html = html.replace(/"https:\/\/www\.gstatic\.com\/firebasejs\/[^"]+\/firebase-(?:app|firestore|auth|functions)\.js"/g, () => { n++; return '"./fake-firebase.js"'; });
if (n !== 4) { console.error('expected 4 Firebase imports, found ' + n); process.exit(1); }
html = html.replace(/navigator\.serviceWorker\.register\('sw\.js'\)/, 'Promise.resolve()');
html = html.replace('<script type="module">', '<script src="seed.js"></script>\n<script type="module">');
writeFileSync(join(out, 'index.html'), html);
['fake-firebase.js', 'seed.js'].forEach(f => copyFileSync(join(here, f), join(out, f)));
console.log('rehearsal page written to ' + out);
