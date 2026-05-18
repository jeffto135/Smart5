import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 診斷日誌：幫管理員在主控台看清變數狀況
console.log("📡 [Firebase 診斷] 當前載入 Project ID:", firebaseConfig.projectId);

// 初始化 App (防重複)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

// 終極防護：將 messaging 設為非同步安全獲取，絕對不阻塞頂層載入！
export const getSafeMessaging = async () => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const supported = await isSupported();
      if (supported) {
        return getMessaging(app);
      }
    } catch (err) {
      console.warn("🔔 目前環境不支援 Web Push 通知:", err);
    }
  }
  return null;
};

export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

export { app, db, auth };
