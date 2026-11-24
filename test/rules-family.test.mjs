// Family scoping (23 November 2026). A parent login was shown the staff dashboard with whole-school numbers,
// because tests, attendance, students and academicRoster (which carries parent phone numbers) were readable by
// ANY signed-in user. These cases pin the fix: a parent or student reaches only their own child's class.
//
//   npx firebase emulators:exec --only firestore "node --test test/rules-family.test.mjs"
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'ssic-rules-family',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const put = (p, d) => setDoc(doc(db, p), d);
  // accounts are the rules-authoritative role; users carry the class the app shows the family.
  await put('accounts/uid-parent',  { role: 'parent',  username: '9450000001', admNo: '1001', branches: ['greencity'] });
  await put('users/9450000001',     { username: '9450000001', role: 'parent', name: 'Parent of Aarav', cls: 'Class 9', admNo: '1001' });
  await put('accounts/uid-student', { role: 'student', username: 'aarav', branches: ['greencity'] });
  await put('users/aarav',          { username: 'aarav', role: 'student', name: 'Aarav', cls: 'Class 9' });
  // The account in the incident: a parent whose profile has NO role. Rules go by the accounts role.
  await put('accounts/uid-norole',  { role: 'parent',  username: '9450000003', admNo: '1003', branches: ['greencity'] });
  await put('users/9450000003',     { username: '9450000003', name: 'Parent of Kabir', cls: 'Class 9', admNo: '1003' });
  await put('accounts/uid-disabled',{ role: 'disabled', prevRole: 'parent', username: '9450000004', branches: ['greencity'] });
  await put('users/9450000004',     { username: '9450000004', role: 'parent', cls: 'Class 9' });
  await put('accounts/uid-sk',      { role: 'parent',  username: '9450000005', admNo: '5001', branches: ['surajkund'] });
  await put('users/9450000005',     { username: '9450000005', role: 'parent', cls: 'Class 5', admNo: '5001' });
  await put('accounts/uid-teacher', { role: 'teacher', username: 'deepanjali', branches: ['greencity'] });
  await put('users/deepanjali',     { username: 'deepanjali', role: 'teacher', classes: ['Class 9-A'] });
  await put('accounts/uid-office',  { role: 'office',  username: 'office', branches: ['greencity'] });
  await put('accounts/uid-skteacher', { role: 'teacher', username: 'skt', branches: ['surajkund'] });
  await put('users/skt',            { username: 'skt', role: 'teacher', classes: ['Class 5-A'] });
  await put('accounts/uid-skoffice',{ role: 'office',  username: 'sko', branches: ['surajkund'] });
  await put('accounts/uid-dir',     { role: 'admin',   username: 'director', branches: ['all'] });

  for (const [c, n] of [['Class 9', 9], ['Class 10', 10]]) {
    await put(`tests/t${n}`, { cls: c, subj: 'Maths', marks: { '1001': 18 } });
    await put(`attendance/a${n}`, { cls: c, date: '2026-11-23', absent: ['1002'] });
    await put(`students/Class_${n}`, { list: ['Aarav', 'Kabir'] });
    await put(`academicRoster/Class_${n}`, { students: [{ admNo: '1001', name: 'Aarav', parentPhone: '9450000001' }] });
    await put(`greencity-2728_tests/t${n}`, { cls: c, subj: 'Maths' });
  }
  for (const [c, n] of [['Class 5', 5], ['Class 6', 6]]) {
    await put(`surajkund_tests/t${n}`, { cls: c, subj: 'Maths' });
    await put(`surajkund_attendance/a${n}`, { cls: c, date: '2026-11-23' });
    await put(`surajkund_academicRoster/Class_${n}`, { students: [] });
  }
  await put('studentPhotos/1001', { admNo: '1001', img: 'x' });
  await put('studentPhotos/1002', { admNo: '1002', img: 'y' });
  await put('wrongAnswers/w1', { username: 'aarav', chapter: 'Algebra' });
  await put('wrongAnswers/w2', { username: 'someone-else', chapter: 'Algebra' });
  await put('staffAttendance/s1', { username: 'deepanjali', date: '2026-11-23' });
  await put('leaves/l1', { teacherId: 'deepanjali', status: 'approved' });
  await put('lessonPlans/p1', { teacherId: 'deepanjali' });
  await put('studentLinks/k1', { name: 'Aarav', admNo: '1001' });
  await put('notices/n1', { title: 'Holiday', active: true });
  await put('topics/c1', { chapter: 'Algebra' });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const byCls = (db, coll, c) => getDocs(query(collection(db, coll), where('cls', '==', c)));

