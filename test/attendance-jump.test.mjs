import { readFileSync } from 'node:fs';
// The room panel's Attendance jump resolves a bare timetable token ("9", "SIP_CLASS") to the exact class
// key Attendance builds its picker from. Pull the real label helpers out of index.html so this can never
// pass against labels the app does not actually produce.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const order = html.match(/^var __DIR_ORDER=.*$/m); const label = html.match(/^function __clsTokLabel[\s\S]*?^}/m);
if (!order || !label) { console.error('  could not find __DIR_ORDER / __clsTokLabel in index.html'); process.exit(2); }
(0,eval)(order[0] + '\n' + label[0]);
const all = __DIR_ORDER.map(__clsTokLabel);                       // what allClassesFromDir returns when every class has pupils
const _n = x => String(x||"").replace(/class/gi,"").replace(/[\s_]+/g,"").toLowerCase();
const resolve = (_c) => { const hit = all.find(k=>_n(k)&&_n(k)===_n(_c)); return hit || (/^class\s/i.test(_c)?_c:"Class "+_c); };
const sec = (_s) => (_s && _s.indexOf("+")<0) ? _s : undefined;
const src = html;
let pass=0, fail=0; const ok=(n,c)=>{ c?pass++:(fail++,console.log("  FAIL:",n)); };
console.log("  labels:", JSON.stringify(all));
ok('"9"        -> Class 9',            resolve("9")==="Class 9");
ok('"Class 9"  -> Class 9 (already a key)', resolve("Class 9")==="Class 9");
ok('"1" is not captured by 10/11/12',  resolve("1")==="Class 1");
ok('"10"       -> Class 10',           resolve("10")==="Class 10");
ok('"SIP" resolves to the SIP label',  _n(resolve("SIP")).startsWith("sip") && all.includes(resolve("SIP")));
ok('"SIP_CLASS" resolves the same',    resolve("SIP_CLASS")===resolve("SIP"));
ok('"A" section passes through',       sec("A")==="A");
ok('"A+B" combined is dropped',        sec("A+B")===undefined);
ok('empty section is dropped',         sec("")===undefined);
ok('test normaliser matches index.html byte-for-byte', src.includes('var _n=function(x){return String(x||"").replace(/class/gi,"").replace(/[\\s_]+/g,"").toLowerCase();};'));
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
