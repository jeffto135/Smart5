import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';

interface AdminPushNotificationProps {
  userRole: 'admin' | 'subAdmin';
  setActiveSubTab: (tab: string) => void;
  notifTitle: string;
  setNotifTitle: (v: string) => void;
  notifMessage: string;
  setNotifMessage: (v: string) => void;
  notifType: 'info' | 'success' | 'warning' | 'reminder';
  setNotifType: (v: 'info' | 'success' | 'warning' | 'reminder') => void;
  sendingNotif: boolean;
  handleSendNotification: () => Promise<void>;
  isAdmin: boolean;
  onClearSystemNotifications: () => Promise<void>;
  setConfirmModal: (data: any) => void;
}

export const AdminPushNotification: React.FC<AdminPushNotificationProps> = ({
  userRole,
  setActiveSubTab,
  notifTitle,
  setNotifTitle,
  notifMessage,
  setNotifMessage,
  notifType,
  setNotifType,
  sendingNotif,
  handleSendNotification,
  isAdmin,
  onClearSystemNotifications,
  setConfirmModal
}) => {
  // 🟢 雙重防線：若明確「不是最高管理員」嘗試加載此敏感組件，直接安全阻斷並強制跳轉
  useEffect(() => {
    if (userRole !== 'admin') {
      alert("權限不足：此功能僅限最高管理員使用！\nACCESS DENIED. THIS MODULE IS EXCLUSIVE TO MAIN ADMINISTRATORS.");
      setActiveSubTab('activities'); // 強制彈回活動發佈分頁
      return;
    }
  }, [userRole, setActiveSubTab]);

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center border border-red-500/20 bg-red-500/5 rounded-xl font-mono text-xs text-red-500 uppercase">
        🚫 權限不足，此分頁僅限最高管理員！
      </div>
    );
  }

  return (
    <motion.div
      key="notifications"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50 mb-6">全體訊息發佈</h3>
      <CyberCard title="撰寫新訊息" className="border-cyber-green/30">
        <div className="space-y-4">
          <CyberInput 
            label="訊息標題" 
            value={notifTitle} 
            onChange={e => setNotifTitle(e.target.value)} 
            placeholder="例如: 系統公告 / SYSTEM NOTICE"
          />
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">訊息內容</label>
            <textarea 
              value={notifMessage}
              onChange={e => setNotifMessage(e.target.value)}
              placeholder="請輸入訊息詳情..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 transition-all min-h-[120px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">訊息類型</label>
            <div className="flex gap-2">
              {['info', 'success', 'warning', 'reminder'].map(type => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setNotifType(type as any)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest border transition-all ${
                    notifType === type 
                      ? 'bg-cyber-green text-black border-cyber-green' 
                      : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4">
            <CyberButton 
              onClick={handleSendNotification} 
              className="w-full"
              disabled={sendingNotif || !notifTitle || !notifMessage}
            >
              {sendingNotif ? '發佈中...' : '發佈至全體成員 BROADCAST'}
            </CyberButton>
          </div>
        </div>
      </CyberCard>

      {isAdmin && (
        <div className="pt-4">
          <button
            type="button"
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: '清除全體訊息',
                message: '確定要一鍵刪除所有全體系統訊息嗎？此動作無法復原。所有成員將無法再看到 these 訊息。\nDELETE ALL BROADCAST MESSAGES? THIS CANNOT BE UNDONE.',
                variant: 'danger',
                onConfirm: async () => {
                  await onClearSystemNotifications();
                  setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
                }
              });
            }}
            className="w-full py-4 rounded-xl border border-red-500/30 bg-red-500/5 text-red-500 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            一鍵清除所有全體系統訊息 / CLEAR ALL BROADCASTS
          </button>
        </div>
      )}

      <div className="p-10 text-center space-y-4 opacity-40">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em]">
          發佈後，所有成員將會即時收到通知。<br />
          BROADCAST MESSAGES ARE SENT TO EVERYONE INSTANTLY.
        </p>
      </div>
    </motion.div>
  );
};
