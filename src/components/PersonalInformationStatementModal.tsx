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
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">01</span>
                  📥 我們收集的個人資料類別 (Categories of Data Collected)
                </h3>
                <p className="text-sm text-gray-400">
                  當您新登記、登入或使用本系統時，我們將收集並處理以下兩大類別之資料：
                </p>
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                      <span className="text-[#A3E635]">■</span> 個人識別及聯絡資料
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                      <li>
                        <strong className="text-white">驗證資料：</strong>透過 Google 帳戶（OAuth 2.0）安全登入時所獲取之唯一識別碼（UID）、電子郵件地址（Email）、帳戶暱稱。
                      </li>
                      <li>
                        <strong className="text-white">營運聯絡資料：</strong>您主動提交用於實名認證、活動報名或團購認購之手提電話號碼 (Mobile)、真實姓名（如適用）及車牌號碼（License Plate）。
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                      <span className="text-[#A3E635]">■</span> 車輛數據與行程日誌（去識別化）
                    </h4>
                    <p className="text-sm text-gray-300">
                      車輛之總里程（ODO）、當電量（SOC）、充電度數、平均能耗（kWh/100km），以及您在發佈活動時主動填寫的「自訂報名問卷選項」（如預計抵達及離開時間）。
                    </p>
                  </div>
                </div>
              </section>

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
                      <strong className="text-white">身份確認與「換牌歷史保留」：</strong>核實您作為 Smart #5 實名車主之社群身份。本系統底層採用「不變性用戶識別碼（UID）」作為您所有歷史數據（用電、排行榜、團購訂單）之唯一關聯外鍵。即便您在現實中變更車牌號碼，只要經主 Admin 核實審批後，過往所有紀錄將基於 UID 唯一性而 100% 完好保留，不會丟失。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">團購與福利物流交收：</strong>用於福利市集之誠信認購核實。當團購於截止時間被「強制鎖死（Hard Lock）」後，管理團隊需提取您的車友暱稱與手提電話號碼，以便透過電話或 WhatsApp 即時聯絡入數及安排實體精品/大雪櫃交收。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">活動調度與現場簽到：</strong>管理團隊發佈活動時有權開啟自訂問卷（如到達/離開時間）。活動截止後，系統將一鍵匯出包含您暱稱、車牌、電話及自訂答案之 <strong className="text-[#A3E635]">螢光綠黑客風格 PDF 報名明細表</strong> 用於現場車流調度。於現場簽到時，Admin 掃描您電子實名卡的 QR Code，系統將即時動態變更您為「已出席」並彈窗展示您的自訂選項。
                    </span>
                  </li>
                </ul>
              </section>

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
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <div className="space-y-1">
                      <strong className="text-white">主/次管理員權限嚴格分級隔離 (Tiered Access Control)：</strong>
                      <div className="pl-4 border-l-2 border-[#A3E635]/20 space-y-2 mt-1">
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">Sub Admin（次級管理員）：</strong>權限受系統底層物理性屏蔽並強制隱藏。Sub Admin 登入後台時，絕對無法存取、查閱或導出任何包含全體車友真實 Email、電話或營運紀錄之隱私分頁，從源頭杜絕次級管理員外洩私隱。
                        </p>
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">主 Admin（最高管理員）：</strong>全系統僅主 Admin 擁有最高權限進行核心審計與實名審批，並實施「盲測管理操守」，將您的聯絡電話與真實行程軌跡進行邏輯隔離。
                        </p>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">全自動操作審計日誌黑盒子 (Audit Log System)：</strong>本系統已全面啟動後台監控黑盒子。任何管理員（包括主/次 Admin）在後台執行的任何新增、下架、批核或修改動作，系統均會自動、無密碼跳過地寫入一條不可串改、不可刪除的 <strong className="text-white">auditLogs</strong> 流水紀錄（包含操作者 Email、精確時間軸及變更內容）。此日誌僅供主 Admin 進行終極安全審計，徹底杜絕管理員越權或手滑誤觸。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <div>
                      <strong className="text-white">傳輸加密與雲端防火牆防禦：</strong>
                      <ul className="list-disc pl-5 text-xs text-gray-400 mt-1 space-y-1">
                        <li>所有數據傳輸均經過 SSL/TLS 高級加密（HTTPS 通道），防止任何惡意網路抓包（Packet Sniffing）或網絡攔截。</li>
                        <li>數據存儲於國際頂級雲端資料庫（Google Firebase Cloud Firestore），並由專屬的後端安全性規則（Firestore Security Rules）進行全天候大閘守衛。只有通過 OAuth 2.0 認證且具備合法 Role 的帳戶請求才會被放行。</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">離線與容錯保護：</strong>系統啟用了本地持久化快取（Data Persistence），在地下車庫或山區弱網時自動切換至離線唯讀模式，防止數據在不穩定網絡下寫入失敗或外洩。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">團購下架之安全蒸發機制：</strong>如某一團購項目因商戶問題被管理團隊在後台「刪除下架」，系統會自動從所有用戶的手機通知中心內即時連帶撤回（蒸發）該項目之新上架通知。若用戶點擊舊通知踩空，前端會啟動防呆攔截，渲染「本項目已調整下架」之安全提示彈窗，絕不暴露任何後端空白報錯或殘留數據。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">04</span>
                  🌐 資料移轉、不轉售承諾與數據遺忘權 (Data Disclosure & Destruction)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">第三方不轉售承諾：</strong>本會承諾採取最高標準之保密操守。所有收集之個人資料僅供本車會內部營運交流使用，絕不向任何外部第三方商業機構、其他車會洩露、轉售或用於廣告投放。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">數據遺忘權之不可逆洗白：</strong>為保障您的自決權，本系統嚴格落實「數據遺忘權」。您可隨時於帳戶設定中自願選擇「刪除帳戶」。一經執行，系統將永久且不可逆轉地從雲端徹底銷毀、洗白該帳戶關聯的所有身份識別資訊、行程日誌及團購紀錄。此操作具備絕對之不可逆性（Irreversible），一旦洗白，任何人都無法復原。
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
