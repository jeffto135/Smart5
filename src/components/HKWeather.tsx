import React, { useState, useEffect, useRef } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, AlertTriangle, Thermometer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getHKOIconUrl, handleHKOIconError } from '../utils/weatherIcons';
import { WeatherIcon } from './WeatherIcon';

interface WeatherWarning {
  name: string;
  color: string;
  severity: string;
  code?: string;
  subtype?: string;
}

interface WeatherData {
  temperature: number;
  iconId: number;
  warnings: WeatherWarning[];
}

interface HKWeatherProps {
  onWarningsUpdate?: (warnings: any[]) => void;
  // A prop to allow simulation of extreme weather to display slippery road warnings on dashboard
  simulatedWarnings?: string[] | null;
}

const parseHKOWarnings = (warningList: any[]): WeatherWarning[] => {
  if (!warningList || warningList.length === 0) return [];

  return warningList.map(item => {
    const code = item.warningStatementCode || item.code || '';
    const sub = item.subtype ? item.subtype.toString().toUpperCase() : '';
    const contentsStr = item.contents ? item.contents.join(' ') : (item.name || '');

    // 1. 熱帶氣旋（風球）嚴格解析 Subtype
    if (code === 'TC') {
      if (sub.includes('TC8') || ['TC8NE', 'TC8SE', 'TC8NW', 'TC8SW'].includes(sub)) {
        let tcName = '八號烈風或暴風信號';
        if (sub === 'TC8NE') tcName = '八號東北烈風或暴風信號';
        else if (sub === 'TC8SE') tcName = '八號東南烈風或暴風信號';
        else if (sub === 'TC8NW') tcName = '八號西北烈風或暴風信號';
        else if (sub === 'TC8SW') tcName = '八號西南烈風或暴風信號';
        return { name: tcName, color: '#ff3b30', severity: 'high', code, subtype: sub || 'TC8NE' };
      }
      if (sub === 'TC3') {
        return { name: '三號強風信號', color: '#ff9500', severity: 'moderate', code, subtype: 'TC3' };
      }
      if (sub === 'TC9') {
        return { name: '九號烈風或暴風風力增強信號', color: '#ff3b30', severity: 'extreme', code, subtype: 'TC9' };
      }
      if (sub === 'TC10') {
        return { name: '十號颶風信號', color: '#ff3b30', severity: 'extreme', code, subtype: 'TC10' };
      }
      if (sub === 'TC1') {
        return { name: '一號戒備信號', color: '#5ac8fa', severity: 'minor', code, subtype: 'TC1' };
      }

      // If subtype is not explicitly TC1/3/8/9/10, check contents string
      if (contentsStr.includes('八號東北') || contentsStr.includes('8號東北')) {
        return { name: '八號東北烈風或暴風信號', color: '#ff3b30', severity: 'high', code, subtype: 'TC8NE' };
      }
      if (contentsStr.includes('八號東南') || contentsStr.includes('8號東南')) {
        return { name: '八號東南烈風或暴風信號', color: '#ff3b30', severity: 'high', code, subtype: 'TC8SE' };
      }
      if (contentsStr.includes('八號西北') || contentsStr.includes('8號西北')) {
        return { name: '八號西北烈風或暴風信號', color: '#ff3b30', severity: 'high', code, subtype: 'TC8NW' };
      }
      if (contentsStr.includes('八號西南') || contentsStr.includes('8號西南')) {
        return { name: '八號西南烈風或暴風信號', color: '#ff3b30', severity: 'high', code, subtype: 'TC8SW' };
      }
      if (contentsStr.includes('八號') || contentsStr.includes('8號')) {
        return { name: '八號烈風或暴風信號', color: '#ff3b30', severity: 'high', code, subtype: 'TC8NE' };
      }
      if (contentsStr.includes('九號') || contentsStr.includes('9號')) {
        return { name: '九號風力增強信號', color: '#ff3b30', severity: 'extreme', code, subtype: 'TC9' };
      }
      if (contentsStr.includes('十號') || contentsStr.includes('10號')) {
        return { name: '十號颶風信號', color: '#ff3b30', severity: 'extreme', code, subtype: 'TC10' };
      }
      if (contentsStr.includes('三號') || contentsStr.includes('3號')) {
        return { name: '三號強風信號', color: '#ff9500', severity: 'moderate', code, subtype: 'TC3' };
      }
      if (contentsStr.includes('一號') || contentsStr.includes('1號')) {
        return { name: '一號戒備信號', color: '#5ac8fa', severity: 'minor', code, subtype: 'TC1' };
      }

      return { name: '熱帶氣旋警告', color: '#ff3b30', severity: 'high', code, subtype: sub };
    }

    // 2. 暴雨警告精準細分
    if (code === 'WRAIN') {
      if (sub === 'WRAINY' || contentsStr.includes('黃色')) return { name: '黃色暴雨警告', color: '#ffcc00', severity: 'minor', code, subtype: 'WRAINY' };
      if (sub === 'WRAINR' || contentsStr.includes('紅色')) return { name: '紅色暴雨警告', color: '#ff3b30', severity: 'moderate', code, subtype: 'WRAINR' };
      if (sub === 'WRAINB' || contentsStr.includes('黑色')) return { name: '黑色暴雨警告', color: '#a255ff', severity: 'extreme', code, subtype: 'WRAINB' };
      return { name: '暴雨警告', color: '#ffcc00', severity: 'minor', code, subtype: sub };
    }

    // 3. 雷暴警告
    if (code === 'WTS') {
      return { name: '雷暴警告', color: '#ff9500', severity: 'minor', code, subtype: sub };
    }

    // 4. 強烈季候風
    if (code === 'WMSGD') {
      return { name: '強烈季候風信號', color: '#5ac8fa', severity: 'minor', code, subtype: sub };
    }

    // 5. 山泥傾瀉
    if (code === 'WL') {
      return { name: '山泥傾瀉警告', color: '#ff9500', severity: 'minor', code, subtype: sub };
    }

    // 其他警告默認處理
    return { 
      name: item.contents && item.contents[0] ? item.contents[0].split('現正')[0] : '氣象警告', 
      color: '#ff3b30',
      severity: 'minor',
      code,
      subtype: sub
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
      const timestamp = Date.now();

      // Fetch current weather with cache-buster
      let weatherJson: any;
      try {
        const weatherRes = await fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.do?dataType=rhrread&lang=tc&_t=${timestamp}`);
        if (weatherRes.ok) {
          weatherJson = await weatherRes.json();
        } else {
          throw new Error('Fallback to php');
        }
      } catch {
        const weatherResPhp = await fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc&_t=${timestamp}`);
        if (!weatherResPhp.ok) throw new Error('Failed to fetch current weather status');
        weatherJson = await weatherResPhp.json();
      }
      
      // Fetch warnings using warningInfo endpoint with cache-buster
      let warnJson: any;
      try {
        const warnRes = await fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.do?dataType=warningInfo&lang=tc&_t=${timestamp}`);
        if (warnRes.ok) {
          warnJson = await warnRes.json();
        } else {
          throw new Error('Fallback to php');
        }
      } catch {
        const warnResPhp = await fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=tc&_t=${timestamp}`);
        if (!warnResPhp.ok) throw new Error('Failed to fetch warning information');
        warnJson = await warnResPhp.json();
      }

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
      console.warn('Using fallback HK weather data:', error);
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

  const latestWarningsRef = useRef<any[]>([]);
  
  const warningsString = data ? JSON.stringify(data.warnings) : '';
  const simulatedWarningsString = simulatedWarnings ? JSON.stringify(simulatedWarnings) : '';

  // Propagate warnings up to parent component
  useEffect(() => {
    const currentWarnings = simulatedWarnings !== null && simulatedWarnings !== undefined 
      ? simulatedWarnings.map(name => {
          let code = '';
          let subtype = '';
          if (name.includes('暴雨')) {
            code = 'WRAIN';
            if (name.includes('黃色')) subtype = 'WRAINY';
            else if (name.includes('紅色')) subtype = 'WRAINR';
            else if (name.includes('黑色')) subtype = 'WRAINB';
          } else if (name.includes('風球') || name.includes('信號') || name.includes('熱帶氣旋')) {
            code = 'TC';
            if (name.includes('一號') || name.includes('1號')) subtype = 'TC1';
            else if (name.includes('三號') || name.includes('3號')) subtype = 'TC3';
            else if (name.includes('八號東北') || name.includes('8號東北')) subtype = 'TC8NE';
            else if (name.includes('八號東南') || name.includes('8號東南')) subtype = 'TC8SE';
            else if (name.includes('八號西北') || name.includes('8號西北')) subtype = 'TC8NW';
            else if (name.includes('八號西南') || name.includes('8號西南')) subtype = 'TC8SW';
            else if (name.includes('八號') || name.includes('8號')) subtype = 'TC8NE';
            else if (name.includes('九號') || name.includes('9號')) subtype = 'TC9';
            else if (name.includes('十號') || name.includes('10號')) subtype = 'TC10';
          } else if (name.includes('雷暴')) {
            code = 'WTS';
          } else if (name.includes('季候風')) {
            code = 'WMSGD';
          } else if (name.includes('山泥傾瀉')) {
            code = 'WL';
          } else if (name.includes('火災')) {
            code = 'WFIREW';
          } else if (name.includes('霜凍')) {
            code = 'WFROST';
          } else if (name.includes('酷熱')) {
            code = 'WHOT';
          } else if (name.includes('寒冷')) {
            code = 'WCOLD';
          }
          return { name, code, subtype };
        })
      : (data?.warnings || []);
    const warningsJson = JSON.stringify(currentWarnings);
    const prevJson = JSON.stringify(latestWarningsRef.current);
    
    if (warningsJson !== prevJson) {
      latestWarningsRef.current = currentWarnings;
      onWarningsUpdate?.(currentWarnings);
    }
  }, [warningsString, simulatedWarningsString, onWarningsUpdate]);

  if (loading || !data) return null;

  const displayWarnings: WeatherWarning[] = simulatedWarnings !== null && simulatedWarnings !== undefined 
    ? simulatedWarnings.map(name => {
        let code = '';
        let subtype = '';
        if (name.includes('暴雨')) {
          code = 'WRAIN';
          if (name.includes('黃色')) subtype = 'WRAINY';
          else if (name.includes('紅色')) subtype = 'WRAINR';
          else if (name.includes('黑色')) subtype = 'WRAINB';
        } else if (name.includes('風球') || name.includes('信號') || name.includes('熱帶氣旋')) {
          code = 'TC';
          if (name.includes('一號') || name.includes('1號')) subtype = 'TC1';
          else if (name.includes('三號') || name.includes('3號')) subtype = 'TC3';
          else if (name.includes('八號東北') || name.includes('8號東北')) subtype = 'TC8NE';
          else if (name.includes('八號東南') || name.includes('8號東南')) subtype = 'TC8SE';
          else if (name.includes('八號西北') || name.includes('8號西北')) subtype = 'TC8NW';
          else if (name.includes('八號西南') || name.includes('8號西南')) subtype = 'TC8SW';
          else if (name.includes('八號') || name.includes('8號')) subtype = 'TC8NE';
          else if (name.includes('九號') || name.includes('9號')) subtype = 'TC9';
          else if (name.includes('十號') || name.includes('10號')) subtype = 'TC10';
        } else if (name.includes('雷暴')) {
          code = 'WTS';
        } else if (name.includes('季候風')) {
          code = 'WMSGD';
        } else if (name.includes('山泥傾瀉')) {
          code = 'WL';
        } else if (name.includes('火災')) {
          code = 'WFIREW';
        } else if (name.includes('霜凍')) {
          code = 'WFROST';
        } else if (name.includes('酷熱')) {
          code = 'WHOT';
        } else if (name.includes('寒冷')) {
          code = 'WCOLD';
        }
        return { name, color: '#ff3b30', severity: 'minor', code, subtype };
      }) 
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
            className={`flex items-center gap-1.5 px-2 py-1 border rounded text-[9px] font-mono font-bold mb-1 animate-pulse active:scale-95 transition-all cursor-pointer ${badgeClasses}`}
          >
            {displayWarnings.map((w, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-sm p-[1px] inline-flex items-center justify-center shadow-sm min-w-4 min-h-4 shrink-0 select-none"
              >
                <WeatherIcon 
                  code={w.code} 
                  subtype={w.subtype} 
                  name={w.name} 
                  iconSizeClassName="w-3.5 h-3.5"
                />
              </div>
            ))}
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
                        className={`p-3 border rounded-lg text-xs font-medium flex items-center gap-3 ${mappedClasses}`}
                      >
                        <div className="bg-white rounded-[6px] p-1 inline-flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.3)] min-w-8 min-h-8 shrink-0 select-none">
                          <WeatherIcon 
                            code={w.code} 
                            subtype={w.subtype} 
                            name={w.name} 
                            iconSizeClassName="w-7 h-7"
                          />
                        </div>
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
