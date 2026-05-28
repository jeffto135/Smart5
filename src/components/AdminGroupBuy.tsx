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
import { GroupBuy } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';

interface AdminGroupBuyProps {
  groupBuys: GroupBuy[];
  onAddGroupBuy: (data: Partial<GroupBuy>) => Promise<any>;
  onUpdateGroupBuy: (id: string, data: Partial<GroupBuy>) => Promise<void>;
  onDeleteGroupBuy: (id: string) => Promise<void>;
  isSubAdmin: boolean;
}

export const AdminGroupBuy: React.FC<AdminGroupBuyProps> = ({
  groupBuys = [],
  onAddGroupBuy,
  onUpdateGroupBuy,
  onDeleteGroupBuy,
  isSubAdmin
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGbId, setEditingGbId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const minDateTimeStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

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

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`確定要刪除「${name}」團購項目嗎？此操作不可逆，將會抹除所有已登記車友的記錄！`)) {
      try {
        await onDeleteGroupBuy(id);
        alert('刪除成功 / DELETED');
      } catch (err: any) {
        alert('刪除失敗: ' + (err.message || '未知錯誤'));
      }
    }
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

      {groupBuys.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest border border-white/5 bg-white/[0.01] rounded-2xl">
          目前暫無團購數據 / NO GROUP BUYS
        </div>
      ) : (
        <div className="space-y-4">
          {groupBuys.map((gb) => {
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
                    <div className="text-[10px] font-mono font-bold text-[#A3E635] uppercase tracking-wider">
                      👤 團購認購人明細 (誠信核實) / REGISTRANT DETAILS LIST
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
                              <th className="pb-1">聯絡信箱 / EMAIL</th>
                              <th className="pb-1 text-center w-20">認購數 / QTY</th>
                              <th className="pb-1 text-right w-24">小計 / SUBTOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gb.currentRegistrations.map((reg, index) => (
                              <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-1.5 text-center text-white/30">{index + 1}</td>
                                <td className="py-1.5 text-white/80 select-all">{reg.email || '未知信箱'}</td>
                                <td className="py-1.5 text-center font-bold text-cyber-green">{reg.qty}</td>
                                <td className="py-1.5 text-right text-white/50">HKD ${reg.qty * gb.price}</td>
                              </tr>
                            ))}
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

    </div>
  );
};