// ── Parents: own class only ──────────────────────────────────────────────────
test('parent reads own class tests by query', () => assertSucceeds(byCls(as('uid-parent'), 'tests', 'Class 9')));
test('parent cannot query another class tests', () => assertFails(byCls(as('uid-parent'), 'tests', 'Class 10')));
test('parent cannot list every test', () => assertFails(getDocs(collection(as('uid-parent'), 'tests'))));
test('parent cannot get another class test doc', () => assertFails(getDoc(doc(as('uid-parent'), 'tests/t10'))));
test('parent reads own class attendance', () => assertSucceeds(byCls(as('uid-parent'), 'attendance', 'Class 9')));
test('parent cannot list all attendance', () => assertFails(getDocs(collection(as('uid-parent'), 'attendance'))));
test('parent reads own class student list', () => assertSucceeds(getDoc(doc(as('uid-parent'), 'students/Class_9'))));
test('parent cannot read another class student list', () => assertFails(getDoc(doc(as('uid-parent'), 'students/Class_10'))));
test('parent cannot list students', () => assertFails(getDocs(collection(as('uid-parent'), 'students'))));
test('parent reads own class roster', () => assertSucceeds(getDoc(doc(as('uid-parent'), 'academicRoster/Class_9'))));
test('parent cannot read another class roster (parent phones)', () => assertFails(getDoc(doc(as('uid-parent'), 'academicRoster/Class_10'))));
test('parent cannot list the roster', () => assertFails(getDocs(collection(as('uid-parent'), 'academicRoster'))));
test('parent reads own child photo', () => assertSucceeds(getDoc(doc(as('uid-parent'), 'studentPhotos/1001'))));
test('parent cannot read another child photo', () => assertFails(getDoc(doc(as('uid-parent'), 'studentPhotos/1002'))));
for (const c of ['staffAttendance/s1', 'leaves/l1', 'lessonPlans/p1', 'studentLinks/k1']) {
  test(`parent cannot read ${c}`, () => assertFails(getDoc(doc(as('uid-parent'), c))));
  test(`teacher still reads ${c}`, () => assertSucceeds(getDoc(doc(as('uid-teacher'), c))));
}
test('parent still reads notices and topics', async () => {
  await assertSucceeds(getDoc(doc(as('uid-parent'), 'notices/n1')));
  await assertSucceeds(getDoc(doc(as('uid-parent'), 'topics/c1')));
});

// ── The incident account: profile with no role ───────────────────────────────
test('role-less parent profile still gets only its own class', async () => {
  await assertSucceeds(byCls(as('uid-norole'), 'tests', 'Class 9'));
  await assertFails(getDocs(collection(as('uid-norole'), 'tests')));
  await assertFails(getDocs(collection(as('uid-norole'), 'academicRoster')));
});
test('disabled account reads no student data', async () => {
  await assertFails(byCls(as('uid-disabled'), 'tests', 'Class 9'));
  await assertFails(getDoc(doc(as('uid-disabled'), 'students/Class_9')));
});

// ── A family cannot move itself into another class ───────────────────────────
test('parent cannot change own class', () =>
  assertFails(updateDoc(doc(as('uid-parent'), 'users/9450000001'), { cls: 'Class 10' })));
test('parent cannot change own admission no', () =>
  assertFails(updateDoc(doc(as('uid-parent'), 'users/9450000001'), { admNo: '1002' })));
