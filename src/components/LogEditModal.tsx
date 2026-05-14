import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { LogEntry } from '../types';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface LogEditModalProps {
  log: LogEntry;
  onSave: (data: any) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export const LogEditModal: React.FC<LogEditModalProps> = ({ log, onSave, onDelete, onClose }) => {
  const [timestamp, setTimestamp] = useState(format(log.timestamp.toDate(), "yyyy-MM-dd"));
  const [odometer, setOdometer] = useState(log.odometer);
  const [battery, setBattery] = useState(log.batteryPercent);
  const [cost, setCost] = useState(log.cost || 0);
  const [location, setLocation] = useState(log.location || '');
  const [submitting, setSubmitting] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info'
  });

  const handleSaveAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: '更新紀錄',
      message: '確定要更新此項資料嗎？',
      variant: 'info',
      onConfirm: executeSave
    });
  };

  const executeSave = async () => {
    setSubmitting(true);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      const newDate = new Date(timestamp);
      await onSave({ 
        timestamp: Timestamp.fromDate(newDate),
        odometer, 
        batteryPercent: battery, 
        cost, 
        location 
      });
      alert('更新成功 / UPDATE SUCCESSFUL');
    } catch (error: any) {
      alert('儲存失敗：' + error.message);
    } finally {
      setTimeout(() => {
        setSubmitting(false);
        onClose();
      }, 100);
    }
  };

  const handleDeleteAttempt = () => {
    setConfirmModal({
      isOpen: true,
      title: '刪除紀錄',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      variant: 'danger',
      onConfirm: executeDelete
    });
  };

  const executeDelete = async () => {
    setSubmitting(true);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      await onDelete();
      alert('紀錄已刪除 / DELETED');
    } catch (error: any) {
      alert('刪除失敗：' + error.message);
    } finally {
      setTimeout(() => {
        setSubmitting(false);
        onClose();
      }, 100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pb-20">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-card w-full max-w-sm p-6 relative z-10 border-cyber-green/30 overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-mono font-bold uppercase text-cyber-green">編輯紀錄</h3>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSaveAttempt} className="space-y-4">
          <CyberInput
            label="日期 / Date"
            type="date"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            required
          />

          <CyberInput
            label="里程 (KM)"
            type="number"
            value={odometer}
            onChange={(e) => setOdometer(Number(e.target.value))}
            prefix="KM"
            required
          />

          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <label className="text-[10px] font-mono uppercase text-cyber-green/70">電量 / Battery (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={battery}
                onChange={(e) => setBattery(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-16 bg-white/5 border-b border-cyber-green/30 text-right font-mono font-bold text-cyber-green focus:outline-none focus:border-cyber-green px-1 text-sm"
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={battery}
              onChange={(e) => setBattery(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <CyberInput
            label="費用 (HKD)"
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            prefix="$"
          />

          <CyberInput
            label="地點"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="地點"
          />

          <div className="pt-4 flex flex-col gap-3">
            <CyberButton 
              type="submit" 
              className="w-full"
              disabled={submitting}
            >
              {submitting ? '儲存中...' : '確認修改 UPDATE'}
            </CyberButton>

            <button 
              type="button"
              onClick={handleDeleteAttempt}
              className="text-[10px] uppercase tracking-widest text-white/20 hover:text-red-500/50 transition-colors py-2 text-center"
            >
              刪除此紀錄 DELETE
            </button>
          </div>
        </form>

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
      </motion.div>
    </div>
  );
};
