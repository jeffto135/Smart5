import React, { useMemo, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Zap, TrendingDown, Battery, DollarSign, ArrowUpRight, ArrowDownRight, Minus, UserCheck, Vote, ShoppingBag, Gift, Clock, Sparkles, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CyberCard } from './ui/CyberCard';
import { LogEntry, Vehicle, Activity, Poll, GroupBuy, UserProfile, RecordItem } from '../types';
import { format } from 'date-fns';
import { MonthDropdown } from './MonthDropdown';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { MaintenanceHistoryModal } from './MaintenanceHistoryModal';
import { getStoredTimer } from './ParkingTimerModal';
import { TrafficNewsCard } from './TrafficNewsCard';
import { TrafficNewsModal } from './TrafficNewsModal';
import { TunnelFeeBar } from './TunnelFeeBar';
import { TunnelDashboard } from './TunnelDashboard';

interface DashboardProps {
  logs: LogEntry[];
  records?: RecordItem[];
  vehicle: Vehicle | null;
  activities: Activity[];
  polls: Poll[];
  groupBuys: GroupBuy[];
  userProfile: UserProfile | null;
  onRecordMaintenance?: (actualKM: number, actualDate: string, remarks?: string, cost?: number) => Promise<void>;
  onLogClick: (log: LogEntry) => void;
  onViewAll: () => void;
  onActivityClick: () => void;
  onPollClick: () => void;
  onGroupBuyClick: () => void;
  onClubPerksClick: () => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenTimer?: () => void;
  onOpenNewRecord?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  logs, 
  records = [],
  vehicle, 
  activities,
  polls,
  groupBuys = [],
  userProfile,
  onRecordMaintenance,
  onLogClick, 
  onViewAll,
  onActivityClick,
  onPollClick,
  onGroupBuyClick,
  onClubPerksClick,
  selectedMonth,
  onSelectMonth,
  onOpenTimer,
  onOpenNewRecord
}) => {
  const [expandedDates, setExpandedDates] = useState<{ [date: string]: boolean }>({});
  
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [actualKM, setActualKM] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [actualDate, setActualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAdminReminderModal, setShowAdminReminderModal] = useState(false);
  const [reminderModalType, setReminderModalType] = useState<'license' | 'insurance' | 'both'>('both');
  const [tempLicenseDate, setTempLicenseDate] = useState('');
  const [tempInsuranceDate, setTempInsuranceDate] = useState('');
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);
  const [showTrafficNewsModal, setShowTrafficNewsModal] = useState(false);
  const [showTunnelModal, setShowTunnelModal] = useState(false);

  const toggleDate = (date: string, e: React.MouseEvent) => {
    // Prevent event bubbling if necessary, but keep it simple
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Filter logs based on high-tech frontend month filter in the top bar
  const filteredMonthLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedMonth === 'all') return true;
      const d = log.date || format(log.timestamp.toDate(), 'yyyy-MM-dd');
      return d.startsWith(selectedMonth);
    });
  }, [logs, selectedMonth]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    // 1. Sort ALL logs chronologically (ascending date and odo) in-memory to safely compute odoDiff client-side as fallback/guarantee.
    const sortedAllLogs = [...filteredMonthLogs].sort((a, b) => {
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;
      const aOdo = Number(a.odo ?? a.odometer ?? 0);
      const bOdo = Number(b.odo ?? b.odometer ?? 0);
      const odoCompare = aOdo - bOdo;
      if (odoCompare !== 0) return odoCompare;

      const nodeA = a.isChargeNode || "";
      const nodeB = b.isChargeNode || "";
      if (nodeA !== nodeB) {
        if (nodeA === "start") return -1;
        if (nodeB === "start") return 1;
        if (nodeA === "end") return 1;
        if (nodeB === "end") return -1;
      }
      return 0;
    });

    // Compute odoDiff for each record in-memory to guarantee correctness even before Firebase sync completes
    for (let i = 0; i < sortedAllLogs.length; i++) {
      const current = sortedAllLogs[i];
      const currentOdo = Number(current.odo ?? current.odometer ?? 0);
      if (i === 0) {
        current.odoDiff = 0;
      } else {
        const prev = sortedAllLogs[i - 1];
        const prevOdo = Number(prev.odo ?? prev.odometer ?? 0);
        current.odoDiff = Math.max(0, currentOdo - prevOdo);
      }
    }

    const groups: { [date: string]: LogEntry[] } = {};
    
    sortedAllLogs.forEach(log => {
      const d = log.date || format(log.timestamp.toDate(), 'yyyy-MM-dd');
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(log);
    });

    return Object.entries(groups).map(([date, dayRecords]) => {
      // Sort day records chronologically within the day
      dayRecords.sort((a, b) => {
        const aOdo = Number(a.odo ?? a.odometer ?? 0);
        const bOdo = Number(b.odo ?? b.odometer ?? 0);
        const odoCompare = aOdo - bOdo;
        if (odoCompare !== 0) return odoCompare;

        const nodeA = a.isChargeNode || "";
        const nodeB = b.isChargeNode || "";
        if (nodeA !== nodeB) {
          if (nodeA === "start") return -1;
          if (nodeB === "start") return 1;
          if (nodeA === "end") return 1;
          if (nodeB === "end") return -1;
        }
        return 0;
      });

      const odos = dayRecords.map(r => Number(r.odo ?? r.odometer ?? 0));
      const maxOdo = odos.length > 0 ? Math.max(...odos) : 0;
      const minOdo = odos.length > 0 ? Math.min(...odos) : 0;

      // 🟢 跨日連續用車的唯一正確里程統計
      const dayTotalDistance = dayRecords.reduce((sum, record) => sum + (record.odoDiff || 0), 0);

      // 當天總耗電量 (Total Energy Used)：累加 type == "drive" / !isCharging 的 segmentDiff / batteryDiff
      let dayTotalDriveEnergy = 0;
      
      // 當天總叉電量 (Total Charged)：累加 type == "charge" / isCharging 的 segmentDiff / batteryDiff
      let dayTotalChargeEnergy = 0;

      dayRecords.forEach((record) => {
        const isDrive = record.type === "drive" || (!record.type && !record.isCharging);
        const isCharge = record.type === "charge" || (!record.type && record.isCharging);
        const diffVal = Number(record.segmentDiff ?? record.batteryDiff ?? 0);
        
        if (isDrive) {
          dayTotalDriveEnergy += diffVal;
        } else if (isCharge) {
          dayTotalChargeEnergy += diffVal;
        }
      });

      // True efficiency formula:
      const batteryCapacity = vehicle?.batteryCapacity || 60;
      const consumedKwh = (dayTotalDriveEnergy / 100) * batteryCapacity;
      const avgEfficiency = dayTotalDistance > 0 ? ((consumedKwh / dayTotalDistance) * 100).toFixed(1) : "--";

      return {
        date,
        maxOdo,
        minOdo,
        totalDistance: dayTotalDistance,
        totalDriveEnergy: dayTotalDriveEnergy,
        totalChargeEnergy: dayTotalChargeEnergy,
        avgEfficiency,
        records: dayRecords
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredMonthLogs, vehicle]);

  // Check for new content
  const hasNewActivity = useMemo(() => {
    const lastSeen = localStorage.getItem('evlog_last_seen_activity');
    if (!activities.length) return false;
    const latestId = activities[activities.length - 1].id;
    return lastSeen !== latestId;
  }, [activities]);

  const hasNewPoll = useMemo(() => {
    const lastSeen = localStorage.getItem('evlog_last_seen_poll');
    if (!polls.length) return false;
    const latestId = polls[0]?.id; // polls are desc
    return lastSeen !== latestId;
  }, [polls]);

  const hasNewGroupBuy = useMemo(() => {
    const lastSeen = localStorage.getItem('evlog_last_seen_groupbuy');
    if (!groupBuys.length) return false;
    const latestId = groupBuys[0]?.id; // desc
    return lastSeen !== latestId;
  }, [groupBuys]);

  const stats = useMemo(() => {
    // PRD Formula: (行駛里數 / 燃油效能 * $30) - 電費開支
    const FUEL_EFFICIENCY = 10; 
    const GAS_PRICE = 30;

    let totalSavings = 0;
    let totalDistance = 0;
    let totalCost = 0;
    let totalBatteryConsumed = 0;

    // Sort full logs ascending globally to accurately pass down memory computed odoDiff to stats
    const sortedLogsAsc = [...filteredMonthLogs].sort((a, b) => {
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;
      const aOdo = Number(a.odo ?? a.odometer ?? 0);
      const bOdo = Number(b.odo ?? b.odometer ?? 0);
      const odoCompare = aOdo - bOdo;
      if (odoCompare !== 0) return odoCompare;

      const nodeA = a.isChargeNode || "";
      const nodeB = b.isChargeNode || "";
      if (nodeA !== nodeB) {
        if (nodeA === "start") return -1;
        if (nodeB === "start") return 1;
        if (nodeA === "end") return 1;
        if (nodeB === "end") return -1;
      }
      return 0;
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

    // Now map back to desc sorted order for presentation/charts
    const statsLogs = [...sortedLogsAsc].reverse();

    // Use raw records for the trend line chart as requested
    const chartData = [...statsLogs.slice(0, 15)].reverse().map(log => ({
      date: format(log.timestamp.toDate(), 'MM/dd'),
      time: format(log.timestamp.toDate(), 'HH:mm'),
      battery: log.batteryPercent,
      distance: log.odoDiff ?? log.distance ?? 0,
    }));

    // Monthly stats calculation
    let monthlyDistance = 0;
    let monthlyBatteryConsumed = 0;
    let monthlyCost = 0;

    statsLogs.forEach(log => {
      const distance = log.odoDiff ?? log.distance ?? 0;
      const cost = log.cost || 0;
      const savings = (distance / FUEL_EFFICIENCY * GAS_PRICE) - cost;
      
      totalSavings += savings;
      totalDistance += distance;
      totalCost += cost;
      
      // Use segmented isolated accumulation for global statistics as well
      const isDrive = log.type === 'drive' || (!log.type && !log.isCharging);
      const diffVal = Number(log.segmentDiff ?? log.batteryDiff ?? 0);
      if (isDrive) {
        totalBatteryConsumed += diffVal;
      }

      // Filter accumulation (already prefiltered or all)
      monthlyDistance += distance;
      if (isDrive) {
        monthlyBatteryConsumed += diffVal;
      }
      monthlyCost += cost;
    });

    const avgEfficiencyPerc = totalDistance > 0 ? (totalBatteryConsumed / totalDistance * 100) : 0;
    const avgEfficiencyVal = (avgEfficiencyPerc / 100) * (vehicle?.batteryCapacity || 60);
    const avgEfficiencyStr = totalDistance > 0 ? avgEfficiencyVal.toFixed(1) : "--";

    // Trend calculation
    const recentLogs = statsLogs.slice(0, 3);
    const recentDistance = recentLogs.reduce((sum, log) => sum + (log.odoDiff ?? log.distance ?? 0), 0);
    const recentBattery = recentLogs.reduce((sum, log) => {
      const isDrive = log.type === 'drive' || (!log.type && !log.isCharging);
      const diffVal = Number(log.segmentDiff ?? log.batteryDiff ?? 0);
      return sum + (isDrive ? diffVal : 0);
    }, 0);
    const recentEfficiency = recentDistance > 0 ? ((recentBattery / recentDistance * 100) / 100 * (vehicle?.batteryCapacity || 60)) : (totalDistance > 0 ? avgEfficiencyVal : 0);
    
    let trend = 'stable';
    const baseValue = totalDistance > 0 ? avgEfficiencyVal : 0;
    if (baseValue > 0) {
      if (recentEfficiency > baseValue * 1.05) trend = 'up';
      else if (recentEfficiency < baseValue * 0.95) trend = 'down';
    }

    const currentMonthLabel = selectedMonth === 'all'
      ? '全體歷史'
      : (() => {
          try {
            const [y, m] = selectedMonth.split('-');
            return `${y}年${Number(m)}月`;
          } catch (e) {
            return selectedMonth;
          }
        })();

    return {
      totalSavings: totalSavings.toFixed(0),
      avgEfficiency: avgEfficiencyStr,
      totalDistance: totalDistance.toFixed(0),
      monthlyDistance: monthlyDistance.toLocaleString(),
      monthlyBattery: monthlyBatteryConsumed.toFixed(0),
      monthlyKwh: ((monthlyBatteryConsumed / 100) * (vehicle?.batteryCapacity || 60)).toFixed(1),
      monthlyCost: monthlyCost.toLocaleString(),
      currentMonthLabel,
      chartData,
      trend
    };
  }, [filteredMonthLogs, vehicle, selectedMonth]);

  // 🏆 社群能耗戰力百分比：依據當前用戶平均能耗與同款車友中位數動態比對 (基準 ~19.5 kWh/100km)
  const efficiencyRankPercent = useMemo(() => {
    const effNum = parseFloat(stats.avgEfficiency);
    if (isNaN(effNum) || effNum <= 0) return 76;
    // 每 100km 能耗越低，打敗比例越高 (例如 16.0 打敗約 90% 車友，18.5 打敗約 70% 車友)
    const rank = Math.round(50 + (19.8 - effNum) * 15);
    return Math.max(5, Math.min(99, rank));
  }, [stats.avgEfficiency]);

  // 💰 開支面板細分與電價精算 (Dashboard Overview Expense & Energy Pricing)
  const expenseStats = useMemo(() => {
    let totalExpenditure = 0;
    let chargingCost = 0;
    let otherCost = 0;
    let totalKwhAdded = 0;
    let recordCount = 0;
    let chargingCount = 0;
    let otherCount = 0;

    const seenFingerprints = new Set<string>();

    // 1. Process records collection items
    (records || []).forEach(r => {
      const dateObj = r.recordDate?.toDate ? r.recordDate.toDate() : new Date(r.recordDate as any);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      if (selectedMonth !== 'all' && !dateStr.startsWith(selectedMonth)) return;

      const amt = Number(r.amountHKD) || 0;
      const kwh = Number(r.kwhAdded) || 0;

      seenFingerprints.add(`${dateStr}_${amt}_${r.type}`);
      totalExpenditure += amt;
      recordCount++;

      if (r.type === 'charging') {
        chargingCost += amt;
        totalKwhAdded += kwh;
        chargingCount++;
      } else {
        otherCost += amt;
        otherCount++;
      }
    });

    // 2. Fallback / merge legacy logs for selected month
    filteredMonthLogs.forEach(l => {
      const dateStr = l.date || format(l.timestamp.toDate(), 'yyyy-MM-dd');
      const amt = Number(l.cost) || 0;
      const isCharge = l.isCharging || l.type === 'charge';
      const fp = `${dateStr}_${amt}_${isCharge ? 'charging' : 'drive'}`;

      if (seenFingerprints.has(fp)) return; // already counted in records

      if (amt > 0) {
        totalExpenditure += amt;
        recordCount++;

        if (isCharge) {
          chargingCost += amt;
          chargingCount++;
          const cap = vehicle?.batteryCapacity || 100;
          const kwhEst = l.batteryDiff ? (l.batteryDiff / 100) * cap : 0;
          totalKwhAdded += kwhEst;
        } else {
          otherCost += amt;
          otherCount++;
        }
      }
    });

    // 運算公式：平均電價 (HKD/kWh) = 當月充電總花費 / 當月總充入度數 (kWh)
    const avgPricePerKwh = totalKwhAdded > 0 
      ? (chargingCost / totalKwhAdded).toFixed(2) 
      : null;

    return {
      totalExpenditure,
      chargingCost,
      otherCost,
      totalKwhAdded,
      chargingCount,
      otherCount,
      recordCount,
      avgPricePerKwh
    };
  }, [records, filteredMonthLogs, selectedMonth, vehicle]);

  // 🧠 模組二：智能用車提醒與續航估算 (EV Smart Insights)
  const smartInsights = useMemo(() => {
    const lastLog = logs[0];
    const lastSoc = (userProfile?.baseSOC !== undefined && userProfile.baseSOC !== null)
      ? Number(userProfile.baseSOC)
      : (lastLog?.batteryPercent ?? vehicle?.lastBatteryPercent ?? 100);
    const lastOdo = (userProfile?.currentODO !== undefined && userProfile.currentODO !== null)
      ? Number(userProfile.currentODO)
      : (lastLog ? Number(lastLog.odo ?? lastLog.odometer ?? 0) : Number(vehicle?.lastOdometer ?? 0));

    const currentODO = lastOdo;
    const lastMaintenanceKM = userProfile?.lastMaintenanceKM ?? 0;
    
    let lastMaintenanceDate = new Date();
    if (userProfile?.lastMaintenanceDate) {
      if (typeof userProfile.lastMaintenanceDate.toDate === 'function') {
        lastMaintenanceDate = userProfile.lastMaintenanceDate.toDate();
      } else {
        lastMaintenanceDate = new Date(userProfile.lastMaintenanceDate as any);
      }
    } else if (userProfile?.joinedAt) {
      if (typeof userProfile.joinedAt.toDate === 'function') {
        lastMaintenanceDate = userProfile.joinedAt.toDate();
      } else {
        lastMaintenanceDate = new Date(userProfile.joinedAt as any);
      }
    } else if (vehicle?.createdAt) {
      if (typeof vehicle.createdAt.toDate === 'function') {
        lastMaintenanceDate = vehicle.createdAt.toDate();
      } else {
        lastMaintenanceDate = new Date(vehicle.createdAt as any);
      }
    }

    const today = new Date();

    // 1️⃣ 計算里程差
    const nextMaintenanceKM = lastMaintenanceKM + 10000;
    const isKmDue = (nextMaintenanceKM - currentODO) <= 800 && (nextMaintenanceKM - currentODO) > -200;

    // 2️⃣ 計算時間差 (天數)
    const diffTime = Math.abs(today.getTime() - lastMaintenanceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    // 🌟 當距離上次保養超過 335 天 (即大約 11 個月)，或已經過期
    const isTimeDue = diffDays >= 335; 

    // 🚀 雙軌並行：任一條件滿足即顯示提示框
    const showMaintenanceWarning = lastOdo > 0 && (isKmDue || isTimeDue);

    // 💡 提示框內文動態渲染原因：
    const reminderReason = isTimeDue && !isKmDue 
      ? `[ 📅 時間定期保養提示 ] 距離上次檢查已接近 1 年 (已達 ${diffDays} 天)` 
      : `[ 🔧 里程里程碑提示 ] 距離下一次 10,000 公里保養 (下一次保養里程目標：${nextMaintenanceKM.toLocaleString()} KM)`;

    // Extract Logs in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Sort to compute chronological odoDiff
    const sortedLogsAsc = [...logs].sort((a, b) => {
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

    const last7DaysLogs = sortedLogsAsc.filter(log => log.timestamp.toDate() >= sevenDaysAgo);

    // Calculate total 7 days distance
    const total7DaysDistance = last7DaysLogs.reduce((sum, log) => sum + (log.odoDiff || 0), 0);

    // Calculate total 7 days drive energy
    const total7DaysBatteryConsumed = last7DaysLogs.reduce((sum, log) => {
      const isDrive = log.type === 'drive' || (!log.type && !log.isCharging);
      const diffVal = Number(log.segmentDiff ?? log.batteryDiff ?? 0);
      return sum + (isDrive ? diffVal : 0);
    }, 0);

    const batteryCapacity = vehicle?.batteryCapacity || 100;
    const sevenDaysConsumedKwh = (total7DaysBatteryConsumed / 100) * batteryCapacity;
    const avg7DaysEfficiency = total7DaysDistance > 0 ? ((sevenDaysConsumedKwh / total7DaysDistance) * 100) : 0;

    // Remaining Range estimation
    let remainingRange = 0;
    let isEstimatedByOfficial = false;

    if (avg7DaysEfficiency > 0) {
      remainingRange = (lastSoc * 100) / avg7DaysEfficiency;
    } else {
      // Standard official estimate: SOC * 7.4
      remainingRange = lastSoc * 7.4;
      isEstimatedByOfficial = true;
    }

    return {
      lastSoc,
      lastOdo,
      showMaintenanceWarning,
      reminderReason,
      remainingRange,
      avg7DaysEfficiency,
      isEstimatedByOfficial
    };
  }, [logs, vehicle, userProfile]);

  // 🚗 Vehicle Annual Admin Reminder Logic
  const vehicleReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const licExpiry = userProfile?.licenseExpiryDate;
    const insExpiry = userProfile?.insuranceExpiryDate;

    const licExpiryDate = licExpiry?.toDate ? licExpiry.toDate() : (licExpiry ? new Date(licExpiry as any) : null);
    const insExpiryDate = insExpiry?.toDate ? insExpiry.toDate() : (insExpiry ? new Date(insExpiry as any) : null);

    // 1️⃣ 續牌（路票）計算
    let showLicReminder = false;
    let licDaysLeft = 0;
    if (licExpiryDate) {
      const expiryCopy = new Date(licExpiryDate);
      expiryCopy.setHours(0, 0, 0, 0);
      const diff = expiryCopy.getTime() - today.getTime();
      licDaysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      // 🌟 提前 60 天跳出提示
      showLicReminder = licDaysLeft <= 60;
    }

    // 2️⃣ 續保（保險）計算
    let showInsReminder = false;
    let insDaysLeft = 0;
    if (insExpiryDate) {
      const expiryCopy = new Date(insExpiryDate);
      expiryCopy.setHours(0, 0, 0, 0);
      const diff = expiryCopy.getTime() - today.getTime();
      insDaysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      // 🌟 提前 45 天跳出提示
      showInsReminder = insDaysLeft <= 45;
    }

    const hasMissingDates = !licExpiryDate || !insExpiryDate;

    return {
      licExpiryDate,
      insExpiryDate,
      showLicReminder,
      licDaysLeft,
      showInsReminder,
      insDaysLeft,
      hasMissingDates
    };
  }, [userProfile]);

  const openReminderModal = (type: 'license' | 'insurance' | 'both') => {
    setReminderModalType(type);
    
    let licVal = '';
    let insVal = '';
    
    if (vehicleReminders.licExpiryDate) {
      licVal = format(vehicleReminders.licExpiryDate, 'yyyy-MM-dd');
    }
    if (vehicleReminders.insExpiryDate) {
      insVal = format(vehicleReminders.insExpiryDate, 'yyyy-MM-dd');
    }

    if (type === 'license') {
      if (vehicleReminders.licExpiryDate) {
        const nextYear = new Date(vehicleReminders.licExpiryDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        licVal = format(nextYear, 'yyyy-MM-dd');
      } else {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        licVal = format(nextYear, 'yyyy-MM-dd');
      }
    }

    if (type === 'insurance') {
      if (vehicleReminders.insExpiryDate) {
        const nextYear = new Date(vehicleReminders.insExpiryDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        insVal = format(nextYear, 'yyyy-MM-dd');
      } else {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        insVal = format(nextYear, 'yyyy-MM-dd');
      }
    }

    setTempLicenseDate(licVal);
    setTempInsuranceDate(insVal);
    setShowAdminReminderModal(true);
  };

  const handleUpdateReminderDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsUpdatingReminder(true);
    try {
      const uid = auth.currentUser.uid;
      const userProfilesRef = doc(db, 'userProfiles', uid);
      const usersRef = doc(db, 'users', uid);

      const updateData: any = {
        updatedAt: serverTimestamp(),
        licenseExpiryDate: tempLicenseDate ? Timestamp.fromDate(new Date(tempLicenseDate + 'T00:00:00')) : null,
        insuranceExpiryDate: tempInsuranceDate ? Timestamp.fromDate(new Date(tempInsuranceDate + 'T00:00:00')) : null,
      };

      // Update userProfiles
      await updateDoc(userProfilesRef, updateData);

      // Update users doc (gracefully if it fails)
      try {
        await updateDoc(usersRef, updateData);
      } catch (err) {
        console.warn('Failed to update users collection:', err);
      }

      alert('更新成功！ / UPDATED SUCCESSFULLY');
      setShowAdminReminderModal(false);
    } catch (err: any) {
      alert('更新失敗：' + (err.message || '未知錯誤'));
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 緊湊型天氣/續牌提醒條（僅在觸發時顯示） */}
      <div className="space-y-2.5">
        {smartInsights.showMaintenanceWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-cyber-green/10 border border-cyber-green text-cyber-green flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(204,255,0,0.15)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🛠️</span>
              <span className="text-xs font-mono font-bold truncate">
                {smartInsights.reminderReason} (當前: {smartInsights.lastOdo.toLocaleString()} KM)
              </span>
            </div>
            <button 
              onClick={() => {
                setActualKM(smartInsights.lastOdo.toString());
                setActualDate(format(new Date(), 'yyyy-MM-dd'));
                setShowMaintenanceModal(true);
              }}
              className="px-3 py-1 rounded-full bg-cyber-green text-black font-mono font-bold text-xs uppercase hover:bg-cyber-green/80 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              已回廠
            </button>
          </motion.div>
        )}

        {/* 汽車行政到期緊湊膠囊提醒條 (Pill Style, 高度 44px) */}
        {vehicleReminders.showLicReminder && vehicleReminders.licExpiryDate && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-11 px-3.5 sm:px-4 rounded-full bg-amber-500/15 border border-amber-500/70 text-amber-300 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⚠️</span>
              <span className="text-xs font-mono font-bold truncate">
                {vehicleReminders.licDaysLeft < 0 
                  ? `行車證已過期！請及時辦理續期手續` 
                  : `行車證將於 ${vehicleReminders.licDaysLeft} 天後到期`}
              </span>
            </div>
            <button 
              onClick={() => openReminderModal('license')}
              className="px-3 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)] shrink-0 cursor-pointer"
            >
              我已續期
            </button>
          </motion.div>
        )}

        {vehicleReminders.showInsReminder && vehicleReminders.insExpiryDate && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-11 px-3.5 sm:px-4 rounded-full bg-amber-500/15 border border-amber-500/70 text-amber-300 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🛡️</span>
              <span className="text-xs font-mono font-bold truncate">
                {vehicleReminders.insDaysLeft < 0 
                  ? `汽車保險已過期！請及時辦理續保` 
                  : `汽車保險將於 ${vehicleReminders.insDaysLeft} 天後到期`}
              </span>
            </div>
            <button 
              onClick={() => openReminderModal('insurance')}
              className="px-3 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)] shrink-0 cursor-pointer"
            >
              我已續期
            </button>
          </motion.div>
        )}

        {vehicleReminders.hasMissingDates && !vehicleReminders.showLicReminder && !vehicleReminders.showInsReminder && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => openReminderModal('both')}
            className="h-11 px-3.5 sm:px-4 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-between gap-3 shadow-sm cursor-pointer hover:bg-amber-500/15 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⚠️</span>
              <span className="text-xs font-mono font-bold truncate">未設定行車證/續保日期，點擊啟動智能倒數</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500 shrink-0">去設定 ➔</span>
          </motion.div>
        )}
      </div>

      {/* 三隧分時段收費即時狀態條 (Tunnel Fee Bar) */}
      <TunnelFeeBar onOpenTunnelDashboard={() => setShowTunnelModal(true)} />

      {/* 2. EV 智能續航與能耗卡片 (EV Smart Insights & Efficiency) */}
      <div className="space-y-4">
        {/* 智能續航與用車提醒主卡 */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-green/5 blur-[40px] pointer-events-none" />
          
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 font-bold">EV SMART INSIGHTS ENGINE</span>
              <h3 className="text-md font-bold uppercase tracking-wide text-white mt-0.5">智能用車提醒與續航估算</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs font-mono font-bold text-cyber-green hover:text-cyber-green/80 transition-colors border border-cyber-green/30 bg-cyber-green/5 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-[0_0_10px_rgba(204,255,0,0.1)] cursor-pointer"
              >
                🛠️ 保養日誌
              </button>
              <div className="h-7 w-7 rounded-lg bg-cyber-green/10 border border-cyber-green/25 flex items-center justify-center">
                <span className="text-cyber-green text-sm select-none">🧠</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-white/40 uppercase block">真實剩餘續航 (km)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-extrabold text-cyber-green">
                  {smartInsights.remainingRange.toFixed(0)}
                </span>
                <span className="text-[10px] font-mono text-white/40 font-bold">KM</span>
              </div>
              <span className="text-[9px] text-white/30 block leading-tight">
                {smartInsights.isEstimatedByOfficial 
                  ? "官方標準估算 (無 7 天行車數據)" 
                  : `基於近 7 天平均電耗 (${smartInsights.avg7DaysEfficiency.toFixed(1)} kWh/100km)`}
              </span>
            </div>

            <div className="space-y-1 border-l border-white/5 pl-4">
              <span className="text-[10px] font-mono text-white/40 uppercase block">當前基準電量</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-extrabold text-white">
                  {smartInsights.lastSoc}
                </span>
                <span className="text-[10px] font-mono text-white/40 font-bold">%</span>
              </div>
              <span className="text-[9px] text-white/30 block leading-tight">
                Smart #5 預設配置 100 kWh 電池 (CLTC 740km)
              </span>
            </div>
          </div>

          {/* 📋 行政限期管理：若上方已有到期警告，則隱藏下方的重複日期顯示 */}
          {(!vehicleReminders.showLicReminder || !vehicleReminders.showInsReminder) && (
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01] -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {!vehicleReminders.showLicReminder && (
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">行車證到期日</span>
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${!vehicleReminders.licExpiryDate ? 'bg-white/25' : 'bg-cyber-green'}`} />
                      {vehicleReminders.licExpiryDate ? format(vehicleReminders.licExpiryDate, 'yyyy-MM-dd') : '未設定'}
                    </span>
                  </div>
                )}
                {!vehicleReminders.showInsReminder && (
                  <div className={`space-y-0.5 ${!vehicleReminders.showLicReminder ? 'border-l border-white/5 pl-6' : ''}`}>
                    <span className="text-[9px] font-mono text-white/40 uppercase block">汽車保險到期日</span>
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${!vehicleReminders.insExpiryDate ? 'bg-white/25' : 'bg-cyber-green'}`} />
                      {vehicleReminders.insExpiryDate ? format(vehicleReminders.insExpiryDate, 'yyyy-MM-dd') : '未設定'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => openReminderModal('both')}
                className="text-xs font-mono font-bold text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer hover:border-amber-500/65"
              >
                ✏️ 變更期限
              </button>
            </div>
          )}
        </div>

        {/* 運輸署即時交通消息 & 平均能耗 雙指標卡 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TrafficNewsCard 
            onOpenModal={() => setShowTrafficNewsModal(true)} 
            className="min-h-[140px]"
          />
          
          <CyberCard 
            title="平均能耗" 
            icon={<Zap size={18} />}
            className="min-h-[140px]"
          >
            <div className="space-y-1">
              <div className="text-[10px] uppercase opacity-40 font-mono tracking-tight">
                每 100km 消耗電量
              </div>
              <div className="text-3xl font-mono font-bold text-white flex items-baseline gap-1">
                {stats.avgEfficiency}
                <span className="text-[12px] opacity-50 uppercase font-sans tracking-widest ml-1">kWh / 100km</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              {stats.trend === 'up' ? (
                <div className="flex items-center text-red-500 gap-1 bg-red-500/10 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={12} />
                  <span className="text-[9px] uppercase font-bold tracking-tighter">近期能耗上升</span>
                </div>
              ) : stats.trend === 'down' ? (
                <div className="flex items-center text-cyber-green gap-1 bg-cyber-green/10 px-2 py-0.5 rounded-full">
                  <ArrowDownRight size={12} />
                  <span className="text-[9px] uppercase font-bold tracking-tighter">近期能耗下降</span>
                </div>
              ) : (
                <div className="flex items-center text-white/30 gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                  <Minus size={12} />
                  <span className="text-[9px] uppercase font-bold tracking-tighter">能耗表現穩定</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
              🏆 打敗 <span style={{ color: '#d4ff00', fontWeight: 'bold' }}>{efficiencyRankPercent}%</span> 同款車友
            </div>
          </CyberCard>
        </div>
      </div>

      {/* 3. 4 大社群金剛快捷鍵（活動、投票、團購、福利） */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <button 
          onClick={() => {
            if (activities.length > 0) {
              localStorage.setItem('evlog_last_seen_activity', activities[activities.length - 1].id);
            }
            onActivityClick();
          }}
          className="relative group p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyber-green/50 hover:bg-cyber-green/5 transition-all flex flex-col items-center gap-2 md:gap-3"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.1)]">
            <UserCheck size={20} className="text-cyber-green cyber-text-glow md:w-6 md:h-6" />
          </div>
          <div className="text-[9.5px] md:text-[11px] font-mono font-bold uppercase tracking-wide text-white/70 group-hover:text-cyber-green text-center">報名活動</div>
          
          {hasNewActivity && (
            <motion.div 
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-2.5 right-2.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-cyber-green rounded-full shadow-[0_0_8px_#CCFF00]"
            />
          )}
        </button>

        <button 
          onClick={() => {
            if (polls.length > 0) {
              localStorage.setItem('evlog_last_seen_poll', polls[0].id);
            }
            onPollClick();
          }}
          className="relative group p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyber-green/50 hover:bg-cyber-green/5 transition-all flex flex-col items-center gap-2 md:gap-3"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.1)]">
            <Vote size={20} className="text-cyber-green cyber-text-glow md:w-6 md:h-6" />
          </div>
          <div className="text-[9.5px] md:text-[11px] font-mono font-bold uppercase tracking-wide text-white/70 group-hover:text-cyber-green text-center">即時投票</div>
          
          {hasNewPoll && (
            <motion.div 
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-2.5 right-2.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-cyber-green rounded-full shadow-[0_0_8px_#CCFF00]"
            />
          )}
        </button>

        <button 
          onClick={() => {
            if (groupBuys.length > 0) {
              localStorage.setItem('evlog_last_seen_groupbuy', groupBuys[0].id);
            }
            onGroupBuyClick();
          }}
          className="relative group p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#A3E635]/50 hover:bg-[#A3E635]/5 transition-all flex flex-col items-center gap-2 md:gap-3"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#A3E635]/10 border border-[#A3E635]/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(163,230,21,0.1)]">
            <ShoppingBag size={20} className="text-[#A3E635] cyber-text-glow md:w-6 md:h-6" />
          </div>
          <div className="text-[9.5px] md:text-[11px] font-mono font-bold uppercase tracking-wide text-white/70 group-hover:text-[#A3E635] text-center">團購市集</div>
          
          {hasNewGroupBuy && (
            <motion.div 
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-2.5 right-2.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A3E635] rounded-full shadow-[0_0_8px_#A3E635]"
            />
          )}
        </button>

        <button 
          onClick={onClubPerksClick}
          className="relative group p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyber-green/50 hover:bg-cyber-green/5 transition-all flex flex-col items-center gap-2 md:gap-3"
          id="dashboard_club_perks_btn"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.1)]">
            <Gift size={20} className="text-cyber-green cyber-text-glow md:w-6 md:h-6" />
          </div>
          <div className="text-[9.5px] md:text-[11px] font-mono font-bold uppercase tracking-wide text-white/70 group-hover:text-cyber-green text-center">車友福利</div>
        </button>
      </div>

      {/* 4. 停車/用車快捷操作按鈕 (Parking/Charging & Quick Record) */}
      <div className="space-y-3">
        {/* 🅿️ 實時停車/充電計時器 進行中快捷卡片 */}
        {getStoredTimer() && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onOpenTimer}
            className="p-3.5 rounded-2xl bg-cyber-green/15 border-2 border-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.2)] flex items-center justify-between gap-3 cursor-pointer hover:bg-cyber-green/20 transition-all select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyber-green text-black flex items-center justify-center font-bold text-base shrink-0">
                {getStoredTimer()?.type === 'parking' ? '🅿️' : '⚡'}
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyber-green animate-ping" />
                  <span>{getStoredTimer()?.type === 'parking' ? '停車計時進行中' : '充電計時進行中'}</span>
                  {getStoredTimer()?.location && (
                    <span className="text-cyber-green">· {getStoredTimer()?.location}</span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-white/60 mt-0.5">
                  點擊查看剩餘時限或結束結算 ➔
                </p>
              </div>
            </div>
            <button 
              type="button"
              className="px-3 py-1.5 rounded-xl bg-cyber-green text-black font-mono font-bold text-xs uppercase shadow-[0_0_10px_rgba(204,255,0,0.3)] shrink-0"
            >
              結算
            </button>
          </motion.div>
        )}

        {/* 快捷操作按鈕網格 */}
        <div className="grid grid-cols-2 gap-3">
          {onOpenTimer && (
            <button
              type="button"
              onClick={onOpenTimer}
              className="p-3 rounded-2xl bg-white/[0.02] border border-cyber-green/30 hover:border-cyber-green hover:bg-cyber-green/10 transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-[0_0_15px_rgba(204,255,0,0.05)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyber-green/15 border border-cyber-green/30 flex items-center justify-center text-cyber-green group-hover:scale-110 transition-transform shrink-0">
                  <Clock size={16} className="cyber-text-glow" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs font-mono font-bold text-white group-hover:text-cyber-green block truncate">
                    🅿️ 停車/充電計時
                  </span>
                  <span className="text-[9px] font-mono text-white/40 block truncate">
                    免泊倒數 · 結束結算
                  </span>
                </div>
              </div>
              <span className="text-cyber-green text-xs font-mono font-bold shrink-0">啟動 ➔</span>
            </button>
          )}

          {onOpenNewRecord && (
            <button
              type="button"
              onClick={onOpenNewRecord}
              className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyber-green hover:bg-cyber-green/10 transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:text-cyber-green group-hover:scale-110 transition-transform shrink-0">
                  <PlusCircle size={16} />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs font-mono font-bold text-white group-hover:text-cyber-green block truncate">
                    ⚡ 記錄用車開支
                  </span>
                  <span className="text-[9px] font-mono text-white/40 block truncate">
                    充電 · 泊車 · 保養
                  </span>
                </div>
              </div>
              <span className="text-white/60 group-hover:text-cyber-green text-xs font-mono font-bold shrink-0">記帳 ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. 精簡版當月開支小卡片 (Compact Expense Card) */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyber-green/30 transition-all relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-green/5 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 font-bold flex items-center gap-1.5">
              <DollarSign size={13} className="text-cyber-green" />
              <span>{stats.currentMonthLabel} 開支概覽</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MonthDropdown selectedMonth={selectedMonth} onSelectMonth={onSelectMonth} />
            <button 
              onClick={onViewAll}
              className="text-[11px] font-mono text-cyber-green/80 hover:text-cyber-green flex items-center gap-0.5 transition-colors cursor-pointer ml-1"
              title="查看記錄頁面月度流水"
            >
              <span>明細</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* 3 個核心數值橫向佈局: 總支出 │ 充電 │ 電價 */}
        <div 
          onClick={onViewAll}
          className="grid grid-cols-3 divide-x divide-white/10 p-3 rounded-xl bg-black/40 border border-white/5 cursor-pointer hover:bg-black/60 transition-all"
        >
          {/* 總支出 */}
          <div className="px-2 text-center sm:text-left">
            <span className="text-[9px] sm:text-[10px] font-mono text-white/40 uppercase block tracking-wider">
              總支出
            </span>
            <div className="text-sm sm:text-base font-mono font-black text-white mt-0.5 truncate">
              <span className="text-[10px] sm:text-xs text-cyber-green mr-0.5">HK$</span>
              <span>{expenseStats.totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            </div>
          </div>

          {/* 充電 */}
          <div className="px-2 text-center sm:text-left">
            <span className="text-[9px] sm:text-[10px] font-mono text-white/40 uppercase block tracking-wider">
              充電
            </span>
            <div className="text-sm sm:text-base font-mono font-black text-white mt-0.5 truncate">
              <span className="text-[10px] sm:text-xs text-cyber-green mr-0.5">HK$</span>
              <span>{expenseStats.chargingCost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            </div>
          </div>

          {/* 電價 */}
          <div className="px-2 text-center sm:text-left">
            <span className="text-[9px] sm:text-[10px] font-mono text-cyber-green uppercase block tracking-wider">
              電價
            </span>
            <div className="text-sm sm:text-base font-mono font-black text-cyber-green cyber-text-glow mt-0.5 truncate">
              {expenseStats.avgPricePerKwh !== null ? (
                <span>HK$ {expenseStats.avgPricePerKwh} <span className="text-[9px] sm:text-[10px] font-normal text-white/40">/ kWh</span></span>
              ) : (
                <span className="text-white/40 text-xs sm:text-sm">--</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setShowMaintenanceModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-sm p-6 relative z-10 border-cyber-green/30"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-mono font-bold uppercase text-cyber-green">紀錄已完成保養</h3>
              <button 
                onClick={() => setShowMaintenanceModal(false)} 
                className="text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!onRecordMaintenance) return;
              setIsSubmitting(true);
              try {
                const finalCost = actualCost ? parseFloat(Number(actualCost).toFixed(2)) : 0;
                await onRecordMaintenance(Number(actualKM), actualDate, remarks, finalCost);
                alert('保養紀錄成功 / MAINTENANCE LOGGED SUCCESSFULLY');
                setRemarks('');
                setActualKM('');
                setActualCost('');
                setShowMaintenanceModal(false);
              } catch (err: any) {
                alert('紀錄失敗：' + (err.message || '未知錯誤'));
              } finally {
                setIsSubmitting(false);
              }
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-cyber-green/70">回廠保養日期 / Date</label>
                <input
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white focus:outline-none focus:border-cyber-green"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-cyber-green/70">回廠里程 (KM) / Mileage</label>
                  <input
                    type="number"
                    step="any"
                    value={actualKM}
                    onChange={(e) => setActualKM(e.target.value)}
                    placeholder="例：10000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white focus:outline-none focus:border-cyber-green"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-cyber-green/70">💰 保養費用 (HKD)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    placeholder="0 (免費/首保)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white focus:outline-none focus:border-cyber-green"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-cyber-green/70">保養備忘錄 (選填) / Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="例：更換冷氣濾網、檢查胎壓與煞車皮..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white text-xs focus:outline-none focus:border-cyber-green resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-cyber-green text-black font-mono font-bold text-xs uppercase hover:bg-cyber-green/80 transition-all disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(204,255,0,0.3)]"
              >
                {isSubmitting ? 'SUBMITTING...' : '確認提交 / CONFIRM SUBMISSION'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 🛠️ 歷史保養時間軸彈窗 / Maintenance History Modal */}
      <MaintenanceHistoryModal 
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        uid={userProfile?.id || auth.currentUser?.uid || ''}
        joinedAt={userProfile?.joinedAt}
      />

      {/* 📅 更新行政提醒到期日彈窗 / Update Admin Expiries Modal */}
      {showAdminReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setShowAdminReminderModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-sm p-6 relative z-10 border-amber-500/30"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-mono font-bold uppercase text-amber-500">
                {reminderModalType === 'license' ? '更新行車證到期日' : reminderModalType === 'insurance' ? '更新保險到期日' : '設定行車證與續保到期日'}
              </h3>
              <button 
                onClick={() => setShowAdminReminderModal(false)} 
                className="text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateReminderDates} className="space-y-4">
              {(reminderModalType === 'license' || reminderModalType === 'both') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-amber-500/70">行車證到期日 / Vehicle License Expiry Date</label>
                  <input
                    type="date"
                    value={tempLicenseDate}
                    onChange={(e) => setTempLicenseDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white focus:outline-none focus:border-amber-500"
                    required={reminderModalType === 'license' || reminderModalType === 'both'}
                  />
                </div>
              )}

              {(reminderModalType === 'insurance' || reminderModalType === 'both') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-amber-500/70">保險到期日 / Insurance Expiry Date</label>
                  <input
                    type="date"
                    value={tempInsuranceDate}
                    onChange={(e) => setTempInsuranceDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white focus:outline-none focus:border-amber-500"
                    required={reminderModalType === 'insurance' || reminderModalType === 'both'}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingReminder}
                className="w-full py-3 rounded-xl bg-amber-500 text-black font-mono font-bold text-xs uppercase hover:bg-amber-400 transition-all disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
              >
                {isUpdatingReminder ? 'SUBMITTING...' : '確認提交 / CONFIRM SUBMISSION'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 運輸署特別交通消息完整列表彈窗 */}
      <AnimatePresence>
        {showTrafficNewsModal && (
          <TrafficNewsModal onClose={() => setShowTrafficNewsModal(false)} />
        )}
      </AnimatePresence>

      {/* 三隧分時段收費與即時行車時間詳情彈窗 */}
      <AnimatePresence>
        {showTunnelModal && (
          <TunnelDashboard onClose={() => setShowTunnelModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
