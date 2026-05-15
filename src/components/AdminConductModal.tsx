import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';

interface AdminConductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminConductModal: React.FC<AdminConductModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyber-green/20 border border-cyber-green/30 flex items-center justify-center">
                  <ShieldCheck className="text-cyber-green" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">管理員專業操守與監督聲明</h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Admin Professional Conduct & Oversight</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-white/80 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">01</span>
                  管理員承諾
                </h3>
                <p className="text-sm font-medium text-white/90">
                  為了確保 Smart5 Owners 社群的安全與數據公正，本系統所有具備管理權限之人員（以下簡稱「管理員」）在行使職權時，必須嚴格遵守以下操作守則：
                </p>
                <ul className="space-y-4 pt-2">
                  <li className="flex gap-3">
                    <span className="text-cyber-green font-bold text-xs mt-1">1.1</span>
                    <p className="text-sm">
                      <strong className="text-white">絕對隱私保護：</strong>
                      管理員嚴禁私自查閱、下載或向第三方披露用戶的個人聯絡資訊（電郵、電話）及車輛詳細行程記錄。
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green font-bold text-xs mt-1">1.2</span>
                    <p className="text-sm">
                      <strong className="text-white">數據完整性：</strong>
                      管理員僅限於在收到用戶請求或偵測到明顯系統錯誤時，方可對單一數據進行修正。嚴禁任何未經授權的數據刪除或內容竄改。
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green font-bold text-xs mt-1">1.3</span>
                    <p className="text-sm">
                      <strong className="text-white">權限迴避：</strong>
                      管理員不得利用後台權限干預活動報名優先權、操縱投票結果或獲取任何形式的私利。
                    </p>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">02</span>
                  違規行為之嚴重性
                </h3>
                <p className="text-sm font-medium text-white/90">
                  管理員若違反上述守則，即視為對社群信任的嚴重背叛。Effortless Production Limited 將根據違規程度採取以下行動：
                </p>
                <ul className="space-y-4 pt-2">
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-xs mt-1">●</span>
                    <p className="text-sm">
                      <strong className="text-white">撤銷權限：</strong>
                      立即解除其管理員職務，並永久封鎖其帳戶。
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-xs mt-1">●</span>
                    <p className="text-sm">
                      <strong className="text-white">法律追究：</strong>
                      若涉及非法外洩用戶資料，本公司將配合相關執法部門，根據香港《個人資料（私隱）條例》追究其法律責任。
                    </p>
                  </li>
                </ul>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">03</span>
                  用戶監督與檢舉機制
                </h3>
                <p className="text-sm font-medium text-white/90">
                  我們鼓勵每一位車主共同監督管理團隊。若您發現以下異常情況，請立即提出檢舉：
                </p>
                <div className="grid gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <h4 className="text-white text-xs font-bold font-mono uppercase tracking-widest">數據異常變動</h4>
                    <p className="text-xs text-white/60">您的里程或充電記錄在未經您操作的情況下被修改。</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <h4 className="text-white text-xs font-bold font-mono uppercase tracking-widest">騷擾或隱私侵犯</h4>
                    <p className="text-xs text-white/60">有管理員利用系統資料進行私下聯繫或騷擾。</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <h4 className="text-white text-xs font-bold font-mono uppercase tracking-widest">權限濫用</h4>
                    <p className="text-xs text-white/60">活動或投票過程出現明顯的人為干預。</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <CyberButton onClick={onClose} variant="ghost" className="px-8">
                收到
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
