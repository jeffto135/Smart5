import React, { useState } from 'react';
import { getHKOIconUrl } from '../utils/weatherIcons';

interface WeatherIconProps {
  code?: string;
  subtype?: string;
  name?: string;
  className?: string;
  iconSizeClassName?: string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  subtype,
  name = '',
  className = '',
  iconSizeClassName = 'w-7 h-7'
}) => {
  const [imgError, setImgError] = useState(false);

  const upperCode = code?.toUpperCase() || '';
  const sub = subtype?.toUpperCase() || '';
  const searchName = name || '';

  const isRain = upperCode === 'WRAIN' || searchName.includes('暴雨') || searchName.includes('雨');
  const isYellowRain = sub === 'WRAINY' || searchName.includes('黃色暴雨') || searchName.includes('黃雨');
  const isRedRain = sub === 'WRAINR' || searchName.includes('紅色暴雨') || searchName.includes('紅雨');
  const isBlackRain = sub === 'WRAINB' || searchName.includes('黑色暴雨') || searchName.includes('黑雨');

  if (imgError) {
    if (isRain) {
      if (isYellowRain) {
        return (
          <div className="bg-[#ffcc00] text-black font-black text-[11px] px-1.5 py-0.5 rounded shadow-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none select-none">
            🌧️ 黃雨
          </div>
        );
      }
      if (isRedRain) {
        return (
          <div className="bg-[#ff3b30] text-white font-black text-[11px] px-1.5 py-0.5 rounded shadow-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none select-none">
            🌧️ 紅雨
          </div>
        );
      }
      if (isBlackRain) {
        return (
          <div className="bg-black text-white border border-purple-500 font-black text-[11px] px-1.5 py-0.5 rounded shadow-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none select-none">
            🌧️ 黑雨
          </div>
        );
      }
      return (
        <div className="bg-[#ffcc00] text-black font-black text-[11px] px-1.5 py-0.5 rounded shadow-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none select-none">
          🌧️ 暴雨
        </div>
      );
    }

    const isTC = upperCode === 'TC' || sub.startsWith('TC') || searchName.includes('風球') || searchName.includes('熱帶氣旋') || searchName.includes('信號');
    if (isTC) {
      let tcText = '1號';
      if (sub.includes('8') || searchName.includes('8號') || searchName.includes('八號')) tcText = '8號風球';
      else if (sub.includes('9') || searchName.includes('9號') || searchName.includes('九號')) tcText = '9號風球';
      else if (sub.includes('10') || searchName.includes('10號') || searchName.includes('十號')) tcText = '10號颶風';
      else if (sub.includes('3') || searchName.includes('3號') || searchName.includes('三號')) tcText = '3號強風';
      else if (sub.includes('1') || searchName.includes('1號') || searchName.includes('一號')) tcText = '1號戒備';

      return (
        <div className="bg-red-600 text-white font-black text-[11px] px-1.5 py-0.5 rounded shadow-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none select-none">
          🌀 {tcText}
        </div>
      );
    }

    if (upperCode === 'WTS' || searchName.includes('雷暴')) {
      return (
        <div className="bg-amber-500 text-black font-black text-[11px] px-1.5 py-0.5 rounded shadow-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none select-none">
          🌩️ 雷暴
        </div>
      );
    }

    return (
      <div className="bg-red-500 text-white font-bold text-[11px] px-1.5 py-0.5 rounded shadow-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none select-none">
        ⚠️ {searchName || '警告'}
      </div>
    );
  }

  return (
    <img
      src={getHKOIconUrl(code, subtype, name)}
      alt={name}
      className={`${iconSizeClassName} object-contain ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
    />
  );
};
