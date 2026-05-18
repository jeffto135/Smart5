import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

// 全面鎖定 smart5-nine 專案憑證，並支援本地環境變數覆蓋
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, 
  authDomain: "smart5-nine.firebaseapp.com",
  projectId: "smart5-nine",
  storageBucket: "smart5-nine.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log("📡 [Firebase 核心] 正在重置並航向原始本陣:", firebaseConfig.projectId);

// 初始化 App (防重複)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 恢復預設的 (default) 資料庫
const db = getFirestore(app); 
const auth = getAuth(app);

// 安全的通知獲取函式，絕不卡死主頁
export const getSafeMessaging = async () => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const supported = await isSupported();
      if (supported) return getMessaging(app);
    } catch (err) {
      console.warn("🔔 當前瀏覽器環境不支援 Web Push 通知:", err);
    }
  }
  return null;
};

export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

export { app, db, auth };
