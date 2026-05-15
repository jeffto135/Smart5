import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
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
                  <Shield className="text-cyber-green" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">版權及免責聲明</h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Terms & Conditions</p>
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
                  版權聲明 (Copyright Notice)
                </h3>
                <p className="text-sm">
                  本應用程式 Smart5 Owners（以下簡稱「本系統」）之所有內容，包括但不限於文字、標誌、圖像、圖示、程式碼、介面設計及數據架構，均屬 Effortless Production Limited 及相關權利人所有，並受國際版權法及相關知識產權法律保護。未經書面許可，嚴禁任何形式的轉載、修改、分發或商業用途。
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">02</span>
                  服務使用規範
                </h3>
                <p className="text-sm">
                  本系統僅供 Smart#5 車主及受邀用戶作為個人車輛數據記錄及社群資訊交流之工具。
                </p>
                <p className="text-sm">
                  用戶在使用本系統時，應確保輸入數據的真實性，且不得利用本系統進行任何違法或惡意破壞之行為。
                </p>
              </section>

              <section className="space-y-3 p-4 rounded-xl bg-cyber-green/5 border border-cyber-green/10">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">03</span>
                  免責聲明 (Disclaimer)
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>數據準確性：</strong>本系統所顯示之里程、能耗（KWh/100km）、充電金額及剩餘電量等數據，均基於用戶手動輸入之資料進行計算。計算結果僅供參考，一切數據應以車輛儀錶板及官方設備顯示為準。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>數據遺失風險：</strong>儘管本系統採用 Firebase 雲端加密存儲，但對於因網絡不穩、系統維修、第三方服務中斷或不可抗力因素導致的數據遺失或延遲，開發者不承擔賠償責任。</span>
                  </li>
                  <li className="flex gap-3 text-red-400 font-medium">
                    <span className="text-red-400/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>駕駛安全：</strong>用戶嚴禁在駕駛過程中操作本系統。對於因分心駕駛導致的交通意外或損失，本系統概不負責。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>帳戶安全：</strong>用戶有責任保護其 Google 登入帳戶及手機生物識別安全。因用戶個人疏忽導致的帳戶被盜或數據外洩，後果由用戶自負。</span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">04</span>
                  數據清理與隱私
                </h3>
                <p className="text-sm">
                  當用戶執行「刪除帳戶」操作時，系統將根據隱私協議，永久清除該 UID 下的所有數據（包括 所有身份、車輛數據及報名資訊之記錄）。此操作具不可逆性，執行後開發者無法代為恢復數據。
                </p>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">05</span>
                  聲明修訂
                </h3>
                <p className="text-sm italic opacity-60">
                  Effortless Production Limited 保留隨時修改本聲明之權利。修訂後之條款將即時生效，恕不另行個別通知。
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <CyberButton onClick={onClose} variant="ghost" className="px-8">
                已閱讀並同意
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
