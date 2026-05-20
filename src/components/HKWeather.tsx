import React, { useState, useEffect, useRef } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, AlertTriangle, Thermometer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherData {
  temperature: number;
  iconId: number;
  warnings: string[];
}

interface HKWeatherProps {
  onWarningsUpdate?: (warnings: string[]) => void;
  // A prop to allow simulation of extreme weather to display slippery road warnings on dashboard
  simulatedWarnings?: string[] | null;
}

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
      const weatherJson = await weatherRes.json();
      
      // Fetch warnings
      const warnRes = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc');
      const warnJson = await warnRes.json();

      // Find temperature (using King's Park as default)
      const kpTempData = weatherJson.temperature?.data?.find((d: any) => d.place === '京士柏') || 
                         weatherJson.temperature?.data?.[0];
      const kpTemp = kpTempData?.value || 0;
      
      const iconId = weatherJson.icon?.[0] || 0;
      
      const warnings: string[] = [];
      if (warnJson && typeof warnJson === 'object') {
        Object.values(warnJson).forEach((w: any) => {
          if (w.name) warnings.push(w.name);
        });
      }

      setData({
        temperature: kpTemp,
        iconId: iconId,
        warnings: warnings
      });
    } catch (error) {
      console.error('Failed to fetch HK weather:', error);
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
  
  // Propagate warnings up to parent component
  useEffect(() => {
    const currentWarnings = simulatedWarnings !== null && simulatedWarnings !== undefined ? simulatedWarnings : (data?.warnings || []);
    const warningsJson = JSON.stringify(currentWarnings);
    const prevJson = JSON.stringify(latestWarningsRef.current);
    
    if (warningsJson !== prevJson) {
      latestWarningsRef.current = currentWarnings;
      onWarningsUpdate?.(currentWarnings);
    }
  }, [data?.warnings, simulatedWarnings, onWarningsUpdate]);

  if (loading || !data) return null;

  const displayWarnings = simulatedWarnings !== null && simulatedWarnings !== undefined ? simulatedWarnings : data.warnings;

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
            className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-[9px] font-mono text-red-500 font-bold mb-1 animate-pulse hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <AlertTriangle size={10} />
            <span className="truncate max-w-[125px]">
              {displayWarnings.join(' | ')}
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
                  displayWarnings.map((w, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-white/90 font-medium flex items-center gap-2"
                    >
                      <span className="text-red-500">⚠️</span>
                      <div>
                        <span className="font-bold text-red-400">{w}</span>
                        <div className="text-[9px] opacity-40 mt-0.5 uppercase tracking-wide">Hong Kong Observatory Active Alert</div>
                      </div>
                    </div>
                  ))
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
