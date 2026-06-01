import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Camera, RefreshCw, X, ShieldCheck, Send, Search } from 'lucide-react';
import { Activity, ActivityRegistration, UserProfile } from '../types';
import { CyberCard } from './ui/CyberCard';

interface AdminCheckInProps {
  onCheckIn: (eventId: string, userId: string) => Promise<{ success: boolean, message: string }>;
  activities: Activity[];
  registrations: ActivityRegistration[];
  allProfiles?: UserProfile[];
}

interface SpecialPopupData {
  name: string;
  plate: string;
  option: string;
}

export const AdminCheckIn: React.FC<AdminCheckInProps> = ({ onCheckIn, activities, registrations, allProfiles }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // New states for checklist, detailed drawer, and popup alerts
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReg, setSelectedReg] = useState<ActivityRegistration | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [specialPopup, setSpecialPopup] = useState<SpecialPopupData | null>(null);

  // Explicit Permission Request on Mount
  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        }
      } catch (err) {
        console.warn("Initial camera permission request failed", err);
      }
    };
    requestPermission();
  }, []);

  useEffect(() => {
    if (scanning && activeActivityId) {
      const startScanner = async () => {
        try {
          setCameraError(null);
          const html5QrCode = new Html5Qrcode("qr-reader");
          html5QrCodeRef.current = html5QrCode;

          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              try {
                const data = JSON.parse(decodedText);
                handleScan(data);
              } catch (e) {
                setResult({ success: false, message: '無效的 QR Code 格式 / INVALID FORMAT' });
              }
            },
            () => {
              // Ignore frame-by-frame failures
            }
          );
        } catch (err: any) {
          console.error("Camera Start Error:", err);
          let userMessage = '❌ 無法開啟相機，請嘗試重新整理網頁。';
          
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            userMessage = '❌ 權限不足！請前往手機設定允許瀏覽器使用相機。';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            userMessage = '❌ 找不到相機設備，請確保手機鏡頭運作正常。';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            userMessage = '❌ 相機被佔用！請關閉其他使用相機的 App 後再試。';
          }
          
          setCameraError(userMessage);
          setScanning(false);
        }
      };

      startScanner();
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Scanner stop failed", e));
      }
    };
  }, [scanning, activeActivityId]);

  // Helper helper to format dates beautifully
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '--';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('zh-HK', { hour12: false });
    } catch (e) {
      return '--';
    }
  };

  // Profile lookup helper
  const getUserProfile = (userId: string) => {
    return allProfiles?.find(p => p.id === userId);
  };

  // Dynamic popup triggering check
  const triggerPopupCheck = (eventId: string, userId: string): boolean => {
    const activity = activities.find(a => a.id === eventId);
    const reg = registrations.find(r => r.eventId === eventId && r.userId === userId);
    const profile = allProfiles?.find(p => p.id === userId);

    if (activity?.hasCustomOptions && reg?.selectedOption) {
      setSpecialPopup({
        name: profile?.displayName || '未知車友',
        plate: reg.plateNumber || profile?.plate || '--',
        option: reg.selectedOption
      });
      return true;
    }
    return false;
  };

  const handleScan = async (data: { eventId: string, userId: string, plateNumber: string }) => {
    if (data.eventId !== activeActivityId) {
      setResult({ success: false, message: '此 QR Code 不屬於當前活動 / WRONG EVENT' });
      return;
    }

    setScanning(false);
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current = null;
    }

    const res = await onCheckIn(data.eventId, data.userId);
    
    if (res.success) {
      const hasPopup = triggerPopupCheck(data.eventId, data.userId);
      if (hasPopup) {
        setResult(null); // Clear normal checkin prompt since we have special popup
      } else {
        setResult(res);
      }
    } else {
      setResult(res);
    }
  };

  const handleManualCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeActivityId || !manualPlate || isCheckingIn) return;

    setIsCheckingIn(true);
    setResult(null);

    try {
      const reg = registrations.find(r => 
        r.eventId === activeActivityId && 
        r.plateNumber.trim().toUpperCase() === manualPlate.trim().toUpperCase()
      );

      if (!reg) {
        setResult({ success: false, message: '找不到此車牌的報名記錄 / NO REGISTRATION' });
      } else {
        const res = await onCheckIn(activeActivityId, reg.userId);
        if (res.success) {
          setManualPlate('');
          const hasPopup = triggerPopupCheck(activeActivityId, reg.userId);
          if (hasPopup) {
            setResult(null); // Taken over by premium popup
          } else {
            setResult(res);
          }
        } else {
          setResult(res);
        }
      }
    } catch (error) {
      setResult({ success: false, message: '手動簽到失敗 / FAILED' });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const selectedActivity = activities.find(a => a.id === activeActivityId);

  // Filter registrations for active list
  const activeRegs = registrations.filter(r => r.eventId === activeActivityId && r.status !== 'cancelled');

  const filteredRegs = activeRegs.filter(reg => {
    const profile = getUserProfile(reg.userId);
    const needle = searchQuery.toLowerCase().trim();
    if (!needle) return true;
    
    const nameMatch = (profile?.displayName || '車友').toLowerCase().includes(needle);
    const plateMatch = (reg.plateNumber || profile?.plate || '').toLowerCase().includes(needle);
    return nameMatch || plateMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-mono font-bold uppercase text-white mb-1">活動簽到系統 <span className="text-cyber-green">SCANNER</span></h2>
          <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase">管理員專用簽到工具 ADMIN TOOL</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={activeActivityId}
            onChange={(e) => {
              setActiveActivityId(e.target.value);
              setResult(null);
              setScanning(false);
              setSelectedReg(null);
            }}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 font-mono min-w-[200px]"
          >
            <option value="" className="bg-[#121212]">選擇活動 CHOOSE EVENT...</option>
            {activities.map(a => (
              <option key={a.id} value={a.id} className="bg-[#121212]">{a.title} ({a.date})</option>
            ))}
          </select>
          
          <button
            disabled={!activeActivityId || scanning}
            onClick={() => {
              setResult(null);
              setCameraError(null);
              setScanning(true);
            }}
            className="px-6 py-3 bg-cyber-green text-black rounded-xl text-xs font-mono font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:brightness-110 transition-all disabled:opacity-30 disabled:shadow-none"
          >
            <div className="flex items-center gap-2">
              <Camera size={16} />
              開始掃描
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Area */}
        <div className="space-y-4">
          <CyberCard className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 z-10">
               <ShieldCheck size={24} className="text-white/10" />
            </div>
            
            <div className="aspect-square bg-black/40 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10 relative overflow-hidden">
              {scanning ? (
                <div id="qr-reader" className="w-full h-full" />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10 group-hover:border-cyber-green/30 transition-colors">
                    <Camera size={32} className="text-white/20 group-hover:text-cyber-green transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-white/40 uppercase tracking-widest">點擊上方按鈕開始掃描</p>
                    <p className="text-[10px] font-mono text-white/20 mt-1 uppercase">Ready to scan QR Code</p>
                  </div>
                </div>
              )}
              
              {scanning && (
                 <button 
                  onClick={() => setScanning(false)}
                  className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white/60 hover:text-white z-20"
                 >
                   <X size={20} />
                 </button>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-30">
                  <AlertCircle size={40} className="text-red-500 mb-4" />
                  <p className="text-sm text-red-500 font-bold mb-6 font-mono whitespace-pre-line">{cameraError}</p>
                  <button 
                    onClick={() => {
                      setCameraError(null);
                      setScanning(true);
                    }}
                    className="px-6 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-mono text-white hover:bg-white/20 transition-all"
                  >
                    重試 TRY AGAIN
                  </button>
                </div>
              )}
            </div>
          </CyberCard>

          {/* Manual Fallback */}
          <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-4 bg-cyber-green" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-white/60">手動簽到 FALLBACK</h3>
            </div>
            <form onSubmit={handleManualCheckIn} className="flex gap-2">
              <input 
                type="text"
                autoCapitalize="characters"
                placeholder="輸入車牌號碼 (例: LL885)"
                value={manualPlate}
                onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                disabled={!activeActivityId || isCheckingIn}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 font-mono uppercase placeholder:text-white/20 disabled:opacity-30"
              />
              <button
                type="submit"
                disabled={!activeActivityId || !manualPlate || isCheckingIn}
                className="px-6 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green rounded-xl hover:bg-cyber-green hover:text-black transition-all disabled:opacity-30"
              >
                {isCheckingIn ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">
              若相機無法運作，請在此輸入車牌並按發送
            </p>
          </div>
        </div>

        {/* Results / Status Area */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className={`p-8 rounded-3xl border-2 flex flex-col items-center text-center space-y-4 ${
                  result.success 
                    ? 'bg-cyber-green/10 border-cyber-green shadow-[0_0_40px_rgba(204,255,0,0.1)]' 
                    : 'bg-red-500/10 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.1)]'
                }`}>
                  <div className={`p-4 rounded-full ${result.success ? 'bg-cyber-green/20' : 'bg-red-500/20'}`}>
                    {result.success ? <CheckCircle2 size={48} className="text-cyber-green" /> : <AlertCircle size={48} className="text-red-500" />}
                  </div>
                  <div className="space-y-2">
                    <h3 className={`text-2xl font-mono font-black uppercase tracking-tight ${result.success ? 'text-cyber-green' : 'text-red-500'}`}>
                      {result.success ? '驗證通過 SUCCESS' : '驗證失敗 FAILED'}
                    </h3>
                    <p className={`text-sm font-sans ${result.success ? 'text-white/80' : 'text-red-200/70'}`}>
                      {result.message}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setResult(null);
                      setScanning(true);
                    }}
                    className={`mt-4 px-8 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                      result.success 
                        ? 'bg-cyber-green text-black hover:brightness-110' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    <RefreshCw size={16} /> 掃描下一個 NEXT
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] flex flex-col h-full justify-center"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">簽到指引 GUIDELINES</div>
                    <ul className="space-y-4">
                      {[
                        "選擇正確的活動項目",
                        "確保設備已開啟後置相機權限",
                        "對準用戶手機展示的 QR Code",
                        "系統會自動執行雙重驗證 (逾期/重複)",
                        "如相機故障，可使用手動車牌輸入"
                      ].map((text, i) => (
                        <li key={i} className="flex gap-4 text-xs text-white/60 leading-relaxed font-sans">
                          <span className="text-cyber-green font-mono font-bold">0{i+1}.</span>
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedActivity && (
                    <div className="pt-6 border-t border-white/10">
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mb-4">當前選中活動 SELECTED</div>
                      <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                         <div className="font-bold text-white">{selectedActivity.title}</div>
                         <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
                            <span>{selectedActivity.date}</span>
                            <span className="text-cyber-green">{activeRegs.length} 人已報名</span>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Checklist Grid UI - Real-time active activities rendering */}
      {activeActivityId && (
        <div className="mt-8 border border-white/10 bg-black/30 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-cyber-green inline-block"></span>
                車友報名名單 / REGISTRANTS ({activeRegs.length}人)
              </h3>
              <p className="text-[10px] text-white/40 font-mono mt-0.5 uppercase">點擊名單行可查看該車友的詳細檔案與自訂問卷詳情</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-white/30" />
              </span>
              <input 
                type="text" 
                placeholder="搜尋暱稱或車牌..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-cyber-green/50 placeholder:text-white/20 transition-all"
              />
            </div>
          </div>

          {activeRegs.length === 0 ? (
            <div className="text-center py-12 text-white/30 font-mono text-xs leading-relaxed">
              無報名車友資料 / NO ACTIVE REGISTRATIONS FOR THIS EVENT
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-cyber-green/20 text-white/50 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-normal">狀態 STATUS</th>
                    <th className="py-3 px-4 font-normal">車友暱稱 NICKNAME</th>
                    <th className="py-3 px-4 font-normal">車牌號碼 PLATE</th>
                    <th className="py-3 px-4 font-normal">自訂問卷選項 CUSTOM OPTION</th>
                    <th className="py-3 px-4 font-normal text-right">簽到時間 TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredRegs.map((reg, index) => {
                    const profile = getUserProfile(reg.userId);
                    const displayName = profile?.displayName || '車友';
                    const plate = reg.plateNumber || profile?.plate || '--';
                    const isAttended = reg.attended;
                    return (
                      <tr 
                        key={reg.id} 
                        onClick={() => {
                          setSelectedReg(reg);
                          setShowDrawer(true);
                        }}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group active:bg-white/[0.05]"
                      >
                        <td className="py-4 px-4 select-none">
                          {isAttended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider text-cyber-green bg-cyber-green/10 border border-cyber-green shadow-[0_0_10px_rgba(204,255,0,0.15)] uppercase">
                              ● 已出席
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold tracking-wider text-white/40 bg-white/5 border border-white/10 uppercase">
                              ○ 未出席
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-sans font-bold text-white group-hover:text-cyber-green transition-colors">
                          <div className="flex items-center gap-2">
                            {profile?.photoURL ? (
                              <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-white/10 object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white/10 border border-white/5 flex items-center justify-center font-bold text-[10px] text-white/50">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{displayName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-white/80">{plate}</td>
                        <td className="py-4 px-4">
                          {reg.selectedOption ? (
                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[11px] text-white/70 font-sans">
                              {reg.selectedOption}
                            </span>
                          ) : (
                            <span className="text-white/20 font-mono text-[10px] lowercase select-none">無選填 / none</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-white/40 text-[10px]">
                          {reg.attendedAt ? formatTimestamp(reg.attendedAt) : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Questionnaire Premium Alert Popup */}
      <AnimatePresence>
        {specialPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#161616] border-2 border-cyber-green rounded-3xl p-6 shadow-[0_0_50px_rgba(204,255,0,0.25)] text-white space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-cyber-green/10 border border-cyber-green rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                  <CheckCircle2 className="text-cyber-green" size={32} />
                </div>
                <h3 className="text-xl font-mono font-extrabold text-cyber-green tracking-wider uppercase">
                  🎉 簽到成功！
                </h3>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl font-sans space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-white/40 font-mono text-xs uppercase">車友暱稱 Nickname</span>
                  <span className="font-bold text-white text-base">{specialPopup.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-white/40 font-mono text-xs uppercase">車牌號碼 Plate</span>
                  <span className="font-bold text-cyber-green font-mono text-base">{specialPopup.plate}</span>
                </div>
                
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-white/30 uppercase block mb-1">⏱️ 車友自訂備註選項 / CUSTOM OPTION</span>
                  <div className="p-3 bg-cyber-green/5 border border-cyber-green/20 rounded-xl text-center">
                    <p className="text-xs font-bold text-cyber-green">【 {specialPopup.option} 】</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSpecialPopup(null);
                  setResult(null);
                  setScanning(true);
                }}
                className="w-full py-4 bg-cyber-green text-black rounded-xl font-mono font-extrabold uppercase text-xs tracking-widest shadow-[0_0_25px_rgba(204,255,0,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                了解，關閉 CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slide-over Detailed Drawer / Modal */}
      <AnimatePresence>
        {showDrawer && selectedReg && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Drawer Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[#0d0d0d] border-l border-white/10 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider">車友詳細檔案 PROFILE</h3>
                    <p className="text-[9px] font-mono text-white/40 uppercase">Smart #5 Owners Club User Details</p>
                  </div>
                  <button 
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-full text-white/60 hover:text-white transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* User Profile Info Card */}
                {(() => {
                  const profile = getUserProfile(selectedReg.userId);
                  const displayName = profile?.displayName || '車友';
                  const plate = selectedReg.plateNumber || profile?.plate || '--';
                  const isAttended = selectedReg.attended;
                  
                  return (
                    <div className="space-y-6 font-sans">
                      {/* Profile Top with Avatar and Nickname */}
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        {profile?.photoURL ? (
                          <img 
                            src={profile.photoURL} 
                            alt="Avatar" 
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-full border-2 border-cyber-green object-cover shadow-[0_0_15px_rgba(204,255,0,0.15)]" 
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center font-mono font-bold text-2xl text-white/40">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-lg font-sans font-extrabold text-white">{displayName}</h4>
                          <span className="text-[10px] font-mono text-white/40 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            ID: {selectedReg.userId.substring(0, 10)}...
                          </span>
                        </div>
                      </div>

                      {/* Profile Detailed Fields */}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                        <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">🚗 車牌號碼 / LICENSE PLATE</span>
                          <span className="text-base font-bold text-cyber-green font-mono">{plate}</span>
                        </div>

                        <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">📱 手提號碼 / MOBILE NUMBER</span>
                          <span className="text-sm font-semibold text-white font-mono">{profile?.phoneNumber || '-- (未提供 / Not provided)'}</span>
                        </div>

                        <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">🎯 報名狀態 / REGISTRATION STATUS</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-cyber-green/10 border border-cyber-green/20 text-cyber-green rounded-full font-bold">
                              {selectedReg.status === 'registered' ? '已報名 REGISTERED' : selectedReg.status}
                            </span>
                            {isAttended ? (
                              <span className="pointer-events-none select-none text-[10px] px-2 py-0.5 bg-cyber-green text-black rounded-full font-mono font-bold uppercase tracking-wider animate-pulse">
                                ● 已出席 ATTENDED
                              </span>
                            ) : (
                              <span className="pointer-events-none select-none text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 text-white/40 rounded-full font-mono font-semibold uppercase tracking-wider">
                                ○ 未出席 NOT ATTENDED
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">⏱️ 簽到時間 / CHECKED IN AT</span>
                          <span className="text-xs font-semibold text-white/80 font-mono">
                            {selectedReg.attendedAt ? formatTimestamp(selectedReg.attendedAt) : '尚未簽到 NOT CHECKED IN'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 pt-1">
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1">📋 車友問卷備註 / CUSTOM OPTION</span>
                          {selectedReg.selectedOption ? (
                            <div className="p-3 bg-cyber-green/5 border border-cyber-green/20 rounded-xl">
                              <p className="text-xs font-bold text-cyber-green">{selectedReg.selectedOption}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-white/30 italic font-mono lowercase">無問卷選項或自訂備註 / no custom answers</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action buttons inside Drawer */}
              <div className="pt-6 border-t border-white/10 space-y-3">
                {!selectedReg.attended && (
                  <button
                    onClick={async () => {
                      const res = await onCheckIn(selectedReg.eventId, selectedReg.userId);
                      if (res.success) {
                        const hasPopup = triggerPopupCheck(selectedReg.eventId, selectedReg.userId);
                        if (hasPopup) {
                          setResult(null); // specialPopup displays instead
                        } else {
                          setResult(res);
                        }
                        setShowDrawer(false);
                      } else {
                        alert(res.message);
                      }
                    }}
                    className="w-full py-3 bg-cyber-green text-black hover:brightness-110 active:scale-95 text-xs font-mono font-bold tracking-widest uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] cursor-pointer animate-pulse"
                  >
                    直接在此執行簽到 CHECK IN
                  </button>
                )}
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white font-mono text-xs font-bold rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                >
                  關閉視窗 CLOSE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
