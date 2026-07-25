export const getHKOIconUrl = (code?: string, subtype?: string, name?: string): string => {
  const baseUrl = "https://www.hko.gov.hk/tc/wxinfo/dailywx/images/";
  
  // Normalize parameters
  const upperCode = code?.toUpperCase() || '';
  const upperSubtype = subtype?.toUpperCase() || '';
  const searchString = name || '';

  // 1. Check direct code and subtype mappings
  if (upperCode === 'TC' || upperSubtype.startsWith('TC')) {
    if (upperSubtype === 'TC1') return `${baseUrl}tc1.gif`;
    if (upperSubtype === 'TC3') return `${baseUrl}tc3.gif`;
    if (upperSubtype === 'TC8NE') return `${baseUrl}tc8ne.gif`;
    if (upperSubtype === 'TC8SE') return `${baseUrl}tc8se.gif`;
    if (upperSubtype === 'TC8NW') return `${baseUrl}tc8nw.gif`;
    if (upperSubtype === 'TC8SW') return `${baseUrl}tc8sw.gif`;
    if (upperSubtype.includes('TC8')) return `${baseUrl}tc8ne.gif`;
    if (upperSubtype === 'TC9') return `${baseUrl}tc9.gif`;
    if (upperSubtype === 'TC10') return `${baseUrl}tc10.gif`;
  }
  
  if (upperCode === 'WRAIN') {
    if (upperSubtype === 'WRAINY') return `${baseUrl}rainy.gif`; // 黃雨
    if (upperSubtype === 'WRAINR') return `${baseUrl}rainr.gif`; // 紅雨
    if (upperSubtype === 'WRAINB') return `${baseUrl}rainb.gif`; // 黑雨
    return `${baseUrl}rainy.gif`;
  }
  
  if (upperCode === 'WTS') return `${baseUrl}ts.gif`; // 雷暴
  if (upperCode === 'WMSGD') return `${baseUrl}mon.gif`; // 強烈季候風
  if (upperCode === 'WL') return `${baseUrl}landslip.gif`; // 山泥傾瀉
  if (upperCode === 'WFIREW') return `${baseUrl}firer.gif`; // 火災警告
  if (upperCode === 'WFROST') return `${baseUrl}frost.gif`; // 霜凍
  if (upperCode === 'WHOT') return `${baseUrl}vhot.gif`; // 酷熱
  if (upperCode === 'WCOLD') return `${baseUrl}cold.gif`; // 寒冷

  // 2. Fallback based on name search (for simulated warnings or missing code/subtype)
  if (searchString.includes('八號東北') || searchString.includes('8號東北')) return `${baseUrl}tc8ne.gif`;
  if (searchString.includes('八號東南') || searchString.includes('8號東南')) return `${baseUrl}tc8se.gif`;
  if (searchString.includes('八號西北') || searchString.includes('8號西北')) return `${baseUrl}tc8nw.gif`;
  if (searchString.includes('八號西南') || searchString.includes('8號西南')) return `${baseUrl}tc8sw.gif`;
  if (searchString.includes('八號') || searchString.includes('8號')) return `${baseUrl}tc8ne.gif`; // Default TC8
  if (searchString.includes('九號') || searchString.includes('9號')) return `${baseUrl}tc9.gif`;
  if (searchString.includes('十號') || searchString.includes('10號')) return `${baseUrl}tc10.gif`;
  if (searchString.includes('三號') || searchString.includes('3號')) return `${baseUrl}tc3.gif`;
  if (searchString.includes('一號') || searchString.includes('1號')) return `${baseUrl}tc1.gif`;
  if (searchString.includes('熱帶氣旋')) return `${baseUrl}tc1.gif`;

  if (searchString.includes('黃色暴雨') || searchString.includes('黃雨')) return `${baseUrl}rainy.gif`;
  if (searchString.includes('紅色暴雨') || searchString.includes('紅雨')) return `${baseUrl}rainr.gif`;
  if (searchString.includes('黑色暴雨') || searchString.includes('黑雨')) return `${baseUrl}rainb.gif`;
  if (searchString.includes('暴雨')) return `${baseUrl}rainy.gif`;

  if (searchString.includes('雷暴')) return `${baseUrl}ts.gif`;
  if (searchString.includes('季候風')) return `${baseUrl}mon.gif`;
  if (searchString.includes('山泥傾瀉')) return `${baseUrl}landslip.gif`;
  if (searchString.includes('火災') || searchString.includes('紅色火災') || searchString.includes('黃色火災')) return `${baseUrl}firer.gif`;
  if (searchString.includes('霜凍')) return `${baseUrl}frost.gif`;
  if (searchString.includes('酷熱')) return `${baseUrl}vhot.gif`;
  if (searchString.includes('寒冷')) return `${baseUrl}cold.gif`;

  // Default fallback icon
  return `${baseUrl}ts.gif`;
};
