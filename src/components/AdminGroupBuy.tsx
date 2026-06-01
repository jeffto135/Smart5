import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  Users, 
  CheckCircle, 
  X, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Tag, 
  ShoppingBag, 
  Archive,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { GroupBuy, UserProfile } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface AdminGroupBuyProps {
  groupBuys: GroupBuy[];
  onAddGroupBuy: (data: Partial<GroupBuy>) => Promise<any>;
  onUpdateGroupBuy: (id: string, data: Partial<GroupBuy>) => Promise<void>;
  onDeleteGroupBuy: (id: string, hardClean?: boolean) => Promise<void>;
  isSubAdmin: boolean;
  allProfiles?: UserProfile[];
}

export const AdminGroupBuy: React.FC<AdminGroupBuyProps> = ({
  groupBuys = [],
  onAddGroupBuy,
  onUpdateGroupBuy,
  onDeleteGroupBuy,
  isSubAdmin,
  allProfiles = []
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGbId, setEditingGbId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmGb, setDeleteConfirmGb] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'closed'>('active');

  // Registrar List Visibility state per group buy
  const [auditedGbId, setAuditedGbId] = useState<string | null>(null);
  const [subscriberSearch, setSubscriberSearch] = useState('');

  const minDateTimeStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  const visibleGroupBuys = useMemo(() => {
    return groupBuys.filter(gb => gb.status !== 'deleted');
  }, [groupBuys]);

  const handleOpenAdd = () => {
    setEditingGbId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setTargetQuantity('');
    setMinQuantity('');
    setMaxQuantity('');
    setEndDate('');
    setImageUrl('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (gb: GroupBuy) => {
    setEditingGbId(gb.id);
    setTitle(gb.title);
    setDescription(gb.description || '');
    setPrice(gb.price ? gb.price.toString() : '');
    setTargetQuantity(gb.targetQuantity ? gb.targetQuantity.toString() : '');
    setMinQuantity(gb.minQuantity !== undefined && gb.minQuantity !== null ? gb.minQuantity.toString() : '');
    setMaxQuantity(gb.maxQuantity !== undefined && gb.maxQuantity !== null ? gb.maxQuantity.toString() : '');
    
    // Format Date for datetime-local input
    if (gb.endDate) {
      const dateVal = typeof gb.endDate.toDate === 'function' ? gb.endDate.toDate() : new Date(gb.endDate);
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      const hours = String(dateVal.getHours()).padStart(2, '0');
      const minutes = String(dateVal.getMinutes()).padStart(2, '0');
      setEndDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEndDate('');
    }
    setImageUrl(gb.imageUrl || '');
    setStatus(gb.status || 'active');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGbId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price || !targetQuantity || !endDate) {
      alert('請填寫所有必要欄位 / PLEASE FILL ALL REQUIRED FIELDS');
      return;
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      alert('特別優惠價必須是有效正數 / PRICE MUST BE A VALID POSITIVE NUMBER');
      return;
    }

    if (isNaN(Number(targetQuantity)) || Number(targetQuantity) <= 0) {
      alert('成團目標數量必須是有效正數 / TARGET QUANTITY MUST BE A VALID POSITIVE NUMBER');
      return;
    }

    if (minQuantity && (isNaN(Number(minQuantity)) || Number(minQuantity) < 0)) {
      alert('最少成團數量必須是有效數字 / MIN QTY MUST BE A VALID NUMBER');
      return;
    }

    if (maxQuantity && (isNaN(Number(maxQuantity)) || Number(maxQuantity) < 0)) {
      alert('最大限量總數必須是有效數字 / MAX QTY MUST BE A VALID NUMBER');
      return;
    }

    const selectedDeadline = new Date(endDate);
    if (!editingGbId && selectedDeadline <= new Date()) {
      alert('團購截止時間必須大於當前時間 / THE DEADLINE TIME MUST BE IN THE FUTURE');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<GroupBuy> = {
        title,
        description,
        price: Number(price),
        targetQuantity: Number(targetQuantity),
        minQuantity: minQuantity !== '' ? Number(minQuantity) : undefined,
        maxQuantity: maxQuantity !== '' ? Number(maxQuantity) : undefined,
        endDate: new Date(endDate),
        imageUrl: imageUrl || undefined,
        status
      };

      if (editingGbId) {
        await onUpdateGroupBuy(editingGbId, payload);
        alert('修改成功 / GROUP BUY ITEM UPDATED');
      } else {
        await onAddGroupBuy({
          ...payload,
          currentRegistrations: []
        });
        alert('上架成功 / GROUP BUY ITEM PUBLISHED');
      }
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      alert('操作失敗: ' + (err.message || '未知錯誤'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmGb({ id, title: name });
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      await onUpdateGroupBuy(id, { status: nextStatus });
      alert(`已${nextStatus === 'closed' ? '截止' : '重新啟用'}該團購！`);
    } catch (err: any) {
      alert('切換失敗: ' + (err.message || '未知錯誤'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50">團購項目列表</h3>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">管理官方募集大貨/配件</p>
        </div>
        <CyberButton onClick={handleOpenAdd} className="py-2 px-4 text-xs font-bold">
          <Plus size={14} className="mr-1" /> 發佈新團購
        </CyberButton>
      </div>

      {visibleGroupBuys.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest border border-white/5 bg-white/[0.01] rounded-2xl">
          目前暫無團購數據 / NO GROUP BUYS
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroupBuys.map((gb) => {
            const totalQty = (gb.currentRegistrations || []).reduce((acc, curr) => acc + curr.qty, 0);
            const percentage = Math.round((totalQty / gb.targetQuantity) * 100);
            const isClosed = gb.status === 'closed';

            return (
              <CyberCard 
                key={gb.id} 
                className={`bg-white/[0.02] border-white/10 ${isClosed ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left Column: Specs info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider ${
                        isClosed ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-cyber-green/20 text-cyber-green border border-cyber-green/20'
                      }`}>
                        {isClosed ? '■ 已截止' : '● 募集中'}
                      </span>
                      <h4 className="font-bold text-sm text-white font-mono truncate">{gb.title}</h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-[10px] font-mono text-white/40 uppercase">
                      <div>
                        <span className="block opacity-50">車友價 / unit price</span>
                        <span className="text-sm font-bold text-cyber-green">${gb.price}</span>
                      </div>
                      <div>
                        <span className="block opacity-50">已認購 / total reserved</span>
                        <span className="text-sm font-bold text-white">{totalQty} / {gb.targetQuantity} 套</span>
                      </div>
                      <div>
                        <span className="block opacity-50">成團上限 / limits</span>
                        <span className="text-sm font-bold text-white">
                          {gb.maxQuantity ? `${gb.maxQuantity} 套` : '無限制'}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-50">截止時間 / deadline</span>
                        <span className="text-sm font-bold text-white/80">
                          {gb.endDate ? (typeof gb.endDate.toDate === 'function' ? gb.endDate.toDate().toLocaleDateString() : new Date(gb.endDate).toLocaleDateString()) : '未設定'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    {/* View Registrants */}
                    <button
                      onClick={() => setAuditedGbId(auditedGbId === gb.id ? null : gb.id)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono text-white transition-all flex items-center gap-1 cursor-pointer"
                      title="檢視成員認購清單"
                    >
                      <Users size={12} />
                      <span>{auditedGbId === gb.id ? '隱藏名單' : `認購清單 (${(gb.currentRegistrations || []).length})`}</span>
                    </button>

                    {/* End/Re-enable Buy */}
                    <button
                      onClick={() => handleToggleStatus(gb.id, gb.status)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                        isClosed 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500 hover:text-black' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-black'
                      }`}
                      title={isClosed ? "重新啟動團購" : "截止團購"}
                    >
                      <Archive size={12} />
                      <span>{isClosed ? '上架' : '截止'}</span>
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(gb)}
                      className="p-2 bg-cyber-green/10 hover:bg-cyber-green/20 text-cyber-green border border-cyber-green/20 rounded-lg transition-all cursor-pointer"
                      title="編輯團購項目"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(gb.id, gb.title)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all cursor-pointer"
                      title="刪除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Audit details section */}
                {auditedGbId === gb.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-black/40 border border-[#A3E635]/20 rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="text-[10px] font-mono font-bold text-[#A3E635] uppercase tracking-wider">
                        👤 團購認購人明細 (誠信核實) / REGISTRANT DETAILS LIST
                      </div>
                      <div className="w-full sm:w-64">
                        <input
                          type="text"
                          placeholder="搜尋車友姓名、車牌或電話..."
                          value={subscriberSearch}
                          onChange={(e) => setSubscriberSearch(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-mono text-cyber-green placeholder-white/30 outline-none focus:border-cyber-green/50"
                        />
                      </div>
                    </div>
                    {(!gb.currentRegistrations || gb.currentRegistrations.length === 0) ? (
                      <div className="text-center py-4 font-mono text-[11px] text-white/30 truncate">
                        目前尚無任何車友登記 / NO RESERVATIONS REGISTERED
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-xs">
                          <thead>
                            <tr className="border-b border-white/10 text-[9px] text-white/40 uppercase">
                              <th className="pb-1 text-center w-8">#</th>
                              <th className="pb-1">👤 車友資訊 / MEMBER INFO (暱稱 • 車牌 • 手提)</th>
                              <th className="pb-1 text-center w-20">認購數 / QTY</th>
                              <th className="pb-1 text-right w-24">小計 / SUBTOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gb.currentRegistrations
                              .filter((reg) => {
                                const profile = (allProfiles || []).find((p) => p.id === reg.userId);
                                const displayName = (profile?.displayName || profile?.username || reg.email?.split('@')[0] || '未知用戶').toLowerCase();
                                const mobile = (profile?.mobile || profile?.phone || profile?.phoneNumber || '').toLowerCase();
                                const plateNumber = (profile?.plate || '').toLowerCase();
                                const search = subscriberSearch.toLowerCase();
                                return displayName.includes(search) || mobile.includes(search) || plateNumber.includes(search);
                              })
                              .map((reg, index) => {
                                const profile = (allProfiles || []).find(p => p.id === reg.userId);
                                const displayName = profile?.displayName || profile?.username || reg.email?.split('@')[0] || '未知用戶';
                                const mobile = profile?.mobile || profile?.phone || profile?.phoneNumber || '-- (未填寫)';
                                const plateNumber = profile?.plate;
                                return (
                                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-1.5 text-center text-white/30">{index + 1}</td>
                                    <td className="py-1.5 select-all">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-white font-semibold">{displayName}</span>
                                          {plateNumber && (
                                            <span className="text-[8px] tracking-wider px-1 py-0.5 bg-cyber-green/10 text-cyber-green border border-cyber-green/20 rounded font-mono font-bold">
                                              {plateNumber}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-white/40 text-[10px]">({mobile})</span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 text-center font-bold text-cyber-green">{reg.qty}</td>
                                    <td className="py-1.5 text-right text-white/50">HKD ${reg.qty * gb.price}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}
              </CyberCard>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/8 w-full h-full bg-black/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-cyber-bg border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-cyber-green flex items-center gap-1.5 uppercase">
                  <Sparkles size={16} />
                  {editingGbId ? '編輯團購項目 / EDIT GROUP BUY' : '發佈規格團購 / NEW GROUP BUY'}
                </span>
                <button 
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1">
                  <CyberInput
                    label="商品標題 / ITEM TITLE *"
                    required
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如: Smart #5 專屬全天候 TPE 雙層腳墊"
                  />
                </div>

                <div className="space-y-1">
                  <CyberInput
                    label="示意圖片網址 (選填) / IMAGE URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/item.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CyberInput
                    label="官方特惠價 (HKD) / PRICE *"
                    required
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="例如: 380"
                  />
                  <CyberInput
                    label="目標募集數量 / TARGET QTY *"
                    required
                    type="number"
                    min="1"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    placeholder="例如: 50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CyberInput
                    label="最少成團數量 (選填) / MIN QTY"
                    type="number"
                    min="0"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    placeholder="無限制留空"
                  />
                  <CyberInput
                    label="最大上限數量 (選填) / MAX QTY"
                    type="number"
                    min="0"
                    value={maxQuantity}
                    onChange={(e) => setMaxQuantity(e.target.value)}
                    placeholder="限制庫存留空"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <CyberInput
                    label="截止募集時間 * / DEADLINE *"
                    required
                    type="datetime-local"
                    min={editingGbId ? undefined : minDateTimeStr}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">詳細描述 / DESCRIPTION *</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="規格售後服務、發貨進度安排等細則..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyber-green/50 transition-all font-mono text-sm resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-xs font-mono font-bold text-white transition-all cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-cyber-green text-black hover:brightness-110 disabled:opacity-50 font-mono font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? '處理中...' : editingGbId ? '儲存更改' : '確認上架'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🟢 Deletion Dual-Track Dialog (軟刪除 vs 物理強刪) */}
      <AnimatePresence>
        {deleteConfirmGb && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 bg-[#161616] border border-red-500/30 rounded-2xl shadow-2xl relative overflow-hidden text-white"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-amber-500" />
              
              <div className="flex gap-3 text-red-400 mb-4">
                <AlertTriangle size={24} className="shrink-0" />
                <div>
                  <h4 className="font-mono font-bold tracking-wider text-sm uppercase">確認刪除團購項目？</h4>
                  <p className="text-white/80 font-mono text-xs mt-1">項目：{deleteConfirmGb.title}</p>
                </div>
              </div>

              <p className="text-white/65 font-mono text-[11px] leading-relaxed mb-6">
                請選擇刪除策略。基於系統各板塊聯動完整性，建議採用狀態軟刪除：
              </p>

              <div className="space-y-3">
                {/* Method A: Soft Delete */}
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await onDeleteGroupBuy(deleteConfirmGb.id, false);
                      alert('軟刪除成功！該項目已下架並於前台隱藏，歷史記錄得以保留。');
                      setDeleteConfirmGb(null);
                    } catch (err: any) {
                      alert('刪除失敗: ' + (err.message || '未知錯誤'));
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/30 rounded-xl transition-all text-xs font-mono text-left text-amber-300 flex flex-col cursor-pointer"
                >
                  <span className="font-bold flex items-center gap-1.5 text-amber-400">
                    🛡️ 方式 A：狀態軟刪除 (推薦)
                  </span>
                  <span className="text-[10px] text-white/50 mt-1">
                    將狀態更新為 "deleted"。前台與本頁面完全隱藏此項目，但能保留已認購車友的所有數據。
                  </span>
                </button>

                {/* Method B: Hard Delete with Cascade Cleanup */}
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      variant: 'danger',
                      title: '物理強制刪除團購',
                      message: '⚠️ 確定執行此操作嗎？此動作將同步寫入系統日誌。',
                      onConfirm: async () => {
                        setIsDeleting(true);
                        try {
                          await onDeleteGroupBuy(deleteConfirmGb.id, true);
                          alert('物理強刪成功！團購項目已徹底清理，關聯通知已全數撤回。');
                          setDeleteConfirmGb(null);
                        } catch (err: any) {
                          alert('刪除失敗: ' + (err.message || '未知錯誤'));
                        } finally {
                          setIsDeleting(false);
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        }
                      }
                    });
                  }}
                  className="w-full p-3 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 rounded-xl transition-all text-xs font-mono text-left text-red-300 flex flex-col cursor-pointer"
                >
                  <span className="font-bold flex items-center gap-1.5 text-red-400">
                    🔥 方式 B：物理強刪 + 通知撤回 (強力清理)
                  </span>
                  <span className="text-[10px] text-white/50 mt-1">
                    自資料庫硬性刪除此 document，並同步清理所有 relatedId 為此團購 ID 的推播通知。
                  </span>
                </button>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmGb(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-lg text-xs font-mono text-white/80 transition-all cursor-pointer"
                >
                  取消 / CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
