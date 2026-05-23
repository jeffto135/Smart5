import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Minus, Tag, Clock, Check, AlertTriangle, Trash2, Mail, Users, FileEdit, Archive, PlusCircle, CheckCircle, ShoppingBag } from 'lucide-react';
import { GroupBuy, GroupBuyRegistration } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CyberCard } from './ui/CyberCard';
import { CyberButton } from './ui/CyberButton';
import { CyberInput } from './ui/CyberInput';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface GroupBuyMarketplaceProps {
  groupBuys: GroupBuy[];
  userId: string;
  userEmail: string;
  isSubAdmin: boolean;
  onRegister: (gbId: string, qty: number) => Promise<void>;
  onAddGroupBuy: (data: Partial<GroupBuy>) => Promise<void>;
  onUpdateGroupBuy: (id: string, data: Partial<GroupBuy>) => Promise<void>;
  onDeleteGroupBuy: (id: string) => Promise<void>;
  onClose: () => void;
}

export const GroupBuyMarketplace: React.FC<GroupBuyMarketplaceProps> = ({
  groupBuys,
  userId,
  userEmail,
  isSubAdmin,
  onRegister,
  onAddGroupBuy,
  onUpdateGroupBuy,
  onDeleteGroupBuy,
  onClose
}) => {
  // Modal State for user subscription
  const [selectedGb, setSelectedGb] = useState<GroupBuy | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [regLoading, setRegLoading] = useState(false);

  // Admin New Group Buy Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newTargetQty, setNewTargetQty] = useState<number | ''>('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Admin Audit List for specific group buy
  const [selectedAuditGb, setSelectedAuditGb] = useState<GroupBuy | null>(null);

  // Confirmation Modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [closeConfirmId, setCloseConfirmId] = useState<{ id: string, status: 'closed' | 'active' } | null>(null);

  // Open User Registration Modal
  const handleOpenRegisterModal = (gb: GroupBuy) => {
    const existingIndex = (gb.currentRegistrations || []).findIndex(r => r.userId === userId);
    if (existingIndex >= 0) {
      setQty(gb.currentRegistrations[existingIndex].qty);
    } else {
      setQty(1);
    }
    setSelectedGb(gb);
  };

  // Submit User Registration
  const submitRegistration = async () => {
    if (!selectedGb) return;
    setRegLoading(true);
    try {
      await onRegister(selectedGb.id, qty);
      setSelectedGb(null);
    } catch (e) {
      console.error(e);
    } finally {
      setRegLoading(false);
    }
  };

  // Submit Admin Add Group Buy
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newPrice || !newTargetQty) {
      alert('請填寫所有必要欄位 / PLEASE FILL ALL REQUIRED FIELDS');
      return;
    }
    setFormLoading(true);
    try {
      await onAddGroupBuy({
        title: newTitle,
        description: newDescription,
        price: Number(newPrice),
        targetQuantity: Number(newTargetQty),
        imageUrl: newImageUrl || undefined,
        status: 'active'
      });
      // Clear
      setNewTitle('');
      setNewDescription('');
      setNewPrice('');
      setNewTargetQty('');
      setNewImageUrl('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle Close / Open Group Buy Action
  const handleToggleStatus = async () => {
    if (!closeConfirmId) return;
    try {
      await onUpdateGroupBuy(closeConfirmId.id, { status: closeConfirmId.status });
    } catch (e) {
      console.error(e);
    } finally {
      setCloseConfirmId(null);
    }
  };

  // Delete Group Buy Action
  const handleDeleteGroupBuy = async () => {
    if (!deleteConfirmId) return;
    try {
      await onDeleteGroupBuy(deleteConfirmId);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
              團購市集 <span className="text-[#A3E635]">Group Buy</span>
            </h2>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
              100% 官方控管優質福利市集 / Authentic Accessories Marketplace
            </p>
          </div>
        </div>

        {/* Admin triggering action */}
        {isSubAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-xl font-mono text-xs font-bold transition-all ${
              showAddForm
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-[#A3E635]/10 text-[#A3E635] border border-[#A3E635]/25 hover:bg-[#A3E635] hover:text-black shadow-[0_0_15px_rgba(163,230,21,0.1)]'
            }`}
          >
            <PlusCircle size={15} />
            {showAddForm ? '關閉管理面板 / CLOSE ADMIN' : '發起新團購 / NEW GROUP BUY'}
          </button>
        )}
      </div>

      {/* Admin Add Group Buy Form Drawer */}
      <AnimatePresence>
        {isSubAdmin && showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <CyberCard title="上架官方規格團購項目 / PUBLISH GROUP BUY" className="border-[#A3E635]/30">
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CyberInput
                    label="商品標題 / ITEM TITLE *"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例如: Smart #5 專屬全天候 TPE 雙層腳墊"
                  />
                  <CyberInput
                    label="示意圖網址 (選填) / IMAGE URL"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://example.com/item.jpg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CyberInput
                    label="官方特惠價 (HKD) / SPECIAL PRICE *"
                    type="number"
                    min="1"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="HKD 380"
                  />
                  <CyberInput
                    label="成團目標數量 / TARGET QUANTITY *"
                    type="number"
                    min="1"
                    value={newTargetQty}
                    onChange={(e) => setNewTargetQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest block">
                    詳細描述 / DETAIL DESCRIPTION *
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#A3E635]/50 transition-colors"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="描述商品特色、發貨時間、售後服務等規格..."
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="py-2 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white transition-colors"
                  >
                    取消 / CANCEL
                  </button>
                  <CyberButton type="submit" disabled={formLoading} className="py-2 px-6 text-xs">
                    {formLoading ? '發布中...' : '確認上架 / PUBLISH ITEM'}
                  </CyberButton>
                </div>
              </form>
            </CyberCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main List Grid */}
      {groupBuys.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest border border-white/5 rounded-2xl bg-white/[0.01]">
          目前暫時沒有進行中的官方團購項目
          <br />
          <span className="text-xs text-white/65 mt-2 block">NO ACTIVE GROUP BUY CURRENTLY</span>
        </div>
      ) : (
        <div className="space-y-8">
          {groupBuys.map((gb) => {
            // Calculate total registered item quantities
            const totalQty = (gb.currentRegistrations || []).reduce((acc, current) => acc + current.qty, 0);
            const percentage = Math.round((totalQty / gb.targetQuantity) * 100);
            const progressPercent = Math.min(100, percentage);

            // Check if the current user has already registered
            const userReg = (gb.currentRegistrations || []).find(r => r.userId === userId);
            const userQty = userReg ? userReg.qty : 0;
            const hasRegistered = userQty > 0;

            const trackingGlowColor = percentage >= 100 ? 'bg-[#CCFF00]' : 'bg-[#A3E635]';

            return (
              <motion.div
                key={gb.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CyberCard
                  className={`overflow-hidden transition-all duration-300 relative ${
                    gb.status === 'closed'
                      ? 'border-white/5 opacity-60 bg-white/[0.01]'
                      : hasRegistered
                      ? 'border-[#A3E635]/60 shadow-[0_0_25px_rgba(163,230,21,0.06)] bg-[#A3E635]/[0.01]'
                      : 'border-white/10'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Image Column */}
                    <div className="md:col-span-4 relative flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl aspect-video md:aspect-square overflow-hidden">
                      {gb.imageUrl ? (
                        <img
                          src={gb.imageUrl}
                          alt={gb.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-xl hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/15">
                          <ShoppingBag size={48} className="stroke-[1]" />
                          <span className="text-[9px] font-mono uppercase tracking-widest text-center">
                            官方合規驗證商品 / Verified Spec
                          </span>
                        </div>
                      )}

                      {/* Status Badges on Image */}
                      <span
                        className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider select-none ${
                          gb.status === 'active'
                            ? 'bg-[#A3E635] text-black shadow-[0_0_10px_#A3E635]'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {gb.status === 'active' ? '● 招募中 / ACTIVE' : '■ 已截止 / CLOSED'}
                      </span>
                    </div>

                    {/* Content Column */}
                    <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        {/* Title and Badge */}
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold font-mono text-white leading-tight">
                            {gb.title}
                          </h3>
                          <span className="inline-block text-[8px] font-mono text-[#A3E635] bg-[#A3E635]/10 border border-[#A3E635]/20 px-2 py-0.5 rounded">
                            車友福利 • 官方統一控管
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs font-mono text-white/50 leading-relaxed whitespace-pre-wrap">
                          {gb.description}
                        </p>

                        {/* Pricing Highlight Info */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-mono text-white/30 lowercase">特惠價格 / PRICE</span>
                          <span className="text-2xl font-mono font-bold text-[#A3E635] cyber-text-glow leading-none">
                            HKD ${gb.price}
                          </span>
                          <span className="text-[10px] font-mono text-white/20">/ 包郵到港</span>
                        </div>
                      </div>

                      {/* Dynamic Progress indicator */}
                      <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex justify-between items-baseline mb-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-white/40">
                            <Users size={12} className="text-[#A3E635]" />
                            <span>認購進度 / PROGRESS</span>
                          </div>
                          <div className="text-[11px] font-mono">
                            <span className="text-white/60 font-bold">目前已認購 {totalQty}</span>
                            <span className="text-white/30"> / {gb.targetQuantity} 套</span>
                            <span className="text-[#A3E635] font-black ml-2 text-xs">
                              (已完成 {percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Fluid Progress Bar */}
                        <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-[#A3E635]/10 p-[1px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            className={`h-full ${trackingGlowColor} shadow-[0_0_15px_rgba(163,230,21,0.4)] rounded-full`}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                        
                        {/* Success target notification */}
                        {percentage >= 100 && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-[#A3E635]/90">
                            <CheckCircle size={10} />
                            <span>已成功達標，正在集結成團！SUCCESS TARGET REACHED!</span>
                          </div>
                        )}
                      </div>

                      {/* Interactive Section / User Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        {/* Display existing registered quantity */}
                        {hasRegistered ? (
                          <div className="flex items-center gap-2 text-xs font-mono bg-[#A3E635]/10 border border-[#A3E635]/20 px-3 py-2 rounded-xl text-[#A3E635]">
                            <Check size={14} className="stroke-[3]" />
                            <span>
                              您已在本次團購登記認購：<strong>{userQty} 套</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                            {gb.status === 'active' ? '🛡️ 一人一單，認購後系統記錄誠意登記' : '❌ 本次團購已截止認購'}
                          </div>
                        )}

                        {/* Subscription Buttons */}
                        {gb.status === 'active' ? (
                          <CyberButton
                            onClick={() => handleOpenRegisterModal(gb)}
                            variant={hasRegistered ? 'secondary' : 'primary'}
                            className="text-xs font-bold py-2.5 px-6 min-w-[140px]"
                          >
                            {hasRegistered ? '修改我的認購數量 / EDIT SELECTION' : '我要認購 / COMMENCE REGISTER'}
                          </CyberButton>
                        ) : (
                          <button
                            disabled
                            className="py-2.5 px-6 rounded-xl bg-white/5 text-white/20 border border-white/5 text-xs font-mono font-bold cursor-not-allowed select-none"
                          >
                            已截止 / ENDED
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Special Administrative Management Section */}
                  {isSubAdmin && (
                    <div className="mt-6 pt-5 border-t border-white/5 space-y-4">
                      <div className="flex flex-wrap justify-between items-center gap-2 bg-white/[0.01] p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                          <Users size={12} className="text-[#A3E635]" />
                          <span>管理員控制板 / ADMINISTRATIVE ACTIONS PANEL</span>
                        </div>
                        <div className="flex gap-2">
                          {/* Audit Registrant emails Button */}
                          <button
                            onClick={() => setSelectedAuditGb(selectedAuditGb?.id === gb.id ? null : gb)}
                            className="py-1 px-3 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white border border-white/10 transition-colors flex items-center gap-1"
                          >
                            <Mail size={12} />
                            {selectedAuditGb?.id === gb.id ? '隱藏名單 / HIDE REGISTRANTS' : `檢視已登記車友 (${(gb.currentRegistrations || []).length} 人)`}
                          </button>

                          {/* Close/Archive Button */}
                          <button
                            onClick={() =>
                              setCloseConfirmId({
                                id: gb.id,
                                status: gb.status === 'active' ? 'closed' : 'active'
                              })
                            }
                            className={`py-1 px-3 rounded text-[10px] font-mono transition-all border flex items-center gap-1 ${
                              gb.status === 'active'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500 hover:text-black'
                                : 'bg-green-500/10 text-green-400 border-green-500/25 hover:bg-green-500 hover:text-black'
                            }`}
                          >
                            <Archive size={12} />
                            {gb.status === 'active' ? '截止團購 / END' : '重新啟動 / RETRIGGER'}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmId(gb.id)}
                            className="py-1 px-3 rounded bg-red-500/10 hover:bg-red-500 hover:text-black text-[10px] font-mono text-red-400 border border-red-500/25 transition-all flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            刪除項目 / DELETE
                          </button>
                        </div>
                      </div>

                      {/* Display Audit Registered users Table if opened */}
                      {selectedAuditGb?.id === gb.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-3 bg-black/40 border border-[#A3E635]/20 rounded-xl space-y-2 overflow-hidden"
                        >
                          <div className="text-[10px] font-mono font-bold text-[#A3E635] uppercase tracking-wider mb-2">
                            👤 團購認購人明細 / REGISTRANT DETAILS LIST (COMS INTEGRITY CHECK)
                          </div>
                          {(gb.currentRegistrations || []).length === 0 ? (
                            <div className="text-[11px] font-mono opacity-40 text-center py-4">
                              目前尚無任何車友登記 / NO RESERVATIONS REGISTERED
                            </div>
                          ) : (
                            <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
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
                                  {(gb.currentRegistrations || []).map((reg, index) => (
                                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                      <td className="py-1 text-center text-white/30">{index + 1}</td>
                                      <td className="py-1 text-white/80 select-all">{reg.email || '未知信箱'}</td>
                                      <td className="py-1 text-center font-bold text-[#A3E635]">{reg.qty}</td>
                                      <td className="py-1 text-right text-white/50">HKD ${reg.qty * gb.price}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}
                </CyberCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 🚀 Dynamic Booking Popup Modal */}
      <AnimatePresence>
        {selectedGb && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0D1117] border border-[#A3E635]/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(163,230,21,0.15)] relative overflow-hidden"
            >
              {/* Glow Accent line */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#A3E635] to-transparent" />

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-mono text-white text-center">
                    官方福利團購認購確認 / CONFIRM ORDER
                  </h3>
                  <p className="text-[9px] font-mono text-white/40 uppercase text-center tracking-wider">
                    登記將於結算時核實並通知付運 / Direct Import Specification
                  </p>
                </div>

                {/* Merchandise overview */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <h4 className="font-bold text-sm text-white font-mono">{selectedGb.title}</h4>
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-white/40">特別優惠價 / UNIT PRICE</span>
                    <span className="text-[#A3E635] font-bold">HKD ${selectedGb.price}</span>
                  </div>
                </div>

                {/* Substantive Quantity Counter Selector [ - | num | + ] */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest block text-center">
                    選擇認購數量 / SELECT ORDER QUANTITY
                  </label>
                  <div className="flex justify-center items-center gap-6">
                    {/* Decrease */}
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(0, qty - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all font-bold"
                    >
                      <Minus size={16} />
                    </button>

                    {/* Quantity Display */}
                    <div className="w-16 text-center">
                      <span className="text-2xl font-mono font-black text-white">{qty}</span>
                      <span className="block text-[8px] font-mono text-white/40">套 / SETS</span>
                    </div>

                    {/* Increase */}
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#A3E635]/50 text-white transition-all font-bold"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Dynamic mathematical subtotal calculation summary table */}
                <div className="p-3 bg-white/[0.01] border-t border-b border-white/5 flex justify-between font-mono text-xs">
                  <span className="text-white/40">合計認購金額 / TOTAL PRICE</span>
                  <span className="text-[#A3E635] font-black tracking-tight text-sm">
                    HKD ${qty * selectedGb.price}
                  </span>
                </div>

                {/* Safety advice and precautions check list */}
                {qty === 0 ? (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2 text-[10px] font-mono text-red-400">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      數量設定為 0 代表您希望<strong>取消本次團購登記</strong>。確認提交後，該訂單記錄將被移除。
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex gap-2 text-[10px] font-mono text-white/40">
                    <CheckCircle className="text-[#A3E635] flex-shrink-0 mt-0.5" size={12} />
                    <span>
                      登記將會綁定您的車友信箱 <strong>{userEmail}</strong>。成團後系統將通知您付款與發寄！
                    </span>
                  </div>
                )}

                {/* Action submit buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={regLoading}
                    onClick={() => setSelectedGb(null)}
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-white transition-colors border border-white/10"
                  >
                    取消 / CANCEL
                  </button>
                  <CyberButton
                    onClick={submitRegistration}
                    disabled={regLoading}
                    className="text-xs py-2.5"
                  >
                    {regLoading ? '處理中...' : qty === 0 ? '取消認購 / REMOVE' : '確定認購 / SUBMIT'}
                  </CyberButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modals for Actions */}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        title="安全刪除確認 / CONFIRM DELETE ITEM"
        message="您確定要刪除本項團購商品嗎？\n此行為將會抹除所有已登記車友的記錄，此操作不可逆！"
        variant="danger"
        onConfirm={handleDeleteGroupBuy}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmationModal
        isOpen={!!closeConfirmId}
        title="切換團購截止狀態 / CONFIRM TOGGLE STATUS"
        message={`您確定要將此團購項目切換至為 [ ${closeConfirmId?.status === 'closed' ? '截止 CLOSED' : '進行中 ACTIVE'} ] 嗎？`}
        variant="info"
        onConfirm={handleToggleStatus}
        onCancel={() => setCloseConfirmId(null)}
      />
    </div>
  );
};
