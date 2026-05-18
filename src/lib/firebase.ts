import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

console.log("📡 [Firebase 診斷] Project ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  console.error("❌ 嚴重警告：Vite 未能讀取到環境變數！請檢查 .env.local 或 Vercel 設定。");
}

// 防止 Next.js 或 Vite HMR 導致的重複初始化 Bug
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Set up Firestore with persistence settings if possible
const db = (databaseId && databaseId !== '(default)')
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    }, databaseId)
  : initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });

const auth = getAuth(app);


// 初始化 Web Push 通知
let messaging = null;
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn("Messaging failed to initialize:", e);
  }
}

export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

export { app, db, auth, messaging };
