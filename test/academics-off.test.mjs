// The "students & fees only" switch (Branch Setup) must be able to exclude SIP from attendance: SIP pupils
// study off campus at Akash, yet the directory lists them, so attendance screens counted SIP A as a register
// nobody would ever mark - and the panel offered no switch for it, because it listed only branch classes.
import { readFileSync } from 'node:fs';
globalThis.SCHOOL={classes:["Class 1","Class 2","Class 3","Class 4","Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"]};
let cfg={}; globalThis._bcfg=()=>cfg;
// Pull the real helpers out of index.html by brace-balancing, so this can never pass against a copy.
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = i; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
(0,eval)([src.match(/^var __DIR_ORDER=.*$/m)[0], grab('__clsTokLabel'), grab('__academicOff'), grab('__isAcademicCls'), grab('allClassesFromDir')].join('\n'));
// a directory where 9, 10 and SIP have pupils
const dirDB={data:{dir_9:{students:[{status:""}]},dir_10:{students:[{status:""}]},dir_SIP_CLASS:{students:[{status:""}]}}};
const listed=()=>allClassesFromDir(dirDB).filter(__isAcademicCls);      // exactly what __attendanceSections / Attendance do
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:(fail++,console.log("  FAIL:",n));};
ok('before the switch, SIP is counted',            listed().includes("Class SIP"));
cfg={academicsOff:["Class SIP"]};                                         // what the new toggle writes
ok('after the switch, SIP is gone',                !listed().includes("Class SIP"));
ok('...and 9 / 10 are untouched',                  listed().includes("Class 9") && listed().includes("Class 10"));
const offList=(()=>{var seen={},out=[];__DIR_ORDER.map(__clsTokLabel).concat(SCHOOL.classes).forEach(c=>{if(c&&!seen[c]){seen[c]=1;out.push(c);}});return out;})();
ok('the toggle list now offers Class SIP',         offList.includes("Class SIP"));
ok('...and still every branch class',              SCHOOL.classes.every(c=>offList.includes(c)));
ok('no duplicates in the toggle list',             new Set(offList).size===offList.length);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
