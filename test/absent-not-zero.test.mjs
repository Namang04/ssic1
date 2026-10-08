// Absence is not a zero (2026-10-08, director, on the CBSE rule). Two faults were reported from the
// half-yearly: a pupil who missed Unit Test 1 had NO percentage on the card at all, and a pupil marked
// absent was scored zero. CBSE records a paper not sat as "AB" with no marks (Examination Bye-laws ch.7,
// 40.1(iii) — the Board awards no aggregate), and its only provision for a missed periodic test is the
// average of the best two of three. So an "AB" component is left out of BOTH the marks and the maximum and
// the subject is scaled to 100; a BLANK stays "unfinished data", which carries no grade.
// These run the REAL termComposite and termWeights from index.html.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = src.indexOf('{', i); for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
globalThis._bcfg = () => ({});
(0, eval)([grab('termWeights'), grab('termComposite')].join('\n'));

let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };
const J = termWeights('Class 7', 'Science');      // UT 10 + Notebook 5 + Enrichment 5 + Exam 80
const S = termWeights('Class 12', 'Physics');     // Practical 30 + Theory 70
ok('class 7 scheme is the CBSE 10/5/5/80',  J.ut === 10 && J.exam === 80 && J.writeins.length === 2);

// ── the complaint: "students who missed UT 1, their percentage is not visible" ──
const missedUT = termComposite(J, "", 20, 64, 80, { notebook: 4, enrichment: 5 });
ok('a BLANK unit test still leaves the subject incomplete', missedUT.missing.join() === 'Unit Test');
const abUT = termComposite(J, "AB", 20, 64, 80, { notebook: 4, enrichment: 5 });
ok('an absent unit test is not missing data',  abUT.missing.length === 0);
ok('an absent unit test is recorded as absent', abUT.absent === true && abUT.absentOn.join() === 'Unit Test');
ok('the component prints AB, not 0',           abUT.parts.ut === 'AB');
ok('the maximum drops by the paper not sat',   abUT.outOf === 90);
// 64/80*80 = 64 written + 4 + 5 = 73 out of 90 → 81.1
ok('the subject is scaled to 100 over what was sat', abUT.total === 81.1 && abUT.raw === 73);
ok('so the pupil HAS a percentage',            abUT.total != null);
ok('and it is not the old zero-for-the-UT 73', abUT.total !== 73);

// ── the complaint: "absent is reflecting as zero" ──
const allIn = termComposite(J, 16, 20, 64, 80, { notebook: 4, enrichment: 5 });
ok('nothing absent: the total is unchanged /100', allIn.total === 81 && allIn.outOf === 100 && allIn.absent === false);
ok('a full house carries no absence flag',     allIn.absentOn.length === 0);
const absNb = termComposite(J, 16, 20, 64, 80, { notebook: "AB", enrichment: 5 });
ok('an absent notebook is scaled out too',     absNb.outOf === 95 && absNb.parts.writeins.notebook === 'AB');
// 8 + 64 + 5 = 77 of 95 → 81.1
ok('and does not cost the pupil 5 marks',      absNb.total === 81.1);

// ── a genuine zero is still a zero ──
const zero = termComposite(J, 0, 20, 0, 80, { notebook: 0, enrichment: 0 });
ok('0 entered means 0 scored',                 zero.total === 0 && zero.outOf === 100 && zero.absent === false);

// ── seniors: practical/theory ──
const sAb = termComposite(S, undefined, 20, "AB", 100, { practical: 27 });
ok('senior absent from theory: practical only', sAb.outOf === 30 && sAb.parts.exam === 'AB' && sAb.total === 90);
ok('the absence is named for the footnote',     sAb.absentOn.join() === 'Theory');
const sBlank = termComposite(S, undefined, 20, "", 100, { practical: 27 });
ok('a blank theory paper is still incomplete',  sBlank.missing.join() === 'Theory');

// ── absent in everything: nothing to scale ──
const none = termComposite(J, "AB", 20, "AB", 100, { notebook: "AB", enrichment: "AB" });
ok('absent for every component: no total',      none.total === null && none.outOf === 0 && none.absent === true);

// ── the written exam keeps its own scaling ──
const half = termComposite(J, 10, 20, 40, 80, { notebook: 5, enrichment: 5 });
ok('a 20-mark unit test is scaled to its 10',   half.parts.ut === 5);
ok('and the exam to its 80',                    half.parts.exam === 40 && half.total === 55);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
