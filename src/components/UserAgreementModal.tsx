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
                id="close-modal-button"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-gray-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {/* Section 01 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">01</span>
                  ⚖️ 接受條款、法律效力與分級授權架構 (Acceptance & Role Definitions)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">協議成立：</strong>歡迎使用 Smart5 Owners 專屬數據管理系統（以下簡稱「本服務」或「本系統」）。本系統由 <strong className="text-white">Effortless Production Limited</strong>（以下簡稱「本會」）獨立開發、營運，並授權提供技術與品牌支持。當您點擊 <strong className="text-[#A3E635]">「開始同步我的數據」</strong>、完成註冊程序、或以任何形式（包括但不限於 PWA 行動應用程式、網頁端、管理後台系統）存取及使用本服務時，即表示您已滿法定年齡，且已充分閱讀、理解並無條件同意受本協議所有條款、<strong className="text-white">[版權及免責聲明]</strong> 以及相關隱私政策之法律約束。
                </p>
                <div className="text-sm text-gray-300 space-y-2 mt-2 pt-2 border-t border-white/5">
                  <p className="font-semibold text-white">管理角色與權限分流知悉（Sub Admin 審核與交收放權）：</p>
                  <p>用戶理解並同意，本系統設有嚴格的分級管理權限與物理屏蔽架構：</p>
                  <ul className="list-disc list-inside pl-2 space-y-1.5 text-white/80">
                    <li><strong className="text-white">最高管理員（主 Admin）：</strong>擁有全系統最高權限，全權處置所有成員，並擁有專屬使用「終極萬能應急鑰匙」破閘登入之最高權限。</li>
                    <li><strong className="text-white">次級管理員（Sub Admin）：</strong>獲授權共同處理新會員之「待審核名單」，並獲賦權於線下聚會現場使用「相機掃描器」、「提貨短碼驗證」或「後台列表人手簽收」功能執行團購交收與銷帳。Sub Admin 對於「已核准成員名單」之存取受到底層物理屏蔽，僅能查閱暱稱、電話及車牌號碼以作實體交收核對用途。</li>
                  </ul>
                </div>
              </section>

              {/* Section 02 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🛡️ 前置邀請碼大閘、隨機更換與萬能鑰匙防線 (Pre-auth Gate & Master Key Guard)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">前置邀請碼大閘 (Pre-auth Guard)：</strong>為維護資料庫之純淨、防範不相干之第三方網路電郵寫入 Firebase Authentication，本系統於 Google 授權登入程序之前，設有強制性「前置邀請碼大閘」。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">兩週動態隨機更換機制：</strong>供車友登記之官方群組邀請碼採用「時間戳記純前端自迭代演算法」，每兩星期（14天）會自動強制刷新，舊有邀請碼一經逾期即時自動作廢。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">主 Admin 專屬萬能應急鑰匙與二階段安全攔截：</strong>本系統底層設有供主 Admin 應急之「萬能應急鑰匙」。若非最高 admin 帳戶嘗試使用此鑰匙破閘，系統將在二階段身分安全攔截中，於 0.05 秒內無情執行強制登出（Sign Out）並踢回大閘之外。
                    </span>
                  </li>
                </ul>
              </section>

              {/* Section 03 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  📦 團購限時鎖死、電子憑證卡與線下雙軌交收銷帳規範 (Group Buy & Offline Pickup Regulations)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">誠實提交義務：</strong>用戶在使用能耗記錄功能時，承諾輸入車輛儀錶板真實顯示之總里程（ODO）與當前電量（SOC），以維護社群「慳電神腳榜」之公平性。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">團購限時截止與強制鎖死機制 (Deadline Hard Lock)：</strong>用戶參與「團購市集」認購時，必須嚴格遵守各項目設定的「截止日期與時間（Deadline）」。一旦越過截止時間，整個系統立即進入「時間切斷點物理鎖死狀態」，後端安全性規則（Firestore Security Rules）亦會全渠道封鎖寫入請求。用戶必須對其認購數量及總金額承擔完全之交易與誠信責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">電子認購憑證與憑證保管責任（核心增補）：</strong>團購項目截止鎖死後，系統會自動為認購用戶之帳戶生成「電子認購憑證卡」，內容包含加密動態 QR Code 以及一串由系統雜湊生成的「4 位數提貨短碼 (PIN Code)」。
                      <ul className="list-disc list-inside pl-2 mt-1 space-y-1 text-white/75">
                        <li><strong className="text-white">憑證之法律效力：</strong>該動態 QR Code 及 4 位數提貨短碼共同構成您於線下提取實體物資的唯一合法電子憑證。</li>
                        <li><strong className="text-white">保管責任與免責：</strong>用戶有絕對責任妥善保管其手機屏幕、登入帳戶及提貨短碼。凡於線下聚會現場，不論是透過「相機掃描 QR Code」成功，或是經管理團隊「手動輸入 4 位數提貨短碼」比對匹配成功，系統在法律及操作邏輯上均無條件視為您本人或您合法授權之代表完成提貨。任何因用戶個人保管不當、螢幕截圖外傳、或設備借予他人引致之憑證被冒用、物資被冒領之損失，本系統及本會概不承擔任何經濟或賠償責任。</li>
                      </ul>
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">雙軌應急交收與人手簽收之終極效力（核心增補）：</strong>用戶知悉並同意，為應對現場光線不穩、網絡中斷或屏幕碎裂等突發狀況，管理團隊有權啟動應急防呆方案：
                      <ul className="list-disc list-inside pl-2 mt-1 space-y-1 text-white/75">
                        <li><strong className="text-white">人手列表簽收 (Manual Override)：</strong>管理員（Admin / Sub Admin）有權直接於管理後台名單中，核對用戶之車牌號碼或車友暱稱後，點擊執行「人手簽收」。</li>
                        <li><strong className="text-white">審計日誌之鐵證地位：</strong>一旦管理員按下人手簽收，系統底層會自動、不可串改地在 auditLogs（安全審計日誌）中寫入流水紀錄。用戶同意並無條件接納，此系統審計日誌之流水紀錄與實體簽名具備同等、終極之法律證據效力。一旦日誌生成，即代表實體物資已安全交收，用戶不得以「未實際掃描 QR Code」為由提出任何追討或否認簽收。</li>
                      </ul>
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">活動動態報名、選項約束與現場掃描簽到連動：</strong>管理員發佈活動時有權開啟自訂報名問卷，並於活動停止報名後一鍵匯出包含車友暱稱、車牌、電話及自訂選項之 PDF 報名明細表用於現場車流調度及簽到點名。於活動現場，管理團隊將使用相機掃描用戶電子實名卡之 QR Code 進行簽到，用戶不得偽造、冒用他人 QR Code 進行虛假簽到。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">違法限制與商業禁制令：</strong>未經本會雙重書面授權，任何個人或機構禁止將本系統內之任何數據、排名、團購價格、商戶折扣、圖表及程式碼用於任何商業營利行為、廣告投放或媒體轉載。
                    </span>
                  </li>
                </ul>
              </section>

              {/* Section 04 */}
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
                      <strong className="text-white">全自動操作審計日誌系統 (Audit Log System)：</strong>為確保 600 多位會員之數據安全並防止越權操作，本系統後台設有全自動安全黑盒子監控機制。當任何管理員（Admin / Sub Admin）執行新增團購、修改商戶福利、審批成員狀態、或是於線下聚會執行 QR Code 掃描、提貨短碼核對、人手簽收交收時，系統底層均會全自動寫入一條不可串改、不可刪除的 auditLogs 流水紀錄（包含操作者 Email、時間、動作、變更內容描述）。此「系統日誌」專頁僅限最高管理員（主 Admin）查閱，用作終極安全審計。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white font-semibold">隱私條例與盲測管理：</strong>本系統對所有個人資訊之收集、處理及儲存，將嚴格遵守香港《個人資料（私隱）條例》（第486章，PDPO）之相關規定。管理團隊承諾採取符合當前技術標準之「盲測管理操守」，將用戶之電子郵件與真實用車細節進行物理與邏輯隔離，絕不向任何外部第三方洩露 or 轉售。
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

              {/* Section 05 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">05</span>
                  🛑 服務變更、不可抗力與技術免責 (Service Disruption & Offline Handling)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">服務優化與重構權：</strong>本會保留隨時根據技術演進、社群反饋或安全性考量，在不提前通知的情況下，對現有功能進行重構、打磨、優化（如實裝前端下拉式月份數據過濾器、骨架屏、緩存加速、地圖點聚合等）或暫停部分功能之權利。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">離線容錯與網絡中斷免責：</strong>本系統建立於國際雲端架構之上，惟香港部分地下停車場 or 山區訊號較弱，系統設有本地快取（Data Persistence）與網絡狀態監聽。當用戶處於弱網 or 斷網狀態時，系統將自動提示並切換至離線唯讀模式，期間所引致的數據同步延遲、提交失敗、或因雲端服務商（Google Firebase / Vercel）底層故障導致之數據損失，本會及開發團隊概不承擔任何法律、經濟或賠償責任。
                </p>
              </section>

              {/* Section 06 */}
              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30 font-[#A3E635]">06</span>
                  🏛️ 法律管轄與爭議解決 (Governing Law & Jurisdiction)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">法律管轄：</strong>本協議之訂立、效力、解釋、履行及爭議解決，均受中華人民共和國香港特別行政區法律管轄，並按其進行解釋。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-[#A3E635]">爭議解決機制：</strong>如用戶因本協議 or 本服務產生任何爭議、誤解 or 糾紛，應首先本著友好互助、維持車友社群和諧之原則，向本會最高管理團隊（主 Admin）提出正式申訴並進行友好協商。如雙方在展開協商後三十（30）天內仍未能達成和解，該爭議應正式提交予香港特別行政區具有管轄權之法院進行審理及裁決。
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <CyberButton onClick={onClose} variant="ghost" className="px-8" id="agree-modal-close">
                妥當
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
