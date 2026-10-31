// Firestore rules for session stores, "<branch>-<yyyy>_<base>". Same setup as rules.test.mjs (needs the emulator):
//   npx firebase emulators:exec --only firestore "node --test test/rules-session.test.mjs"
// A session store must keep every protection Greencity has today, so these check the refusals as hard as the grants.
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'ssic-rules-session', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
const G = 'greencity-2728_';
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const acct = (u, o) => setDoc(doc(db, 'accounts/' + u), o);
  await acct('dir', { role: 'admin', username: 'director' });
  await acct('vp', { role: 'vp', username: 'vp' });
  await acct('office', { role: 'office', username: 'off' });
  await acct('allOffice', { role: 'office', username: 'off2', branches: ['all'] });
  await acct('surajOffice', { role: 'office', username: 'off3', branches: ['surajkund'] });
  await acct('teacher', { role: 'teacher', username: 'deepanjali' });
  await acct('parent', { role: 'parent', username: '98', admNo: '1003' });
  await setDoc(doc(db, 'users/deepanjali'), { username: 'deepanjali', role: 'teacher', classes: ['Class 7-A'], subjects: ['Mathematics'], teachingPairs: ['Class 7-A|Mathematics'], classTeacherOf: ['Class 7-A'] });
  await setDoc(doc(db, G + 'exams/e1'), { name: 'HY', cls: 'Class 7', published: false, reviewStatus: 'needs-review', reviewedAt: '', reviewedBy: '', marks: {} });
  await setDoc(doc(db, G + 'exams/e2'), { name: 'HY', cls: 'Class 7', published: true, marks: {} });
  await setDoc(doc(db, G + 'studentDirectory/dir_7'), { students: [] });
  await setDoc(doc(db, G + 'notices/n1'), { title: 'x' });
  await setDoc(doc(db, G + 'copyChecks/c1'), { a: 1 });
  await setDoc(doc(db, 'surajkund-2728_studentDirectory/dir_7'), { students: [] });
});
const as = (u) => env.authenticatedContext(u).firestore();
const R = (u, p) => getDoc(doc(as(u), p));
const W = (u, p, v = { a: 1 }) => setDoc(doc(as(u), p), v);

test('office can run the admissions desk in next year', async () => {
  await assertSucceeds(R('office', G + 'studentDirectory/dir_7'));
  await assertSucceeds(W('office', G + 'studentDirectory/dir_8', { students: [] }));
  await assertSucceeds(W('office', G + 'admissions/a1'));
  await assertSucceeds(W('office', G + 'academicRoster/Class_7'));
  await assertSucceeds(W('office', G + 'students/Class_7'));
});
test('an account with branches [all] reaches a Greencity session', async () => { await assertSucceeds(W('allOffice', G + 'admissions/a2')); });
test('a teacher never reads the full student directory', async () => {
  await assertFails(R('teacher', G + 'studentDirectory/dir_7'));
  await assertFails(W('teacher', G + 'studentDirectory/dir_7', { students: [] }));
});
test('a parent never reads the directory or admissions', async () => {
  await assertFails(R('parent', G + 'studentDirectory/dir_7'));
  await assertFails(R('parent', G + 'admissions/a1'));
});
test('tests: a teacher writes, office does not, a parent reads', async () => {
  await assertSucceeds(W('teacher', G + 'tests/t1'));
  await assertFails(W('office', G + 'tests/t2'));
  await assertSucceeds(R('parent', G + 'tests/t1'));
  await assertFails(W('parent', G + 'tests/t3'));
});
test('exams: a teacher cannot create or delete, the VP can', async () => {
  await assertFails(W('teacher', G + 'exams/e9'));
  await assertFails(deleteDoc(doc(as('teacher'), G + 'exams/e1')));
  await assertSucceeds(W('vp', G + 'exams/e9'));
});
test('exams: a teacher may enter marks but not change the exam itself', async () => {
  await assertSucceeds(updateDoc(doc(as('teacher'), G + 'exams/e1'), { marks: { a: 1 } }));
  await assertFails(updateDoc(doc(as('teacher'), G + 'exams/e1'), { name: 'Changed' }));
  await assertFails(updateDoc(doc(as('teacher'), G + 'exams/e1'), { published: true }));
  await assertFails(updateDoc(doc(as('teacher'), G + 'exams/e2'), { marks: { a: 2 } }));
});
test('a parent never reads exam registers', async () => { await assertFails(R('parent', G + 'exams/e1')); });
test('timetable: everyone reads, a teacher cannot edit', async () => {
  await assertSucceeds(W('vp', G + 'timetables/7_A'));
  await assertSucceeds(R('teacher', G + 'timetables/7_A'));
  await assertFails(W('teacher', G + 'timetables/7_A'));
  await assertFails(W('office', G + 'timetables/7_A'));
});
test('attendance: a teacher marks only their own class', async () => {
  await assertSucceeds(W('teacher', G + 'attendance/x1', { cls: 'Class 7', section: 'A', date: '2027-04-05', status: {} }));
  await assertFails(W('teacher', G + 'attendance/x2', { cls: 'Class 9', section: 'B', date: '2027-04-05', status: {} }));
  await assertSucceeds(R('parent', G + 'attendance/x1'));
});
test('class log: only under their own name, in their own class', async () => {
  await assertSucceeds(W('teacher', G + 'teacherLogs/l1', { teacherId: 'deepanjali', cls: 'Class 7', section: 'A', sec: 'A', subject: 'Mathematics', subj: 'Mathematics' }));
  await assertFails(W('teacher', G + 'teacherLogs/l2', { teacherId: 'someone', cls: 'Class 7', section: 'A', sec: 'A', subject: 'Mathematics', subj: 'Mathematics' }));
});
test('copy checks stay hidden from parents', async () => {
  await assertSucceeds(R('teacher', G + 'copyChecks/c1'));
  await assertFails(R('parent', G + 'copyChecks/c1'));
});
test('notices: a parent reads and may only acknowledge', async () => {
  await assertSucceeds(R('parent', G + 'notices/n1'));
  await assertSucceeds(updateDoc(doc(as('parent'), G + 'notices/n1'), { readBy: ['98'] }));
  await assertFails(updateDoc(doc(as('parent'), G + 'notices/n1'), { title: 'y' }));
});
test('a campus session stays with that campus', async () => {
  await assertFails(R('surajOffice', G + 'studentDirectory/dir_7'));
  await assertSucceeds(R('surajOffice', 'surajkund-2728_studentDirectory/dir_7'));
  await assertFails(R('office', 'surajkund-2728_studentDirectory/dir_7'));
});
test('the Director reaches any session', async () => {
  await assertSucceeds(R('dir', G + 'studentDirectory/dir_7'));
  await assertSucceeds(W('dir', G + 'exams/e10'));
  await assertSucceeds(W('dir', 'surajkund-2728_tests/t1'));
});
test('a name that is not a session store is refused', async () => {
  await assertFails(W('teacher', 'greencity-27_tests/t1'));
  await assertFails(W('teacher', 'greencity-2728_madeUp/t1'));
  await assertFails(R('office', 'greencity-2728_fees/r1'));
});
test('next year\'s fee structure stays Director-only', async () => {
  await assertSucceeds(W('dir', 'fees/__structure__y2728', { classes: {} }));
  await assertFails(W('office', 'fees/__structure__y2728', { classes: {} }));
});
test.after(async () => { await env.cleanup(); });
