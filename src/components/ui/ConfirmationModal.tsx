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
            className="relative w-full max-w-sm bg-[#1a1a1a] border-2 border-cyber-green rounded-2xl p-6 shadow-[0_0_30px_rgba(204,255,0,0.2)]"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.3)] ${
                variant === 'danger' ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30'
              }`}>
                {variant === 'danger' ? <AlertTriangle size={24} /> : <Info size={24} />}
              </div>

              <div className="space-y-2">
                <h3 className={`text-lg font-mono font-bold uppercase tracking-widest ${
                  variant === 'danger' ? 'text-red-500' : 'text-cyber-green'
                }`}>
                  {title}
                </h3>
                <p className="text-xs text-white/60 font-mono leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/40 text-xs font-mono font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                >
                  {cancelText}
                </button>
                <CyberButton
                  onClick={onConfirm}
                  className={`flex-1 text-xs py-3 ${variant === 'danger' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : ''}`}
                >
                  {confirmText}
                </CyberButton>
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
