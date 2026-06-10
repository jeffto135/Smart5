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
                id="close-admin-conduct"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-gray-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">01</span>
                  ⚖️ 管理員核心操守承諾與權限分級防線 (Admin Code of Conduct & Tiered Access)
                </h3>
                <p className="text-sm text-gray-300">
                  為確保 Smart5 Owners 社群生態的數據安全性、數據公正性與平台公信力，凡獲 <strong className="text-white">Effortless Production Limited</strong>（以下簡稱「本公司」）及籌委會授權、具備本系統後台管理權限之核心人員（以下簡稱「管理員」，包括主 Admin 與 Sub Admin），在行使職權、操作管理後台或存取雲端控制台（Firebase Console）時，必須無條件嚴格遵守以下最高級別之專業操作守則：
                </p>
                <ul className="space-y-4 pt-2 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <div className="space-y-2 flex-1">
                      <strong className="text-white">分級授權、審核與線下交收雙重放權 (Access Segregation & Logistics Delegation)：</strong>
                      <div className="pl-4 border-l-2 border-[#A3E635]/20 space-y-2 mt-1">
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">Sub Admin（次級管理員）：</strong>日常營運權限受系統底層嚴格限制。獲授權共同參與新會員之「待審核名單」管理，並獲賦權於線下聚會現場使用「相機掃描 QR Code」、「手動輸入 4 位數提貨短碼」或「後台列表人手簽收」功能執行團購交收銷帳。
                        </p>
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">已核准成員名單與核心私隱物理屏蔽：</strong>當 Sub Admin 進入後台查閱「已核准成員名單」或「訂單總表」時，權限將受底層物理性屏蔽。Sub Admin 畫面之表格上只能查閱暱稱、手提電話、車牌號碼及認購清單以作實體交收核對用途，畫面強制唯讀（Read-Only），且絕對無權存取、查閱或導出任何包含會員真實 Email、UID 或者是變更系統角色權限之核心私隱分頁。
                        </p>
                        <p className="text-xs text-gray-400">
                          <strong className="text-white/80">主 Admin（最高管理員）：</strong>作為系統終極守護者，全權負責核心數據審計、變更車牌實名審批、成員權限變更及查閱不可串改之全自動審計日誌。主 Admin 擁有專屬使用「終極萬能應急鑰匙」破閘登入之最高權限。
                        </p>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">數據盲測、動態過濾與線下交收私隱隔離 (Zero-Knowledge Privacy)：</strong>管理員在查閱車輛能耗（包括操作頂部下拉式過濾器切換月份數據時）或處理活動/團購名單時，必須嚴格落實「去識別化盲測」原則。管理員因營運需要，在團購截止鎖死後能查閱認購明細，或在活動停止報名後能導出包含車牌、電話及自訂時間選項之 PDF 報名表，但全體管理員承諾此數據僅限於線下實體交收與現場車流調度點名之即時用途，完成後必須嚴格保密，嚴禁私自留存、截圖外傳或建立私人檔案。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">線下應急簽收之誠實誠信義務（核心增補）：</strong>管理團隊在面對現場網絡中斷、屏幕碎裂等突發情況而啟用「手動輸入 4 位數提貨碼」或「後台列表一鍵人手簽收」等應急防呆方案時，必須恪守誠實信用原則，僅限於車友確實親臨現場並完成實物提取之事實下，方可點擊銷帳。嚴禁任何管理員利用後台權限進行虛假簽收、偷步銷帳、或利用欄位遮蔽漏洞私吞/挪用車友福利精品。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">主 Admin 專屬萬能應急鑰匙最高保密義務：</strong>全體管理員充分知悉，系統內置有供主 Admin 應急之「萬能應急鑰匙」，並實施「二階段身分安全攔截」。任何管理員嚴禁向外泄露、販售、或以任何形式嘗試盜用此萬能鑰匙。Sub Admin 知悉並同意，若嘗試使用該鑰匙破閘，系統將在 Google 授權成功的一瞬間執行底層角色審計，並因越權觸發懲罰性強制登出（Sign Out）並踢回大閘之外。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">不可串改之全自動審計日誌 (Audit Log Blackbox)：</strong>本系統已全面實裝後台監控黑盒子。任何管理員（包括主 Admin 及執行審批、線下掃描、輸入提貨碼、人手點擊簽收交收之 Sub Admin）在後台進行的每一項動作，系統底層均會實時、自動、無密碼跳過地寫入一條不可串改、不可刪除的 <strong className="text-white">auditLogs</strong> 流水紀錄（包含操作者 Email、精確時間軸、執行動作與變更前後的詳細描述）。此日誌專頁僅供主 Admin 作為終極監督與追溯備查。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">利益衝突防範與權限迴避 (Conflict of Interest Avoidance)：</strong>管理員必須保持最高度之中立。嚴禁利用後台權限干預聚會活動之報名隊列優先權、利用活動自訂選項侵犯車友私隱、操縱投票結果、或利用團購市集與商戶福利之數據獲取任何形式之不正當私利。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🚫 違規懲治機制與最高法律追究 (Disciplinary Actions & Legal Liabilities)
                </h3>
                <p className="text-sm text-gray-300">
                  管理團隊深知社群公信力建立不易，任何違反上述操守守則、濫用後台權限、洩露/嘗試冒用主 Admin 萬能應急鑰匙、於線下交收時進行虛假人手簽收或私吞物資、或企圖繞過系統防線之行為，均將被視為對全體車友信任的嚴重背叛。本公司及籌委會將採取「零容忍（Zero Tolerance）」之態度，並根據自動審計日誌（Audit Logs）之鐵證，採取以下最嚴厲之懲治與法律行動：
                </p>
                <ul className="space-y-4 pt-2 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1 font-bold">✓</span>
                    <span>
                      <strong className="text-white">立即撤銷職權與全網永久封禁（Administrative Sanctions）：</strong>一經日誌查證或車友檢舉屬實，違規之管理員（不論職級）將被即時、無條件撤銷所有後台存取權限，永久解除其管理員職務。主 Admin 將親自執行黑名單機制，將其關聯帳戶及車牌進行全網永久封鎖。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start text-red-400">
                    <span className="text-red-400 inline-block mt-1">⚠️</span>
                    <span>
                      <strong className="text-white">移交執法部門與刑事民事法律訴訟（Legal Prosecution）：</strong>若管理員之行為涉及非法下載、外洩、轉售車友之電話號碼、車牌紀錄，或利用團購憑證、提貨短碼進行欺詐、盜領或私吞物資，其行為已直接觸犯香港法例第486章《個人資料（私隱）條例》及相關刑事法例。本公司將絕不姑息，全體原始日誌數據將直接移交予香港個人資料私隱專員公署及相關執法機關進行刑事調查。本公司保留依法向侵權者追究全額經濟損失、名譽損失賠償及申請法庭禁制令之權利。
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  🔍 用戶全域監督、檢舉與覆核機制 (User Supervision & Report Channel)
                </h3>
                <p className="text-sm text-gray-300">
                  我們堅信開放、透明與全自動日誌是最好的治理。本系統誠摯鼓勵並賦予每一位實名車主共同監督管理團隊的權利。若您在日常用車、查閱個人紀錄或瀏覽 App 時發現以下任何一項異常情況，請立即聯絡主 Admin 籌委會或透過官方渠道提出正式檢舉：
                </p>
                <div className="grid gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <h4 className="text-red-400 text-xs font-bold font-mono tracking-widest uppercase">【數據與提貨狀態異常改動警告】（核心增補）</h4>
                    <p className="text-xs text-gray-300">您的個人車輛里程紀錄、充電日誌、電耗數值，或者是您的團購憑證卡狀態在未經您本人現身提貨、亦未提供 4 位數提貨短碼之情況下，在後台被管理團隊無故執行「人手簽收」並變更為「已提取」，或金額出現不符、歷史紀錄被蓄意刪除抹除。</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-[#A3E635]/10 space-y-1">
                    <h4 className="text-[#A3E635] text-xs font-bold font-mono tracking-widest uppercase">【騷擾或隱私侵犯】</h4>
                    <p className="text-xs text-gray-300">任何具備管理員身份之人員，利用您於團購名細、活動 PDF 名單中登記之手提電話、姓名或自訂時間選項等非公開私隱資料，對您進行未經授權的私下聯絡、滋擾、商業推銷、或於車友群組中惡意公開。</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-[#A3E635]/10 space-y-1">
                    <h4 className="text-[#A3E635] text-xs font-bold font-mono tracking-widest uppercase">【活動與選舉權限濫用】</h4>
                    <p className="text-xs text-gray-300">在熱門限額活動發佈時，出現明顯的人為後台插隊、無故刪除普通車友報名資格、操縱投票數據、或在團購截止鎖死後（包括每兩星期兩週動態隨機邀請碼更新前後）私自利用後台權限為特定人士追加/篡改訂單等嫌疑。</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">04</span>
                  📝 聲明之修訂與最終解釋權 (Amendments & Retrospective Effect)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">最終解釋權：</strong>Effortless Production Limited 擁有本聲明之最終修改權與最終解釋權。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">動態修訂效力：</strong>本公司保留隨時因應後台功能技術重構（如安全性規則升級、前置邀請碼刷新機制、線下雙軌交收驗證演算法優化）或香港法律法規變更，修訂本聲明任何條款之權利。修訂後之條款一經於後台及 App 內發佈即時產生法律效力。全體管理員持續持有後台權限，即視為完全接受並承諾遵守修訂後的最新專業操守聲明。
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <CyberButton onClick={onClose} variant="ghost" className="px-8" id="agree-admin-conduct">
                收到
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
