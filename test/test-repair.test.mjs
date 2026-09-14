// Test Tracker section fix + Repair records planner (2026-09-14). Pulls the REAL helpers out of index.html
// (brace-balanced), so it can never pass against a copy. Fixtures reproduce the faults seen in the live capture:
// XI-XII stream sections vs section letters, a combined paper filed under one section, an empty duplicate,
// "Computer" in Class 12, a 0 for a pupil the register marks absent - and the trap: Class X Physics and
// Chemistry tests on one day both READ as "Science" and must never be treated as duplicates.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = i; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
const line = (re) => { const m = src.match(re); if (!m) { console.error('  missing ' + re); process.exit(2); } return m[0]; };
const safeIdSrc = (src.match(/^(?:const|var|let) safeId\s*=.*$/m) || [null])[0] || grab('safeId');
globalThis.__testSubjectsFor=c=>/^Class 1[12]$/.test(c)?["Mathematics","Physics","Chemistry","Biology","Computer Science","English"]:["English","Mathematics","Science","Computer"];
(0,eval)([line(/^const nmKey=.*$/m), safeIdSrc, line(/^var __MK_STATES=.*$/m), line(/^var __SUBJ_SPLIT=.*$/m), line(/^var __MERGE_CLASSES=.*$/m),
  line(/^var __SPLIT_PARENT=.*$/m), grab('__ttSeniorSubj'), grab('__ttFoldTest'),
  grab('normSection'), grab('__admInBrack'), grab('__rowValFor'), grab('_markOf'), grab('__mkState'), grab('__mkSettled'),
  grab('__testAppliesTo'), grab('__testFill'), grab('__betterTestCopy'), grab('__pickForStudent'), grab('__compCSEligible'), grab('__compAsCS'), grab('__canonTestSubj'), grab('__testRepairPlan')].join('\n')
  .replace(/^const (nmKey|safeId)=/gm,'globalThis.$1=').replace(/^var /gm,'globalThis.'));
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:(fail++,console.log("  FAIL:",n));};
// ── helpers ──
ok('XII stream section matches its letter test',        __testAppliesTo("Class 12",{section:"B"},"BIO(COMP)","4","DEV"));
ok('MATH(COMP) pupil belongs to an A test',             __testAppliesTo("Class 12",{section:"A"},"MATH(COMP)","2","BHUVAN"));
ok('a test holding the pupil\'s own mark applies',      __testAppliesTo("Class 12",{section:"A",rowsByAdm:{"3":5}},"BIO","3","CHARU"));
ok('another section\'s test without the pupil does not',!__testAppliesTo("Class 12",{section:"A"},"BIO","3","CHARU"));
ok('whole-class tests apply to everyone',               __testAppliesTo("Class 10",{section:""},"B","13","HINA"));
const full={rows:{A:1,B:2},at:"1"}, empty={rows:{},at:"2"};
ok('the filled copy beats a later empty copy',          __betterTestCopy(full,empty)===full);
ok('...and an earlier empty copy',                      __betterTestCopy(empty,full)===full);
const t1={rows:{A:1},at:"1"}, t2={rows:{A:2},at:"2"};
ok('a tie keeps the later save (unchanged behaviour)',  __betterTestCopy(t1,t2)===t2);
ok('pupil view prefers the copy holding their entry',   __pickForStudent({rows:{Z:3,Y:4}},{rows:{A:7}},"","A").rows.A===7);
ok('app-wide, Class 12 "Computer" keeps its name',       __canonTestSubj("Class 12","Computer")==="Computer");
ok('the Test Tracker reads Class 12 "Computer" as Computer Science', __ttSeniorSubj("Class 12","Computer")==="Computer Science");
ok('...only while the class list says Computer Science',(()=>{const o=globalThis.__testSubjectsFor;globalThis.__testSubjectsFor=()=>["Computer","English"];const r=__ttSeniorSubj("Class 12","Computer");globalThis.__testSubjectsFor=o;return r==="Computer";})());
ok('the tracker rule leaves Class 10 alone',            __ttSeniorSubj("Class 10","Computer")==="Computer");
ok('the tracker reads a copy and never edits the test', (()=>{const t={cls:"Class 12",subj:"Computer"};const f=__ttFoldTest(t);return f!==t&&f.subj==="Computer Science"&&t.subj==="Computer";})());
ok('Class 10 "Computer" is untouched',                  __canonTestSubj("Class 10","Computer")==="Computer");
ok('Class 10 Physics still folds to Science',           __canonTestSubj("Class 10","Physics")==="Science");
// ── planner ──
const rosters={"Class 12":[{admNo:"1",name:"ANITA",section:"MATH"},{admNo:"2",name:"BHUVAN",section:"MATH(COMP)"},{admNo:"3",name:"CHARU",section:"BIO"},{admNo:"4",name:"DEV",section:"BIO(COMP)"},{admNo:"5",name:"ESHA",section:"COMM"}],
               "Class 10":[{admNo:"11",name:"FARAH",section:"A"},{admNo:"12",name:"GAURAV",section:"A"},{admNo:"13",name:"HINA",section:"B"}]};
