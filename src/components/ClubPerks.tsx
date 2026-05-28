import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Shield, 
  Plus, 
  Trash2, 
  Calendar, 
  Phone, 
  Gift, 
  Tag, 
  X,
  Sparkles,
  Layers
} from 'lucide-react';
import { ClubPerk } from '../types';
import { CyberCard } from './ui/CyberCard';

interface ClubPerksProps {
  clubPerks: ClubPerk[];
  isAdmin: boolean;
  onAddPerk: (data: Omit<ClubPerk, 'id' | 'createdAt'>) => Promise<any>;
  onDeletePerk: (id: string) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = ['汽車美容', '改裝配件', '汽車保險', '餐飲娛樂'] as const;

export const ClubPerks: React.FC<ClubPerksProps> = ({
  clubPerks = [],
  isAdmin,
  onAddPerk,
  onDeletePerk,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [merchantName, setMerchantName] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('汽車美容');
  const [title, setTitle] = useState('');
  const [discountDetail, setDiscountDetail] = useState('');
  const [contact, setContact] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Filtering perks
  const filteredPerks = useMemo(() => {
    if (selectedCategory === '全部') return clubPerks;
    return clubPerks.filter(perk => perk.category === selectedCategory);
  }, [clubPerks, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantName || !title || !discountDetail || !contact) {
      alert('請填寫所有必要欄位 / PLEASE FILL ALL REQUIRED FIELDS');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddPerk({
        merchantName,
        category,
        title,
        discountDetail,
        contact,
        expiryDate
      });
      alert('發佈成功 / PERK PUBLISHED');
      // Reset form
      setMerchantName('');
      setCategory('汽車美容');
      setTitle('');
      setDiscountDetail('');
      setContact('');
      setExpiryDate('');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      const isPermissionDenied = err.message && (
        err.message.includes('permission') || 
        err.message.includes('Permission') || 
        err.message.includes('Unauthorised') || 
        err.message.includes('Unauthorized') || 
        err.message.includes('權限')
      );
      if (isPermissionDenied) {
        alert("發佈失敗，請聯絡會長確認您的次級管理員權限設定");
      } else {
        alert('發佈失敗: ' + (err.message || '未知錯誤'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`確定要刪除「${name}」的專屬優惠嗎？`)) {
      try {
        await onDeletePerk(id);
        alert('刪除成功 / DELETED');
      } catch (err: any) {
        alert('刪除失敗: ' + (err.message || '未知錯誤'));
      }
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case '汽車美容':
        return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
      case '改裝配件':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case '汽車保險':
        return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case '餐飲娛樂':
        return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="space-y-6 pb-24 relative min-h-screen">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onClose} 
          className="p-2 -ml-2 text-white/40 hover:text-white transition-colors cursor-pointer"
          id="perks_back_btn"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-mono font-bold uppercase tracking-tight flex items-center gap-2">
          車友福利 <span className="text-cyber-green">Club Perks</span>
        </h2>
      </div>

      {/* 1. 頂部強制顯示：誠信與免責公告 */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-[#A3E635]/30 p-4 rounded-2xl shadow-[0_4px_20px_rgba(163,230,21,0.05)] relative overflow-hidden"
        id="perks_disclaimer"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 select-none pointer-events-none">
          <Shield size={120} className="text-[#A3E635]" />
        </div>
        <div className="flex gap-3">
          <div className="flex-none text-2xl animate-pulse">🛡️</div>
          <div className="space-y-1.5 z-10">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A3E635]">
              車會誠信與利益迴避聲明 / TRUST & DISCLAIMER
            </h4>
            <p className="text-xs text-white/80 leading-relaxed font-sans">
              本專區所列之所有商戶折扣及專屬優惠，均由 Smart5 Owners 籌委會義工及熱心車友直接與商戶接洽傾返黎。全體管理團隊在此承諾，所有合作均不涉及任何個人利益、金錢回扣或商業佣金。本系統僅協助宣傳與造福車友，車友於商戶消費時請自行評估服務質素。
            </p>
          </div>
        </div>
      </motion.div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
        {['全部', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider border transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-cyber-green border-cyber-green text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/30'
            }`}
            id={`perk_filter_${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Perks List View */}
      {filteredPerks.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest border border-white/5 bg-white/[0.01] rounded-2xl">
          尚無進行中的商戶優惠 / NO AVAILABLE PERKS
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPerks.map((perk, index) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              key={perk.id}
            >
              <CyberCard 
                title={perk.merchantName} 
                icon={<Gift size={18} className="text-cyber-green" />}
                className="hover:border-cyber-green/30 transition-colors relative h-full flex flex-col justify-between"
              >
                {/* Delete Button for Admin */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(perk.id, perk.merchantName)}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="刪除優惠"
                    id={`perk_delete_btn_${perk.id}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="space-y-3 pt-1">
                  {/* Category Badge */}
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${getCategoryColor(perk.category)}`}>
                      <Tag size={10} />
                      {perk.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold font-sans text-white leading-snug">
                    {perk.title}
                  </h3>

                  {/* Divider */}
                  <div className="border-t border-white/5 my-2" />

                  {/* Discount details */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/70 leading-relaxed font-sans bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                      {perk.discountDetail}
                    </p>

                    {/* Contact */}
                    <div className="flex gap-2 items-start text-xs text-cyber-green/90 font-mono">
                      <Phone size={14} className="mt-0.5 flex-none" />
                      <span className="leading-snug break-all">{perk.contact}</span>
                    </div>

                    {/* Expiration */}
                    {perk.expiryDate && (
                      <div className="flex gap-2 items-center text-xs text-white/40 font-mono">
                        <Calendar size={14} />
                        <span>截止日期: {perk.expiryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Action Button for Admin Only */}
      {isAdmin && (
        <div className="fixed bottom-24 right-6 z-40 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-cyber-green text-black font-mono font-bold px-4 py-3 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.4)] cursor-pointer"
            id="perks_add_float_btn"
          >
            <Plus size={20} className="stroke-[3]" />
            <span>發佈新專屬優惠</span>
          </motion.button>
        </div>
      )}

      {/* Add Perk Modal Form for Admin */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Form Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-cyber-bg-alt border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10"
              id="perks_form_modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <span className="text-sm font-mono font-bold text-cyber-green flex items-center gap-1.5 uppercase">
                  <Sparkles size={16} />
                  發佈車專屬優惠 / NEW CLUB BENEFIT
                </span>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white cursor-pointer"
                  id="perks_close_modal_btn"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                
                {/* Merchant Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                    商戶名稱 / MERCHANT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="例如：極速鍍膜專門店 (觀塘)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-green transition-colors"
                  />
                </div>

                {/* Categories selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                    福利類別 / CATEGORY *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          category === cat
                            ? 'bg-cyber-green/10 border-cyber-green text-cyber-green'
                            : 'bg-black/20 border-white/5 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Offer Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                    優惠標題 / DISCOUNT TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：Smart #5 專屬全車水晶鍍膜套餐 8 折"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-green transition-colors"
                  />
                </div>

                {/* Discount details */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                    使用詳情 / DISCOUNT DETAILS *
                  </label>
                  <textarea
                    required
                    rows={3}
                    maxLength={800}
                    value={discountDetail}
                    onChange={(e) => setDiscountDetail(e.target.value)}
                    placeholder="例如：憑本 App 內「帳戶頁面」向店員出示實名車主身份，即享全單 8 折並加送前擋玻璃撥水鍍膜乙次。"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-green transition-colors resize-none"
                  />
                </div>

                {/* Contact details */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                    聯絡與預約方式 / CONTACT & BOOKING *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="例如：電話/WhatsApp: 61234567 (預約時請註明 Smart5 車友)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-green transition-colors"
                  />
                </div>

                {/* Expiration date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                    優惠截止日期 / EXPIRY DATE (選填)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-green transition-colors"
                  />
                </div>

                {/* Modal actions */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-xs font-mono font-bold text-white transition-all cursor-pointer"
                  >
                    取消 / CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-cyber-green hover:brightness-110 disabled:opacity-50 text-black rounded-xl py-3 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>發佈中...</span>
                    ) : (
                      <>
                        <Plus size={16} className="stroke-[3]" />
                        <span>確認發佈 / SUBMIT</span>
                      </>
                    )}
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
