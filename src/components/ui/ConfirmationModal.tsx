import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { CyberButton } from './CyberButton';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = '確定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'info'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-[#0a0a0a]/95 border-2 border-cyber-green rounded-2xl p-8 shadow-[0_0_50px_rgba(204,255,0,0.15)] overflow-hidden"
          >
            {/* Cyber Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CCFF00 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            
            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center rotate-45 border-2 transition-all duration-500 ${
                variant === 'danger' ? 'bg-red-500/10 text-red-500 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-cyber-green/10 text-cyber-green border-cyber-green/50 shadow-[0_0_20px_rgba(204,255,0,0.2)]'
              }`}>
                <div className="-rotate-45">
                  {variant === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-mono font-black italic uppercase tracking-tighter text-white">
                  {title}
                </h3>
                <p className="text-[10px] text-white/50 font-mono leading-relaxed uppercase tracking-widest px-4">
                  {message}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full pt-4">
                <CyberButton
                  onClick={onConfirm}
                  className="w-full text-xs py-4 font-black uppercase italic"
                >
                  {confirmText} / CONFIRM
                </CyberButton>
                <button
                  onClick={onCancel}
                  className="w-full py-4 rounded-xl bg-white/5 text-white/30 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  {cancelText} / CANCEL
                </button>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
