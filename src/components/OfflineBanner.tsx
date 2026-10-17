import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getOfflineQueue, syncOfflineQueue } from '../utils/offlineQueue';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateQueueCount = () => {
      setPendingCount(getOfflineQueue().length);
    };

    updateQueueCount();

    const handleOnline = async () => {
      setIsOffline(false);
      setShowBackOnline(true);
      updateQueueCount();
      // 觸發自動同步
      setIsSyncing(true);
      await syncOfflineQueue();
      setIsSyncing(false);
      updateQueueCount();
      const timer = setTimeout(() => setShowBackOnline(false), 5000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
      updateQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('smart5_offline_queue_changed', updateQueueCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('smart5_offline_queue_changed', updateQueueCount);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    await syncOfflineQueue();
    setIsSyncing(false);
    setPendingCount(getOfflineQueue().length);
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-cyber-green text-black px-4 py-2 flex items-center justify-between shadow-[0_4px_20px_rgba(204,255,0,0.25)] z-[60] sticky top-0"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="animate-pulse" />
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase">
              離線模式 / OFFLINE MODE - 記錄將安全暫存於本地
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="text-[9px] font-mono bg-black text-cyber-green px-2 py-0.5 rounded-full font-bold">
              待同步: {pendingCount} 筆
            </span>
          )}
        </motion.div>
      )}

      {showBackOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-sky-500 text-white px-4 py-2 flex items-center justify-between z-[60] sticky top-0 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Wifi size={16} />
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase">
              網路已恢復連線 / BACK ONLINE {pendingCount > 0 ? `(自動同步 ${pendingCount} 筆離線記錄中...)` : ''}
            </span>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-[9px] font-mono bg-black/40 hover:bg-black/60 px-2 py-0.5 rounded text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? '同步中' : '立即補傳'}
            </button>
          )}
        </motion.div>
      )}

      {!isOffline && !showBackOnline && pendingCount > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-cyber-green/15 border-b border-cyber-green/30 text-cyber-green px-4 py-1.5 flex items-center justify-between z-[59] sticky top-0 text-xs font-mono"
        >
          <div className="flex items-center gap-2 text-[10px]">
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span>本地尚存 {pendingCount} 筆離線暫存記錄未上傳</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="text-[10px] font-mono bg-cyber-green text-black px-2.5 py-0.5 rounded-md font-bold hover:bg-cyber-green/80 cursor-pointer transition-all"
          >
            {isSyncing ? '同步中...' : '立即同步'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
