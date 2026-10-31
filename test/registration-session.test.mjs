// Registrations carry the session they are FOR (2026-10-31). Admissions for the next academic year open
// months before that year starts, so an enquiry taken today may belong to 2027-28 while the school runs
// 2026-27. The helpers are pulled out of index.html so these can never pass against a copy.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = i; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
globalThis.window = { __SESSION: '2026-27' };
globalThis.__BASE_SESSION = '2026-27';
(0, eval)([grab('__nextSession'), grab('__liveSession'), grab('__admSession'), grab('__regSession'), grab('__regPrefix'), grab('__regSessions')].join('\n') +
  '\nglobalThis.__nextSession=__nextSession;globalThis.__liveSession=__liveSession;globalThis.__admSession=__admSession;' +
  'globalThis.__regSession=__regSession;globalThis.__regPrefix=__regPrefix;globalThis.__regSessions=__regSessions;');

let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };

// ── the session arithmetic ──
ok('2026-27 rolls to 2027-28',                 __nextSession('2026-27') === '2027-28');
ok('2027-28 rolls to 2028-29',                 __nextSession('2027-28') === '2028-29');
ok('a century rollover keeps two digits',      __nextSession('2099-00') === '2100-01');
ok('junk gives nothing to guess from',         __nextSession('') === '' && __nextSession('next year') === '');
ok('a malformed session never becomes a year', __nextSession('2026') === '' && __nextSession('26-27') === '');

// ── which session a new enquiry is filed under ──
ok('the desk defaults to NEXT year',           __admSession() === '2027-28');
ok('the live session is what the school runs', __liveSession() === '2026-27');

// ── a record's own session ──
ok('a record carries its session',             __regSession({ session: '2027-28' }) === '2027-28');
ok('the website form\'s session is honoured',  __regSession({ source: 'Online form', session: '2027-28' }) === '2027-28');
ok('a record saved before this reads as 2026-27', __regSession({ name: 'Old enquiry' }) === '2026-27');
ok('...even once a later session is live',       (() => { window.__LIVE_SESSION = '2027-28'; const r = __regSession({ name: 'Old enquiry' }) === '2026-27'; delete window.__LIVE_SESSION; return r; })());
ok('...and so does an empty one',              __regSession({ session: '' }) === '2026-27' && __regSession(null) === '2026-27');

// ── Reg No prefix ──
ok('next year is numbered REG/27-28/',         __regPrefix('2027-28') === 'REG/27-28/');
ok('this year is numbered REG/26-27/',         __regPrefix('2026-27') === 'REG/26-27/');
ok('no session falls back to the desk default',__regPrefix('') === 'REG/27-28/');

// ── the session list offered on the desk ──
const regs = [{ session: '2027-28' }, { session: '2026-27' }, { name: 'legacy' }, { session: '2025-26' }];
const list = __regSessions(regs);
ok('every session with enquiries is offered',  list.includes('2025-26') && list.includes('2026-27') && list.includes('2027-28'));
ok('newest first',                             list[0] === '2027-28' && list[list.length - 1] === '2025-26');
ok('next year is offered even with no records',__regSessions([]).includes('2027-28'));
ok('...and so is the year in progress',        __regSessions([]).includes('2026-27'));
ok('no duplicates',                            new Set(list).size === list.length);

// ── what the desk actually ships: read it out of the source, so a refactor cannot drop it ──
ok('a new enquiry stores its session',         /Object\.assign\(\{\},f,\{regNo,session:regSess,/.test(src));
ok('the Reg No year comes from that session',  /const _regPfx=__regPrefix\(regSess\);/.test(src));
ok('numbering runs within the session',        /const _maxReg=sessRegs\.reduce/.test(src));
ok('the list is scoped to the session',        /const sessRegs=useMemo\(\(\)=>regs\.filter\(r=>__regSession\(r\)===regSess\)/.test(src));
ok('the counts are scoped too',                /const counts=\{pending:sessRegs\./.test(src));
ok('a duplicate is judged within the session', /const dup=sessRegs\.find/.test(src));
ok('the bulk import stamps the session',       /\{regNo:regNo,session:impSess,/.test(src));
ok('...and numbers within it',                 /__regSession\(r\)!==impSess\)return m;/.test(src));
ok('other sessions are surfaced, not hidden',  /const otherSess=useMemo/.test(src) && /Not shown here:/.test(src));

console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
