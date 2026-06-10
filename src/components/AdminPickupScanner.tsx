import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, 
  Search, Users, QrCode, Package, ShoppingBag, CreditCard, ArrowRight, Key
} from 'lucide-react';
import { GroupBuy, GroupBuyRegistration, UserProfile } from '../types';
import { CyberCard } from './ui/CyberCard';
import { getPickupPin } from '../utils/pin';

interface AdminPickupScannerProps {
  groupBuys: GroupBuy[];
  allProfiles: UserProfile[];
  updateGroupBuyPickupStatus: (gbId: string, targetUserId: string, status: 'pending' | 'picked_up') => Promise<void>;
  updateGroupBuyPaymentStatus: (gbId: string, targetUserId: string, status: 'unpaid' | 'paid') => Promise<void>;
}

interface ScannedData {
  groupBuyId: string;
  userId: string;
  groupBuyTitle: string;
  displayName: string;
  plate: string;
  mobile: string;
  qty: number;
  paymentStatus: 'unpaid' | 'paid';
  pickupStatus: 'pending' | 'picked_up';
}

export const AdminPickupScanner: React.FC<AdminPickupScannerProps> = ({
  groupBuys,
  allProfiles,
  updateGroupBuyPickupStatus,
  updateGroupBuyPaymentStatus
}) => {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // State for showing the scanned checkout dialog
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [scanResultError, setScanResultError] = useState<string | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.trim();
    if (cleanPin.length !== 4) {
      alert('⚠️ 請輸入正確的 4 位數字提貨碼！');
      return;
    }
    
    // Search for a matching registration across active group buys
    let matchedReg: { gb: GroupBuy; reg: GroupBuyRegistration } | null = null;
    
    for (const gb of groupBuys) {
      if (gb.status === 'deleted') continue;
      for (const reg of (gb.currentRegistrations || [])) {
        // Fallback: compare against saved PIN OR deterministically computed fallback PIN
        const currentPin = reg.pickupPin || getPickupPin(gb.id, reg.userId);
        if (currentPin === cleanPin) {
          matchedReg = { gb, reg };
          break;
        }
      }
      if (matchedReg) break;
    }
    
    if (matchedReg) {
      // Find matching registration, load details
      setPinInput(''); // Clear input
      handleLoadRequest(matchedReg.gb.id, matchedReg.reg.userId);
    } else {
      alert('❌ 提貨碼無效，請重新核對！\n(請確認該成員已認購、或短碼是否輸入正確)');
    }
  };

  // Request camera permission on mount to prepare device streams
  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        }
      } catch (err) {
        console.warn("Camera auto stream handshake failed", err);
      }
    };
    requestPermission();
  }, []);

  // Handle active camera scanning state lifecycle
  useEffect(() => {
    if (scanning) {
      const startScanner = async () => {
        try {
          setCameraError(null);
          setScanResultError(null);
          
          const html5QrCode = new Html5Qrcode("pickup-qr-reader");
          html5QrCodeRef.current = html5QrCode;

          const config = { fps: 12, qrbox: { width: 250, height: 250 } };
          
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              try {
                const parsed = JSON.parse(decodedText);
                if (parsed.type === 'group_buy_pickup' && parsed.groupBuyId && parsed.userId) {
                  handleLoadRequest(parsed.groupBuyId, parsed.userId);
                } else {
                  setScanResultError('❌ 認證不符：非本系統之團購領取憑證！');
                }
              } catch (e) {
                setScanResultError('❌ 格式錯誤：無法解析此條碼之數據格式！');
              }
            },
            () => {
              // Ignore frame failures
            }
          );
        } catch (err: any) {
          console.error("Camera Device Error:", err);
          let userMessage = '❌ 無法啟用相機，請檢閱系統瀏覽器設定。';
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            userMessage = '❌ 未獲授權！請於設定中啟用瀏覽器相機並重新整理。';
          }
          setCameraError(userMessage);
          setScanning(false);
        }
      };

      startScanner();
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop()
          .then(() => { html5QrCodeRef.current = null; })
          .catch(e => console.error("Camera stop failure", e));
      }
    };
  }, [scanning]);

  // Load order and profile details based on groupBuyId and userId
  const handleLoadRequest = (groupBuyId: string, userId: string) => {
    // 1. Terminate camera immediately to secure resource focus
    stopCameraStream();

    const gb = groupBuys.find(g => g.id === groupBuyId);
    if (!gb) {
      setScanResultError('❌ 項不符：該官方專案不存在或已被移除。');
      return;
    }

    const registration = (gb.currentRegistrations || []).find(r => r.userId === userId);
    if (!registration) {
      setScanResultError('❌ 無此認購：該車友未對此項目進行認購登記。');
      return;
    }

    // Lookup Profile
    const profile = allProfiles?.find(p => p.id === userId);
    const displayName = profile?.displayName || profile?.username || registration.email?.split('@')[0] || '未知用戶';
    const plate = profile?.plate || '--';
    const mobile = profile?.mobile || profile?.phone || profile?.phoneNumber || '未填寫';

    setScannedData({
      groupBuyId,
      userId,
      groupBuyTitle: gb.title,
      displayName,
      plate,
      mobile,
      qty: registration.qty,
      paymentStatus: registration.paymentStatus || 'unpaid',
      pickupStatus: registration.pickupStatus || 'pending'
    });
  };

  const stopCameraStream = () => {
    setScanning(false);
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop()
        .then(() => { html5QrCodeRef.current = null; })
        .catch(e => console.error(e));
    }
  };

  // Confirm Offline pickup handover signing
  const handleConfirmPickup = async () => {
    if (!scannedData) return;
    setActionLoading(true);
    try {
      await updateGroupBuyPickupStatus(scannedData.groupBuyId, scannedData.userId, 'picked_up');
      
      // Update local stage status
      setScannedData(prev => prev ? { ...prev, pickupStatus: 'picked_up' } : null);
      alert('🟢 簽收成功！交收核實名單已同步更新。');
    } catch (e: any) {
      alert('❌ 簽收失敗: ' + (e.message || '連線錯誤'));
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle bank deposit transfer payment status
  const handleTogglePayment = async () => {
    if (!scannedData) return;
    const nextStatus = scannedData.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    setActionLoading(true);
    try {
      await updateGroupBuyPaymentStatus(scannedData.groupBuyId, scannedData.userId, nextStatus);
      setScannedData(prev => prev ? { ...prev, paymentStatus: nextStatus } : null);
    } catch (e: any) {
      alert('❌ 變更款項狀態失敗: ' + (e.message || '連線錯誤'));
    } finally {
      setActionLoading(false);
    }
  };

  // Search through all registration lists manually across all non-deleted project targets
  const manualMatches = React.useMemo(() => {
    if (!manualQuery.trim()) return [];
    
    const results: Array<{ 
      gb: GroupBuy, 
      reg: GroupBuyRegistration, 
      profile?: UserProfile,
      displayName: string,
      plate: string,
      mobile: string
    }> = [];

    groupBuys
      .filter(gb => gb.status !== 'deleted')
      .forEach(gb => {
        (gb.currentRegistrations || []).forEach(reg => {
          const profile = allProfiles?.find(p => p.id === reg.userId);
          const displayName = profile?.displayName || profile?.username || reg.email?.split('@')[0] || '未知用戶';
          const plate = profile?.plate || '';
          const mobile = profile?.mobile || profile?.phone || profile?.phoneNumber || '';

          const sQuery = manualQuery.toLowerCase();
          if (
            displayName.toLowerCase().includes(sQuery) ||
            plate.toLowerCase().includes(sQuery) ||
            mobile.toLowerCase().includes(sQuery) ||
            gb.title.toLowerCase().includes(sQuery)
          ) {
            results.push({
              gb,
              reg,
              profile,
              displayName,
              plate: plate || '--',
              mobile: mobile || '未填寫'
            });
          }
        });
      });

    return results;
  }, [manualQuery, groupBuys, allProfiles]);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <CyberCard className="bg-black/40 border-white/10 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2 uppercase">
              <QrCode className="text-cyber-green animate-pulse" size={20} />
              團購電子簽收掃描器 / PICKUP SCANNER
            </h3>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest leading-relaxed">
              線下聚會高效率交收專用 • 二維碼秒速識別銷帳
            </p>
          </div>
          <button
            onClick={() => {
              if (scanning) stopCameraStream();
              else setScanning(true);
            }}
            className={`px-5 py-2 rounded-xl font-mono text-xs font-bold font-black transition-all flex items-center gap-2 cursor-pointer select-none ${
              scanning 
                ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
                : 'bg-cyber-green text-black hover:bg-cyber-green/80 shadow-[0_0_15px_rgba(204,255,0,0.2)]'
            }`}
          >
            <Camera size={14} />
            <span>{scanning ? '■ 關閉相機 / STOP' : '📷 啟用相機掃描 / START'}</span>
          </button>
        </div>

        {/* Scan Failures feedback */}
        {scanResultError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2.5 font-mono text-[11px]">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">掃描解析出錯 / RESOLVE ERROR</p>
              <p className="opacity-90 mt-0.5">{scanResultError}</p>
            </div>
            <button onClick={() => setScanResultError(null)} className="ml-auto text-red-400 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Scanner Viewport */}
        {scanning && (
          <div className="mt-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full max-w-sm aspect-square bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-[1px]">
              <div id="pickup-qr-reader" className="w-full h-full object-cover rounded-2xl" />
              {/* Laser scan animation overlay */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-green shadow-[0_0_10px_#ccff00] animate-bounce" />
            </div>
            <p className="text-[10px] text-white/40 font-mono flex items-center gap-1.5 uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-ping mr-0.5" />
              請置入團購專屬取件憑證於螢幕中央
            </p>
          </div>
        )}

        {cameraError && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-3 text-red-400 text-xs font-mono">
            <AlertCircle size={18} />
            <p className="flex-1">{cameraError}</p>
          </div>
        )}
      </CyberCard>

      {/* 4位數提貨短碼 (PIN Code) 驗證區 */}
      <CyberCard className="bg-black/40 border-[#A3E635]/15 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1 px-1.5 bg-[#A3E635]/10 text-[#A3E635] border border-[#A3E635]/20 rounded font-bold font-mono text-[9px] uppercase tracking-wider">
            密碼 / PIN
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              4位數提貨驗證碼 / QUICK PIN VERIFICATION
            </h4>
            <p className="text-[9px] font-mono text-white/30 uppercase">
              車友端因反光或碎屏無法掃描時，請輸入其憑證下方顯示的 4 位提貨密碼驗證
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyPin} className="flex gap-2 max-w-sm">
          <input
            type="text"
            maxLength={4}
            pattern="\d{4}"
            placeholder="輸入 4 位提貨數字碼 (例如 8520)..."
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-center font-mono font-black text-sm tracking-[0.2em] text-cyber-green placeholder-white/25 outline-none focus:border-cyber-green/50 placeholder:tracking-normal placeholder:font-normal placeholder:text-xs"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-cyber-green hover:bg-cyber-green/85 text-black rounded-xl font-mono text-xs font-bold font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-[0_0_10px_rgba(204,255,0,0.15)]"
          >
            <Key size={12} />
            <span>驗證 / VERIFY</span>
          </button>
        </form>
      </CyberCard>

      {/* Manual lookup input block as contingency fallback */}
      <CyberCard className="bg-black/40 border-white/5 p-6 space-y-4">
        <div className="space-y-1">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            备用人手手動查找 / CONTINGENCY SEARCH BACKUP
          </h4>
          <p className="text-[9px] font-mono text-white/30 uppercase">
            當鏡頭異常或相機遭限制時，可以車友姓名、車牌、手機號碼或團購標題在此手動檢索
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
          <input
            type="text"
            placeholder="輸入車友暱稱、車牌、手機、或團購標題..."
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-cyber-green placeholder-white/20 outline-none focus:border-cyber-green/50"
          />
          {manualQuery && (
            <button onClick={() => setManualQuery('')} className="absolute right-3 top-2 text-white/40 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results drawer */}
        {manualQuery && (
          <div className="border border-white/5 bg-black/60 rounded-xl max-h-60 overflow-y-auto divide-y divide-white/5">
            {manualMatches.length === 0 ? (
              <div className="p-4 text-center text-white/25 text-[10px] font-mono uppercase tracking-widest py-8">
                無相符的登記紀錄 / NO MATCHES FOUND
              </div>
            ) : (
              manualMatches.map((m, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleLoadRequest(m.gb.id, m.reg.userId)}
                  className="p-3 hover:bg-white/5 transition-colors cursor-pointer flex justify-between items-center text-xs font-mono"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white font-bold">{m.displayName}</span>
                      {m.plate && (
                        <span className="text-[8px] tracking-wider px-1 py-0.5 bg-cyber-green/10 text-cyber-green border border-cyber-green/20 rounded font-mono font-bold">
                          {m.plate}
                        </span>
                      )}
                      <span className="text-white/40 text-[9px]">({m.mobile})</span>
                    </div>
                    <div className="text-[10px] text-white/50 truncate">
                      團購目標：<strong>{m.gb.title}</strong>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-cyber-green font-bold block">{m.reg.qty} 套</span>
                      <span className="text-[9px] text-white/35">
                        {m.reg.pickupStatus === 'picked_up' ? '✅ 已取件' : '⏳ 未領取'}
                      </span>
                    </div>
                    <ArrowRight size={14} className="text-white/30" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CyberCard>

      {/* Scanned Verification Popup Sheet Dialog */}
      <AnimatePresence>
        {scannedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-cyber-bg border border-[#A3E635]/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(163,230,21,0.15)] relative overflow-hidden"
            >
              {/* Status Header border light */}
              <div className={`absolute top-0 left-0 w-full h-[3px] ${scannedData.pickupStatus === 'picked_up' ? 'bg-cyber-green' : 'bg-amber-400'}`} />

              <div className="space-y-5">
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="text-cyber-green" size={16} />
                      認購查核明細 / REGISTRATION DETAILS
                    </h3>
                    <p className="text-[9px] font-mono text-white/30 uppercase mt-0.5">
                      結算驗收現場確認
                    </p>
                  </div>
                  <button 
                    onClick={() => setScannedData(null)}
                    disabled={actionLoading}
                    className="p-1 -mr-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Main Product Tag */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                  <span className="text-[8px] font-mono text-white/30 uppercase">認購目標團購項目 / MERCHANDISE PROJECT</span>
                  <p className="text-xs font-bold text-cyber-green font-mono">{scannedData.groupBuyTitle}</p>
                </div>

                {/* Member Stats Profile Blocks */}
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  {/* Left Column info */}
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-white/30 text-[9px] block uppercase">車友暱稱 / NAME</span>
                      <span className="text-white font-bold">{scannedData.displayName}</span>
                    </div>
                    <div>
                      <span className="text-white/30 text-[9px] block uppercase">車牌號碼 / PLATE</span>
                      <span className="text-cyber-green font-bold tracking-wide select-all">
                        {scannedData.plate}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/30 text-[9px] block uppercase">手機電話 / PHONE</span>
                      <span className="text-white/80 select-all">{scannedData.mobile}</span>
                    </div>
                  </div>

                  {/* Right Column details */}
                  <div className="space-y-3.5 border-l border-white/5 pl-4 flex flex-col justify-between">
                    <div>
                      <span className="text-white/30 text-[9px] block uppercase">訂購數量 / ORDER QTY</span>
                      <span className="text-white font-black text-lg block">{scannedData.qty} 套</span>
                    </div>
                    
                    {/* Payment Status (Togglable) */}
                    <div>
                      <span className="text-white/30 text-[9px] block uppercase">款項入數狀態 / PAY PAYMENT</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[11px] font-bold ${scannedData.paymentStatus === 'paid' ? 'text-cyber-green' : 'text-amber-400'}`}>
                          {scannedData.paymentStatus === 'paid' ? '✅ 已付款 (PAID)' : '⏳ 未付款 (UNPAID)'}
                        </span>
                        <button
                          onClick={handleTogglePayment}
                          disabled={actionLoading}
                          className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[8px] rounded text-white active:scale-95 transition-all cursor-pointer"
                          title="變更款項狀態"
                        >
                          切換
                        </button>
                      </div>
                    </div>

                    {/* Delivery state */}
                    <div>
                      <span className="text-white/30 text-[9px] block uppercase">領取狀態 / PICKUP STATUS</span>
                      <span className={`text-[11px] font-bold block mt-0.5 ${scannedData.pickupStatus === 'picked_up' ? 'text-cyber-green' : 'text-amber-400'}`}>
                        {scannedData.pickupStatus === 'picked_up' ? '✅ 現場已提取' : '⏳ 待提取交收'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions container with big button */}
                <div className="pt-4 border-t border-white/5 space-y-2.5">
                  {scannedData.pickupStatus === 'picked_up' ? (
                    <div className="w-full py-3 bg-cyber-green/10 text-cyber-green border border-cyber-green/30 rounded-xl font-bold font-mono text-center text-xs flex items-center justify-center gap-2 select-none">
                      <CheckCircle2 size={16} className="stroke-[3]" />
                      本訂單已確認簽收銷帳 (COLLECTED)
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleConfirmPickup}
                      className="w-full py-3 bg-cyber-green text-black hover:bg-cyber-green/80 hover:shadow-[0_0_20px_rgba(204,255,0,0.2)] rounded-xl font-black font-mono text-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          正在完成簽收同步...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} className="stroke-[3]" />
                          🟢 確認現場簽收 (SIGN DELIVERED)
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setScannedData(null);
                      // Resume scanning as convenient flow
                      setScanning(true);
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl font-mono text-[10px] transition-all cursor-pointer text-center block"
                  >
                    關閉並繼續掃描 / SCAN NEXT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
