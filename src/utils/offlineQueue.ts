import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

export const QUEUE_KEY = 'smart5_offline_queue';
export const BACKUP_QUEUE_KEY = 'offline_pending_records';

export interface OfflineRecordData {
  id: string;
  queuedAt: number;
  userId?: string;
  vehicleId?: string;
  plateNumber?: string;
  type: string;
  amountHKD: number;
  kwhAdded?: number;
  location?: string;
  recordDateStr?: string;
  notes?: string;
  odoKM?: number;
  currentSOC?: number;
  consumption?: number;
  odometer?: number;
  batteryPercent?: number;
  startSoc?: number;
  endSoc?: number;
  isCharging?: boolean;
  cost?: number;
  [key: string]: any;
}

// 讀取離線隊列
export const getOfflineQueue = (): OfflineRecordData[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY) || localStorage.getItem(BACKUP_QUEUE_KEY) || '[]';
    const queue = JSON.parse(raw);
    return Array.isArray(queue) ? queue : [];
  } catch (e) {
    console.error('Failed to parse offline queue:', e);
    return [];
  }
};

// 儲存隊列至本地快取
const saveQueueToStorage = (queue: OfflineRecordData[]) => {
  if (typeof window === 'undefined') return;
  const jsonStr = JSON.stringify(queue);
  localStorage.setItem(QUEUE_KEY, jsonStr);
  localStorage.setItem(BACKUP_QUEUE_KEY, jsonStr);
};

// 存入離線隊列
export const saveOfflineRecord = (recordData: Partial<OfflineRecordData>): OfflineRecordData => {
  const queue = getOfflineQueue();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Format date if needed
  let recordDateStr = new Date().toISOString();
  if (recordData.recordDate) {
    if (recordData.recordDate instanceof Date) {
      recordDateStr = recordData.recordDate.toISOString();
    } else if (typeof (recordData.recordDate as any)?.toDate === 'function') {
      recordDateStr = (recordData.recordDate as any).toDate().toISOString();
    } else if (typeof recordData.recordDate === 'string') {
      recordDateStr = recordData.recordDate;
    }
  }

  const newEntry: OfflineRecordData = {
    ...recordData,
    id,
    queuedAt: Date.now(),
    type: recordData.type || 'driving',
    amountHKD: Number(recordData.amountHKD) || 0,
    recordDateStr
  };

  queue.push(newEntry);
  saveQueueToStorage(queue);

  // 派發自定義事件供全站 UI 即刻更新計數
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smart5_offline_queue_changed', { 
      detail: { count: queue.length, lastAdded: newEntry } 
    }));
  }

  return newEntry;
};

// 移除單筆
export const removeOfflineRecord = (id: string): void => {
  const queue = getOfflineQueue().filter(item => item.id !== id);
  saveQueueToStorage(queue);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smart5_offline_queue_changed', { 
      detail: { count: queue.length } 
    }));
  }
};

// 清空所有離線記錄
export const clearOfflineQueue = (): void => {
  saveQueueToStorage([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smart5_offline_queue_changed', { 
      detail: { count: 0 } 
    }));
  }
};

// 上線時自動批次同步至 Firestore
export const syncOfflineQueue = async (
  onProgress?: (synced: number, total: number) => void
): Promise<{ success: boolean; syncedCount: number; errors: any[] }> => {
  if (typeof window === 'undefined') return { success: true, syncedCount: 0, errors: [] };
  if (!navigator.onLine) {
    return { success: false, syncedCount: 0, errors: ['Offline (No internet connection)'] };
  }

  const uid = auth.currentUser?.uid;
  if (!uid) {
    return { success: false, syncedCount: 0, errors: ['No authenticated user found'] };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, errors: [] };
  }

  console.log(`[OfflineSync] 開始批次上傳 ${queue.length} 筆離線暫存記錄...`);

  const remainingQueue: OfflineRecordData[] = [];
  let syncedCount = 0;
  const errors: any[] = [];

  for (const record of queue) {
    try {
      // 轉換時間為 Firestore Timestamp
      let recordTimestamp: Timestamp;
      if (record.recordDateStr) {
        const d = new Date(record.recordDateStr);
        recordTimestamp = isNaN(d.getTime()) ? Timestamp.now() : Timestamp.fromDate(d);
      } else {
        recordTimestamp = Timestamp.now();
      }

      const docData: any = {
        userId: uid,
        vehicleId: record.vehicleId || '',
        plateNumber: record.plateNumber || '',
        type: record.type || 'driving',
        amountHKD: Number(record.amountHKD) || 0,
        kwhAdded: record.type === 'charging' ? (Number(record.kwhAdded) || 0) : 0,
        location: record.location || '',
        recordDate: recordTimestamp,
        notes: record.notes || '',
        createdAt: serverTimestamp(),
        isOfflineSynced: true,
        offlineQueuedAt: record.queuedAt || Date.now()
      };

      if (record.odometer !== undefined && record.odometer !== null && !isNaN(Number(record.odometer))) {
        docData.odometer = Number(record.odometer);
      }
      if (record.odoKM !== undefined && record.odoKM !== null && !isNaN(Number(record.odoKM))) {
        docData.odoKM = Number(record.odoKM);
        docData.odometer = Number(record.odoKM);
      }
      if (record.currentSOC !== undefined && record.currentSOC !== null && !isNaN(Number(record.currentSOC))) {
        docData.currentSOC = Number(record.currentSOC);
        docData.batteryPercent = Number(record.currentSOC);
        docData.endSoc = Number(record.currentSOC);
      }
      if (record.consumption !== undefined && record.consumption !== null && !isNaN(Number(record.consumption))) {
        docData.consumption = Number(record.consumption);
      }
      if (record.cost !== undefined && !isNaN(Number(record.cost))) {
        docData.cost = Number(record.cost);
      }

      // 寫入 Firestore records
      await addDoc(collection(db, 'records'), docData);

      // 若為日常行車或包含里程/電量，同步更新用戶主檔案與 userProfiles
      const odoVal = docData.odoKM ?? docData.odometer;
      const socVal = docData.currentSOC ?? docData.batteryPercent;

      if (odoVal !== undefined || socVal !== undefined) {
        const updatePayload: any = {
          updatedAt: serverTimestamp()
        };
        if (odoVal !== undefined) updatePayload.currentODO = Number(odoVal);
        if (socVal !== undefined) updatePayload.baseSOC = Number(socVal);

        try {
          await setDoc(doc(db, 'users', uid), updatePayload, { merge: true });
        } catch (uErr) {
          console.warn('[OfflineSync] Could not update users directly:', uErr);
        }

        try {
          await updateDoc(doc(db, 'userProfiles', uid), updatePayload);
        } catch (pErr) {
          console.warn('[OfflineSync] Could not update userProfiles doc:', pErr);
        }
      }

      syncedCount++;
      if (onProgress) onProgress(syncedCount, queue.length);
    } catch (err: any) {
      console.error('[OfflineSync] 同步失敗，保留在隊列：', err);
      errors.push(err);
      remainingQueue.push(record);
    }
  }

  saveQueueToStorage(remainingQueue);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smart5_offline_queue_changed', { 
      detail: { count: remainingQueue.length, syncedCount } 
    }));
  }

  console.log(`[OfflineSync] 完成批次上傳：成功 ${syncedCount} 筆，剩餘 ${remainingQueue.length} 筆`);
  return {
    success: remainingQueue.length === 0,
    syncedCount,
    errors
  };
};

// 註冊上線自動同步監聽
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 檢測到網絡恢復連線，自動啟動離線暫存同步隊列...');
    syncOfflineQueue();
  });
}
