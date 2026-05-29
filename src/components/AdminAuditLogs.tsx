import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, User, Clock, AlertCircle } from 'lucide-react';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';

interface AuditLog {
  id: string;
  timestamp: any;
  operatorId: string;
  operatorEmail: string;
  operatorRole: string;
  actionType: string;
  targetCollection: string;
  description: string;
}

interface AdminAuditLogsProps {
  userRole: 'admin' | 'subAdmin';
  auditLogs: AuditLog[];
  format: (date: Date, pattern: string) => string;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ userRole, auditLogs, format }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 25;

  // 🔒 安全防線加固: 確保頂部有加入強硬的代碼阻擋，防止越權讀取後台運作日誌
  useEffect(() => {
    if (userRole !== 'admin') {
      alert("權限不足：此功能僅限最高管理員使用！\nACCESS DENIED. THIS MODULE IS EXCLUSIVE TO MAIN ADMINISTRATORS.");
      window.location.href = '/';
    }
  }, [userRole]);

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center border border-red-500/20 bg-red-500/5 rounded-xl font-mono text-xs text-red-500 uppercase">
        🚫 權限不足，此分頁僅限最高管理員！\nACCESS DENIED. THIS MODULE IS EXCLUSIVE TO MAIN ADMINISTRATORS.
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log => {
    const term = search.toLowerCase();
    return (
      (log.operatorEmail || '').toLowerCase().includes(term) ||
      (log.actionType || '').toLowerCase().includes(term) ||
      (log.description || '').toLowerCase().includes(term)
    );
  });

  const pageCount = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const pagedLogs = filteredLogs.slice((currentPage - 1) * LOGS_PER_PAGE, currentPage * LOGS_PER_PAGE);

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    try {
      if (typeof ts.toDate === 'function') {
        return format(ts.toDate(), 'yyyy-MM-dd HH:mm:ss');
      }
      return format(new Date(ts), 'yyyy-MM-dd HH:mm:ss');
    } catch {
      return 'N/A';
    }
  };

  return (
    <motion.div
      key="audit-logs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 text-white"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
            <Shield className="text-cyber-green" size={16} />
            系統操作審計日誌 / SYSTEM AUDIT LOGS
          </h3>
          <p className="text-[10px] text-white/30 font-mono uppercase mt-1">
            唯讀認證流水帳：主管理員專屬之獨立防線，追蹤後台管理員的操作痕跡
          </p>
        </div>
        <div className="w-full md:w-72">
          <CyberInput
            placeholder="搜尋 Email、動作或詳細描述..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <CyberCard className="bg-[#121212]/80 border-white/[0.05] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                <th className="py-3 px-4 flex items-center gap-1.5"><Clock size={10} /> 時間</th>
                <th className="py-3 px-4"><User size={10} className="inline mr-1" /> 操作者 Email</th>
                <th className="py-3 px-4 border-l border-white/5">角色</th>
                <th className="py-3 px-4 border-l border-white/5">動作</th>
                <th className="py-3 px-4 border-l border-white/5">變更內容描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-[11px] font-mono text-white/70">
              {pagedLogs.length > 0 ? (
                pagedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-white/60">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-cyber-green truncate max-w-[180px]" title={log.operatorEmail}>
                      {log.operatorEmail || 'system'}
                    </td>
                    <td className="py-3 px-4 border-l border-white/5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
                        log.operatorRole === 'admin'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }`}>
                        {log.operatorRole === 'admin' ? '主管理員' : '次管理員'}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-l border-white/5">
                      <span className="bg-white/5 border border-white/10 text-white/80 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tabular-nums">
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-l border-white/5 text-white/90 break-words max-w-md">
                      {log.description}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/30 text-xs font-mono">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <AlertCircle size={20} className="text-white/20" />
                      <span>沒有找到任何操作審計紀錄</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pageCount > 1 && (
          <div className="flex justify-between items-center px-4 py-3 bg-white/[0.01] border-t border-white/[0.05]">
            <span className="text-[10px] text-white/40 uppercase font-mono">
              第 {currentPage} 頁，共 {pageCount} 頁
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 text-[10px] font-mono uppercase bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded border border-white/10 text-white transition-colors"
              >
                上一頁
              </button>
              <button
                disabled={currentPage === pageCount}
                onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                className="px-2.5 py-1 text-[10px] font-mono uppercase bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded border border-white/10 text-white transition-colors"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </CyberCard>
    </motion.div>
  );
};
