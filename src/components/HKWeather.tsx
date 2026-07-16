import React, { useState, useEffect, useRef } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, AlertTriangle, Thermometer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherWarning {
  name: string;
  color: string;
  severity: string;
}

interface WeatherData {
  temperature: number;
  iconId: number;
  warnings: WeatherWarning[];
}

interface HKWeatherProps {
  onWarningsUpdate?: (warnings: string[]) => void;
  // A prop to allow simulation of extreme weather to display slippery road warnings on dashboard
  simulatedWarnings?: string[] | null;
}

const parseHKOWarnings = (warningList: any[]): WeatherWarning[] => {
  if (!warningList || warningList.length === 0) return [];

  return warningList.map(item => {
    const code = item.warningStatementCode;
    const subtype = item.subtype; // 🌟 關鍵：必須讀取此子代碼

    // 1. 暴雨警告精準細分
    if (code === 'WRAIN') {
      if (subtype === 'WRAINY') return { name: '黃色暴雨警告', color: '#ffcc00', severity: 'minor' };
      if (subtype === 'WRAINR') return { name: '紅色暴雨警告', color: '#ff3b30', severity: 'moderate' };
      if (subtype === 'WRAINB') return { name: '黑色暴雨警告', color: '#a255ff', severity: 'extreme' };
      return { name: '暴雨警告', color: '#ffcc00', severity: 'minor' };
    }

    // 2. 雷暴警告
    if (code === 'WTS') {
      return { name: '雷暴警告', color: '#ff9500', severity: 'minor' };
    }

    // 3. 熱帶氣旋（風球）精準細分
    if (code === 'TC') {
      if (subtype === 'TC1') return { name: '一號戒備信號', color: '#5ac8fa', severity: 'minor' };
      if (subtype === 'TC3') return { name: '三號強風信號', color: '#ff9500', severity: 'moderate' };
      if (['TC8NE', 'TC8SE', 'TC8NW', 'TC8SW'].includes(subtype)) {
        return { name: '八號烈風或暴風信號', color: '#ff3b30', severity: 'high' };
      }
      if (subtype === 'TC9') return { name: '九號風力增強信號', color: '#ff3b30', severity: 'extreme' };
      if (subtype === 'TC10') return { name: '十號颶風信號', color: '#ff3b30', severity: 'extreme' };
      return { name: '熱帶氣旋警告', color: '#ff3b30', severity: 'high' };
    }

    // 其他警告默認處理
    return { 
      name: item.contents && item.contents[0] ? item.contents[0].split('現正')[0] : '氣象警告', 
      color: '#ff3b30',
      severity: 'minor'
    };
  });
};

const getWarningTailwindClasses = (name: string) => {
  if (name.includes('黃色暴雨')) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20';
  if (name.includes('紅色暴雨')) return 'text-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20';
  if (name.includes('黑色暴雨')) return 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20';
  if (name.includes('一號戒備')) return 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20';
  if (name.includes('三號強風')) return 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20';
  if (name.includes('八號') || name.includes('九號') || name.includes('十號')) {
    return 'text-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20';
  }
  if (name.includes('雷暴')) return 'text-amber-500 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20';
  if (name.includes('強烈季候風')) return 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20';
  if (name.includes('山泥傾瀉')) return 'text-orange-500 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20';
  return 'text-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20';
};

const getWeatherIcon = (iconId: number) => {
  // Rough mapping of HKO icon codes to Lucide icons
  if (iconId >= 50 && iconId <= 54) return <Sun size={12} className="cyber-text-glow text-[#CCFF00]" />;
  if (iconId >= 60 && iconId <= 61) return <Cloud size={12} className="cyber-text-glow" />;
  if (iconId >= 62 && iconId <= 64) return <CloudRain size={12} className="cyber-text-glow" />;
  if (iconId === 65) return <CloudLightning size={12} className="cyber-text-glow animate-pulse text-yellow-400" />;
  return <Thermometer size={12} className="cyber-text-glow" />;
};

