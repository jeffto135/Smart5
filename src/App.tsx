import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout, handleRedirectResult } from './lib/firebase';
import { useEVStore } from './store/useEVStore';
import { Dashboard } from './components/Dashboard';
import { LogEntryForm } from './components/LogEntryForm';
import { SettingsPage } from './components/Settings';
import { LogsHistory } from './components/LogsHistory';
import { LogEditModal } from './components/LogEditModal';
import { AdminPanel } from './components/AdminPanel';
import { ActivityList } from './components/ActivityList';
import { PollList } from './components/PollList';
import { MessageList } from './components/MessageList';
import { UserProfileGate } from './components/UserProfileGate';
import { NotificationInit } from './components/NotificationInit';
import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { UserAgreementModal } from './components/UserAgreementModal';
import { CyberButton } from './components/ui/CyberButton';
import { CyberCard } from './components/ui/CyberCard';
import { Plus, User as UserIcon, Car, ChevronDown, Home, FileText, MessageSquare, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [view, setView] = useState<'dashboard' | 'entry' | 'settings' | 'history' | 'admin' | 'messages' | 'activityList' | 'pollList'>('dashboard');
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const evStore = useEVStore();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info'
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result?.user) {
          console.log('Redirect result successful:', result.user.email);
        }
      } catch (error: any) {
        console.error('Redirect login error:', error);
        if (error.code === 'auth/unauthorized-domain') {
          const domain = window.location.hostname;
          alert(`登錄失敗：未授權的網域。\n\n請在 Firebase 控制台將「${domain}」加入「授權網域」列表。\n\n路徑：Firebase Console > Authentication > Settings > Authorized domains`);
        } else if (error.code === 'auth/network-request-failed') {
          alert('登錄失敗：網絡請求失敗。請檢查網絡連接或 Firebase 設定。');
        } else {
          alert('登錄發生錯誤: ' + (error.message || '未知錯誤'));
        }
      }
    };
    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log('Auth state changed:', u ? `Logged in as ${u.email}` : 'Logged out');
      setUser(u);
      setIsInitializing(false);
      if (!u) {
        setView('dashboard');
        setEditingLog(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAccountDeletion = async () => {
    try {
      await evStore.deleteAccount();
      // On success, reset UI state
      setUser(null);
      setView('dashboard');
      window.location.reload(); // Refresh to clean everything
    } catch (error: any) {
      alert('刪除失敗: ' + error.message);
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        alert(`登錄失敗：未授權的網域。\n\n請在 Firebase 控制台將「${domain}」加入「授權網域」列表。\n\n路徑：Firebase Console > Authentication > Settings > Authorized domains`);
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login popup closed by user');
      } else {
        alert('登錄發生錯誤: ' + (error.message || '未知錯誤'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isActuallyInitializing = isInitializing || (user && evStore.profileLoading);

  if (isActuallyInitializing) {
    return (
      <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 bg-cyber-green/5 border border-cyber-green/20 rounded-2xl flex items-center justify-center animate-pulse">
            <Car size={40} className="text-cyber-green/40" />
          </div>
          <div className="absolute inset-0 border-2 border-cyber-green/30 rounded-2xl animate-ping opacity-20" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-mono font-bold tracking-widest text-cyber-green cyber-text-glow">INITIALIZING</h1>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3].map(i => (
              <motion.div 
                key={i}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-cyber-green shadow-[0_0_8px_#CCFF00]" 
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateLog = async (logId: string, newData: any) => {
    const logIndex = evStore.logs.findIndex((l) => l.id === logId);
    if (logIndex === -1) return;

    const currentLog = evStore.logs[logIndex];
    const prevLog = evStore.logs[logIndex + 1]; // logs are desc by timestamp, so i+1 is older
    const nextLog = evStore.logs[logIndex - 1]; // i-1 is newer

    let distance = currentLog.distance;
    let batteryDiff = currentLog.batteryDiff;

    // Recalculate current log's relative values
    if (newData.odometer !== undefined && prevLog) {
      distance = newData.odometer - prevLog.odometer;
    }
    if (newData.batteryPercent !== undefined && prevLog) {
      batteryDiff = prevLog.batteryPercent - newData.batteryPercent;
    }

    try {
      // Save current log update
      await evStore.updateLog(logId, { ...newData, distance, batteryDiff });

      // If there's a newer log, update its relative values based on our new data
      if (nextLog && newData.timestamp === undefined) { 
        const nextDistance = nextLog.odometer - (newData.odometer ?? currentLog.odometer);
        const nextBatteryDiff = (newData.batteryPercent ?? currentLog.batteryPercent) - nextLog.batteryPercent;
        await evStore.updateLog(nextLog.id, { distance: nextDistance, batteryDiff: nextBatteryDiff });
      }

      // If this was the absolute latest log, update the vehicle's last recorded state
      if (logIndex === 0 && evStore.vehicle) {
        await evStore.updateVehicle(evStore.vehicle.id, {
          lastOdometer: newData.odometer ?? currentLog.odometer,
          lastBatteryPercent: newData.batteryPercent ?? currentLog.batteryPercent,
        });
      }
    } catch (error) {
      console.error('Update consistent log error:', error);
      throw error;
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const logIndex = evStore.logs.findIndex((l) => l.id === logId);
    if (logIndex === -1) return;

    const nextLog = evStore.logs[logIndex - 1];
    const prevLog = evStore.logs[logIndex + 1];

    try {
      await evStore.deleteLog(logId);

      // If we deleted a log in the middle, the next log's distance needs to be recalculated
      if (nextLog && prevLog) {
        const nextDistance = nextLog.odometer - prevLog.odometer;
        const nextBatteryDiff = prevLog.batteryPercent - nextLog.batteryPercent;
        await evStore.updateLog(nextLog.id, { distance: nextDistance, batteryDiff: nextBatteryDiff });
      } else if (nextLog && !prevLog) {
        // Deleted the very first log
        await evStore.updateLog(nextLog.id, { distance: 0, batteryDiff: 0 });
      }

      // If we deleted the latest log, update vehicle state to the previous one
      if (logIndex === 0 && evStore.vehicle) {
        await evStore.updateVehicle(evStore.vehicle.id, {
          lastOdometer: prevLog?.odometer || 0,
          lastBatteryPercent: prevLog?.batteryPercent || 100,
        });
      }
    } catch (error) {
      console.error('Delete log error:', error);
      throw error;
    }
  };

  const handleLogoutAttempt = () => {
    setConfirmModal({
      isOpen: true,
      title: '系統登出',
      message: '確定要登出並結束目前工作階段嗎？',
      variant: 'danger',
      onConfirm: () => {
        logout();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 bg-cyber-green/5 border border-cyber-green/20 rounded-2xl flex items-center justify-center animate-pulse">
            <Car size={40} className="text-cyber-green/40" />
          </div>
          <div className="absolute inset-0 border-2 border-cyber-green/30 rounded-2xl animate-ping opacity-20" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-mono font-bold tracking-widest text-cyber-green cyber-text-glow">INITIALIZING</h1>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3].map(i => (
              <motion.div 
                key={i}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-cyber-green shadow-[0_0_8px_#CCFF00]" 
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-12">
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 mx-auto bg-cyber-green/10 rounded-3xl flex items-center justify-center border border-cyber-green/30 cyber-glow"
          >
            <Car size={48} className="text-cyber-green" />
          </motion.div>
          <h1 className="text-5xl font-mono font-black italic uppercase tracking-tighter cyber-text-glow">
            Smart5 Owners<span className="text-cyber-green">.</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] opacity-40 tech-font">智能電動車記錄系統</p>
        </div>

        <CyberCard className="w-full max-w-sm border-cyber-line/50 shadow-2xl">
          <div className="space-y-8">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50 leading-relaxed font-light">
              透過極簡的手動輸入，量化電動車帶來的<br />
              <span className="text-cyber-green cyber-text-glow font-bold">「省錢感」</span>與<span className="text-cyber-green cyber-text-glow font-bold">「成就感」</span>
            </div>
            <CyberButton 
              onClick={handleLogin} 
              className="w-full py-4 tracking-[0.3em]"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? '正在登錄...' : '開始同步我的數據'}
            </CyberButton>

            <p className="text-[10px] text-white/30 leading-relaxed max-w-[280px] mx-auto text-center">
              點擊『開始同步我的數據』即表示您已同意
              <button 
                onClick={() => setShowUserAgreement(true)}
                className="text-cyber-green hover:underline mx-0.5 transition-all"
              >
                [用戶協議]
              </button>
              與 
              <button 
                onClick={() => setShowDisclaimer(true)}
                className="text-cyber-green hover:underline mx-0.5 transition-all"
              >
                [版權及免責聲明]
              </button>。
            </p>
          </div>
        </CyberCard>
        
        <footer className="mt-8 text-center space-y-2">
          <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
            Powered by <a href="https://effortless.com.hk/" target="_blank" rel="noopener noreferrer" className="hover:text-cyber-green transition-colors decoration-cyber-green/30 underline-offset-2 underline">Effortless Production Limited</a>
          </p>
          <button 
            onClick={() => setShowDisclaimer(true)}
            className="block w-full text-[9px] text-white/10 font-mono tracking-widest uppercase hover:text-white/30 transition-colors"
          >
            Copyright © 2026 Effortless Production Limited. All Rights Reserved.
          </button>
        </footer>
      </div>
    );
  }

  if ((evStore.isAdmin || evStore.isSubAdmin) && view === 'admin') {
    return (
      <AdminPanel 
        fleetData={evStore.fleetData}
        parkingLots={evStore.parkingLots}
        allProfiles={evStore.allProfiles}
        isAdmin={evStore.isAdmin}
        isSubAdmin={evStore.isSubAdmin}
        onUpdateLog={handleUpdateLog}
        onDeleteLog={handleDeleteLog}
        onAddActivity={evStore.addActivity}
        onUpdateActivity={evStore.updateActivity}
        onDeleteActivity={evStore.deleteActivity}
        onAddPoll={evStore.addPoll}
        onUpdatePoll={evStore.updatePoll}
        onDeletePoll={evStore.deletePoll}
        onUpdateMemberRole={evStore.updateMemberRole}
        onDeleteMember={evStore.deleteMember}
        onClearActivities={evStore.clearAllActivities}
        onClearPolls={evStore.clearAllPolls}
        onUpdateRegistration={evStore.updateRegistration}
        onAdminRestoreRegistration={evStore.adminRestoreRegistration}
        onAddParkingLot={evStore.addParkingLot}
        onUpdateParkingLot={evStore.updateParkingLot}
        onDeleteParkingLot={evStore.deleteParkingLot}
        userProfile={evStore.userProfile}
        onUpdateProfile={evStore.updateUserProfile}
        onDeleteVehicle={evStore.deleteVehicle}
        onAddNotification={evStore.addNotification}
        onClearSystemNotifications={evStore.clearAllSystemNotifications}
        onClose={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className={`min-h-screen ${view === 'admin' ? '' : 'max-w-md mx-auto'} bg-cyber-bg relative overflow-hidden flex flex-col`}>
      <UserProfileGate 
        user={user} 
        userProfile={evStore.userProfile} 
        profileLoading={evStore.profileLoading}
        onUpdateProfile={evStore.updateUserProfile}
      >
        <NotificationInit />
        {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyber-green/10 blur-[100px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyber-green/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="p-8 flex justify-between items-center relative">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 cyber-border flex items-center justify-center rounded-lg bg-cyber-green/5 overflow-hidden p-1">
            <img 
              src="https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png" 
              alt="Smart5 Club Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0 relative">
            <button 
              onClick={() => evStore.vehicles.length > 0 && setShowVehicleSelector(!showVehicleSelector)}
              className={`flex items-center gap-2 text-left transition-opacity ${evStore.vehicles.length > 0 ? 'hover:opacity-70' : 'cursor-default'}`}
            >
              <h1 className="text-xl font-bold tracking-tighter cyber-text-glow leading-none truncate">
                {evStore.vehicle?.name || (evStore.loading ? '正在載入...' : '請新增車輛')}<span className="text-cyber-green">.</span>
              </h1>
              {evStore.vehicles.length > 0 && (
                <ChevronDown size={14} className={`text-cyber-green transition-transform duration-300 ${showVehicleSelector ? 'rotate-180' : ''}`} />
              )}
            </button>
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 font-mono flex gap-2 items-center">
              <span>{evStore.vehicle?.plate || (evStore.loading ? 'FETCHING' : 'OFFLINE')}</span>
              {evStore.vehicle?.batteryCapacity ? (
                <span className="text-cyber-green/60">[{evStore.vehicle.batteryCapacity}kWh]</span>
              ) : null}
            </p>

            {/* Vehicle Selector Dropdown */}
            <AnimatePresence>
              {showVehicleSelector && (
                <>
                  <div 
                    className="fixed inset-0 z-[-1]" 
                    onClick={() => setShowVehicleSelector(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-10 left-0 w-48 bg-cyber-bg/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl z-50 p-1"
                  >
                    {evStore.vehicles.map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          evStore.setSelectedVehicleId(v.id);
                          setShowVehicleSelector(false);
                        }}
                        className={`w-full px-4 py-3 text-left rounded-lg transition-colors flex flex-col gap-0.5 ${evStore.selectedVehicleId === v.id ? 'bg-cyber-green/10 text-cyber-green' : 'hover:bg-white/5 text-white/70'}`}
                      >
                        <span className="text-xs font-bold font-mono uppercase tracking-wider">{v.name}</span>
                        <span className="text-[8px] opacity-40 font-mono">{v.plate}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-cyber-green text-[10px] font-mono font-bold leading-none">
              <Sun size={12} className="cyber-text-glow" />
              <span>28°C SUNNY</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[14px] font-mono font-black text-white leading-none tracking-tighter">
                {currentTime.toLocaleTimeString('zh-HK', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="w-1 h-3 bg-white/10" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest leading-none">
                {currentTime.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-24 relative overflow-y-auto">
        <AnimatePresence mode="wait">
          {!evStore.vehicle && !evStore.loading && view !== 'settings' ? (
            <motion.div
              key="no-vehicle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center space-y-8 text-center"
            >
              <div className="w-20 h-20 bg-cyber-green/5 border border-cyber-green/20 rounded-2xl flex items-center justify-center">
                <Car size={40} className="text-cyber-green/40" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-mono font-bold uppercase">尚無車輛資訊</h3>
                <p className="text-xs text-white/40 uppercase tracking-widest leading-relaxed">
                  請先在設定中新增您的電動車<br />以開始記錄數據
                </p>
              </div>
              <CyberButton onClick={() => setView('settings')} className="px-8">
                前往設定
              </CyberButton>
            </motion.div>
          ) : view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Dashboard 
                logs={evStore.logs} 
                vehicle={evStore.vehicle}
                activities={evStore.activities}
                polls={evStore.polls}
                onLogClick={setEditingLog}
                onViewAll={() => setView('history')}
                onActivityClick={() => setView('activityList')}
                onPollClick={() => setView('pollList')}
              />
            </motion.div>
          ) : view === 'entry' ? (
            <motion.div
              key="entry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-4"
            >
              <h2 className="text-2xl font-mono font-bold uppercase tracking-tight mb-8">
                下車記錄 <span className="text-cyber-green">Log it</span>
              </h2>
              {evStore.vehicle && (
                <LogEntryForm 
                  vehicle={evStore.vehicle} 
                  logs={evStore.logs}
                  onSave={evStore.addLog} 
                  onCancel={() => setView('dashboard')}
                />
              )}
            </motion.div>
          ) : view === 'activityList' ? (
            <motion.div
              key="activityList"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ActivityList 
                activities={evStore.activities}
                registrations={evStore.fleetData.registrations}
                userProfile={evStore.userProfile}
                allProfiles={evStore.allProfiles}
                isAdmin={evStore.isAdmin}
                isSubAdmin={evStore.isSubAdmin}
                userId={user.uid}
                onRegister={evStore.registerForActivity}
                onCancelRegistration={evStore.cancelActivityRegistration}
                onAdminRestoreRegistration={evStore.adminRestoreRegistration}
                onDeleteRegistration={evStore.deleteRegistration}
                onClose={() => setView('dashboard')}
              />
            </motion.div>
          ) : view === 'pollList' ? (
            <motion.div
              key="pollList"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PollList 
                polls={evStore.polls}
                userId={user.uid}
                onVote={evStore.voteInPoll}
                onClose={() => setView('dashboard')}
              />
            </motion.div>
          ) : view === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <LogsHistory 
                logs={evStore.logs} 
                onLogClick={setEditingLog}
                onClose={() => setView('dashboard')}
              />
            </motion.div>
          ) : view === 'messages' ? (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MessageList 
                notifications={evStore.notifications} 
                onMarkAsRead={evStore.markNotificationAsRead}
                onMarkAllRead={evStore.markAllNotificationsAsRead}
                onDelete={evStore.deleteNotification}
                onDeleteAll={evStore.clearAllNotifications}
                onNavigate={(view, id) => {
                  setView(view as any);
                  // Optionally select the item if needed, but for now just navigate
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <SettingsPage 
                user={user}
                userProfile={evStore.userProfile}
                vehicles={evStore.vehicles}
                parkingLots={evStore.parkingLots}
                onUpdate={evStore.updateVehicle}
                onAdd={evStore.addVehicle}
                onDelete={evStore.deleteVehicle}
                onDeleteAccount={evStore.deleteAccount}
                isAdmin={evStore.isAdmin || evStore.isSubAdmin}
                onOpenAdmin={() => setView('admin')}
                onLogout={handleLogoutAttempt}
                onClose={() => setView('dashboard')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-12 mb-4 text-center space-y-2">
          <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
            Powered by <a href="https://effortless.com.hk/" target="_blank" rel="noopener noreferrer" className="hover:text-cyber-green transition-colors decoration-cyber-green/30 underline-offset-2 underline">Effortless Production Limited</a>
          </p>
          <button 
            onClick={() => setShowDisclaimer(true)}
            className="block w-full text-[9px] text-white/10 font-mono tracking-widest uppercase hover:text-white/30 transition-colors"
          >
            Copyright © 2026 Effortless Production Limited. All Rights Reserved.
          </button>
        </footer>
      </main>

      <AnimatePresence>
        {editingLog && (
          <LogEditModal 
            log={editingLog}
            onSave={(data) => handleUpdateLog(editingLog.id, data)}
            onDelete={() => handleDeleteLog(editingLog.id)}
            onClose={() => setEditingLog(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <DisclaimerModal 
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
      />

      <UserAgreementModal 
        isOpen={showUserAgreement}
        onClose={() => setShowUserAgreement(false)}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-cyber-bg via-cyber-bg/90 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-center bg-black/60 backdrop-blur-2xl border border-white/10 px-2 py-3 rounded-2xl pointer-events-auto shadow-[0_-15px_35px_rgba(0,0,0,0.6)]">
          
          {/* Left Side: Home & History */}
          <div className="flex flex-1 justify-around items-center">
            {[
              { id: 'dashboard', label: '主頁', icon: Home },
              { id: 'history', label: '記錄', icon: FileText },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  view === item.id ? 'text-cyber-green scale-110' : 'text-white/30 hover:text-white/50'
                }`}
              >
                <item.icon size={20} className={view === item.id ? 'cyber-text-glow' : ''} />
                <span className="text-[8px] font-mono font-bold uppercase tracking-[0.2em]">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Center: Add Button */}
          <div className="flex-none px-2 -mt-8">
            <button
              onClick={() => setView('entry')}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] border-2 ${
                view === 'entry' 
                  ? 'bg-cyber-green text-black border-cyber-green scale-110' 
                  : 'bg-cyber-bg-alt border-white/10 text-cyber-green hover:border-cyber-green/50'
              }`}
            >
              <Plus size={32} strokeWidth={2.5} />
            </button>
          </div>

          {/* Right Side: Messages & Settings */}
          <div className="flex flex-1 justify-around items-center">
            {[
              { id: 'messages', label: '訊息', icon: MessageSquare },
              { id: 'settings', label: '更多', icon: UserIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`relative flex flex-col items-center gap-1 transition-all ${
                  view === item.id ? 'text-cyber-green scale-110' : 'text-white/30 hover:text-white/50'
                }`}
              >
                <item.icon size={20} className={view === item.id ? 'cyber-text-glow' : ''} />
                <span className="text-[8px] font-mono font-bold uppercase tracking-[0.2em]">{item.label}</span>
                {item.id === 'messages' && evStore.notifications.some(n => !(n.readBy || []).includes(user.uid)) && (
                  <div className="absolute top-0 right-1 w-2 h-2 bg-cyber-green rounded-full shadow-[0_0_8px_#CCFF00]" />
                )}
              </button>
            ))}
          </div>
          
        </div>
      </div>
      </UserProfileGate>
    </div>
  );
}
