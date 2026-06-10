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
                id="close-disclaimer-modal"
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
                  🏛️ 版權、知識產權與全自動審計日誌保護 (Copyright & IP Notice)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">知識產權全屬聲明：</strong>本應用程式 Smart5 Owners（以下簡稱「本系統」）之全機體架構，包括但不限於獨創之「時空線性排序比對演算法」、「分段里程與電量差額累加引擎」、視覺介面設計（UI/UX）、自定義下拉式月份過濾器佈局、團購電子憑證卡與動態加密 QR Code 生成機制、商標標誌、文字闡述、圖像圖示、底層程式碼、資料庫架構（Firestore 集合設計）及經去識別化之群體能耗與充電統計大數據，其完整知識產權、版權及商業秘密均屬 <strong className="text-white">Effortless Production Limited</strong>（以下簡稱「本公司」）及相關權利人共同獨家所有，並受到中華人民共和國香港特別行政區法律、國際版權條約及全球知識產權法律之嚴密保護。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">反逆向工程與禁制令：</strong>未經本公司書面明確授權許可，嚴禁任何個人、第三方車會或商業機構以任何形式、任何技術手段（包括但不限於逆向工程 Reverse Engineering、惡意爬取 API、鏡像複製、惡意抓包、反編譯）對本系統之程式碼、架構或內容進行轉載、修改、分發、或用於任何形式之商業營利行為。本公司保留依法追究一切侵權行為法律責任的權利。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">管理員全自動審計日誌 (Audit Logs)：</strong>用戶及管理團隊知悉並同意，為保障全體會員之數據安全並防止越權操作，本系統設有全自動安全黑盒子監控機制。任何管理員（包括主 Admin 及獲授權處理待審核與線下團購交收銷帳之 Sub Admin）在後台執行之所有數據更動（如新增團購、修改福利、審批成員、執行 QR Code 掃描交收、手動輸入提貨短碼、或於後台列表人手點擊簽收等），系統底層均會實時自動寫入一條不可串改、不可刪除的 <strong className="text-white">auditLogs</strong> 流水紀錄（包含操作者 Email、時間、動作、變更內容描述）。本公司保留隨時調閱此日誌並對任何洩漏商業秘密或惡意破壞系統之人員採取法律追責的權利。
                </p>
              </section>

              {/* Section 02 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">02</span>
                  🚗 服務使用權限、UID 綁定與社群行為規範 (Terms of Use & UID Binding)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">專屬授權對象：</strong>本系統為專屬封閉式非營利社群工具，僅限 Smart #5 實名車主及受邀之特定用戶，作為個人車輛日常行程數據追蹤、智慧能耗分析、官方聚會活動報名、團購市集、及車友福利交流之用途。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">底層 UID 唯一綁定機制（換牌免責）：</strong>用戶知悉並同意，本系統底層採用「用戶不變性唯一識別碼（UID）」作為所有歷史紀錄（充電、能耗、團購、活動、提取物資憑證）之唯一關聯依據。若用戶在現實中變更車輛之車牌號碼，該變更僅屬於前台文字渲染之更新，必須提交予管理團隊進行實名核實審批。用戶不得因更換車牌而主張歷史紀錄丟失、混淆，亦不得以此作為規避團購付款、拒絕認領物資或活動出席責任之辯解理由。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">誠實信用義務與公平性：</strong>用戶承諾所輸入之總里程（ODO）及電池電量（SOC）等數據具備客觀真實性。嚴禁利用自動化腳本、模擬器、竄改封包等任何破壞性行為惡意灌水或干擾雲端資料庫（Firebase / Vercel）之正常運作。
                    </span>
                  </li>
                </ul>
              </section>

              {/* Section 03 */}
              <section className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">03</span>
                  ⚠️ 終極法律及運作免責條款 (Comprehensive Disclaimer)
                </h3>
                <p className="text-xs font-mono uppercase text-white/40 font-bold block mb-2">
                  使用本系統之用戶已充分知悉、理解並同意，本公司、籌委會及開發團隊對於以下事項免除一切法律、經濟、行政與賠償責任：
                </p>
                <ul className="space-y-4 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">數據之非官方參考性與月份過濾（吉利汽車/Smart官方獨立性）：</strong>本系統與智慧汽車（Smart）官方、吉利汽車或任何原廠機構無任何商業關聯。本系統所計算之數據均屬社群演算法之模擬推算，數值僅供參考。用戶使用頂部下拉式過濾器切換特定月份數據時，如因數據未足月或手動錄入時間差導致圖表對比產生誤差，本公司概不負責。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">弱網離線容錯、數據延遲與幽靈通知免責：</strong>本系統設有本地快取與網絡狀態監聽。當用戶身處地下停車場或訊號微弱區域時，系統將自動切換至離線唯讀模式。對於因網絡不穩、電訊中斷、系統緊急維護、第三方底層 API 架構變更或不可抗力因素所導致之數據遺失、覆蓋、儲存延遲或中斷，本公司概不承擔任何賠償責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">團購下架與連帶撤回免責：</strong>如因商戶變卦或數據錯誤，管理團隊在後台對某一團購項目執行「下架/刪除」時，系統將自動啟動連帶清理程序，從全體用戶的手機通知中心內即時連帶撤回該項目的新上架通知。若用戶點擊舊通知而跳轉至空白或顯示「本項目已調整下架」之防呆提示彈窗，用戶理解並同意此為系統之正常防禦機制，本公司不對任何因此未能成功認購商品之損失承擔 any liability.
                    </span>
                  </li>
                  <li className="flex gap-2 items-start text-red-400">
                    <span className="text-red-400 inline-block mt-1">⚠️</span>
                    <span>
                      <strong className="text-white">絕對安全駕駛義務（分心駕駛免責）：</strong>駕駛安全為用戶之最高且唯一義務。用戶（司機）嚴禁在車輛行駛過程中、或任何處於非安全停泊狀態下操作本系統。用戶因違反交通法規、分心駕駛、或於行車時錄入數據、觀看地圖而引致之任何交通意外、人身傷亡、車輛損毀、罰款或對第三方造成之財產損失，後果均由用戶本人自行承擔，本系統及本公司概不承擔任何直接或間接之法律責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">管理員分級、審核放權與名單遮蔽免責：</strong>本系統設有「主 Admin」與「Sub Admin」之分級。Sub Admin 獲授權處理「待審核名單」及「線下團購交收銷帳」，並對「已核准名單」實施資訊局部遮蔽（僅能查閱姓名、電話、車牌）與完全唯讀鎖定。若因 Sub Admin 審理過程產生延誤、手滑誤觸拒絕，或線下交收時因欄位遮蔽、手動校驗導致核對時間延長，用戶同意此為保護全會私隱與系統安全之必要機制，本公司對此不承擔任何法律、經濟或補償責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white font-semibold">用戶帳戶與手機生物辨識之疏忽責任：</strong>用戶必須妥善保護其 Google 登入憑證、手機設備之 Face ID / Touch ID 生物辨識系統。因用戶個人疏忽、設備借予他人使用、或遭遇惡意軟體入侵而導致之帳戶被盜、車輛行程日誌外洩、數據被蓄意修改、或被冒名進行活動報名與團購認購，其法律與經濟後果均由用戶自負。
                    </span>
                  </li>
                </ul>
              </section>

              {/* Section 04 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">04</span>
                  🔐 前置大閘、線下電子憑證冒用與人手簽收終極效力免責 (Pre-auth Gate & Logistics Disclaimer)
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">前置邀請碼大閘與兩週更新免責：</strong>本系統登入前置「兩週動態隨機碼」每 14 天由系統時間戳算法自動刷新更換。如用戶因未能及時從官方 WhatsApp 群組獲取當期最新隨機碼而無法解鎖 Google 登入大閘，或因輸入錯誤邀請碼導致無法進入系統，其所引致之任何活動錯失、團購未能及時認購之損失，本公司及管理團隊概不承擔任何責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white font-semibold">非法盜用主 Admin 萬能應急鑰匙之懲罰性強制登出：</strong>本系統寫有供主 Admin 應急之「萬能應急鑰匙」，並實施「二階段身分安全攔截」。任何普通會員或次級管理員（Sub Admin）若企圖非法輸入或冒用此萬能鑰匙，系統在 Google 授權成功後會自動識別其真實 Firestore 角色，並將非最高 admin 帳戶於 0.05 秒內執行懲罰性強制登出（Sign Out）並踢回大閘外，本公司免除一切法律與經濟賠償責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white font-semibold">團購截止鎖死與電子憑證冒領免責（核心增補）：</strong>團購項目截止鎖死後，系統生成的「加密動態 QR Code」及「4 位數提貨短碼 (PIN Code)」為用戶提取貨物的唯一合法憑證。用戶如私自將手機設備借予他人、將提貨短碼口頭告知第三方、或將屏幕截圖外傳，導致實體物資在線下聚會現場被他人冒領，本公司、籌委會及開發團隊概不承擔任何物資賠償、退款或法律責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white font-semibold">應急人手簽收與系統日誌之終極證據效力（核心增補）：</strong>為應對現場光線、網絡、屏幕碎裂等突發情況，管理員（Admin / Sub Admin）獲權使用「輸入 4 位數提貨短碼」或「後台列表人手簽收」完成線下交收。用戶充分知悉、理解並無條件同意，一旦管理員執行手動簽收，系統底層生成的 <strong className="text-white">auditLogs</strong>（安全審計日誌）流水紀錄即具備最高、最終之法律證據地位。用戶不得以「未實際掃描 QR Code」或「未提供實體簽名」為由，否認已提取物資之事實或要求退款。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">團購限時截止與強制鎖死機制 (Deadline Hard Lock)：</strong>當團購項目越過設定的截止時間後，後台安全性規則（Firestore Security Rules）會立即啟動強制鎖死。用戶永久無法再追加、修改 or 取消認購，名單即時視為最終成交報表，用戶必須對其認購數量及總金額承擔完全之誠信與付款責任。
                    </span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#A3E635] inline-block mt-1">✓</span>
                    <span>
                      <strong className="text-white">活動自訂選項與 PDF 導出知悉：</strong>當管理員發佈活動並啟用「自訂報名問卷」時，用戶所填寫之答案將與車友暱稱、車牌號碼、手提電話一併儲存。用戶充分知悉並同意，當活動停止報名後，管理團隊有權一鍵匯出包含上述資訊的 <strong className="text-[#A3E635]">螢光綠黑客風格 PDF 報名明細表</strong> 用於現場車流調度及簽到點名。
                    </span>
                  </li>
                </ul>
              </section>

              {/* Section 05 */}
              <section className="space-y-3">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">05</span>
                  📜 「數據遺忘權」之絕對不可逆執行 (Data Destruction Notice)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">加密清理程序：</strong>本系統嚴格落實隱私保障協議之「數據遺忘權」規範。當用戶於帳戶設定中主動執行「刪除帳戶」操作時，雲端 Firestore 系統將在背景即時且永久性地清除該 UID 下的所有身份識別資訊、歷史行程日誌、用電充電紀錄及活動報名檔案。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">不可逆轉性提示：</strong>此數據清理操作具備絕對之不可逆性（Irreversible）。一經執行，該帳戶在雲端之所有蹤跡將被徹底洗白，開發者團隊、本公司及 Firebase 後台均無法透過任何技術手段代為恢復或還原數據。請用戶在執行刪除前務必審慎考慮。
                </p>
              </section>

              {/* Section 06 */}
              <section className="space-y-3 pb-4">
                <h3 className="text-[#A3E635] font-mono font-bold flex items-center gap-2 text-md">
                  <span className="text-xs px-1.5 py-0.5 rounded border border-[#A3E635]/30">06</span>
                  🏛️ 聲明之修訂、法律管轄與最終解釋權 (Amendments & Jurisdiction)
                </h3>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">最終解釋權：</strong>Effortless Production Limited 擁有本聲明之最終修改權與最終解釋權。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">動態修訂效力：</strong>本公司保留隨時因應法律法規變更、技術架構調整或社群營運需求，修改本聲明任何條款之權利。修訂後之條款一經於 App 內發佈即時產生法律效力，恕不另行對用戶進行個別通知。用戶持續登入或使用本系統，即視為接受並同意修訂後之全新聲明。
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">法律管轄：</strong>本聲明之解釋及爭議解決，均受中華人民共和國香港特別行政區法律管轄。如協商不成，應正式提交予香港特別行政區具有管轄權之法院進行審理。
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <CyberButton onClick={onClose} variant="ghost" className="px-8" id="agree-disclaimer">
                本人已充分閱讀並同意
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
