import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';

interface PersonalInformationStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PersonalInformationStatementModal: React.FC<PersonalInformationStatementModalProps> = ({ isOpen, onClose }) => {
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
                  <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">個人資料收集聲明</h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Personal Information Collection Statement (PICS)</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                id="pics-modal-close-btn"
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
                  📥 我們收集的個人資料類別 (Categories of Data Collected)
                </h3>
                <p className="text-sm text-gray-400">
                  當您新登記、登入或使用本系統時，我們將收集並處理以下兩大類別之資料：
                </p>
                
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                    <h4 className="text-white text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                      <span className="text-[#A3E635]">■</span> 個人識別、聯絡及物流提貨資料：
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-gray-300 space-y-2">
                      <li>
                        <strong className="text-white">驗證資料：</strong>透過 Google 帳戶（OAuth 2.0）安全登入時所獲取之唯一識別碼（UID）、電子郵件地址（Email）、帳戶暱稱。
                      </li>
                      <li>
                        <strong className="text-white">營運與交收聯絡資料：</strong>您主動提交用於實名認證、活動報名或團購認購之手提電話號碼 (Mobile)、真實姓名（如適用）及車牌號碼（License Plate）。
                      </li>
                      <li>
                        <strong className="text-white">線下提貨憑證數據（核心增補）：</strong>團購截止鎖死後，系統底層會自動雜湊生成並儲存對應該筆訂單的「4 位數提貨短碼 (PIN Code)」、加密動態 QR Code 數據流、以及「提貨狀態紀錄（未提取 / 已提取）」。
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                      <span className="text-[#A3E635]">■</span> 車輛數據與行程日誌（去識別化與月份過濾）：
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-gray-300 space-y-2">
                      <li>
                        車輛之總里程（ODO）、當前電量（SOC）、充電度數、平均能耗（kWh/100km）。
                      </li>
                      <li>
                        您在參與活動時主動填寫的「自訂報名問卷選項」（如預計抵達及離開時間）。上述數據均支援透過頂部下拉式過濾器進行特定月份之即時前端篩選。
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 02 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🎯 收集資料之核心特定目的 (Purposes of Collection)
                </h3>
                <p className="text-sm text-gray-400">
                  我們收集您的個人資料，僅限於以下特定及與本車會營運直接相關之用途：
                </p>
                <ul className="space-y-4 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">身份確認與「換牌歷史保留」：</strong>核實您作為 Smart #5 實名車主之社群身份。本系統底層採用「不變性用戶識別碼（UID）」作為您所有歷史數據之唯一關聯外鍵，不會因現實中更換車牌而抹除或丟失紀錄。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">團購誠信交收、銷帳與未提取點名（核心增補）：</strong>用於福利市集之認購核實與線下物資交收。當團購截止鎖死後，管理團隊（包括主 Admin 及獲授權之 Sub Admin）將提取您的車友暱稱、車牌、手提電話及認購數量清單，用作現場「相機掃描 QR Code」、「手動輸入 4 位數提貨短碼」或「後台列表人手核對」之交收憑證。此外，管理團隊有權在後台一鍵過濾出「未提取」之成員名單，以便於聚會現場即時打電話、在 WhatsApp 進行點名提醒或安排後續交收。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">活動調度與現場簽到：</strong>活動截止後，系統將一鍵匯出包含您暱稱、車牌、電話及自訂答案之螢光綠 PDF 報名明細表用於現場車流調度。於現場簽到時，管理團隊掃描您電子實名卡的 QR Code，系統將即時動態變更您為「已出席」並彈窗展示您的自訂選項。
                    </span>
                  </li>
                </ul>
              </section>

              {/* Section 03 */}
              <section className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  🔐 業界最高規格之保安與技術防禦措施 (Data Security Measures)
                </h3>
                <p className="text-xs font-mono uppercase text-white/40 font-bold block mb-2">
                  為確保全體會員之隱私安全，本系統於底層架構實裝了以下極之仔細之保安防線，全方位防止數據外洩或濫用：
                </p>
                <ul className="space-y-4 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <div className="space-y-1">
                      <strong className="text-white">管理員權限分級隔離與交收放權 (Tiered Access Control & Logistics Protection)：</strong>
                      <div className="pl-4 border-l-2 border-[#A3E635]/20 space-y-3 mt-2">
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">Sub Admin（次級管理員）營運與交收放權：</strong>為提升現場交收效率，次級管理員（籌委會幹事）獲授權共同操作新車主「待審核名單」，並有權於線下聚會現場使用「相機掃描器」、「輸入提貨短碼」或「後台列表人手覆蓋」功能執行團購交收銷帳。
                        </p>
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">已核准名單及核心私隱物理屏蔽：</strong>當 Sub Admin 進入後台查閱「已核准成員名單」或「訂單總表」時，權限將受底層物理性屏蔽。Sub Admin 表格上只能看見車友暱稱、電話、車牌及訂購清單，其餘核心私隱（如真實 Email、UID、角色權限變更面板等）一律徹底隱藏且強制唯讀，從源頭杜絕次級管理員越權或外洩核心私隱。
                        </p>
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">主 Admin（最高管理員）：</strong>全系統僅最高管理員擁有完整權限進行核心審計、變更角色及人手數據修正。
                        </p>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">線下交收全自動審計日誌黑盒子 (Audit Log Blackbox)：</strong>任何管理員（包括主 Admin 及執行交收之 Sub Admin）不論是透過「掃描 QR Code」成功、或是透過應急方案「手動輸入 4 位數提貨碼」、「後台列表人手點擊簽收」，系統均會自動、無密碼跳過地在底層寫入一條不可串改、不可刪除的 <strong className="text-white">auditLogs</strong> 流水紀錄（精確記錄哪位管理員、在甚麼時間、為哪位車友、以甚麼方式完成了提貨銷帳），此日誌僅供主 Admin 進行終極安全審計。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">前置邀請碼校驗、兩週轉碼與萬能鑰匙攔截：</strong>本系統在 Google 授權程序前設有邀請碼大閘。車友所用之兩週動態隨機邀請碼每 14 天由系統時間戳算法自動強制更換，過期即作廢。供主 Admin 備用之「萬能應急鑰匙」設有「二階段身分安全攔截」，非最高 admin 帳戶嘗試使用此密碼破閘，會在 Google 授權成功後 0.05 秒內被執行懲罰性強制登出（Sign Out）並踢回大閘外。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <div>
                      <strong className="text-white">傳輸加密與雲端防火牆防禦：</strong>
                      <p className="text-xs text-gray-400 mt-1">
                        所有數據傳輸均經過 SSL/TLS 高級加密（HTTPS 通道）。數據存儲於 Google Firebase Cloud Firestore 雲端資料庫，並由後端安全性規則（Firestore Security Rules）進行全天候大閘守衛。系統啟用了本地持久化快取（Data Persistence），在弱網時自動切換至離線唯讀模式，防止數據在外洩或寫入失敗。
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">團購下架之安全蒸發機制：</strong>如某一團購項目在後台被刪除下架，系統會自動從所有用戶的手機通知中心內即時連帶撤回該項目之新上架通知，前端會自動攔截並渲染「本項目已調整下架」之安全防呆提示彈窗。
                    </span>
                  </li>
                </ul>
              </section>

              {/* Section 04 */}
              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">04</span>
                  🌐 資料移轉、不轉售承諾與數據遺忘權 (Data Disclosure & Destruction)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">第三方不轉售承諾：</strong>本會承諾採取最高標準之保密操守。所有收集之個人資料僅供本車會內部營運交流使用，絕不向任何外部第三方商業機構、其他車會洩露、轉售或用於廣告投放。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white font-semibold">數據遺忘權之不可逆洗白：</strong>當用戶於帳戶設定中主動執行「刪除帳戶」操作時，雲端 Firestore 系統將在背景即時且永久性地清除該 UID 下的所有身份識別資訊、歷史行程日誌、用電充電紀錄及團購提貨紀錄。此操作具備絕對之不可逆性（Irreversible），一旦洗白，任何人都無法復原。
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <CyberButton onClick={onClose} variant="ghost" className="px-8" id="pics-modal-accept-btn">
                已閱讀並了解
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