const rosterOf=c=>rosters[c]||[];
const tests={
  phyB:{cls:"Class 12",subj:"Physics",section:"B",testDate:"2026-08-18",total:25,topics:["Moving charges"],week:5,at:"2026-08-18T10:00:00Z",rows:{CHARU:20,ANITA:18,BHUVAN:22},rowsByAdm:{"3":20,"1":18,"2":22}},
  engC1:{cls:"Class 12",subj:"English",section:"C",testDate:"2026-08-08",total:20,topics:["Rattrap"],at:"2026-08-08T09:00:00Z",rows:{ESHA:15},rowsByAdm:{"5":15}},
  engC2:{cls:"Class 12",subj:"English",section:"C",testDate:"2026-08-08",total:20,topics:["Rattrap"],at:"2026-08-09T09:00:00Z",rows:{},rowsByAdm:{}},
  comp:{cls:"Class 12",subj:"Computer",section:"A",testDate:"2026-09-02",total:20,topics:["CSV"],at:"2026-09-02T09:00:00Z",rows:{ANITA:12},rowsByAdm:{"1":12}},
  mathX:{cls:"Class 10",subj:"Mathematics",section:"A",testDate:"2026-08-17",total:20,topics:["Heights"],week:3,at:"2026-08-17T09:00:00Z",rows:{FARAH:0,GAURAV:14,HINA:9},rowsByAdm:{"11":0,"12":14,"13":9}},
  physX:{cls:"Class 10",subj:"Science",subjOrig:"Physics",section:"A",testDate:"2026-05-20",total:20,topics:["Light"],at:"2026-05-20T09:00:00Z",rows:{FARAH:10},rowsByAdm:{"11":10}},
  chemX:{cls:"Class 10",subj:"Science",subjOrig:"Chemistry",section:"A",testDate:"2026-05-20",total:20,topics:["Acids"],at:"2026-05-20T09:30:00Z",rows:{},rowsByAdm:{}}};
const frozen=JSON.stringify(tests);
const att={a1:{cls:"Class 10",section:"A",date:"2026-08-17",status:{"11":"A","12":"P"}}};
const p=__testRepairPlan(tests,rosterOf,att,"2026-09-14");
const W=Object.fromEntries(p.writes.map(w=>[w.id,w])), removedIds=p.removes.map(r=>r.id);
ok('the planner never mutates its input',               JSON.stringify(tests)===frozen);
ok('Section A marks leave the Section B Physics copy',  W.phyB && Object.keys(W.phyB.doc.rowsByAdm).join()==="3");
const newA=p.writes.find(w=>w.isNew&&w.doc.cls==="Class 12"&&w.doc.section==="A"&&w.doc.subj==="Physics");
ok('...into a new Section A copy of the same test',     newA && newA.doc.rowsByAdm["1"]===18 && newA.doc.rowsByAdm["2"]===22 && newA.doc.total===25 && newA.doc.testDate==="2026-08-18");
ok('no mark value changed in the move',                 newA && newA.doc.rows.ANITA===18 && W.phyB.doc.rows.CHARU===20);
ok('the empty English duplicate is removed',            removedIds.includes("engC2") && !removedIds.includes("engC1"));
ok('the repair renames no subject',                     !W.comp && !p.writes.some(w=>w.doc.subj!==(tests[w.id]||{subj:w.doc.subj}).subj));
ok('Class X Section B pupil moved out of the A copy',   W.mathX && W.mathX.doc.rowsByAdm["13"]===undefined);
ok('...into a new Section B copy',                      p.writes.some(w=>w.isNew&&w.doc.cls==="Class 10"&&w.doc.section==="B"&&w.doc.rowsByAdm["13"]===9));
ok('a 0 for a pupil absent in the register -> Absent',  W.mathX && W.mathX.doc.rowsByAdm["11"]===undefined && W.mathX.doc.statesByAdm["11"]==="A");
ok('a present pupil keeps the mark',                    W.mathX && W.mathX.doc.rowsByAdm["12"]===14);
ok('Physics and Chemistry (both read as Science) are NOT duplicates', !removedIds.includes("chemX") && !removedIds.includes("physX"));
ok('an empty test with no twin is left for the teacher',p.review.some(r=>r.id==="chemX"&&/no marks/.test(r.reason)));
ok('counts add up',                                     p.counts.moved===3 && p.counts.created===2 && p.counts.absent===1 && p.counts.emptyRemoved===1);
// a clash is never overwritten
const clash={b:{cls:"Class 12",subj:"Physics",section:"B",testDate:"2026-08-18",total:25,topics:["X"],at:"1",rows:{ANITA:18,CHARU:20},rowsByAdm:{"1":18,"3":20}},
             a:{cls:"Class 12",subj:"Physics",section:"A",testDate:"2026-08-18",total:25,topics:["X"],at:"2",rows:{ANITA:15},rowsByAdm:{"1":15}}};
