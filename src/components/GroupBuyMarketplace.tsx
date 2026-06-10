import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Plus, Minus, Tag, Clock, Check, AlertTriangle, Users, CheckCircle, ShoppingBag, CheckCircle2, QrCode } from 'lucide-react';
import { GroupBuy } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CyberCard } from './ui/CyberCard';
import { CyberButton } from './ui/CyberButton';
import { PullToRefresh } from './ui/PullToRefresh';
import { GroupBuyReceipt } from './GroupBuyReceipt';

interface GroupBuyMarketplaceProps {
  groupBuys: GroupBuy[];
  userId: string;
  userEmail: string;
  isSubAdmin?: boolean; // Kept for compatibility with other parts of the codebase if any
  onRegister: (gbId: string, qty: number) => Promise<void>;
  onAddGroupBuy?: (data: Partial<GroupBuy>) => Promise<any>;
  onUpdateGroupBuy?: (id: string, data: Partial<GroupBuy>) => Promise<void>;
  onDeleteGroupBuy?: (id: string) => Promise<void>;
  onClose: () => void;
  initialTargetId?: string | null;
  onClearTargetId?: () => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

export const GroupBuyMarketplace: React.FC<GroupBuyMarketplaceProps> = ({
  groupBuys = [],
  userId,
  userEmail,
  onRegister,
  onClose,
  initialTargetId,
  onClearTargetId,
  isLoading = false,
  onRefresh
}) => {
  // Modal State for user subscription
  const [selectedGb, setSelectedGb] = useState<GroupBuy | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [regLoading, setRegLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [showReceipts, setShowReceipts] = useState<Record<string, boolean>>({});

  const toggleReceipt = (id: string) => {
    setShowReceipts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute active group buys (non-deleted)
  const activeGroupBuys = useMemo(() => {
    return groupBuys.filter(gb => gb.status !== 'deleted');
  }, [groupBuys]);

  // Handle pre-selected target ID from notifications or direct jumps
  useEffect(() => {
    if (initialTargetId) {
      // Find within all groupBuys (since we check deleted/status, we want to know if it existed but was soft-deleted)
      const gb = groupBuys.find(g => g.id === initialTargetId);
      if (!gb || gb.status === 'deleted') {
        const errorMsg = "🔒 提示：本團購項目已被管理團隊調整下架或取消，請留意車會最新群發消息。";
        setModalMessage(errorMsg);
      } else {
        handleOpenRegisterModal(gb);
      }
      if (onClearTargetId) {
        onClearTargetId();
      }
    }
  }, [initialTargetId, groupBuys]);

  // Compute remaining slots for selected Group Buy inside modal
  const otherUsersQty = useMemo(() => {
    if (!selectedGb) return 0;
    return (selectedGb.currentRegistrations || [])
      .filter(r => r.userId === userId ? false : true)
      .reduce((acc, curr) => acc + curr.qty, 0);
  }, [selectedGb, userId]);

  const remainingSlots = useMemo(() => {
    if (!selectedGb) return Infinity;
    return (selectedGb.maxQuantity !== undefined && selectedGb.maxQuantity !== null && selectedGb.maxQuantity > 0)
      ? Math.max(0, selectedGb.maxQuantity - otherUsersQty)
      : Infinity;
  }, [selectedGb, otherUsersQty]);

  const isPlusDisabled = qty >= remainingSlots;

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
      alert('登記失敗，請稍後再試！');
    } finally {
      setRegLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 -ml-2 text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
                團購市集 <span className="text-cyber-green">Group Buy</span>
              </h2>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                100% 官方控管優質福利市集 / Authentic Accessories Marketplace
              </p>
            </div>
          </div>
        </div>
        {/* Skeleton pulse blocks */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-6 w-3/4 bg-zinc-800 animate-pulse rounded-lg" />
                  <div className="h-4 w-1/2 bg-zinc-800 animate-pulse rounded-md" />
                </div>
                <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded-xl" />
              </div>
              <div className="h-32 bg-zinc-800 animate-pulse rounded-2xl w-full" />
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800 animate-pulse rounded w-full animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-zinc-800 animate-pulse rounded" />
                  <div className="h-4 w-16 bg-zinc-800 animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={onRefresh || (async () => {})}>
      <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 -ml-2 text-white/40 hover:text-white transition-colors cursor-pointer"
            id="gb_back_btn"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
              團購市集 <span className="text-cyber-green">Group Buy</span>
            </h2>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
              100% 官方控管優質福利市集 / Authentic Accessories Marketplace
            </p>
          </div>
        </div>
      </div>

      {/* Main List Grid */}
      {activeGroupBuys.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest border border-white/5 rounded-2xl bg-white/[0.01]">
          目前暫時沒有進行中的官方團購項目
          <br />
          <span className="text-xs text-white/65 mt-2 block">NO ACTIVE GROUP BUY CURRENTLY</span>
        </div>
      ) : (
        <div className="space-y-8">
          {activeGroupBuys.map((gb) => {
            // Calculate total registered item quantities
            const totalQty = (gb.currentRegistrations || []).reduce((acc, current) => acc + current.qty, 0);
            const percentage = Math.round((totalQty / gb.targetQuantity) * 100);
            const progressPercent = Math.min(100, percentage);

            // Check if the current user has already registered
            const userReg = (gb.currentRegistrations || []).find(r => r.userId === userId);
            const userQty = userReg ? userReg.qty : 0;
            const hasRegistered = userQty > 0;

            const trackingGlowColor = percentage >= 100 ? 'bg-cyber-green' : 'bg-cyber-green/85';
            
            // Check if it's sold out
            const isSoldOut = gb.maxQuantity !== undefined && gb.maxQuantity !== null && gb.maxQuantity > 0 && totalQty >= gb.maxQuantity;

            // Check if it's expired
            let isExpired = false;
            let countdownText = '';
            if (gb.endDate) {
              const deadlineDate = typeof gb.endDate.toDate === 'function' ? gb.endDate.toDate() : new Date(gb.endDate);
              const now = new Date();
              isExpired = now > deadlineDate;

              if (!isExpired) {
                // Compute difference
                const diffTime = deadlineDate.getTime() - now.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const diffMins = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                
                if (diffDays > 0) {
                  countdownText = `⏱️ 限時募集：距離截止還有 ${diffDays} 天 ${diffHours} 小時`;
                } else if (diffHours > 0) {
                  countdownText = `⏱️ 限時募集：距離截止還有 ${diffHours} 小時 ${diffMins} 分鐘`;
                } else {
                  countdownText = `⏱️ 限時募集：距離截止還有 ${diffMins} 分鐘`;
                }
              }
            }

            const isLocked = gb.status === 'closed' || isExpired;

            return (
              <motion.div
                key={gb.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CyberCard
                  className={`overflow-hidden transition-all duration-300 relative ${
                    isLocked || isSoldOut
                      ? 'border-white/5 opacity-50 bg-white/[0.01] grayscale-[30%]'
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
                          isLocked
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isSoldOut
                            ? 'bg-red-500/30 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                            : 'bg-cyber-green text-black font-extrabold shadow-[0_0_10px_rgba(204,255,0,0.3)]'
                        }`}
                      >
                        {isLocked
                          ? '■ 已截止 / CLOSED' 
                          : isSoldOut 
                          ? '■ 已滿額 / SOLD OUT' 
                          : '● 招募中 / ACTIVE'}
                      </span>
                    </div>
 
                    {/* Content Column */}
                    <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        {/* Title and Badge */}
                        <div className="space-y-1.5">
                          <h3 className="text-xl font-bold font-mono text-white leading-tight">
                            {gb.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-block text-[8px] font-mono text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                              車友官方規格團購
                            </span>
                            
                            {/* Four-scenario adaptive tags */}
                            {isSoldOut ? (
                              <span className="inline-block text-[8px] font-mono font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
                                🔴 感謝支持！本團已滿額 (SOLD OUT)
                              </span>
                            ) : (gb.minQuantity !== undefined && gb.minQuantity !== null && gb.minQuantity > 0) ? (
                              totalQty < gb.minQuantity ? (
                                <span className="inline-block text-[8px] font-mono font-bold text-yellow-400 bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 rounded animate-pulse">
                                  ⏳ 預訂募集（差 {gb.minQuantity - totalQty} 套成團）
                                </span>
                              ) : (
                                <span className="inline-block text-[8px] font-mono font-bold text-cyber-green bg-cyber-green/15 border border-cyber-green/30 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(204,255,0,0.15)]">
                                  🟢 恭喜！本團已成功成團
                                </span>
                              )
                            ) : (
                              <span className="inline-block text-[8px] font-mono text-cyber-green bg-cyber-green/10 border border-cyber-green/20 px-2 py-0.5 rounded">
                                🔥 官方福利團（熱烈認購中）
                              </span>
                            )}

                            {/* Deadline Countdown / Status Tag */}
                            {gb.endDate && (
                              isExpired ? (
                                <span className="inline-block text-[8px] font-mono font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded shadow-[0_0_5px_rgba(239,68,68,0.1)]">
                                  🔒 本團已截止 (Closed)
                                </span>
                              ) : (
                                <span className="inline-block text-[8px] font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-[0_0_5px_rgba(245,158,11,0.1)]">
                                  {countdownText}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs font-mono text-white/50 leading-relaxed whitespace-pre-wrap">
                          {gb.description}
                        </p>

                        {/* Pricing Highlight Info */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-mono text-white/30 lowercase">特惠價格 / PRICE</span>
                          <span className="text-2xl font-mono font-black text-cyber-green leading-none tracking-tight">
                            HKD ${gb.price}
                          </span>
                          <span className="text-[10px] font-mono text-white/20">/ 包郵到港</span>
                        </div>
                      </div>

                      {/* Dynamic Progress indicator */}
                      <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex justify-between items-baseline mb-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-white/40">
                            <Users size={12} className="text-cyber-green" />
                            <span>認購進度 / PROGRESS</span>
                          </div>
                          <div className="text-[11px] font-mono">
                            <span className="text-white/60 font-bold">目前已認購 {totalQty}</span>
                            <span className="text-white/30"> / {gb.targetQuantity} 套</span>
                            {gb.maxQuantity !== undefined && gb.maxQuantity !== null && gb.maxQuantity > 0 && (
                              <span className="text-xs text-red-400 font-bold ml-1.5">
                                (限量 {gb.maxQuantity} 套)
                              </span>
                            )}
                            <span className="text-cyber-green font-black ml-2 text-xs">
                              (已完成 {percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Fluid Progress Bar */}
                        <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-cyber-green/10 p-[1px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            className={`h-full ${trackingGlowColor} shadow-[0_0_15px_rgba(204,255,0,0.3)] rounded-full`}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                        
                        {/* Success target notification */}
                        {isSoldOut ? (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-red-400 font-bold">
                            <CheckCircle size={10} className="text-red-400" />
                            <span>本品已全數額滿，感謝車友們的鼎力支持！SOLD OUT!</span>
                          </div>
                        ) : (gb.minQuantity !== undefined && gb.minQuantity !== null && gb.minQuantity > 0 && totalQty >= gb.minQuantity) ? (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-cyber-green">
                            <CheckCircle2 size={10} className="stroke-[3]" />
                            <span>本團已成功達標成團！SUCCESS TARGET REACHED AND MET MINIMUM!</span>
                          </div>
                        ) : percentage >= 100 ? (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-cyber-green">
                            <CheckCircle2 size={10} className="stroke-[3]" />
                            <span>已成功達標，正在集結成團！SUCCESS TARGET REACHED!</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Interactive Section / User Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        {/* Display existing registered quantity */}
                        {isExpired ? (
                          <div className="flex items-center gap-1.5 text-xs font-mono bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-red-400 font-bold max-w-full">
                            <span>⚠️ 本項目已過截止時間，認購名單已鎖定，如需協助請聯絡會長。</span>
                          </div>
                        ) : hasRegistered ? (
                          <div className="flex items-center gap-2 text-cyber-green text-xs font-mono bg-cyber-green/10 border border-cyber-green/20 px-3 py-2 rounded-xl">
                            <Check size={14} className="stroke-[3]" />
                            <span>
                              您已在本次團購登記認購：<strong>{userQty} 套</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                            {gb.status === 'active' 
                              ? isSoldOut 
                                ? '❌ 本品已宣布額滿，感謝熱切關注！' 
                                : '🛡️ 一人一單，認購後系統記錄誠意登記' 
                              : '❌ 本次團購已截止認購'}
                          </div>
                        )}

                        {/* Subscription Buttons */}
                        {isLocked ? (
                          hasRegistered ? (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button
                                disabled
                                className="py-2.5 px-4 rounded-xl bg-white/5 text-white/35 border border-white/5 text-xs font-mono font-bold cursor-not-allowed select-none text-center"
                              >
                                🔒 認購截止 / LOCKED
                              </button>
                              <button
                                onClick={() => toggleReceipt(gb.id)}
                                className="py-2.5 px-4 rounded-xl bg-cyber-green text-black hover:bg-cyber-green/80 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <QrCode size={13} />
                                <span>{showReceipts[gb.id] ? '隱藏電子憑證' : '查看電子憑證'}</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled
                              className="py-2.5 px-6 rounded-xl bg-white/5 text-white/20 border border-white/5 text-xs font-mono font-bold cursor-not-allowed select-none"
                            >
                              🔒 已截止 / LOCK
                            </button>
                          )
                        ) : isSoldOut ? (
                          <button
                            disabled
                            className="py-2.5 px-6 rounded-xl bg-red-500/10 text-red-400/50 border border-red-500/15 text-xs font-mono font-bold cursor-not-allowed select-none"
                          >
                            🔴 感謝支持！本團已滿額 (SOLD OUT)
                          </button>
                        ) : (
                          <CyberButton
                            onClick={() => handleOpenRegisterModal(gb)}
                            variant={hasRegistered ? 'secondary' : 'primary'}
                            className="text-xs font-bold py-2.5 px-6 min-w-[140px]"
                          >
                            {hasRegistered ? '修改我的認購數量 / EDIT QUANTITY' : '我要認購 / COMMENCE REGISTER'}
                          </CyberButton>
                        )}
                      </div>
                    </div>
                  </div>

                  {showReceipts[gb.id] && userReg && (
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <GroupBuyReceipt 
                        groupBuy={gb} 
                        registration={userReg} 
                        userId={userId} 
                      />
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
              className="w-full max-w-md bg-cyber-bg border border-cyber-green/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(204,255,0,0.15)] relative overflow-hidden"
            >
              {/* Glow Accent line */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-cyber-green to-transparent" />

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
                    <span className="text-cyber-green font-bold">HKD ${selectedGb.price}</span>
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
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all font-bold cursor-pointer"
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
                      disabled={isPlusDisabled}
                      onClick={() => setQty(qty + 1)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all font-bold cursor-pointer ${
                        isPlusDisabled
                          ? 'bg-white/5 text-white/15 border-white/5 cursor-not-allowed select-none'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-cyber-green/50 text-white'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Highlight limits info */}
                  {remainingSlots !== Infinity && (
                    <div className="text-center">
                      <span className="text-[9px] font-mono text-red-400 font-bold bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded">
                        ⚠️ 限量剩餘名額: {remainingSlots} 套 (您最高可調至 {remainingSlots} 套)
                      </span>
                    </div>
                  )}
                </div>

                {/* Dynamic mathematical subtotal calculation summary table */}
                <div className="p-3 bg-white/[0.01] border-t border-b border-white/5 flex justify-between font-mono text-xs">
                  <span className="text-white/40">合計認購金額 / TOTAL PRICE</span>
                  <span className="text-cyber-green font-black tracking-tight text-sm">
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
                    <CheckCircle className="text-cyber-green flex-shrink-0 mt-0.5" size={12} />
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
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-white transition-colors border border-white/10 cursor-pointer"
                  >
                    取消 / CANCEL
                  </button>
                  <CyberButton
                    onClick={submitRegistration}
                    disabled={regLoading}
                    className="text-xs py-2.5"
                  >
                    {regLoading ? '⌛ 處理中，請勿重複點擊...' : qty === 0 ? '取消認購 / REMOVE' : '確定認購 / SUBMIT'}
                  </CyberButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔴 Ghost Notification Foolproof Conditions Modal Message (黑綠科技風格 / CYBERPUNK CHIC ALERT) */}
      <AnimatePresence>
        {modalMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0d0f12] border-2 border-cyber-green rounded-2xl p-6 shadow-[0_0_35px_rgba(163,230,21,0.2)] relative overflow-hidden text-white"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-green via-emerald-500 to-cyber-green" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-cyber-green">
                  <AlertTriangle size={24} className="animate-pulse" />
                  <h4 className="font-mono font-bold uppercase tracking-wider text-sm">系統與安全傳輸提示 / SYSTEM ALERT</h4>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-cyber-green/20 text-[#A3E635] font-mono text-xs leading-relaxed">
                  {modalMessage}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalMessage(null)}
                    className="px-5 py-2 bg-cyber-green hover:bg-[#aefd2f] active:brightness-90 text-black font-mono font-black text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(163,230,21,0.3)] tracking-widest cursor-pointer"
                  >
                    讀取確認 / CONFIRM
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
    </PullToRefresh>
  );
};
