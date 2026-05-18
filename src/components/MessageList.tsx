import React, { useState, useMemo } from 'react';
import { EVNotification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, AlertTriangle, Clock, MessageSquare, X, CheckSquare, Trash2 } from 'lucide-react';
import { CyberCard } from './ui/CyberCard';
import { CyberButton } from './ui/CyberButton';
import { format } from 'date-fns';
import { auth } from '../lib/firebase';

interface MessageListProps {
  notifications: EVNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onNavigate: (view: string, id?: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllRead, 
  onDelete, 
  onDeleteAll, 
  onNavigate 
}) => {
  const [selectedNotif, setSelectedNotif] = useState<EVNotification | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ show: boolean, id?: string, all?: boolean }>({ show: false });
  const currentUid = auth.currentUser?.uid;

  // Rule 3: Absolute Frontend Authority Logic (Union State)
  // Even if the store hasn't updated yet, we can track locally read IDs 
  // if we want extra safety. However, the useEVStore overhaul already handles 
  // this via readMessagesRef. To be 100% rigorous, we ensure the UI is 
  // driven by the most up-to-date identification of "read" status.
  const processedMessages = useMemo(() => {
    return notifications.map(n => {
      const isRead = currentUid && (n.readBy || []).includes(currentUid);
      return { ...n, isRead };
    });
  }, [notifications, currentUid]);

  const unreadCount = processedMessages.filter(m => !m.isRead).length;

  const handleOpenDetail = (notif: EVNotification) => {
    setSelectedNotif(notif);
    const isUnread = currentUid && !(notif.readBy || []).includes(currentUid);
    if (isUnread) {
      onMarkAsRead(notif.id);
    }
  };

  const handleAction = (notif: EVNotification) => {
    if (notif.relatedType === 'activity') {
      onNavigate('activityList', notif.relatedId);
    } else if (notif.relatedType === 'poll') {
      onNavigate('pollList', notif.relatedId);
    }
    setSelectedNotif(null);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowConfirm({ show: true, id });
  };

  const executeDelete = () => {
    if (showConfirm.all) {
      onDeleteAll();
    } else if (showConfirm.id) {
      onDelete(showConfirm.id);
      if (selectedNotif?.id === showConfirm.id) setSelectedNotif(null);
    }
    setShowConfirm({ show: false });
  };

  if (notifications.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 text-center py-20">
        <div className="w-20 h-20 bg-cyber-green/5 border border-cyber-green/20 rounded-2xl flex items-center justify-center">
          <MessageSquare size={40} className="text-cyber-green/40" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-mono font-bold uppercase tracking-tight">系統訊息 <span className="text-cyber-green">Inbox</span></h3>
          <p className="text-xs text-white/40 uppercase tracking-widest leading-relaxed">
            目前尚無新訊息<br />
            NO NEW MESSAGES
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">中心訊息 <span className="text-cyber-green">Messages</span></h2>
          {unreadCount > 0 && (
            <p className="text-[10px] font-mono text-cyber-green font-bold uppercase tracking-wider mt-1">
              您有 {unreadCount} 則新訊息 • FRONTEND AUTHORITY ACTIVE
            </p>
          )}
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button 
              onClick={onMarkAllRead}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3 bg-white/5 rounded-lg text-[10px] font-mono font-bold uppercase text-white/40 hover:text-cyber-green transition-all"
            >
              <CheckSquare size={14} />
              全部已讀
            </button>
          )}
          <button 
            onClick={() => setShowConfirm({ show: true, all: true })}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3 bg-red-500/5 rounded-lg text-[10px] font-mono font-bold uppercase text-red-500/50 hover:text-red-500 transition-all"
          >
            <Trash2 size={14} />
            清除所有
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {processedMessages.map((notif) => {
          const unread = !notif.isRead;
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleOpenDetail(notif)}
              className="cursor-pointer group"
            >
              <CyberCard className={`relative overflow-hidden transition-all duration-300 border-l-4 ${
                unread 
                  ? 'border-l-cyber-green bg-cyber-green/[0.03] border-white/10 shadow-[0_0_15px_rgba(204,255,0,0.05)]' 
                  : 'border-l-transparent bg-white/[0.01] border-white/5 opacity-60'
              } group-hover:border-white/20`}>
                <div className="flex gap-4 p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none transition-transform group-hover:scale-110 ${
                    notif.type === 'success' ? 'bg-cyber-green/10 text-cyber-green' :
                    notif.type === 'reminder' ? 'bg-yellow-500/10 text-yellow-500' :
                    notif.type === 'alert' ? 'bg-red-500/10 text-red-500' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {notif.type === 'success' ? <CheckCircle2 size={20} /> :
                     notif.type === 'reminder' ? <Clock size={20} /> :
                     notif.type === 'alert' ? <AlertTriangle size={20} /> :
                     <Bell size={20} />}
                  </div>
                  
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`text-xs font-mono font-bold uppercase tracking-wider truncate ${
                        unread ? 'text-white' : 'text-white/40'
                      }`}>
                        {notif.title}
                        {unread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyber-green ml-2 animate-pulse shadow-[0_0_5px_#CCFF00]" />}
                      </h4>
                      <div className="flex gap-2 items-center shrink-0">
                        <span className="text-[9px] font-mono text-white/30">
                          {format(notif.createdAt?.toDate() || new Date(), 'MM/dd HH:mm')}
                        </span>
                        <button 
                          onClick={(e) => confirmDelete(e, notif.id)}
                          className="p-1 text-white/10 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed line-clamp-1 ${
                      unread ? 'text-white/70' : 'text-white/30'
                    }`}>
                      {notif.message}
                    </p>
                  </div>
                </div>
                
                {notif.userId === 'all' && (
                  <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-20">
                    <span className="text-[7px] font-mono font-bold uppercase tracking-tighter">Broadcast</span>
                  </div>
                )}
              </CyberCard>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedNotif && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNotif(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm"
            >
              <CyberCard className="relative p-6 pt-12 border-cyber-green/30">
                <button 
                  onClick={() => setSelectedNotif(null)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center space-y-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    selectedNotif.type === 'success' ? 'bg-cyber-green/10 text-cyber-green' :
                    selectedNotif.type === 'reminder' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {selectedNotif.type === 'success' ? <CheckCircle2 size={32} /> :
                     selectedNotif.type === 'reminder' ? <Clock size={32} /> :
                     <Bell size={32} />}
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-lg font-mono font-bold uppercase tracking-tight ${
                      selectedNotif.type === 'success' ? 'text-cyber-green' :
                      selectedNotif.type === 'reminder' ? 'text-yellow-500' :
                      'text-white'
                    }`}>
                      {selectedNotif.title}
                    </h3>
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                      {format(selectedNotif.createdAt?.toDate() || new Date(), 'yyyy-MM-dd HH:mm:ss')}
                    </p>
                  </div>

                  <div className="w-full text-left bg-black/40 border border-white/5 p-4 rounded-xl">
                    <p className="text-sm text-white/80 leading-relaxed font-sans">
                      {selectedNotif.message}
                    </p>
                  </div>

                  <div className="w-full space-y-3">
                    {selectedNotif.relatedId && (
                      <CyberButton onClick={() => handleAction(selectedNotif)} className="w-full">
                        {selectedNotif.relatedType === 'activity' ? '前往活動頁面 GO TO ACTIVITY' : '前往投票頁面 GO TO POLL'}
                      </CyberButton>
                    )}
                    <CyberButton onClick={() => setSelectedNotif(null)} className="w-full" variant="outline">
                      關閉訊息 CLOSE
                    </CyberButton>
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm.show && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
              onClick={() => setShowConfirm({ show: false })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xs"
            >
              <CyberCard className="p-6 text-center space-y-6 border-red-500/30">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-mono font-bold uppercase">警告 / WARNING</h3>
                  <p className="text-xs text-white/60 leading-relaxed capitalize">
                    {showConfirm.all ? '確定要清除所有訊息嗎？' : '確定要清除此則訊息嗎？'}
                    <br />
                    THIS ACTION CANNOT BE UNDONE.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CyberButton 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => setShowConfirm({ show: false })}
                  >
                    取消 CANCEL
                  </CyberButton>
                  <CyberButton 
                    className="flex-1 !bg-red-500 !text-white" 
                    onClick={executeDelete}
                  >
                    刪除 DELETE
                  </CyberButton>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
