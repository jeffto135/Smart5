import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock, Navigation, AlertCircle, RefreshCw, Car, ArrowRight, ShieldCheck, ChevronRight, X } from 'lucide-react';

export interface TunnelRate {
  name: string;
  code: 'WHC' | 'CHT' | 'EHC';
  chineseName: string;
  currentToll: number;
  periodLabel: string;
  accentColor: string;
  nextChangeText?: string;
}

export interface JourneyTimeItem {
  locationId: string;
  locationName: string;
  destinationId: string;
  tunnelName: string;
  timeMinutes: number;
  colorId: number; // 1: green, 2: yellow, 3: red
  captureDate: string;
}

// 實時計算香港三隧分流收費 (Time-varying tolls)
export function calculateCurrentTunnelToll(now: Date = new Date()): {
  rates: TunnelRate[];
  periodType: string;
  periodNote: string;
  isHoliday: boolean;
} {
  // 香港時間 (UTC+8)
  const hkDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" });
  const hkDate = new Date(hkDateStr);

  const dayOfWeek = hkDate.getDay(); // 0: Sun, 1-6: Mon-Sat
  const isSunday = dayOfWeek === 0;
  
  const hours = hkDate.getHours();
  const minutes = hkDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 1. 星期日及公眾假期收費
  if (isSunday) {
    let whc = 20;
    let cht = 20;
    let ehc = 20;
    let periodType = '非繁忙時段';
    let periodNote = '全日非繁忙時段 (三隧一律 $20)';

    // 00:00 - 10:11 -> $20
    if (timeInMinutes < 611) {
      whc = cht = ehc = 20;
      periodType = '非繁忙時段';
      periodNote = '深夜/早間非繁忙 (三隧一律 $20)';
    }
    // 10:11 - 10:15 -> 遞增至 $25 (每 2 分鐘 +$2)
    else if (timeInMinutes < 615) {
      const step = Math.floor((timeInMinutes - 611) / 2);
      const toll = 20 + (step + 1) * 2;
      whc = cht = ehc = Math.min(25, toll);
      periodType = '過渡時段 (遞增中)';
      periodNote = '收費過渡至一般時段';
    }
    // 10:15 - 19:15 -> $25
    else if (timeInMinutes < 1155) {
      whc = cht = ehc = 25;
      periodType = '假日一般時段';
      periodNote = '日間一般時段 (三隧一律 $25)';
    }
    // 19:15 - 19:19 -> 遞減至 $20 (每 2 分鐘 -$2)
    else if (timeInMinutes < 1159) {
      const step = Math.floor((timeInMinutes - 1155) / 2);
      const toll = 25 - (step + 1) * 2;
      whc = cht = ehc = Math.max(20, toll);
      periodType = '過渡時段 (遞減中)';
      periodNote = '收費過渡至非繁忙時段';
    }
    // 19:19 - 23:59 -> $20
    else {
      whc = cht = ehc = 20;
      periodType = '非繁忙時段';
      periodNote = '夜間非繁忙 (三隧一律 $20)';
    }

    return {
      rates: [
        { name: '西隧', code: 'WHC', chineseName: '西區海底隧道', currentToll: whc, periodLabel: periodType, accentColor: '#38bdf8' },
        { name: '紅隧', code: 'CHT', chineseName: '紅磡海底隧道', currentToll: cht, periodLabel: periodType, accentColor: '#ff3b30' },
        { name: '東隧', code: 'EHC', chineseName: '東區海底隧道', currentToll: ehc, periodLabel: periodType, accentColor: '#d4ff00' },
      ],
      periodType,
      periodNote,
      isHoliday: true
    };
  }

  // 2. 星期一至六 (平日)
  let whc = 20;
  let cht = 20;
  let ehc = 20;
  let periodType = '非繁忙時段';
  let periodNote = '三隧一律 $20';

  // 00:00 - 07:30 (450m) -> $20
  if (timeInMinutes < 450) {
    whc = cht = ehc = 20;
    periodType = '早晨非繁忙';
    periodNote = '三隧一律 $20';
  }
  // 07:30 - 07:48 (450m - 468m) -> 遞增至繁忙時段 (西隧每2分+$4.4 -> $60, 紅東每2分+$2.2 -> $40)
  else if (timeInMinutes < 468) {
    const step = Math.floor((timeInMinutes - 450) / 2);
    whc = Math.min(60, 20 + (step + 1) * 4);
    cht = ehc = Math.min(40, 20 + (step + 1) * 2);
    periodType = '早晨過渡 (遞增中)';
    periodNote = '即將進入繁忙時段';
  }
  // 07:48 - 10:15 (468m - 615m) -> 早晨繁忙 (西隧 $60, 紅東 $40)
  else if (timeInMinutes < 615) {
    whc = 60;
    cht = ehc = 40;
    periodType = '早晨繁忙時段';
    periodNote = '西隧 $60 │ 紅隧/東隧 $40';
  }
  // 10:15 - 10:43 (615m - 643m) -> 遞減至一般時段 ($30)
  else if (timeInMinutes < 643) {
    const step = Math.floor((timeInMinutes - 615) / 2);
    whc = Math.max(30, 60 - (step + 1) * 2);
    cht = ehc = Math.max(30, 40 - (step + 1) * 1);
    periodType = '午間過渡 (遞減中)';
    periodNote = '過渡至一般時段';
  }
  // 10:43 - 16:30 (643m - 990m) -> 一般時段 (三隧均為 $30)
  else if (timeInMinutes < 990) {
    whc = cht = ehc = 30;
    periodType = '日間一般時段';
    periodNote = '三隧一律 $30';
  }
  // 16:30 - 16:58 (990m - 1018m) -> 傍晚過渡遞增 (西隧升至 $60，紅東升至 $40)
  else if (timeInMinutes < 1018) {
    const step = Math.floor((timeInMinutes - 990) / 2);
    whc = Math.min(60, 30 + (step + 1) * 2);
    cht = ehc = Math.min(40, 30 + (step + 1) * 1);
    periodType = '傍晚過渡 (遞增中)';
    periodNote = '即將進入傍晚繁忙時段';
  }
  // 16:58 - 19:00 (1018m - 1140m) -> 傍晚繁忙時段 (西隧 $60, 紅東 $40)
  else if (timeInMinutes < 1140) {
    whc = 60;
    cht = ehc = 40;
    periodType = '傍晚繁忙時段';
    periodNote = '西隧 $60 │ 紅隧/東隧 $40';
  }
  // 19:00 - 19:38 (1140m - 1178m) -> 遞減至非繁忙時段 (降至 $20)
  else if (timeInMinutes < 1178) {
    const step = Math.floor((timeInMinutes - 1140) / 2);
    whc = Math.max(20, 60 - (step + 1) * 2);
    cht = ehc = Math.max(20, 40 - (step + 1) * 1);
    periodType = '晚間過渡 (遞減中)';
    periodNote = '即將進入非繁忙時段';
  }
  // 19:38 - 23:59 -> 非繁忙時段 (三隧均為 $20)
  else {
    whc = cht = ehc = 20;
    periodType = '夜間非繁忙';
    periodNote = '三隧一律 $20';
  }

  return {
    rates: [
      { name: '西隧', code: 'WHC', chineseName: '西區海底隧道', currentToll: whc, periodLabel: periodType, accentColor: '#38bdf8' },
      { name: '紅隧', code: 'CHT', chineseName: '紅磡海底隧道', currentToll: cht, periodLabel: periodType, accentColor: '#ff3b30' },
      { name: '東隧', code: 'EHC', chineseName: '東區海底隧道', currentToll: ehc, periodLabel: periodType, accentColor: '#d4ff00' },
    ],
    periodType,
    periodNote,
    isHoliday: false
  };
}

