import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import {
  PublicClientApplication,
  Configuration,
  AuthenticationResult,
} from '@azure/msal-browser';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// ---------------------------------------------------------------------------
// Google — identity + Gmail + Calendar scopes
// ---------------------------------------------------------------------------
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
// access_type: 'offline' tells Google we want a refresh token.
// prompt: 'consent' forces the consent screen every time so the refresh token
// is always issued (Google only issues it on first consent otherwise).
googleProvider.setCustomParameters({
  access_type: 'offline',
  prompt: 'consent',
});

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
  console.log('[Google Auth] accessToken:', accessToken);

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
// Microsoft — Outlook Mail + Calendar scopes via MSAL
// ---------------------------------------------------------------------------
const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID ?? '',
    authority: 'https://login.microsoftonline.com/common',
    // Must match a redirect URI registered in Azure Portal
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI ?? window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

const MICROSOFT_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',               // required for refresh tokens
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Calendars.Read',
  'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
];

export const signInWithMicrosoft = async (): Promise<AuthenticationResult> => {
  await msalInstance.initialize();

  const result = await msalInstance.loginPopup({ scopes: MICROSOFT_SCOPES });

  console.log('[Microsoft Auth] account      :', result.account?.username);
  console.log('[Microsoft Auth] accessToken  :', result.accessToken);
  // result.idTokenClaims contains the user's profile info
  // result.accessToken is valid for ~1 hour; MSAL handles refresh automatically
  // via msalInstance.acquireTokenSilent() when it expires.

  return result;
};

// ---------------------------------------------------------------------------
// Token persistence — writes to Firestore users/{uid}/tokens/{provider}
// Security rules (firestore.rules) restrict reads to the owning uid only.
// sessionStorage is kept in sync so IntegrationsView can show status without
// an async Firestore read on every render.
// ---------------------------------------------------------------------------
export async function saveTokenToDB(
  uid: string,
  provider: 'google' | 'microsoft',
  accessToken: string
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'tokens', provider),
    {
      accessToken,
      provider,
      capturedAt: serverTimestamp(),
    },
    { merge: true }
  );
  sessionStorage.setItem(`token:${provider}`, accessToken);
  console.log(`[saveTokenToDB] ${provider} token saved to Firestore for uid ${uid}:`, accessToken.slice(0, 20) + '…');
}

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
