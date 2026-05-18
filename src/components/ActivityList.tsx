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
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const handleRegisterClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
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
              onClick={() => setSelectedActivity(activity)}
            >
              <CyberCard className={`overflow-hidden border-2 transition-all duration-300 cursor-pointer hover:border-cyber-green/50 ${isRegistered ? 'border-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.15)] bg-cyber-green/5' : 'border-cyber-green/20'}`}>
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
                        onClick={(e) => handleRegisterClick(e, activity.id)}
                        disabled={isClosed || isFull}
                        className="py-2 px-8 text-[11px] h-10 shadow-[0_0_20px_rgba(204,255,0,0.2)] relative z-10"
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

      {/* Activity Details Modal */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedActivity(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg"
            >
              <CyberCard className="pt-12 p-8 border-cyber-green/30">
                <button 
                  onClick={() => setSelectedActivity(null)}
                  className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors"
                >
                  <ChevronLeft size={24} className="rotate-180" />
                </button>

                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                       <h3 className="text-2xl font-mono font-bold uppercase tracking-tight text-cyber-green cyber-text-glow">
                        {selectedActivity.title}
                      </h3>
                      <div className="flex items-center gap-4 text-[11px] font-mono text-white/40 uppercase tracking-[0.2em]">
                        <span className="flex items-center gap-1"><Calendar size={12} className="text-cyber-green"/> {selectedActivity.date}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-cyber-green"/> {selectedActivity.location}</span>
                      </div>
                    </div>
                  </div>

                  {selectedActivity.description && (
                    <div className="py-6 border-y border-cyber-green/10">
                      <p className="text-sm text-white/80 leading-relaxed font-sans whitespace-pre-wrap">
                        {selectedActivity.description}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-[0.2em]">
                      <span className="text-white/40">報名進度</span>
                      <span className="text-cyber-green">{selectedActivity.participants.length} / {selectedActivity.limit}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedActivity.participants.length / selectedActivity.limit) * 100}%` }}
                        className="h-full bg-cyber-green shadow-[0_0_10px_rgba(204,255,0,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    {selectedActivity.participants.includes(userId) ? (
                      <div className="w-full py-4 rounded-xl bg-cyber-green/10 border-2 border-cyber-green flex items-center justify-center gap-3 text-cyber-green font-mono font-black uppercase shadow-[0_0_20px_rgba(204,255,0,0.2)]">
                        <CheckCircle2 size={20} />
                        您已成功報名 SUCCESSFUL
                      </div>
                    ) : (
                      <CyberButton 
                        className="w-full py-4 text-sm"
                        disabled={selectedActivity.status === 'closed' || selectedActivity.participants.length >= selectedActivity.limit}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegisterClick(e, selectedActivity.id);
                          setSelectedActivity(null);
                        }}
                      >
                        {selectedActivity.status === 'closed' ? '報名已截止' : selectedActivity.participants.length >= selectedActivity.limit ? '名額已滿' : '立即報名 / JOIN NOW'}
                      </CyberButton>
                    )}
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
