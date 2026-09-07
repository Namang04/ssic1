import { readFileSync } from 'node:fs';
globalThis.safeId=s=>String(s).replace(/[^A-Za-z0-9_-]+/g,"_");
// Which pupil a fee-import row belongs to. Receipt #193 (Arohi Mishra, left, adm 2052) was filed under
// Arohi Sharma (adm 667) because the importer tried every NAME guess before it looked up a cited admission
// number among pupils who had left. These run the real __feeResolvePupil, __dirIndex, nmKey, __ratio and
// __clsNum pulled out of index.html by brace-balancing, so they cannot pass against a copy.
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = i; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
const line = (re) => { const m = src.match(re); if (!m) { console.error('  missing ' + re); process.exit(2); } return m[0]; };
(0,eval)([line(/^(var|const) ROMAN_NUM=.*$/m), line(/^const nmKey=.*$/m), grab('__lev'), grab('__ratio'), grab('__clsNum'), grab('__dirIndex'), grab('__feeResolvePupil')].join('\n'));
const dirDB={data:{
  dir_6:{students:[{name:"AROHI SHARMA",admNo:"667",cls:"Class 6",status:"",section:"A"},{name:"AROHI MISHRA",admNo:"2052",cls:"Class 6",status:"left",section:"A"},{name:"RAHUL VERMA",admNo:"701",cls:"Class 6",status:"",section:"A"}]},
  dir_SIP_CLASS:{students:[{name:"SHIVANGI SINGH",admNo:"2331",cls:"SIP_CLASS",status:"",section:"A"},{name:"ANANYA SINGH",admNo:"2402",cls:"SIP_CLASS",status:"",section:"A"},{name:"AARYA SINGH",admNo:"2423",cls:"SIP_CLASS",status:"",section:"A"}]},
}};
const idx=__dirIndex(dirDB); const R=(adm,name,cn)=>{const r=__feeResolvePupil(idx,adm,name,cn); const w=r.hit||r.leftHit; return w?w.admNo+(r.leftHit&&!r.hit?" (left)":""):"UNLINKED";};
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:(fail++,console.log("  FAIL:",n));};
ok('#193: adm 2052 (left) + name Arohi Mishra -> 2052, NOT Arohi Sharma',  R("2052","AROHI MISHRA","6")==="2052 (left)");
ok('active adm wins',                                                      R("667","AROHI SHARMA","6")==="667");
ok('#459 style: wrong adm 2318 + exact name -> 2331 (kept)',               R("2318","SHIVANGI SINGH","SIP_CLASS")==="2331");
ok('cited adm + unknown name: no first-name guess -> UNLINKED',             R("9999","ARIHANT GUPTA","6")==="UNLINKED");
ok('cited adm + near-miss name: no fuzzy guess -> UNLINKED',                R("9999","AROHI MISRA","6")==="UNLINKED");
ok('NO adm + unique first name in class -> still matched (TechRelevant rows)', R("","AROHI MISRA","6")==="667");
ok('NO adm + exact name -> matched',                                        R("","RAHUL VERMA","6")==="701");
ok('NO adm + unknown -> UNLINKED',                                          R("","NOBODY HERE","6")==="UNLINKED");
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
