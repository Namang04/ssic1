// One rule for a staff member's attendance on a day (2026-10-13). The Director's MAIN dashboard counted only
// explicitly marked records, so a teacher who never checked in read as "none" and appeared nowhere — an
// all-clear on the dashboard beside a register full of absentees. The rule now lives in one function that the
// register and both dashboards call. These run the REAL __staffDayStatus and __staffAutoAbsent from index.html.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  const body = src.indexOf('{', src.indexOf(')', src.indexOf('(', i)));
  let d = 0, j = body; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
globalThis.safeId = (s) => String(s).replace(/[/\\.#$\[\]]/g, "_");
globalThis.__ttNorm = (s) => String(s || "").toLowerCase().replace(/^(mr|ms|mrs|miss|dr)\.?\s+/, "").trim();
globalThis.DEFAULT_USERS = { director: { fees: true } };
// Declared as globals so each one can call the next, exactly as they do in the page.
(0, eval)([grab('_attId'), grab('__staffKey'), grab('__staffAutoAbsent'), grab('__staffDayStatus')]
  .map(f => f.replace(/^function (\w+)/, 'globalThis.$1 = function $1')).join('\n'));

let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };
const TUE = "2026-10-13", SUN = "2026-10-11";           // a working Tuesday, and a Sunday
const teacher = { username: "asha", name: "Asha Verma", role: "teacher" };
const base = { att: {}, leave: {}, cal: {}, noClock: [], self: "director", todayStr: TUE, nowHM: "10:30", lateAfter: "08:00" };
const at = (o) => __staffDayStatus(teacher, TUE, Object.assign({}, base, o || {}));

// The reported fault: unmarked, day underway.
ok('an unmarked teacher is absent once the day is underway', at().key === "autoabs" && at().auto === true);
ok('and it is flagged as automatic, not a marked record',    at().rec === null);
// What the main dashboard was doing instead.
ok('reading only explicit records would have missed them',   at().rec === null && at().key !== "none");

// An explicit record always wins, whatever it says.
const rec = { [_attId("asha", TUE)]: { status: "present", hhmm: "08:12" } };
ok('an explicit present beats the rule',   at({ att: rec }).key === "present");
ok('and the record comes back with it',    at({ att: rec }).rec.hhmm === "08:12");
ok('an explicit absent is still absent',   at({ att: { [_attId("asha", TUE)]: { status: "absent" } } }).key === "absent");
ok('a record with no status reads present', at({ att: { [_attId("asha", TUE)]: {} } }).key === "present");

// Approved leave, matched regardless of title.
const leave = { l1: { status: "approved", teacherName: "Ms. Asha Verma", from: "2026-10-12", to: "2026-10-14" } };
ok('approved leave shows as leave',        at({ leave }).key === "leave");
ok('a title on the leave still matches',   at({ leave }).key === "leave");
ok('leave outside the dates does not',     at({ leave: { l1: Object.assign({}, leave.l1, { to: "2026-10-12" }) } }).key === "autoabs");
ok('an unapproved request does not',       at({ leave: { l1: Object.assign({}, leave.l1, { status: "pending" }) } }).key === "autoabs");

// The people the rule must never libel.
ok('whoever is looking is never auto-absent', __staffDayStatus(teacher, TUE, Object.assign({}, base, { self: "asha" })).key === "none");
const director = { username: "director", name: "Director", role: "admin" };
ok('nor is the Director, who does not clock in', __staffDayStatus(director, TUE, base).key === "none");
ok('but the Director marked absent still shows',
   __staffDayStatus(director, TUE, Object.assign({}, base, { att: { [_attId("director", TUE)]: { status: "absent" } } })).key === "absent");
// Staff exempt from clocking at all.
ok('a no-clock teacher counts present',    at({ noClock: ["asha"] }).key === "present" && at({ noClock: ["asha"] }).noclock === true);
ok('unless they are explicitly marked',    at({ noClock: ["asha"], att: { [_attId("asha", TUE)]: { status: "absent" } } }).key === "absent");

// When the rule does not apply at all.
ok('before the cutoff nobody is absent yet', at({ nowHM: "07:30" }).key === "none");
ok('on a Sunday nobody is',                 __staffDayStatus(teacher, SUN, Object.assign({}, base, { todayStr: SUN })).key === "none");
ok('nor on a calendar holiday',             at({ cal: { h: { date: TUE, type: "Holiday" } } }).key === "none");
ok('a past working day always counts',      __staffDayStatus(teacher, "2026-10-09", Object.assign({}, base, { nowHM: "07:00" })).key === "autoabs");
ok('a future date never does',              __staffDayStatus(teacher, "2026-10-20", base).key === "none");

// The register and the dashboards must ask the same question.
ok('the register calls the shared rule',    /function statusFor\(u\)\{\s*return __staffDayStatus\(u,date,/.test(src));
ok('the main dashboard calls it too',       /const _dwStat=\(u\)=>__staffDayStatus\(u,today,/.test(src));
ok('and uses it for every staff figure',    (src.match(/_dwStat\(/g) || []).length >= 3);
ok('neither keeps its own copy of the rule', (src.match(/__staffAutoAbsent\(date,_attTodayStr\(\)/g) || []).length === 0);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
