// The hooks/TDZ/duplicate checker's own behaviour, verified on fixtures before it is trusted on 27k lines.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const SCRIPT = new URL('../check-hooks.mjs', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'hk-'));
const run = (file, ...args) => { try { execFileSync('node', [SCRIPT, file, ...args], { stdio: 'pipe' }); return 0; } catch (e) { return e.status; } };
const out = (file, ...args) => { try { return execFileSync('node', [SCRIPT, file, ...args], { stdio: 'pipe' }).toString(); } catch (e) { return e.stdout.toString() + e.stderr.toString(); } };
const B = (js) => `<html><script type="text/babel">${js}</script></html>`;
const w = (n, body) => { const p = join(dir, n); writeFileSync(p, body); return p; };
let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };

ok('hook before a guard is clean (exit 0)',          run(w('a.html', B('function C(){const [a]=useState(0); if(!a) return null; return a;}'))) === 0);
ok('custom hook is clean',                            run(w('b.html', B('function useMine(){const [a]=useState(0); return a;}'))) === 0);
ok('hook inside if is caught',                        out(w('c.html', B('function C({x}){ if(x){ const [a]=useState(0);} return null;}'))).includes('IfStatement'));
ok('hook inside a callback is caught',                out(w('d.html', B('function C(){ const f=()=>useState(0); return f;}'))).includes('non-component'));
ok('hook after early return is reported',             out(w('e.html', B('function C({x}){ if(!x) return null; const [a]=useState(0); return a;}'))).includes('after early return'));
ok('...and fails in --strict mode',                   run(w('e.html', B('function C({x}){ if(!x) return null; const [a]=useState(0); return a;}')), '--strict') === 1);
ok('conditional hook fails even without --strict',    run(w('c.html', B('function C({x}){ if(x){ const [a]=useState(0);} return null;}'))) === 1);
ok('TDZ read is caught and fails',                    run(w('f.html', B('function g(){ const y = x + 1; const x = 2; return y; }'))) === 1);
ok('duplicate top-level function fails',              run(w('g.html', B('function h(){}') + B('function h(){}'))) === 1);
ok('nested-function read is NOT a TDZ false alarm',   run(w('h.html', B('function g(){ const f=()=>x; const x=2; return f(); }'))) === 0);
ok('no babel blocks exits 2',                         run(w('i.html', '<html></html>')) === 2);
ok('missing file exits 2',                            run(join(dir, 'nope.html')) === 2);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
