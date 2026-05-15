import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  const accessToken = credential?.accessToken ?? null;

  // IMPORTANT: Firebase's popup flow (implicit/hybrid) does not surface the
  // Google OAuth refresh_token through credentialFromResult — that field will
  // always be null here. To obtain a server-usable refresh_token you must run
  // a server-side authorization-code exchange (see /api/auth/google/callback).
  // The accessToken above is valid for ~1 hour and is enough to proxy Gmail +
  // Calendar reads from server.ts for now.
  console.log('[Google Auth] user uid   :', result.user.uid);
  console.log('[Google Auth] accessToken captured:', !!accessToken);

  return { result, accessToken };
};

// ---------------------------------------------------------------------------
// Email + password auth
// ---------------------------------------------------------------------------
export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection successful');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();
