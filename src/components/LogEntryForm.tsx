import React, { useState } from 'react';
import { Battery, MapPin, Gauge, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';
import { Vehicle, LogEntry } from '../types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface LogEntryFormProps {
  vehicle: Vehicle;
  logs: LogEntry[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const LogEntryForm: React.FC<LogEntryFormProps> = ({ vehicle, logs, onSave, onCancel }) => {
  const [timestamp, setTimestamp] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [odometer, setOdometer] = useState(vehicle.lastOdometer || 0);
  const [battery, setBattery] = useState(vehicle.lastBatteryPercent || 100);
  const [cost, setCost] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Duplicate Check
  const existingLogOnDate = logs.find(log => {
    const logDate = log.timestamp.toDate();
    return format(logDate, 'yyyy-MM-dd') === timestamp;
  });
  const isDuplicate = !!existingLogOnDate;

  // Smart Detection Logic
  const isCharging = battery > (vehicle.lastBatteryPercent || 0);
  const distance = odometer - (vehicle.lastOdometer || 0);
  const batteryDiff = (vehicle.lastBatteryPercent || 0) - battery;
  
  // Efficiency Calculation
  let efficiency: number | undefined;
  if (!isCharging && distance > 0 && batteryDiff > 0) {
    const consumedKwh = (batteryDiff / 100) * vehicle.batteryCapacity;
    efficiency = (consumedKwh / distance) * 100;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const now = new Date();
      const selectedDate = new Date(timestamp);
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const data: any = { 
        timestamp: Timestamp.fromDate(selectedDate),
        odometer, 
        batteryPercent: battery, 
        cost, 
        location,
        distance: Math.max(0, distance),
        batteryDiff: isCharging ? (battery - (vehicle.lastBatteryPercent || 0)) : Math.max(0, batteryDiff),
        isCharging,
      };

      if (efficiency && !isNaN(efficiency)) {
        data.efficiency = parseFloat(efficiency.toFixed(2));
      }

      await onSave(data);
      alert('記錄錄入成功 / LOGGED SUCCESSFUL');
    } catch (error) {
      console.error("Save error:", error);
      alert('儲存失敗，請檢查輸入數據');
    } finally {
      setTimeout(() => {
        setSubmitting(false);
        onCancel();
      }, 100);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[10px] font-mono uppercase text-white/30 tracking-widest">輸入數據 / Entry Data</label>
        {isCharging && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 px-2 py-1 bg-cyber-green/10 border border-cyber-green/30 rounded text-[9px] font-mono font-bold text-cyber-green"
          >
            <span className="animate-pulse">⚡️</span> 偵測到補能
          </motion.div>
        )}
      </div>

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
          onChange={(e) => setOdometer(Number(e.target.value))}
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
                  onChange={(e) => setBattery(Math.min(100, Math.max(0, Number(e.target.value))))}
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
            value={battery}
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

      {(isCharging || cost > 0) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
        >
          <CyberInput
            label="充電開支 (HKD)"
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
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
