import { createWorker } from 'tesseract.js';

export interface ExtractedDashboardData {
  odoKM: number | null;
  soc: number | null;
  kwhAdded: number | null;
  amountHKD: number | null;
  rawText: string;
  confidence?: number;
}

/**
 * 對圖像進行優化預處理以提升儀表板螢幕/單據的 OCR 辨識精準度
 */
const preprocessImage = async (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(url);
          return;
        }

        // 縮放尺寸至合適解析度（最大寬/高 1600px），避免手機大圖導致記憶體過載
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        // 取得像素並進行灰階 + 對比度增強
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const contrast = 1.3; // 提升 30% 對比度
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          // 灰階加權
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // 對比度變換
          const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }

        ctx.putImageData(imageData, 0, 0);
        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        URL.revokeObjectURL(url);
        resolve(processedDataUrl);
      } catch (err) {
        console.warn('圖像預處理降級為原圖：', err);
        URL.revokeObjectURL(url);
        resolve(url);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('無法載入圖像檔案進行辨識'));
    };
    img.src = url;
  });
};

/**
 * 儀表板及充電/停車單據數據解析核心
 */
export const parseDashboardText = (text: string): ExtractedDashboardData => {
  const cleaned = text.replace(/,/g, ''); // 移除千分位逗號，便於 regex 抓取
  
  // 1. 抓取 ODO 總里程 (匹配 4-6 位數字伴隨 KM 或 ODO 標籤)
  let odoKM: number | null = null;
  const odoMatchWithKm = cleaned.match(/(?:ODO|odo|Total|TOTAL|里程|總里程)?\s*[:\s]?\s*(\d{4,6})\s*(km|KM|Km)\b/i);
  if (odoMatchWithKm && odoMatchWithKm[1]) {
    odoKM = Number(odoMatchWithKm[1]);
  } else {
    // 嘗試抓取標有 ODO 的純數字
    const odoPrefixMatch = cleaned.match(/(?:ODO|里程|TOTAL)\s*[:\s]?\s*(\d{4,6})\b/i);
    if (odoPrefixMatch && odoPrefixMatch[1]) {
      odoKM = Number(odoPrefixMatch[1]);
    } else {
      // 容錯：尋找任何合理的 5 位數字（私家車常見總里程）
      const fiveDigitMatch = cleaned.match(/\b([1-9]\d{4,5})\b/);
      if (fiveDigitMatch && fiveDigitMatch[1]) {
        odoKM = Number(fiveDigitMatch[1]);
      }
    }
  }

  // 2. 抓取電量百分比 (1-3 位數字伴隨 % 或 SOC)
  let soc: number | null = null;
  const socMatch = cleaned.match(/(\d{1,3})\s*%/);
  if (socMatch && socMatch[1]) {
    const val = Number(socMatch[1]);
    if (val >= 0 && val <= 100) soc = val;
  }
  if (soc === null) {
    const socTagMatch = cleaned.match(/(?:SOC|Battery|電量)\s*[:\s]?\s*(\d{1,3})\b/i);
    if (socTagMatch && socTagMatch[1]) {
      const val = Number(socTagMatch[1]);
      if (val >= 0 && val <= 100) soc = val;
    }
  }

  // 3. 抓取充電度數 kWh (如 42.5 kWh 或 30度)
  let kwhAdded: number | null = null;
  const kwhMatch = cleaned.match(/(\d{1,3}(?:\.\d{1,2})?)\s*(?:kWh|度|KWH|kwh)\b/i);
  if (kwhMatch && kwhMatch[1]) {
    kwhAdded = Number(kwhMatch[1]);
  } else {
    const energyMatch = cleaned.match(/(?:充電量|度數|Energy|ENERGY)\s*[:\s]?\s*(\d{1,3}(?:\.\d{1,2})?)/i);
    if (energyMatch && energyMatch[1]) {
      kwhAdded = Number(energyMatch[1]);
    }
  }

  // 4. 抓取費用/金額 (如 $128.50, HK$ 150, 實付 $80 等)
  let amountHKD: number | null = null;
  const priceMatch = cleaned.match(/(?:HKD|HK\$|\$)\s*(\d{1,4}(?:\.\d{1,2})?)/i);
  if (priceMatch && priceMatch[1]) {
    amountHKD = Number(priceMatch[1]);
  } else {
    const totalMatch = cleaned.match(/(?:總額|合計|金額|Total|Amount|實付|實收)\s*[:\$]?\s*(\d{1,4}(?:\.\d{1,2})?)/i);
    if (totalMatch && totalMatch[1]) {
      amountHKD = Number(totalMatch[1]);
    }
  }

  return {
    odoKM,
    soc,
    kwhAdded,
    amountHKD,
    rawText: text
  };
};

/**
 * 調用 Tesseract 辨識儀表板或單據相片
 */
export const scanDashboardImage = async (
  file: File | Blob,
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<ExtractedDashboardData> => {
  if (onProgress) onProgress(15, '正在對相片進行對比度優化處理...');
  const processedImage = await preprocessImage(file);

  if (onProgress) onProgress(35, '正在啟動 OCR 神經網路辨識核心...');
  
  // 建立英數辨識 worker
  const worker = await createWorker('eng');

  try {
    if (onProgress) onProgress(60, '正在辨識儀表板數字與單據文字...');
    const result = await worker.recognize(processedImage);

    if (onProgress) onProgress(90, '正在智能擷取里程、電量與金額數據...');
    const text = result.data.text || '';
    const extracted = parseDashboardText(text);
    extracted.confidence = result.data.confidence;

    if (onProgress) onProgress(100, '辨識完成！');
    return extracted;
  } finally {
    try {
      await worker.terminate();
    } catch (e) {
      // 忽略 terminate 例外
    }
  }
};
