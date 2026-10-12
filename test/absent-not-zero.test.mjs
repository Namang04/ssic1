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
ok('theory sat: the practical counts as normal', sOk.total === 71 && sOk.noResult === false);
const sPr = termComposite(S, undefined, 20, 63, 100, { practical: "AB" });
ok('absent in the PRACTICAL does not void it',   sPr.noResult === false && sPr.total === 44 && sPr.outOf === 100);

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

// ── a printed card has to add up (director, 2026-10-12) ──
// A 20-mark unit test scaled to 10 used to keep its half: 19 became 9.5, the cell printed 10, and the column
// still added the 9.5s. Ansh Rai's unit tests showed 68 on the Overall row while the column counted by hand
// came to 70. Every component is now a whole mark and the totals are built from those same whole marks.
ok('19 out of 20 is the 10 the card prints', termComposite(J, 19, 20, 60, 80, { notebook: 4, enrichment: 4 }).parts.ut === 10);
ok('17 out of 20 rounds the same way',       termComposite(J, 17, 20, 60, 80, {}).parts.ut === 9);
ok('an even mark is unchanged',              termComposite(J, 16, 20, 60, 80, {}).parts.ut === 8);
ok('the written paper is whole too',         termComposite(S, undefined, 20, 63, 100, { practical: 27 }).parts.exam === 44);
ok('and so is a written-in component',       termComposite(J, 16, 20, 60, 80, { notebook: 4.5, enrichment: 4 }).parts.writeins.notebook === 5);
// Ansh Rai: eight subjects, unit tests totalling 136 out of 160.
const ansh = [19, 17, 15, 18, 16, 19, 15, 17].map(ut => termComposite(J, ut, 20, 60, 80, { notebook: 4, enrichment: 4 }));
ok('his unit tests total 136 as entered',    [19, 17, 15, 18, 16, 19, 15, 17].reduce((a, b) => a + b, 0) === 136);
const utCol = ansh.map(c => c.parts.ut);
ok('every cell in the column is a whole mark', utCol.every(v => Number.isInteger(v)));
// The point is not any one figure but that the Overall row equals the column counted by hand. Before this,
// the cells printed 10+9+8+9+8+10+8+9 = 71 while the row added the halves and showed 68.
ok('the column counted by hand IS the total', utCol.reduce((a, b) => a + b, 0) === 71);
ok('which is not what the halves summed to', 136 / 2 !== utCol.reduce((a, b) => a + b, 0));
ok('and the subject total adds the same cells',
   ansh.every(c => c.total === c.parts.ut + c.parts.writeins.notebook + c.parts.writeins.enrichment + c.parts.exam));
ok('so every subject total is whole',        ansh.every(c => Number.isInteger(c.total)));

// ── the reprint list: what a total CAME TO before whole-mark rounding ──
const exact = grab('__termExactTotal');
(0, eval)(exact.replace(/^function /, 'globalThis.__termExactTotal = function '));
const wv = { notebook: 4, enrichment: 4 };
ok('it reproduces the old half-mark total', __termExactTotal(J, 19, 20, 60, 80, wv) === 77.5); // 9.5+4+4+60
ok('while the card now shows a whole mark', termComposite(J, 19, 20, 60, 80, wv).total === 78);  // 10 +4+4+60
ok('an even unit test never moved',         __termExactTotal(J, 16, 20, 60, 80, wv) === termComposite(J, 16, 20, 60, 80, wv).total);
ok('a class-12 theory paper out of 100 moved', __termExactTotal(S, undefined, 20, 63, 100, { practical: 27 }) === 71.1);
ok('one out of 70 never did',               __termExactTotal(S, undefined, 20, 63, 70, { practical: 27 }) === 90);
ok('an absent paper has nothing to compare', __termExactTotal(J, 19, 20, "AB", 80, wv) === null);
ok('nor does one not yet entered',           __termExactTotal(J, 19, 20, "", 80, wv) === null);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
