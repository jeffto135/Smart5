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
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-gray-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">01</span>
                  ⚖️ 管理員核心操守承諾 (Admin Undertakings & Code of Conduct)
                </h3>
                <p className="text-sm text-gray-300">
                  為確保 Smart5 Owners 社群生態的數據安全性、數據公正性與平台公信力，凡獲 <strong className="text-white">Effortless Production Limited</strong>（以下簡稱「本公司」）及籌委會授權、具備本系統後台管理權限之核心人員（以下簡稱「管理員」），在行使職權或存取雲端控制台（Firebase Console）時，必須無條件嚴格遵守以下最高級別之專業操作守則：
                </p>
                <ul className="space-y-4 pt-2 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">1.1 數據盲測與絕對隱私保護 (Zero-Knowledge Privacy)：</strong>
                      管理員在查閱車輛行程日誌與電耗排行榜時，必須嚴格落實「去識別化盲測」原則。管理員嚴禁私自查閱、下載、複製、導出或向任何外部第三方披露用戶之個人驗證資訊（包括但不限於登入電郵、UID、關聯電話）及車輛之精確時間軸行程軌跡。全體管理員承諾將用戶用車行為數據與現實真實身份進行物理性法律隔離。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">1.2 數據完整性與審計足跡 (Data Integrity & Log Auditing)：</strong>
                      管理員對資料庫之變更權限受到嚴格限制。管理員僅限於在（1）收到用戶本人的書面協助請求，或（2）系統偵測到重大數據邏輯崩潰（如數值異常引致整體平均電耗計算出錯）時，方可對單一特定數據執行修正。嚴禁任何未經用戶授權的數據刪除、惡意截斷或內容竄改。每次後台操作均會留下不可抹除的雲端審計日誌（Audit Logs）以供備查。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">1.3 利益衝突防範與權限迴避 (Conflict of Interest Avoidance)：</strong>
                      管理員必須保持最高度之廉潔與中立。管理員嚴禁利用後台權限干預聚會活動之報名隊列優先權、操縱任何形式的投票結果、封鎖正當言論、或利用平台數據獲取任何形式之不正當私利與商業機會。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🚫 違規懲治機制與最高法律追究 (Disciplinary Actions)
                </h3>
                <p className="text-sm text-gray-300">
                  管理團隊深知社群公信力建立不易，任何違反上述守則之行為，均將被視為對全體車友信任的嚴重背叛。本公司及籌委會將採取「零容忍（Zero Tolerance）」之態度，並根據違規事實與審計日誌，採取以下懲治行動：
                </p>
                <ul className="space-y-4 pt-2 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">立即撤銷職權與永久封禁：</strong>
                      一經查證屬實，違規之管理員將被即時、無條件撤銷所有後台存取權限，永久解除其管理員職務，並將其關聯帳戶進行全網永久封鎖。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start text-red-400">
                    <span className="text-red-400 inline-block mt-1">⚠️</span>
                    <span>
                      <strong className="text-white">移交執法部門與法律訴訟：</strong>
                      若管理員之行為涉及惡意下載、私自轉售或外洩車友個人資料，其行為已違反香港法例第486章《個人資料（私隱）條例》。本公司將全面配合香港個人資料私隱專員公署及相關執法機關之刑事調查，並保留依法追究其一切法律責任及經濟損失賠償之權利。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  🔍 用戶全域監督、檢舉與覆核機制 (User Supervision & Report Channel)
                </h3>
                <p className="text-sm text-gray-300">
                  我們堅信開放與透明是最好的治理。本系統誠摯鼓勵並賦予每一位實名車主共同監督管理團隊的權利。若您在日常用車或瀏覽 App 時發現以下任何一項異常情況，請立即啟動全域監督機制提出正式檢舉：
                </p>
                <div className="grid gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <h4 className="text-[#A3E635] text-xs font-bold font-mono uppercase tracking-widest">【數據異動警告】</h4>
                    <p className="text-xs text-gray-300">您的車輛里程紀錄、充電日誌或電耗數值，在未經您本人操作或未提交修改申請之情況下，出現非正常的改動或被蓄意刪除。</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <h4 className="text-[#A3E635] text-xs font-bold font-mono uppercase tracking-widest">【騷擾或隱私侵犯】</h4>
                    <p className="text-xs text-gray-300">任何具備管理員身份之人員，利用您於本系統登記或提交之行程日誌、出沒停車場、電郵等非公開資料，對您進行未經授權的私下聯絡、滋擾、商業推銷或洩露其隱私。</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <h4 className="text-[#A3E635] text-xs font-bold font-mono uppercase tracking-widest">【活動與選舉權限濫用】</h4>
                    <p className="text-xs text-gray-300">在熱門活動（如名額有限之線下聚會、車友投票）發佈時，出現明顯的人為後台插隊、刪除他人報名資格或干預公正性之嫌疑。</p>
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
