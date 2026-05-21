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
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-gray-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">01</span>
                  ⚖️ 接受條款及法律效力 (Acceptance of Terms)
                </h3>
                <p className="text-sm text-gray-300">
                  歡迎使用 Smart5 Owners 專屬數據管理系統（以下簡稱「本服務」或「本系統」）。本系統由 <strong className="text-white">Effortless Production Limited</strong>（以下簡稱「本會」）獨立開發、營運，並授權提供技術與品牌支持。
                </p>
                <p className="text-sm text-gray-300">
                  當您點擊 <strong className="text-[#A3E635]">「開始同步我的數據」</strong>、完成註冊程序、或以任何形式（包括但不限於 PWA 應用程式、網頁端、後台管理系統）存取及使用本服務時，即表示您已滿法定年齡，且已充分閱讀、理解並無條件同意受本協議之所有條款、<strong className="text-white">[版權及免責聲明]</strong> 以及相關隱私政策之法律約束。如果您不同意本協議或其後續修改之任何部分，請立即停止使用本服務並退出系統。
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🛡️ 服務內容、帳戶管理與「遺忘權」 (Service & Account Management)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">服務範圍與授權：</strong>本系統為非營利性質之第三方社群智慧公共平台，主要提供 Smart #5 車型之線性里程追蹤、智能分段能耗與動能回充計算、官方聚會活動報名、車友實時資訊交流、及特色停車場數據庫等功能。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">帳戶安全與生物辨識責任：</strong>用戶必須透過經本會驗證之 Google 帳戶進行安全登入（OAuth 2.0）。用戶有絕對責任保護其個人行動裝置、登入憑證及手機生物辨識系統（如 Face ID / Touch ID）之安全性。凡透過您帳戶驗證所執行之數據錄入、修改、刪除或活動報名等所有操作，在法律及系統判定上均視為您本人之真實意願與個人行為。因用戶妥善保管不當而引致之個人數據外洩，本系統概不承擔責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">數據遺忘權（徹底銷毀機制）：</strong>為保障用戶之自決權，本系統嚴格落實「數據遺忘權」。用戶可隨時於帳戶設定中自願選擇「刪除帳戶」。一經執行，系統將啟動加密清理程序，永久且不可逆轉地從雲端資料庫（Cloud Firestore）中徹底銷毀、洗白該帳戶關聯的所有車輛紀錄、行程日誌及個人識別資訊。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  🚫 用戶行為準則及公平性規範 (Code of Conduct)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">誠實提交義務：</strong>用戶在使用「Log it」功能時，承諾基於誠實信用原則，輸入車輛儀錶板真實顯示之總里程（ODO）與當前電量（SOC）。本系統依賴群體智慧，嚴禁利用自動化腳本、模擬器或惡意竄改網路封包之方式提交虛假、虛擬或邏輯崩潰之數據，以維護社群「慳電神腳榜」之含金量與公平性。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">合法使用限制：</strong>用戶在使用活動報名、車友交流或停車場回報等功能時，不得利用本系統傳播、散佈任何違反中華人民共和國香港特別行政區法律之言論，亦不得上傳惡意軟體、侵犯他人隱私、人身攻擊或以任何技術手段干擾、破壞本服務之基礎基礎設施（Firebase / Vercel）。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">商業禁制令：</strong>本服務之所有數據流、技術框架及統計報告，僅供 Smart5 Owners 會員內部交流及非商業之私人用途。未經 <strong className="text-white">Effortless Production Limited</strong> 及本會雙重書面特別授權，任何個人、第三方車會或商業機構，禁止將本系統內之任何數據、排名、圖表及程式碼用於任何商業營利行為、廣告投放、或媒體轉載。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">04</span>
                  🔐 數據所有權、隱私與國際合規 (Data Ownership & Privacy)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">數據所有權屬：</strong>用戶主動上傳並記錄之車輛原始數據（包括行程日誌、用電紀錄、補充電量等）之原始所有權仍歸用戶所有。但用戶在此授予本系統一項全球性、免費、永久且不可撤銷之使用授權，允許本系統在將相關數據進行「去識別化（De-identification）」及「匿名化（Anonymization）」處理後，用於生成全車會之大數據統計報告、能耗曲線圖、優化系統演算法、或作為提升全體車友用車體驗之技術參考。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">隱私條例嚴格合規：</strong>本系統對所有個人資訊（Personal Data）之收集、處理及儲存，將嚴格遵守香港《個人資料（私隱）條例》（第486章，PDPO）之相關規定。管理團隊承諾採取符合當前技術標準之「盲測管理操守」，確保用戶之電子郵件與真實用車細節進行物理隔離，絕不向任何外部第三方洩露或轉售。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">05</span>
                  🛑 服務變更、不可抗力與技術免責 (Service Disruption)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">服務優化與調整權：</strong>開發者及本會保留隨時根據技術演進、社群反饋或法律合規要求，修改、更新、暫停或終止本服務部分或全部功能之權利。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">技術免責條款：</strong>本系統建立於國際頂級雲端架構之上，惟對於因系統例行技術維護、雲端服務商（如 Google Firebase、Vercel 等）之底層故障、不可抗力事件（包括但不限於天災、駭客攻擊、電訊網絡中斷、政府管制等）所導致之服務延遲、數據同步失敗或短暫中斷，開發者團隊及本會不承擔任何法律、經濟或賠償責任。
                </p>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">06</span>
                  🏛️ 法律管轄與爭議解決 (Governing Law & Jurisdiction)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">法律管轄：</strong>本協議之訂立、效力、解釋、履行及爭議解決，均受中華人民共和國香港特別行政區法律管轄，並按其進行解釋。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">爭議解決機制：</strong>如用戶因本協議或本服務產生任何爭議、誤解或糾補，應首先本著友好互助、維持車友社群和諧之原則，向本會最高管理團隊提出正式申訴並進行友好協商。如雙方在展開協商後三十（30）天內仍未能達成和解，該爭議應正式提交予香港特別行政區具有管轄權之法院進行審理及裁決。
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
