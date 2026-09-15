// Term Result order (2026-09-15): sections in order, A-Z inside each, pupils without a section last, one-section
// filter. Uses the REAL __sectionAZ and _rosterSec from index.html.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = src.indexOf('{', i); for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
(0, eval)([src.match(/^var _SR_STREAM=.*$/m)[0].replace(/^var /, 'globalThis.'), grab('_rosterSec'), grab('__sectionAZ')].join('\n'));
let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };
const names = l => l.map(s => s.name).join(",");
const c8 = [{ name: "SHAURYA PRATAP SINGH", section: "B", admNo: "9" }, { name: "SONAKSHI SAHANI", section: "A", admNo: "8" }, { name: "DEVANSH BUDHWANI", section: "A", admNo: "7" },
  { name: "aadhya gautam", section: "B", admNo: "6" }, { name: "AARAV SRIVASTAVA", section: "A", admNo: "5" }, { name: "ZOYA", section: "", admNo: "4" }, { name: "ABHI SINGH", section: "B", admNo: "3" }];
const frozen = JSON.stringify(c8);
const sec8 = s => _rosterSec(s.section, "Class 8") || "";
const all = __sectionAZ(c8, sec8, "");
ok('sections in order, A-Z inside each, no section last', names(all) === "AARAV SRIVASTAVA,DEVANSH BUDHWANI,SONAKSHI SAHANI,aadhya gautam,ABHI SINGH,SHAURYA PRATAP SINGH,ZOYA");
ok('case does not change the order',                     all[3].name === "aadhya gautam");
ok('one section keeps only that section, A-Z',           names(__sectionAZ(c8, sec8, "B")) === "aadhya gautam,ABHI SINGH,SHAURYA PRATAP SINGH");
ok('the roster itself is not reordered',                 JSON.stringify(c8) === frozen);
const twins = [{ name: "RAM", section: "A", admNo: "21" }, { name: "RAM", section: "A", admNo: "3" }];
ok('same names keep a steady order by admission number', __sectionAZ(twins, s => s.section, "").map(s => s.admNo).join() === "3,21");
const c12 = [{ name: "ESHA", section: "COMM" }, { name: "CHARU", section: "BIO" }, { name: "BHUVAN", section: "MATH(COMP)" }, { name: "ANITA", section: "MATH" }, { name: "DEV", section: "BIO(COMP)" }];
const sec12 = s => _rosterSec(s.section, "Class 12") || "";
ok('Class XII streams group as sections A, B, C',        __sectionAZ(c12, sec12, "").map(s => sec12(s) + ":" + s.name).join() === "A:ANITA,A:BHUVAN,B:CHARU,B:DEV,C:ESHA");
ok('an empty list is fine',                              __sectionAZ(null, sec8, "").length === 0);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
