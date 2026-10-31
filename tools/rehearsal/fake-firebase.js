// An in-memory Firebase for rehearsing the REAL app with no connection to production. tools/rehearsal/build.mjs swaps
// the CDN imports in a copy of the built page for this file, so React, every screen and every write path run for
// real. Choose who is signed in with ?as=director|office|vp|teacher|parent|leftparent, and ?reset=1 to reseed.
// Like real Firestore it refuses undefined field values, which a mock normally lets through.
const LS = '__rehearsal_fs';
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const params = new URLSearchParams(location.search);
if (params.get('reset')) localStorage.removeItem(LS);
let FS; try { FS = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { FS = null; }
if (!FS) { FS = window.__REHEARSAL_SEED ? clone(window.__REHEARSAL_SEED) : {}; }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(FS)); } catch (e) {} };
save();
const listeners = new Set();
window.__FS = { data: () => FS, get: (c, id) => (FS[c] || {})[id], names: () => Object.keys(FS).sort(), live: () => [...new Set([...listeners].map(l => l.src.name || l.src.coll))].sort(), writes: [] };
const SERVER = { __server: true }, DELETE = { __delete: true };
function checkVal(v, path) {
  if (v === undefined) throw new Error('Function setDoc() called with invalid data. Unsupported field value: undefined (found in field ' + path + ')');
  if (v && typeof v === 'object' && !v.__server && !v.__delete && !v.__union) { if (Array.isArray(v)) v.forEach((x, i) => checkVal(x, path + '[' + i + ']')); else Object.keys(v).forEach(k => checkVal(v[k], path + '.' + k)); }
}
function resolve(v, cur) {
  if (v && v.__server) return new Date().toISOString();
  if (v && v.__union) return [...new Set([...(Array.isArray(cur) ? cur : []), ...v.__union])];
  if (v && typeof v === 'object' && !Array.isArray(v)) { const o = {}; Object.keys(v).forEach(k => { if (v[k] && v[k].__delete) return; o[k] = resolve(v[k], cur && cur[k]); }); return o; }
  return clone(v);
}
const snapDoc = (coll, id) => { const d = (FS[coll] || {})[id]; return { id, exists: () => d !== undefined, data: () => clone(d), metadata: { fromCache: false } }; };
function runQuery(src) {
  const m = FS[src.name] || {}; let ids = Object.keys(m);
  (src.filters || []).forEach(f => { ids = ids.filter(id => { const v = m[id][f.f]; if (v === undefined) return false; return f.op === '>=' ? v >= f.v : f.op === '<=' ? v <= f.v : f.op === '==' ? v === f.v : true; }); });
  const docs = ids.map(id => snapDoc(src.name, id));
  return { docs, size: docs.length, empty: !docs.length, forEach: (fn) => docs.forEach(fn) };
}
const emit = (l) => { try { l.cb(l.src.kind === 'doc' ? snapDoc(l.src.coll, l.src.id) : runQuery(l.src)); } catch (e) { console.error(e); } };
const touch = (coll) => setTimeout(() => listeners.forEach(l => { if ((l.src.name || l.src.coll) === coll) emit(l); }), 0);
const write = (coll, id, val) => { (FS[coll] = FS[coll] || {})[id] = val; save(); window.__FS.writes.push(coll + '/' + id); touch(coll); };

export const initializeApp = () => ({}), deleteApp = async () => {}, getFirestore = () => ({}), initializeFirestore = () => ({}), persistentLocalCache = () => ({}), persistentMultipleTabManager = () => ({});
export const collection = (db, name) => ({ kind: 'coll', name });
export const doc = (db, coll, id) => ({ kind: 'doc', coll, id: String(id) });
export const where = (f, op, v) => ({ f, op, v });
export const query = (ref, ...filters) => ({ kind: 'query', name: ref.name, filters });
export const serverTimestamp = () => SERVER, deleteField = () => DELETE, arrayUnion = (...a) => ({ __union: a });
export class FieldPath { constructor(...p) { this.p = p; } }
export const getDoc = async (r) => snapDoc(r.coll, r.id), getDocFromServer = getDoc;
export const getDocs = async (s) => runQuery(s);
export async function setDoc(r, val, opts) { checkVal(val, 'data'); const cur = (FS[r.coll] || {})[r.id]; write(r.coll, r.id, opts && opts.merge ? Object.assign({}, cur, resolve(val, cur)) : resolve(val)); }
export async function updateDoc(r, fields) { checkVal(fields, 'data'); const cur = (FS[r.coll] || {})[r.id]; if (cur === undefined) throw new Error('No document to update: ' + r.coll + '/' + r.id);
  const next = clone(cur); Object.keys(fields).forEach(k => { const path = k.split('.'); let o = next; path.slice(0, -1).forEach(p => { o = o[p] = o[p] || {}; }); const last = path[path.length - 1]; if (fields[k] && fields[k].__delete) delete o[last]; else o[last] = resolve(fields[k], o[last]); }); write(r.coll, r.id, next); }
export async function deleteDoc(r) { if (FS[r.coll]) { delete FS[r.coll][r.id]; save(); touch(r.coll); } }
export function onSnapshot(src, cb) { const l = { src, cb }; listeners.add(l); setTimeout(() => emit(l), 0); return () => listeners.delete(l); }
export async function runTransaction(db, fn) { return fn({ get: async (r) => snapDoc(r.coll, r.id), set: (r, v, o) => { setDoc(r, v, o); }, update: (r, v) => { updateDoc(r, v); } }); }
const AS = { director: 'u_dir', office: 'u_off', vp: 'u_vp', teacher: 'u_t', parent: 'u_p', leftparent: 'u_lp' };
const who = params.get('as') || localStorage.getItem('__rehearsal_as') || 'director'; localStorage.setItem('__rehearsal_as', who);
const authUser = { uid: AS[who] || AS.director, email: who + '@ssic-portal.app' };
export const getAuth = () => ({ currentUser: authUser }), signInWithEmailAndPassword = async () => ({ user: authUser }), createUserWithEmailAndPassword = async () => ({ user: authUser }), signOut = async () => {}, updatePassword = async () => {};
export const onAuthStateChanged = (a, cb) => { setTimeout(() => cb(authUser), 0); return () => {}; };
export const getFunctions = () => ({}), httpsCallable = () => async () => { const e = new Error('internal'); e.code = 'internal'; throw e; };
