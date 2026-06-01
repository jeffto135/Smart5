import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Gift, 
  Tag, 
  MapPin, 
  Phone, 
  Calendar, 
  Compass 
} from 'lucide-react';
import { ClubPerk } from '../types';
import { CyberCard } from './ui/CyberCard';
import { PullToRefresh } from './ui/PullToRefresh';

interface ClubPerksProps {
  clubPerks: ClubPerk[];
  isAdmin?: boolean;
  onAddPerk?: (data: Omit<ClubPerk, 'id' | 'createdAt'>) => Promise<any>;
  onUpdatePerk?: (id: string, data: Partial<ClubPerk>) => Promise<void>;
  onDeletePerk?: (id: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

const CATEGORIES = ['汽車美容', '改裝配件', '汽車保險', '餐飲娛樂'] as const;

export const ClubPerks: React.FC<ClubPerksProps> = ({
  clubPerks = [],
  onClose,
  isLoading = false,
  onRefresh
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  // Filtering perks
  const filteredPerks = useMemo(() => {
    if (selectedCategory === '全部') return clubPerks;
    return clubPerks.filter(perk => perk.category === selectedCategory);
  }, [clubPerks, selectedCategory]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case '汽車美容':
        return 'bg-cyber-green/10 text-cyber-green border-cyber-green/20';
      case '改裝配件':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case '汽車保險':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case '餐飲娛樂':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-white/5 text-white/60 border-white/10';
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
              className="p-2 -ml-2 text-white/40 hover:text-white transition-colors cursor-pointer"
              id="perks_back_btn"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
                車友福利 <span className="text-cyber-green">Club Perks</span>
              </h2>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                Smart #5 Owners Club 專屬特約合作商戶福利
              </p>
            </div>
          </div>
        </div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 bg-zinc-800 animate-pulse rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-zinc-800 animate-pulse rounded-lg" />
              <div className="h-10 w-32 bg-zinc-850 animate-pulse rounded-xl" />
              <div className="h-16 w-full bg-zinc-800 animate-pulse rounded-xl" />
              <div className="h-12 w-full bg-zinc-800 animate-pulse rounded-xl" />
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
            id="perks_back_btn"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
              車友福利 <span className="text-cyber-green">Club Perks</span>
            </h2>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
              Smart #5 Owners Club 專屬特約合作商戶福利
            </p>
          </div>
        </div>
      </div>

      {/* Categories Filter Tabs bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('全部')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border whitespace-nowrap cursor-pointer ${
            selectedCategory === '全部'
              ? 'bg-cyber-green text-black border-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.15)]'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          全部 ALL
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-cyber-green text-black border-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.15)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid display list */}
      {filteredPerks.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest border border-white/5 rounded-2xl bg-white/[0.01]">
          目前此類別暫時沒有專屬優惠項目
          <br />
          <span className="text-xs text-white/65 mt-2 block">NO ACTIVE OFFERS UNDER THIS CATEGORY</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPerks.map((perk, index) => (
            <motion.div
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
                <div className="space-y-3 pt-1">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${getCategoryColor(perk.category)}`}>
                      <Tag size={10} />
                      {perk.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold font-sans text-white leading-snug">
                    {perk.title}
                  </h3>

                  {/* Dual Pricing Display */}
                  {perk.discountPrice !== undefined && perk.discountPrice !== null && (
                    <div className="flex items-baseline gap-2 font-mono py-1 px-2.5 rounded-lg bg-cyber-green/5 border border-cyber-green/10 w-fit">
                      <span className="text-xs text-white/50">車友價:</span>
                      <span className="text-xl font-extrabold text-cyber-green leading-none">
                        ${perk.discountPrice}
                      </span>
                      {perk.originalPrice !== undefined && perk.originalPrice !== null && (
                        <span className="text-xs text-white/30 line-through ml-1">
                          原價 ${perk.originalPrice}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-white/5 my-2" />

                  {/* Discount details */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/70 leading-relaxed font-sans bg-white/[0.02] p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap">
                      {perk.discountDetail}
                    </p>

                    {/* Address & Instant Navigation */}
                    {perk.address && (
                      <div className="space-y-1.5 p-2.5 px-3 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                        <div className="flex gap-2 items-start text-xs text-white/70 font-sans">
                          <MapPin size={14} className="mt-0.5 text-white/40 flex-none" />
                          <span className="leading-relaxed">{perk.address}</span>
                        </div>
                        {perk.googleMapsUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(perk.googleMapsUrl, '_blank')}
                            className="flex-none flex items-center justify-center gap-1 bg-cyber-green text-black font-mono font-black text-[10px] px-3 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(204,255,0,0.2)] cursor-pointer uppercase"
                            title="一鍵導航 GO"
                          >
                            <Compass size={12} className="animate-spin-slow" />
                            <span>一鍵導航 GO</span>
                          </button>
                        )}
                      </div>
                    )}

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
    </div>
    </PullToRefresh>
  );
};
