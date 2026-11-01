import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyBSjCjlaS6y6HL4rgyX9witxCiKcmi8y30',
  authDomain: 'por-ai-atlas.firebaseapp.com',
  projectId: 'por-ai-atlas',
  appId: '1:787502321483:web:e1200b844b10953cd022ce'
});
const auth = getAuth(app), db = getFirestore(app), provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
export const observeUser = callback => onAuthStateChanged(auth, callback);
export const currentUser = () => auth.currentUser;
export const login = async () => {
  try { await signInWithPopup(auth, provider); }
  catch (error) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider); return;
    }
    throw error;
  }
};
export const finishRedirect = () => getRedirectResult(auth).catch(error => { throw error; });
export const logout = () => signOut(auth);
const userCollection = uid => collection(db, 'users', uid, 'countries');
export const readCountries = async uid => {
  const snapshot = await getDocs(userCollection(uid));
  return Object.fromEntries(snapshot.docs.map(item => [item.id, item.data()]));
};
export const watchCountries = (uid, onUpdate, onError) => onSnapshot(userCollection(uid), snapshot => {
  onUpdate(Object.fromEntries(snapshot.docs.map(item => [item.id, item.data()])));
}, onError);
export const saveCountryRemote = (uid, code, value) => value
  ? setDoc(doc(db, 'users', uid, 'countries', code), value)
  : deleteDoc(doc(db, 'users', uid, 'countries', code));
export const replaceCountriesRemote = async (uid, oldEntries, next) => {
  const batch = writeBatch(db);
  for (const code of Object.keys(oldEntries)) if (!next[code]) batch.delete(doc(db, 'users', uid, 'countries', code));
  for (const [code, item] of Object.entries(next)) batch.set(doc(db, 'users', uid, 'countries', code), item);
  await batch.commit();
};
