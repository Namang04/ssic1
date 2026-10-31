// Sessions as stores (2026-10-31). A later session lives in its own collections, as a campus does, so next year's
// work cannot touch this year's. Everything here is pulled out of index.html so it cannot pass against a copy.
// The first block is the one that matters most today: while 2026-27 is in use, every collection name on every
// campus must come out exactly as it always has.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^(?:async )?function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  const b = src.indexOf('{', src.indexOf(')', i)); let d = 0, j = b; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
const line = (re) => { const m = src.match(re); if (!m) { console.error('  missing ' + re); process.exit(2); } return m[0]; };
globalThis.window = { __currentBranch: 'greencity', __storeTag: '' };
globalThis.localStorage = { getItem: () => null };
globalThis.__feeClasses = () => ({ 'Class 6': [{ amount: 1000 }] });
globalThis.studentAnnualFee = (c, s, on, st) => (st[c] || []).reduce((a, h) => a + Number(h.amount || 0), 0) + (String(on).toLowerCase() === 'new' ? 500 : 0);
globalThis.waiverFor = (f, a) => Number(((f && f.__waivers && f.__waivers.byAdm && f.__waivers.byAdm[a]) || {}).amount || 0);
globalThis.__clsNum = (s) => String(s || '').replace(/^Class\s*/i, '').trim();
globalThis._rosterSec = (s) => s || ''; globalThis._attPhone = (s) => (s && s.contact) || '';
globalThis.nmKey = (s) => String(s || '').toLowerCase();
const names = ['__BASE_SESSION', '__SESSION_STORE', '__BRANCH_SCOPED', '__SESSION_FEE_DOCS'];
(0, eval)([line(/^const __BRANCH_SCOPED=.*$/m), line(/^const __BASE_SESSION=.*$/m), line(/^const __SESSION_STORE=.*$/m), line(/^const __SESSION_FEE_DOCS=.*$/m),
  grab('__sessTag'), grab('__storeName'), grab('_bcoll'), grab('__storeColl'), grab('__sessDocs'), grab('__clsTokLabel'), grab('__admInBrack'), grab('__payIndex'), grab('__payHitsIdx'),
  grab('__promotionPlan'), grab('__openingDoc'), grab('__prevYearDues'), grab('__rosterCaches'), grab('__carryDoc'), grab('__clsByAdm')].join('\n') +
  '\n' + ['__sessTag', '__storeName', '_bcoll', '__storeColl', '__sessDocs', '__promotionPlan', '__openingDoc', '__prevYearDues', '__rosterCaches', '__carryDoc', '__clsByAdm', ...names].map(n => `globalThis.${n}=${n};`).join(''));
let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };

// ── nothing moves while 2026-27 is in use ──
const old = (b, base) => (b && b !== 'greencity' && __BRANCH_SCOPED.has(base)) ? (b + '_' + base) : base;   // the formula as shipped until today
const every = [...__BRANCH_SCOPED, 'users', 'accounts', 'meta', 'auditLogs', 'loginLogs', 'conceptNotes', 'parentLookup', 'portalExamResults'];
let same = true;
for (const b of ['greencity', 'surajkund', 'maniram', 'allgirls']) { window.__currentBranch = b; window.__storeTag = ''; for (const c of every) if (_bcoll(c) !== old(b, c)) same = false; }
window.__currentBranch = 'greencity';
ok('with no session tag, every name on every campus is unchanged', same);
ok('undefined tag behaves the same as none', (() => { delete window.__storeTag; const r = _bcoll('tests') === 'tests'; window.__storeTag = ''; return r; })());

// ── which session gets a store ──
ok('2026-27 has no tag: it stays where it is', __sessTag('2026-27') === '');
ok('an older session has no tag either',       __sessTag('2025-26') === '');
ok('2027-28 is tagged 2728',                   __sessTag('2027-28') === '2728');
ok('a malformed session is never a store',     __sessTag('') === '' && __sessTag('2027') === '' && __sessTag('next') === '');

