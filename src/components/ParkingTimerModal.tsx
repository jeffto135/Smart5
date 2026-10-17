import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Play, Square, X, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ActiveTimerState {
  isActive: boolean;
  type: 'parking' | 'charging';
  mode: 'countdown' | 'stopwatch';
  startTime: number;
  durationMinutes: number;
  location: string;
  notes: string;
}

const TIMER_STORAGE_KEY = 'ev_parking_timer_state';

export const getStoredTimer = (): ActiveTimerState | null => {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.isActive ? parsed : null;
  } catch (e) {
    return null;
  }
};

export const clearStoredTimer = () => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (e) {}
};

interface ParkingTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettle: (details: {
    type: 'parking' | 'charging';
    durationMinutes: number;
    durationText: string;
    location: string;
    notes: string;
  }) => void;
}

export const ParkingTimerModal: React.FC<ParkingTimerModalProps> = ({
  isOpen,
  onClose,
  onSettle
}) => {
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Form states when configuring new timer
  const [timerType, setTimerType] = useState<'parking' | 'charging'>('parking');
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [countdownMinutes, setCountdownMinutes] = useState<number>(120);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Settlement confirm dialog inside modal
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  // Sync with storage on mount and when modal opens
  useEffect(() => {
    const stored = getStoredTimer();
    if (stored) {
      setActiveTimer(stored);
      setTimerType(stored.type);
      setTimerMode(stored.mode);
      setLocation(stored.location || '');
      setNotes(stored.notes || '');
    }
  }, [isOpen]);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // Calculate elapsed & remaining
  const elapsedSeconds = activeTimer 
    ? Math.max(0, Math.floor((now - activeTimer.startTime) / 1000))
    : 0;
  
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  const formatHoursMinsSecs = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDurationHuman = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h} 小時 ${m > 0 ? `${m} 分鐘` : ''}`;
    }
    return `${m} 分鐘`;
  };

  // Countdown specific metrics
  const targetSeconds = activeTimer && activeTimer.mode === 'countdown'
    ? activeTimer.durationMinutes * 60
    : 0;

  const remainingSeconds = targetSeconds - elapsedSeconds;
  const isOverdue = activeTimer?.mode === 'countdown' && remainingSeconds < 0;

  const countdownProgress = targetSeconds > 0 
    ? Math.min(100, Math.max(0, (elapsedSeconds / targetSeconds) * 100))
    : 0;

  // Start timer
  const handleStartTimer = () => {
    const duration = customMinutes && Number(customMinutes) > 0 
      ? Number(customMinutes) 
      : countdownMinutes;

    const newTimer: ActiveTimerState = {
      isActive: true,
      type: timerType,
      mode: timerMode,
      startTime: Date.now(),
      durationMinutes: duration,
      location: location.trim(),
      notes: notes.trim()
    };

    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newTimer));
    setActiveTimer(newTimer);
  };

  // Stop and prompt settle
  const handleTriggerSettle = () => {
    setShowSettleConfirm(true);
  };

  const handleConfirmSettle = (proceedWithRecord: boolean) => {
    if (!activeTimer) return;
    const finalMins = Math.max(1, elapsedMinutes);
    const durationText = formatDurationHuman(finalMins);
    const currentTimer = { ...activeTimer };
    
    // Clear storage
    clearStoredTimer();
    setActiveTimer(null);
    setShowSettleConfirm(false);

    if (proceedWithRecord) {
      onSettle({
        type: currentTimer.type,
        durationMinutes: finalMins,
        durationText,
        location: currentTimer.location,
        notes: currentTimer.notes 
          ? `${currentTimer.type === 'parking' ? '停車' : '充電'}時長: ${durationText} · ${currentTimer.notes}`
          : `${currentTimer.type === 'parking' ? '停車' : '充電'}時長: ${durationText}`
      });
    } else {
      onClose();
    }
  };

  const handleCancelTimer = () => {
    if (confirm('確定要終止並清除目前計時嗎？（將不建立開支記錄）')) {
      clearStoredTimer();
      setActiveTimer(null);
      setShowSettleConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-md bg-zinc-950 border border-cyber-green/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(204,255,0,0.15)] overflow-hidden"
      >
        {/* Glow ambient */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyber-green/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyber-green/15 border border-cyber-green/30 flex items-center justify-center text-cyber-green">
              <Clock size={20} className="cyber-text-glow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide font-mono">
                {activeTimer ? (activeTimer.type === 'parking' ? '🅿️ 停車計時中' : '⚡ 充電計時中') : '🅿️ 停車 / ⚡ 充電計時器'}
              </h3>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                PARKING & CHARGING SMART TIMER
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {activeTimer ? (
          /* RUNNING TIMER VIEW */
          <div className="py-6 space-y-6">
            {/* Center Glowing Timer Display */}
            <div className={`relative p-6 rounded-2xl border text-center transition-all ${
              isOverdue 
                ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
                : 'bg-black/60 border-cyber-green/40 shadow-[0_0_30px_rgba(204,255,0,0.15)]'
            }`}>
              <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyber-green animate-ping" />
                {activeTimer.mode === 'countdown' ? '倒數剩餘時間 / REMAINING' : '已停泊 / 碼表累計時間'}
              </div>

              {/* Big Digits */}
              <div className={`text-5xl font-mono font-black tracking-tight my-2 ${
                isOverdue ? 'text-red-400' : 'text-cyber-green'
              }`}>
                {activeTimer.mode === 'countdown'
                  ? (isOverdue 
                      ? `+${formatHoursMinsSecs(Math.abs(remainingSeconds))}` 
                      : formatHoursMinsSecs(Math.max(0, remainingSeconds)))
                  : formatHoursMinsSecs(elapsedSeconds)}
              </div>

              {/* Status subline */}
              <div className="text-xs font-mono text-white/60">
                {activeTimer.mode === 'countdown' ? (
                  isOverdue ? (
                    <span className="text-red-400 font-bold flex items-center justify-center gap-1">
                      <AlertCircle size={14} /> 已超時 {formatDurationHuman(Math.floor(Math.abs(remainingSeconds) / 60))}！
                    </span>
                  ) : (
                    <span>目標時限：{formatDurationHuman(activeTimer.durationMinutes)} (已停泊 {formatDurationHuman(elapsedMinutes)})</span>
                  )
                ) : (
                  <span>已累計計時 {formatDurationHuman(elapsedMinutes)}</span>
                )}
              </div>

              {/* Progress bar for countdown */}
              {activeTimer.mode === 'countdown' && (
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${isOverdue ? 'bg-red-500' : 'bg-cyber-green shadow-[0_0_10px_#CCFF00]'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, countdownProgress)}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
              )}
            </div>

            {/* Context Info (Location & Notes) */}
            {(activeTimer.location || activeTimer.notes) && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs font-mono">
                {activeTimer.location && (
                  <div className="flex items-center gap-2 text-white/80">
                    <span className="text-cyber-green font-bold">📍 地點:</span>
                    <span className="truncate">{activeTimer.location}</span>
                  </div>
                )}
                {activeTimer.notes && (
                  <div className="flex items-center gap-2 text-white/60 text-[11px]">
                    <span className="text-white/40">📝 備忘:</span>
                    <span className="truncate">{activeTimer.notes}</span>
                  </div>
                )}
              </div>
            )}

            {/* Settle Confirm Popover */}
            <AnimatePresence>
              {showSettleConfirm ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-4 rounded-2xl bg-cyber-green/10 border-2 border-cyber-green space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={18} className="text-cyber-green shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-white text-sm">
                        {activeTimer.type === 'parking' ? '🅿️ 停車結束結算' : '⚡ 充電結束結算'}
                      </p>
                      <p className="text-white/70 mt-1 leading-relaxed">
                        已{activeTimer.type === 'parking' ? '停泊' : '充電'} <span className="text-cyber-green font-bold font-mono text-sm">{formatDurationHuman(Math.max(1, elapsedMinutes))}</span>。
                        是否直接記錄此筆開支費用？
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleConfirmSettle(true)}
                      className="py-2.5 px-3 rounded-xl bg-cyber-green text-black font-mono font-bold text-xs uppercase hover:bg-cyber-green/80 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(204,255,0,0.3)] cursor-pointer"
                    >
                      <CheckCircle2 size={16} />
                      直接記錄開支
                    </button>
                    <button
                      onClick={() => handleConfirmSettle(false)}
                      className="py-2.5 px-3 rounded-xl bg-white/10 text-white font-mono text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
                    >
                      僅結束計時
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Primary Buttons */
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={handleTriggerSettle}
                    className="w-full py-3.5 px-4 rounded-2xl bg-cyber-green text-black font-mono font-bold text-sm uppercase hover:bg-cyber-green/80 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Square size={16} fill="black" />
                    結束計時並結算 (STOP & SETTLE)
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-mono text-xs uppercase hover:bg-white/10 transition-colors cursor-pointer text-center"
                    >
                      縮小在背景計時
                    </button>
                    <button
                      onClick={handleCancelTimer}
                      className="py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs uppercase hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      放棄計時
                    </button>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* CONFIGURATION VIEW (NEW TIMER) */
          <div className="py-4 space-y-4">
            {/* Target Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-cyber-green/70 tracking-widest">
                計時目的 / PURPOSE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTimerType('parking')}
                  className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    timerType === 'parking'
                      ? 'bg-cyber-green/20 border-cyber-green text-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.15)]'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  🅿️ 停車計時 (免泊/計時)
                </button>
                <button
                  type="button"
                  onClick={() => setTimerType('charging')}
                  className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    timerType === 'charging'
                      ? 'bg-cyber-green/20 border-cyber-green text-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.15)]'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  ⚡ 充電計時 (預估充滿)
                </button>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-cyber-green/70 tracking-widest">
                計時模式 / MODE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTimerMode('countdown')}
                  className={`py-2 px-3 rounded-xl font-mono text-xs transition-all cursor-pointer border ${
                    timerMode === 'countdown'
                      ? 'bg-white/15 border-white/30 text-white font-bold'
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  ⏳ 倒數時限 (免泊/目標)
                </button>
                <button
                  type="button"
                  onClick={() => setTimerMode('stopwatch')}
                  className={`py-2 px-3 rounded-xl font-mono text-xs transition-all cursor-pointer border ${
                    timerMode === 'stopwatch'
                      ? 'bg-white/15 border-white/30 text-white font-bold'
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  ⏱️ 碼表計時 (正計時)
                </button>
              </div>
            </div>

            {/* Countdown Duration Options */}
            {timerMode === 'countdown' && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-cyber-green/70 tracking-widest">
                  設定倒數時長 / DURATION
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '30 分鐘', mins: 30 },
                    { label: '45 分鐘', mins: 45 },
                    { label: '1 小時', mins: 60 },
                    { label: '1.5 小時', mins: 90 },
                    { label: '2 小時', mins: 120 },
                    { label: '2.5 小時', mins: 150 },
                    { label: '3 小時', mins: 180 },
                    { label: '4 小時', mins: 240 }
                  ].map(preset => (
                    <button
                      key={preset.mins}
                      type="button"
                      onClick={() => {
                        setCountdownMinutes(preset.mins);
                        setCustomMinutes('');
                      }}
                      className={`py-2 px-1 rounded-xl text-[11px] font-mono transition-all border ${
                        countdownMinutes === preset.mins && !customMinutes
                          ? 'bg-cyber-green text-black font-bold border-cyber-green shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-mono text-white/40 uppercase shrink-0">自訂分鐘:</span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    placeholder="例如: 75"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyber-green"
                  />
                  <span className="text-xs font-mono text-white/40">min</span>
                </div>
              </div>
            )}

            {/* Location Input with quick chips */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-cyber-green/70 tracking-widest">
                地點 / 商場 / 充電站名稱
              </label>
              <input
                type="text"
                placeholder={timerType === 'parking' ? '例如: 又一城商場停車場' : '例如: 中電 50kW 快充'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyber-green"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(timerType === 'parking' 
                  ? ['又一城', '海港城', '朗豪坊', '太古廣場', 'APM', '圍方']
                  : ['中電快充', '港燈充電', 'Shell Recharge', 'Evoasis', 'Cornerstone', 'Tesla 超充']
                ).map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setLocation(chip)}
                    className="text-[10px] font-mono text-white/50 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    +{chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Memo / Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-cyber-green/70 tracking-widest">
                備忘 / 優惠條件 (選填)
              </label>
              <input
                type="text"
                placeholder="例如: 免泊消費滿 $500 / 車位 B2-48"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyber-green"
              />
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartTimer}
                className="w-full py-3.5 px-4 rounded-2xl bg-cyber-green text-black font-mono font-bold text-sm uppercase hover:bg-cyber-green/80 transition-all shadow-[0_0_25px_rgba(204,255,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={16} fill="black" />
                開始計時 (START TIMER)
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
