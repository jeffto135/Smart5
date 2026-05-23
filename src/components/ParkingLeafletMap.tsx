import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Youtube, 
  Navigation, 
  Info, 
  X, 
  Zap, 
  AlertTriangle, 
  Star, 
  MessageSquare, 
  Send, 
  Check 
} from 'lucide-react';
import { ParkingLot } from '../types';
import { CyberCard } from './ui/CyberCard';
import { auth } from '../lib/firebase';

interface ParkingLeafletMapProps {
  parkingLots: ParkingLot[];
  onAddChargingFeedback?: (lotId: string, realKw: number, rating: number, note: string, testedGun?: string) => Promise<void>;
}

const HK_CENTER: [number, number] = [22.3193, 114.1694];

// Component to handle map center and zoom changes
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Create a custom marker icon component with difficulty color framing and optional charging badge
const createCustomIcon = (color: string, isSelected: boolean, hasCharging?: boolean) => {
  const size = isSelected ? 42 : 32;
  
  const chargingBadgeHtml = hasCharging ? `
    <div style="
      position: absolute;
      top: -8px;
      right: -8px;
      background: #CCFF00;
      color: black;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px #CCFF00;
      border: 1.5px solid #000;
      z-index: 999;
      animation: pulse 2s infinite;
    ">⚡</div>
  ` : '';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 ${isSelected ? '25px' : '6px'} ${color};
        border: 2px solid rgba(255,255,255,0.5);
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="
          width: 38%;
          height: 38%;
          background: #000;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
        ${chargingBadgeHtml}
        ${isSelected ? `
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

export const ParkingLeafletMap: React.FC<ParkingLeafletMapProps> = ({ parkingLots, onAddChargingFeedback }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | '港島' | '九龍' | '新界'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | '輕易' | '中等' | '地獄' | '不可能的任務'>('all');
  const [onlyChargingFilter, setOnlyChargingFilter] = useState(false);
  
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(HK_CENTER);
  const [mapZoom, setMapZoom] = useState(11);

  // Form states for adding crowdsourced feedbacks
  const [feedbackKw, setFeedbackKw] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [selectedTestedGun, setSelectedTestedGun] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // Automatically refresh selected lot data whenever the underlying props update (e.g. dynamic averages)
  const selectedLot = useMemo(() => {
    if (!selectedLotId) return null;
    return parkingLots.find(lot => lot.id === selectedLotId) || null;
  }, [parkingLots, selectedLotId]);

  const filteredLots = useMemo(() => {
    return parkingLots.filter(lot => {
      const matchSearch = lot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lot.address && lot.address.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchRegion = regionFilter === 'all' || lot.region === regionFilter;
      const matchDifficulty = difficultyFilter === 'all' || lot.difficultyTag === difficultyFilter;
      const matchCharging = !onlyChargingFilter || lot.hasCharging === true;
      return matchSearch && matchRegion && matchDifficulty && matchCharging;
    });
  }, [parkingLots, searchQuery, regionFilter, difficultyFilter, onlyChargingFilter]);

  const handleLotClick = (lot: ParkingLot) => {
    setSelectedLotId(lot.id);
    setMapCenter([lot.lat, lot.lng]);
    setMapZoom(16);
    // Reset form states when switching lots
    setShowFeedbackForm(false);
    setFeedbackError('');
    setFeedbackSuccess('');
    setFeedbackKw('');
    setFeedbackRating(5);
    setFeedbackNote('');
    setSelectedTestedGun('');
  };

  const getDifficultyColor = (tag: ParkingLot['difficultyTag'], hasDifficulty?: boolean) => {
    if (hasDifficulty === false || !tag) return '#7e7e7e'; // Cool slate grey
    switch (tag) {
      case '輕易': return '#00FF66'; // Fluorescent Green
      case '中等': return '#FFD700'; // Gold Warning
      case '地獄': return '#FF3333'; // Deep Crimson
      case '不可能的任務': return '#E000FF'; // Cyber Magenta
      default: return '#00FF66';
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddChargingFeedback || !selectedLotId) return;

    const kwNum = parseInt(feedbackKw);
    if (!kwNum || kwNum <= 0) {
      setFeedbackError('請輸入有效的實測速度 (kW)！');
      return;
    }

    setIsSubmitting(true);
    setFeedbackError('');
    setFeedbackSuccess('');

    try {
      await onAddChargingFeedback(
        selectedLotId,
        kwNum,
        feedbackRating,
        feedbackNote,
        selectedTestedGun || undefined
      );
      setFeedbackSuccess('🎉 感謝回報！您的充電大數據已同步更新！');
      setFeedbackKw('');
      setFeedbackNote('');
      setFeedbackRating(5);
      setSelectedTestedGun('');
      setTimeout(() => {
        setShowFeedbackForm(false);
        setFeedbackSuccess('');
      }, 3000);
    } catch (err: any) {
      setFeedbackError(err.message || '提交失敗，請重試！');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentUser = auth.currentUser;

  return (
    <div className="flex flex-col h-full space-y-3 sm:space-y-4">
      {/* Search & Co-Fusing Premium Filter Header */}
      <div className="space-y-3 p-3 sm:p-4 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text" 
              placeholder="搜尋停車場名稱或地址..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 transition-all font-mono placeholder:text-white/20"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            {(['all', '港島', '九龍', '新界'] as const).map(region => (
              <button
                key={region}
                type="button"
                onClick={() => setRegionFilter(region)}
                className={`flex-1 min-w-[70px] py-2 sm:py-3 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                  regionFilter === region 
                    ? 'bg-cyber-green border-cyber-green text-black shadow-[0_0_15px_rgba(204,255,0,0.35)]' 
                    : 'bg-white/5 text-white/30 border-white/5 hover:border-white/25'
                }`}
              >
                {region === 'all' ? '全部區域' : region}
              </button>
            ))}
          </div>
        </div>

        {/* Co-Fusing Filters (Difficulty Select + Has charging switch) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2.5 border-t border-white/5">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
            <span className="text-[10px] text-white/40 font-mono flex items-center pr-1.5 uppercase shrink-0">難度評級:</span>
            {(['all', '輕易', '中等', '地獄', '不可能的任務'] as const).map(diff => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficultyFilter(diff)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all border ${
                  difficultyFilter === diff
                    ? 'bg-white/10 border-white text-white font-black'
                    : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'
                }`}
              >
                {diff === 'all' ? '全部' : diff}
              </button>
            ))}
          </div>

          <label className="flex items-center justify-between md:justify-start gap-3 cursor-pointer select-none bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 transition-all text-xs shrink-0 duration-250">
            <span className="font-mono text-[10px] text-white/70 uppercase tracking-widest flex items-center gap-1.5">
              💡 只顯示有充電設備 ⚡
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={onlyChargingFilter}
                onChange={(e) => setOnlyChargingFilter(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-8 h-4.5 rounded-full transition-colors ${onlyChargingFilter ? 'bg-cyber-green' : 'bg-white/10'}`} />
              <div className={`absolute w-3.5 h-3.5 rounded-full bg-black top-[2px] left-[2px] transition-transform ${onlyChargingFilter ? 'translate-x-3.5' : 'translate-x-0 bg-white/40'}`} />
            </div>
          </label>
        </div>
      </div>

      {/* Map and Detail display */}
      <div className="flex-1 min-h-[300px] sm:min-h-[450px] relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#121212] shadow-inner">
        <MapContainer
          center={HK_CENTER}
          zoom={11}
          style={{ width: '100%', height: '100%', background: '#121212' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          <ZoomControl position="bottomright" />
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          
          {filteredLots.map(lot => (
            <Marker 
              key={lot.id} 
              position={[lot.lat, lot.lng]}
              icon={createCustomIcon(getDifficultyColor(lot.difficultyTag, lot.hasDifficulty), selectedLotId === lot.id, lot.hasCharging)}
              eventHandlers={{
                click: () => handleLotClick(lot)
              }}
            />
          ))}
        </MapContainer>

        {/* Selected Lot Cyber Detail Panel */}
        <AnimatePresence>
          {selectedLot && (
            <motion.div
              initial={{ opacity: 0, y: 30, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 30, x: '-50%' }}
              className="absolute bottom-6 left-1/2 z-[1000] w-[calc(100%-32px)] max-w-md max-h-[80%] overflow-y-auto custom-scrollbar rounded-2xl"
            >
              <CyberCard className="border-cyber-green/50 shadow-[0_20px_60px_rgba(0,0,0,0.95)] bg-black/95 backdrop-blur-3xl p-5 relative">
                <button 
                  onClick={() => setSelectedLotId(null)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="space-y-4 pt-1">
                  {/* Title Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedLot.hasDifficulty !== false && selectedLot.difficultyTag && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                          selectedLot.difficultyTag === '不可能的任務' ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.4)]' :
                          selectedLot.difficultyTag === '地獄' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 
                          selectedLot.difficultyTag === '中等' ? 'bg-yellow-500 text-black' : 'bg-cyber-green text-black'
                        }`}>
                          {selectedLot.difficultyTag}難度
                        </span>
                      )}
                      {selectedLot.hasCharging && (
                        <span className="px-2 py-0.5 rounded bg-lime-500/10 border border-lime-400 text-lime-400 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-0.5 shadow-[0_0_8px_rgba(163,230,53,0.15)]">
                          ⚡ 配備充電樁
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">{selectedLot.region}</span>
                    </div>
                    <h4 className="text-xl font-bold text-white tracking-tight leading-tight">{selectedLot.name}</h4>
                    {selectedLot.address && (
                      <p className="text-xs text-white/40 font-mono mt-1.5 flex items-center gap-1">
                        <MapPin size={11} className="text-cyber-green/60" /> {selectedLot.address}
                      </p>
                    )}
                  </div>
                  
                  {/* Section A: 泊車資訊 */}
                  {selectedLot.hasDifficulty !== false && selectedLot.difficultyTag && selectedLot.adminNotes && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 animate-fade-in">
                      <h5 className="text-[10px] font-mono font-bold uppercase text-white/40 mb-1.5 tracking-wider flex items-center gap-1.5">
                        🚗 停車場泊位心得
                      </h5>
                      <p className="text-xs text-white/70 font-sans leading-relaxed flex gap-2">
                        <Info size={14} className="shrink-0 text-cyber-green/50 mt-0.5" />
                        {selectedLot.adminNotes}
                      </p>
                    </div>
                  )}

                  {/* Section B: 充電資訊與大數據 Wiki (Condition Render on hasCharging) */}
                  {selectedLot.hasCharging ? (
                    <div className="p-4 rounded-xl bg-[#ccff00]/[0.02] border-2 border-dashed border-[#ccff00]/20 space-y-3.5 animate-fade-in text-left">
                      {/* 標題欄高亮 */}
                      <div className="p-3 rounded-lg bg-cyber-green text-black font-mono font-bold text-xs uppercase tracking-tight flex items-center justify-between shadow-[0_0_15px_rgba(204,255,0,0.2)] text-left">
                        <span className="flex items-center gap-1 font-bold text-left">
                          🔋 {selectedLot.chargingInfo?.provider || '未知供應商'} ｜ 全場共 {selectedLot.gunGroups && selectedLot.gunGroups.length > 0 ? selectedLot.gunGroups.reduce((acc, g) => acc + g.count, 0) : (selectedLot.totalGuns || 0)} 支充電槍
                        </span>
                      </div>

                      {/* 充電規格多重列表 */}
                      {selectedLot.gunGroups && selectedLot.gunGroups.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider pl-1">
                            🔌 充電規格詳細清單
                          </span>
                          <div className="space-y-1.5 p-2.5 rounded-xl border border-white/5 bg-black/40">
                            {selectedLot.gunGroups.map((group, idx) => {
                              const badgeColor = group.gunType === 'DC 快充' ? 'text-cyber-green bg-cyber-green/15' : 'text-blue-400 bg-blue-500/15';
                              return (
                                <div key={idx} className="text-xs font-mono text-white/90 flex flex-col gap-0.5 py-1.5 border-b border-white/5 last:border-0 last:pb-0 first:pt-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${badgeColor}`}>
                                        {group.gunType}
                                      </span>
                                      <span className="font-bold text-white font-mono">{group.kw} kW</span>
                                    </div>
                                    <span className="text-cyber-green font-bold bg-white/5 px-2 py-0.5 rounded text-[10px]">
                                      {group.count} 支
                                    </span>
                                  </div>
                                  {group.note && (
                                    <span className="text-white/40 text-[10px] pl-1 font-sans mt-0.5">
                                      📝 備註：{group.note}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (selectedLot.maxKw || selectedLot.totalGuns) ? (
                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider pl-1">
                            🔌 充電規格清單
                          </span>
                          <div className="p-3 rounded-xl border border-white/5 bg-black/40 text-xs font-mono text-white/80 flex justify-between items-center">
                            <span className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-cyber-green bg-cyber-green/15">DC 快充</span>
                              <span className="font-bold text-white">{selectedLot.maxKw || selectedLot.chargingInfo?.officialKw} kW</span>
                            </span>
                            <span className="text-cyber-green font-bold bg-white/5 px-2 py-0.5 rounded text-[10px]">
                              {selectedLot.totalGuns || 2} 支
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {/* 收費明細表格 / 清單 */}
                      {selectedLot.tariffs && selectedLot.tariffs.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider pl-1">
                            📊 時段電費收費明細
                          </span>
                          <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">
                                  <th className="p-2">時段 range</th>
                                  <th className="p-2 text-right">單價 price</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {selectedLot.tariffs.map((tariff, index) => (
                                  <tr key={index} className="text-xs font-mono text-white/80 hover:bg-white/[0.01] transition-colors">
                                    <td className="p-2">⏳ {tariff.timeSlot || '不限時段'}</td>
                                    <td className="p-2 text-right font-bold text-cyber-green">
                                      HKD ${tariff.price} / {tariff.unit ? tariff.unit.replace('元/', '') : (selectedLot.feeType === 'time' ? '分鐘' : '度')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-xs font-mono">
                          <span className="text-white/40 text-[10px] uppercase">計費模式</span>
                          <span className="text-white/85 font-bold text-[11px]">
                            {selectedLot.feeType === 'time' ? '⏱️ 按時間計費' : '🔌 按度數計費'}
                          </span>
                        </div>
                      )}

                      {/* Display Kw Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                          <span className="text-[9px] font-mono text-white/40 uppercase block mb-0.5">規格最大功率</span>
                          <span className="text-base font-bold text-white font-mono">{selectedLot.maxKw || selectedLot.chargingInfo?.officialKw || '--'} kW</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-cyber-green/5 border border-cyber-green/10 text-center relative overflow-hidden group">
                          <span className="text-[9px] font-mono text-cyber-green uppercase block mb-0.5">車友實測速度</span>
                          <span className="text-base font-bold text-cyber-green font-mono">{selectedLot.chargingInfo?.realKw || '--'} kW</span>
                          <div className="absolute inset-0 bg-cyber-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      {/* Ratings and dynamic flags */}
                      <div className="flex items-center justify-between border-t border-b border-white/5 py-2.5">
                        {selectedLot.chargingInfo?.rating === null || selectedLot.chargingInfo?.ratingCount === 0 || !selectedLot.chargingInfo?.rating ? (
                          <div className="w-full">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-green/10 border border-cyber-green/30 text-cyber-green text-xs font-mono font-bold shadow-[0_0_12px_rgba(204,255,0,0.1)] w-full justify-center">
                              🔄 暫無實測（歡迎提交第一手充電報告）
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/45">相容性評級:</span>
                            <div className="flex gap-0.5 ml-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={12} 
                                  className={i < Math.round(selectedLot.chargingInfo?.rating || 0) ? "text-[#CCFF00] fill-[#CCFF00]" : "text-white/10"} 
                                />
                              ))}
                            </div>
                            <span className="text-xs text-white/80 font-mono font-bold ml-1">
                              ⭐ {selectedLot.chargingInfo.rating} (共 {selectedLot.chargingInfo.ratingCount || selectedLot.chargingInfo.userFeedbacks?.length || 1} 次實測)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Dynamic Jump Warning Alert if rating <= 2 */}
                      {(selectedLot.chargingInfo?.rating && selectedLot.chargingInfo.rating <= 2) ? (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex gap-2">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5 animate-bounce" />
                          <div>
                            <span className="font-bold">⚠️ 跳槍風險警告 (Warning):</span>
                            <span className="block font-sans opacity-90 mt-0.5 text-[11px] leading-relaxed">
                              車友實測平均評級低於 2.0，部分特定協議配合可能偶有跳槍、斷電或協議不符的狀況，建議提防！
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {/* Description / Extra compatibility note */}
                      {selectedLot.chargingInfo?.note && (
                        <p className="text-[11px] text-white/50 leading-relaxed italic bg-white/[0.01] p-2 rounded border border-white/[0.02]">
                          🎯 備註：{selectedLot.chargingInfo.note}
                        </p>
                      )}

                      {/* Existing Crowdsourced feed list */}
                      <div className="space-y-2">
                        <h6 className="text-[10px] font-mono font-bold text-white/40 flex items-center justify-between uppercase">
                          <span>💬 車友實測報告 ({selectedLot.chargingInfo?.userFeedbacks?.length || 0})</span>
                        </h6>
                        {selectedLot.chargingInfo?.userFeedbacks && selectedLot.chargingInfo.userFeedbacks.length > 0 ? (
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 thin-scrollbar">
                            {selectedLot.chargingInfo.userFeedbacks.map((fb, idx) => (
                              <div key={idx} className="p-2 rounded bg-white/[0.02] border border-white/5 flex flex-col gap-1 text-[11px] text-left">
                                <div className="flex justify-between text-[10px]">
                                  <span className="font-bold text-white/80 flex items-center gap-1">
                                    👤 {fb.userDisplayName || '匿名車友'}
                                  </span>
                                  <span className="text-white/30 font-mono">
                                    {fb.createdAt?.seconds ? new Date(fb.createdAt.seconds * 1000).toLocaleDateString() : '剛剛'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                                  <span className="text-cyber-green font-mono font-bold">⚡ {fb.realKw} kW</span>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} size={8} className={i < fb.rating ? "text-cyber-green fill-cyber-green" : "text-white/10"} />
                                    ))}
                                  </div>
                                </div>
                                {fb.testedGun && (
                                  <div className="text-[9px] text-[#ccff00]/70 font-mono bg-[#ccff00]/5 px-1.5 py-0.5 rounded self-start mt-0.5">
                                    🔌 實測規格: {fb.testedGun}
                                  </div>
                                )}
                                {fb.note && <span className="text-white/50 bg-transparent py-0.5">{fb.note}</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-white/30 italic py-2 text-center border border-dashed border-white/5 rounded">
                            目前尚無實測回報，歡迎成為第一位分享的車友！
                          </p>
                        )}
                      </div>

                      {/* Crowdsourcing Form UI */}
                      {currentUser ? (
                        <div className="pt-2 border-t border-white/5">
                          {!showFeedbackForm ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowFeedbackForm(true);
                                setFeedbackError('');
                                setFeedbackSuccess('');
                              }}
                              className="w-full py-2 bg-cyber-green/10 hover:bg-cyber-green/20 border border-cyber-green/20 text-cyber-green rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all animate-pulse"
                            >
                              <MessageSquare size={14} /> 我要求助 / 回報實測 💬
                            </button>
                          ) : (
                            <form onSubmit={handleFeedbackSubmit} className="space-y-3 bg-white/[0.02] p-3.5 rounded-xl border border-white/10 animate-fade-in text-left">
                              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-xs font-bold text-white flex items-center gap-1">
                                  ✏️ 填寫實測數據
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowFeedbackForm(false)}
                                  className="text-white/30 hover:text-white"
                                >
                                  取消
                                </button>
                              </div>

                              {/* 選擇本次測試的充電槍規格 */}
                              {selectedLot.gunGroups && selectedLot.gunGroups.length > 0 && (
                                <div className="space-y-1 text-left">
                                  <label className="text-[10px] font-mono text-white/40 block ml-1">🔌 對接的充電槍規格 SPEED SPEC</label>
                                  <select
                                    value={selectedTestedGun}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSelectedTestedGun(val);
                                      if (val) {
                                        // Auto suggestion: parse power number if matches 'digits kW'
                                        const match = val.match(/^(\d+)\s*kW/i);
                                        if (match) {
                                          setFeedbackKw(match[1]);
                                        }
                                      }
                                    }}
                                    className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white font-sans focus:outline-none focus:border-cyber-green/50"
                                  >
                                    <option value="">-- 請選擇本次回報的充電設備規格 --</option>
                                    {selectedLot.gunGroups.map((g, idx) => {
                                      const optLabel = `${g.kw} kW (${g.gunType})`;
                                      return (
                                        <option key={idx} value={optLabel}>
                                          ⚡ {optLabel} {g.note ? `[${g.note}]` : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-mono text-white/40 block mb-1">實測速度 (kW)</label>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    max="500"
                                    placeholder="例如：115"
                                    value={feedbackKw}
                                    onChange={(e) => setFeedbackKw(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-cyber-green"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-white/40 block mb-1">相容評級 (1-5星)</label>
                                  <div className="flex gap-1 h-9 items-center justify-center bg-black rounded-lg border border-white/10 px-2">
                                    {Array.from({ length: 5 }).map((_, i) => {
                                      const starVal = i + 1;
                                      return (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => setFeedbackRating(starVal)}
                                          className="text-white/20 hover:text-cyber-green transition-transform hover:scale-110"
                                        >
                                          <Star
                                            size={16}
                                            className={starVal <= feedbackRating ? "text-cyber-green fill-cyber-green" : "text-white/20"}
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-mono text-white/40 block mb-1">實測心得 / 是否曾跳槍</label>
                                <input
                                  type="text"
                                  placeholder="協議匹配完美/是否有偶爾跳槍...(限 40 字)"
                                  value={feedbackNote}
                                  onChange={(e) => setFeedbackNote(e.target.value)}
                                  maxLength={50}
                                  className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyber-green"
                                />
                              </div>

                              {feedbackError && <p className="text-[10px] text-red-500 font-bold">{feedbackError}</p>}
                              {feedbackSuccess && <p className="text-[10px] text-cyber-green font-bold">{feedbackSuccess}</p>}

                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2 bg-cyber-green text-black hover:bg-[#b0f000] rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                              >
                                {isSubmitting ? (
                                  <>儲存中...</>
                                ) : (
                                  <>
                                    <Send size={12} /> 提交實測報告
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                          <p className="text-[11px] text-white/40">ℹ️ 請先登入帳戶以提交實測數據充電 WIKI。</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Navigation & Video Guides buttons */}
                  <div className="flex gap-2">
                    {selectedLot.videoGuide && (
                      <a 
                        href={selectedLot.videoGuide}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-3 px-4 py-3 bg-white text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-cyber-green transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        <Youtube size={16} /> 觀看泊車指南
                      </a>
                    )}
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLot.lat},${selectedLot.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs flex items-center justify-center hover:bg-white/10 transition-all gap-1.5"
                      title="導航 / NAVIGATE"
                    >
                      <Navigation size={15} /> 導航
                    </a>
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Access Grid - More compact on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 overflow-y-auto max-h-[25vh] sm:max-h-[30vh] pr-1 custom-scrollbar shrink-0">
        {filteredLots.map(lot => (
          <button 
            key={lot.id}
            type="button"
            onClick={() => handleLotClick(lot)}
            className={`p-3 sm:p-4 rounded-xl border transition-all text-left relative group ${
              selectedLotId === lot.id 
                ? 'bg-cyber-green/10 border-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.1)]' 
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-start mb-1 gap-2">
              <span className="font-bold text-sm text-white group-hover:text-cyber-green transition-colors line-clamp-1">{lot.name}</span>
              {lot.hasDifficulty !== false && lot.difficultyTag && (
                <span className={`shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                  lot.difficultyTag === '不可能的任務' ? 'text-fuchsia-400 border-fuchsia-500/20' :
                  lot.difficultyTag === '地獄' ? 'text-red-400 border-red-500/20' : 
                  lot.difficultyTag === '中等' ? 'text-yellow-400 border-yellow-500/20' : 'text-cyber-green border-cyber-green/20'
                }`}>
                  {lot.difficultyTag}
                </span>
              )}
            </div>
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest flex items-center justify-between">
               <span>{lot.region}</span>
               <div className="flex items-center gap-1.5">
                 {lot.hasCharging && (
                    <span className="flex items-center gap-0.5 text-cyber-green text-[8px] tracking-normal">
                      ⚡ CHARGING ({lot.chargingInfo?.realKw || lot.chargingInfo?.officialKw}kW)
                    </span>
                 )}
                 {lot.videoGuide && (
                   <span className="flex items-center gap-0.5 text-white/50 text-[8px] border-l border-white/10 pl-1.5 tracking-normal">
                      <Youtube size={9} /> VIDEO
                   </span>
                 )}
               </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
