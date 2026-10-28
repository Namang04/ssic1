// Sign-in cost (2026-10-28). Reads were ~815k/day against a 50k free allowance because signing in downloaded
// whole collections that only one screen looks at. Those now load when their tab is opened — which introduces
// one new way to break things: hand the data to a screen on a tab the gate does not list, and it reads EMPTY
// with no error. This test walks App's own render lines and fails if that ever happens.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appStart = src.search(/^function App\(/m);
let d = 0, j = src.indexOf('{', appStart), appEnd;
for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) { appEnd = j; break; } } }
const app = src.slice(appStart, appEnd);

let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };

// Each tab-gated collection: the gate's tab list, and every tab it is actually handed out on.
const gated = {};
for (const m of app.matchAll(/const (\w+)=useFirestore\("(\w+)",\s*([^\n]*?_onTab\(([^)]*)\)[^\n]*?)\);/g)) {
  gated[m[1]] = { coll: m[2], gate: m[3], tabs: new Set([...m[4].matchAll(/"([a-z]+)"/g)].map(x => x[1])) };
}
ok('the tab-gated collections are still gated', Object.keys(gated).length === 4);
ok('they are the four meant to be',
   ['topicsDB', 'syllabusDB', 'copyChecksDB', 'wrongDB'].every(v => gated[v]));

for (const [v, g] of Object.entries(gated)) {
  const used = new Set();
  // A render line looks like:  {tab==="copies"&&<Something copyChecksDB={copyChecksDB} .../>}
  for (const line of app.split('\n')) {
    if (!line.includes(`${v}={${v}}`)) continue;
    for (const t of line.matchAll(/tab===\s*"([a-z]+)"/g)) used.add(t[1]);
  }
  const missing = [...used].filter(t => !g.tabs.has(t));
  ok(`${g.coll} is subscribed on every tab it is handed to${missing.length ? ' — missing: ' + missing.join(', ') : ''}`,
     missing.length === 0);
  ok(`${g.coll} is not left loading at sign-in`, !g.tabs.has('dashboard'));
}

// The student portal is returned before the tabbed shell, so a bare tab gate would empty it.
ok('the student portal keeps its practice history',
   /user\.role==="student"\|\|_onTab\(/.test(gated.wrongDB.gate));
ok('and parents never read it',  /user\.role!=="parent"/.test(gated.wrongDB.gate));
// The three curriculum collections stay off limits to office, parents and students.
ok('curriculum data stays with staff who teach',
   ['topicsDB', 'syllabusDB', 'copyChecksDB'].every(v => /_curric/.test(gated[v].gate)));
ok('and _curric means admin, VP and teacher only',
   /const _curric=!!user&&\["admin","vp","teacher"\]\.includes\(user\.role\)/.test(app));
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
