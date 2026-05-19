import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, AlertTriangle, Thermometer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherData {
  temperature: number;
  iconId: number;
  warnings: string[];
}

const getWeatherIcon = (iconId: number) => {
  // Rough mapping of HKO icon codes to Lucide icons
  if (iconId >= 50 && iconId <= 54) return <Sun size={12} className="cyber-text-glow" />;
  if (iconId >= 60 && iconId <= 61) return <Cloud size={12} className="cyber-text-glow" />;
  if (iconId >= 62 && iconId <= 64) return <CloudRain size={12} className="cyber-text-glow" />;
  if (iconId === 65) return <CloudLightning size={12} className="cyber-text-glow" />;
  return <Thermometer size={12} className="cyber-text-glow" />;
};

export const HKWeather: React.FC = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading || !data) return null;

  return (
    <div className="flex flex-col items-end">
      <AnimatePresence mode="wait">
        {data.warnings.length > 0 ? (
          <motion.div 
            key="warnings"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-[9px] font-mono text-red-500 font-bold mb-1 animate-pulse"
          >
            <AlertTriangle size={10} />
            <span className="truncate max-w-[120px]">
              {data.warnings.join(' | ')}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="flex items-center gap-2 text-cyber-green text-[10px] font-mono font-bold leading-none">
        {getWeatherIcon(data.iconId)}
        <span>{data.temperature}°C 香港即時</span>
      </div>
    </div>
  );
};
