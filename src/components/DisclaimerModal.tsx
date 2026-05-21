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
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-gray-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">01</span>
                  🏛️ 版權及知識產權聲明 (Copyright Notice)
                </h3>
                <p className="text-sm text-gray-300">
                  本應用程式 Smart5 Owners（以下簡稱「本系統」）之全機體架構，包括但不限於獨創之「時空線性排序比對演算法」、「分段里程與電量差額累加引擎」、視覺介面設計（UI/UX）、商標標誌、文字闡述、圖像圖示、底層程式碼、資料庫架構及經去識別化之群體統計數據，其完整知識產權及版權均屬 <strong className="text-white">Effortless Production Limited</strong>（以下簡稱「本公司」）及相關權利人共同獨家所有，並受到中華人民共和國香港特別行政區法律、國際版權條約及全球知識產權法律之嚴密保護。
                </p>
                <p className="text-sm text-gray-300">
                  未經本公司書面明確授權許可，嚴禁任何個人、第三方車會或商業機構以任何形式、任何技術手段（包括但不限於逆向工程、惡意爬取、鏡像複製）對本系統之內容進行轉載、修改、分發、反編譯或用於任何形式之商業營利行為。本公司保留依法追究一切侵權行為法律責任的權利。
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🚗 服務使用權限與社群規範 (Terms of Use)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">專屬授權對象：</strong>本系統為專屬封閉式非營利社群工具，僅限 Smart #5 實名車主及受邀之特定用戶，作為個人車輛日常行程數據追蹤、智慧能耗分析及社群內部資訊交流之用途。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">誠實信用義務：</strong>用戶在使用本系統時，應確保所輸入之總里程（ODO）及電池電量（SOC）等數據具備客觀真實性。用戶嚴禁利用本系統進行任何違反香港法律、惡意灌水、竄改封包、散佈電腦病毒或任何試圖干擾雲端資料庫正常運作之破壞性行為。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  ⚠️ 終極法律免責條款 (Comprehensive Disclaimer)
                </h3>
                <p className="text-xs font-mono uppercase text-white/40 font-bold block mb-2">
                  使用本系統之用戶已充分知悉並同意，本公司及開發團隊對於以下事項免除一切法律與經濟賠償責任：
                </p>
                <ul className="space-y-4 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">數據之非官方參考性（非官方關聯）：</strong>本系統所計算並顯示之行程公里數、真實平均能耗（kWh/100km）、充電度數、剩餘續航里程估算及任何財務省錢指標，均基於用戶手動輸入之原始資料透過社群演算法進行之模擬推算，數值僅供參考。本系統不具備車廠官方診斷效力，一切用車技術數據均應以車輛實體儀錶板及官方原廠檢測設備顯示為準。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">雲端數據遺失與延遲風險：</strong>儘管本系統採用業界最高標準之 Google Firebase 雲端加密存儲，並開啟了 PWA 本地離線暫存防禦，但對於因公共網絡不穩、電訊供應商服務中斷、系統緊急維護、第三方底層 API 架構變更或任何不可抗力因素（如駭客攻擊、天災）所導致之數據遺失、覆蓋、儲存延遲或中斷，本公司及開發團隊概不承擔任何補償、還原或賠償責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start text-red-400">
                    <span className="text-red-400 inline-block mt-1">⚠️</span>
                    <span>
                      <strong className="text-white">絕對安全駕駛義務（分心駕駛免責）：</strong>駕駛安全為用戶之最高且唯一義務。用戶（司機）嚴禁在車輛行駛過程中、或任何處於非安全停泊狀態下操作本系統。用戶因違反交通法規、分心駕駛、或於行車時錄入數據而引致之任何交通意外、人身傷亡、車輛損毀或對第三方造成之財產損失，後果均由用戶本人自行承擔，本系統及本公司概不承擔任何直接或間接之法律責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">用戶帳戶與生物辨識之疏忽責任：</strong>用戶必須妥善保護其 Google 登入憑證、手機設備之 Face ID / Touch ID 生物辨識系統。因用戶個人疏忽、設備借予他人使用、或遭遇惡意軟體入侵而導致之帳戶被盜、車輛行程日誌外洩或數據被蓄意修改，其法律與經濟後果均由用戶自負。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">04</span>
                  🔐 「數據遺忘權」之不可逆執行 (Data Destruction Notice)
                </h3>
                <p className="text-sm text-gray-300">
                  本系統嚴格落實隱私保障協議之「數據遺忘權」規範。當用戶於帳戶設定中主動執行「刪除帳戶」操作時，雲端 Firestore 系統將依據最高安全標準，在背景即時且永久性地清除該 UID 下的所有身份識別資訊、歷史行程日誌、用電充電紀錄及活動報名檔案。
                </p>
                <p className="text-sm text-gray-300">
                  此數據清理操作具備絕對之不可逆性（Irreversible）。一經執行，該帳戶在雲端之所有蹤跡將被徹底洗白，開發者團隊、本公司及 Firebase 後台均無法透過任何技術手段代為恢復或還原數據。請用戶在執行刪除前務必審慎考慮。
                </p>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">05</span>
                  📝 聲明之修訂與最終解釋權 (Amendments)
                </h3>
                <p className="text-sm italic opacity-80 text-gray-300">
                  <strong className="text-white">Effortless Production Limited</strong> 擁有本聲明之最終修改權與最終解釋權。本公司保留隨時因應法律法規變更、技術架構調整或社群營運需求，修改本聲明任何條款之權利。修訂後之條款一經於 App 內發佈即時產生法律效力，恕不另行對用戶進行個別通知。用戶持續登入或使用本系統，即視為接受並同意修訂後之全新聲明。
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
