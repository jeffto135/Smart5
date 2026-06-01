import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Gauge, LayoutGrid, List, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { LogEntry, Vehicle } from '../types';
import { format } from 'date-fns';
import { 
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
  vehicle: Vehicle | null;
  onLogClick: (log: LogEntry) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const LogsHistory: React.FC<LogsHistoryProps> = ({ logs, vehicle, onLogClick, onClose, isLoading = false }) => {
  const [cols, setCols] = useState<1 | 2>(2);

  // 📊 模組三：按日期歸總（Group by Date）後的本月數據按日期升序排列
  const chartData = React.useMemo(() => {
    // 1. Sort all logs chronologically (ascending date) in-memory to compute correct odoDiff
    const sortedAllLogs = [...logs].sort((a, b) => {
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;
      const aOdo = Number(a.odo ?? a.odometer ?? 0);
      const bOdo = Number(b.odo ?? b.odometer ?? 0);
      return aOdo - bOdo;
    });

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

    // 2. Filter for current month's logs
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthLogs = sortedAllLogs.filter(log => {
      const logDate = log.timestamp.toDate();
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    });

    // 3. Group by date
    const groups: { [date: string]: { driveEnergy: number; chargeEnergy: number } } = {};
    const batteryCapacity = vehicle?.batteryCapacity || 100;

    currentMonthLogs.forEach(log => {
      const d = log.date || format(log.timestamp.toDate(), 'yyyy-MM-dd');
      // Format as MM-DD for brevity in XAxis
      let formattedDate = d;
      try {
        const parts = d.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[1]}-${parts[2]}`;
        }
      } catch (e) {}

      if (!groups[formattedDate]) {
        groups[formattedDate] = { driveEnergy: 0, chargeEnergy: 0 };
      }

      const isDrive = log.type === "drive" || (!log.type && !log.isCharging);
      const isCharge = log.type === "charge" || (!log.type && log.isCharging);
      const diffVal = Number(log.segmentDiff ?? log.batteryDiff ?? 0);

      if (isDrive) {
        groups[formattedDate].driveEnergy += diffVal;
      } else if (isCharge) {
        groups[formattedDate].chargeEnergy += diffVal;
      }
    });

    // 4. Transform into array and sort chronologically (ascending date)
    return Object.entries(groups).map(([date, data]) => {
      const driveKwh = parseFloat(((data.driveEnergy / 100) * batteryCapacity).toFixed(2));
      const chargeKwh = parseFloat(((data.chargeEnergy / 100) * batteryCapacity).toFixed(2));
      return {
        date,
        dayTotalDriveEnergy: driveKwh,
        dayTotalChargeEnergy: chargeKwh,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, vehicle]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 -ml-2 text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
                營運紀錄 <span className="text-cyber-green">Logs</span>
              </h2>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                充電與行駛用電力度數據日誌
              </p>
            </div>
          </div>
        </div>
        
        {/* Skeleton Grid for logs */}
        <div className={`grid ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-zinc-800 animate-pulse rounded-md" />
                <div className="h-5 w-16 bg-zinc-800 animate-pulse rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-800 animate-pulse rounded" />
                  <div className="h-6 w-24 bg-zinc-805 animate-pulse rounded-md" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3 w-16 bg-zinc-800 animate-pulse rounded ml-auto" />
                  <div className="h-6 w-24 bg-zinc-805 animate-pulse rounded-md ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
          歷史紀錄
        </h2>
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
          <button 
            onClick={() => setCols(1)}
            className={`p-1.5 rounded transition-colors ${cols === 1 ? 'bg-cyber-green text-black' : 'text-white/40 hover:text-white'}`}
          >
            <List size={16} />
          </button>
          <button 
            onClick={() => setCols(2)}
            className={`p-1.5 rounded transition-colors ${cols === 2 ? 'bg-cyber-green text-black' : 'text-white/40 hover:text-white'}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* 📊 模組三：全月用電與充電曲線圖 */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 font-bold">Dynamic Energy Composed Track</span>
            <h3 className="text-md font-bold uppercase tracking-wide text-white mt-0.5">本月用電與充電對比</h3>
          </div>
          <span className="text-[10px] font-mono text-cyber-green bg-cyber-green/10 border border-cyber-green/20 px-2 py-0.5 rounded uppercase font-bold">
            kWh 雙軸
          </span>
        </div>

        {chartData.length > 0 ? (
          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: -15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff25" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                />
                {/* Left Y-Axis for fluorescent green line: dayTotalDriveEnergy */}
                <YAxis 
                  yAxisId="left"
                  stroke="#CCFF00" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  width={40}
                  tickFormatter={(val) => `${val} kWh`}
                />
                {/* Right Y-Axis for sky-blue bar: dayTotalChargeEnergy */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#38bdf8" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  width={40}
                  tickFormatter={(val) => `${val} kWh`}
                />
                <Tooltip 
                  contentStyle={{ background: '#121212', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
                  itemStyle={{ fontSize: '10px' }}
                  labelStyle={{ color: '#ffffff40', marginBottom: '4px' }}
                  formatter={(value: any, name: string) => {
                    if (name === "dayTotalDriveEnergy") return [`${value} kWh`, "本日行程總耗電量"];
                    if (name === "dayTotalChargeEnergy") return [`${value} kWh`, "本日補給總充電量"];
                    return [value, name];
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', opacity: 0.8 }}
                  formatter={(value) => {
                    if (value === "dayTotalDriveEnergy") return <span className="text-white/60 font-mono text-[9px] uppercase tracking-wide">🔋 耗電量 (Line)</span>;
                    if (value === "dayTotalChargeEnergy") return <span className="text-white/60 font-mono text-[9px] uppercase tracking-wide">⚡ 充電量 (Bar)</span>;
                    return value;
                  }}
                />
                {/* Sky blue Bar for charge energy */}
                <Bar 
                  yAxisId="right"
                  dataKey="dayTotalChargeEnergy" 
                  fill="#38bdf8" 
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                  name="dayTotalChargeEnergy"
                />
                {/* Fluorescent green line for drive energy */}
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="dayTotalDriveEnergy" 
                  stroke="#CCFF00" 
                  strokeWidth={2}
                  dot={{ fill: '#CCFF00', r: 3, strokeWidth: 0, fillOpacity: 0.5 }}
                  activeDot={{ r: 5, stroke: '#121212', strokeWidth: 2, fill: '#CCFF00' }}
                  name="dayTotalDriveEnergy"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-[10px] uppercase tracking-widest opacity-20 font-mono">
            本月尚無用車及充電數據
          </div>
        )}
      </div>

      <div className={`grid ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {logs.length === 0 ? (
          <div className="col-span-2 text-center py-20 opacity-30 uppercase tracking-[0.3em] font-mono text-sm">
            目前沒有紀錄
          </div>
        ) : (
          logs.map((log) => (
            <motion.button
              key={log.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onLogClick(log)}
              className="w-full text-left glass-card p-5 bg-white/[0.02] hover:bg-white/[0.05] transition-all border-l-2 border-l-transparent hover:border-l-cyber-green"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-cyber-green/60 text-xs font-mono uppercase">
                  <Calendar size={14} />
                  {log.date || format(log.timestamp.toDate(), 'yyyy-MM-dd')}
                  <span className="opacity-40">
                    {format(log.timestamp.toDate(), 'HH:mm')}
                  </span>
                  {log.isCharging && (
                    <span className="text-[8px] bg-cyber-green text-black px-1 rounded font-bold">⚡️ 補能</span>
                  )}
                </div>
                <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${log.isCharging ? 'text-cyber-green border-cyber-green' : 'text-white/60 border-white/10'}`}>
                  {log.batteryPercent}% BATT
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase opacity-30 tracking-widest flex items-center gap-1">
                    <Gauge size={10} /> {log.isCharging ? '補電力度' : '分段里程'}
                  </div>
                  <div className="text-lg font-mono font-bold">
                    {log.isCharging ? `+${log.batteryDiff}%` : `${log.distance.toLocaleString()} km`}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-[10px] uppercase opacity-30 tracking-widest">
                    {log.isCharging ? '充電費用' : '本次能耗'}
                  </div>
                  <div className={`text-lg font-mono font-bold ${!log.isCharging && log.efficiency ? 'text-cyber-green' : 'text-white/80'}`}>
                    {log.isCharging 
                      ? (log.cost ? `$${log.cost}` : '--')
                      : (log.efficiency ? `${log.efficiency} ⚡️` : '--')
                    }
                  </div>
                </div>
              </div>

              {log.location && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] opacity-40 uppercase tracking-widest">
                  <MapPin size={10} />
                  {log.location}
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};
