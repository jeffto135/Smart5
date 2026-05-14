import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigManual from '../../firebase-applet-config.json';

// Use environment variables if available (for Vercel), otherwise fallback to the applet config
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigManual.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigManual.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigManual.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigManual.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigManual.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigManual.appId,
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigManual.firestoreDatabaseId;

const app = initializeApp(config);

// Only pass databaseId if it is NOT "(default)" or empty
// experimentalForceLongPolling is often needed in restricted networks
export const db = (databaseId && databaseId !== '(default)') 
  ? initializeFirestore(app, { 
      experimentalForceLongPolling: true,
    }, databaseId)
  : initializeFirestore(app, { 
      experimentalForceLongPolling: true,
    });

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

// Removed testConnection to avoid confusion during startup
// It will be replaced by actual data fetching in the store
 
// Removed testFirestoreConnection as it can be unreliable in some environments
// Connectivity will be monitored by actual stream status if needed
