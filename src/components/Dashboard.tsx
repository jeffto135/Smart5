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
import { Zap, TrendingDown, Battery, DollarSign, ArrowUpRight, ArrowDownRight, Minus, UserCheck, Vote } from 'lucide-react';
import { motion } from 'motion/react';
import { CyberCard } from './ui/CyberCard';
import { LogEntry, Vehicle, Activity, Poll } from '../types';
import { format } from 'date-fns';

interface DashboardProps {
  logs: LogEntry[];
  vehicle: Vehicle | null;
  activities: Activity[];
  polls: Poll[];
  onLogClick: (log: LogEntry) => void;
  onViewAll: () => void;
  onActivityClick: () => void;
  onPollClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  logs, 
  vehicle, 
  activities,
  polls,
  onLogClick, 
  onViewAll,
  onActivityClick,
  onPollClick 
}) => {
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

  const stats = useMemo(() => {
    // PRD Formula: (行駛里數 / 燃油效能 * $30) - 電費開支
    const FUEL_EFFICIENCY = 10; 
    const GAS_PRICE = 30;

    let totalSavings = 0;
    let totalDistance = 0;
    let totalCost = 0;
    let totalBatteryConsumed = 0;

    // Use raw records for the trend line chart as requested
    const chartData = [...logs.slice(0, 15)].reverse().map(log => ({
      date: format(log.timestamp.toDate(), 'MM/dd'),
      time: format(log.timestamp.toDate(), 'HH:mm'),
      battery: log.batteryPercent,
      distance: log.distance,
    }));

    // Monthly stats calculation
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyDistance = 0;
    let monthlyBatteryConsumed = 0;
    let monthlyCost = 0;

    logs.forEach(log => {
      const distance = log.distance;
      const cost = log.cost || 0;
      const savings = (distance / FUEL_EFFICIENCY * GAS_PRICE) - cost;
      
      totalSavings += savings;
      totalDistance += distance;
      totalCost += cost;
      
      // Only add to battery consumption if it wasn't a charging event
      if (!log.isCharging) {
        totalBatteryConsumed += log.batteryDiff;
      }

      // Filter for current month
      const logDate = log.timestamp.toDate();
      if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
        monthlyDistance += distance;
        if (!log.isCharging) {
          monthlyBatteryConsumed += log.batteryDiff;
        }
        monthlyCost += cost;
      }
    });

    const avgEfficiencyPerc = totalDistance > 0 ? (totalBatteryConsumed / totalDistance * 100) : 0;
    const avgEfficiencyVal = (avgEfficiencyPerc / 100) * (vehicle?.batteryCapacity || 60);
    const avgEfficiencyStr = avgEfficiencyVal.toFixed(1);

    // Trend calculation
    const recentLogs = logs.slice(0, 3);
    const recentDistance = recentLogs.reduce((sum, log) => sum + log.distance, 0);
    const recentBattery = recentLogs.reduce((sum, log) => sum + (!log.isCharging ? log.batteryDiff : 0), 0);
    const recentEfficiency = recentDistance > 0 ? ((recentBattery / recentDistance * 100) / 100 * (vehicle?.batteryCapacity || 60)) : avgEfficiencyVal;
    
    let trend = 'stable';
    if (recentEfficiency > avgEfficiencyVal * 1.05) trend = 'up';
    else if (recentEfficiency < avgEfficiencyVal * 0.95) trend = 'down';

    return {
      totalSavings: totalSavings.toFixed(0),
      avgEfficiency: avgEfficiencyStr,
      totalDistance: totalDistance.toFixed(0),
      monthlyDistance: monthlyDistance.toLocaleString(),
      monthlyBattery: monthlyBatteryConsumed.toFixed(0),
      monthlyKwh: ((monthlyBatteryConsumed / 100) * (vehicle?.batteryCapacity || 60)).toFixed(1),
      monthlyCost: monthlyCost.toLocaleString(),
      currentMonthLabel: format(now, 'MMMM yyyy'),
      chartData,
      trend
    };
  }, [logs, vehicle]);

  return (
    <div className="space-y-6">
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
      
      {/* Activity & Poll Shortcuts */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            if (activities.length > 0) {
              localStorage.setItem('evlog_last_seen_activity', activities[activities.length - 1].id);
            }
            onActivityClick();
          }}
          className="relative group p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyber-green/50 hover:bg-cyber-green/5 transition-all flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.1)]">
            <UserCheck size={24} className="text-cyber-green cyber-text-glow" />
          </div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/70 group-hover:text-cyber-green">🏃 報名活動</div>
          
          {hasNewActivity && (
            <motion.div 
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-3 right-3 w-2 h-2 bg-cyber-green rounded-full shadow-[0_0_8px_#CCFF00]"
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
          className="relative group p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyber-green/50 hover:bg-cyber-green/5 transition-all flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.1)]">
            <Vote size={24} className="text-cyber-green cyber-text-glow" />
          </div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/70 group-hover:text-cyber-green">🗳️ 即時投票</div>
          
          {hasNewPoll && (
            <motion.div 
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-3 right-3 w-2 h-2 bg-cyber-green rounded-full shadow-[0_0_8px_#CCFF00]"
            />
          )}
        </button>
      </div>

      {/* Chart Section */}
      <CyberCard title="電量趨勢" className="min-h-[280px]">
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
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">最近紀錄</h3>
          <button 
            onClick={onViewAll}
            className="text-[10px] uppercase tracking-widest text-cyber-green/50 hover:text-cyber-green transition-colors"
          >
            查看全部
          </button>
        </div>
        
        {logs.length === 0 ? (
          <div className="glass-card p-10 text-center text-[10px] uppercase tracking-widest opacity-20">
            尚無紀錄
          </div>
        ) : (
          logs.slice(0, 5).map((log) => (
            <button 
              key={log.id} 
              onClick={() => onLogClick(log)}
              className="w-full text-left glass-card p-4 flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group relative overflow-hidden"
            >
              {log.isCharging && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyber-green/50" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-mono group-hover:text-cyber-green transition-colors">{format(log.timestamp.toDate(), 'yyyy-MM-dd')}</div>
                  {log.isCharging && (
                    <span className="text-[8px] bg-cyber-green font-mono font-bold text-black px-1 rounded">⚡️ CHARGED</span>
                  )}
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest">
                  {log.batteryPercent}% BATT 
                  {log.efficiency && !log.isCharging && (
                    <span className="text-cyber-green/60 ml-2"> • {log.efficiency} kWh/100km</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-cyber-green">{log.odometer.toLocaleString()} <span className="text-[10px] opacity-40">KM</span></div>
                <div className="text-[9px] text-white/30 font-mono flex justify-end gap-2">
                  <span>+{log.distance}KM</span>
                  <span>{log.isCharging ? `+${log.batteryDiff}%` : `-${log.batteryDiff}%`}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