export const HKWeather: React.FC<HKWeatherProps> = ({ onWarningsUpdate, simulatedWarnings }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchWeather = async () => {
    try {
      // Fetch current weather
      const weatherRes = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc');
      if (!weatherRes.ok) throw new Error('Failed to fetch current weather status');
      const weatherJson = await weatherRes.json();
      
      // Fetch warnings using warningInfo endpoint
      const warnRes = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=tc');
      if (!warnRes.ok) throw new Error('Failed to fetch warning information');
      const warnJson = await warnRes.json();

      // Find temperature (using King's Park as default)
      const kpTempData = weatherJson.temperature?.data?.find((d: any) => d.place === '京士柏') || 
                         weatherJson.temperature?.data?.[0];
      const kpTemp = kpTempData?.value || 24;
      
      const iconId = weatherJson.icon?.[0] || 60;
      
      const warnings: WeatherWarning[] = [];
      if (warnJson && Array.isArray(warnJson.details)) {
        const parsed = parseHKOWarnings(warnJson.details);
        parsed.forEach((w: WeatherWarning) => {
          if (w && w.name) {
            warnings.push(w);
          }
        });
      }

      setData({
        temperature: kpTemp,
        iconId: iconId,
        warnings: warnings
      });
    } catch (error) {
      console.warn('Using beautiful default HK weather fallback:', error);
      // Fail gracefully: fallback to standard pleasant Hong Kong weather (24°C, Cloudy)
      setData({
        temperature: 24,
        iconId: 60,
        warnings: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // Update every 10 mins
    return () => clearInterval(interval);
  }, []);

  const latestWarningsRef = useRef<string[]>([]);
  
  const warningsString = data ? JSON.stringify(data.warnings.map(w => w.name)) : '';
  const simulatedWarningsString = simulatedWarnings ? JSON.stringify(simulatedWarnings) : '';

  // Propagate warnings up to parent component
  useEffect(() => {
    const currentWarnings = simulatedWarnings !== null && simulatedWarnings !== undefined 
      ? simulatedWarnings 
      : (data?.warnings.map(w => w.name) || []);
    const warningsJson = JSON.stringify(currentWarnings);
    const prevJson = JSON.stringify(latestWarningsRef.current);
    
    if (warningsJson !== prevJson) {
      latestWarningsRef.current = currentWarnings;
      onWarningsUpdate?.(currentWarnings);
    }
  }, [warningsString, simulatedWarningsString, onWarningsUpdate]);

  if (loading || !data) return null;

  const displayWarnings: WeatherWarning[] = simulatedWarnings !== null && simulatedWarnings !== undefined 
    ? simulatedWarnings.map(name => ({ name, color: '#ff3b30', severity: 'minor' })) 
    : (data?.warnings || []);

  // Find dynamic classes for the top warning badge based on the first warning
  const firstWarning = displayWarnings[0]?.name || '';
  const badgeClasses = getWarningTailwindClasses(firstWarning);

  return (
    <div className="flex flex-col items-end">
      <AnimatePresence mode="wait">
        {displayWarnings.length > 0 ? (
          <motion.button 
            key="warnings-badge"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-1.5 px-2 py-0.5 border rounded text-[9px] font-mono font-bold mb-1 animate-pulse active:scale-95 transition-all cursor-pointer ${badgeClasses}`}
          >
            <AlertTriangle size={10} />
            <span className="truncate max-w-[125px]">
              {displayWarnings.map(w => w.name).join(' | ')}
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
      <div className="flex items-center gap-2 text-cyber-green text-[10px] font-mono font-bold leading-none">
        {getWeatherIcon(data.iconId)}
        <span>{data.temperature}°C 香港即時</span>
      </div>

      {/* Warnings Popup Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 bg-[#0f0f11] border border-red-500/30 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)] relative"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-2 text-red-500 font-bold font-mono text-sm uppercase mb-4">
                <AlertTriangle size={18} className="animate-pulse" />
                香港即時天氣警告資訊
              </div>

              <div className="space-y-3 my-4">
                {displayWarnings.length > 0 ? (
                  displayWarnings.map((w, idx) => {
                    const mappedClasses = getWarningTailwindClasses(w.name).replace('hover:bg-yellow-500/20', '').replace('hover:bg-red-500/20', '').replace('hover:bg-fuchsia-500/20', '').replace('hover:bg-sky-500/20', '').replace('hover:bg-orange-500/20', '').replace('hover:bg-amber-500/20', '');
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 border rounded-lg text-xs font-medium flex items-center gap-2 ${mappedClasses}`}
                      >
                        <span>⚠️</span>
                        <div>
                          <span className="font-bold">{w.name}</span>
                          <div className="text-[9px] opacity-40 mt-0.5 uppercase tracking-wide">Hong Kong Observatory Active Alert</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center text-xs text-emerald-400 font-mono">
                    ✅ 目前沒有任何氣象警告生效。
                  </div>
                )}
              </div>

              <div className="mt-5 p-3 rounded-lg border border-white/5 bg-white/[0.02] text-[10px] text-white/50 leading-relaxed font-mono">
                提醒您：在雷暴、大雨或颱風期間行車時，請減速慢行，並與前車保持適當安全距離。
              </div>

              <button 
                onClick={() => setShowModal(false)}
                className="w-full mt-6 py-2 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold font-mono uppercase tracking-widest border border-red-500/30 transition-all active:scale-98"
              >
                關閉視窗 CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
