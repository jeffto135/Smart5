import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Gauge, LayoutGrid, List } from 'lucide-react';
import { motion } from 'motion/react';
import { LogEntry } from '../types';
import { format } from 'date-fns';

interface LogsHistoryProps {
  logs: LogEntry[];
  onLogClick: (log: LogEntry) => void;
  onClose: () => void;
}

export const LogsHistory: React.FC<LogsHistoryProps> = ({ logs, onLogClick, onClose }) => {
  const [cols, setCols] = useState<1 | 2>(2);

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
                  {format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm')}
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
