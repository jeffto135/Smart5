import React, { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, messaging } from '../lib/firebase';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const NotificationInit: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('此瀏覽器不支援推播通知 / Push not supported');
      return;
    }

    // 當用戶登入成功後觸發
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        if (Notification.permission === 'default') {
          // 延遲顯示，提供更好用戶體驗
          const timer = setTimeout(() => setShowPrompt(true), 3000);
          return () => clearTimeout(timer);
        } else if (Notification.permission === 'granted') {
          registerToken();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 監聽前景訊息
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('收到前景訊息:', payload);
      // 您可以在此處實作自定義的在線彈窗 UI
    });
    return () => unsubscribe();
  }, []);

  const getPlatform = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) return 'Android';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return 'iOS';
    return 'Desktop';
  };

  const registerToken = async () => {
    if (!auth.currentUser || !VAPID_KEY) return;

    try {
      setIsProcessing(true);
      // 確保 Service Worker 已就緒
      const registration = await navigator.serviceWorker.ready;
      
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        // 儲存到 users/{uid}/tokens/{token}
        const tokenRef = doc(db, `users/${auth.currentUser.uid}/tokens`, token);
        await setDoc(tokenRef, {
          token,
          platform: getPlatform(),
          updatedAt: serverTimestamp(),
          userAgent: navigator.userAgent,
          isActive: true
        }, { merge: true });

        console.log('FCM Token 儲存成功:', token);
      }
    } catch (error) {
      console.error('FCM Token 註冊失敗:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setShowPrompt(false);
      
      if (result === 'granted') {
        await registerToken();
      }
    } catch (error) {
      console.error('權限請求發生錯誤:', error);
    }
  };

  if (!auth.currentUser) return null;

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-8 md:w-80"
          >
            <div className="bg-black/95 border border-cyber-green/30 rounded-xl p-5 shadow-[0_0_40px_rgba(204,255,0,0.15)] backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-cyber-green/20 text-cyber-green">
                  <Bell size={22} className="animate-bounce" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">開啟活動通知</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed mb-4">
                    接收即時活動資訊、報名確認及所有關鍵更新。我們會確保不發送過多訊息。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={requestPermission}
                      disabled={isProcessing}
                      className="flex-1 py-2 bg-cyber-green text-black text-[10px] font-bold rounded uppercase tracking-widest hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? '處理中...' : '允許通知'}
                    </button>
                    <button
                      onClick={() => setShowPrompt(false)}
                      className="px-3 py-2 bg-white/5 text-white/40 hover:text-white transition-colors rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
