import React, { useState } from 'react';
import { Calendar, MapPin, Users, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Activity, ActivityRegistration, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CyberButton } from './ui/CyberButton';
import { CyberCard } from './ui/CyberCard';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { EventDetail } from './EventDetail';

interface ActivityListProps {
  activities: Activity[];
  registrations: ActivityRegistration[];
  userProfile?: UserProfile | null;
  allProfiles?: UserProfile[];
  isAdmin?: boolean;
  isSubAdmin?: boolean;
  userId: string;
  onRegister: (id: string, plate: string) => Promise<void>;
  onCancelRegistration: (eventId: string, reason: string) => Promise<void>;
  onAdminRestoreRegistration: (eventId: string, userId: string) => Promise<void>;
  onDeleteRegistration?: (regId: string, userId: string, eventId: string) => Promise<void>;
  onClose: () => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({ 
  activities, 
  registrations, 
  userProfile, 
  allProfiles = [],
  isAdmin = false,
  isSubAdmin = false,
  userId, 
  onRegister, 
  onCancelRegistration,
  onAdminRestoreRegistration,
  onDeleteRegistration,
  onClose 
}) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { active, past } = React.useMemo(() => {
    const now = new Date();
    const act: Activity[] = [];
    const pst: Activity[] = [];

    activities.forEach(activity => {
      let activityDate: Date;
      if (activity.eventStartDate) {
        activityDate = activity.eventStartDate.toDate();
      } else {
        activityDate = new Date(activity.date);
      }
      
      const finishDate = activity.eventEndDate 
        ? activity.eventEndDate.toDate() 
        : new Date(new Date(activityDate).setDate(activityDate.getDate() + 1));
      
      if (now >= finishDate) {
        pst.push(activity);
      } else {
        act.push(activity);
      }
    });

    const compareDates = (a: Activity, b: Activity) => {
      const dateA = a.eventStartDate ? a.eventStartDate.toMillis() : new Date(a.date).getTime();
      const dateB = b.eventStartDate ? b.eventStartDate.toMillis() : new Date(b.date).getTime();
      return dateA - dateB;
    };

    act.sort((a,b) => compareDates(a, b));
    pst.sort((a,b) => compareDates(b, a));
    return { active: act, past: pst };
  }, [activities]);

  const handleRegisterClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmingId(id);
  };

  const executeRegister = async () => {
    if (!confirmingId) return;
    await onRegister(confirmingId, userProfile?.plate || '');
    setConfirmingId(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">活動報名 <span className="text-cyber-green">Events</span></h2>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-6">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'upcoming' 
              ? 'bg-cyber-green text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          進行中活動 / UPCOMING
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'past' 
              ? 'bg-cyber-green text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          過去活動 / PAST EVENTS
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'upcoming' ? (
          <motion.div
            key="upcoming-list"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            {active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 font-mono">
                <Calendar size={48} className="mb-4 text-cyber-green/40" />
                <p className="text-sm uppercase tracking-widest">目前暫無進行中活動</p>
                <p className="text-[10px] mt-1">COMING SOON</p>
              </div>
            ) : (
              active.map((activity) => {
                const now = new Date();
                const isRegistered = activity.participants.includes(userId);
                const isFull = activity.participants.length >= activity.limit;
                const isRegistrationClosed = (() => {
                  if (activity.deadlineDate) {
                    return now > new Date(activity.deadlineDate + 'T23:59:59');
                  }
                  const regDeadline = activity.eventEndDate?.toDate() || new Date(activity.date + 'T23:59:59');
                  return now > regDeadline;
                })();
                const isClosed = activity.status === 'closed' || isRegistrationClosed;

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
                            {isClosed ? (isRegistrationClosed ? '報名截止 / CLOSED' : '已停止 / STOPPED') : isFull ? '已滿額 / FULL' : '報名中 / OPEN'}
                          </div>
                        </div>
                        {activity.deadlineDate && !isClosed && !isRegistered && (
                          <div className="text-[10px] font-mono text-orange-500/70 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={10} /> 截止日期: {activity.deadlineDate}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 py-2">
                          <div className="flex items-center gap-3 text-white/50 text-[11px] font-mono group-hover:text-white/80 transition-colors">
                            <Calendar size={14} className="text-cyber-green" />
                            {activity.eventStartDate ? activity.eventStartDate.toDate().toLocaleDateString('zh-HK') : activity.date}
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

                          {isRegistered && (
                            <div className="flex items-center gap-2 text-cyber-green font-mono text-[10px] font-black uppercase bg-cyber-green/5 px-3 py-1 rounded-lg border border-cyber-green/30">
                              <CheckCircle2 size={12} />
                              已報名
                            </div>
                          )}
                        </div>
                      </div>
                    </CyberCard>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="past-list"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {past.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-cyber-green font-semibold">目前暫無過去活動紀錄</p>
                <p className="text-sm text-gray-400 mt-1">Smart5 車友會精彩回顧籌備中！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                {past.map(activity => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-mono font-bold text-white/60 mb-1">{activity.title}</h4>
                        <div className="text-[9px] font-mono text-white/20 uppercase flex gap-3">
                          <span className="flex items-center gap-1"><Calendar size={10} /> {activity.date}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} /> {activity.location}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-white/20">PARTICIPANTS</div>
                        <div className="text-xs font-mono text-white/40">{activity.participants.length} / {activity.limit}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Details Modal */}
      <AnimatePresence>
        {selectedActivity && (
          <EventDetail 
            activity={selectedActivity}
            registration={registrations.find(r => r.eventId === selectedActivity.id && r.userId === userId)}
            allRegistrations={registrations.filter(r => r.eventId === selectedActivity.id)}
            userProfile={userProfile}
            allProfiles={allProfiles}
            isAdmin={isAdmin}
            isSubAdmin={isSubAdmin}
            userId={userId}
            onClose={() => setSelectedActivity(null)}
            onRegister={async (plate) => {
              if (selectedActivity) {
                await onRegister(selectedActivity.id, plate);
              }
            }}
            onCancelRegistration={onCancelRegistration}
            onAdminRestore={onAdminRestoreRegistration}
            onDeleteRegistration={onDeleteRegistration}
          />
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