// ── the store ──
window.__storeTag = '2728';
ok('a test in 2027-28 is in its own collection',  _bcoll('tests') === 'greencity-2728_tests');
ok('so is the directory',                         _bcoll('studentDirectory') === 'greencity-2728_studentDirectory');
window.__currentBranch = 'surajkund';
ok('a campus keeps its own store for the session',_bcoll('tests') === 'surajkund-2728_tests');
window.__currentBranch = 'greencity';
ok('fees stay in the one collection (the server writes them)', _bcoll('fees') === 'fees' && _bcoll('paymentIntents') === 'paymentIntents' && _bcoll('portalFees') === 'portalFees');
ok('receipt numbers keep running across years',   _bcoll('counters') === 'counters');
ok('staff records stay continuous for payroll',   _bcoll('staffAttendance') === 'staffAttendance' && _bcoll('leaves') === 'leaves' && _bcoll('salaries') === 'salaries' && _bcoll('calendar') === 'calendar');
ok('registrations stay where the website writes', _bcoll('registrations') === 'registrations');
ok('photos stay with the child',                  _bcoll('studentPhotos') === 'studentPhotos');
ok('logins and config are not per-year',          _bcoll('users') === 'users' && _bcoll('accounts') === 'accounts' && _bcoll('meta') === 'meta');
window.__storeTag = '';
ok('another session can be named from anywhere',  __storeColl('tests', '2027-28') === 'greencity-2728_tests' && __storeColl('tests', '2026-27') === 'tests');
ok('the store name has the shape the rules expect', /^[a-z]+-[0-9]{4}_[A-Za-z]+$/.test(__storeColl('copyChecks', '2027-28')));

// ── a year's fee structure ──
const fd = { __structure: { y: 26 }, __waivers: { y: 26 }, __structure__y2728: { y: 27 } };
ok('2026-27 sees only its own fee structure',    __sessDocs(fd, '').__structure.y === 26 && !('__structure__y2728' in __sessDocs(fd, '')));
ok('2027-28 sees its own copy',                  __sessDocs(fd, '2728').__structure.y === 27);
ok('...and last year\'s until it has one',       __sessDocs(fd, '2728').__waivers.y === 26);
ok('2028-29 starts from the nearest earlier year', __sessDocs(fd, '2829').__structure.y === 27);
ok('a later year never leaks backwards',         __sessDocs({ __structure: { y: 26 }, __structure__y2829: { y: 28 } }, '2728').__structure.y === 26);

// ── promotion ──
const live = {
  dir_5: { students: [{ admNo: '1', name: 'ASHA', clsNum: '5', section: 'A', oldNew: 'New' }, { admNo: '2', name: 'BANI', clsNum: '5', section: 'B', status: 'Left' }] },
  dir_6: { students: [{ admNo: '3', name: 'CHARU', clsNum: '6', section: 'A', oldNew: 'Old' }] },
  dir_12: { students: [{ admNo: '4', name: 'DEV', clsNum: '12', section: 'A' }, { admNo: '9', name: 'OLD', clsNum: '12', status: 'Passed Out' }] },
  dir_Nursery: { students: [{ admNo: '5', name: 'ESHA', clsNum: 'Nursery' }] },
  dir_UKG: { students: [{ admNo: '6', name: 'FARAH', clsNum: 'UKG' }] }, dir_SIP: { students: [{ admNo: '7', name: 'GITA', clsNum: 'SIP' }] } };
