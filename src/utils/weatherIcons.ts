import React from 'react';

export interface WeatherWarningItem {
  code?: string;
  subCode?: string;
  subtype?: string;
  name?: string;
  actionCode?: string;
  contents?: string[];
  warningStatementCode?: string;
}

/**
 * 依據香港天文台警告項目精準解析官方圖示 URL
 * 🌟 核心修復：嚴格分開處理 WMS（強烈季候風信號）與 WTCSIGNAL（熱帶氣旋警告信號），禁止將季候風誤判為 1 號風球
 */
export const getWeatherWarningIcon = (
  itemOrCode?: WeatherWarningItem | string,
  subtypeParam?: string,
  nameParam?: string
): string => {
  const hkoBaseUrl = "https://www.hko.gov.hk/tc/wxinfo/dailywx/images/";
  const weatherBaseUrl = "https://www.weather.gov.hk/tc/wxinfo/dailywx/images/";

  let code = '';
  let subtype = '';
  let name = '';
  let contentsText = '';

  if (typeof itemOrCode === 'object' && itemOrCode !== null) {
    code = (itemOrCode.warningStatementCode || itemOrCode.code || '').toUpperCase();
    subtype = (itemOrCode.subCode || itemOrCode.subtype || '').toUpperCase();
    name = itemOrCode.name || itemOrCode.actionCode || '';
    contentsText = itemOrCode.contents ? itemOrCode.contents.join(' ') : '';
  } else if (typeof itemOrCode === 'string') {
    code = itemOrCode.toUpperCase();
    subtype = (subtypeParam || '').toUpperCase();
    name = nameParam || '';
  } else {
    subtype = (subtypeParam || '').toUpperCase();
    name = nameParam || '';
  }

  const searchString = `${name} ${contentsText}`.trim();

  // 1️⃣ 強烈季候風信號 (Strong Monsoon Signal) 🌟 核心修復 (優先判定，禁止誤判為風球)
  if (
    code === 'WMS' || 
    code === 'SMS' || 
    code === 'WMSGD' || 
    subtype === 'SMS' ||
    searchString.includes('季候風') || 
    searchString.includes('Monsoon')
  ) {
    return `${hkoBaseUrl}sms.gif`;
  }

  // 2️⃣ 暴雨警告信號 (Rainstorm Warning) - 黃雨 / 紅雨 / 黑雨
  if (code === 'WRAIN' || code === 'WRAINW' || searchString.includes('暴雨')) {
    if (subtype === 'WRAINY' || subtype.includes('Y') || searchString.includes('黃色暴雨') || searchString.includes('黃雨')) {
      return `${weatherBaseUrl}rainy.gif`;
    }
    if (subtype === 'WRAINR' || subtype.includes('R') || searchString.includes('紅色暴雨') || searchString.includes('紅雨')) {
      return `${weatherBaseUrl}rainr.gif`;
    }
    if (subtype === 'WRAINB' || subtype.includes('B') || searchString.includes('黑色暴雨') || searchString.includes('黑雨')) {
      return `${weatherBaseUrl}rainb.gif`;
    }
    // 預設為黃雨
    return `${weatherBaseUrl}rainy.gif`;
  }

  // 3️⃣ 火災危險警告 (Fire Danger Warning) - 黃火 / 紅火
  if (code === 'WFIRE' || code === 'WFIREW' || searchString.includes('火災')) {
    if (subtype.includes('Y') || subtype === 'WFIREY' || searchString.includes('黃色') || searchString.includes('黃火')) {
      return `${hkoBaseUrl}firey.gif`;
    }
    if (subtype.includes('R') || subtype === 'WFIRER' || searchString.includes('紅色') || searchString.includes('紅火')) {
      return `${hkoBaseUrl}firer.gif`;
    }
    return searchString.includes('黃') ? `${hkoBaseUrl}firey.gif` : `${hkoBaseUrl}firer.gif`;
  }

  // 4️⃣ 熱帶氣旋警告信號 (Tropical Cyclone) - 一號 / 三號 / 八號 / 九號 / 十號
  if (code === 'WTCSIGNAL' || code === 'TC' || subtype.startsWith('TC') || searchString.includes('熱帶氣旋') || searchString.includes('風球')) {
    if (subtype === 'TC1' || searchString.includes('一號') || searchString.includes('1號')) {
      return `${hkoBaseUrl}tc1.gif`;
    }
    if (subtype === 'TC3' || searchString.includes('三號') || searchString.includes('3號')) {
      return `${hkoBaseUrl}tc3.gif`;
    }
    if (subtype === 'TC8NE' || searchString.includes('八號東北') || searchString.includes('8號東北')) {
      return `${hkoBaseUrl}tc8ne.gif`;
    }
    if (subtype === 'TC8SE' || searchString.includes('八號東南') || searchString.includes('8號東南')) {
      return `${hkoBaseUrl}tc8se.gif`;
    }
    if (subtype === 'TC8NW' || searchString.includes('八號西北') || searchString.includes('8號西北')) {
      return `${hkoBaseUrl}tc8nw.gif`;
    }
    if (subtype === 'TC8SW' || searchString.includes('八號西南') || searchString.includes('8號西南')) {
      return `${hkoBaseUrl}tc8sw.gif`;
    }
    if (subtype.includes('8') || searchString.includes('八號') || searchString.includes('8號')) {
      return `${hkoBaseUrl}tc8b.gif`;
    }
    if (subtype === 'TC9' || searchString.includes('九號') || searchString.includes('9號')) {
      return `${hkoBaseUrl}tc9.gif`;
    }
    if (subtype === 'TC10' || searchString.includes('十號') || searchString.includes('10號')) {
      return `${hkoBaseUrl}tc10.gif`;
    }
    // 預設 1 號戒備
    return `${hkoBaseUrl}tc1.gif`;
  }

  // 5️⃣ 雷暴及其他警告
  if (code === 'WTS' || code === 'WTCS' || searchString.includes('雷暴')) {
    return `${hkoBaseUrl}ts.gif`;
  }
  if (code === 'WL' || code === 'WLANDSLIP' || searchString.includes('山泥傾瀉')) {
    return `${hkoBaseUrl}landslip.gif`;
  }
  if (code === 'WFROST' || searchString.includes('霜凍')) {
    return `${hkoBaseUrl}frost.gif`;
  }
  if (code === 'WHOT' || searchString.includes('酷熱')) {
    return `${hkoBaseUrl}vhot.gif`;
  }
  if (code === 'WCOLD' || searchString.includes('寒冷')) {
    return `${hkoBaseUrl}cold.gif`;
  }
  if (searchString.includes('海嘯')) {
    return `${hkoBaseUrl}tsunami-warn.gif`;
  }

  // 預設雷暴警告圖示
  return `${hkoBaseUrl}ts.gif`;
};

