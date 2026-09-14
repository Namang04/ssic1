// Class 11-12 "Computer" -> "Computer Science" switch (2026-09-14). Pulls the REAL functions out of index.html.
// Guarantees: with the switch OFF nothing changes (the teacher still sees "Computer"); ON, their Class 11-12
// subject becomes the class list's "Computer Science" (so the exam column and the school syllabus are theirs),
// Classes 6-10 stay "Computer", and the copy planner never alters or loses the old records.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const balance = (i) => { let d = 0, j = src.indexOf('{', i); for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return j; };
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); } return src.slice(i, balance(i) + 1); };
const grabConst = (name) => { const i = src.search(new RegExp('^const ' + name + '=', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); } const eq = src.indexOf('=', i); return 'globalThis.' + name + '=' + src.slice(eq + 1, balance(src.indexOf('=>', eq)) + 1) + ';'; };
const line = (re) => { const m = src.match(re); if (!m) { console.error('  missing ' + re); process.exit(2); } return m[0]; };
let CFG = {};
globalThis._bcfg = () => CFG;
globalThis.SCHOOL = { subjects: { "Class 11": ["Mathematics", "Physics", "Computer Science", "English"], "Class 12": ["Mathematics", "Physics", "Computer Science", "English"], "Class 10": ["English", "Mathematics", "Science", "Social Science", "Computer"] } };
const vars = [/^var __SUBJ_SPLIT=.*$/m, /^var __SPLIT_CLASSES=.*$/m, /^var __MERGE_CLASSES=.*$/m, /^var __SPLIT_PARENT=.*$/m].map(r => line(r).replace(/^var /, 'globalThis.'));
(0, eval)([...vars, line(/^const safeId=.*$/m).replace(/^const /, 'globalThis.'),
  ...['normSection', '__teacherPairs', '__teacherPairParts', '__subjectsFor', '__testSubjectsFor', '__compCSEligible', '__compAsCS', '__canonTestSubj', '__chHash', '__ccKey', '__compCSPlan'].map(grab),
  grabConst('getTeacherSubjects')].join('\n'));
let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };
const J = JSON.stringify;
const atique = { role: "teacher", name: "Mr. Atique", subjects: ["Computer"], classes: ["Class 10-A", "Class 12-A", "Class 12-B"] };
const paired = { role: "teacher", name: "Paired", subjects: ["Computer"], classes: ["Class 12-A"], teachingPairs: ["Class 12-A|Computer"] };
const director = { role: "admin", name: "Director" };
// switch OFF: exactly today's behaviour
CFG = {};
ok('off: Class 12 "Computer" keeps its name',               __canonTestSubj("Class 12", "Computer") === "Computer");
ok('off: the teacher sees Computer in Class 12, as today',   J(getTeacherSubjects(atique, "Class 12")) === '["Computer"]');
ok('off: a pair-assigned teacher also sees Computer',        J(getTeacherSubjects(paired, "Class 12")) === '["Computer"]');
ok('off: the Director sees the class list',                  J(getTeacherSubjects(director, "Class 12")) === J(SCHOOL.subjects["Class 12"]));
ok('a switch set to anything but true stays off',            (CFG = { computerAsCS: "yes" }, __canonTestSubj("Class 12", "Computer") === "Computer"));
// switch ON
CFG = { computerAsCS: true };
ok('on: Class 12 "Computer" reads as Computer Science',     __canonTestSubj("Class 12", "Computer") === "Computer Science");
ok('on: Class 11 too',                                       __canonTestSubj("Class 11", "Computer") === "Computer Science");
ok('on: the teacher sees Computer Science in Class 12',      J(getTeacherSubjects(atique, "Class 12")) === '["Computer Science"]');
ok('on: so the exam column "Computer Science" is theirs',    getTeacherSubjects(atique, "Class 12").indexOf("Computer Science") >= 0);
ok('on: a pair-assigned teacher gets it too',                J(getTeacherSubjects(paired, "Class 12")) === '["Computer Science"]');
ok('on: Class 10 stays Computer',                            J(getTeacherSubjects(atique, "Class 10")) === '["Computer"]' && __canonTestSubj("Class 10", "Computer") === "Computer");
ok('on: other subjects are untouched',                       __canonTestSubj("Class 12", "Physics") === "Physics" && __canonTestSubj("Class 10", "Physics") === "Science");
ok('on: ignored where the class list itself says Computer',  (CFG = { computerAsCS: true, subjects: { "Class 12": ["Computer", "English"] } }, __canonTestSubj("Class 12", "Computer") === "Computer"));
CFG = {};
// copy planner
const topics = { "Class_12__Computer": { key: "Class 12__Computer", list: ["Python revision", "SQL"] }, "Class_12__Computer_Science": { key: "Class 12__Computer Science", list: ["SQL", "Networks"] }, "Class_11__Computer": { key: "Class 11__Computer", list: ["Basics"] }, "Class_10__Computer": { key: "Class 10__Computer", list: ["HTML"] } };
const syllabus = { "Class_12__A__Computer": { cls: "Class 12", sec: "A", subj: "Computer", statusHash: { h1: { chapter: "SQL", s: "done" }, h2: { chapter: "Python revision", s: "doing" } } },
  "Class_12__A__Computer_Science": { cls: "Class 12", sec: "A", subj: "Computer Science", statusHash: { h1: { chapter: "SQL", s: "doing" } } },
  "Class_12__Computer": { cls: "Class 12", subj: "Computer", copyChapters: ["Practical file"] },
  "Class_11__B__Computer": { cls: "Class 11", sec: "B", subj: "Computer", statusHash: { h9: { chapter: "Basics", s: "done" } } },
  "Class_12__A__Physics": { cls: "Class 12", sec: "A", subj: "Physics", statusHash: {} } };
