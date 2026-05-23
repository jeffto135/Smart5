import React, { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db, getSafeMessaging } from '../lib/firebase';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const NotificationInit: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 監聽即時廣播推播，當管理員發布新投票或新團購時，在線用戶可立即收到 OS/手機原生橫幅通知
    if (!('Notification' in window)) return;

    const baseTime = new Date();
    const q = query(
      collection(db, 'system_pushes'),
      where('createdAt', '>=', baseTime)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (Notification.permission === 'granted') {
            try {
              new Notification(data.title || '車友會最新消息 / Update', {
                body: data.message || '',
                icon: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
                tag: (data.relatedType || 'general') + '-' + (data.relatedId || 'id'),
                requireInteraction: false
              });
            } catch (e) {
              console.warn('Native notification failed, trying SW fallback:', e);
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(data.title || '車友會最新消息', {
                  body: data.message || '',
                  icon: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
                  tag: (data.relatedType || 'general') + '-' + (data.relatedId || 'id')
                });
              }).catch(swErr => console.error('SW Fallback notification failed:', swErr));
            }
          }
        }
      });
    }, (err) => {
      console.error('System pushes real-time listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('此瀏覽器不支援推播通知 / Push not supported');
      return;
    }

    // 當用戶登入成功後觸發
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // 主動觸發 Notification.requestPermission() / Proactively request permission
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            registerToken();
          } else if (permission === 'default') {
            setShowPrompt(true);
          }
        }).catch((err) => {
          console.error('主動索取通知權限錯誤:', err);
          setShowPrompt(true);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 監聽前景訊息
    let unsubscribe: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        const messaging = await getSafeMessaging();
        if (messaging) {
          unsubscribe = onMessage(messaging, (payload) => {
            console.log('收到前景訊息:', payload);
          });
        }
      } catch (err) {
        console.error('前景訊息監聽設定失敗:', err);
      }
    };

    setupListener();
    return () => unsubscribe?.();
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
      
      const messaging = await getSafeMessaging();
      if (!messaging) {
        console.log("環境不支援推播，跳過 Token 申請");
        return;
      }

      // 確保 Service Worker 已就緒
      const registration = await navigator.serviceWorker.ready;
      
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        const uid = auth.currentUser.uid;

        // 🟢 1. 儲存至該用戶的 Firestore 文檔內（users/${uid}/fcmToken）作為欄位
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, {
          fcmToken: token,
          token: token,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 🟢 2. 儲存至子集合以符合 tokens/{tokenId} 規則，並包含 lastUpdated 以過規則
        const tokenRef = doc(db, `users/${uid}/tokens`, token);
        await setDoc(tokenRef, {
          token,
          platform: getPlatform(),
          updatedAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          userAgent: navigator.userAgent,
          isActive: true
        }, { merge: true });

        // 🟢 3. 儲存至 tokens/fcmToken 固定路徑，以防後端/群發時的特定路徑獲取
        const fcmTokenDocRef = doc(db, `users/${uid}/tokens`, 'fcmToken');
        await setDoc(fcmTokenDocRef, {
          token,
          platform: getPlatform(),
          updatedAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
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
