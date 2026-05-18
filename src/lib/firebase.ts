import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

// 🚨 粗暴重置：完全不用 import.meta.env，直接把 smart5-nine 的真實憑證寫死在裡面！
const firebaseConfig = {
  apiKey: "AIzaSyCAM2sX_OVXioieZYZG5Jyyk3gB_tLxddU", 
  authDomain: "smart5-nine.firebaseapp.com",
  projectId: "smart5-nine",
  storageBucket: "smart5-nine.appspot.com",
  messagingSenderId: "592243449709", 
  appId: "1:592243449709:web:e10c4ce39444c462fe0464",
  measurementId: "G-ZF1ERRJQSP"
};

// 🌟 終極診斷：直接把目前連線的 Project ID 彈成 Alert，讓我們在手機/網頁上一開機就能看到！
if (typeof window !== "undefined") {
  alert("📡 【目前專案無所遁形】正在強制連線至: " + firebaseConfig.projectId);
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 確保括號內完全空白，絕對不連去那個 ai-studio 具名資料庫！
const db = getFirestore(app); 
const auth = getAuth(app);

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
