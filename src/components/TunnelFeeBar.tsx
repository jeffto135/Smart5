import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, Zap } from 'lucide-react';

interface TunnelFeeBarProps {
  onOpenTunnelDashboard?: () => void;
  className?: string;
}

interface TunnelStatus {
  whc: number;
  cht: number;
  ehc: number;
  periodLabel: string;
  isPeak: boolean;
  isOffPeak: boolean;
  isNormal: boolean;
  isTransition: boolean;
  countdownText: string;
  isHoliday: boolean;
}

// 實時計算香港三隧收費與下個時段倒數 (私家車分時段收費)
export function getTunnelRealtimeInfo(now: Date = new Date()): TunnelStatus {
  // 香港時間 (UTC+8)
  const hkDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" });
  const hkDate = new Date(hkDateStr);

  const dayOfWeek = hkDate.getDay(); // 0: Sun, 1-6: Mon-Sat
  const isSunday = dayOfWeek === 0;

  const hours = hkDate.getHours();
  const minutes = hkDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const formatCountdown = (diffMins: number, targetName: string) => {
    if (diffMins <= 0) return `即將進入${targetName}`;
    if (diffMins < 60) return `距${targetName}尚餘 ${diffMins} 分鐘`;
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return m > 0 ? `距${targetName}尚餘 ${h} 小時 ${m} 分鐘` : `距${targetName}尚餘 ${h} 小時`;
  };

  // 1. 星期日及公眾假期
  if (isSunday) {
    if (timeInMinutes < 611) {
      // 00:00 - 10:11 -> $20
      return {
        whc: 20,
        cht: 20,
        ehc: 20,
        periodLabel: '假日非繁忙',
        isPeak: false,
        isOffPeak: true,
        isNormal: false,
        isTransition: false,
        countdownText: formatCountdown(611 - timeInMinutes, '日間一般時段($25)'),
        isHoliday: true
      };
    } else if (timeInMinutes < 615) {
      // 10:11 - 10:15 -> 過渡
      const step = Math.floor((timeInMinutes - 611) / 2);
      const toll = Math.min(25, 20 + (step + 1) * 2);
      return {
        whc: toll,
        cht: toll,
        ehc: toll,
        periodLabel: '過渡中',
        isPeak: false,
        isOffPeak: false,
        isNormal: false,
        isTransition: true,
        countdownText: formatCountdown(615 - timeInMinutes, '一般時段($25)'),
        isHoliday: true
      };
    } else if (timeInMinutes < 1155) {
      // 10:15 - 19:15 -> $25
      return {
        whc: 25,
        cht: 25,
        ehc: 25,
        periodLabel: '假日一般時段',
        isPeak: false,
        isOffPeak: false,
        isNormal: true,
        isTransition: false,
        countdownText: formatCountdown(1155 - timeInMinutes, '非繁忙時段減價'),
        isHoliday: true
      };
    } else if (timeInMinutes < 1159) {
      // 19:15 - 19:19 -> 過渡
      const step = Math.floor((timeInMinutes - 1155) / 2);
      const toll = Math.max(20, 25 - (step + 1) * 2);
      return {
        whc: toll,
        cht: toll,
        ehc: toll,
        periodLabel: '減價過渡中',
        isPeak: false,
        isOffPeak: false,
        isNormal: false,
        isTransition: true,
        countdownText: formatCountdown(1159 - timeInMinutes, '非繁忙時段($20)'),
        isHoliday: true
      };
    } else {
      // 19:19 - 24:00 -> $20
      return {
        whc: 20,
        cht: 20,
        ehc: 20,
        periodLabel: '夜間非繁忙',
        isPeak: false,
        isOffPeak: true,
        isNormal: false,
        isTransition: false,
        countdownText: '假日夜間非繁忙 (全線 $20)',
        isHoliday: true
      };
    }
  }

  // 2. 星期一至六 (平日)
  if (timeInMinutes < 450) {
    // 00:00 - 07:30 -> $20
    return {
      whc: 20,
      cht: 20,
      ehc: 20,
      periodLabel: '非繁忙時段',
      isPeak: false,
      isOffPeak: true,
      isNormal: false,
      isTransition: false,
      countdownText: formatCountdown(450 - timeInMinutes, '早晨繁忙加價'),
      isHoliday: false
    };
  } else if (timeInMinutes < 468) {
    // 07:30 - 07:48 -> 早晨過渡
    const step = Math.floor((timeInMinutes - 450) / 2);
    const whc = Math.min(60, 20 + (step + 1) * 4);
    const chtEhc = Math.min(40, 20 + (step + 1) * 2);
    return {
      whc,
      cht: chtEhc,
      ehc: chtEhc,
      periodLabel: '早晨加價中',
      isPeak: false,
      isOffPeak: false,
      isNormal: false,
      isTransition: true,
      countdownText: formatCountdown(468 - timeInMinutes, '繁忙時段($60/$40)'),
      isHoliday: false
    };
  } else if (timeInMinutes < 615) {
    // 07:48 - 10:15 -> 早晨繁忙 ($60 / $40)
    return {
      whc: 60,
      cht: 40,
      ehc: 40,
      periodLabel: '早晨繁忙時段',
      isPeak: true,
      isOffPeak: false,
      isNormal: false,
      isTransition: false,
      countdownText: formatCountdown(615 - timeInMinutes, '一般時段減價'),
      isHoliday: false
    };
  } else if (timeInMinutes < 643) {
    // 10:15 - 10:43 -> 午間過渡減價 ($60->$36, $40->$30)
    const step = Math.floor((timeInMinutes - 615) / 2);
    const whc = Math.max(36, 60 - (step + 1) * 2);
    const chtEhc = Math.max(30, 40 - (step + 1) * 1);
    return {
      whc,
      cht: chtEhc,
      ehc: chtEhc,
      periodLabel: '減價過渡中',
      isPeak: false,
      isOffPeak: false,
      isNormal: false,
      isTransition: true,
      countdownText: formatCountdown(643 - timeInMinutes, '一般時段($36/$30)'),
      isHoliday: false
    };
  } else if (timeInMinutes < 990) {
    // 10:43 - 16:30 -> 日間一般時段 (西隧 $36, 紅東 $30)
    return {
      whc: 36,
      cht: 30,
      ehc: 30,
      periodLabel: '一般時段',
      isPeak: false,
      isOffPeak: false,
      isNormal: true,
      isTransition: false,
      countdownText: formatCountdown(990 - timeInMinutes, '傍晚繁忙加價'),
      isHoliday: false
    };
  } else if (timeInMinutes < 1018) {
    // 16:30 - 16:58 -> 傍晚過渡加價
    const step = Math.floor((timeInMinutes - 990) / 2);
    const whc = Math.min(60, 36 + (step + 1) * 2);
    const chtEhc = Math.min(40, 30 + (step + 1) * 1);
    return {
      whc,
      cht: chtEhc,
      ehc: chtEhc,
      periodLabel: '傍晚加價中',
      isPeak: false,
      isOffPeak: false,
      isNormal: false,
      isTransition: true,
      countdownText: formatCountdown(1018 - timeInMinutes, '傍晚繁忙時段'),
      isHoliday: false
    };
  } else if (timeInMinutes < 1140) {
    // 16:58 - 19:00 -> 傍晚繁忙 ($60 / $40)
    return {
      whc: 60,
      cht: 40,
      ehc: 40,
      periodLabel: '傍晚繁忙時段',
      isPeak: true,
      isOffPeak: false,
      isNormal: false,
      isTransition: false,
      countdownText: formatCountdown(1140 - timeInMinutes, '非繁忙時段減價'),
      isHoliday: false
    };
  } else if (timeInMinutes < 1178) {
    // 19:00 - 19:38 -> 晚間過渡減價至 $20
    const step = Math.floor((timeInMinutes - 1140) / 2);
    const whc = Math.max(20, 60 - (step + 1) * 2);
    const chtEhc = Math.max(20, 40 - (step + 1) * 1);
    return {
      whc,
      cht: chtEhc,
      ehc: chtEhc,
      periodLabel: '減價過渡中',
      isPeak: false,
      isOffPeak: false,
      isNormal: false,
      isTransition: true,
      countdownText: formatCountdown(1178 - timeInMinutes, '非繁忙時段($20)'),
      isHoliday: false
    };
  } else {
    // 19:38 - 24:00 -> 夜間非繁忙 ($20)
    return {
      whc: 20,
      cht: 20,
      ehc: 20,
      periodLabel: '夜間非繁忙',
      isPeak: false,
      isOffPeak: true,
      isNormal: false,
      isTransition: false,
      countdownText: '夜間非繁忙時段 (全線 $20)',
      isHoliday: false
    };
  }
}