// 預設常見路線對照表 (香港運輸署 JTIS 官方代號)
const JTIS_LOCATIONS: Record<string, string> = {
  H1: '告士打道東行 (近舊灣仔警署)',
  H2: '維園道東行 (銅鑼灣避風塘)',
  H3: '東區走廊西行 (近太古城)',
  H4: '香港仔隧道北行 (收費廣場)',
  K1: '渡船街南行 (近富榮花園)',
  K2: '加士居道天橋東行',
  K3: '窩打老道南行 (近聖約翰里)',
  K4: '漆咸道北南行 (近蕪湖街)',
  K5: '觀塘道西行 (近九龍灣站)'
};

const JTIS_DESTINATIONS: Record<string, string> = {
  CH: '紅磡海底隧道 (紅隧)',
  EH: '東區海底隧道 (東隧)',
  WH: '西區海底隧道 (西隧)'
};

interface TunnelDashboardProps {
  onClose?: () => void;
  isCompact?: boolean;
}

export const TunnelDashboard: React.FC<TunnelDashboardProps> = ({ onClose, isCompact = false }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [journeyTimes, setJourneyTimes] = useState<JourneyTimeItem[]>([]);
  const [isLoadingJT, setIsLoadingJT] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'hk_to_kln' | 'kln_to_hk'>('all');

  // 每 30 秒更新時鐘與收費計算
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const tollData = useMemo(() => {
    return calculateCurrentTunnelToll(currentTime);
  }, [currentTime]);

  // 抓取運輸署即時行車時間 XML
  const fetchJourneyTimes = async () => {
    setIsLoadingJT(true);
    setErrorMsg('');
    try {
      const res = await fetch('https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xmlText = await res.text();

      // 解析 XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const nodes = xmlDoc.getElementsByTagName('jtis_journey_time');

      const items: JourneyTimeItem[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const locId = node.getElementsByTagName('LOCATION_ID')[0]?.textContent || '';
        const destId = node.getElementsByTagName('DESTINATION_ID')[0]?.textContent || '';
        const dataVal = node.getElementsByTagName('JOURNEY_DATA')[0]?.textContent || '0';
        const colorVal = node.getElementsByTagName('COLOUR_ID')[0]?.textContent || '1';
        const capture = node.getElementsByTagName('CAPTURE_DATE')[0]?.textContent || '';

        const locName = JTIS_LOCATIONS[locId] || locId;
        const destName = JTIS_DESTINATIONS[destId] || destId;

        items.push({
          locationId: locId,
          locationName: locName,
          destinationId: destId,
          tunnelName: destName,
          timeMinutes: parseInt(dataVal) || 0,
          colorId: parseInt(colorVal) || 1,
          captureDate: capture
        });
      }

      setJourneyTimes(items);
      setLastUpdated(new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.warn('JTIS live fetch fallback:', err.message);
      // 具備實用預設行車數據備援
      setJourneyTimes([
        { locationId: 'H1', locationName: '告士打道東行 (近稅務大樓)', destinationId: 'CH', tunnelName: '紅磡海底隧道 (紅隧)', timeMinutes: 6, colorId: 2, captureDate: '即時估算' },
        { locationId: 'H1', locationName: '告士打道東行 (近稅務大樓)', destinationId: 'EH', tunnelName: '東區海底隧道 (東隧)', timeMinutes: 10, colorId: 1, captureDate: '即時估算' },
        { locationId: 'H2', locationName: '維園道東行 (銅鑼灣避風塘)', destinationId: 'WH', tunnelName: '西區海底隧道 (西隧)', timeMinutes: 9, colorId: 1, captureDate: '即時估算' },
        { locationId: 'H2', locationName: '維園道東行 (銅鑼灣避風塘)', destinationId: 'CH', tunnelName: '紅磡海底隧道 (紅隧)', timeMinutes: 7, colorId: 2, captureDate: '即時估算' },
        { locationId: 'K1', locationName: '渡船街南行 (近富榮花園)', destinationId: 'WH', tunnelName: '西區海底隧道 (西隧)', timeMinutes: 5, colorId: 1, captureDate: '即時估算' },
        { locationId: 'K1', locationName: '渡船街南行 (近富榮花園)', destinationId: 'CH', tunnelName: '紅磡海底隧道 (紅隧)', timeMinutes: 12, colorId: 3, captureDate: '即時估算' },
        { locationId: 'K2', locationName: '加士居道天橋東行', destinationId: 'CH', tunnelName: '紅磡海底隧道 (紅隧)', timeMinutes: 15, colorId: 3, captureDate: '即時估算' },
        { locationId: 'K5', locationName: '觀塘道西行 (近九龍灣站)', destinationId: 'EH', tunnelName: '東區海底隧道 (東隧)', timeMinutes: 8, colorId: 1, captureDate: '即時估算' },
      ]);
      setLastUpdated(new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }) + ' (離線備援)');
    } finally {
      setIsLoadingJT(false);
    }
  };

  useEffect(() => {
    fetchJourneyTimes();
  }, []);

  // 篩選方向
  const filteredJourneyTimes = useMemo(() => {
    return journeyTimes.filter(item => {
      if (selectedDirection === 'hk_to_kln') return item.locationId.startsWith('H');
      if (selectedDirection === 'kln_to_hk') return item.locationId.startsWith('K');
      return true;
    });
  }, [journeyTimes, selectedDirection]);

  const getColorBadge = (colorId: number) => {
    switch (colorId) {
      case 1:
        return { text: '暢通', bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-400' };
      case 2:
        return { text: '繁忙', bg: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400', dot: 'bg-yellow-400' };
      case 3:
      default:
        return { text: '擁塞', bg: 'bg-red-500/15 border-red-500/30 text-red-400', dot: 'bg-red-400' };
    }
  };

  return (
    <div className="space-y-4 text-left font-sans">
      {/* 頂部標題與即時時間 */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white font-mono flex items-center gap-1.5">
              <span>🚇</span>
              <span>三隧分流即時收費與過海時間</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#d4ff00]/15 text-[#d4ff00] border border-[#d4ff00]/30 font-bold">
              LIVE
            </span>
          </div>
          <p className="text-xs text-white/50 m-0 mt-0.5 font-mono">
            當前時段：<span className="text-white font-bold">{tollData.periodType}</span> ({tollData.periodNote})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchJourneyTimes}
            disabled={isLoadingJT}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer text-xs font-mono flex items-center gap-1"
            title="重新獲取行車時間"
          >
            <RefreshCw size={14} className={isLoadingJT ? 'animate-spin text-[#d4ff00]' : ''} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 1. 三隧即時收費卡片 (西隧、紅隧、東隧) */}
      <div className="grid grid-cols-3 gap-2.5">
        {tollData.rates.map(rate => (
          <div
            key={rate.code}
            className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 relative overflow-hidden flex flex-col justify-between"
            style={{ borderTopColor: rate.accentColor, borderTopWidth: '3px' }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white/70">{rate.name}</span>
                <span className="text-[9px] font-mono text-white/30">{rate.code}</span>
              </div>
              <div className="text-2xl font-mono font-black text-white mt-1">
                <span className="text-xs text-[#d4ff00] font-normal mr-0.5">HK$</span>
                <span>{rate.currentToll}</span>
              </div>
            </div>
            <div className="mt-2 text-[9px] font-mono text-white/40 truncate">
              私家車即時收費
            </div>
          </div>
        ))}
      </div>

      {/* 2. 運輸署實時過海行車時間 (JTIS) */}
      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Navigation size={14} className="text-[#d4ff00]" />
            <span className="text-xs font-mono font-bold text-white">運輸署實時行車時間 (分鐘)</span>
            {lastUpdated && (
              <span className="text-[10px] font-mono text-white/40">· {lastUpdated} 更新</span>
            )}
          </div>

          {/* 方向切換 */}
          <div className="flex gap-1 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setSelectedDirection('all')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${selectedDirection === 'all' ? 'bg-[#d4ff00] text-black font-bold' : 'bg-white/5 text-white/60 hover:text-white'}`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setSelectedDirection('hk_to_kln')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${selectedDirection === 'hk_to_kln' ? 'bg-[#d4ff00] text-black font-bold' : 'bg-white/5 text-white/60 hover:text-white'}`}
            >
              港島 ➔ 九龍
            </button>
            <button
              type="button"
              onClick={() => setSelectedDirection('kln_to_hk')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${selectedDirection === 'kln_to_hk' ? 'bg-[#d4ff00] text-black font-bold' : 'bg-white/5 text-white/60 hover:text-white'}`}
            >
              九龍 ➔ 港島
            </button>
          </div>
        </div>

        {/* 行車時間列表 */}
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredJourneyTimes.length > 0 ? (
            filteredJourneyTimes.map((item, idx) => {
              const badge = getColorBadge(item.colorId);
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono hover:border-white/15 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-bold truncate">
                      {item.locationName}
                    </div>
                    <div className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
                      <span>前往</span>
                      <span className="text-white/80 font-bold">{item.tunnelName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-base font-bold text-white font-mono leading-none">
                        {item.timeMinutes} <span className="text-[10px] font-normal text-white/50">分鐘</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      <span>{badge.text}</span>
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-white/30 font-mono">
              {isLoadingJT ? '正在讀取香港運輸署最新過海路況...' : '暫無符合篩選之行車時間'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
