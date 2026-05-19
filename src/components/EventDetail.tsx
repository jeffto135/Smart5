import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, AlertCircle, Calendar, MapPin, Users, ChevronLeft, Youtube, Trash2, Navigation } from 'lucide-react';
import { Activity, ActivityRegistration, UserProfile } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberButton } from './ui/CyberButton';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { format, formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface EventDetailProps {
  activity: Activity;
  registration?: ActivityRegistration;
  allRegistrations?: ActivityRegistration[];
  userProfile?: UserProfile | null;
  allProfiles?: UserProfile[];
  isAdmin?: boolean;
  isSubAdmin?: boolean;
  userId: string;
  onClose: () => void;
  onRegister: (plate: string) => Promise<void>;
  onCancelRegistration: (eventId: string, reason: string) => Promise<void>;
  onAdminRestore?: (eventId: string, userId: string) => Promise<void>;
  onDeleteRegistration?: (regId: string, userId: string, eventId: string) => Promise<void>;
}

export const EventDetail: React.FC<EventDetailProps> = ({ 
  activity, 
  registration,
  allRegistrations = [],
  userProfile, 
  allProfiles = [],
  isAdmin = false,
  isSubAdmin = false,
  userId, 
  onClose, 
  onRegister,
  onCancelRegistration,
  onAdminRestore,
  onDeleteRegistration
}) => {
  const [deletingReg, setDeletingReg] = React.useState<{regId: string, userId: string} | null>(null);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  
  const isRegistered = activity.participants.includes(userId);
  const isFull = activity.participants.length >= activity.limit;
  
  // Check for existing registration record (even if cancelled)
  const existingRecord = registration;
  const isCancelled = existingRecord?.status === 'cancelled';
  const lockoutUntil = existingRecord?.lockoutUntil?.toDate();
  const isLockedOut = lockoutUntil && lockoutUntil > new Date();

  // Check if registration is closed based on deadlineDate or eventEndDate
  const isRegistrationClosed = React.useMemo(() => {
    const now = new Date();
    let regDeadline: Date;
    if (activity.deadlineDate) {
      regDeadline = new Date(activity.deadlineDate + 'T23:59:59');
    } else {
      regDeadline = activity.eventEndDate?.toDate() || new Date(activity.date + 'T23:59:59');
    }
    return now > regDeadline;
  }, [activity.deadlineDate, activity.eventEndDate, activity.date]);

  // Check if the event itself has ended
  const isEventEnded = React.useMemo(() => {
    const now = new Date();
    const finishDate = activity.eventEndDate 
      ? activity.eventEndDate.toDate() 
      : new Date(new Date(activity.eventStartDate?.toDate() || activity.date).setDate(new Date(activity.eventStartDate?.toDate() || activity.date).getDate() + 1));
    return now > finishDate;
  }, [activity]);

  // Expiration check: 24h after event end date for QR code visibility
  const isExpired = React.useMemo(() => {
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (activity.eventEndDate) {
      const endTime = activity.eventEndDate.toDate().getTime();
      return now > (endTime + twentyFourHours);
    }

    const targetDate = activity.date;
    const endDateTime = new Date(targetDate + 'T23:59:59').getTime();
    return now > (endDateTime + twentyFourHours);
  }, [activity.eventEndDate, activity.date]);

  const qrData = React.useMemo(() => {
    if (!isRegistered || !registration || isCancelled) return null;
    return JSON.stringify({
      eventId: activity.id,
      userId: userId,
      plateNumber: registration.plateNumber
    });
  }, [activity.id, userId, isRegistered, registration, isCancelled]);

  const qrStatus = React.useMemo(() => {
    if (!isRegistered && !isCancelled) return null;
    if (isCancelled) return 'cancelled';
    if (registration?.qrCodeUsed || registration?.attended) return 'used';
    if (isExpired) return 'expired';
    return 'valid';
  }, [isRegistered, registration, isExpired, isCancelled]);

  const handleRegister = async () => {
    setIsActionLoading(true);
    try {
      await onRegister(userProfile?.plate || '');
      setShowJoinConfirm(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!cancelReason.trim()) return;
    setIsActionLoading(true);
    try {
      await onCancelRegistration(activity.id, cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      console.error('Cancel failed:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAdminRestore = async (userIdToRestore: string) => {
    if (!onAdminRestore) return;
    setIsActionLoading(true);
    try {
      await onAdminRestore(activity.id, userIdToRestore);
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Helper to format scan info
  const scanInfo = React.useMemo(() => {
    if (registration?.attended && registration.attendedAt) {
      return format(registration.attendedAt.toDate(), 'yyyy-MM-dd HH:mm');
    }
    return null;
  }, [registration]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <CyberCard className="border-cyber-green/30 pt-12 p-8">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} className="rotate-180" />
          </button>

          <div className="space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-mono font-bold uppercase tracking-widest ${
                  isEventEnded ? 'bg-white/10 text-white/40 border border-white/20' :
                  activity.status === 'open' && !isRegistrationClosed ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}>
                  {isEventEnded ? '活動已結束 ENDED' : activity.status === 'open' && !isRegistrationClosed ? '報名中 OPEN' : '已截止 CLOSED'}
                </span>
                {isRegistered && (
                  <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-mono font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    已報名 REGISTERED
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-mono font-black uppercase text-white tracking-tight leading-none mb-4">
                {activity.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3 text-white/50 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-cyber-green/10">
                    <Calendar size={16} className="text-cyber-green" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-white/30 text-[9px] uppercase tracking-widest font-bold">日期與時間 DATE & TIME</div>
                    <div className="text-white/80 text-xs leading-relaxed">
                      {activity.eventStartDate ? (
                        <>
                          <div className="font-sans font-medium text-white">
                            {format(activity.eventStartDate.toDate(), 'yyyy年MM月dd日', { locale: zhTW })}
                          </div>
                          <div className="text-[10px] opacity-70">
                            {format(activity.eventStartDate.toDate(), 'HH:mm')} - {activity.eventEndDate ? format(activity.eventEndDate.toDate(), 'HH:mm') : '??:??'}
                          </div>
                        </>
                      ) : (
                        <span className="text-white/60">{activity.date}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-white/50 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-cyber-green/10">
                    <MapPin size={16} className="text-cyber-green" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="space-y-1">
                      <div className="text-white/30 text-[9px] uppercase tracking-widest font-bold">地點 LOCATION</div>
                      <div className="text-white/80 text-xs font-sans font-medium">{activity.location}</div>
                    </div>
                    
                    <button
                      onClick={() => {
                        const url = activity.locationCoordinates 
                          ? `https://www.google.com/maps/dir/?api=1&destination=${activity.locationCoordinates}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`;
                        window.open(url, '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-green text-black rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_15px_rgba(204,255,0,0.3)] group"
                    >
                      <Navigation size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      Google Maps 導航
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-[0.2em] mb-1">
                <span className="text-white/40">報名進度 PROGRESS</span>
                <span className="text-cyber-green">{activity.participants.length} / {activity.limit}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(activity.participants.length / activity.limit) * 100}%` }}
                  className="h-full bg-cyber-green shadow-[0_0_10px_#CCFF00]"
                />
              </div>
            </div>

            {/* Description */}
            {activity.description && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white/70 leading-relaxed font-sans whitespace-pre-wrap">
                  {activity.description}
                </p>
              </div>
            )}

            {/* QR Code Section (Only if registered) */}
            {isRegistered && qrData && (
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="text-center font-mono text-[10px] text-white/30 uppercase tracking-[0.3em]">
                  活動簽到 QR CODE / CHECK-IN
                </div>
                
                <div className="relative mx-auto w-48 h-48 p-3 bg-white rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <QRCodeSVG 
                    value={qrData || 'CANCELLED'} 
                    size={168} 
                    level="H"
                    imageSettings={{
                      src: "/logo.png", // Fallback or placeholder
                               excavate: true,
                    }}
                  />
                  {(qrStatus === 'used' || qrStatus === 'expired' || qrStatus === 'cancelled') && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                      {qrStatus === 'used' ? (
                        <>
                          <CheckCircle2 size={32} className="text-cyber-green mb-2" />
                          <span className="text-xs font-mono font-bold text-cyber-green uppercase">已完成簽到<br/>CHECKED IN</span>
                          {scanInfo && <span className="text-[8px] font-mono text-white/40 mt-1 uppercase">於 {scanInfo}</span>}
                        </>
                      ) : qrStatus === 'cancelled' ? (
                        <>
                          <AlertCircle size={32} className="text-orange-500 mb-2" />
                          <span className="text-xs font-mono font-bold text-orange-500 uppercase">預約已取消<br/>CANCELLED</span>
                        </>
                      ) : (
                        <>
                          <Clock size={32} className="text-red-500 mb-2" />
                          <span className="text-xs font-mono font-bold text-red-500 uppercase">條碼已失效/過期<br/>EXPIRED</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <div className="text-sm font-mono font-bold text-white uppercase">{userProfile?.plate || registration?.plateNumber}</div>
                  <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">本活動專屬 QR Code</div>
                </div>
              </div>
            )}

            {/* Admin: Participants List */}
            {isSubAdmin && allRegistrations.length > 0 && (
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyber-green uppercase tracking-widest">
                    報名名單 PARTICIPANTS
                  </div>
                  <div className="text-[10px] font-mono text-white/30 uppercase">
                    {allRegistrations.length} 位用戶
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {allRegistrations.map((reg) => {
                    const profile = allProfiles.find(p => p.id === reg.userId);
                    const isRegCancelled = reg.status === 'cancelled';
                    return (
                      <div key={reg.id} className={`flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 group/item ${isRegCancelled ? 'opacity-40 grayscale' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyber-green/10 flex items-center justify-center border border-cyber-green/30 text-cyber-green font-mono text-xs overflow-hidden">
                            {profile?.photoURL ? (
                              <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              profile?.displayName?.[0] || '?'
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-mono font-bold text-white uppercase group-hover/item:text-cyber-green transition-colors">
                              {profile?.displayName || '未知用戶'}
                              {isRegCancelled && <span className="ml-2 text-[8px] text-red-500 border border-red-500/30 px-1 rounded">已取消</span>}
                            </div>
                            <div className="text-[9px] font-mono text-white/30 uppercase">
                              PLATE: {reg.plateNumber}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isRegCancelled && onAdminRestore && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdminRestore(reg.userId);
                              }}
                              disabled={isActionLoading}
                              className="px-2 py-1 bg-cyber-green/10 border border-cyber-green/30 text-[9px] font-mono text-cyber-green rounded hover:bg-cyber-green hover:text-black transition-all"
                            >
                              手動加回
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDeleting) return;
                              setDeletingReg({ regId: reg.id, userId: reg.userId });
                            }}
                            disabled={isDeleting}
                            className={`p-2 transition-colors opacity-0 group-hover/item:opacity-100 ${
                              isDeleting ? 'text-white/10' : 'text-white/20 hover:text-red-500'
                            }`}
                          >
                            <Trash2 size={14} className={isDeleting ? 'animate-pulse' : ''} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-4">
              {isRegistered ? (
                <div className="w-full flex flex-col gap-3">
                  <div className={`py-4 rounded-xl border-2 flex items-center justify-center gap-3 text-sm font-mono font-black uppercase transition-all ${
                    qrStatus === 'used' ? 'bg-cyber-green/20 border-cyber-green text-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.2)]' :
                    qrStatus === 'expired' ? 'bg-red-500/10 border-red-500/50 text-red-500/50' :
                    'bg-white/5 border-white/10 text-white/40'
                  }`}>
                    {qrStatus === 'used' ? <><CheckCircle2 size={18} /> 簽到成功 SUCCESSFUL</> : 
                     qrStatus === 'expired' ? <><AlertCircle size={18} /> 簽到已截止 EXPIRED</> : 
                     '請在活動現場展示 QR CODE'}
                  </div>
                  
                  {qrStatus !== 'used' && qrStatus !== 'expired' && (
                    <button 
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-3 bg-red-500/5 border border-red-500/20 text-red-500/50 text-[10px] font-mono font-bold uppercase tracking-widest rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                    >
                      取消報名 CANCEL REGISTRATION
                    </button>
                  )}

                  <p className="text-[10px] font-mono text-white/20 text-center italic">
                    管理員將會掃描此 QR Code 進行簽到
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {!userProfile?.plate && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                      <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-orange-200/70 font-sans leading-tight">
                        報名前請確保已在個人資料中填寫車牌號碼。
                      </p>
                    </div>
                  )}

                  {isLockedOut && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-pulse">
                      <Clock size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[11px] text-red-400 font-mono font-bold leading-tight uppercase">
                          ⏳ 系統鎖定中 LOCKOUT ACTIVE
                        </p>
                        <p className="text-[9px] text-red-400/60 font-mono leading-tight">
                          您已取消過本活動，需等待至 {format(lockoutUntil!, 'yyyy-MM-dd HH:mm')} ({formatDistanceToNow(lockoutUntil!, { locale: zhTW, addSuffix: true })}) 後才可重新報名，或請聯絡管理員。
                        </p>
                      </div>
                    </div>
                  )}

                  <CyberButton 
                    className="w-full py-5 text-sm"
                    disabled={activity.status === 'closed' || isFull || isRegistrationClosed || !userProfile?.plate || isLockedOut || isActionLoading || isEventEnded}
                    onClick={() => setShowJoinConfirm(true)}
                  >
                    {isEventEnded ? '本活動已結束 / ENDED' : isRegistrationClosed ? '報名已截止 / CLOSED' : isLockedOut ? '鎖定中 LOCKOUT' : activity.status === 'closed' ? '報名已截止' : isFull ? '名額已滿 FULL' : '立即報名 / JOIN NOW'}
                  </CyberButton>
                </div>
              )}
            </div>
          </div>
        </CyberCard>
      </motion.div>

      {/* Cancellation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        title="取消報名 / CANCEL"
        message="🛑 警告：取消後專屬 QR Code 將立即失效，且您需要等待 24 小時後才可以再次自行報名本活動。確認取消？"
        variant="danger"
        confirmText="確認取消"
        onConfirm={handleCancelRegistration}
        onCancel={() => setShowCancelModal(false)}
      >
        <div className="mt-4 space-y-2">
          <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest ml-1">取消原因 (必填) REASON</label>
          <textarea
            required
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="請輸入取消原因..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all min-h-[80px] resize-none font-sans"
          />
        </div>
      </ConfirmationModal>

      {/* Join Confirmation with Warning */}
      <ConfirmationModal
        isOpen={showJoinConfirm}
        title="確認報名 / CONFIRMATION"
        message=""
        confirmText="確認報名"
        onConfirm={handleRegister}
        onCancel={() => setShowJoinConfirm(false)}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-cyber-green/[0.03] border border-cyber-green/20">
             <p className="text-sm text-cyber-green font-bold leading-relaxed mb-2 font-sans italic">
               ⚠️ 請仔細考慮才報名：
             </p>
             <p className="text-xs text-white/70 leading-relaxed font-sans">
               報名成功後如取消，您的專屬 QR Code 將即時失效，且系統會鎖定帳戶，<span className="text-cyber-green font-bold">24 小時內無法再次自行報名本活動</span>。
             </p>
          </div>
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={!!deletingReg}
        title="刪除報名資料 / DELETE"
        message="確定要刪除此用戶的報名資料嗎？系統將自動通知該用戶此項變動。\nDELETE REGISTRATION?"
        variant="danger"
        confirmText={isDeleting ? '處理中...' : '確定刪除'}
        onConfirm={async () => {
          if (deletingReg && onDeleteRegistration && !isDeleting) {
            setIsDeleting(true);
            try {
              await onDeleteRegistration(deletingReg.regId, deletingReg.userId, activity.id);
              setDeletingReg(null);
            } catch (error) {
              console.error('Delete failed:', error);
            } finally {
              setIsDeleting(false);
            }
          }
        }}
        onCancel={() => !isDeleting && setDeletingReg(null)}
      />
    </div>
  );
};
