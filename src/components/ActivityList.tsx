import React, { useState } from 'react';
import { Calendar, MapPin, Users, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Activity } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CyberButton } from './ui/CyberButton';
import { CyberCard } from './ui/CyberCard';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface ActivityListProps {
  activities: Activity[];
  userId: string;
  onRegister: (id: string) => Promise<void>;
  onClose: () => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities, userId, onRegister, onClose }) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleRegisterClick = (id: string) => {
    setConfirmingId(id);
  };

  const executeRegister = async () => {
    if (!confirmingId) return;
    await onRegister(confirmingId);
    setConfirmingId(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">活動報名 <span className="text-cyber-green">Events</span></h2>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest">
          尚無進行中活動
        </div>
      ) : (
        activities.map((activity) => {
          const isRegistered = activity.participants.includes(userId);
          const isFull = activity.participants.length >= activity.limit;
          const isClosed = activity.status === 'closed';

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <CyberCard className={`overflow-hidden border-2 transition-all duration-300 ${isRegistered ? 'border-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.15)] bg-cyber-green/5' : 'border-cyber-green/20'}`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className={`text-lg font-mono font-bold tracking-tight uppercase ${isRegistered ? 'text-cyber-green cyber-text-glow' : 'text-white'}`}>
                      {activity.title}
                    </h3>
                    <div className={`text-[10px] font-mono px-3 py-1 rounded-full border shadow-[0_0_10px_rgba(0,0,0,0.2)] ${
                      isClosed ? 'border-red-500/50 text-red-500 bg-red-500/10' : 
                      isFull ? 'border-orange-500/50 text-orange-500 bg-orange-500/10' : 'border-cyber-green/50 text-cyber-green bg-cyber-green/10'
                    }`}>
                      {isClosed ? '已停止 / STOPPED' : isFull ? '已滿額 / FULL' : '報名中 / OPEN'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="flex items-center gap-3 text-white/50 text-[11px] font-mono group-hover:text-white/80 transition-colors">
                      <Calendar size={14} className="text-cyber-green" />
                      {activity.date}
                    </div>
                    <div className="flex items-center gap-3 text-white/50 text-[11px] font-mono group-hover:text-white/80 transition-colors">
                      <MapPin size={14} className="text-cyber-green" />
                      {activity.location}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-cyber-green/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                        <Users size={16} className="text-cyber-green/60" />
                      </div>
                      <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest leading-none">
                        報名人數 <br />
                        <span className={`text-[14px] font-bold ${isFull ? 'text-orange-500' : 'text-cyber-green'}`}>
                          {activity.participants.length}
                        </span>
                        <span className="text-[10px] ml-1">/ {activity.limit}</span>
                      </div>
                    </div>

                    {isRegistered ? (
                      <div className="flex items-center gap-2 text-cyber-green font-mono text-[10px] font-black uppercase bg-cyber-green/10 px-4 py-2 rounded-xl border-2 border-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.2)]">
                        <CheckCircle2 size={16} />
                        已完成報名 SUCCESS
                      </div>
                    ) : (
                      <CyberButton 
                        onClick={() => handleRegisterClick(activity.id)}
                        disabled={isClosed || isFull}
                        className="py-2 px-8 text-[11px] h-10 shadow-[0_0_20px_rgba(204,255,0,0.2)]"
                      >
                        {isClosed ? '截止' : isFull ? '額滿' : '立即報名'}
                      </CyberButton>
                    )}
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          );
        })
      )}

      <ConfirmationModal
        isOpen={!!confirmingId}
        title="確認報名"
        message="確定要報名參加此項活動嗎？\nJOIN THIS ACTIVITY?"
        variant="info"
        onConfirm={executeRegister}
        onCancel={() => setConfirmingId(null)}
      />
    </div>
  );
};
