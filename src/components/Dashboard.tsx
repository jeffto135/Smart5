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
import { Zap, TrendingDown, Battery, DollarSign, ArrowUpRight, ArrowDownRight, Minus, UserCheck, Vote, ShoppingBag, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { CyberCard } from './ui/CyberCard';
import { LogEntry, Vehicle, Activity, Poll, GroupBuy, UserProfile } from '../types';
import { format } from 'date-fns';
import { MonthDropdown } from './MonthDropdown';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { MaintenanceHistoryModal } from './MaintenanceHistoryModal';

interface DashboardProps {
  logs: LogEntry[];
  vehicle: Vehicle | null;
  activities: Activity[];
  polls: Poll[];
  groupBuys: GroupBuy[];
  userProfile: UserProfile | null;
  onRecordMaintenance?: (actualKM: number, actualDate: string, remarks?: string) => Promise<void>;
  onLogClick: (log: LogEntry) => void;
  onViewAll: () => void;
  onActivityClick: () => void;
  onPollClick: () => void;
  onGroupBuyClick: () => void;
  onClubPerksClick: () => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  logs, 
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
  onSelectMonth
}) => {
  const [expandedDates, setExpandedDates] = useState<{ [date: string]: boolean }>({});
  
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [actualKM, setActualKM] = useState('');
  const [actualDate, setActualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAdminReminderModal, setShowAdminReminderModal] = useState(false);
  const [reminderModalType, setReminderModalType] = useState<'license' | 'insurance' | 'both'>('both');
  const [tempLicenseDate, setTempLicenseDate] = useState('');
  const [tempInsuranceDate, setTempInsuranceDate] = useState('');
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);

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

  // 🧠 模組二：智能用車提醒與續航估算 (EV Smart Insights)
  const smartInsights = useMemo(() => {
    const lastLog = logs[0];
    const lastSoc = lastLog?.batteryPercent ?? vehicle?.lastBatteryPercent ?? 100;
    const lastOdo = lastLog ? Number(lastLog.odo ?? lastLog.odometer ?? 0) : Number(vehicle?.lastOdometer ?? 0);

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
      {/* 🧠 模組二：EV Smart Insights 智能儀表板 */}
      <div className="space-y-4">
        {smartInsights.showMaintenanceWarning && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-cyber-green/10 border-2 border-cyber-green text-cyber-green flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">🛠️</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono">保養里程碑提示 / MAINTENANCE REMINDER</h4>
                <p className="text-xs font-semibold leading-relaxed">
                  提示：{smartInsights.reminderReason}。當前已達 <span className="underline font-bold">{smartInsights.lastOdo.toLocaleString()} KM</span>，請預約回廠檢查胎壓、煞車皮與更換冷氣濾網。
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setActualKM(smartInsights.lastOdo.toString());
                setActualDate(format(new Date(), 'yyyy-MM-dd'));
                setShowMaintenanceModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyber-green text-black font-mono font-bold text-xs uppercase hover:bg-cyber-green/80 transition-all shadow-[0_0_15px_rgba(204,255,0,0.3)] shrink-0 self-end md:self-center"
            >
              🔧 紀錄已回廠 / RECORD COMPLETED
            </button>
          </motion.div>
        )}

        {/* 🚗 汽車行政到期自動提醒 / Annual Admin Reminders */}
        {vehicleReminders.hasMissingDates && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => openReminderModal('both')}
            className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.1)] cursor-pointer hover:bg-amber-500/15 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <p className="text-xs font-semibold leading-relaxed">
                [ ⚠️ 未設定行車證/續保日期，點擊此處設定以啟動智能倒數 ]
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500 hover:underline">去設定 ➔</span>
          </motion.div>
        )}

        {vehicleReminders.showLicReminder && vehicleReminders.licExpiryDate && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">📅</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-amber-500">行車證續期提醒 / VEHICLE LICENSE EXPIRY</h4>
                <p className="text-xs font-semibold leading-relaxed">
                  {vehicleReminders.licDaysLeft < 0 
                    ? `📅 行車證提醒：您的行車證已過期，請及時辦理續期申請！` 
                    : `📅 行車證提醒：您的行車證將於 ${vehicleReminders.licDaysLeft} 天後到期，請及時辦理續期申請！`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => openReminderModal('license')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-mono font-bold text-xs uppercase hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 self-end md:self-center cursor-pointer"
            >
              📝 我已續期
            </button>
          </motion.div>
        )}

        {vehicleReminders.showInsReminder && vehicleReminders.insExpiryDate && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">📅</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-amber-500">汽車續保提醒 / INSURANCE EXPIRY</h4>
                <p className="text-xs font-semibold leading-relaxed">
                  {vehicleReminders.insDaysLeft < 0 
                    ? `📅 續保提醒：您的汽車保險已過期，請及時辦理續保申請！` 
                    : `📅 續保提醒：您的汽車保險將於 ${vehicleReminders.insDaysLeft} 天後到期，請及時辦理續保申請！`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => openReminderModal('insurance')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-mono font-bold text-xs uppercase hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 self-end md:self-center cursor-pointer"
            >
              📝 我已續期
            </button>
          </motion.div>
        )}

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden">
          {/* Cyber accents decoration */}
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
                🛠️ 查閱保養日誌
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

          {/* 📋 行政限期管理 / Admin Deadlines */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01] -mx-5 -mb-5 p-5 rounded-b-2xl">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono text-white/40 uppercase block">行車證到期日</span>
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${!vehicleReminders.licExpiryDate ? 'bg-white/25' : (vehicleReminders.showLicReminder ? 'bg-amber-500 animate-pulse' : 'bg-cyber-green')}`} />
                  {vehicleReminders.licExpiryDate ? format(vehicleReminders.licExpiryDate, 'yyyy-MM-dd') : '未設定'}
                </span>
              </div>
              <div className="space-y-0.5 border-l border-white/5 pl-6">
                <span className="text-[9px] font-mono text-white/40 uppercase block">汽車保險到期日</span>
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${!vehicleReminders.insExpiryDate ? 'bg-white/25' : (vehicleReminders.showInsReminder ? 'bg-amber-500 animate-pulse' : 'bg-cyber-green')}`} />
                  {vehicleReminders.insExpiryDate ? format(vehicleReminders.insExpiryDate, 'yyyy-MM-dd') : '未設定'}
                </span>
              </div>
            </div>
            <button
              onClick={() => openReminderModal('both')}
              className="text-xs font-mono font-bold text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:border-amber-500/65"
            >
              ✏️ 變更/設定期限
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <CyberCard title="對比油車節省" icon={<DollarSign size={18} />} className="border-cyber-green/20">
          <div className="text-3xl font-mono font-bold text-cyber-green flex items-baseline gap-1">
            <span className="text-sm opacity-50">$</span>
            {stats.totalSavings}
          </div>
          <div className="text-[10px] uppercase opacity-40 mt-1 tracking-tighter">節省 (HKD)</div>
        </CyberCard>
        
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
        </CyberCard>
      </div>

      {/* Monthly Summary Section */}
      <CyberCard title={`${stats.currentMonthLabel} 數據總計`} icon={<TrendingDown size={18} />}>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 rounded bg-white/[0.03] border border-white/5">
            <div className="text-[9px] uppercase opacity-40 mb-1 font-mono tracking-tight">總里程</div>
            <div className="text-xl font-mono font-bold text-white leading-none">{stats.monthlyDistance}</div>
            <div className="text-[8px] opacity-30 mt-1 uppercase">KM</div>
          </div>
          <div className="p-3 rounded bg-white/[0.03] border border-white/5">
            <div className="text-[9px] uppercase opacity-40 mb-1 font-mono tracking-tight">總支出</div>
            <div className="text-xl font-mono font-bold text-white leading-none">{stats.monthlyCost}</div>
            <div className="text-[8px] opacity-30 mt-1 uppercase font-mono">HKD</div>
          </div>
        </div>
      </CyberCard>
      
      {/* Activity, Poll, Group Buy & Perks Shortcuts */}
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

      {/* Chart Section */}
      <CyberCard title="電量趨勢" className="min-h-[280px]" action={<MonthDropdown selectedMonth={selectedMonth} onSelectMonth={onSelectMonth} />}>
        {stats.chartData.length > 0 ? (
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
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
                  contentStyle={{ background: '#121212', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
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
                  dot={{ fill: '#CCFF00', r: 3, strokeWidth: 0, fillOpacity: 0.5 }}
                  activeDot={{ r: 5, stroke: '#1a1a1a', strokeWidth: 2, fill: '#CCFF00' }}
                  name="電量"
                  animationDuration={800}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="distance" 
                  stroke="#ffffff20" 
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
          <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-widest opacity-20">
            需要更多數據
          </div>
        )}
      </CyberCard>

      {/* Recent Logs List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">最近紀錄</h3>
          <button 
            onClick={onViewAll}
            className="text-[10px] uppercase tracking-widest text-cyber-green/50 hover:text-cyber-green transition-colors"
          >
            查看全部
          </button>
        </div>
        
        {groupedLogs.length === 0 ? (
          <div className="glass-card p-10 text-center text-[10px] uppercase tracking-widest opacity-20">
            尚無紀錄
          </div>
        ) : (
          groupedLogs.slice(0, 5).map((group) => {
            const hasMultiple = group.records.length > 1;
            const isExpanded = !!expandedDates[group.date];
            const hasCharge = group.totalChargeEnergy > 0;
            const dominantRecord = group.records[group.records.length - 1];

            return (
              <div 
                key={group.date}
                className="glass-card overflow-hidden bg-white/[0.01] border border-white/5 rounded-xl transition-all"
              >
                {/* Daily Summary Card */}
                <div 
                  onClick={(e) => {
                    if (hasMultiple) {
                      toggleDate(group.date, e);
                    } else {
                      onLogClick(dominantRecord);
                    }
                  }}
                  className="w-full text-left p-4 flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.04] transition-all cursor-pointer relative overflow-hidden group select-none"
                >
                  {hasCharge && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyber-green/50" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-mono group-hover:text-cyber-green transition-colors font-bold">
                        {group.date}
                      </div>
                      {hasCharge && (
                        <span className="text-[8px] bg-cyber-green font-mono font-bold text-black px-1 rounded">⚡️ 補能</span>
                      )}
                      {hasMultiple && (
                        <span className="text-[8px] bg-white/10 text-white/60 font-mono px-1 rounded">
                          {group.records.length} 段用車 {isExpanded ? '▼ 摺疊' : '▶ 展開'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5 font-mono flex items-center gap-1">
                      <span>最後 {dominantRecord.batteryPercent}% 電量</span>
                      {group.avgEfficiency !== "--" && (
                        <>
                          <span className="opacity-30">•</span>
                          <span className="text-cyber-green/70 font-semibold">{group.avgEfficiency} kWh/100km</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-cyber-green leading-tight">
                      {group.maxOdo.toLocaleString()} <span className="text-[10px] opacity-40 font-normal">KM</span>
                    </div>
                    <div className="text-[9px] text-white/30 font-mono flex justify-end gap-1.5 mt-0.5">
                      <span className="text-white/60">+{group.totalDistance}KM</span>
                      {group.totalDriveEnergy > 0 && <span className="text-red-400">-{group.totalDriveEnergy}%⚡️</span>}
                      {group.totalChargeEnergy > 0 && <span className="text-cyber-green">+{group.totalChargeEnergy}%🔌</span>}
                    </div>
                  </div>
                </div>

                {/* Sub-Segments Expandable List */}
                {hasMultiple && isExpanded && (
                  <div className="border-t border-white/5 bg-white/[0.015] p-2 space-y-1 animate-in slide-in-from-top-2 duration-150">
                    <div className="text-[9px] uppercase tracking-widest text-white/30 px-2 py-1 font-mono">
                      分段時空明細 (按記錄先後排序)：
                    </div>
                    {group.records.map((rec, subIdx) => {
                      const isRecCharge = rec.type === "charge" || (!rec.type && rec.isCharging);
                      return (
                        <button
                          key={rec.id}
                          onClick={() => onLogClick(rec)}
                          className="w-full text-left p-2.5 rounded hover:bg-white/5 transition-all flex justify-between items-center bg-white/[0.01]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/40">#{subIdx + 1}</span>
                            <span className="text-[11px] font-mono text-white/80">
                              {rec.timestamp ? format(rec.timestamp.toDate(), 'HH:mm') : '--:--'}
                            </span>
                            {isRecCharge ? (
                              <span className="text-[7px] text-cyber-green border border-cyber-green/40 px-1 rounded font-mono font-bold">CHARGE</span>
                            ) : (
                              <span className="text-[7px] text-white/40 border border-white/10 px-1 rounded font-mono">DRIVE</span>
                            )}
                            {rec.location && (
                              <span className="text-[9px] text-white/20 truncate max-w-[100px] font-mono">
                                ({rec.location})
                              </span>
                            )}
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div className="text-xs font-mono text-cyber-green">
                              {Number(rec.odo ?? rec.odometer ?? 0).toLocaleString()} <span className="text-[8px] opacity-40 font-mono">KM</span>
                            </div>
                            <div className="text-[10px] font-mono text-white/40 min-w-[70px] text-right">
                              {rec.batteryPercent}% ({isRecCharge ? `+${rec.segmentDiff ?? rec.batteryDiff}%` : `-${rec.segmentDiff ?? rec.batteryDiff}%`})
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
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
                await onRecordMaintenance(Number(actualKM), actualDate, remarks);
                alert('保養紀錄成功 / MAINTENANCE LOGGED SUCCESSFULLY');
                setRemarks('');
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

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-cyber-green/70">回廠保養里程 (KM) / Mileage</label>
                <input
                  type="number"
                  value={actualKM}
                  onChange={(e) => setActualKM(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white focus:outline-none focus:border-cyber-green"
                  required
                />
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
    </div>
  );
};
