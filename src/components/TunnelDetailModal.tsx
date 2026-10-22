import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { TunnelDashboard } from './TunnelDashboard';

interface TunnelDetailModalProps {
  onClose: () => void;
}

/**
 * 專屬彈窗：三隧分流即時收費與過海時間 (Tunnel Detail Modal / Bottom Sheet)
 * 點擊首頁頂部膠囊即時彈出，消除頁底插入盲點
 */
export const TunnelDetailModal: React.FC<TunnelDetailModalProps> = ({ onClose }) => {
  // 監聽 ESC 鍵關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* 遮罩背景 (點擊遮罩關閉) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
      />

      {/* 彈窗主體 (手機底部抽屜，桌面置中卡片) */}
      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-xl bg-[#141414] border-t sm:border border-white/15 rounded-t-[28px] sm:rounded-2xl shadow-3xl overflow-hidden z-10 p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <TunnelDashboard onClose={onClose} />
      </motion.div>
    </div>
  );
};