const pc=__testRepairPlan(clash,rosterOf,{},"2026-09-14");
ok('a different mark in the own-section copy is left for review', pc.review.some(r=>/different entry/.test(r.reason)) && !pc.writes.some(w=>w.id==="a"||w.id==="b"));
// a test filed wholly under the wrong section moves and the emptied copy is removed
const wrong={d:{cls:"Class 12",subj:"English",section:"D",testDate:"2026-08-08",total:20,topics:["Rattrap"],at:"1",rows:{ESHA:14},rowsByAdm:{"5":14}}};
const pw=__testRepairPlan(wrong,rosterOf,{},"2026-09-14");
ok('wrong-section test: marks land in Section C',       pw.writes.some(w=>w.isNew&&w.doc.section==="C"&&w.doc.rowsByAdm["5"]===14));
ok('...and the emptied Section D copy is removed',      pw.removes.some(r=>r.id==="d") && pw.counts.emptied===1);
// identical copies: one kept
const ident={x1:{cls:"Class 10",subj:"English",section:"A",testDate:"2026-04-21",total:20,topics:["Mandela"],at:"1",rows:{FARAH:15},rowsByAdm:{"11":15}},
             x2:{cls:"Class 10",subj:"English",section:"A",testDate:"2026-04-21",total:20,topics:["Mandela"],at:"2",rows:{FARAH:15},rowsByAdm:{"11":15}}};
const pi=__testRepairPlan(ident,rosterOf,{},"2026-09-14");
ok('identical copy: the later one is removed, the first kept', pi.removes.length===1 && pi.removes[0].id==="x2");
// same-name pupils: a plain-name row is ambiguous and is never moved; the bracketed (admission-keyed) one is
const rosterTw=c=>c==="Class 10"?rosters["Class 10"].concat([{admNo:"21",name:"RAM",section:"A"},{admNo:"22",name:"RAM",section:"B"}]):[];
const tw={t:{cls:"Class 10",subj:"English",section:"A",testDate:"2026-08-20",total:20,topics:["T"],at:"1",rows:{"RAM":5,"RAM (22)":7,FARAH:11},rowsByAdm:{"11":11,"22":7}}};
const ptw=__testRepairPlan(tw,rosterTw,{},"2026-09-14"), twA=ptw.writes.find(w=>w.id==="t"), twB=ptw.writes.find(w=>w.isNew);
ok('twin: the Section B twin moves by admission number', twB && twB.doc.rowsByAdm["22"]===7 && twB.doc.rows["RAM (22)"]===7);
ok('twin: the ambiguous plain-name row stays put',       twA && twA.doc.rows.RAM===5 && twA.doc.rows.FARAH===11 && twA.doc.rows["RAM (22)"]===undefined);
// 0 -> Absent keeps the row's own name key
const zk={z:{cls:"Class 10",subj:"English",section:"A",testDate:"2026-08-21",total:20,topics:["T"],at:"1",rows:{"RAM (21)":0},rowsByAdm:{"21":0}}};
const pzk=__testRepairPlan(zk,rosterTw,{a:{cls:"Class 10",section:"A",date:"2026-08-21",status:{"21":"A"}}},"2026-09-14"), zw=pzk.writes.find(w=>w.id==="z");
ok('0 -> Absent is filed under the same name key',       zw && zw.doc.states["RAM (21)"]==="A" && zw.doc.statesByAdm["21"]==="A" && zw.doc.rows["RAM (21)"]===undefined);
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
