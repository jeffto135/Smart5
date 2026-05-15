import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';

interface UserAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAgreementModal: React.FC<UserAgreementModalProps> = ({ isOpen, onClose }) => {
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
                  <FileText className="text-cyber-green" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">用戶協議</h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">User Agreement</p>
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
                  接受條款
                </h3>
                <p className="text-sm">
                  歡迎使用 Smart5 Owners。當您點擊「開始同步我的數據」或以任何方式存取本服務，即表示您已閱讀、理解並同意受本協議及相關 [版權及免責聲明] 之約束。如果您不同意本協議之內容，請立即停止使用本服務。
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">02</span>
                  服務內容與帳戶管理
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>服務範圍：</strong>本系統提供電動車里程記錄、能耗計算、活動報名及車友資訊交流。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>帳戶安全：</strong>用戶須透過 Google 帳戶登入。您有責任維護帳戶與手機生物辨識系統的安全。任何透過您的帳戶執行的操作，均視為您的個人行為。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>數據刪除：</strong>用戶可自願選擇「刪除帳戶」。執行後，系統將永久清理雲端 Firestore 中關聯的所有車輛記錄，此操作不可逆轉。</span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">03</span>
                  用戶行為準則
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>誠實義務：</strong>輸入真實的里程與充電數據。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>合法使用：</strong>不得利用本系統散佈惡意軟體、侵犯他人隱私或干擾系統運作。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyber-green/60 inline-block w-4 mt-0.5">•</span>
                    <span><strong>非商業用途：</strong>未經 Effortless Production Limited 授權，禁止將系統數據用於任何商業營利行為。</span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">04</span>
                  數據所有權與隱私
                </h3>
                <p className="text-sm">
                  用戶上傳的車輛數據（如車輛的行程日誌）所有權歸用戶所有，但用戶授予本系統在匿名化處理後，用於生成統計報告或優化系統功能之權利。
                </p>
                <p className="text-sm">
                  個人資訊處理將嚴格遵守相關隱私條例（如香港 PDPO）。
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">05</span>
                  服務變更與中斷
                </h3>
                <p className="text-sm">
                  開發者保留隨時修改、暫停或終止部分或全部服務的權利。對於因技術維護、雲端服務商（Firebase/Vercel）故障或不可抗力導致的服務中斷，開發者不承擔法律責任。
                </p>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-cyber-green font-mono font-bold flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-green/30">06</span>
                  爭議解決
                </h3>
                <p className="text-sm">
                  本協議受香港特別行政區法律管轄。如因本服務產生任何爭議，應先嘗試友好協商，協商不成則交由香港法院裁決。
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <CyberButton onClick={onClose} variant="ghost" className="px-8">
                妥當
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
