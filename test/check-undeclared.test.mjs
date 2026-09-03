// The checker's own exit codes, verified. It already shipped once printing failures while exiting 0,
// which made `npm run check` read as a pass. Trusting it again without testing it would repeat that.
import { execFileSync, execFileSync as _ } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('../check-undeclared.mjs', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'chk-'));
const run = (file) => {
  try { execFileSync('node', [SCRIPT, file], { stdio: 'pipe' }); return 0; }
  catch (e) { return e.status; }
};
const write = (name, body) => { const p = join(dir, name); writeFileSync(p, body); return p; };

const B = (js) => `<html><script type="text/babel">${js}</script></html>`;
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };

ok('clean file exits 0',            run(write('clean.html',  B('function f(){var a=1;return a;}'))) === 0);
ok('undeclared identifier exits 1', run(write('bad.html',    B('function f(){return notDeclaredAnywhere;}'))) === 1);
ok('no babel blocks exits 2',       run(write('empty.html',  '<html><body>nothing</body></html>')) === 2);
ok('missing file exits 2',          run(join(dir, 'does-not-exist.html')) === 2);
ok('destructured hooks are not flagged',
   run(write('hooks.html', B('const {useState}=React; function C(){return useState(0);}'))) === 0);
ok('window.X publication is not flagged',
   run(write('win.html',   B('window.__thing=1; function C(){return __thing;}'))) === 0);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
