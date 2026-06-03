export const getDynamicInvitationCode = (): string => {
  const epoch = new Date("2026-01-01").getTime(); // 以 2026 年元旦為基準點
  const now = Date.now();
  const fortnightInMs = 14 * 24 * 60 * 60 * 1000; // 14天的毫秒數
  const periodIndex = Math.floor((now - epoch) / fortnightInMs); // 計算當前是第幾個14天
  
  // 利用 periodIndex 作為種子，生成一個穩定的 6 位隨機英數字串
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 剔除易混淆的 0, O, 1, I
  let seededRandomCode = "S5_";
  let hash = periodIndex * 1234567; // 簡單的雜湊運算
  for (let i = 0; i < 4; i++) {
    hash = (hash * 9301 + 49297) % 233280;
    seededRandomCode += chars[hash % chars.length];
  }
  return seededRandomCode; // 輸出範例: "S5_X7RF"
};
