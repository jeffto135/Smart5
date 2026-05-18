import React, { useState, useEffect } from 'react';
import { Battery, MapPin, Gauge, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';
import { Vehicle, LogEntry } from '../types';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { AnimatePresence } from 'motion/react';

interface LogEntryFormProps {
  vehicle: Vehicle;
  logs: LogEntry[];
  onSave: (data: any) => Promise<string | undefined>;
  onCancel: () => void;
}

export const LogEntryForm: React.FC<LogEntryFormProps> = ({ vehicle, logs, onSave, onCancel }) => {
  const [timestamp, setTimestamp] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [odometer, setOdometer] = useState<number | string>(vehicle.lastOdometer || 0);
  const [battery, setBattery] = useState<number | string>(vehicle.lastBatteryPercent || 100);
  const [cost, setCost] = useState<number | string>(0);
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStage, setSyncStage] = useState<'idle' | 'offline_saved' | 'syncing' | 'synced'>('idle');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync transition when network returns
  useEffect(() => {
    if (isOnline && syncStage === 'offline_saved') {
      setSyncStage('syncing');
      setSaveStatus({ type: 'success', message: '⚡ 偵測到網絡，正在自動同步離線數據...' });
    }
  }, [isOnline, syncStage]);

  // SOC Validation
  const validateSOC = (value: number | string) => {
    const n = Number(value);
    return n >= 0 && n <= 100;
  };

  // ODO Validation
  const validateODO = (value: number | string) => {
    const n = Number(value);
    if (n <= 0 && value !== "") return false;
    if (prevRecordDetected && n < prevRecordDetected.odometer) return false;
    return true;
  };
  const [isCharging, setIsCharging] = useState(false);
  const [prevRecordDetected, setPrevRecordDetected] = useState<LogEntry | null>(null);

  // Duplicate Check
  const existingLogOnDate = logs.find(log => {
    const logDate = log.timestamp.toDate();
    return format(logDate, 'yyyy-MM-dd') === timestamp;
  });
  const isDuplicate = !!existingLogOnDate;

  // Live Check Logic when date/odometer/battery changes
  React.useEffect(() => {
    const checkPrevData = async () => {
      const selectedDate = new Date(timestamp);
      // We use the end of that day/current time for comparison
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      const selectedTs = Timestamp.fromDate(selectedDate);

      try {
        // Query for the closest previous record
        const q = query(
          collection(db, 'logs'),
          where('vehicleId', '==', vehicle.id),
          where('timestamp', '<', selectedTs),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (snap.docs.length > 0) {
          const prev = snap.docs[0].data() as LogEntry;
          setPrevRecordDetected(prev);
          setIsCharging(battery > prev.batteryPercent);
        } else {
          setPrevRecordDetected(null);
          setIsCharging(false); 
        }
      } catch (e) {
        console.warn("Prev check failed:", e);
      }
    };
    
    checkPrevData();
  }, [timestamp, battery, vehicle.id]);

  const distance = prevRecordDetected ? Number(odometer) - prevRecordDetected.odometer : 0;
  const batteryDiff = prevRecordDetected ? (isCharging ? Number(battery) - prevRecordDetected.batteryPercent : prevRecordDetected.batteryPercent - Number(battery)) : 0;
  
  // Efficiency Calculation
  let efficiency: number | undefined;
  if (!isCharging && distance > 0 && batteryDiff > 0) {
    const consumedKwh = (batteryDiff / 100) * vehicle.batteryCapacity;
    efficiency = (consumedKwh / distance) * 100;
  }

  // Handle Numeric Focus/Blur
  const handleNumericFocus = (currentVal: number | string, setter: (v: number | string) => void) => {
    if (currentVal === 0 || currentVal === "0") {
      setter("");
    }
  };

  const handleNumericBlur = (currentVal: number | string, setter: (v: number | string) => void, defaultVal: number = 0) => {
    if (currentVal === "" || currentVal === null || currentVal === undefined) {
      setter(defaultVal);
    }
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Validation
    if (!validateODO(odometer) || odometer === "") {
      setSaveStatus({ 
        type: 'error', 
        message: prevRecordDetected && Number(odometer) < prevRecordDetected.odometer 
          ? `❌ 里程不能小於前次記錄 (${prevRecordDetected.odometer} KM)` 
          : '❌ 請輸入有效的總里程' 
      });
      return;
    }

    if (!validateSOC(battery) || battery === "") {
      setSaveStatus({ type: 'error', message: '❌ 電量必須在 0-100% 之間' });
      return;
    }
    
    setSubmitting(true);
    setSaveStatus({ type: null, message: '' });
    
    try {
      const now = new Date();
      const selectedDate = new Date(timestamp);
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const data: any = { 
        timestamp: Timestamp.fromDate(selectedDate),
        odometer: Number(odometer), 
        batteryPercent: Number(battery), 
        cost: Number(cost), 
        location,
        distance: Math.max(0, distance),
        batteryDiff: isCharging ? (Number(battery) - (prevRecordDetected?.batteryPercent || 0)) : Math.max(0, batteryDiff),
        isCharging,
      };

      if (efficiency && !isNaN(efficiency)) {
        data.efficiency = parseFloat(efficiency.toFixed(2));
      }

      // 執行儲存
      const logId = await onSave(data);

      if (!isOnline) {
        setSyncStage('offline_saved');
        setSaveStatus({ 
          type: 'success', 
          message: '📡 網絡已斷開。但請放心！你的里程與電量記錄已安全儲存於手機本地。當你回到有 4G/5G 的地方，系統會自動在背景完成上載，你現在可以隨時關閉 App。' 
        });
      } else {
        setSyncStage('synced');
        setSaveStatus({ type: 'success', message: '✅ 記錄已成功儲存' });
      }

      // 如果有 logId，監聽同步狀態
      if (logId) {
        const { onSnapshot: onSnap, doc: fireDoc } = await import('firebase/firestore');
        const unsub = onSnap(fireDoc(db, 'logs', logId), (snap) => {
          if (snap.exists() && !snap.metadata.fromCache) {
            setSyncStage('synced');
            setSaveStatus({ type: 'success', message: '✅ 恭喜！離線記錄已成功補發上載至 Smart5 雲端庫！' });
            unsub();
            setTimeout(() => onCancel(), 3000);
          }
        });
      }

      // 如果是正常在線儲存且非補發，正常關閉
      if (isOnline) {
        setTimeout(() => onCancel(), 1500);
      }

    } catch (err: any) {
      console.error("Save error:", err);
      let errorMsg = '❌ 儲存失敗，請檢查輸入數據';
      
      // Error Catching based on requirements
      if (err.message && err.message.includes('permission-denied')) {
        errorMsg = '❌ 權限錯誤，請嘗試重新登入帳戶。';
      } else if (err.message && (err.message.includes('unavailable') || err.message.includes('network'))) {
        errorMsg = '📡 網路連線不穩定，數據已暫存於手機，連線後將自動同步。';
      }
      
      setSaveStatus({ type: 'error', message: errorMsg });
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleEntrySubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[10px] font-mono uppercase text-white/30 tracking-widest">輸入數據 / Entry Data</label>
        {isCharging && !saveStatus.type && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 px-2 py-1 bg-cyber-green/10 border border-cyber-green/30 rounded text-[9px] font-mono font-bold text-cyber-green"
          >
            <span className="animate-pulse">⚡️</span> 偵測到補能
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {saveStatus.type && (
          <motion.div
            key={syncStage}
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 10 }}
            className={`p-4 rounded-xl border text-xs font-bold font-mono leading-relaxed mb-4 shadow-lg ${
              syncStage === 'offline_saved'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : syncStage === 'syncing'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                : saveStatus.type === 'success'
                ? 'bg-cyber-green/20 border-cyber-green text-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.2)]'
                : 'bg-red-500/20 border-red-500 text-red-100'
            }`}
          >
            <div className="flex gap-3 items-center">
              {syncStage === 'offline_saved' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />}
              {syncStage === 'syncing' && <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
              <span className="flex-1">{saveStatus.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <CyberInput
          label="日期 / Date"
          type="date"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          required
          className={isDuplicate ? 'border-red-500/50' : ''}
        />
        {isDuplicate && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 -bottom-5 text-[9px] font-mono text-red-400 uppercase tracking-wider"
          >
            ⚠️ 此日已有記錄 / record exists
          </motion.div>
        )}
      </div>

      <div className="relative">
        <CyberInput
          label="當前總里程 (KM)"
          type="number"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          onFocus={() => handleNumericFocus(odometer, setOdometer)}
          onBlur={() => handleNumericBlur(odometer, setOdometer)}
          prefix="ODO"
          required
        />
        {distance > 0 && (
          <div className="absolute right-4 bottom-4 text-[9px] font-mono text-cyber-green/40">
            +{distance} KM
          </div>
        )}
      </div>

      <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="space-y-2">
          <div className="flex justify-between items-end px-1">
            <label className="text-[10px] font-mono uppercase text-white/50">剩餘電量 / Battery (%)</label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={battery}
                  onChange={(e) => setBattery(e.target.value === "" ? "" : Math.min(100, Math.max(0, Number(e.target.value))))}
                  onFocus={() => handleNumericFocus(battery, setBattery)}
                  onBlur={() => handleNumericBlur(battery, setBattery)}
                  className={`w-14 bg-transparent border-b border-white/20 text-center font-mono text-xl font-bold focus:outline-none focus:border-cyber-green transition-colors ${isCharging ? 'text-cyber-green' : 'text-white'}`}
                />
                <span className={`absolute -right-3 top-1/2 -translate-y-1/2 text-xs font-mono opacity-50 ${isCharging ? 'text-cyber-green' : 'text-white'}`}>%</span>
              </div>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Number(battery) || 0}
            onChange={(e) => setBattery(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyber-green"
          />
        </div>

        {/* Live Calculation Feedback */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
          <div className="space-y-1">
            <div className="text-[8px] uppercase tracking-widest text-white/20 font-mono">行駛動態</div>
            <div className="text-[10px] font-mono text-white/60">
              {distance <= 0 ? '數據收集中' : `${distance} KM`}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[8px] uppercase tracking-widest text-white/20 font-mono">能耗預算</div>
            <div className={`text-[10px] font-mono ${efficiency ? 'text-cyber-green' : 'text-white/30'}`}>
              {!isCharging && distance > 0 ? (
                efficiency && !isNaN(efficiency) ? `${efficiency.toFixed(1)} kWh/100km` : '數據異常'
              ) : isCharging ? '充電中' : '數據收集中'}
            </div>
          </div>
        </div>
      </div>

      {(isCharging || Number(cost) > 0) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
        >
          <CyberInput
            label="充電開支 (HKD)"
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onFocus={() => handleNumericFocus(cost, setCost)}
            onBlur={() => handleNumericBlur(cost, setCost)}
            prefix="HKD"
            required={isCharging}
          />
        </motion.div>
      )}

      <CyberInput
        label="備註 / 地點"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="例如：領展商場、公司充電"
        prefix="LOC"
      />

      <div className="flex gap-4 pt-4">
        <CyberButton 
          type="button" 
          variant="outline" 
          className="flex-1 border-white/10 text-white/50"
          onClick={onCancel}
        >
          取消
        </CyberButton>
        <CyberButton 
          type="submit" 
          className="flex-1"
          disabled={submitting || isDuplicate}
        >
          {submitting ? '儲存中...' : isDuplicate ? '當日已有記錄' : '確認錄入'}
        </CyberButton>
      </div>
    </form>
  );
};
