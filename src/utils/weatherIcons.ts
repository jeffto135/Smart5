import React from 'react';

export const getHKOIconUrl = (code?: string, subtype?: string, name?: string): string => {
  const baseUrl = "https://www.weather.gov.hk/tc/wxinfo/dailywx/images/";
  const hkoBaseUrl = "https://www.hko.gov.hk/tc/wxinfo/dailywx/images/";
  
  const upperCode = code?.toUpperCase() || '';
  const sub = subtype?.toUpperCase() || '';
  const searchString = name || '';

  // 1. 暴雨警告（精準區分黃/紅/黑 - 採用高可用 weather.gov.hk 圖源）
  if (upperCode === 'WRAIN') {
    if (sub === 'WRAINY' || searchString.includes('黃')) return `${baseUrl}rainy.gif`; // 黃雨
    if (sub === 'WRAINR' || searchString.includes('紅')) return `${baseUrl}rainr.gif`; // 紅雨
    if (sub === 'WRAINB' || searchString.includes('黑')) return `${baseUrl}rainb.gif`; // 黑雨
    return `${baseUrl}rainy.gif`;
  }

  // 2. 熱帶氣旋（風球 - 嚴格比對）
  if (upperCode === 'TC' || sub.startsWith('TC')) {
    if (sub === 'TC1') return `${hkoBaseUrl}tc1.gif`;
    if (sub === 'TC3') return `${hkoBaseUrl}tc3.gif`;
    if (sub === 'TC8NE') return `${hkoBaseUrl}tc8ne.gif`;
    if (sub === 'TC8SE') return `${hkoBaseUrl}tc8se.gif`;
    if (sub === 'TC8NW') return `${hkoBaseUrl}tc8nw.gif`;
    if (sub === 'TC8SW') return `${hkoBaseUrl}tc8sw.gif`;
    if (sub.includes('TC8')) return `${hkoBaseUrl}tc8ne.gif`;
    if (sub === 'TC9') return `${hkoBaseUrl}tc9.gif`;
    if (sub === 'TC10') return `${hkoBaseUrl}tc10.gif`;
    if (searchString.includes('一號') || searchString.includes('1號')) return `${hkoBaseUrl}tc1.gif`;
    if (searchString.includes('三號') || searchString.includes('3號')) return `${hkoBaseUrl}tc3.gif`;
    if (searchString.includes('八號東北') || searchString.includes('8號東北')) return `${hkoBaseUrl}tc8ne.gif`;
    if (searchString.includes('八號東南') || searchString.includes('8號東南')) return `${hkoBaseUrl}tc8se.gif`;
    if (searchString.includes('八號西北') || searchString.includes('8號西北')) return `${hkoBaseUrl}tc8nw.gif`;
    if (searchString.includes('八號西南') || searchString.includes('8號西南')) return `${hkoBaseUrl}tc8sw.gif`;
    if (searchString.includes('八號') || searchString.includes('8號')) return `${hkoBaseUrl}tc8ne.gif`;
    if (searchString.includes('九號') || searchString.includes('9號')) return `${hkoBaseUrl}tc9.gif`;
    if (searchString.includes('十號') || searchString.includes('10號')) return `${hkoBaseUrl}tc10.gif`;
    return `${hkoBaseUrl}tc1.gif`;
  }

  // 3. 雷暴及其他天氣警告
  if (upperCode === 'WTS') return `${hkoBaseUrl}ts.gif`; // 雷暴
  if (upperCode === 'WMSGD') return `${hkoBaseUrl}mon.gif`; // 強烈季候風
  if (upperCode === 'WL') return `${hkoBaseUrl}landslip.gif`; // 山泥傾瀉
  if (upperCode === 'WFIREW' || upperCode === 'WFIRE') return `${hkoBaseUrl}firer.gif`; // 火災警告
  if (upperCode === 'WFROST') return `${hkoBaseUrl}frost.gif`; // 霜凍
  if (upperCode === 'WHOT') return `${hkoBaseUrl}vhot.gif`; // 酷熱
  if (upperCode === 'WCOLD') return `${hkoBaseUrl}cold.gif`; // 寒冷

  // 4. Fallback based on name search
  if (searchString.includes('八號東北') || searchString.includes('8號東北')) return `${hkoBaseUrl}tc8ne.gif`;
  if (searchString.includes('八號東南') || searchString.includes('8號東南')) return `${hkoBaseUrl}tc8se.gif`;
  if (searchString.includes('八號西北') || searchString.includes('8號西北')) return `${hkoBaseUrl}tc8nw.gif`;
  if (searchString.includes('八號西南') || searchString.includes('8號西南')) return `${hkoBaseUrl}tc8sw.gif`;
  if (searchString.includes('八號') || searchString.includes('8號')) return `${hkoBaseUrl}tc8ne.gif`;
  if (searchString.includes('九號') || searchString.includes('9號')) return `${hkoBaseUrl}tc9.gif`;
  if (searchString.includes('十號') || searchString.includes('10號')) return `${hkoBaseUrl}tc10.gif`;
  if (searchString.includes('三號') || searchString.includes('3號')) return `${hkoBaseUrl}tc3.gif`;
  if (searchString.includes('一號') || searchString.includes('1號')) return `${hkoBaseUrl}tc1.gif`;
  if (searchString.includes('熱帶氣旋')) return `${hkoBaseUrl}tc1.gif`;

  if (searchString.includes('黃色暴雨') || searchString.includes('黃雨')) return `${baseUrl}rainy.gif`;
  if (searchString.includes('紅色暴雨') || searchString.includes('紅雨')) return `${baseUrl}rainr.gif`;
  if (searchString.includes('黑色暴雨') || searchString.includes('黑雨')) return `${baseUrl}rainb.gif`;
  if (searchString.includes('暴雨')) return `${baseUrl}rainy.gif`;

  if (searchString.includes('雷暴')) return `${hkoBaseUrl}ts.gif`;
  if (searchString.includes('季候風')) return `${hkoBaseUrl}mon.gif`;
  if (searchString.includes('山泥傾瀉')) return `${hkoBaseUrl}landslip.gif`;
  if (searchString.includes('火災')) return `${hkoBaseUrl}firer.gif`;
  if (searchString.includes('霜凍')) return `${hkoBaseUrl}frost.gif`;
  if (searchString.includes('酷熱')) return `${hkoBaseUrl}vhot.gif`;
  if (searchString.includes('寒冷')) return `${hkoBaseUrl}cold.gif`;

  return `${hkoBaseUrl}ts.gif`;
};

/**
 * Image onError fallback handler to prevent broken icons (blue question mark ❓)
 */
export const handleHKOIconError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  code?: string,
  name?: string
) => {
  const target = e.currentTarget;
  target.onerror = null; // Prevent infinite fallback loops
  
  const searchStr = name || '';
  const upperCode = code?.toUpperCase() || '';

  if (upperCode === 'WRAIN' || searchStr.includes('暴雨') || searchStr.includes('雨')) {
    target.src = 'https://www.weather.gov.hk/tc/wxinfo/dailywx/images/rainy.gif';
  } else if (upperCode === 'TC' || searchStr.includes('風球') || searchStr.includes('信號') || searchStr.includes('熱帶氣旋')) {
    target.src = 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/tc1.gif';
  } else if (upperCode === 'WTS' || searchStr.includes('雷暴')) {
    target.src = 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/ts.gif';
  } else {
    target.src = 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/ts.gif';
  }
};

