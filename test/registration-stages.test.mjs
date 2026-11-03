// Enquiry, then registration, then admission (2026-11-03). The helpers are pulled out of index.html so these
// can never pass against a copy. The fixture is the shape of the live desk on the day this shipped: nine
// records the desk had numbered REG/27-28/0001-0009 that were really enquiries, and one unpaid website form.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = i; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
const fee = src.match(/^var __REG_FEE=(\d+);/m);
if (!fee) { console.error('  missing __REG_FEE'); process.exit(2); }
globalThis.window = { __SESSION: '2026-27' };
globalThis.__BASE_SESSION = '2026-27';
const names = ['__nextSession', '__liveSession', '__admSession', '__regSession', '__regPrefix', '__enqPrefix', '__regIsLegacyDesk', '__regKind', '__regNoOf',
  '__isoLocalDay', '__regFeeOf', '__regNextNo', '__regNormalize', '__sessOfDate', '__regFeesOn', '__regIsCash'];
(0, eval)('var __REG_FEE=' + fee[1] + ';' + names.map(grab).join('\n') + '\n' + names.map(n => 'globalThis.' + n + '=' + n + ';').join('') + 'globalThis.__REG_FEE=__REG_FEE;');

let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };
const DAY = '2026-11-03';
const desk = Array.from({ length: 9 }, (_, i) => ({ id: 'reg_' + i, name: 'CHILD ' + i, contact: '90000000' + i, session: '2027-28', status: 'pending',
  source: i === 0 || i === 7 ? 'Phone call' : 'Walk-in', regNo: 'REG/27-28/' + String(i + 1).padStart(4, '0'), pipelineStage: 'new' }));
const web = { id: 'web_1', name: 'TEST ONLINE FORM', session: '2027-28', status: 'pending', source: 'Online form', regNo: 'WEB-DRA8B', payAmount: 500, payRef: '123456789012', payVerified: false };
const live = desk.concat([web]);
const asData = list => Object.fromEntries(list.map(r => [r.id, r]));

ok('the fee is ₹500', __REG_FEE === 500);

// ── today's nine are enquiries, under the same numbers
ok('a desk record from before is an enquiry',          desk.every(r => __regKind(r) === 'enquiry'));
ok('...shown as ENQ with its old number',               __regNoOf(desk[2]) === 'ENQ/27-28/0003');
ok('the next enquiry follows them',                     __regNextNo(live, '2027-28', 'enquiry') === 'ENQ/27-28/0010');
ok('REG numbering starts afresh',                       __regNextNo(live, '2027-28', 'registration') === 'REG/27-28/0001');
ok('none of them puts money in the Day Book',           __regFeesOn(asData(live), DAY, '2026-27').length === 0);

// ── the website form waits for the office
ok('an unapproved website form is not a registration',  __regKind(web) === 'enquiry');
ok('...keeps its website reference',                    __regNoOf(web) === 'WEB-DRA8B');
ok('...and is in no Day Book',                          __regFeeOf(web) === null);

// ── registering one of the nine at the desk
const reg = Object.assign(__regNormalize(desk[2]), { kind: 'registration', regNo: 'REG/27-28/0001', regFee: { amount: 500, mode: 'Cash', date: DAY, by: 'Office', at: DAY + 'T05:00:00.000Z' } });
const after = live.map(r => r.id === reg.id ? reg : r);
ok('it becomes a registration',                         __regKind(reg) === 'registration' && __regNoOf(reg) === 'REG/27-28/0001');
ok('it keeps its enquiry number',                       reg.enqNo === 'ENQ/27-28/0003' && reg.oldRegNo === 'REG/27-28/0003');
ok('the next registration is 0002',                     __regNextNo(after, '2027-28', 'registration') === 'REG/27-28/0002');
ok('enquiry numbering is untouched',                    __regNextNo(after, '2027-28', 'enquiry') === 'ENQ/27-28/0010');
const rows = __regFeesOn(asData(after), DAY, '2026-27');
ok('its fee is in that day\'s Day Book',                rows.length === 1 && rows[0].amount === 500 && rows[0].regNo === 'REG/27-28/0001');
ok('...as cash',                                        __regIsCash(rows[0]));
ok('...for the year RUNNING that day, not the year it is for', __regFeesOn(asData(after), DAY, '2027-28').length === 0);
ok('...and not on any other day',                       __regFeesOn(asData(after), '2026-11-04', '2026-27').length === 0);
ok('a deleted record leaves the Day Book',              __regFeesOn(asData(after.map(r => r.id === reg.id ? Object.assign({}, r, { deleted: true }) : r)), DAY, '2026-27').length === 0);

// ── a waiver registers without money
const waived = Object.assign({}, desk[4], { kind: 'registration', regNo: 'REG/27-28/0002', regFee: { amount: 0, mode: 'Waived', waivedReason: 'RTE', date: DAY } });
ok('a waived fee still registers',                      __regKind(waived) === 'registration');
ok('...but records no money',                           __regFeeOf(waived) === null && __regFeesOn(asData([waived]), DAY, '2026-27').length === 0);

// ── the Director cancels a registration
const cancelled = Object.assign({}, reg, { kind: 'enquiry', cancelledRegNo: reg.regNo, regFee: Object.assign({}, reg.regFee, { cancelled: { by: 'Director', reason: 'wrong child' } }) }); delete cancelled.regNo;
const afterCancel = live.map(r => r.id === reg.id ? cancelled : r);
ok('a cancelled registration is an enquiry again',      __regKind(cancelled) === 'enquiry' && __regNoOf(cancelled) === 'ENQ/27-28/0003');
ok('its fee leaves the Day Book',                       __regFeesOn(asData(afterCancel), DAY, '2026-27').length === 0);
ok('its number is never handed out again',              __regNextNo(afterCancel, '2027-28', 'registration') === 'REG/27-28/0002');

