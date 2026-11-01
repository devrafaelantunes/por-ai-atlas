import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, onSnapshot, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyBSjCjlaS6y6HL4rgyX9witxCiKcmi8y30',
  authDomain: 'por-ai-atlas.firebaseapp.com',
  projectId: 'por-ai-atlas',
  appId: '1:787502321483:web:e1200b844b10953cd022ce'
});
const auth = getAuth(app);
const db = getFirestore(app);
const OWNER_KEY = 'porai-atlas-owner-v1';
const atlas = owner => doc(db, 'atlases', owner);
const entries = owner => collection(atlas(owner), 'countries');
const members = owner => collection(atlas(owner), 'members');
const requests = owner => collection(atlas(owner), 'requests');

export async function identity() {
  if (auth.currentUser) return auth.currentUser.uid;
  await auth.authStateReady();
  return auth.currentUser?.uid || (await signInAnonymously(auth)).user.uid;
}
export function ownerFor(uid) { return localStorage.getItem(OWNER_KEY) || uid; }
export function setOwner(uid) { localStorage.setItem(OWNER_KEY, uid); }
export function isOwner(uid, owner) { return uid === owner; }
export function watchMember(owner, uid, next, error) {
  if (owner === uid) { next(true); return () => {}; }
  return onSnapshot(doc(members(owner), uid), snapshot => next(snapshot.exists()), error);
}
export function watchEntries(owner, next, error) {
  return onSnapshot(entries(owner), snapshot => {
    next(Object.fromEntries(snapshot.docs.map(d => [d.id, d.data()])));
  }, error);
}
export async function uploadMissing(owner, missing) {
  const existing = new Set((await getDocs(entries(owner))).docs.map(d => d.id));
  const todo = Object.entries(missing).filter(([code]) => !existing.has(code));
  for (let i = 0; i < todo.length; i += 400) {
    const batch = writeBatch(db);
    for (const [code, value] of todo.slice(i, i + 400)) batch.set(doc(entries(owner), code), value);
    await batch.commit();
  }
}
export async function saveCountry(owner, code, value) {
  if (value) await setDoc(doc(entries(owner), code), value);
  else await deleteDoc(doc(entries(owner), code));
}
export async function replaceCountries(owner, previous, next) {
  const codes = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const all = [...codes];
  for (let i = 0; i < all.length; i += 400) {
    const batch = writeBatch(db);
    for (const code of all.slice(i, i + 400)) {
      if (next[code]) batch.set(doc(entries(owner), code), next[code]);
      else batch.delete(doc(entries(owner), code));
    }
    await batch.commit();
  }
}
export function pairingCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, '0');
}
export async function requestAccess(owner, uid, code) {
  if (!/^[A-Za-z0-9]{20,40}$/.test(owner) || owner === uid) throw Error('Código do atlas inválido.');
  await setDoc(doc(requests(owner), uid), { code, createdAt: serverTimestamp() });
  setOwner(owner);
}
export function watchRequests(owner, next, error) {
  return onSnapshot(requests(owner), snapshot => next(snapshot.docs.map(d => ({ uid: d.id, ...d.data() }))), error);
}
export async function approve(owner, uid) {
  await setDoc(doc(members(owner), uid), { joinedAt: serverTimestamp() });
  await deleteDoc(doc(requests(owner), uid));
}
