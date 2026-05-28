import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Gift, 
  Tag, 
  MapPin, 
  Phone, 
  Calendar, 
  X, 
  Sparkles,
  Compass
} from 'lucide-react';
import { ClubPerk } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';

interface AdminPerksProps {
  clubPerks: ClubPerk[];
  onAddPerk: (data: Omit<ClubPerk, 'id' | 'createdAt'>) => Promise<any>;
  onUpdatePerk: (id: string, data: Partial<ClubPerk>) => Promise<void>;
  onDeletePerk: (id: string) => Promise<void>;
}

const CATEGORIES = ['汽車美容', '改裝配件', '汽車保險', '餐飲娛樂'] as const;

export const AdminPerks: React.FC<AdminPerksProps> = ({
  clubPerks = [],
  onAddPerk,
  onUpdatePerk,
  onDeletePerk
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerkId, setEditingPerkId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [merchantName, setMerchantName] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('汽車美容');
  const [title, setTitle] = useState('');
  const [discountDetail, setDiscountDetail] = useState('');
  const [contact, setContact] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [address, setAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  const handleOpenAdd = () => {
    setEditingPerkId(null);
    setMerchantName('');
    setCategory('汽車美容');
    setTitle('');
    setDiscountDetail('');
    setContact('');
    setExpiryDate('');
    setOriginalPrice('');
    setDiscountPrice('');
    setAddress('');
    setGoogleMapsUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (perk: ClubPerk) => {
    setEditingPerkId(perk.id);
    setMerchantName(perk.merchantName);
    setCategory(perk.category);
    setTitle(perk.title);
    setDiscountDetail(perk.discountDetail);
    setContact(perk.contact);
    setExpiryDate(perk.expiryDate || '');
    setOriginalPrice(perk.originalPrice !== undefined && perk.originalPrice !== null ? perk.originalPrice.toString() : '');
    setDiscountPrice(perk.discountPrice !== undefined && perk.discountPrice !== null ? perk.discountPrice.toString() : '');
    setAddress(perk.address || '');
    setGoogleMapsUrl(perk.googleMapsUrl || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPerkId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!merchantName || !title || !discountDetail || !contact || !discountPrice) {
      alert('請填寫所有必要欄位 / PLEASE FILL ALL REQUIRED FIELDS');
      return;
    }

    if (originalPrice && (isNaN(Number(originalPrice)) || Number(originalPrice) < 0)) {
      alert('原價必須是有效正數 / ORIGINAL PRICE MUST BE A VALID POSITIVE NUMBER');
      return;
    }

    if (isNaN(Number(discountPrice)) || Number(discountPrice) <= 0) {
      alert('車友特惠價必須是有效正數 / DISCOUNT PRICE MUST BE A VALID POSITIVE NUMBER');
      return;
    }

    setIsSubmitting(true);
    try {
      const perkData = {
        merchantName,
        category,
        title,
        discountDetail,
        contact,
        expiryDate: expiryDate || undefined,
        originalPrice: originalPrice !== '' ? Number(originalPrice) : undefined,
        discountPrice: Number(discountPrice),
        address: address || undefined,
        googleMapsUrl: googleMapsUrl || undefined
      };

      if (editingPerkId) {
        await onUpdatePerk(editingPerkId, perkData);
        alert('車友優惠修改成功 / CLUB OFFERS UPDATED');
      } else {
        await onAddPerk(perkData);
        alert('車友優惠發佈成功 / NEW CLUB OFFERS PUBLISHED');
      }
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      alert('操作失敗: ' + (err.message || '未知錯誤'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, merchant: string) => {
    if (window.confirm(`確定要下架並刪除「${merchant}」的特惠項目嗎？此操作不可逆！`)) {
      try {
        await onDeletePerk(id);
        alert('成功下架該優惠 / REMOVED');
      } catch (err: any) {
        alert('操作失敗: ' + (err.message || '未知錯誤'));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50">福利商戶優惠管理</h3>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">管理車友專屬線下/特許福利</p>
        </div>
        <CyberButton onClick={handleOpenAdd} className="py-2 px-4 text-xs font-bold">
          <Plus size={14} className="mr-1" /> 新增商戶優惠
        </CyberButton>
      </div>

      {clubPerks.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest border border-white/5 bg-white/[0.01] rounded-2xl">
          目前暫無福利商戶優惠 / NO CLUB PERKS AVAILABLE
        </div>
      ) : (
        <div className="space-y-4">
          {clubPerks.map((perk) => (
            <CyberCard key={perk.id} className="bg-white/[0.02] border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Specs Info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyber-green/[0.15] text-cyber-green border border-cyber-green/20">
                      {perk.category}
                    </span>
                    <h4 className="font-bold text-sm text-white font-mono truncate">
                      {perk.merchantName} — {perk.title}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-[10px] font-mono text-white/40 uppercase">
                    <div>
                      <span className="block opacity-50">優惠價 / perk price</span>
                      <span className="text-sm font-bold text-cyber-green">${perk.discountPrice}</span>
                    </div>
                    {perk.originalPrice !== undefined && perk.originalPrice !== null && (
                      <div>
                        <span className="block opacity-50">原價 / original price</span>
                        <span className="text-sm font-bold text-white/50 line-through">${perk.originalPrice}</span>
                      </div>
                    )}
                    <div>
                      <span className="block opacity-50">熱線聯絡 / contact</span>
                      <span className="text-sm font-bold text-white/80 truncate block">{perk.contact}</span>
                    </div>
                    {perk.expiryDate && (
                      <div>
                        <span className="block opacity-50">有效期限 / expiry</span>
                        <span className="text-sm font-bold text-white/80 block">{perk.expiryDate}</span>
                      </div>
                    )}
                  </div>

                  {perk.address && (
                    <div className="text-[10px] font-mono text-white/60 flex items-start gap-1 pb-1 pt-2 border-t border-white/5">
                      <MapPin size={12} className="text-white/30 mt-0.5" />
                      <span>{perk.address}</span>
                      {perk.googleMapsUrl && (
                        <a 
                          href={perk.googleMapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-cyber-green underline ml-2 hover:brightness-110 flex items-center gap-0.5"
                        >
                          <Compass size={10} /> 導航
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Right actions row */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(perk)}
                    className="p-2 bg-cyber-green/10 hover:bg-cyber-green/20 text-cyber-green border border-cyber-green/20 rounded-lg transition-all cursor-pointer"
                    title="編輯商戶資料"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(perk.id, perk.merchantName)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all cursor-pointer"
                    title="下架優惠"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

              </div>
            </CyberCard>
          ))}
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-md w-full h-full"
            />

            {/* Modal Box */}
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
                  {editingPerkId ? '編輯合作商戶資料 / EDIT CLUB BENEFIT' : '新增特約商戶優惠 / NEW MERCHANT PERK'}
                </span>
                <button 
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <CyberInput
                    label="商戶名稱 / MERCHANT NAME *"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="例如: 極速鍍膜專門店 (觀塘)"
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">福利類別 / CATEGORY *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyber-green/50 transition-all font-mono h-[46px] text-sm"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-cyber-bg text-white">{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <CyberInput
                    label="優惠標題 / PERK TITLE *"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如: Smart #5 專屬全車水晶鍍膜套餐"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CyberInput
                    label="一般原價 (HKD - 選填) / ORIGINAL PRICE"
                    type="number"
                    min="0"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="例如: 1200"
                  />
                  <CyberInput
                    label="車友優惠價 (HKD) * / DISCOUNT PRICE *"
                    required
                    type="number"
                    min="1"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="例如: 960"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CyberInput
                    label="聯絡方式 / CONTACT HOTLINE *"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="WhatsApp: 61234567"
                  />
                  <CyberInput
                    label="截止有效期 (選填) / EXPIRY DATE"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    placeholder="例如: 2026-12-31"
                  />
                </div>

                <div className="space-y-1">
                  <CyberInput
                    label="商戶實體地址 / SHOP ADDRESS"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="觀塘開源道 60 號駱駝漆大廈地下 A 舖"
                  />
                </div>

                <div className="space-y-1">
                  <CyberInput
                    label="一鍵導航連結 / GOOGLE MAPS URL"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">優惠活動詳情 / DISCOUNT DETAIL *</label>
                  <textarea
                    required
                    rows={3}
                    value={discountDetail}
                    onChange={(e) => setDiscountDetail(e.target.value)}
                    placeholder="列明車友認領詳情，例如：憑 Smart #5 Owners Club 電子會員卡（本App内實名卡）可享受 8 折優惠。"
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
                    {isSubmitting ? '處理中...' : editingPerkId ? '儲存更改' : '確認發佈'}
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
