import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

// 🟢 鎖定 woven-environs 新基地憑證 (硬編碼確保絕對連線成功)
const firebaseConfig = {
  apiKey: "AIzaSyCAM2sX_OVXioieZYZG5Jyyk3gB_tLxddU",
  authDomain: "woven-environs-439611-t6.firebaseapp.com",
  projectId: "woven-environs-439611-t6",
  storageBucket: "woven-environs-439611-t6.firebasestorage.app",
  messagingSenderId: "592243449709",
  appId: "1:592243449709:web:e10c4ce39444c462fe0464",
  measurementId: "G-ZF1ERRJQSP"
};

console.log("📡 [基地確認] 系統已進駐現役新專案:", firebaseConfig.projectId);

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 🟢 初始化具名資料庫 ID
const db = initializeFirestore(app, {}, "ai-studio-fe9cab21-2eab-4d27-9a68-02891525e6a8");

// 🟢 啟用 enableIndexedDbPersistence 以確保本地持久化快取 (Data Persistence)
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore tab synchronization active or multiple tabs open.");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore persistence is not supported in this browser.");
    } else {
      console.warn("Firestore enableIndexedDbPersistence error:", err);
    }
  });
}

const auth = getAuth(app);

// 安全的通知獲取函式
export const getSafeMessaging = async () => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const supported = await isSupported();
      if (supported) return getMessaging(app);
    } catch (err) {
      console.warn("🔔 目前環境不支援 Web Push 通知:", err);
    }
  }
  return null;
};

// Auth 常用導出
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

export { app, db, auth };
