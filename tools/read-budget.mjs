#!/usr/bin/env node
// How many documents a single sign-in downloads, per role.
//
// Firestore reads were running at ~815k/day against a 50k/day free allowance (~₹750/month and rising) while
// writes were only ~8k/month. The cause is subscriptions that pull a WHOLE collection the moment someone signs
// in, several of which grow every school day and are never trimmed. This reads index.html, works out which
// collections each role subscribes to at App level, and multiplies by the live document counts below.
//
// Counts: measured on Green City, 2026-10-28. Update them and re-run to re-measure.
// Run:  node tools/read-budget.mjs          (add --json for machine-readable output)
import { readFileSync } from 'node:fs';

const DOCS = {
  teacherLogs: 5788, staffAttendance: 3582, loginLogs: 3528, fees: 2524, attendance: 2325,
  wrongAnswers: 1294, copyChecks: 972, users: 745, accounts: 727, tests: 508,
  // Not measured on 2026-10-28 — order-of-magnitude placeholders, marked (est) in the report.
  exams: 120, studentDirectory: 15, academicRoster: 15, students: 15, discipline: 120, topics: 300,
  syllabus: 200, leaves: 150, timetables: 40, timetableSettings: 5, notices: 60, calendar: 60,
  meta: 5, studentLinks: 200, admissions: 150, registrations: 80, complaints: 40,
  paymentIntents: 60, feeDayCloses: 60, salaries: 120, conceptNotes: 30, auditLogs: 400,
};
const ESTIMATED = new Set(Object.keys(DOCS).filter(k => ![
  'teacherLogs','staffAttendance','loginLogs','fees','attendance','wrongAnswers','copyChecks','users','accounts','tests'
].includes(k)));

const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// The App component owns the sign-in-time subscriptions; anything declared inside another component only
// loads when that screen is opened, which is the behaviour we are trying to move everything towards.
const appStart = src.search(/^function App\(/m);
if (appStart < 0) { console.error('could not find function App()'); process.exit(2); }
let d = 0, appEnd = src.indexOf('{', appStart);
for (let j = appEnd; ; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) { appEnd = j; break; } } }
const app = src.slice(appStart, appEnd);

// useFirestore("name", <gate>) — the gate text tells us which roles actually subscribe.
const subs = [];
const re = /useFirestore\(\s*"([a-zA-Z]+)"\s*(?:,\s*([^\n]*?))?\)\s*[;,]/g;
let m;
while ((m = re.exec(app))) {
  const gate = (m[2] || '').replace(/\/\/.*$/, '').trim();
  subs.push({ coll: m[1], gate: gate || 'always' });
}

const ROLES = ['admin', 'vp', 'office', 'teacher', 'parent', 'student'];
// Does this gate let `role` through? The gates are plain role tests, so read them rather than eval them.
function subscribes(gate, role) {
  if (gate === 'always' || gate === 'true') return true;
  if (/^!!user$/.test(gate)) return true;
  let g = gate;
  // A gate that names tabs only loads when one of those tabs is open. Sign-in lands on the dashboard, so
  // unless "dashboard" is in the list this collection costs nothing at sign-in — except where the gate also
  // lets a role straight through (the student portal never reaches the tabbed shell).
  const onTab = g.match(/_onTab\(([^)]*)\)/);
  if (onTab) {
    const tabs = [...onTab[1].matchAll(/"([a-z]+)"/g)].map(x => x[1]);
    const bypass = [...g.matchAll(/user\.role\s*===\s*"([a-z]+)"\s*\|\|/g)].map(x => x[1]);
    if (!tabs.includes('dashboard') && !bypass.includes(role)) return false;
    g = g.replace(/_onTab\([^)]*\)/, 'true').replace(/user\.role\s*===\s*"[a-z]+"\s*\|\|/g, '');
  }
  if (/_curric/.test(g)) g = '!!user&&["admin","vp","teacher"].includes(user.role)';
  if (/_heavyOK/.test(g)) g = '!!user&&user.role!=="parent"';
  const listed = [...g.matchAll(/"([a-z]+)"/g)].map(x => x[1]).filter(r => ROLES.includes(r));
  const isInclude = /includes\(user\.role\)|indexOf\(user\.role\)\s*>=\s*0/.test(g);
  const notEq = [...g.matchAll(/user\.role\s*!==\s*"([a-z]+)"/g)].map(x => x[1]);
  const isEq = [...g.matchAll(/user\.role\s*===\s*"([a-z]+)"/g)].map(x => x[1]);
  if (notEq.length) return !notEq.includes(role);
  if (isInclude && listed.length) return listed.includes(role);
  if (isEq.length) return isEq.includes(role);
  return false;
}

const report = {};
for (const role of ROLES) {
  const rows = subs.filter(s => subscribes(s.gate, role))
    .map(s => ({ coll: s.coll, docs: DOCS[s.coll] ?? 0, est: ESTIMATED.has(s.coll) }))
    .sort((a, b) => b.docs - a.docs);
  report[role] = { total: rows.reduce((a, r) => a + r.docs, 0), rows };
}

if (process.argv.includes('--json')) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log('\n  Documents downloaded on ONE sign-in, by role');
console.log('  (a re-open after ~30 minutes away costs the same again)\n');
for (const role of ROLES) {
  const r = report[role];
  if (!r.rows.length) { console.log(`  ${role.padEnd(8)} —  nothing at App level`); continue; }
  console.log(`  ${role.padEnd(8)} ${String(r.total).padStart(7)} docs   from ${r.rows.length} collections`);
  r.rows.filter(x => x.docs >= 100).forEach(x =>
    console.log(`           ${String(x.docs).padStart(7)}  ${x.coll}${x.est ? '  (est)' : ''}`));
  console.log('');
}
const daily = report.admin.total * 3 + report.office.total * 3 + report.teacher.total * 25;
console.log(`  A day of ~3 Director, ~3 office and ~25 teacher sign-ins: ${daily.toLocaleString()} reads`);
console.log(`  Free allowance: 50,000/day\n`);