const frozen = JSON.stringify(live);
const intakeDir = { dir_6: { students: [{ admNo: '2403', name: 'NEW CHILD', clsNum: '6', section: 'A', oldNew: 'New' }] } };
const P = __promotionPlan(live, intakeDir, '2026-27', '2027-28');
const inCls = (p, c) => ((p.docs['dir_' + c] || {}).students || []).map(s => s.name).sort().join();
ok('the live directory is not touched',              JSON.stringify(live) === frozen);
ok('a pupil moves up one class',                     inCls(P, '6').includes('ASHA'));
ok('...keeping their section',                       P.docs.dir_6.students.find(s => s.name === 'ASHA').section === 'A');
ok('a child admitted for next year keeps their class', inCls(P, '6').includes('NEW CHILD'));
ok('...and is not pushed up',                        !inCls(P, '7').includes('NEW CHILD'));
ok('Class 6 moves to 7',                             inCls(P, '7') === 'CHARU');
ok('a left pupil does not go forward',               !JSON.stringify(P.docs).includes('BANI') && P.counts.left === 1);
ok('Class 12 does not go forward',                   !JSON.stringify(P.docs).includes('DEV') && P.counts.passout === 1);
ok('an earlier batch does not reappear',             !JSON.stringify(P.docs).includes('"OLD"'));
ok('Nursery goes to LKG',                            inCls(P, 'LKG') === 'ESHA');
ok('UKG goes to Class 1',                            inCls(P, '1') === 'FARAH');
ok('a class with no next class stays and is counted',inCls(P, 'SIP') === 'GITA' && P.counts.unmoved === 1);
ok('promoted pupils say where they came from',       P.docs.dir_7.students[0].promotedFrom === '2026-27' && P.docs.dir_7.students[0].prevCls === '6');
ok('a promoted pupil no longer pays new-admission heads', P.docs.dir_6.students.find(s => s.name === 'ASHA').oldNew === 'Old');
ok('the new child still does',                       P.docs.dir_6.students.find(s => s.name === 'NEW CHILD').oldNew === 'New');
// the danger the old in-place promotion carried: a second run pushing everyone up again
const again = __promotionPlan(live, P.docs, '2026-27', '2027-28');
ok('running it twice gives the same classes',        ['1', '6', '7', 'LKG', 'SIP'].every(c => inCls(again, c) === inCls(P, c)));
ok('...and no one twice',                            again.docs.dir_7.students.length === 1 && again.docs.dir_6.students.length === 2);
ok('a pupil marked left after a first run drops out on the next', (() => {
  const l2 = JSON.parse(frozen); l2.dir_6.students[0].status = 'Left'; const p = __promotionPlan(l2, P.docs, '2026-27', '2027-28'); return p.docs.dir_7.students.length === 0; })());
// corrections made in next year survive a re-run: a stream set for Class 11 must not silently revert
const edited = JSON.parse(JSON.stringify(P.docs)); edited.dir_7.students[0].section = 'BIO'; edited.dir_7.students[0].phone = 'new';
const reRun = __promotionPlan(live, edited, '2026-27', '2027-28');
ok('a correction made in next year survives a re-run',  reRun.docs.dir_7.students.find(s => s.name === 'CHARU').section === 'BIO' && reRun.docs.dir_7.students.find(s => s.name === 'CHARU').phone === 'new');
const moved = JSON.parse(JSON.stringify(P.docs)); const ch = moved.dir_7.students.shift(); ch.clsNum = '8'; ch.cls = '8'; moved.dir_8 = { cls: '8', clsNum: '8', students: [ch] };
ok('...and so does a pupil moved to another class',     __promotionPlan(live, moved, '2026-27', '2027-28').docs.dir_8.students.some(s => s.name === 'CHARU'));
ok('no changes since promoting: nothing to report',     again.counts.added === 0 && again.dropped.length === 0);
const joined = JSON.parse(frozen); joined.dir_6.students.push({ admNo: '50', name: 'LATE JOINER', clsNum: '6' });
const pj = __promotionPlan(joined, P.docs, '2026-27', '2027-28');
ok('a pupil who joined after promoting is added and reported', inCls(pj, '7').includes('LATE JOINER') && pj.counts.added === 1);
const gone = JSON.parse(frozen); gone.dir_6.students[0].status = 'Left';
const pg = __promotionPlan(gone, P.docs, '2026-27', '2027-28');
ok('a pupil who left after promoting is reported',      pg.dropped.length === 1 && pg.dropped[0] === 'CHARU');
const clash = __promotionPlan(live, { dir_6: { students: [{ admNo: '3', name: 'SOMEONE ELSE', clsNum: '6' }] } }, '2026-27', '2027-28');
ok('an admission number used twice is reported, not merged', clash.conflicts.length === 1 && clash.conflicts[0].admNo === '3');

