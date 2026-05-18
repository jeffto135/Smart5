import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 5000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-cyber-green/90 text-black px-4 py-2 flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(204,255,0,0.2)] z-[60] sticky top-0"
        >
          <WifiOff size={16} className="animate-pulse" />
          <span className="text-[10px] font-bold font-mono tracking-widest uppercase">
            目前處於離線模式 / OFFLINE MODE - 數據將在連線後自動同步
          </span>
        </motion.div>
      )}

      {showBackOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-sky-500/90 text-white px-4 py-2 flex items-center justify-center gap-3 z-[60] sticky top-0"
        >
          <Wifi size={16} />
          <span className="text-[10px] font-bold font-mono tracking-widest uppercase">
            網路已恢復連線 / BACK ONLINE - 正在同步數據...
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
