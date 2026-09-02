// Firestore rules tests. Every case here is a permission failure that reached live staff on
// 2 September 2026 - each one would have been caught before deploy by running this.
//
//   brew install openjdk        (the Firestore emulator needs a JRE)
//   npm i -D @firebase/rules-unit-testing firebase-tools
//   npx firebase emulators:exec --only firestore "node --test test/rules.test.mjs"
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'ssic-rules-test',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
});

// Seed the accounts/users documents the rules read, bypassing rules.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'accounts/uid-director'), { role: 'admin', username: 'director' });
  await setDoc(doc(db, 'accounts/uid-vp'),       { role: 'vp',    username: 'vp' });
  await setDoc(doc(db, 'accounts/uid-teacher'),  { role: 'teacher', username: 'deepanjali' });
  // A teacher assigned CLASSES but no subjects - the shape that denied every class-log write.
  await setDoc(doc(db, 'users/deepanjali'), {
    username: 'deepanjali', role: 'teacher',
    classes: ['Class 7-A'], subjects: [], teachingPairs: [], classTeacherOf: []
  });
  await setDoc(doc(db, 'users/arun'), { username: 'arun', role: 'teacher' }); // NO role-bearing fields
});

const as = (uid) => env.authenticatedContext(uid).firestore();

test('Director can save a staff assignment', async () => {
  await assertSucceeds(setDoc(doc(as('uid-director'), 'users/arun'),
    { username: 'arun', role: 'teacher', classes: ['Class 8-A'] }));
});

test('Director can write the shared class-teacher map', async () => {
  await assertSucceeds(setDoc(doc(as('uid-director'), 'users/__classTeachers'),
    { map: { 'Class 7-A': ['deepanjali'] } }));
});

test('VP can save a staff assignment', async () => {
  await assertSucceeds(setDoc(doc(as('uid-vp'), 'users/arun'),
    { username: 'arun', role: 'teacher', classes: ['Class 8-B'] }));
});

test('VP can write the shared class-teacher map', async () => {
  await assertSucceeds(setDoc(doc(as('uid-vp'), 'users/__classTeachers'),
    { map: { 'Class 7-A': ['deepanjali', 'shreya'] } }));
});

test('a staff record carrying no role field is still writable by the VP', async () => {
  // Several real staff docs have no role. Rejecting them failed the whole multi-document save.
  await assertSucceeds(setDoc(doc(as('uid-vp'), 'users/arun'), { username: 'arun', classes: ['Class 9-A'] }));
});

test('VP cannot promote anyone to admin', async () => {
  await assertFails(setDoc(doc(as('uid-vp'), 'users/arun'), { username: 'arun', role: 'admin' }));
});

test('a teacher with classes but NO subjects can still write a class log', async () => {
  await assertSucceeds(setDoc(doc(as('uid-teacher'), 'teacherLogs/log1'), {
    teacherId: 'deepanjali', class: 'Class 7', section: 'A', subject: 'Mathematics', date: '2026-08-10'
  }));
});

test('a teacher cannot write a log in another teacher name', async () => {
  await assertFails(setDoc(doc(as('uid-teacher'), 'teacherLogs/log2'), {
    teacherId: 'shreya', class: 'Class 7', section: 'A', subject: 'Mathematics'
  }));
});

test.after(async () => { await env.cleanup(); });
