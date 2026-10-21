import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  Gauge, 
  Zap, 
  DollarSign, 
  Plus, 
  Clock, 
  TrendingUp, 
  BarChart2, 
  ChevronDown, 
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry, Vehicle, RecordItem, RecordType } from '../types';
import { format } from 'date-fns';
import { 
  LineChart,
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface LogsHistoryProps {
  logs: LogEntry[];
  records?: RecordItem[];
  vehicle: Vehicle | null;
  onLogClick: (log: LogEntry) => void;
  onRecordClick?: (record: RecordItem) => void;
  onClose: () => void;
  isLoading?: boolean;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenTimer?: () => void;
  onOpenNewRecord?: () => void;
}

export type TimelineItem = {
  id: string;
  source: 'record' | 'log';
  rawRecord?: RecordItem;
  rawLog?: LogEntry;
  type: RecordType | 'drive';
  amountHKD: number;
  kwhAdded: number;
  location: string;
  notes: string;
  dateStr: string; // yyyy-MM-dd
  timeStr: string; // HH:mm
  timestampMillis: number;
  odometer?: number;
  batteryPercent?: number;
  segmentDiff?: number;
  currentSOC?: number;
  consumption?: number;
  calculatedConsumption?: string;
  tripKM?: number;
  diffKM?: number;
  totalKM?: number;
  deltaSOC?: number;
};

export const LogsHistory: React.FC<LogsHistoryProps> = ({ 
  logs = [], 
  records = [],
  vehicle, 
  onLogClick, 
  onRecordClick,
  onClose, 
  isLoading = false,
  selectedMonth,
  onSelectMonth,
  onOpenTimer,
  onOpenNewRecord
}) => {
  // Category Tab Filter: 'all' | 'charging' | 'other'
  const [filterTab, setFilterTab] = useState<'all' | 'charging' | 'other'>('all');
  const [showChart, setShowChart] = useState<boolean>(false);
  const [chartType, setChartType] = useState<'battery' | 'energy'>('battery');

  // Month navigation helpers
  const handlePrevMonth = () => {
    const base = selectedMonth === 'all' ? new Date() : new Date(`${selectedMonth}-01T00:00:00`);
    const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    const m = prev.getMonth() + 1;
    onSelectMonth(`${prev.getFullYear()}-${m < 10 ? `0${m}` : m}`);
  };

  const handleNextMonth = () => {
    const base = selectedMonth === 'all' ? new Date() : new Date(`${selectedMonth}-01T00:00:00`);
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    const m = next.getMonth() + 1;
    onSelectMonth(`${next.getFullYear()}-${m < 10 ? `0${m}` : m}`);
  };

  const currentMonthDisplay = useMemo(() => {
    if (selectedMonth === 'all') return '全體歷史紀錄';
    try {
      const [year, month] = selectedMonth.split('-');
      return `${year}年 ${Number(month)}月`;
    } catch (e) {
      return selectedMonth;
    }
  }, [selectedMonth]);

  // Combine & normalize Records & VehicleLogs
  const allTimelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    const seenRecordDatesAndCosts = new Set<string>();
    const seenRecordOdos = new Set<string>();
    const seenRecordTimestamps = new Set<number>();

    // 1. Process items from `records` collection
    records.forEach(r => {
      const dateObj = r.recordDate?.toDate ? r.recordDate.toDate() : new Date(r.recordDate as any);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const timeStr = format(dateObj, 'HH:mm');
      const timestampMillis = dateObj.getTime();

      // Fingerprint to avoid duplicate display if record was mirrored from a log
      seenRecordDatesAndCosts.add(`${dateStr}_${r.amountHKD}_${r.type}`);
      const odoVal = r.odoKM ?? r.odometer;
      if (odoVal !== undefined && odoVal !== null) {
        seenRecordOdos.add(`${dateStr}_${odoVal}`);
      }
      seenRecordTimestamps.add(Math.floor(timestampMillis / 60000));

      items.push({
        id: `rec_${r.id}`,
        source: 'record',
        rawRecord: r,
        type: r.type,
        amountHKD: Number(r.amountHKD) || 0,
        kwhAdded: Number(r.kwhAdded) || 0,
        location: r.location || '',
        notes: r.notes || '',
        dateStr,
        timeStr,
        timestampMillis,
        odometer: r.odoKM ?? r.odometer,
        currentSOC: r.currentSOC ?? r.endSoc ?? (r as any).batteryPercent,
        consumption: r.consumption,
        tripKM: r.tripKM,
        deltaSOC: r.deltaSOC,
        calculatedConsumption: r.calculatedConsumption
      });
    });

    // 2. Process items from `logs` (legacy or driving logs without duplicate record)
    logs.forEach(l => {
      const dateObj = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp as any);
      const dateStr = l.date || format(dateObj, 'yyyy-MM-dd');
      const timeStr = format(dateObj, 'HH:mm');
      const timestampMillis = dateObj.getTime();
      const isCharge = l.isCharging || l.type === 'charge';
      const logType: RecordType | 'drive' = isCharge ? 'charging' : 'driving';

      // If we already have this record from the records collection, don't show duplicate
      const logOdo = Number(l.odo ?? l.odometer ?? 0);
      if (logOdo > 0 && seenRecordOdos.has(`${dateStr}_${logOdo}`)) {
        return;
      }
      const logMinute = Math.floor(timestampMillis / 60000);
      if (seenRecordTimestamps.has(logMinute) && (logType === 'driving' || seenRecordDatesAndCosts.has(`${dateStr}_${l.cost || 0}_${logType}`))) {
        return;
      }
      const fp = `${dateStr}_${l.cost || 0}_${logType}`;
      if (seenRecordDatesAndCosts.has(fp) && (l.cost || 0) > 0) {
        return;
      }

      // Estimate kwh from batteryDiff if charging
      const batteryCapacity = vehicle?.batteryCapacity || 100;
      const kwhEst = isCharge && l.batteryDiff ? (l.batteryDiff / 100) * batteryCapacity : 0;

      items.push({
        id: `log_${l.id}`,
        source: 'log',
        rawLog: l,
        type: logType,
        amountHKD: Number(l.cost) || 0,
        kwhAdded: kwhEst,
        location: l.location || (isCharge ? '充電補能' : '日常行車'),
        notes: isCharge ? '車輛充電日誌' : '行駛日誌',
        dateStr,
        timeStr,
        timestampMillis,
        odometer: Number(l.odo ?? l.odometer ?? 0),
        batteryPercent: Number(l.soc ?? l.batteryPercent ?? 100),
        segmentDiff: Number(l.segmentDiff ?? l.batteryDiff ?? 0),
        currentSOC: Number(l.soc ?? l.batteryPercent ?? 100),
        consumption: (l as any).consumption ? Number((l as any).consumption) : undefined
      });
    });

    // 3. 先依時間順序 (Ascending) 排序，自動比對計算前後行程的 Trip KM、Delta SOC 及電耗
    items.sort((a, b) => a.timestampMillis - b.timestampMillis);

    const batteryCapacity = vehicle?.batteryCapacity || 100;
    let lastKnownOdo: number | null = vehicle?.initialOdometer || null;
    let lastKnownSOC: number | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isDriving = item.type === 'driving' || item.type === 'drive';
      const isCharging = item.type === 'charging';

      // 1. 計算增量里程（Trip KM / diffKM Calculation）
      // 無論該筆記錄是「日常行車」還是「充電補能」，只要當前記錄的 totalKM（或 odoKM）大於上一筆記錄的 totalKM，就必須計算行駛差額：
      const currentKM = Number(
        item.rawRecord?.odoKM ??
        (item.rawRecord as any)?.totalKM ??
        (item.rawRecord as any)?.odometer ??
        item.odometer ??
        item.rawLog?.odo ??
        item.rawLog?.odometer ??
        0
      );

      let diffKM = 0;
      if (item.tripKM && item.tripKM > 0) {
        diffKM = item.tripKM;
      } else if (item.rawLog?.odoDiff && item.rawLog.odoDiff > 0) {
        diffKM = item.rawLog.odoDiff;
      } else if (currentKM > 0 && lastKnownOdo && lastKnownOdo > 0 && currentKM > lastKnownOdo) {
        const diff = currentKM - lastKnownOdo;
        if (diff > 0 && diff < 5000) {
          diffKM = diff;
        }
      }

      item.diffKM = diffKM;
      if (diffKM > 0) item.tripKM = diffKM;

      if (isDriving) {
        const currentSOC = item.currentSOC ?? item.rawRecord?.currentSOC ?? item.batteryPercent ?? item.rawLog?.soc;
        let tripKM = diffKM > 0 ? diffKM : (item.tripKM || (item.rawRecord as any)?.tripKM || item.rawLog?.odoDiff);

        // 2. 該程耗電百分比 (deltaSOC)
        let deltaSOC: number | undefined = item.deltaSOC || (item.rawRecord as any)?.deltaSOC;
        if (deltaSOC === undefined) {
          if (currentSOC !== undefined && lastKnownSOC !== undefined) {
            deltaSOC = currentSOC - lastKnownSOC;
          } else if (item.segmentDiff && item.segmentDiff > 0) {
            deltaSOC = -item.segmentDiff;
          } else if ((item.rawRecord as any)?.startSoc && currentSOC !== undefined) {
            deltaSOC = currentSOC - (item.rawRecord as any).startSoc;
          }
        }

        // 3. 該程平均電耗 (kWh/100km):
        // 優先顯示手動填寫值；若無手動填寫，則依公式自動計算：
        // 該程電耗 = (ΔSOC% * batteryCapacity / ΔKM) * 100
        let calculatedConsumption: string | undefined = item.calculatedConsumption || (item.rawRecord as any)?.calculatedConsumption;
        if (!item.consumption && !calculatedConsumption && tripKM && tripKM > 0 && deltaSOC && deltaSOC < 0) {
          const dropPercent = Math.abs(deltaSOC);
          const energyUsedKwh = (dropPercent / 100) * batteryCapacity;
          const kwhPer100Km = (energyUsedKwh / tripKM) * 100;
          if (kwhPer100Km > 0 && kwhPer100Km < 80) {
            calculatedConsumption = kwhPer100Km.toFixed(1);
          }
        }

        item.tripKM = tripKM;
        item.currentSOC = currentSOC;
        item.deltaSOC = deltaSOC;
        item.calculatedConsumption = calculatedConsumption;

        // 更新最新已知里程與電量供下一節點比對
        if (currentKM > 0) lastKnownOdo = currentKM;
        if (currentSOC !== undefined && currentSOC >= 0) lastKnownSOC = currentSOC;
      } else if (isCharging) {
        // 充電補能節點：計算插槍充電前該段行程的電耗
        let calculatedConsumption: string | undefined = item.calculatedConsumption || (item.rawRecord as any)?.calculatedConsumption;

        // 情況 A：若記錄有 startSoc 且上一節點有已知 SOC，依行車耗電 SOC 計算電耗
        if (!calculatedConsumption && diffKM > 0 && item.rawRecord?.startSoc !== undefined && lastKnownSOC !== null && lastKnownSOC > item.rawRecord.startSoc) {
          const dropPercent = lastKnownSOC - item.rawRecord.startSoc;
          const energyUsedKwh = (dropPercent / 100) * batteryCapacity;
          const kwhPer100Km = (energyUsedKwh / diffKM) * 100;
          if (kwhPer100Km > 0 && kwhPer100Km < 80) {
            calculatedConsumption = kwhPer100Km.toFixed(1);
          }
        }

        // 情況 B：若無 startSoc，但充電補充了 kwhAdded，估算充電前行駛電耗
        if (!calculatedConsumption && diffKM >= 5 && item.kwhAdded > 0) {
          const kwhPer100Km = (item.kwhAdded / diffKM) * 100;
          if (kwhPer100Km >= 6 && kwhPer100Km <= 70) {
            calculatedConsumption = kwhPer100Km.toFixed(1);
          }
        }

        item.calculatedConsumption = calculatedConsumption;

        // 更新最新已知里程與充後電量供下一節點比對
        if (currentKM > 0) lastKnownOdo = currentKM;
        const nodeSOC = item.rawRecord?.endSoc ?? item.currentSOC ?? item.batteryPercent;
        if (nodeSOC !== undefined && nodeSOC >= 0) lastKnownSOC = nodeSOC;
      } else {
        // 保養或其他節點：若帶有行駛里程或電量，更新為下一趟的起始基準
        if (currentKM > 0) lastKnownOdo = currentKM;
        const nodeSOC = item.rawRecord?.endSoc ?? item.currentSOC ?? item.batteryPercent;
        if (nodeSOC !== undefined && nodeSOC >= 0) lastKnownSOC = nodeSOC;
      }
    }

    // 4. 重排為最新記錄在頂部 (Descending)
    items.sort((a, b) => b.timestampMillis - a.timestampMillis);

    return items;
  }, [records, logs, vehicle]);

  // Filter items by selectedMonth and filterTab
  const filteredItems = useMemo(() => {
    return allTimelineItems.filter(item => {
      // Month Filter
      if (selectedMonth !== 'all' && !item.dateStr.startsWith(selectedMonth)) {
        return false;
      }

      // Tab Filter
      if (filterTab === 'charging') {
        return item.type === 'charging';
      }
      if (filterTab === 'other') {
        return item.type === 'maintenance' || item.type === 'parking' || item.type === 'accessory' || item.type === 'other';
      }
      return true; // 'all'
    });
  }, [allTimelineItems, selectedMonth, filterTab]);

  // Group by date (Daily Grouping)
  const groupedByDate = useMemo(() => {
    const groups: {
      dateStr: string;
      displayDate: string;
      items: TimelineItem[];
      totalCost: number;
      totalKwh: number;
    }[] = [];

    const groupMap = new Map<string, TimelineItem[]>();

    filteredItems.forEach(item => {
      if (!groupMap.has(item.dateStr)) {
        groupMap.set(item.dateStr, []);
      }
      groupMap.get(item.dateStr)!.push(item);
    });

    // Format and calculate day totals
    groupMap.forEach((dayItems, dateStr) => {
      let totalCost = 0;
      let totalKwh = 0;

      dayItems.forEach(item => {
        totalCost += item.amountHKD;
        if (item.type === 'charging') {
          totalKwh += item.kwhAdded;
        }
      });

      // Format date for human friendly display: e.g. "10月15日 (週四)"
      let displayDate = dateStr;
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          displayDate = format(d, 'M月d日');
        }
      } catch (e) {}

      groups.push({
        dateStr,
        displayDate,
        items: dayItems,
        totalCost,
        totalKwh
      });
    });

    // Sort groups descending by date
    groups.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

    return groups;
  }, [filteredItems]);

  // Monthly summary stats for header banner
  const monthSummary = useMemo(() => {
    let cost = 0;
    let chargingCost = 0;
    let otherCost = 0;
    let kwh = 0;

    filteredItems.forEach(item => {
      cost += item.amountHKD;
      if (item.type === 'charging') {
        chargingCost += item.amountHKD;
        kwh += item.kwhAdded;
      } else if (item.type !== 'drive' && item.type !== 'driving') {
        otherCost += item.amountHKD;
      }
    });

    const avgPrice = kwh > 0 ? (chargingCost / kwh).toFixed(2) : null;

    return {
      totalCost: cost,
      chargingCost,
      otherCost,
      totalKwh: kwh,
      avgPrice,
      totalCount: filteredItems.length
    };
  }, [filteredItems]);

  // Chart data for energy curve
  const chartData = useMemo(() => {
    const groups: { [date: string]: { driveEnergy: number; chargeEnergy: number } } = {};
    const batteryCapacity = vehicle?.batteryCapacity || 100;

    logs.forEach(log => {
      const d = log.date || format(log.timestamp.toDate(), 'yyyy-MM-dd');
      if (selectedMonth !== 'all' && !d.startsWith(selectedMonth)) return;

      let formattedDate = d;
      try {
        const parts = d.split('-');
        if (parts.length === 3) formattedDate = `${parts[1]}-${parts[2]}`;
      } catch (e) {}

      if (!groups[formattedDate]) {
        groups[formattedDate] = { driveEnergy: 0, chargeEnergy: 0 };
      }

      const isDrive = log.type === "drive" || (!log.type && !log.isCharging);
      const isCharge = log.type === "charge" || (!log.type && log.isCharging);
      const diffVal = Number(log.segmentDiff ?? log.batteryDiff ?? 0);

      if (isDrive) groups[formattedDate].driveEnergy += diffVal;
      else if (isCharge) groups[formattedDate].chargeEnergy += diffVal;
    });

    return Object.entries(groups).map(([date, data]) => ({
      date,
      dayTotalDriveEnergy: parseFloat(((data.driveEnergy / 100) * batteryCapacity).toFixed(2)),
      dayTotalChargeEnergy: parseFloat(((data.chargeEnergy / 100) * batteryCapacity).toFixed(2)),
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, vehicle, selectedMonth]);

  // 電量趨勢折線圖數據 (Battery Trend Chart migrated from Home)
  const batteryTrendData = useMemo(() => {
    const sortedLogsAsc = [...logs].filter(log => {
      if (selectedMonth === 'all') return true;
      const d = log.date || format(log.timestamp.toDate(), 'yyyy-MM-dd');
      return d.startsWith(selectedMonth);
    }).sort((a, b) => {
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;
      const aOdo = Number(a.odo ?? a.odometer ?? 0);
      const bOdo = Number(b.odo ?? b.odometer ?? 0);
      return aOdo - bOdo;
    });

    for (let i = 0; i < sortedLogsAsc.length; i++) {
      const current = sortedLogsAsc[i];
      const currentOdo = Number(current.odo ?? current.odometer ?? 0);
      if (i === 0) {
        current.odoDiff = 0;
      } else {
        const prev = sortedLogsAsc[i - 1];
        const prevOdo = Number(prev.odo ?? prev.odometer ?? 0);
        current.odoDiff = Math.max(0, currentOdo - prevOdo);
      }
    }

    const statsLogs = [...sortedLogsAsc].reverse();
    return [...statsLogs.slice(0, 20)].reverse().map(log => ({
      date: format(log.timestamp.toDate(), 'MM/dd'),
      time: format(log.timestamp.toDate(), 'HH:mm'),
      battery: log.soc ?? log.batteryPercent ?? 0,
      distance: log.odoDiff ?? log.distance ?? 0,
      odometer: log.odo ?? log.odometer ?? 0
    }));
  }, [logs, selectedMonth]);

  const getCategoryBadge = (type: string) => {
    switch (type) {
      case 'charging':
        return {
          icon: '⚡',
          label: '充電',
          bg: 'bg-cyber-green/15',
          border: 'border-cyber-green/40',
          text: 'text-cyber-green',
          glow: 'shadow-[0_0_10px_rgba(204,255,0,0.15)]'
        };
      case 'parking':
        return {
          icon: '🅿️',
          label: '泊車',
          bg: 'bg-sky-500/15',
          border: 'border-sky-500/40',
          text: 'text-sky-400',
          glow: 'shadow-[0_0_10px_rgba(56,189,248,0.15)]'
        };
      case 'maintenance':
        return {
          icon: '🛠️',
          label: '保養',
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_10px_rgba(245,158,11,0.15)]'
        };
      case 'accessory':
        return {
          icon: '🛍️',
          label: '配件',
          bg: 'bg-purple-500/15',
          border: 'border-purple-500/40',
          text: 'text-purple-400',
          glow: 'shadow-[0_0_10px_rgba(168,85,247,0.15)]'
        };
      case 'driving':
      case 'drive':
        return {
          icon: '🚗',
          label: '日常行車',
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          glow: 'shadow-[0_0_10px_rgba(16,185,129,0.15)]'
        };
      default:
        return {
          icon: '📝',
          label: '其他',
          bg: 'bg-zinc-500/15',
          border: 'border-zinc-500/40',
          text: 'text-zinc-300',
          glow: ''
        };
    }
  };

  const handleItemClick = (item: TimelineItem) => {
    if (item.source === 'record' && item.rawRecord && onRecordClick) {
      onRecordClick(item.rawRecord);
    } else if (item.rawLog) {
      onLogClick(item.rawLog);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
              歷史記錄 <span className="text-cyber-green">Records</span>
            </h2>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      {/* 1. Header & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 -ml-2 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight flex items-center gap-2">
              <span>開支與充電記錄</span>
              <span className="text-xs font-normal text-cyber-green border border-cyber-green/30 bg-cyber-green/10 px-2 py-0.5 rounded-full">
                RECORDS
              </span>
            </h2>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
              MONTHLY EXPENSE & CHARGING TIMELINE
            </p>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          {onOpenTimer && (
            <button
              onClick={onOpenTimer}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyber-green/50 text-white/80 hover:text-cyber-green transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer"
              title="停車/充電計時器"
            >
              <Clock size={16} className="text-cyber-green" />
              <span className="hidden sm:inline">計時器</span>
            </button>
          )}

          {onOpenNewRecord && (
            <button
              onClick={onOpenNewRecord}
              className="p-2 px-3 rounded-xl bg-cyber-green text-black font-mono font-bold text-xs flex items-center gap-1 hover:bg-cyber-green/80 transition-all shadow-[0_0_15px_rgba(204,255,0,0.25)] cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>記一筆</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Month Switcher Bar: [ < 2026年 X月 > ] */}
      <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between shadow-lg">
        {/* Previous Month */}
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl bg-white/5 hover:bg-cyber-green/20 hover:text-cyber-green border border-white/5 hover:border-cyber-green/30 text-white/70 transition-all cursor-pointer flex items-center gap-1"
          title="上一個月"
        >
          <ChevronLeft size={18} />
          <span className="text-[10px] font-mono hidden sm:inline">上個月</span>
        </button>

        {/* Current Month Display & All Toggle */}
        <div className="flex items-center gap-2">
          <div className="text-center">
            <span className="text-sm sm:text-base font-mono font-black text-white tracking-wide">
              {currentMonthDisplay}
            </span>
            <div className="text-[9px] font-mono text-white/40">
              共 {monthSummary.totalCount} 筆 · 支出 HK$ {monthSummary.totalCost.toLocaleString()}
            </div>
          </div>

          {selectedMonth !== 'all' ? (
            <button
              onClick={() => onSelectMonth('all')}
              className="text-[10px] font-mono text-cyber-green/80 hover:text-cyber-green bg-cyber-green/10 border border-cyber-green/30 px-2 py-1 rounded-lg transition-colors cursor-pointer ml-1"
            >
              顯示全部
            </button>
          ) : (
            <button
              onClick={() => {
                const now = new Date();
                const m = now.getMonth() + 1;
                onSelectMonth(`${now.getFullYear()}-${m < 10 ? `0${m}` : m}`);
              }}
              className="text-[10px] font-mono text-white/60 hover:text-white bg-white/10 px-2 py-1 rounded-lg transition-colors cursor-pointer ml-1"
            >
              本月
            </button>
          )}
        </div>

        {/* Next Month */}
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl bg-white/5 hover:bg-cyber-green/20 hover:text-cyber-green border border-white/5 hover:border-cyber-green/30 text-white/70 transition-all cursor-pointer flex items-center gap-1"
          title="下一個月"
        >
          <span className="text-[10px] font-mono hidden sm:inline">下個月</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 3. Category Filter Tabs: [ 全部 ] [ ⚡ 充電 ] [ 🛠️ 其他支出 ] */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: '全部 / ALL', count: filteredItems.length },
            { id: 'charging', label: '⚡ 充電', count: allTimelineItems.filter(i => (selectedMonth === 'all' || i.dateStr.startsWith(selectedMonth)) && i.type === 'charging').length },
            { id: 'other', label: '🛠️ 其他支出', count: allTimelineItems.filter(i => (selectedMonth === 'all' || i.dateStr.startsWith(selectedMonth)) && (i.type === 'maintenance' || i.type === 'parking' || i.type === 'accessory' || i.type === 'other')).length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-cyber-green text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9px] px-1 rounded-full ${filterTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-white/40'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Toggle Chart Button */}
        <button
          onClick={() => setShowChart(!showChart)}
          className={`p-2 px-3 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
            showChart 
              ? 'bg-cyber-green/15 border-cyber-green text-cyber-green shadow-[0_0_10px_rgba(204,255,0,0.15)]' 
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
          }`}
          title="切換電量與耗能圖表"
        >
          <BarChart2 size={16} />
          <span>{showChart ? '收起圖表' : '電量/耗能圖表'}</span>
          {showChart ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 4. Collapsible Charts (Battery Trend Chart & Composed Energy Chart) */}
      <AnimatePresence>
        {showChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative space-y-3">
              {/* Header with Sub-tabs for Battery Trend vs Energy Curve */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 block font-bold">
                    ANALYTICAL CHARTS
                  </span>
                  <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                    {chartType === 'battery' ? '⚡ 電量趨勢折線圖' : '📊 每日耗能與補給雙軌分析'}
                  </h4>
                </div>

                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setChartType('battery')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      chartType === 'battery'
                        ? 'bg-cyber-green text-black shadow-[0_0_10px_rgba(204,255,0,0.25)]'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    ⚡ 電量趨勢
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('energy')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      chartType === 'energy'
                        ? 'bg-cyber-green text-black shadow-[0_0_10px_rgba(204,255,0,0.25)]'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    📊 耗能對比
                  </button>
                </div>
              </div>

              {/* Chart Content */}
              {chartType === 'battery' ? (
                batteryTrendData.length > 0 ? (
                  <div className="h-52 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={batteryTrendData} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#ffffff20" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis 
                          yAxisId="left"
                          domain={[0, 100]} 
                          stroke="#ffffff20" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                          width={40}
                          tickFormatter={(val) => `${val}%`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          hide
                        />
                        <Tooltip 
                          contentStyle={{ background: '#121212', border: '1px solid #ffffff15', borderRadius: '8px', fontSize: '10px' }}
                          itemStyle={{ fontSize: '10px' }}
                          labelStyle={{ color: '#ffffff40', marginBottom: '4px' }}
                          labelFormatter={(value, payload) => {
                            if (payload && payload[0]) {
                              return `${value} ${payload[0].payload.time}`;
                            }
                            return value;
                          }}
                          formatter={(value: any, name: string) => {
                            if (name === "電量") return [`${value}%`, name];
                            if (name === "里程") return [`${value} KM`, name];
                            return [value, name];
                          }}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="battery" 
                          stroke="#CCFF00" 
                          strokeWidth={2}
                          dot={{ fill: '#CCFF00', r: 3, strokeWidth: 0, fillOpacity: 0.6 }}
                          activeDot={{ r: 5, stroke: '#1a1a1a', strokeWidth: 2, fill: '#CCFF00' }}
                          name="電量"
                          animationDuration={800}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="distance" 
                          stroke="#ffffff25" 
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          dot={false}
                          name="里程"
                          animationDuration={800}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-white/30">
                    尚無足夠電量數據
                  </div>
                )
              ) : (
                chartData.length > 0 ? (
                  <div className="h-52 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 5, right: -15, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff25" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#CCFF00" fontSize={9} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={9} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}k`} />
                        <Tooltip 
                          contentStyle={{ background: '#121212', border: '1px solid #ffffff15', borderRadius: '8px', fontSize: '10px' }}
                          formatter={(value: any, name: string) => {
                            if (name === "dayTotalDriveEnergy") return [`${value} kWh`, "本日行駛耗電"];
                            if (name === "dayTotalChargeEnergy") return [`${value} kWh`, "本日充電補給"];
                            return [value, name];
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={28}
                          formatter={(value) => {
                            if (value === "dayTotalDriveEnergy") return <span className="text-white/60 font-mono text-[9px]">🔋 行駛耗電 (kWh)</span>;
                            if (value === "dayTotalChargeEnergy") return <span className="text-white/60 font-mono text-[9px]">⚡ 補給充電 (kWh)</span>;
                            return value;
                          }}
                        />
                        <Bar yAxisId="right" dataKey="dayTotalChargeEnergy" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={10} name="dayTotalChargeEnergy" />
                        <Line yAxisId="left" type="monotone" dataKey="dayTotalDriveEnergy" stroke="#CCFF00" strokeWidth={2} dot={{ fill: '#CCFF00', r: 3 }} name="dayTotalDriveEnergy" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-white/30">
                    尚無足夠耗能數據
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Daily Grouped Timeline View */}
      {groupedByDate.length === 0 ? (
        <div className="py-20 text-center glass-card border border-white/5 space-y-3">
          <div className="text-3xl">📝</div>
          <div className="text-sm font-mono text-white/40 uppercase tracking-widest">
            {selectedMonth === 'all' ? '目前尚無開支或充電記錄' : `${currentMonthDisplay} 尚無任何記錄`}
          </div>
          {onOpenNewRecord && (
            <button
              onClick={onOpenNewRecord}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-cyber-green text-black font-mono font-bold text-xs uppercase hover:bg-cyber-green/80 transition-all cursor-pointer"
            >
              <Plus size={16} />
              立即記錄第一筆開支
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(group => (
            <div key={group.dateStr} className="space-y-2">
              {/* Daily Header with Subtotal */}
              <div className="flex items-center justify-between px-2 py-1 border-l-2 border-cyber-green bg-white/[0.015] rounded-r-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white tracking-wide">
                    {group.displayDate}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    · {group.items.length} 筆
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {group.totalKwh > 0 && (
                    <span className="text-cyber-green font-bold text-[11px] bg-cyber-green/10 border border-cyber-green/30 px-1.5 py-0.5 rounded">
                      +{group.totalKwh.toFixed(1)} kWh
                    </span>
                  )}
                  <span className="text-white/50 text-[10px]">小計:</span>
                  <span className="font-extrabold text-white">
                    HK$ {group.totalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items for this date */}
              <div className="space-y-2">
                {group.items.map(item => {
                  const badge = getCategoryBadge(item.type);
                  const isCharging = item.type === 'charging';
                  const unitPrice = isCharging && item.kwhAdded > 0 && item.amountHKD > 0
                    ? (item.amountHKD / item.kwhAdded).toFixed(2)
                    : null;

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.008 }}
                      whileTap={{ scale: 0.995 }}
                      onClick={() => handleItemClick(item)}
                      className="glass-card p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-cyber-green/40 transition-all rounded-2xl flex items-center justify-between gap-4 cursor-pointer relative overflow-hidden group select-none shadow-sm"
                    >
                      {/* Left: Category Icon Badge */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl ${badge.bg} border ${badge.border} ${badge.glow} flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                          <span className="text-base select-none leading-none">{badge.icon}</span>
                          <span className={`text-[8px] font-mono font-bold uppercase mt-0.5 ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Middle: Title, Location, Notes, Time */}
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyber-green transition-colors truncate">
                              {item.location || (isCharging ? '充電補能' : '用車記錄')}
                            </span>
                            <span className="text-[10px] font-mono text-white/30 shrink-0">
                              {item.timeStr}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-white/50 truncate flex-wrap">
                            {(item.rawRecord?.odoKM || (item.rawRecord as any)?.totalKM || item.odometer) ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span>總里程: {((item.rawRecord?.odoKM ?? (item.rawRecord as any)?.totalKM ?? item.odometer) as number).toLocaleString()} KM</span>
                                {item.diffKM !== undefined && item.diffKM > 0 && (
                                  <span className="text-[#d4ff00] font-bold text-[10px] bg-[#d4ff00]/15 border border-[#d4ff00]/30 px-1.5 py-0.2 rounded-md inline-flex items-center">
                                    (+{item.diffKM} KM)
                                  </span>
                                )}
                              </div>
                            ) : null}
                            {item.notes ? (
                              <span className="truncate">{item.notes}</span>
                            ) : !(item.rawRecord?.odoKM || (item.rawRecord as any)?.totalKM || item.odometer) ? (
                              <span className="text-white/20">無詳細備註</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right: Driving metrics or Charging/Expense cost */}
                      {(item.type === 'driving' || item.type === 'drive') ? (
                        <div style={{ textAlign: 'right' }} className="shrink-0 font-mono">
                          {/* 第一行（高亮主數據）：優先顯示該程平均電耗 */}
                          <div style={{ color: '#d4ff00', fontSize: '15px', fontWeight: 'bold' }}>
                            {item.consumption 
                              ? `${Number(item.consumption).toFixed(1)} kWh/100km` 
                              : (item.calculatedConsumption ? `${item.calculatedConsumption} kWh/100km` : '-- kWh/100km')}
                          </div>
                          {/* 第二行（里程與電量變化）：顯示該程里程增量與耗電百分比 */}
                          <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>
                            {item.diffKM !== undefined && item.diffKM > 0 ? `+${item.diffKM} KM · ` : (item.tripKM ? `+${item.tripKM} KM · ` : '')}
                            {item.currentSOC !== undefined ? (
                              <span style={{ color: '#5ac8fa' }}>剩餘 {item.currentSOC}%</span>
                            ) : null}
                            {item.deltaSOC && Math.abs(item.deltaSOC) > 0 ? (
                              <span style={{ color: '#ff3b30' }}> (-{Math.abs(item.deltaSOC)}%)</span>
                            ) : null}
                          </div>
                        </div>
                      ) : isCharging ? (
                        /* 充電補能卡片右側資訊欄 */
                        <div style={{ textAlign: 'right' }} className="shrink-0 font-mono">
                          <div style={{ color: '#d4ff00', fontSize: '15px', fontWeight: 'bold' }}>
                            {item.amountHKD > 0 ? `HK$ ${item.amountHKD.toLocaleString()}` : '免費 / $0'}
                          </div>
                          <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>
                            {item.diffKM !== undefined && item.diffKM > 0 && (
                              <span style={{ color: '#d4ff00', marginRight: '6px' }}>+{item.diffKM} KM</span>
                            )}
                            <span style={{ color: '#5ac8fa' }}>
                              +{item.kwhAdded > 0 ? (Number.isInteger(item.kwhAdded) ? item.kwhAdded : item.kwhAdded.toFixed(1)) : 0} kWh
                            </span>
                            {unitPrice && (
                              <span className="text-[10px] text-white/40 font-normal ml-1">
                                (${unitPrice}/度)
                              </span>
                            )}
                          </div>
                          {/* 充電前行駛電耗 */}
                          {item.calculatedConsumption && item.diffKM && item.diffKM > 0 && (
                            <div className="text-[10px] text-white/50 mt-0.5">
                              電耗: <span className="text-white/80 font-bold">{item.calculatedConsumption}</span> kWh/100km
                            </div>
                          )}
                        </div>
                      ) : (
                        /* 其他支出的原有收費顯示 */
                        <div style={{ textAlign: 'right' }} className="shrink-0 space-y-0.5 font-mono">
                          <div style={{ color: '#d4ff00', fontSize: '15px', fontWeight: 'bold' }}>
                            {item.amountHKD > 0 ? `HK$ ${item.amountHKD.toLocaleString()}` : '免費 / $0'}
                          </div>
                          {item.diffKM !== undefined && item.diffKM > 0 && (
                            <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>
                              <span style={{ color: '#d4ff00' }}>+{item.diffKM} KM</span>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