// ── last year's balance ──
const fees = { __structure: { classes: { 'Class 6': [{ amount: 1000 }] } }, __waivers: { byAdm: { '3': { amount: 100 } } } };
const O = __openingDoc(live, fees, '2026-27', '2027-28');
ok('the bill is what they owed, less the waiver',    O.byAdm['3'].billed === 900 && O.from === '2026-27');
ok('a left pupil or Class 12 is not carried',        !O.byAdm['2'] && !O.byAdm['4']);
const feesNext = { __open2728: O };
const raw = { a: { admNo: '3', amount: 300, session: '2026-27' }, b: { admNo: '3', amount: 50, disc: true, session: '2026-27' }, c: { admNo: '3', amount: 777, session: '2027-28' }, d: { admNo: '3', amount: 100, session: '2026-27', deleted: true }, __x: {} };
const D = __prevYearDues(feesNext, raw, '2027-28');
ok('balance is bill less that year\'s receipts and concession', D.byAdm['3'] === 550);
ok('next year\'s receipts do not count against it',  D.byAdm['3'] !== 900 - 300 - 50 - 777);
ok('a deleted receipt does not count',               D.byAdm['3'] !== 450);
ok('a total and a count are given',                  D.total === 550 + 500 && D.count === 2 && D.byAdm['1'] === 500 && D.from === '2026-27');   // ASHA (New) owes the stub's 500 new-admission head
raw.e = { admNo: '3', amount: 550, session: '2026-27' };
ok('paying it later in that session clears it at once', (() => { const r = __prevYearDues(feesNext, raw, '2027-28'); return r.byAdm['3'] === undefined && r.count === 1 && r.total === 500; })());
ok('a session with no record of a previous year shows nothing', __prevYearDues({}, raw, '2026-27') === null);

// ── carried across ──
const rc = __rosterCaches([{ admNo: ' 7 ', name: 'A', section: 'B', contact: '9' }, { admNo: '8', name: 'B', status: 'left' }, null], 'Class 6');
ok('the roster leaves out left pupils',              rc.roster.students.length === 1 && rc.roster.students[0].admNo === '7');
ok('the class cache matches it',                     rc.cache.list.join() === 'A' && rc.cache.admNo.A === ' 7 ' && rc.cache.sections.A === 'B');
ok('syllabus progress does not carry',               __carryDoc('syllabus', { cls: 'C', subj: 'S', status: { a: 1 } }) === null);
ok('hand-added chapters do',                         __carryDoc('syllabus', { cls: 'C', subj: 'S', status: { a: 1 }, copyChapters: ['x'] }).copyChapters[0] === 'x');
ok('...without the progress',                        !('status' in __carryDoc('syllabus', { cls: 'C', status: { a: 1 }, copyChapters: ['x'] })));
ok('the timetable carries whole',                    __carryDoc('timetables', { a: 1 }).a === 1);
ok('a family follows the child by admission number', __clsByAdm(P.docs)['1'] === '6' && __clsByAdm(P.docs)['2403'] === '6');
ok('a left or passed-out child has no class to follow', __clsByAdm(live)['2'] === undefined && __clsByAdm(live)['9'] === undefined);

