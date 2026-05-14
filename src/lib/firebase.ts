import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
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

console.log('Initializing Firebase with Project ID:', config.projectId);

const app = initializeApp(config);

// Only pass databaseId if it is NOT "(default)" or empty
export const db = (databaseId && databaseId !== '(default)') 
  ? initializeFirestore(app, { 
      experimentalForceLongPolling: true,
      host: "firestore.googleapis.com",
      ssl: true
    }, databaseId)
  : initializeFirestore(app, { 
      experimentalForceLongPolling: true,
      host: "firestore.googleapis.com",
      ssl: true
    });

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithRedirect(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase Firestore connection successful.");
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Firebase is offline. This might be due to network issues or restricted environment.");
    } else if (error?.code === 'permission-denied') {
      console.warn("Firestore connection check: Permission denied (this is expected if rules are strict).");
    } else {
      console.error("Firebase Firestore connection test failed:", error);
    }
  }
}

testConnection();
