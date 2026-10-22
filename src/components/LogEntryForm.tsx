import React, { useState, useEffect, useRef } from 'react';
import { 
  Battery, 
  MapPin, 
  Gauge, 
  DollarSign, 
  Zap, 
  Clock, 
  Save, 
  X, 
  AlertCircle, 
  Sparkles,
  ShoppingBag,
  Wrench,
  CheckCircle2,
  Car,
  Camera,
  WifiOff,
  RefreshCw,
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle, LogEntry, RecordType } from '../types';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { saveOfflineRecord, getOfflineQueue, syncOfflineQueue } from '../utils/offlineQueue';
import { scanDashboardImage, ExtractedDashboardData } from '../utils/ocrScanner';

interface LogEntryFormProps {
  vehicle: Vehicle;
  logs: LogEntry[];
  onSave: (data: any) => Promise<any>;
  onCancel: () => void;
  onOpenTimer?: () => void;
  initialData?: {
    type?: RecordType;
    amountHKD?: number;
    kwhAdded?: number;
    location?: string;
    notes?: string;
    odoKM?: number;
    currentSOC?: number;
    consumption?: number;
  };
}

export const LogEntryForm: React.FC<LogEntryFormProps> = ({ 
  vehicle, 
  logs = [], 
  onSave, 
  onCancel,
  onOpenTimer,
  initialData
}) => {
  // Compute fallback previous ODO and SOC
  const previousODO = vehicle?.lastOdometer ?? (logs.length > 0 ? Number(logs[0].odo ?? logs[0].odometer ?? 0) : 0);
  const previousSOC = vehicle?.lastBatteryPercent ?? (logs.length > 0 ? Number(logs[0].soc ?? logs[0].batteryPercent ?? 100) : 100);

  // Category Type: 'driving' | 'charging' | 'parking' | 'maintenance' | 'accessory' | 'other'
  const [selectedType, setSelectedType] = useState<RecordType>(initialData?.type || 'driving');
  
  // Form fields
  const [amountHKD, setAmountHKD] = useState<string>(
    initialData?.amountHKD !== undefined 
      ? String(initialData.amountHKD) 
      : (initialData?.type === 'driving' || (!initialData?.type) ? '0' : '')
  );
  const [kwhAdded, setKwhAdded] = useState<string>(initialData?.kwhAdded !== undefined ? String(initialData.kwhAdded) : '');
  const [location, setLocation] = useState<string>(initialData?.location || '');
  const [recordDate, setRecordDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [recordTime, setRecordTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState<string>(initialData?.notes || '');

  // Driving specific data fields (DRIVING DATA)
  const [odoKM, setOdoKM] = useState<string>(
    initialData?.odoKM !== undefined ? String(initialData.odoKM) : ''
  );
  const [currentSOC, setCurrentSOC] = useState<string>(
    initialData?.currentSOC !== undefined 
      ? String(initialData.currentSOC) 
      : (previousSOC ? String(previousSOC) : '76')
  );
  const [consumption, setConsumption] = useState<string>(
    initialData?.consumption !== undefined ? String(initialData.consumption) : ''
  );

  // Vehicle states (for charging/other updates)
  const [odometer, setOdometer] = useState<number | string>(vehicle?.lastOdometer || '');
  const [battery, setBattery] = useState<number | string>(vehicle?.lastBatteryPercent || 100);
  const [startSoc, setStartSoc] = useState<number | string>(vehicle?.lastBatteryPercent || 40);
  const [endSoc, setEndSoc] = useState<number | string>(100);
  const [trackVehicleStatus, setTrackVehicleStatus] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'offline' | null; message: string }>({ type: null, message: '' });

  // 📴 離線支援與暫存隊列 (Offline Sync Queue)
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // 📷 儀表板/單據 OCR 拍照辨識狀態
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ percent: number; status: string }>({ percent: 0, status: '' });
  const [ocrResult, setOcrResult] = useState<ExtractedDashboardData | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<{
    odo?: boolean;
    soc?: boolean;
    kwh?: boolean;
    amount?: boolean;
  }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraContext, setCameraContext] = useState<'driving' | 'charging' | 'receipt'>('driving');

  // 監聽網絡與離線隊列變化
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const updateQueue = () => setOfflinePendingCount(getOfflineQueue().length);

    updateQueue();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('smart5_offline_queue_changed', updateQueue);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('smart5_offline_queue_changed', updateQueue);
    };
  }, []);

  // Update when initialData changes
  useEffect(() => {
    if (initialData) {
      if (initialData.type) setSelectedType(initialData.type);
      if (initialData.location) setLocation(initialData.location);
      if (initialData.notes) setNotes(initialData.notes);
      if (initialData.amountHKD !== undefined) setAmountHKD(String(initialData.amountHKD));
      if (initialData.kwhAdded !== undefined) setKwhAdded(String(initialData.kwhAdded));
      if (initialData.odoKM !== undefined) setOdoKM(String(initialData.odoKM));
      if (initialData.currentSOC !== undefined) setCurrentSOC(String(initialData.currentSOC));
      if (initialData.consumption !== undefined) setConsumption(String(initialData.consumption));
    }
  }, [initialData]);

  // Real-time calculation of unit electricity price
  const numAmount = Number(amountHKD) || 0;
  const numKwh = Number(kwhAdded) || 0;
  const unitPrice = numKwh > 0 && numAmount > 0 ? (numAmount / numKwh).toFixed(2) : null;

  // Estimate kWh added from battery capacity & SOC if user didn't enter kWh for charging
  useEffect(() => {
    if (selectedType === 'charging' && (!kwhAdded || kwhAdded === '0') && vehicle?.batteryCapacity) {
      const diff = Math.max(0, Number(endSoc) - Number(startSoc));
      if (diff > 0) {
        const estKwh = parseFloat(((diff / 100) * vehicle.batteryCapacity).toFixed(1));
        setKwhAdded(String(estKwh));
      }
    }
  }, [startSoc, endSoc, selectedType, vehicle?.batteryCapacity]);

  const handleTypeSelect = (type: RecordType) => {
    setSelectedType(type);
    if (type === 'driving') {
      if (!amountHKD || amountHKD === '') {
        setAmountHKD('0');
      }
      if (!currentSOC && previousSOC) {
        setCurrentSOC(String(previousSOC));
      }
    }
  };

  // 📷 觸發相機拍照或選擇照片
  const handleTriggerCamera = (context: 'driving' | 'charging' | 'receipt') => {
    setCameraContext(context);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // 📷 處理拍攝/選擇之照片並進行 OCR 辨識
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrScanning(true);
    setOcrResult(null);
    setOcrProgress({ percent: 10, status: '正在載入儀表板相片...' });

    try {
      const extracted = await scanDashboardImage(file, (percent, status) => {
        setOcrProgress({ percent, status });
      });

      setOcrResult(extracted);
      const newHighlights: typeof highlightedFields = {};

      // 自動將辨識到的數值填入對應欄位
      if (extracted.odoKM !== null) {
        setOdoKM(String(extracted.odoKM));
        setOdometer(extracted.odoKM);
        newHighlights.odo = true;
      }
      if (extracted.soc !== null) {
        setCurrentSOC(String(extracted.soc));
        setBattery(extracted.soc);
        setEndSoc(extracted.soc);
        newHighlights.soc = true;
      }
      if (extracted.kwhAdded !== null && (selectedType === 'charging' || cameraContext === 'charging')) {
        setKwhAdded(String(extracted.kwhAdded));
        newHighlights.kwh = true;
      }
      if (extracted.amountHKD !== null && (cameraContext === 'receipt' || extracted.amountHKD > 0)) {
        setAmountHKD(String(extracted.amountHKD));
        newHighlights.amount = true;
      }

      setHighlightedFields(newHighlights);

      // 邊框螢光綠高亮提示持續 6 秒後漸隱
      setTimeout(() => {
        setHighlightedFields({});
      }, 6000);

    } catch (err: any) {
      console.error('OCR 辨識失敗:', err);
      setSaveStatus({
        type: 'error',
        message: '📷 相片分析失敗：' + (err.message || '請確認相片清晰或手動輸入')
      });
    } finally {
      setIsOcrScanning(false);
    }
  };

  // 📴 手動執行離線隊列同步
  const handleManualSync = async () => {
    if (isSyncingOffline || !navigator.onLine) return;
    setIsSyncingOffline(true);
    await syncOfflineQueue();
    setIsSyncingOffline(false);
    setOfflinePendingCount(getOfflineQueue().length);
  };

  // 🚀 提交寫入表單 (包含離線攔截與上線連動)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveStatus({ type: null, message: '' });

    try {
      // Build date-time timestamp
      const [year, month, day] = recordDate.split('-').map(Number);
      const [hours, minutes] = recordTime.split(':').map(Number);
      const fullDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
      const recordTimestamp = Timestamp.fromDate(fullDate);

      const parsedAmount = amountHKD ? parseFloat(Number(amountHKD).toFixed(2)) : 0;
      const parsedKwh = selectedType === 'charging' && kwhAdded ? parseFloat(Number(kwhAdded).toFixed(2)) : 0;
      
      let parsedOdo = 0;
      let parsedSoc = 100;

      if (selectedType === 'driving') {
        parsedOdo = odoKM !== '' ? Number(odoKM) : Number(previousODO || 0);
        parsedSoc = currentSOC !== '' ? Number(currentSOC) : Number(previousSOC || 100);
      } else {
        parsedOdo = odometer !== '' ? Number(odometer) : Number(vehicle?.lastOdometer || 0);
        parsedSoc = Number(battery) || 100;
      }

      // Unified record payload
      const payload: any = {
        type: selectedType,
        amountHKD: parsedAmount,
        kwhAdded: parsedKwh,
        location: location.trim(),
        recordDate: recordTimestamp,
        recordDateStr: fullDate.toISOString(),
        notes: notes.trim(),
        // Vehicle state fields for real-time synchronization
        odometer: parsedOdo,
        batteryPercent: parsedSoc,
        startSoc: Number(startSoc) || 0,
        endSoc: selectedType === 'charging' ? (Number(endSoc) || 100) : parsedSoc,
        isCharging: selectedType === 'charging',
        cost: parsedAmount,
        vehicleId: vehicle?.id || '',
        plateNumber: vehicle?.plate || ''
      };

      // Add specific fields for driving
      if (selectedType === 'driving') {
        payload.odoKM = parsedOdo;
        payload.currentSOC = parsedSoc;
        payload.startSoc = previousSOC;
        payload.startOdo = previousODO;

        if (previousODO > 0 && parsedOdo > previousODO) {
          payload.tripKM = parsedOdo - previousODO;
        }
        if (previousSOC > 0) {
          payload.deltaSOC = parsedSoc - previousSOC;
        }

        if (consumption !== '' && !isNaN(Number(consumption))) {
          payload.consumption = Number(consumption);
        } else if (payload.tripKM && payload.tripKM > 0 && payload.deltaSOC && payload.deltaSOC < 0) {
          const batteryCap = vehicle?.batteryCapacity || 100;
          const drop = Math.abs(payload.deltaSOC);
          const kwhUsed = (drop / 100) * batteryCap;
          const kwhPer100Km = (kwhUsed / payload.tripKM) * 100;
          if (kwhPer100Km > 0 && kwhPer100Km < 80) {
            payload.calculatedConsumption = kwhPer100Km.toFixed(1);
          }
        }
      }

      // 📴 離線攔截邏輯：若無網絡連線 (!navigator.onLine)，將數據寫入 localStorage 暫存隊列
      if (!navigator.onLine) {
        saveOfflineRecord(payload);
        setSaveStatus({
          type: 'offline',
          message: '📴 目前處於離線狀態，記錄已暫存於手機，待重回網絡後將自動上傳！'
        });

        setTimeout(() => {
          onCancel();
        }, 2200);
        setIsLoading(false);
        return;
      }

      // 在線時正常寫入 Firestore
      await onSave(payload);

      setSaveStatus({
        type: 'success',
        message: '✅ 記錄已成功儲存！'
      });

      setTimeout(() => {
        onCancel();
      }, 500);

    } catch (err: any) {
      console.error("Failed to save record:", err);

      // 防呆：若因信號微弱/地庫斷網拋出錯誤，自動退回離線隊列暫存
      if (!navigator.onLine || err?.code === 'unavailable' || err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('offline')) {
        const payloadFallback: any = {
          type: selectedType,
          amountHKD: amountHKD ? parseFloat(Number(amountHKD).toFixed(2)) : 0,
          kwhAdded: selectedType === 'charging' && kwhAdded ? parseFloat(Number(kwhAdded).toFixed(2)) : 0,
          location: location.trim(),
          notes: notes.trim(),
          vehicleId: vehicle?.id || '',
          plateNumber: vehicle?.plate || '',
          odoKM: odoKM !== '' ? Number(odoKM) : Number(previousODO || 0),
          currentSOC: currentSOC !== '' ? Number(currentSOC) : Number(previousSOC || 100)
        };
        saveOfflineRecord(payloadFallback);

        setSaveStatus({
          type: 'offline',
          message: '📴 網絡訊號中斷，記錄已安全暫存於本地離線隊列，連線時將自動補傳！'
        });

        setTimeout(() => {
          onCancel();
        }, 2200);
        setIsLoading(false);
        return;
      }

      setSaveStatus({
        type: 'error',
        message: '❌ 儲存失敗：' + (err.message || '未知錯誤')
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* 隱藏的原生相機/檔案選擇器 */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        onChange={handleImageSelected}
        className="hidden" 
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Top Header Card & Quick Timer Launcher */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>新增開支與用車記錄</span>
              {!isOnline && (
                <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <WifiOff size={10} /> 離線中
                </span>
              )}
            </h3>
            <p className="text-[10px] font-mono text-white/40">
              EXPENSE & CHARGING INPUT CONSOLE
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTimer && (
              <button
                type="button"
                onClick={onOpenTimer}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-cyber-green/40 text-cyber-green hover:bg-cyber-green/10 transition-colors font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(204,255,0,0.1)]"
              >
                <Clock size={15} />
                <span>🅿️ 計時</span>
              </button>
            )}
          </div>
        </div>

        {/* 📴 離線模式提示與待同步隊列狀態條 */}
        {!isOnline && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff size={16} className="shrink-0 animate-pulse text-amber-400" />
              <span className="leading-tight">地庫弱網環境保護：記錄將直接暫存於手機本地隊列，重回網絡後自動上傳！</span>
            </div>
            {offlinePendingCount > 0 && (
              <span className="shrink-0 bg-amber-500/20 px-2 py-1 rounded text-[10px] font-bold">
                暫存: {offlinePendingCount} 筆
              </span>
            )}
          </div>
        )}

        {isOnline && offlinePendingCount > 0 && (
          <div className="p-3.5 rounded-xl bg-cyber-green/10 border border-cyber-green/30 text-cyber-green text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={15} className={`shrink-0 ${isSyncingOffline ? 'animate-spin' : ''}`} />
              <span>本地有 {offlinePendingCount} 筆離線記錄待同步</span>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingOffline}
              className="px-2.5 py-1 rounded-lg bg-cyber-green text-black font-bold text-[10px] hover:bg-cyber-green/80 cursor-pointer transition-all"
            >
              {isSyncingOffline ? '同步中...' : '立即上傳'}
            </button>
          </div>
        )}

        {/* 📷 OCR 載入與進度回饋 */}
        {isOcrScanning && (
          <div className="p-4 rounded-2xl bg-cyber-green/5 border border-cyber-green/40 relative overflow-hidden space-y-2.5 shadow-[0_0_20px_rgba(204,255,0,0.15)]">
            <div className="flex items-center justify-between text-xs font-mono text-cyber-green font-bold">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-cyber-green" />
                <span>正在分析儀表板數據... [{ocrProgress.percent}%]</span>
              </div>
              <span className="text-[10px] text-white/50">{ocrProgress.status}</span>
            </div>
            <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-cyber-green/20">
              <div 
                className="bg-cyber-green h-full transition-all duration-300 shadow-[0_0_10px_#ccff00]" 
                style={{ width: `${ocrProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* 📷 OCR 辨識結果確認卡片 */}
        {ocrResult && !isOcrScanning && (
          <div className="p-4 rounded-2xl bg-cyber-green/10 border border-cyber-green/40 text-xs font-mono space-y-2.5 shadow-[0_0_20px_rgba(204,255,0,0.15)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyber-green font-bold">
                <CheckCircle2 size={16} className="text-cyber-green" />
                <span>儀表板 / 單據 OCR 辨識成功！</span>
              </div>
              <button
                type="button"
                onClick={() => setOcrResult(null)}
                className="text-white/40 hover:text-white text-[10px] cursor-pointer"
              >
                關閉提示
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {ocrResult.odoKM !== null && (
                <div className="bg-black/50 p-2 rounded-xl border border-cyber-green/30">
                  <span className="text-white/40 block text-[9px] uppercase">識別里程 (ODO)</span>
                  <span className="text-cyber-green font-black text-sm">{ocrResult.odoKM.toLocaleString()} KM</span>
                </div>
              )}
              {ocrResult.soc !== null && (
                <div className="bg-black/50 p-2 rounded-xl border border-cyber-green/30">
                  <span className="text-white/40 block text-[9px] uppercase">識別電量 (SOC)</span>
                  <span className="text-cyber-green font-black text-sm">{ocrResult.soc}%</span>
                </div>
              )}
              {ocrResult.kwhAdded !== null && (
                <div className="bg-black/50 p-2 rounded-xl border border-cyber-green/30">
                  <span className="text-white/40 block text-[9px] uppercase">識別度數 (kWh)</span>
                  <span className="text-cyber-green font-black text-sm">{ocrResult.kwhAdded} kWh</span>
                </div>
              )}
              {ocrResult.amountHKD !== null && (
                <div className="bg-black/50 p-2 rounded-xl border border-cyber-green/30">
                  <span className="text-white/40 block text-[9px] uppercase">識別金額</span>
                  <span className="text-cyber-green font-black text-sm">HK$ {ocrResult.amountHKD}</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-cyber-green/80 flex items-center gap-1.5 pt-0.5">
              <Sparkles size={12} className="text-cyber-green shrink-0" />
              <span>已自動填入下方對應欄位，邊框已螢光綠高亮提示，請手動確認或微調後提交。</span>
            </p>
          </div>
        )}

        {/* 1. 補回記錄類別標籤 (SELECT TYPE) */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase text-cyber-green tracking-widest block font-bold">
            選擇記錄類別 / SELECT TYPE
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'driving', label: '日常行車', icon: '🚗' },
              { id: 'charging', label: '充電', icon: '⚡' },
              { id: 'parking', label: '泊車', icon: '🅿️' },
              { id: 'maintenance', label: '保養', icon: '🔧' },
              { id: 'accessory', label: '配件', icon: '🛍️' },
              { id: 'other', label: '其他', icon: '📄' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleTypeSelect(cat.id as RecordType)}
                className={`py-3 px-1.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  selectedType === cat.id
                    ? 'bg-cyber-green text-black border-cyber-green font-black shadow-[0_0_18px_rgba(204,255,0,0.35)] scale-[1.03]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <span className="text-xl leading-none select-none">{cat.icon}</span>
                <span className="text-[11px] font-mono whitespace-nowrap font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. 開支金額區塊 (AMOUNT HKD) */}
        <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-mono uppercase text-cyber-green tracking-widest font-bold">
              開支金額 / AMOUNT (HKD)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                {selectedType === 'driving' ? '日常行車預設 $0 (可選填過路費/隧道費)' : '港幣結算'}
              </span>
              <button
                type="button"
                onClick={() => handleTriggerCamera('receipt')}
                disabled={isOcrScanning}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all"
                title="拍攝發票或單據自動辨識金額"
              >
                <Camera size={11} className="text-cyber-green" />
                <span>📷 拍單據</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-mono text-cyber-green font-bold">
              $
            </span>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.0"
              value={amountHKD}
              onChange={(e) => setAmountHKD(e.target.value)}
              className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 font-mono text-2xl font-black text-white focus:outline-none transition-all ${
                highlightedFields.amount 
                  ? 'border-cyber-green ring-2 ring-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.4)] animate-pulse' 
                  : 'border-white/15 focus:border-cyber-green'
              }`}
              required={selectedType !== 'driving'}
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(selectedType === 'driving' 
              ? [0, 8, 20, 25, 30, 50, 100] 
              : [0, 50, 100, 150, 200, 300, 500]
            ).map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmountHKD(String(val))}
                className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                {val === 0 ? '免費 / $0' : `+$${val}${selectedType === 'driving' && val === 20 ? ' (過海)' : ''}`}
              </button>
            ))}
          </div>

          {/* Charging Unit Price Box */}
          {selectedType === 'charging' && (
            <div className="mt-3 p-3 rounded-xl bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-white/70">
                <Sparkles size={14} className="text-cyber-green" />
                <span>平均充電單價：</span>
              </div>
              <div className="font-bold text-cyber-green text-sm">
                {unitPrice ? `⚡ HK$ ${unitPrice} / kWh` : '需輸入充入度數'}
              </div>
            </div>
          )}
        </div>

        {/* 3A. 核心行車數據區塊 (DRIVING DATA) - 當選取「🚗 日常行車」時動態切換顯示 */}
        {selectedType === 'driving' && (
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-cyber-green/30 space-y-4 shadow-[0_0_20px_rgba(204,255,0,0.06)]">
            <div className="flex justify-between items-center border-b border-cyber-green/20 pb-3">
              <span className="text-[11px] font-mono uppercase text-cyber-green font-bold tracking-wider flex items-center gap-2">
                <Car size={16} className="text-cyber-green" />
                核心行車數據 (DRIVING DATA)
              </span>
              <span className="text-[10px] font-mono text-cyber-green/70 bg-cyber-green/10 px-2 py-0.5 rounded-full border border-cyber-green/20">
                連動真實續航估算
              </span>
            </div>

            {/* 當前總里程 (ODO KM) - 必填 + 📷 拍照辨識按鈕 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono uppercase text-white/90 font-bold flex items-center gap-1.5">
                  <Gauge size={14} className="text-cyber-green" />
                  當前總里程 (ODO KM) <span className="text-cyber-green">*必填</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                    上次: {previousODO > 0 ? previousODO.toLocaleString() : '0'} KM
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTriggerCamera('driving')}
                    disabled={isOcrScanning}
                    className="px-2.5 py-1 rounded-lg bg-cyber-green/10 hover:bg-cyber-green/20 border border-cyber-green/40 text-cyber-green text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_10px_rgba(204,255,0,0.15)] active:scale-95"
                    title="調用相機拍攝車機儀表板辨識里程與電量"
                  >
                    <Camera size={13} />
                    <span>📷 拍照自動辨識</span>
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder={previousODO > 0 ? String(previousODO) : '例如: 12500'}
                  value={odoKM}
                  onChange={(e) => setOdoKM(e.target.value)}
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 font-mono text-white text-lg font-bold focus:outline-none transition-all ${
                    highlightedFields.odo 
                      ? 'border-cyber-green ring-2 ring-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.4)] animate-pulse' 
                      : 'border-white/15 focus:border-cyber-green'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40 font-bold">
                  KM
                </span>
              </div>
            </div>

            {/* 當前剩餘電量 (SOC %) - 必填 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono uppercase text-white/90 font-bold flex items-center gap-1.5">
                  <Battery size={14} className="text-cyber-green" />
                  當前剩餘電量 (SOC %) <span className="text-cyber-green">*必填</span>
                </label>
                <span className="text-[10px] font-mono text-white/40">
                  儀表即時電量 (0 - 100%)
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  required
                  placeholder="例如: 76"
                  value={currentSOC}
                  onChange={(e) => setCurrentSOC(e.target.value)}
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 font-mono text-white text-lg font-bold focus:outline-none transition-all ${
                    highlightedFields.soc 
                      ? 'border-cyber-green ring-2 ring-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.4)] animate-pulse' 
                      : 'border-white/15 focus:border-cyber-green'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-cyber-green font-bold">
                  %
                </span>
              </div>
            </div>

            {/* 平均能耗 (kWh/100km) - 選填 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono uppercase text-white/60">
                  平均能耗 (kWh/100km) <span className="text-white/30">(選填)</span>
                </label>
                <span className="text-[10px] font-mono text-white/40">
                  車機顯示的該趟能耗
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="例如: 15.6"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 font-mono text-white text-base focus:outline-none focus:border-cyber-green transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">
                  kWh/100km
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3B. 充電度數區塊 (CHARGING DATA) - 當選取「⚡ 充電」時顯示 */}
        {selectedType === 'charging' && (
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-cyber-green/20 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono uppercase text-cyber-green font-bold tracking-wider flex items-center gap-1">
                <Zap size={14} /> 充電度數與電量變化 (CHARGING DATA)
              </span>
              <button
                type="button"
                onClick={() => handleTriggerCamera('charging')}
                disabled={isOcrScanning}
                className="px-2.5 py-1 rounded-lg bg-cyber-green/10 hover:bg-cyber-green/20 border border-cyber-green/40 text-cyber-green text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_10px_rgba(204,255,0,0.15)] active:scale-95"
                title="拍攝充電樁螢幕或充電單據自動辨識度數與金額"
              >
                <Camera size={13} />
                <span>📷 拍照自動辨識</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-white/50">
                充入度數 / ENERGY ADDED (kWh)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="例如: 35.5"
                value={kwhAdded}
                onChange={(e) => setKwhAdded(e.target.value)}
                className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 font-mono text-white text-base font-bold focus:outline-none transition-all ${
                  highlightedFields.kwh 
                    ? 'border-cyber-green ring-2 ring-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.4)] animate-pulse' 
                    : 'border-white/10 focus:border-cyber-green'
                }`}
              />
            </div>

            {/* Start SOC to End SOC */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/50">充電前電量 (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={startSoc}
                  onChange={(e) => setStartSoc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-white text-sm focus:outline-none focus:border-cyber-green"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-cyber-green font-bold">充電後電量 (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={endSoc}
                  onChange={(e) => setEndSoc(e.target.value)}
                  className={`w-full bg-white/5 border rounded-xl px-3 py-2 font-mono text-white text-sm focus:outline-none transition-all ${
                    highlightedFields.soc 
                      ? 'border-cyber-green ring-2 ring-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.4)] animate-pulse' 
                      : 'border-white/10 focus:border-cyber-green'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. 日期與時間選擇器 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-cyber-green tracking-widest block font-bold">
              記錄日期 / DATE
            </label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-white text-xs focus:outline-none focus:border-cyber-green cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-cyber-green tracking-widest block font-bold">
              時間 / TIME
            </label>
            <input
              type="time"
              value={recordTime}
              onChange={(e) => setRecordTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-white text-xs focus:outline-none focus:border-cyber-green cursor-pointer"
            />
          </div>
        </div>

        {/* 5. 地點 / 路線 / 充電商名稱 */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase text-cyber-green tracking-widest block font-bold">
            {selectedType === 'driving' ? '行車路線 / 出發地點 (選填)' : '地點 / 商場 / 充電商名稱 (LOCATION)'}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
              <MapPin size={16} />
            </span>
            <input
              type="text"
              placeholder={
                selectedType === 'driving' ? '例: 中環往九龍塘 / 經西隧通勤 (選填)' :
                selectedType === 'charging' ? '例: Evoasis 快充 / 中電 50kW' :
                selectedType === 'parking' ? '例: 又一城商場停車場' :
                selectedType === 'maintenance' ? '例: 原廠維修中心' : '例: 某汽車百貨'
              }
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 font-mono text-white text-sm focus:outline-none focus:border-cyber-green"
            />
          </div>

          {/* Category-sensitive Location Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(
              selectedType === 'driving'
                ? ['日常通勤', '西區海底隧道', '東區海底隧道', '紅磡海底隧道', '機場快線高速', '大老山隧道', '假日出遊']
                : selectedType === 'charging' 
                ? ['中電快充', '港燈充電', 'Shell Recharge', 'Evoasis', 'Cornerstone', 'Tesla 超充', '商場快充']
                : selectedType === 'parking'
                ? ['又一城', '海港城', '朗豪坊', 'APM', '太古廣場', '圓方', '新城市廣場']
                : selectedType === 'maintenance'
                ? ['原廠服務中心', '輪胎特約店', '車美美容中心', '汽車政府驗車']
                : ['Smart 俱樂部團購', '淘寶改裝件', '汽車保險續保']
            ).map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setLocation(chip)}
                className="text-[10px] font-mono text-white/50 bg-white/5 hover:bg-white/10 border border-white/5 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                +{chip}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Current Odometer (Only for other non-driving categories if needed) */}
        {selectedType !== 'driving' && (selectedType === 'charging' || selectedType === 'maintenance' || trackVehicleStatus) && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono uppercase text-white/50 tracking-widest">
                當前總里程 / ODOMETER (KM)
              </label>
              <span className="text-[9px] font-mono text-white/30">
                上次記錄: {vehicle?.lastOdometer?.toLocaleString() || 0} KM
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Gauge size={16} />
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder={String(vehicle?.lastOdometer || 0)}
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 font-mono text-white text-sm focus:outline-none focus:border-cyber-green"
              />
            </div>
          </div>
        )}

        {/* 7. Notes / Remarks */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/50 tracking-widest block">
            備忘備註 (選填)
          </label>
          <textarea
            rows={2}
            placeholder={
              selectedType === 'driving' ? '例: 車速平穩、全程開冷氣 22 度' :
              selectedType === 'parking' ? '例: 免泊消費滿 $500 折抵 2 小時 / 車位 B2-45' :
              selectedType === 'charging' ? '例: 快充 30 分鐘，吃完飯即走' :
              selectedType === 'maintenance' ? '例: 更換冷氣濾芯、檢查胎壓' : '填寫備忘'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 font-mono text-white text-xs focus:outline-none focus:border-cyber-green resize-none"
          />
        </div>

        {/* Status Alerts */}
        {saveStatus.message && (
          <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            saveStatus.type === 'error'
              ? 'bg-red-500/15 border-red-500/40 text-red-400'
              : saveStatus.type === 'offline'
              ? 'bg-cyber-green/15 border-cyber-green/50 text-cyber-green font-bold shadow-[0_0_15px_rgba(204,255,0,0.2)]'
              : 'bg-cyber-green/15 border-cyber-green/40 text-cyber-green'
          }`}>
            {saveStatus.type === 'offline' ? <WifiOff size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* Submit & Cancel Buttons */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-1/3 py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs uppercase transition-colors cursor-pointer"
          >
            取消
          </button>

          <button
            type="submit"
            disabled={isLoading || isOcrScanning}
            className="flex-1 py-3.5 px-4 rounded-xl bg-cyber-green text-black font-mono font-bold text-sm uppercase hover:bg-cyber-green/80 transition-all shadow-[0_0_25px_rgba(204,255,0,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={18} />
            {isLoading 
              ? '儲存中...' 
              : !isOnline 
              ? '離線暫存記錄 (SAVE OFFLINE)' 
              : '確認記錄 (SAVE ENTRY)'}
          </button>
        </div>

      </form>
    </div>
  );
};