test('parent can still save a phone number', () =>
  assertSucceeds(updateDoc(doc(as('uid-parent'), 'users/9450000001'), { phone: '9450000001' })));
test('parent can still clear the temporary-password flag (whole-doc write)', () =>
  assertSucceeds(setDoc(doc(as('uid-parent'), 'users/9450000001'),
    { username: '9450000001', role: 'parent', name: 'Parent of Aarav', cls: 'Class 9', admNo: '1001', phone: '9450000001', pwdTemp: false })));

// ── Students ─────────────────────────────────────────────────────────────────
test('student reads own class tests', () => assertSucceeds(byCls(as('uid-student'), 'tests', 'Class 9')));
test('student cannot list every test', () => assertFails(getDocs(collection(as('uid-student'), 'tests'))));
test('student reads own class student list', () => assertSucceeds(getDoc(doc(as('uid-student'), 'students/Class_9'))));
test('student reads own practice mistakes', () =>
  assertSucceeds(getDocs(query(collection(as('uid-student'), 'wrongAnswers'), where('username', '==', 'aarav')))));
test('student cannot list everyone\'s practice mistakes', () => assertFails(getDocs(collection(as('uid-student'), 'wrongAnswers'))));

// ── Staff unchanged ──────────────────────────────────────────────────────────
test('teacher lists all tests', () => assertSucceeds(getDocs(collection(as('uid-teacher'), 'tests'))));
test('teacher lists the roster', () => assertSucceeds(getDocs(collection(as('uid-teacher'), 'academicRoster'))));
test('office lists attendance', () => assertSucceeds(getDocs(collection(as('uid-office'), 'attendance'))));

// ── Other campuses and later sessions ────────────────────────────────────────
test('Surajkund parent reads own class tests', () => assertSucceeds(byCls(as('uid-sk'), 'surajkund_tests', 'Class 5')));
test('Surajkund parent cannot read another class tests', () => assertFails(byCls(as('uid-sk'), 'surajkund_tests', 'Class 6')));
test('Surajkund parent cannot list attendance', () => assertFails(getDocs(collection(as('uid-sk'), 'surajkund_attendance'))));
test('Surajkund parent reads own class attendance', () => assertSucceeds(byCls(as('uid-sk'), 'surajkund_attendance', 'Class 5')));
test('Surajkund parent cannot read another class roster', () => assertFails(getDoc(doc(as('uid-sk'), 'surajkund_academicRoster/Class_6'))));
test('Surajkund parent cannot read Greencity tests', () => assertFails(byCls(as('uid-sk'), 'tests', 'Class 5')));
test('next-session: parent reads own class only', async () => {
  await assertSucceeds(byCls(as('uid-parent'), 'greencity-2728_tests', 'Class 9'));
  await assertFails(getDocs(collection(as('uid-parent'), 'greencity-2728_tests')));
});
test('Surajkund teacher lists campus tests', () => assertSucceeds(getDocs(collection(as('uid-skteacher'), 'surajkund_tests'))));
test('Surajkund teacher lists campus attendance', () => assertSucceeds(getDocs(collection(as('uid-skteacher'), 'surajkund_attendance'))));
test('Surajkund office lists campus roster', () => assertSucceeds(getDocs(collection(as('uid-skoffice'), 'surajkund_academicRoster'))));
test('Director lists Surajkund tests and Greencity roster', async () => {
  await assertSucceeds(getDocs(collection(as('uid-dir'), 'surajkund_tests')));
  await assertSucceeds(getDocs(collection(as('uid-dir'), 'academicRoster')));
});
test('staff cross-campus roster read is unchanged by this fix', () => assertSucceeds(getDocs(collection(as('uid-skteacher'), 'academicRoster'))));
test('next-session: teacher lists tests', () => assertSucceeds(getDocs(collection(as('uid-teacher'), 'greencity-2728_tests'))));

test.after(() => env.cleanup());
