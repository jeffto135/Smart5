import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Trash2, Calendar, Gauge, FileText, Check, Loader } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { format } from 'date-fns';

interface MaintenanceLog {
  id: string;
  actualKM: number;
  actualDate: any; // Timestamp or Date
  remarks?: string;
  createdAt?: any;
}

interface MaintenanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  joinedAt?: any;
}

export const MaintenanceHistoryModal: React.FC<MaintenanceHistoryModalProps> = ({
  isOpen,
  onClose,
  uid,
  joinedAt
}) => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editKM, setEditKM] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation State
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real-time subscribe to the logs
  useEffect(() => {
    if (!isOpen || !uid) return;
    
    setLoading(true);
    const q = query(
      collection(db, 'users', uid, 'maintenance_logs'),
      orderBy('actualDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: MaintenanceLog[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          actualKM: Number(data.actualKM || 0),
          actualDate: data.actualDate,
          remarks: data.remarks || data.notes || '',
          createdAt: data.createdAt
        };
      });
      setLogs(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching maintenance logs:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [isOpen, uid]);

  if (!isOpen) return null;

  const parseLogDateToInputFormat = (actualDate: any): string => {
    if (!actualDate) return '';
    let d: Date;
    if (typeof actualDate.toDate === 'function') {
      d = actualDate.toDate();
    } else if (actualDate instanceof Timestamp) {
      d = actualDate.toDate();
    } else {
      d = new Date(actualDate);
    }
    return format(d, 'yyyy-MM-dd');
  };

  const getDisplayDate = (actualDate: any): string => {
    if (!actualDate) return '未知日期';
    let d: Date;
    if (typeof actualDate.toDate === 'function') {
      d = actualDate.toDate();
    } else if (actualDate instanceof Timestamp) {
      d = actualDate.toDate();
    } else {
      d = new Date(actualDate);
    }
    return format(d, 'yyyy/MM/dd');
  };

  // Helper to sync main documents (users & userProfiles) with the latest maintenance milestone
  const syncMasterMaintenance = async (logsList: MaintenanceLog[]) => {
    // Sort logs by actualDate descending to find the latest
    const sorted = [...logsList].sort((a, b) => {
      const dateA = a.actualDate?.toDate ? a.actualDate.toDate().getTime() : new Date(a.actualDate).getTime();
      const dateB = b.actualDate?.toDate ? b.actualDate.toDate().getTime() : new Date(b.actualDate).getTime();
      return dateB - dateA;
    });

    const userProfilesRef = doc(db, 'userProfiles', uid);
    const usersRef = doc(db, 'users', uid);

    if (sorted.length > 0) {
      // Latest log
      const latest = sorted[0];
      const latestDateObj = latest.actualDate?.toDate ? latest.actualDate.toDate() : new Date(latest.actualDate);
      
      const updateData = {
        lastMaintenanceKM: Number(latest.actualKM),
        lastMaintenanceDate: latestDateObj,
        updatedAt: serverTimestamp()
      };

      await setDoc(userProfilesRef, updateData, { merge: true });
      try {
        await setDoc(usersRef, updateData, { merge: true });
      } catch (err) {
        console.warn("Failed to set users main doc, attempting update:", err);
        try {
          await updateDoc(usersRef, {
            lastMaintenanceKM: Number(latest.actualKM),
            lastMaintenanceDate: latestDateObj
          });
        } catch (innerErr) {
          console.warn("Update users doc failed:", innerErr);
        }
      }
    } else {
      // Rollback to no records (set back to 0)
      const updateData = {
        lastMaintenanceKM: 0,
        lastMaintenanceDate: null, // Fall back to account creation
        updatedAt: serverTimestamp()
      };

      await setDoc(userProfilesRef, updateData, { merge: true });
      try {
        await setDoc(usersRef, updateData, { merge: true });
      } catch (err) {
        console.warn("Failed to set users main doc to empty:", err);
        try {
          await updateDoc(usersRef, {
            lastMaintenanceKM: 0,
            lastMaintenanceDate: null
          });
        } catch (innerErr) {
          console.warn("Update users doc failed to empty:", innerErr);
        }
      }
    }
  };

  const handleStartEdit = (log: MaintenanceLog) => {
    setEditingLogId(log.id);
    setEditKM(log.actualKM.toString());
    setEditDate(parseLogDateToInputFormat(log.actualDate));
    setEditRemarks(log.remarks || '');
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditKM('');
    setEditDate('');
    setEditRemarks('');
  };

  const handleSaveEdit = async (logId: string) => {
    if (!editKM || !editDate) {
      alert('請填寫完整資訊！');
      return;
    }

    setIsSaving(true);
    try {
      const parsedDate = new Date(editDate);
      const parsedKM = Number(editKM);

      // Update in subcollections
      const logUpdate = {
        actualKM: parsedKM,
        actualDate: parsedDate,
        remarks: editRemarks
      };

      const userLogRef = doc(db, 'users', uid, 'maintenance_logs', logId);
      const profileLogRef = doc(db, 'userProfiles', uid, 'maintenance_logs', logId);

      await updateDoc(userLogRef, logUpdate);
      try {
        await updateDoc(profileLogRef, logUpdate);
      } catch (e) {
        console.warn("Could not update duplicate profile log:", e);
      }

      // Re-fetch remaining logs to sync with master user info
      const q = query(collection(db, 'users', uid, 'maintenance_logs'));
      const snapshot = await getDocs(q);
      const currentLogsList: MaintenanceLog[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          actualKM: Number(d.actualKM || 0),
          actualDate: d.actualDate,
          remarks: d.remarks || d.notes || ''
        };
      });

      await syncMasterMaintenance(currentLogsList);

      setEditingLogId(null);
      alert('保養紀錄修改成功 / LOG UPDATED SUCCESSFULLY');
    } catch (err: any) {
      alert('修改失敗：' + (err.message || '未知錯誤'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    setIsDeleting(true);
    try {
      const userLogRef = doc(db, 'users', uid, 'maintenance_logs', logId);
      const profileLogRef = doc(db, 'userProfiles', uid, 'maintenance_logs', logId);

      await deleteDoc(userLogRef);
      try {
        await deleteDoc(profileLogRef);
      } catch (e) {
        console.warn("Could not delete duplicate profile log:", e);
      }

      // Re-fetch remaining logs to calculate rollback state
      const q = query(collection(db, 'users', uid, 'maintenance_logs'));
      const snapshot = await getDocs(q);
      const remainingLogsList: MaintenanceLog[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          actualKM: Number(d.actualKM || 0),
          actualDate: d.actualDate,
          remarks: d.remarks || d.notes || ''
        };
      });

      await syncMasterMaintenance(remainingLogsList);

      setDeletingLogId(null);
      alert('保養紀錄已成功刪除 / LOG DELETED SUCCESSFULLY');
    } catch (err: any) {
      alert('刪除失敗：' + (err.message || '未知錯誤'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-card w-full max-w-lg p-6 relative z-10 border-cyber-green/30 max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-mono font-bold uppercase text-cyber-green">🔧 汽車電子保養履歷</h3>
            <p className="text-[10px] font-mono text-white/50 uppercase mt-0.5">Electronic Maintenance History Timeline</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader className="text-cyber-green animate-spin" size={32} />
              <span className="text-xs font-mono text-white/50">讀取資料中 / Loading Timeline...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.01] rounded-2xl border border-white/5 p-6">
              <span className="text-2xl block mb-2">📦</span>
              <p className="text-sm font-semibold text-white/80">尚無任何保養紀錄</p>
              <p className="text-xs text-white/40 mt-1">
                當里程碑提醒出現時，點擊「紀錄已回廠」即可新增您的第一筆履歷。
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-cyber-green/20 ml-4 pl-6 py-2 space-y-6">
              {logs.map((log, index) => {
                const isEditing = editingLogId === log.id;
                const isConfirmingDelete = deletingLogId === log.id;

                return (
                  <div key={log.id} className="relative group">
                    {/* Glowing Timeline Node */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#0d0d0d] border-2 border-cyber-green flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
                    </div>

                    <div className="glass-card p-4 border border-white/10 hover:border-cyber-green/20 transition-all rounded-xl bg-white/[0.01]">
                      {isEditing ? (
                        /* Edit Form */
                        <div className="space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-xs font-mono font-bold text-cyber-green uppercase">修改保養紀錄</span>
                            <span className="text-[10px] font-mono text-white/40">#{index + 1}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase">保養日期 / Date</label>
                              <div className="relative">
                                <Calendar size={12} className="absolute left-3 top-3.5 text-cyber-green" />
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-cyber-green"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase">里程 (KM) / Mileage</label>
                              <div className="relative">
                                <Gauge size={12} className="absolute left-3 top-3.5 text-cyber-green" />
                                <input
                                  type="number"
                                  value={editKM}
                                  onChange={(e) => setEditKM(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-cyber-green"
                                  required
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-white/40 uppercase">保養備忘錄 / Remarks</label>
                            <div className="relative">
                              <FileText size={12} className="absolute left-3 top-3 text-cyber-green" />
                              <textarea
                                value={editRemarks}
                                onChange={(e) => setEditRemarks(e.target.value)}
                                placeholder="例：更換原廠冷氣濾網、檢查煞車皮等..."
                                rows={2}
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-cyber-green resize-none"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase transition-colors"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(log.id)}
                              disabled={isSaving}
                              className="px-3 py-1.5 rounded-lg bg-cyber-green text-black font-mono font-bold text-[10px] uppercase hover:bg-cyber-green/80 transition-colors flex items-center gap-1"
                            >
                              {isSaving ? <Loader size={10} className="animate-spin" /> : <Check size={10} />}
                              確認儲存
                            </button>
                          </div>
                        </div>
                      ) : isConfirmingDelete ? (
                        /* Delete Confirmation */
                        <div className="space-y-3">
                          <p className="text-xs text-red-400 font-semibold leading-relaxed">
                            ⚠️ 您確定要刪除此筆保養紀錄嗎？此動作無法復原。
                          </p>
                          {index === 0 && (
                            <p className="text-[10px] text-white/50 bg-white/5 p-2 rounded-lg">
                              💡 刪除最新一筆保養紀錄，系統將會自動將主頁的保養提醒基準還原（Rollback）至更早一筆的紀錄。
                            </p>
                          )}
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={isDeleting}
                              onClick={() => setDeletingLogId(null)}
                              className="px-3 py-1.5 rounded-lg bg-white/5 text-white font-mono text-[10px] uppercase hover:bg-white/10 transition-colors"
                            >
                              取消
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDeleteLog(log.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-mono font-bold text-[10px] uppercase transition-colors"
                            >
                              {isDeleting ? '刪除中...' : '確認刪除'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard View Card */
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-cyber-green bg-cyber-green/10 px-2 py-0.5 rounded border border-cyber-green/20">
                                {log.actualKM.toLocaleString()} KM
                              </span>
                              <span className="text-xs text-white/80 font-semibold font-mono flex items-center gap-1">
                                <Calendar size={12} className="text-white/40" />
                                {getDisplayDate(log.actualDate)}
                              </span>
                              {index === 0 && (
                                <span className="text-[9px] font-mono bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-bold">
                                  LATEST / 最新
                                </span>
                              )}
                            </div>
                            
                            {log.remarks ? (
                              <p className="text-xs text-white/60 pl-1 border-l border-white/10 font-sans leading-relaxed">
                                📝 {log.remarks}
                              </p>
                            ) : (
                              <p className="text-[10px] text-white/30 italic pl-1">
                                無備忘備註
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleStartEdit(log)}
                              className="p-1.5 rounded hover:bg-white/5 text-white/70 hover:text-cyber-green transition-colors"
                              title="編輯紀錄 / Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeletingLogId(log.id)}
                              className="p-1.5 rounded hover:bg-white/5 text-white/70 hover:text-red-400 transition-colors"
                              title="刪除紀錄 / Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
