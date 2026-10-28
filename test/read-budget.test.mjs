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

// ── windowed subscriptions ──
// A dated window costs a read per document, so the window IS the bill. Its trap: any document without that
// date field — "__config", carrying the late cutoff and the no-clock list — falls outside the query and
// vanishes with no error, which would quietly turn every exempt teacher absent.
const hook = (() => { const i = src.search(/^function useFirestore\(/m);
  let d = 0, j = src.indexOf('{', src.indexOf(')', i)); const st = j;
  for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } }
  return src.slice(st, j + 1); })();
ok('a window can be asked for',            /const since=opts&&opts\.since/.test(hook));
ok('and it is a where() on the query',     /__fbWhere\(field,">=",since\)/.test(hook));
ok('no window means the whole collection', /:ref;/.test(hook) && /src=\(since&&/.test(hook));
ok('undated documents are named and kept', /keep=\(opts&&opts\.keep\)\|\|null/.test(hook));
ok('they are read as single documents',    /__fbGetDoc\(window\.__fbDoc\(window\.__db,collName,id\)\)/.test(hook));
ok('and merged under every snapshot',      /setData\(Object\.assign\(\{\},keepRef\.current,d\)\)/.test(hook));
ok('a campus switch drops the old config', /keepRef\.current=\{\};setData\(\{\}\);setup\(\)/.test(hook));
ok('the window is part of the dependencies', /\[collName,enabled,since,field,keepKey\]/.test(hook));

const staffSub = app.match(/const staffAttDB=useFirestore\("staffAttendance",[^\n]*\);/);
ok('staff attendance is windowed at App level', !!staffSub && /since:_staffWin/.test(staffSub[0]));
ok('and keeps its config document',             !!staffSub && /keep:\["__config"\]/.test(staffSub[0]));
// The two screens that look further back must NOT share the windowed subscription.
ok('the salary run loads its own',   /<SalaryPanel user=\{user\} sharedAttDB=\{null\}/.test(app));
ok('the staff register loads its own', /<StaffAttendanceRegister[^\n]*sharedAttDB=\{null\}/.test(app));
ok('and both still fall back to subscribing', (src.match(/const ownAttDB=useFirestore\("staffAttendance",!sharedAttDB\);/g) || []).length === 2);

// __monthsBack: the window's start date.
const mb = (() => { const i = src.search(/^function __monthsBack\(/m);
  let d = 0, j = src.indexOf('{', src.indexOf(')', i));
  for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } }
  return src.slice(i, j + 1); })();
globalThis._attTodayStr = () => "2026-01-07";          // January, to catch the year rolling back
(0, eval)(mb.replace(/^function __monthsBack/, 'globalThis.__monthsBack = function __monthsBack'));
ok('this month starts at its first day', __monthsBack(0) === "2026-01-01");
ok('one month back crosses the year',    __monthsBack(1) === "2025-12-01");
ok('and so does thirteen',               __monthsBack(13) === "2024-12-01");
globalThis._attTodayStr = () => "2026-10-28";
ok('a mid-year month is right',          __monthsBack(1) === "2026-09-01");
ok('the month is always two digits',     /^\d{4}-\d{2}-01$/.test(__monthsBack(2)));
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
