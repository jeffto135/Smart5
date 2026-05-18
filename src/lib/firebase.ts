import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut, indexedDBLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import firebaseConfigManual from '../../firebase-applet-config.json';

// Use environment variables if available (for Vercel), otherwise fallback to the applet config
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigManual.apiKey,
  authDomain: 'woven-environs-439611-t6.firebaseapp.com', // Fixed as requested
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigManual.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigManual.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigManual.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigManual.appId,
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigManual.firestoreDatabaseId;

const app = initializeApp(config);

// persistentLocalCache ensures data is available instantly from local storage
const firestoreSettings = {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
};

export const db = (databaseId && databaseId !== '(default)') 
  ? initializeFirestore(app, firestoreSettings, databaseId)
  : initializeFirestore(app, firestoreSettings);

export const auth = getAuth(app);
export const messaging = getMessaging(app);

// Set persistence to indexedDB (local) to keep the user logged in across sessions
setPersistence(auth, indexedDBLocalPersistence).catch(err => {
  console.warn("Persistence setting failed:", err);
});
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

// Removed testConnection to avoid confusion during startup
// It will be replaced by actual data fetching in the store
 
// Removed testFirestoreConnection as it can be unreliable in some environments
// Connectivity will be monitored by actual stream status if needed