/**
 * 相容既有介面之呼叫封裝
 */
export const getHKOIconUrl = (code?: string, subtype?: string, name?: string): string => {
  return getWeatherWarningIcon(code, subtype, name);
};

/**
 * 圖片加載失敗防護：優先匹配強烈季候風 (sms.gif)，避免誤退回至 1 號風球
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

  // 1️⃣ 強烈季候風 (絕對優先，禁止套用風球)
  if (
    upperCode === 'WMS' || 
    upperCode === 'SMS' || 
    upperCode === 'WMSGD' || 
    searchStr.includes('季候風') || 
    searchStr.includes('Monsoon')
  ) {
    target.src = 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/sms.gif';
    return;
  }

  // 2️⃣ 暴雨
  if (upperCode === 'WRAIN' || searchStr.includes('暴雨') || searchStr.includes('雨')) {
    target.src = 'https://www.weather.gov.hk/tc/wxinfo/dailywx/images/rainy.gif';
    return;
  }

  // 3️⃣ 火災危險
  if (upperCode === 'WFIRE' || upperCode === 'WFIREW' || searchStr.includes('火災')) {
    const isYellowFire = searchStr.includes('黃色') || searchStr.includes('黃火');
    target.src = isYellowFire 
      ? 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/firey.gif'
      : 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/firer.gif';
    return;
  }

  // 4️⃣ 熱帶氣旋 (僅在明確包含風球或熱帶氣旋時才套用)
  if (upperCode === 'TC' || upperCode === 'WTCSIGNAL' || searchStr.includes('風球') || searchStr.includes('熱帶氣旋')) {
    target.src = 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/tc1.gif';
    return;
  }

  // 5️⃣ 雷暴及其他
  target.src = 'https://www.hko.gov.hk/tc/wxinfo/dailywx/images/ts.gif';
};