// ── what the app wires up ──
ok('the session wrapper scopes each collection by name', /_fsess\(db\.data,coll\)/.test(src));
ok('a promotion reads the live directory, never writes it', !/dirDB\.set/.test(grab('SessionPromote')));
ok('going live waits if students changed since promoting', /plan\.counts\.added\|\|plan\.dropped\.length/.test(grab('SessionPromote')));
const portalWrites = src.split('\n').filter(l => /__fbSetDoc\(window\.__fbDoc\(window\.__db,"portalFees"/.test(l));
ok('a parent\'s balance is only ever written from the live session', portalWrites.length === 2 && portalWrites.every(l => /portalIsLive/.test(l) || /try\{await window\.__fbSetDoc/.test(l)) && /if\(!portalIsLive\)\{setPubMsg/.test(src) && /adjustPortalLedger=async\(p,delta\)=>\{if\(!portalIsLive\)return true;/.test(src));
ok('a UPI claim is filed under the parent\'s session',  /const upiSess=String\(it\.session\|\|__liveSession\(\)\)/.test(src) && /__fnConfirmUpi\(it\.id,upiSess\)/.test(src) && !/__fnConfirmUpi\(it\.id,String\(window/.test(src));
ok('a parent\'s claim records the session it was made in', (src.match(/ref:ref,session:__workSession\(\),date:/g) || []).length === 2);
ok('a read in flight is dropped on a session switch',   /if\(g!==storeGen\.current\)return;/.test(src));
ok('going live moves late records and logins',       /__moveLateRecords\(/.test(grab('SessionPromote')) && /relabelLogins\(dir,curSession\)/.test(grab('SessionPromote')));
ok('a registration for another year switches session', /__setWorkSession\(_rs\)/.test(src));

// ── which session a saved record belongs to, and what a view shows ──
const inApp = (name) => { const i = src.search(new RegExp('^\\s*function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  const b = src.indexOf('{', src.indexOf(')', i)); let d = 0, j = b; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(src.indexOf('function', i), j + 1); };
(0, eval)(inApp('__sessionForDate') + '\n' + inApp('_stampFor') + '\n' + inApp('_fsess') + '\nglobalThis.__sessionForDate=__sessionForDate;globalThis._stampFor=_stampFor;globalThis._fsess=_fsess;');
const view = (v, c) => { globalThis.vSess = v; globalThis.curSession = c; };
view('2026-27', '2026-27');
ok('live: a record dated this year is this year',          _stampFor('fees', { date: '2026-10-31' }) === '2026-27');
ok('live: a class test (no date field) is this year',      _stampFor('tests', { testDate: '2026-10-31' }) === '2026-27');
ok('live: a correction dated last year stays last year',   _stampFor('fees', { date: '2026-03-20' }) === '2025-26');
ok('live: a register marked on 2 April before the rollover stays on screen', _stampFor('attendance', { date: '2027-04-02' }) === '2026-27');
view('2027-28', '2026-27');
ok('working in next year: a fee taken today is next year\'s', _stampFor('fees', { date: '2026-10-31' }) === '2027-28');
ok('...and so is anything in that year\'s store',          _stampFor('tests', { testDate: '2026-10-31' }) === '2027-28');
view('2026-27', '2027-28');
ok('working in a past year: a receipt today belongs to it', _stampFor('fees', { date: '2027-05-01' }) === '2026-27');
ok('...including a class test being corrected',            _stampFor('tests', { testDate: '2026-05-01' }) === '2026-27');
view('2027-28', '2027-28');
ok('live in a store: the store\'s session',                _stampFor('attendance', { date: '2027-03-30' }) === '2027-28');
const sample = { a: { session: '2026-27' }, b: {}, c: { session: '2027-28' }, __structure: { x: 1 }, __structure__y2728: { x: 2 } };
view('2026-27', '2026-27');
ok('2026-27 shows its records and the untagged ones',      Object.keys(_fsess(sample, 'fees')).sort().join() === '__structure,a,b');
ok('...exactly as the old filter did for tests',           Object.keys(_fsess(sample, 'tests')).sort().join() === '__structure,a,b');
view('2027-28', '2026-27');
ok('fees in 2027-28 show only that year',                  Object.keys(_fsess(sample, 'fees')).sort().join() === '__structure,c' && _fsess(sample, 'fees').__structure.x === 2);
ok('a session\'s own store shows everything in it',        Object.keys(_fsess({ x: {}, y: { session: '2026-27' } }, 'tests')).sort().join() === 'x,y');
ok('no screen prints a fixed session',                     !src.split('\n').some(l => !/^\s*\/\//.test(l) && /Session 2026.27/.test(l)));

// ── rules ──
const emb = (() => { const i = src.indexOf('const FIRESTORE_RULES=`'); return src.slice(i + 23, src.indexOf('`', i + 23)); })();
ok('the rules in the app match firestore.rules exactly', emb === rules);
ok('the website registration rule is in the app copy',  emb.includes('isOnlineRegistration'));
const shape = /^[a-z]+-[0-9]{4}_[A-Za-z]+$/;
const existing = [...every, ...[...__BRANCH_SCOPED].flatMap(c => ['surajkund_' + c, 'maniram_' + c, 'allgirls_' + c])];
ok('the session rules cannot match any existing collection', !existing.some(c => shape.test(c)));
const sessRules = rules.slice(rules.indexOf('function sessRead('), rules.indexOf('match /{sess}/{sessId}'));
ok('every session collection can be read under a rule', [...__SESSION_STORE].every(c => sessRules.slice(0, sessRules.indexOf('function sessPlainWrite')).includes("'" + c + "'")));
ok('every session collection can be written under a rule', [...__SESSION_STORE].every(c => sessRules.slice(sessRules.indexOf('function sessPlainWrite')).includes("'" + c + "'")));
ok('the session rules sit above the costly branch blocks', rules.indexOf('match /{sess}/{sessId}') < rules.indexOf('match /{bc}/{id}'));

console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
