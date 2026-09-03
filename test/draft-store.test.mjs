let store=new Map(), BUDGET=Infinity;
const bytes=()=>[...store].reduce((n,[k,v])=>n+k.length+v.length,0);
globalThis.localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>{const prev=store.get(k); store.set(k,v);
    if(bytes()>BUDGET){ prev===undefined?store.delete(k):store.set(k,prev); const e=new Error("QuotaExceededError"); e.name="QuotaExceededError"; throw e; }},
  removeItem:k=>store.delete(k), key:i=>[...store.keys()][i], get length(){return store.size;}
};
globalThis.window={__currentBranch:"greencity"};
globalThis.safeId=s=>String(s).replace(/[^A-Za-z0-9_-]+/g,"_");
(0,eval)(await import('node:fs').then(fs=>fs.readFileSync('draft-pure.js','utf8')));

const U={username:"dilip"}, V={username:"asha"};
let pass=0, fail=0;
const ok=(n,c)=>{c?pass++:(fail++,console.log("  FAIL:",n));};

__draftPut(U,"admission","9|A",{name:"Ravi"},{label:"Admission",sub:"9-A"});
ok("round-trip", __draftGet(U,"admission","9|A").data.name==="Ravi");
ok("scoped to context", __draftGet(U,"admission","9|B")===null);
ok("scoped to user",    __draftGet(V,"admission","9|A")===null);

__draftPut(U,"notice","n1",{body:"Holiday"},{label:"Notice"});
ok("lists both", __draftAll(U).length===2);
ok("other user sees none", __draftAll(V).length===0);

__draftBin(U,"notice","n1");
ok("discard leaves live list", __draftGet(U,"notice","n1")===null);
ok("discard is recoverable",   __draftBinAll(U).length===1);
__draftUnbin(U,__draftBinAll(U)[0].key);
ok("brought back", __draftGet(U,"notice","n1").data.body==="Holiday");
ok("bin emptied",  __draftBinAll(U).length===0);

__draftKill(U,"notice","n1");
ok("confirmed save removes", __draftGet(U,"notice","n1")===null);
ok("...and does not bin",    __draftBinAll(U).length===0);

store.clear();
__draftPut(U,"live","a",{big:"x".repeat(300)},{label:"Live work"});
__draftPut(U,"old","b",{big:"y".repeat(300)},{label:"Old"}); __draftBin(U,"old","b");
BUDGET=bytes()+120;
ok("writes under pressure", __draftPut(U,"new","c",{big:"z".repeat(60)},{label:"New"})===true);
ok("LIVE work survives a full disk", __draftGet(U,"live","a")!==null);
ok("binned item sacrificed first",   __draftBinAll(U).length===0);

BUDGET=bytes();
ok("refuses honestly when full", __draftPut(U,"x","d",{big:"q".repeat(5000)},{label:"X"})===false);
ok("live work still intact",     __draftGet(U,"live","a")!==null);

BUDGET=Infinity;
localStorage.setItem(__draftKey(U,"bad","x"),"{not json");
ok("survives corrupt data", __draftGet(U,"bad","x")===null);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