const cc = {};
cc[__ccKey("Class 12", "A", "Computer", "SQL")] = { cls: "Class 12", sec: "A", subj: "Computer", chapter: "SQL", checked: { "1": true, "2": false } };
cc[__ccKey("Class 12", "A", "Computer Science", "SQL")] = { cls: "Class 12", sec: "A", subj: "Computer Science", chapter: "SQL", checked: { "2": true } };
cc[__ccKey("Class 11", "B", "Computer", "Basics")] = { cls: "Class 11", sec: "B", subj: "Computer", chapter: "Basics", checked: { "7": true }, deleted: true };
const frozen = J([topics, syllabus, cc]);
const p = __compCSPlan(topics, syllabus, cc, ["Class 11", "Class 12"]);
const W = (coll, id) => p.writes.find(w => w.coll === coll && w.id === id);
ok('the planner never edits its input',                      J([topics, syllabus, cc]) === frozen);
ok('no write ever targets an old Computer record',           !p.writes.some(w => /__Computer$|__Computer__c/.test(w.id)));
ok('topics: existing list kept, missing chapters added',     J((W("topics", "Class_12__Computer_Science") || {}).doc?.list) === J(["SQL", "Networks", "Python revision"]));
ok('topics: Class 11 list created',                          W("topics", "Class_11__Computer_Science")?.isNew && J(W("topics", "Class_11__Computer_Science").doc.list) === '["Basics"]');
ok('topics: Class 10 is not touched',                        !W("topics", "Class_10__Computer_Science"));
const sa = W("syllabus", "Class_12__A__Computer_Science");
ok('syllabus: an existing status is kept (doing stays doing)', sa && sa.doc.statusHash.h1.s === "doing");
ok('syllabus: a missing status is added',                    sa && sa.doc.statusHash.h2 && sa.doc.statusHash.h2.s === "doing" && sa.doc.subj === "Computer Science");
ok('syllabus: the class-wide record is created',             W("syllabus", "Class_12__Computer_Science")?.isNew && J(W("syllabus", "Class_12__Computer_Science").doc.copyChapters) === '["Practical file"]');
ok('syllabus: Class 11 section record created',              W("syllabus", "Class_11__B__Computer_Science")?.doc.sec === "B");
ok('syllabus: other subjects are not touched',               !p.writes.some(w => /Physics/.test(w.id)));
const cw = W("copyChecks", __ccKey("Class 12", "A", "Computer Science", "SQL"));
ok('copy checks: existing ticks kept, missing ticks added',  cw && cw.doc.checked["2"] === true && cw.doc.checked["1"] === true);
ok('copy checks: a deleted record is ignored',               !p.writes.some(w => w.coll === "copyChecks" && /Class_11/.test(w.id)));
ok('counts add up',                                          p.counts.topics === 2 && p.counts.chapters === 2 && p.counts.syllabus === 3 && p.counts.copyChecks === 1);
const T2 = JSON.parse(J(topics)), S2 = JSON.parse(J(syllabus)), C2 = JSON.parse(J(cc));
p.writes.forEach(w => { ({ topics: T2, syllabus: S2, copyChecks: C2 })[w.coll][w.id] = w.doc; });
ok('running it a second time writes nothing',               __compCSPlan(T2, S2, C2, ["Class 11", "Class 12"]).writes.length === 0);
ok('no eligible class, nothing planned',                    __compCSPlan(topics, syllabus, cc, []).writes.length === 0);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