// 輔助顏色分配：便宜綠、適中藍/黃、昂貴橙紅
function getTollColorClass(toll: number): { text: string; bg: string; border: string } {
  if (toll <= 20) {
    return {
      text: 'text-[#d4ff00]',
      bg: 'bg-[#d4ff00]/10',
      border: 'border-[#d4ff00]/30'
    };
  }
  if (toll <= 30) {
    return {
      text: 'text-sky-400',
      bg: 'bg-sky-400/10',
      border: 'border-sky-400/30'
    };
  }
  if (toll <= 36) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/30'
    };
  }
  return {
    text: 'text-[#ff453a]',
    bg: 'bg-[#ff453a]/15',
    border: 'border-[#ff453a]/40'
  };
}

export const TunnelFeeBar: React.FC<TunnelFeeBarProps> = ({ onOpenTunnelDashboard, className = '' }) => {
  const [status, setStatus] = useState<TunnelStatus>(() => getTunnelRealtimeInfo());

  useEffect(() => {
    // 每 20 秒自動刷新一次
    const timer = setInterval(() => {
      setStatus(getTunnelRealtimeInfo());
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const whcStyle = getTollColorClass(status.whc);
  const chtStyle = getTollColorClass(status.cht);
  const ehcStyle = getTollColorClass(status.ehc);

  return (
    <div
      onClick={onOpenTunnelDashboard}
      role="button"
      tabIndex={0}
      title="點擊查看三隧分時段收費與即時行車時間"
      className={`group relative overflow-hidden rounded-xl bg-[#09090b]/95 border border-white/10 hover:border-white/20 p-2.5 sm:px-3.5 sm:py-2.5 shadow-md transition-all cursor-pointer select-none ${className}`}
    >
      {/* 頂部極細發光條 */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px] transition-colors"
        style={{
          background: status.isPeak 
            ? 'linear-gradient(90deg, #ff453a 0%, #ff9f0a 100%)' 
            : status.isOffPeak 
              ? 'linear-gradient(90deg, #d4ff00 0%, #22c55e 100%)' 
              : 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)'
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* 左側：標題、時段標籤、倒數提示 */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full animate-pulse" 
              style={{
                backgroundColor: status.isPeak ? '#ff453a' : status.isOffPeak ? '#d4ff00' : '#38bdf8'
              }}
            />
            <span className="text-[11px] font-mono font-bold tracking-tight text-white/90">
              三隧分時段收費
            </span>
          </div>

          <span 
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none shrink-0 ${
              status.isPeak 
                ? 'bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30' 
                : status.isOffPeak 
                  ? 'bg-[#d4ff00]/15 text-[#d4ff00] border-[#d4ff00]/30' 
                  : 'bg-sky-400/15 text-sky-300 border-sky-400/30'
            }`}
          >
            {status.periodLabel}
          </span>

          <div className="flex items-center gap-1 text-[11px] font-mono text-white/60 truncate">
            <Clock size={11} className="text-white/40 shrink-0" />
            <span className="truncate">{status.countdownText}</span>
          </div>
        </div>

        {/* 右側：西隧、紅隧、東隧 當前收費膠囊 + 展開箭頭 */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            {/* 西隧 */}
            <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 font-mono text-[11px] font-bold ${whcStyle.bg} ${whcStyle.border} ${whcStyle.text}`}>
              <span className="text-[9px] font-normal opacity-70">西</span>
              <span>${status.whc}</span>
            </div>

            {/* 紅隧 */}
            <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 font-mono text-[11px] font-bold ${chtStyle.bg} ${chtStyle.border} ${chtStyle.text}`}>
              <span className="text-[9px] font-normal opacity-70">紅</span>
              <span>${status.cht}</span>
            </div>

            {/* 東隧 */}
            <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 font-mono text-[11px] font-bold ${ehcStyle.bg} ${ehcStyle.border} ${ehcStyle.text}`}>
              <span className="text-[9px] font-normal opacity-70">東</span>
              <span>${status.ehc}</span>
            </div>
          </div>

          <ChevronRight size={14} className="text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all ml-0.5 shrink-0" />
        </div>
      </div>
    </div>
  );
};
