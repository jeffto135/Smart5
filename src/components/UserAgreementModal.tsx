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
                  ⚖️ 接受條款、法律效力與角色定義 (Acceptance & Role Definitions)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">協議成立：</strong>歡迎使用 Smart5 Owners 專屬數據管理系統（以下簡稱「本服務」或「本系統」）。本系統由 <strong className="text-white">Effortless Production Limited</strong>（以下簡稱「本會」）獨立開發、營運，並授權提供技術與品牌支持。當您點擊 <strong className="text-[#A3E635]">「開始同步我的數據」</strong>、完成註冊程序、或以任何形式（包括但不限於 PWA 行動應用程式、網頁端、管理後台系統）存取及使用本服務時，即表示您已滿法定年齡，且已充分閱讀、理解並無條件同意受本協議所有條款、<strong className="text-white">[版權及免責聲明]</strong> 以及相關隱私政策之法律約束。如果您不同意本協議或其後續修改之任何部分，請立即停止使用本服務並退出系統。
                </p>
                <div className="text-sm text-gray-300 space-y-2 mt-2 pt-2 border-t border-white/5">
                  <p className="font-semibold text-white">管理角色與權限知悉：</p>
                  <p>用戶理解並同意，本系統設有嚴格的分級管理權限架構：</p>
                  <ul className="list-disc list-inside pl-2 space-y-1.5 text-white/80">
                    <li><strong className="text-white">最高管理員（主 Admin）：</strong>擁有全系統最高生殺大權，有權查閱及人手更改所有歷史紀錄、變更用戶角色，並全權管理、審批及處置（包括停權或踢出）所有成員。</li>
                    <li><strong className="text-white">次級管理員（Sub Admin）：</strong>由主 Admin 授權之籌委會幹事，負責日常行政、活動簽到、團購及福利資料錄入，其操作範圍受系統自動遮蔽與權限鎖定保護。</li>
                  </ul>
                  <p className="text-xs text-white/60">用戶同意，其於本系統內的所有數據及狀態（包括車牌、實名卡狀態等），主 Admin 擁有最終的審查與技術修正權。</p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🛡️ 服務內容、帳戶安全與底層 UID 綁定機制 (Service & Account Security)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">服務範圍：</strong>本系統為非營利性質之第三方社群智慧公共平台，提供 Smart #5 車型之線性里程追蹤、智能分段能耗計算、官方聚會活動動態報名、車友福利市集、車友實時資訊交流、及特色停車場與超級充電難度地圖等功能。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">不變性 UID 綁定（核心防禦）：</strong>為根治因用戶自願或在現實中變更車牌號碼（而車輛本體不變）所引致的數據崩潰，本系統底層採用「用戶不變性唯一識別碼（UID / Foreign Key）」作為歷史紀錄之唯一關聯依據。車牌號碼僅作為前台文字渲染與實名核實用途。用戶理解並同意，變更車牌號碼必須經由主 Admin 於後台核實審批；變更後，其過往所有用電紀錄、慳電排行榜數據、團購訂單等，將基於 UID 唯一性而 100% 完好保留，不會因更換車牌而抹除。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">帳戶安全與生物辨識責任：</strong>用戶必須透過經本會驗證之 Google 帳戶進行安全登入（OAuth 2.0）。用戶有絕對責任保護其個人行動裝置、登入憑證及手機生物辨識系統（如 Face ID / Touch ID）之安全性。凡透過您帳戶驗證所執行之數據錄入、修改、刪除、活動報名或團購認購等所有操作，在法律、後台自動日誌（Audit Logs）及系統判定上均視為您本人之真實意願與個人行為。因用戶保管不當引致之個人數據外洩或連帶損失，本系統概不承擔責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">數據遺忘權（徹底銷毀機制）：</strong>用戶可隨時於帳戶設定中自願選擇「刪除帳戶」。一經執行，系統將永久且不可逆轉地從雲端資料庫中彻底銷毀該帳戶關聯的所有車輛紀錄、行程日誌及個人識別資訊。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  🚫 團購限時鎖死、活動報名與公平性規範 (Code of Conduct & Group Buy Regulations)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">誠實提交義務：</strong>用戶在使用能耗記錄功能時，承諾輸入車輛儀錶板真實顯示之總里程（ODO）與當前電量（SOC）。本系統嚴禁利用自動化腳本、模擬器或惡意竄改網路封包提交虛假數據，以維護社群「慳電神腳榜」之公平性。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">團購限時截止與強制鎖死機制 (Deadline Hard Lock)：</strong>用戶參與「團購市集」認購時，必須嚴格遵守各項目設定的「截止日期與時間（Deadline）」。用戶知悉並同意：未截止前，用戶可自由支持、修改認購數量或取消；一旦越過截止時間，整個系統立即進入「時間切斷點物理鎖死狀態」。前端按鈕強制動態失效，後端安全性規則（Firestore Security Rules）亦會全渠道封鎖寫入請求。用戶永久無法再新增、修改、追加或取消認購。名單一經鎖定，將直接導出報表發予廠家，用戶必須對其認購數量及總金額承擔完全之交易與誠信責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">活動動態報名與選項約束：</strong>管理員發佈活動時，有權根據活動性質開啟「自訂報名問卷」（例如：活動時長、預計到達及離開時間等選項）。用戶報名時必須依真實情況勾選。當活動停止報名後，管理團隊有權一鍵匯出包含車友暱稱、車牌、電話及自訂選項之 PDF 報名明細表用於現場車流調度及簽到點名。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">現場掃描簽到連動：</strong>於活動現場，管理團隊將使用相機掃描用戶電子實名卡之 QR Code 進行簽到。掃描成功後，系統後台將即時動態變更用戶狀態為「已出席」，並會彈窗向 Admin 即時展示該用戶填寫的抵達/離開時間等選項，以便即時調度。用戶不得偽造、冒用他人 QR Code 進行虛假簽到。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">違法限制與商業禁制令：</strong>用戶不得利用本系統傳播任何違反中華人民共和國香港特別行政區法律之言論。未經本會雙重書面授權，任何個人或機構禁止將本系統內之任何數據、排名、團購價格、商戶折扣、圖表及程式碼用於任何商業營利、廣告投放或媒體轉載。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">04</span>
                  🔐 數據所有權、盲測隱私與全自動審計日誌 (Data Privacy & Audit Logs)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">數據授權與去識別化：</strong>用戶主動上傳之車輛原始數據（行程日誌、用電紀錄等）所有權仍歸用戶所有。但用戶在此授予本系統一項全球性、免費、永久且不可撤銷之使用授權，允許本系統將數據進行「去識別化（De-identification）」處理後，用於生成全車會之大數據統計報告或優化演算法。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">全自動操作審計日誌系統 (Audit Log System)：</strong>為確保 600 多位會員之數據安全並防止越權操作，本系統後台設有全自動安全黑盒子監控機制。當任何管理員（Admin / Sub Admin）執行新增團購、修改商戶福利、審批成員狀態或變更數據時，系統會底層自動寫入一條不可串改、不可刪除的 auditLogs 流水紀錄（包含操作者 Email、時間、動作、變更內容描述）。此「系統日誌」專頁僅限最高管理員（主 Admin）查閱，用作終極安全審計。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">隱私條例與盲測管理：</strong>本系統嚴格遵守香港《個人資料（私隱）條例》（第486章，PDPO）。管理團隊採取「盲測管理操守」，將用戶的電子郵件、電話號碼與真實用車細節進行物理與邏輯隔離。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">團購下架與通知撤回機制：</strong>如因商戶變卦或數據錯誤，管理團隊在後台對某一團購項目執行「下架/刪除」時，系統將自動啟動連帶清理程序，從全體用戶的手機通知中心內即時連帶撤回（蒸發）該項目的新上架通知。若用戶點擊舊通知踩空，系統將會動態渲染「本項目已調整下架」之防呆提示彈窗，不顯示空白畫面，以保障用戶知情權。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">05</span>
                  🛑 服務變更、不可抗力與技術免責 (Service Disruption & Offline Handling)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">服務優化與重構權：</strong>本會保留隨時根據技術演進、社群反饋或安全性考量，在不提前通知的情況下，對現有功能進行重構、打磨、優化（如實裝骨架屏、緩存加速、地圖點聚合等）或暫停部分功能之權利。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">離線容錯與網絡中斷免責：</strong>本系統建立於國際雲端架構之上，惟香港部分地下停車場或山區訊號較弱，系統設有本地快取（Data Persistence）與網絡狀態監聽。當用戶處於弱網 or 斷網狀態時，系統將自動提示並切換至離線唯讀模式，期間所引致的數據同步延遲、提交失敗、或因雲端服務商（Google Firebase / Vercel）底層故障導致之數據損失，本會及開發團隊概不承擔任何法律、經濟或賠償責任。
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
                  <strong className="text-white">爭議解決機制：</strong>如用戶因本協議 or 本服務產生任何爭議、誤解 or 糾紛，應首先本著友好互助、維持車友社群和諧之原則，向本會最高管理團隊（主 Admin）提出正式申訴並進行友好協商。如雙方在展開協商後三十（30）天內仍未能達成和解，該爭議應正式提交予香港特別行政區具有管轄權之法院進行審理及裁決。
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
