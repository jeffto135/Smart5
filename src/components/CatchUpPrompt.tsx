import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CreditCard, ArrowRight } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';

interface CatchUpPromptProps {
  isOpen: boolean;
  data: {
    id: string;
    date: string;
    prevBattery: number;
    nextBattery: number;
  } | null;
  onConfirm: () => void;
  onClose: () => void;
}

export const CatchUpPrompt: React.FC<CatchUpPromptProps> = ({ isOpen, data, onConfirm, onClose }) => {
  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-cyber-bg border-2 border-cyber-green rounded-2xl p-6 shadow-[0_0_50px_rgba(204,255,0,0.2)] overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 opacity-10 p-4">
              <CreditCard size={120} className="text-cyber-green rotate-12" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyber-green/10 flex items-center justify-center border border-cyber-green/30">
                  <AlertCircle className="text-cyber-green animate-pulse" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-cyber-green leading-none">偵測到數據時間差！</h3>
                  <p className="text-[9px] uppercase tracking-widest text-white/40 mt-1">Audit Alert: Time Gap Detected</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <p className="text-xs text-white/70 leading-relaxed">
                  系統發現您在 <span className="text-cyber-green font-bold">{data.date}</span> 有充電跡象：
                </p>
                
                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="text-center">
                    <div className="text-xl font-mono font-bold text-white/50">{data.prevBattery}%</div>
                    <div className="text-[8px] uppercase tracking-tighter opacity-30 font-mono">插入時</div>
                  </div>
                  <ArrowRight className="text-cyber-green/30" size={16} />
                  <div className="text-center">
                    <div className="text-xl font-mono font-bold text-cyber-green">{data.nextBattery}%</div>
                    <div className="text-[8px] uppercase tracking-tighter opacity-30 font-mono">檢測到</div>
                  </div>
                </div>

                <p className="text-[10px] text-white/50 leading-relaxed italic border-t border-white/5 pt-3">
                  該筆記錄尚未填寫充電支出。請補回充電花費，以維持車隊能耗統計的準確性。
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <CyberButton onClick={onConfirm} className="w-full py-4 shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                  立即補回費用
                </CyberButton>
                <button 
                  onClick={onClose}
                  className="w-full py-2 text-[10px] font-mono uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
                >
                  稍後處理 (SKip)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