// ── the office approves the website payment
const approved = Object.assign({}, web, { payVerified: true, kind: 'registration', regNo: 'REG/27-28/0002', webRef: 'WEB-DRA8B', regFee: { amount: 500, mode: 'UPI', ref: '123456789012', date: '2026-11-05', online: true } });
ok('approval makes it a registration',                  __regKind(approved) === 'registration' && __regNoOf(approved) === 'REG/27-28/0002');
ok('...in the Day Book of the APPROVAL day',             __regFeesOn(asData([approved]), '2026-11-05', '2026-27').length === 1 && __regFeesOn(asData([approved]), DAY, '2026-27').length === 0);
ok('...as UPI, not cash',                               !__regIsCash(__regFeesOn(asData([approved]), '2026-11-05', '2026-27')[0]));
const oldApproved = Object.assign({}, web, { payVerified: true, payVerifiedAt: '2026-11-04T20:00:00.000Z' });
ok('a website payment approved before today still counts', __regKind(oldApproved) === 'registration' && __regFeeOf(oldApproved).amount === 500);
ok('...on the Indian date it was approved',             __regFeeOf(oldApproved).date === '2026-11-05');

// ── older records and other years
const admitted = { id: 'a', name: 'OLD', session: '2026-27', status: 'admitted', source: 'Walk-in', regNo: 'REG/26-27/0007' };
ok('an old record that was admitted stays a registration', __regKind(admitted) === 'registration' && __regNoOf(admitted) === 'REG/26-27/0007');
ok('...and its number stays in use in its own year',   __regNextNo([admitted], '2026-27', 'registration') === 'REG/26-27/0008');
ok('one year never moves another year\'s numbers',      __regNextNo(after.concat([admitted]), '2027-28', 'registration') === 'REG/27-28/0002');
ok('a new desk enquiry is explicit',                    __regKind({ kind: 'enquiry', enqNo: 'ENQ/27-28/0010', regNo: 'REG/27-28/0099' }) === 'enquiry');

// ── saving converts, it never renumbers
const n = __regNormalize(desk[0]);
ok('saving an old enquiry writes its kind and number',  n.kind === 'enquiry' && n.enqNo === 'ENQ/27-28/0001' && n.oldRegNo === 'REG/27-28/0001' && !('regNo' in n));
ok('saving an old admitted record keeps its number',    __regNormalize(admitted).kind === 'registration' && __regNormalize(admitted).regNo === 'REG/26-27/0007');
ok('a website form is left alone',                      JSON.stringify(__regNormalize(web)) === JSON.stringify(web));
ok('a record that is already explicit is left alone',   JSON.stringify(__regNormalize(reg)) === JSON.stringify(reg));
ok('the original object is not changed',                desk[0].regNo === 'REG/27-28/0001' && !desk[0].kind);

// ── the year running on a date
ok('November 2026 is in 2026-27',                       __sessOfDate('2026-11-03') === '2026-27');
ok('31 March 2027 is still 2026-27',                    __sessOfDate('2027-03-31') === '2026-27');
ok('1 April 2027 is 2027-28',                           __sessOfDate('2027-04-01') === '2027-28');
ok('no date gives no year',                             __sessOfDate('') === '');

// ── what the screens ship: read out of the source, so a refactor cannot drop it
const has = re => re.test(src);
ok('Admit refuses an enquiry',                         has(/if\(__regKind\(r\)!=="registration"\)\{window\.__toast&&window\.__toast\("Register "\+r\.name\+" first/));
ok('Admit is offered only on a registration',          has(/\{__regKind\(r\)==="registration"\s*\?<><button onClick=\{\(\)=>setStatus\(r,"admitted"\)\}/));
ok('a new enquiry gets an ENQ number, no REG number',  has(/const enqNo=__regNextNo\(sessRegs,regSess,"enquiry"\);/) && has(/Object\.assign\(\{\},f,\{kind:"enquiry",enqNo,session:regSess,/));
ok('registering takes the next REG number',            has(/regNo=__regNextNo\(regs,sess,"registration"\)/));
ok('a fee is refused while today is closed',           has(/if\(!waived&&dayClosed\(day\)\)/) && has(/if\(ok&&dayClosed\(today\(\)\)\)/));
ok('approval files the fee under today',               has(/regFee:\{amount:Number\(r\.payAmount\)\|\|0,mode:"UPI",ref:String\(r\.payRef\|\|""\),date:today\(\)/));
ok('the Day Book reads the running year',              has(/const regRows=__regFeesOn\(registrationsDB&&registrationsDB\.data,ledDate,session\);/));
ok('the fee total is still only fee receipts',         has(/const tot=rows\.reduce\(\(a,p\)=>a\+Number\(p\.amount\|\|0\),0\);/));
ok('the cash count includes registration cash',        has(/const drawerCash=dcCash\+regCash;/) && has(/const diff=Number\(countedCash\|\|0\)-drawerCash;/));
ok('the stored fee cash is unchanged in meaning',      has(/systemCash:dcCash,systemOnline:dcOnline,/) && has(/if\(regToday\.length\)\{rec\.regCount=regToday\.length;rec\.regCash=regCash;rec\.regOther=regOther;\}/));
ok('Fees is handed the registrations',                 has(/feeCloseDB=\{feeCloseDB\} registrationsDB=\{registrationsDB\}\/>/));
ok('the desk is handed the day closes',                has(/<Registration [^>]*feeCloseDB=\{feeCloseDB\}\/>/));
ok('the Excel import adds enquiries',                  has(/\{kind:"enquiry",enqNo:enqNo,session:impSess,/));

console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
