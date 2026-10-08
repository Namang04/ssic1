// Absent is absent — not a zero — and NOTHING is scaled (director, 2026-10-08, in those words), plus the
// board rule he named next: ABSENT IN THEORY AND THE PRACTICAL IS NOT COUNTED.
// Two faults were reported from the half-yearly: a pupil who missed Unit Test 1 had NO percentage on the card
// at all, and a pupil marked absent was written in as a zero. So an "AB" component now earns no marks and no
// zero, the cell prints AB, and THE SUBJECT STILL TOTALS OUT OF 100 — what is left is left, no maximum is cut
// and no mark is scaled up. A BLANK stays different: it is a mark nobody has entered, so no grade yet.
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
ok('an absent unit test is not missing data',   abUT.missing.length === 0);
ok('an absent unit test is recorded as absent', abUT.absent === true && abUT.absentOn.join() === 'Unit Test');
ok('the component prints AB, not 0',            abUT.parts.ut === 'AB');
ok('NOTHING is scaled — still out of 100',      abUT.outOf === 100);
ok('the pupil keeps exactly what they earned',  abUT.total === 73);
ok('so the percentage is visible at last',      abUT.total != null);

// ── the complaint: "absent is reflecting as zero" ──
const allIn = termComposite(J, 16, 20, 64, 80, { notebook: 4, enrichment: 5 });
ok('nothing absent: the total is unchanged',    allIn.total === 81 && allIn.outOf === 100 && allIn.absent === false);
ok('a full house carries no absence flag',      allIn.absentOn.length === 0);
const absNb = termComposite(J, 16, 20, 64, 80, { notebook: "AB", enrichment: 5 });
ok('an absent notebook shows AB, not 0',        absNb.parts.writeins.notebook === 'AB');
ok('and the maximum is untouched',              absNb.outOf === 100 && absNb.total === 77);

// ── a genuine zero is still a zero ──
const zero = termComposite(J, 0, 20, 0, 80, { notebook: 0, enrichment: 0 });
ok('0 entered means 0 scored',                  zero.total === 0 && zero.outOf === 100 && zero.absent === false);

// ── the board rule: absent in THEORY and the practical is not counted ──
const sAb = termComposite(S, undefined, 20, "AB", 100, { practical: 27 });
ok('senior absent from theory: AB in the cell',  sAb.parts.exam === 'AB');
ok('the subject carries NO RESULT',              sAb.noResult === true && sAb.total === null);
ok('the practical is not counted',               sAb.raw === 27 && sAb.total === null);
ok('the absence is named for the footnote',      sAb.absentOn.join() === 'Theory');
const sBlank = termComposite(S, undefined, 20, "", 100, { practical: 27 });
ok('a blank theory paper is still incomplete',   sBlank.missing.join() === 'Theory' && !sBlank.noResult);
const sOk = termComposite(S, undefined, 20, 63, 100, { practical: 27 });
ok('theory sat: the practical counts as normal', sOk.total === 71.1 && sOk.noResult === false);
const sPr = termComposite(S, undefined, 20, 63, 100, { practical: "AB" });
ok('absent in the PRACTICAL does not void it',   sPr.noResult === false && sPr.total === 44.1 && sPr.outOf === 100);

// ── the same rule in the junior scheme: the written paper is the theory paper ──
const jAb = termComposite(J, 16, 20, "AB", 80, { notebook: 5, enrichment: 5 });
ok('absent in the exam voids the junior subject', jAb.noResult === true && jAb.total === null);
ok('the unit test and internals are not counted', jAb.raw === 18);

// ── absent in everything ──
const none = termComposite(J, "AB", 20, "AB", 100, { notebook: "AB", enrichment: "AB" });
ok('absent for every component: no result',      none.total === null && none.noResult === true);
ok('and the maximum is still the full 100',      none.outOf === 100);

// ── the written exam keeps its own scaling to its weight (that is the scheme, not a rescue) ──
const half = termComposite(J, 10, 20, 40, 80, { notebook: 5, enrichment: 5 });
ok('a 20-mark unit test counts for its 10',      half.parts.ut === 5);
ok('and an 80-mark paper for its 80',            half.parts.exam === 40 && half.total === 55);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
