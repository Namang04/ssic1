// 2026-11-23: saving My Account replaced a parent's or teacher's whole profile with {name}, because it was
// built from usersDB.data, which those roles cannot LIST. Their role and child link (or classes) were gone,
// and the next sign-in fell through to the Director/VP menu. These pin the fix to the shipped source.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  let d = 0, j = i; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
(0, eval)(grab('__fillFromLogin') + '\nglobalThis.__fillFromLogin=__fillFromLogin;');
let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };
const has = (re) => re.test(src);

// ── the session fill from the login record ──
const acct = { username: '9450000000', role: 'parent', name: 'Parent of X', student: 'X Y', cls: 'Class 10', admNo: '123' };
let p = __fillFromLogin({ name: 'Parent of X' }, acct);
ok('an emptied parent gets the parent role back',     p.role === 'parent');
ok('...and the child link',                           p.student === 'X Y' && p.cls === 'Class 10' && p.admNo === '123');
p = __fillFromLogin({ name: 'T', role: 'teacher', classes: ['Class 6-A'] }, { role: 'admin' });
ok('a profile with a role keeps it',                  p.role === 'teacher' && p.classes.length === 1);
p = __fillFromLogin({ name: 'P', role: 'parent', cls: 'Class 9' }, acct);
ok('a key the profile has is never replaced',         p.cls === 'Class 9');
p = __fillFromLogin({ name: 'D' }, { role: 'disabled', prevRole: 'parent' });
ok('a disabled login gives no role',                  p.role === undefined);
ok('no login record changes nothing',                 JSON.stringify(__fillFromLogin({ name: 'Z' }, null)) === '{"name":"Z"}');
ok('an empty string counts as missing',               __fillFromLogin({ role: '' }, { role: 'teacher' }).role === 'teacher');

// ── wiring ──
ok('the sign-in form fills from the login',           has(/acctDoc=d;\}catch\(e\)\{\}/) && has(/__fillFromLogin\(userData,acctDoc\);/));
ok('a restored session fills from the login too',     has(/__fillFromLogin\(built,acc\);/));
const ai = src.indexOf('function AccountSettings('), acc = src.slice(ai, src.indexOf('\nfunction ', ai + 10)); // braces in its JSX defeat grab()
ok('My Account no longer writes a whole profile',     !/usersDB\.set\(user\.username/.test(acc));
ok('...it updates only its own fields',               /window\.__fbUpdateDoc\(window\.__fbDoc\(window\.__db,"users",safeId\(user\.username\)\),fields\)/.test(acc));
ok('...dropping any stored password',                 /const fields=Object\.assign\(\{password:window\.__fbDeleteField\(\)\}/.test(acc));
ok('...and a name only when renaming is allowed',     /canRename\?\{name:newName\}:\{\}/.test(acc));
ok('the first-password screen updates two fields',    has(/password:window\.__fbDeleteField\(\), pwdTemp:false\n\s*\}\);\}catch\(e2\)/) && !has(/const\{password:_drop,\.\.\.rest\}=user;return rest;/));
ok('an unknown role gets no staff menu',              src.indexOf('if(!(isParent||isOffice||isTeacher||isAdmin||user.role==="vp")) return(') > 0
  && src.indexOf('if(!(isParent||isOffice||isTeacher||isAdmin||user.role==="vp")) return(') < src.indexOf('const NAV_GROUPS = isParent ?'));
ok('...and is told to contact the office',            has(/This login is not set up yet/));
ok('the parent page survives a missing class',        has(/const\{student\}=user;const cls=user\.cls\|\|"";/));
ok('the Director can repair emptied profiles',        has(/const repairStripped=async\(\)=>\{/) && has(/logAudit\("profile-repair","users",r\.un,\{role:null\},r\.fix\)/));
ok('...by merge, never a whole-document write',       has(/await window\.__fbUpdateDoc\(window\.__fbDoc\(window\.__db,"users",safeId\(r\.un\)\),r\.fix\);/));
ok('...seeded staff are never listed',                has(/const seed=DEFAULT_USERS\[un\];if\(\(u\.role!=null&&u\.role!==""\)\|\|\(seed&&seed\.role\)\)return;/));
ok('...Director and VP logins are left to a person',  has(/byHand:role==="admin"\|\|role==="vp"/) && has(/const list=stripped\.filter\(r=>!r\.byHand\)/));

console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
