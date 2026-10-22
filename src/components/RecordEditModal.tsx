import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, Save, X, Calendar, MapPin, DollarSign, Zap, FileText } from 'lucide-react';
import { RecordItem, RecordType } from '../types';
import { format } from 'date-fns';

interface RecordEditModalProps {
  record: RecordItem;
  onSave: (recordId: string, data: Partial<RecordItem>) => Promise<void>;
  onDelete: (recordId: string) => Promise<void>;
  onClose: () => void;
}

export const RecordEditModal: React.FC<RecordEditModalProps> = ({
  record,
  onSave,
  onDelete,
  onClose
}) => {
  const [type, setType] = useState<RecordType>(record.type || 'charging');
  const [amountHKD, setAmountHKD] = useState<string>(record.amountHKD !== undefined ? String(record.amountHKD) : '0');
  const [kwhAdded, setKwhAdded] = useState<string>(record.kwhAdded !== undefined ? String(record.kwhAdded) : '0');
  const [location, setLocation] = useState<string>(record.location || '');
  const [notes, setNotes] = useState<string>(record.notes || '');
  const [odoKM, setOdoKM] = useState<string>(record.odoKM !== undefined ? String(record.odoKM) : (record.odometer !== undefined ? String(record.odometer) : ''));
  const [currentSOC, setCurrentSOC] = useState<string>(record.currentSOC !== undefined ? String(record.currentSOC) : '');
  const [consumption, setConsumption] = useState<string>(record.consumption !== undefined ? String(record.consumption) : '');
  
  const recordDateObj = record.recordDate?.toDate ? record.recordDate.toDate() : new Date(record.recordDate as any);
  const [dateStr, setDateStr] = useState<string>(format(recordDateObj, 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updateData: Partial<RecordItem> = {
        type,
        amountHKD: amountHKD ? parseFloat(Number(amountHKD).toFixed(2)) : 0,
        kwhAdded: type === 'charging' && kwhAdded ? parseFloat(Number(kwhAdded).toFixed(2)) : 0,
        location: location.trim(),
        notes: notes.trim(),
        recordDate: new Date(dateStr) as any
      };

      if (type === 'driving') {
        if (odoKM !== '') {
          updateData.odoKM = Number(odoKM);
          updateData.odometer = Number(odoKM);
        }
        if (currentSOC !== '') updateData.currentSOC = Number(currentSOC);
        if (consumption !== '') updateData.consumption = Number(consumption);
      }

      await onSave(record.id, updateData);
      onClose();
    } catch (err: any) {
      alert('儲存失敗：' + (err.message || '未知錯誤'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要永久刪除此筆記錄嗎？')) return;
    setIsSubmitting(true);
    try {
      await onDelete(record.id);
      onClose();
    } catch (err: any) {
      alert('刪除失敗：' + (err.message || '未知錯誤'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmount = Number(amountHKD) || 0;
  const parsedKwh = Number(kwhAdded) || 0;
  const unitPrice = parsedKwh > 0 ? (parsedAmount / parsedKwh).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-card w-full max-w-md p-6 relative z-10 border-cyber-green/30 space-y-5"
      >
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-mono font-bold uppercase text-cyber-green">編輯開支記錄</h3>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
              EDIT EXPENSE / CHARGING ENTRY
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-cyber-green/70">開支分類 / Category</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'driving', label: '🚗 日常行車' },
                { id: 'charging', label: '⚡ 充電' },
                { id: 'parking', label: '🅿️ 泊車' },
                { id: 'maintenance', label: '🛠️ 保養' },
                { id: 'accessory', label: '🛍️ 配件' },
                { id: 'other', label: '📝 其他' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setType(cat.id as RecordType)}
                  className={`py-2 px-1 text-xs font-mono rounded-xl border transition-all ${
                    type === cat.id
                      ? 'bg-cyber-green/20 border-cyber-green text-cyber-green font-bold shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & kWh in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-cyber-green/70">金額 (HKD)</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountHKD}
                  onChange={(e) => setAmountHKD(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
                  required
                />
              </div>
            </div>

            {type === 'charging' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-cyber-green/70">充入度數 (kWh)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={kwhAdded}
                  onChange={(e) => setKwhAdded(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
                  placeholder="35.5"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-cyber-green/70">記錄日期</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
                  required
                />
              </div>
            )}
          </div>

          {/* If charging, calculate price badge & date */}
          {type === 'charging' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyber-green/10 border border-cyber-green/30 text-xs font-mono">
                <span className="text-white/60">⚡ 換算每度電單價:</span>
                <span className="text-cyber-green font-bold font-mono">
                  {unitPrice ? `HK$ ${unitPrice} / kWh` : '-- / kWh'}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-cyber-green/70">充電日期</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* If driving, show ODO, SOC, and Consumption fields */}
          {type === 'driving' && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-cyber-green/30 space-y-3">
              <span className="text-[10px] font-mono uppercase text-cyber-green font-bold block">
                🚗 日常行車數據 (DRIVING DATA)
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/70">總里程 (ODO KM)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={odoKM}
                    onChange={(e) => setOdoKM(e.target.value)}
                    placeholder="例: 12500"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/70">電量 (SOC %)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={currentSOC}
                    onChange={(e) => setCurrentSOC(e.target.value)}
                    placeholder="例: 76"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/70">平均能耗 (kWh/100km，選填)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  placeholder="例: 18.5"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-cyber-green/70">地點 / 商戶名稱</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例：Evoasis / 又一城停車場 / 原廠"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-white focus:outline-none focus:border-cyber-green text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-cyber-green/70">備忘備註 (選填)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="例如：夜間半價充電 / 免泊消費折抵"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-cyber-green text-xs resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Trash2 size={18} />
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-cyber-green text-black font-mono font-bold text-sm uppercase hover:bg-cyber-green/80 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? '儲存中...' : '儲存修改'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
