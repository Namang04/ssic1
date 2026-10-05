// Dates on printed documents (2026-10-05). The report card showed "undefined/undefined/8/29/2009" because
// fmtDate only understood ISO. These check the REAL __dateParts/__dmy/__dLong/fmtDate from index.html against
// every shape the records hold: ISO, day-first, month-first, 2-digit years and Excel serial numbers.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = src.indexOf('{', i); for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
const line = (re) => { const m = src.match(re); if (!m) { console.error('  missing ' + re); process.exit(2); } return m[0]; };
(0, eval)([line(/^var _MONTHS_S=.*$/m).replace(/^var /, 'globalThis.'), grab('__dateParts'), grab('__dateOk'), grab('__dmy'), grab('__dLong'),
  line(/^const fmtDate=.*$/m).replace(/^const /, 'globalThis.')].join('\n'));
let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };
ok('month-first, the shape that broke the card', __dmy("8/29/2009") === "29/08/2009");
ok('day-first',                                  __dmy("29/08/2009") === "29/08/2009");
ok('ISO',                                        __dmy("2009-08-29") === "29/08/2009");
ok('ISO with a time',                            __dmy("2009-08-29T10:30:00Z") === "29/08/2009");
ok('dotted and dashed separators',               __dmy("29.08.2009") === "29/08/2009" && __dmy("8-29-2009") === "29/08/2009");
ok('two-digit year',                             __dmy("29/08/09") === "29/08/2009");
ok('ambiguous date reads month-first',           __dmy("3/4/2010") === "04/03/2010");
ok('Excel serial number',                        __dmy(40054) === "29/08/2009");
ok('a written date',                             __dmy("29 Aug 2009") === "29/08/2009");
ok('nonsense comes back untouched, not undefined', __dmy("not a date") === "not a date" && __dmy("") === "" && __dmy(null) === "");
ok('an impossible date is not invented',         __dateParts("45/45/2009") === null);
ok('long form for the transfer certificate',     __dLong("8/29/2009") === "29 August 2009");
ok('fmtDate keeps its ISO output',               fmtDate("2026-09-14") === "14/09/2026");
ok('fmtDate keeps "-" for an empty value',       fmtDate("") === "-");
ok('fmtDate no longer prints undefined',         fmtDate("8/29/2009") === "29/08/2009" && fmtDate("29/08/2009") === "29/08/2009");
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
