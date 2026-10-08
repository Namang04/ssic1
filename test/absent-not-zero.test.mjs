// Absent is absent — not a zero — and NOTHING is scaled (director, 2026-10-08, in those words), plus the two
// rules he gave next: ABSENT IN THEORY AND THE PRACTICAL IS NOT COUNTED (board rule), and an empty component
// is read as an absence — "if anybody is - then make it ab not 0, zero will be 0".
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

// ── an EMPTY component is an absence, not missing data ("make it ab not 0") ──
const missedUT = termComposite(J, "", 20, 64, 80, { notebook: 4, enrichment: 5 });
ok('a blank unit test reads as absent',         missedUT.parts.ut === 'AB' && missedUT.absentOn.join() === 'Unit Test');
ok('it is still listed as not typed in',        missedUT.missing.join() === 'Unit Test');
ok('and the subject has its total and grade',   missedUT.total === 73 && missedUT.noResult === false);
const abUT = termComposite(J, "AB", 20, 64, 80, { notebook: 4, enrichment: 5 });
ok('an explicit AB gives the same marks',       abUT.total === 73 && abUT.parts.ut === 'AB');
ok('but it is not reported as untyped',         abUT.missing.length === 0);
ok('NOTHING is scaled — still out of 100',      abUT.outOf === 100);

// ── a zero is a zero ──
const zero = termComposite(J, 0, 20, 0, 80, { notebook: 0, enrichment: 0 });
ok('0 entered means 0 scored, not absent',      zero.total === 0 && zero.parts.ut === 0 && zero.absent === false);
ok('and nothing is reported as untyped',        zero.missing.length === 0);

// ── nothing absent ──
const allIn = termComposite(J, 16, 20, 64, 80, { notebook: 4, enrichment: 5 });
ok('the total is unchanged',                    allIn.total === 81 && allIn.outOf === 100 && allIn.absent === false);
const absNb = termComposite(J, 16, 20, 64, 80, { notebook: "AB", enrichment: 5 });
ok('an absent notebook shows AB, not 0',        absNb.parts.writeins.notebook === 'AB');
ok('and the maximum is untouched',              absNb.outOf === 100 && absNb.total === 77);

// ── the board rule: absent in THEORY and the practical is not counted ──
const sAb = termComposite(S, undefined, 20, "AB", 100, { practical: 27 });
ok('senior absent from theory: AB in the cell',  sAb.parts.exam === 'AB');
ok('the subject carries NO RESULT',              sAb.noResult === true && sAb.total === null);
ok('the practical is not counted',               sAb.raw === 27 && sAb.total === null);
ok('the absence is named for the footnote',      sAb.absentOn.join() === 'Theory');
const sBlank = termComposite(S, undefined, 20, "", 100, { practical: 27 });
ok('a blank theory paper voids it the same way', sBlank.noResult === true && sBlank.missing.join() === 'Theory');
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

// ── the written exam still counts for its own weight ──
const half = termComposite(J, 10, 20, 40, 80, { notebook: 5, enrichment: 5 });
ok('a 20-mark unit test counts for its 10',      half.parts.ut === 5);
ok('and an 80-mark paper for its 80',            half.parts.exam === 40 && half.total === 55);

// ── the reported card: Shivam, Class 7-B — no unit test marks anywhere ──
// Mathematics 3 + 3 + 18, with Unit Test I blank. The card showed 36% off the one subject that had every
// component; every subject must now count, out of 100 each.
const shivam = [[18,3,3],[8,5,4],[7,4,5],[26,4,5],[21,4,4],[5,5,5],[15,3,3],[28,4,4]]
  .map(([ex,nb,en],i) => termComposite(J, i===7?"AB":"", 20, ex, 80, { notebook: nb, enrichment: en }));
ok('every subject has a total',                  shivam.every(c => c.total != null));
ok('Mathematics is the 24 he earned',            shivam[0].total === 24);
const tot = shivam.reduce((a,c)=>a+c.total,0);
ok('the overall is out of all 8 subjects',       tot === 193 && Math.round(tot/shivam.length) === 24);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
