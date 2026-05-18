import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Camera, RefreshCw, X, ShieldCheck, Send } from 'lucide-react';
import { Activity, ActivityRegistration } from '../types';
import { CyberCard } from './ui/CyberCard';

interface AdminCheckInProps {
  onCheckIn: (eventId: string, userId: string) => Promise<{ success: boolean, message: string }>;
  activities: Activity[];
  registrations: ActivityRegistration[];
}

export const AdminCheckIn: React.FC<AdminCheckInProps> = ({ onCheckIn, activities, registrations }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

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
    setResult(res);
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
        setResult(res);
        if (res.success) {
          setManualPlate('');
        }
      }
    } catch (error) {
      setResult({ success: false, message: '手動簽到失敗 / FAILED' });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const selectedActivity = activities.find(a => a.id === activeActivityId);

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
            onChange={(e) => setActiveActivityId(e.target.value)}
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
                placeholder="輸入車牌號碼 (例: LL885)"
                value={manualPlate}
                onChange={(e) => setManualPlate(e.target.value)}
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
                            <span className="text-cyber-green">{selectedActivity.participants.length} 報名</span>
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
    </div>
  );
};
