// Precompile the in-browser Babel out of index.html.
// Reads the SOURCE index.html (with <script type="text/babel"> blocks that the browser compiles
// on every load), transforms each block to plain JS at BUILD time, drops the babel-standalone CDN,
// and writes a ready-to-deploy build/index.html that loads with NO in-browser compile.
//
//   Usage:  cd ~/Desktop && node build-precompile.mjs
//   Deploy: upload build/index.html + build/ssic-content.js + build/sw.js
//
// The SOURCE index.html is never modified — keep editing it as usual, then re-run this before uploading.

import Babel from '@babel/standalone';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';

const SRC = './index.html';
const OUTDIR = './build';
const t0 = Date.now();

let html = readFileSync(SRC, 'utf8');
const srcSize = html.length;

// 1) Drop the babel-standalone CDN <script> — not needed once blocks are precompiled.
const before = html.length;
html = html.replace(/[ \t]*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/babel-standalone\/[^"]*"><\/script>\n?/g, '');
if (html.length === before) console.warn('WARN: babel-standalone CDN <script> not found (already removed?).');

// 2) Transform every <script type="text/babel">…</script> to a plain classic <script>.
//    presets:['react'] = JSX → React.createElement, modern JS left as-is (browsers run it natively).
//    sourceType:'script' keeps the shared cross-block global scope the app relies on.
let n = 0; const errors = [];
html = html.replace(/<script type="text\/babel">([\s\S]*?)<\/script>/g, (m, code) => {
  n++;
  try {
    const out = Babel.transform(code, {
      presets: ['react'],
      sourceType: 'script',
      compact: false,
      comments: false,
    }).code;
    return '<script>\n' + out + '\n</script>';
  } catch (e) {
    errors.push('block ' + n + ': ' + (e && e.message));
    return m;
  }
});
if (errors.length) { console.error('TRANSFORM ERRORS — aborting:\n' + errors.join('\n')); process.exit(1); }
if (n === 0) { console.error('No <script type="text/babel"> blocks found — is this the source index.html?'); process.exit(1); }

// safety: no untransformed JSX-mode blocks should remain
if (/type="text\/babel"/.test(html)) { console.error('A text/babel block survived — aborting.'); process.exit(1); }

// 3) Write build/ and copy the two sibling deploy files.
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR);
writeFileSync(OUTDIR + '/index.html', html);
let copied = [];
for (const f of ['ssic-content.js', 'sw.js']) {
  if (existsSync('./' + f)) { copyFileSync('./' + f, OUTDIR + '/' + f); copied.push(f); }
}

const mb = (x) => (x / 1e6).toFixed(2) + ' MB';
console.log(`✓ Precompiled ${n} Babel blocks in ${Date.now() - t0}ms`);
console.log(`  source index.html : ${mb(srcSize)}`);
console.log(`  build/index.html  : ${mb(html.length)}  (no in-browser Babel — compiles nothing on load)`);
console.log(`  copied alongside  : ${copied.join(', ') || '(none — put ssic-content.js & sw.js next to this script)'}`);
console.log(`\nDeploy the 3 files in ./build/ .  Edit ./index.html as usual, then re-run: node build-precompile.mjs`);
