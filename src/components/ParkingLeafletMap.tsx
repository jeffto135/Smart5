import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { 
  Search, 
  MapPin, 
  Youtube, 
  Navigation, 
  Zap, 
  Star, 
  Send
} from 'lucide-react';
import { ParkingLot } from '../types';
import { auth } from '../lib/firebase';

interface ParkingLeafletMapProps {
  parkingLots: ParkingLot[];
  onAddChargingFeedback?: (lotId: string, realKw: number, rating: number, note: string, testedGun?: string) => Promise<void>;
}

const HK_CENTER: [number, number] = [22.3193, 114.1694];

// Component to handle smooth animated map flyTo and zoom
const MapController: React.FC<{ 
  targetCoords: [number, number]; 
  targetZoom: number; 
  trigger: number;
}> = ({ targetCoords, targetZoom, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0 && targetCoords) {
      map.flyTo(targetCoords, targetZoom, {
        animate: true,
        duration: 1.2,
        easeLinearity: 0.25
      });
    } else if (targetCoords) {
      map.setView(targetCoords, targetZoom);
    }
  }, [targetCoords, targetZoom, trigger, map]);
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
      background: #d4ff00;
      color: black;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px #d4ff00;
      border: 1.5px solid #000;
      z-index: 999;
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
        border: 2px solid rgba(255,255,255,0.7);
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
  
  // 統一選中狀態：單一 source of truth，保證地圖 Marker 與底部卡片 100% 同步
  const [selectedParking, setSelectedParking] = useState<ParkingLot | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(HK_CENTER);
  const [mapZoom, setMapZoom] = useState(11);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [mapTileStyle, setMapTileStyle] = useState<'osm_dark' | 'carto_voyager' | 'carto_dark'>('osm_dark');
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const detailCardRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 保持 selectedParking 資料與最新 props 同步
  useEffect(() => {
    if (selectedParking) {
      const updated = parkingLots.find(p => p.id === selectedParking.id);
      if (updated) setSelectedParking(updated);
    }
  }, [parkingLots]);

  // 🧭 一鍵導航函式（支援 iOS/macOS 喚起 Apple Maps，Android/PC 喚起 Google Maps）
  const openNavigation = (lat: number, lng: number, name?: string) => {
    const isApple = typeof navigator !== 'undefined' && /(iPhone|iPad|iPod|Mac)/i.test(navigator.userAgent);
    const destination = `${lat},${lng}`;
    const url = isApple
      ? `http://maps.apple.com/?daddr=${destination}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
  };

  // 點擊地圖 Marker 或下方列表項目時，統一同步更新狀態與對焦
  const handleLotClick = (lot: ParkingLot) => {
    setSelectedParking(lot);
    setMapCenter([lot.lat, lot.lng]);
    setMapZoom(16);
    setFlyTrigger(prev => prev + 1);

    // 重置回報表單狀態
    setShowFeedbackForm(false);
    setShowExtraDetails(false);
    setFeedbackError('');
    setFeedbackSuccess('');
    setFeedbackKw('');
    setFeedbackRating(5);
    setFeedbackNote('');
    setSelectedTestedGun('');
  };

  // 當選中停車場時，自動平滑滾動至底部詳情卡片，確保車友目光直接鎖定
  useEffect(() => {
    if (selectedParking && detailCardRef.current) {
      const timer = setTimeout(() => {
        detailCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedParking?.id, flyTrigger]);

  // Form states for adding crowdsourced feedbacks
  const [feedbackKw, setFeedbackKw] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [selectedTestedGun, setSelectedTestedGun] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

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

  const getDifficultyColor = (tag: ParkingLot['difficultyTag'], hasDifficulty?: boolean) => {
    if (hasDifficulty === false || !tag) return '#7e7e7e';
    switch (tag) {
      case '輕易': return '#d4ff00';
      case '中等': return '#FFD700';
      case '地獄': return '#ff3b30';
      case '不可能的任務': return '#E000FF';
      default: return '#d4ff00';
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddChargingFeedback || !selectedParking) return;

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
        selectedParking.id,
        kwNum,
        feedbackRating,
        feedbackNote,
        selectedTestedGun || undefined
      );
      setFeedbackSuccess('🎉 感謝回報！充電實測大數據已同步更新！');
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
      {/* Search & Filter Header */}
      <div className="space-y-3 p-3 sm:p-4 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text" 
              placeholder="搜尋停車場名稱或地址..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:border-[#d4ff00]/50 transition-all font-mono placeholder:text-white/20"
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
                    ? 'bg-[#d4ff00] border-[#d4ff00] text-black shadow-[0_0_15px_rgba(212,255,0,0.35)]' 
                    : 'bg-white/5 text-white/30 border-white/5 hover:border-white/25'
                }`}
              >
                {region === 'all' ? '全部區域' : region}
              </button>
            ))}
          </div>
        </div>

        {/* Filters (Difficulty Select + Has charging switch) */}
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
              <div className={`w-8 h-4.5 rounded-full transition-colors ${onlyChargingFilter ? 'bg-[#d4ff00]' : 'bg-white/10'}`} />
              <div className={`absolute w-3.5 h-3.5 rounded-full bg-black top-[2px] left-[2px] transition-transform ${onlyChargingFilter ? 'translate-x-3.5' : 'translate-x-0 bg-white/40'}`} />
            </div>
          </label>
        </div>
      </div>

      {/* Map display */}
      <div className="h-[280px] sm:h-[380px] relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#121212] shadow-inner shrink-0">
        {/* 地圖圖磚切換器 (免 Key 穩定底圖保證) */}
        <div className="absolute top-3 right-3 z-[400] flex bg-black/85 backdrop-blur-md border border-white/15 rounded-xl p-0.5 text-[10px] font-mono shadow-xl">
          <button
            type="button"
            onClick={() => setMapTileStyle('osm_dark')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${mapTileStyle === 'osm_dark' ? 'bg-[#d4ff00] text-black font-bold shadow-[0_0_8px_rgba(212,255,0,0.3)]' : 'text-white/60 hover:text-white'}`}
            title="免 Key 穩定 OSM 搭配 CSS 暗黑濾鏡，永不變黑"
          >
            🌙 暗黑 OSM
          </button>
          <button
            type="button"
            onClick={() => setMapTileStyle('carto_voyager')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${mapTileStyle === 'carto_voyager' ? 'bg-[#d4ff00] text-black font-bold shadow-[0_0_8px_rgba(212,255,0,0.3)]' : 'text-white/60 hover:text-white'}`}
            title="CARTO Voyager 免費底圖"
          >
            🏙️ Voyager
          </button>
          <button
            type="button"
            onClick={() => setMapTileStyle('carto_dark')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${mapTileStyle === 'carto_dark' ? 'bg-[#d4ff00] text-black font-bold shadow-[0_0_8px_rgba(212,255,0,0.3)]' : 'text-white/60 hover:text-white'}`}
            title="CARTO Dark 底圖"
          >
            ⬛ CARTO
          </button>
        </div>

        <MapContainer
          center={HK_CENTER}
          zoom={11}
          style={{ width: '100%', height: '100%', background: '#121212' }}
          zoomControl={false}
          attributionControl={false}
        >
          {mapTileStyle === 'osm_dark' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles-dark"
              maxZoom={19}
            />
          ) : mapTileStyle === 'carto_voyager' ? (
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              className="map-tiles-dark"
              maxZoom={19}
            />
          )}
          <ZoomControl position="bottomright" />
          <MapController targetCoords={mapCenter} targetZoom={mapZoom} trigger={flyTrigger} />
          
          {filteredLots.map(lot => (
            <Marker 
              key={lot.id} 
              position={[lot.lat, lot.lng]}
              ref={(ref) => {
                if (ref) markerRefs.current[lot.id] = ref;
              }}
              icon={createCustomIcon(getDifficultyColor(lot.difficultyTag, lot.hasDifficulty), selectedParking?.id === lot.id, lot.hasCharging)}
              eventHandlers={{
                click: () => handleLotClick(lot)
              }}
            >
              <Popup
                maxWidth={290}
                minWidth={240}
                maxHeight={180}
                autoPan={true}
                autoPanPaddingTopLeft={[10, 20]}
                autoPanPaddingBottomRight={[10, 20]}
                className="custom-parking-popup"
              >
                <div 
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    padding: '4px',
                    fontSize: '13px'
                  }} 
                  className="custom-scrollbar font-mono text-left space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1.5 border-b border-white/10 pb-1 mb-1">
                    <span className="font-bold text-xs text-white truncate max-w-[140px]">{lot.name}</span>
                    {lot.hasDifficulty !== false && lot.difficultyTag && (
                      <span 
                        style={{
                          backgroundColor: lot.difficultyTag === '地獄' ? '#ff3b30' : '#d4ff00',
                          color: lot.difficultyTag === '地獄' ? '#fff' : '#000',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {lot.difficultyTag}
                      </span>
                    )}
                  </div>

                  {lot.address && (
                    <p className="text-[10px] text-white/50 flex items-start gap-1 font-sans leading-tight">
                      <MapPin size={11} className="text-[#d4ff00] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{lot.address}</span>
                    </p>
                  )}

                  {lot.hasCharging && (
                    <div className="text-[10px] text-[#d4ff00] flex items-center gap-1 bg-[#d4ff00]/10 border border-[#d4ff00]/20 px-1.5 py-0.5 rounded">
                      <Zap size={11} className="text-[#d4ff00] shrink-0" />
                      <span>⚡ 充電 ({lot.chargingInfo?.realKw || lot.chargingInfo?.officialKw || lot.maxKw || 0} kW)</span>
                    </div>
                  )}

                  <div className="pt-1 flex gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNavigation(lot.lat, lot.lng, lot.name);
                      }}
                      className="flex-1 py-1 px-2 bg-[#d4ff00] hover:bg-[#b0f000] text-black font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_0_10px_rgba(212,255,0,0.3)] active:scale-95"
                    >
                      <Navigation size={11} />
                      <span>🧭 導航</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLotClick(lot);
                      }}
                      className="py-1 px-2.5 bg-white/10 hover:bg-white/20 text-white text-[10px] rounded-lg transition-colors cursor-pointer"
                    >
                      選取
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 底部區域：單一緊湊「底部選中詳情卡」+ 下方停車場快速切換清單 */}
      <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
        {/* 1. 核心緊湊高效「底部選中詳情卡」 (無多餘外層、無重複標題與地址) */}
        {selectedParking && (
          <div 
            ref={detailCardRef}
            className="bg-[#161616] border border-[#d4ff00] rounded-2xl p-4 shadow-[0_4px_25px_rgba(212,255,0,0.2)] text-left shrink-0 animate-fade-in space-y-3"
          >
            {/* 1. 標題與標籤列 */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white m-0 tracking-tight leading-tight">
                    {selectedParking.name}
                  </h3>
                  {selectedParking.hasDifficulty !== false && selectedParking.difficultyTag && (
                    <span 
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: selectedParking.difficultyTag === '地獄' ? '#ff3b30' : '#d4ff00',
                        color: selectedParking.difficultyTag === '地獄' ? '#fff' : '#000',
                        fontWeight: 'bold'
                      }}
                    >
                      {selectedParking.difficultyTag}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{selectedParking.region}</span>
                </div>
                {selectedParking.address && (
                  <p className="text-xs text-[#888] m-0 mt-1 flex items-center gap-1 font-sans">
                    <MapPin size={12} className="text-[#d4ff00] shrink-0" />
                    <span className="truncate">{selectedParking.address}</span>
                  </p>
                )}
              </div>

              {/* 關閉/取消選中按鈕 */}
              <button 
                type="button"
                onClick={() => setSelectedParking(null)} 
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors text-sm font-bold shrink-0 cursor-pointer"
                title="關閉選中狀態"
              >
                ✕
              </button>
            </div>

            {/* 2. 充電配備與狀態膠囊 */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedParking.hasCharging && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#d4ff00]/10 border border-[#d4ff00]/30 text-[#d4ff00] px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(212,255,0,0.15)]">
                  ⚡ {selectedParking.chargingInfo?.provider 
                    ? `${selectedParking.chargingInfo.provider} ｜ ${selectedParking.chargingInfo.realKw || selectedParking.chargingInfo.officialKw || selectedParking.maxKw || ''} kW` 
                    : (selectedParking.maxKw ? `${selectedParking.maxKw} kW 快充` : '配備充電樁')}
                </span>
              )}
              {selectedParking.heightLimit && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  📏 限高 {selectedParking.heightLimit}
                </span>
              )}
              {selectedParking.chargingInfo?.rating && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  ⭐ {selectedParking.chargingInfo.rating} (共 {selectedParking.chargingInfo.ratingCount || selectedParking.chargingInfo.userFeedbacks?.length || 1} 次實測)
                </span>
              )}
            </div>

            {/* 3. 泊車心得（重點高亮） */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-[#d4ff00]/25 text-left">
              <div className="text-[#d4ff00] text-xs font-mono font-bold mb-1 flex items-center gap-1.5">
                🚗 Smart #5 泊位心得：
              </div>
              <div className="text-[13px] text-[#ddd] leading-relaxed font-sans">
                {selectedParking.adminNotes || selectedParking.difficultyNote || '暫無特殊泊位心得，一般車輛可順暢出入，請注意場內劃線與轉彎死角。'}
              </div>
            </div>

            {/* 折疊式充電規格與車友大數據 Wiki */}
            {selectedParking.hasCharging && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowExtraDetails(prev => !prev)}
                  className="text-[11px] font-mono text-white/50 hover:text-[#d4ff00] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{showExtraDetails ? '▼ 收起充電詳細規格與電費' : '▶ 查看充電槍規格、電費時段與車友實測回報'}</span>
                </button>

                {showExtraDetails && (
                  <div className="mt-2 space-y-2.5 p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono animate-fade-in">
                    {/* 充電槍規格 */}
                    {selectedParking.gunGroups && selectedParking.gunGroups.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-white/40 block">🔌 充電槍規格清單：</span>
                        <div className="space-y-1">
                          {selectedParking.gunGroups.map((g, i) => (
                            <div key={i} className="flex justify-between items-center text-white/80 bg-white/5 px-2 py-1 rounded">
                              <span className="text-[#d4ff00] font-bold">{g.gunType} - {g.kw} kW</span>
                              <span className="text-white/60">{g.count} 支 {g.note ? `(${g.note})` : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 時段電費 */}
                    {selectedParking.tariffs && selectedParking.tariffs.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-white/40 block">📊 時段電費收費明細：</span>
                        <div className="space-y-1">
                          {selectedParking.tariffs.map((t, i) => (
                            <div key={i} className="flex justify-between items-center text-white/80 bg-white/5 px-2 py-1 rounded">
                              <span>⏳ {t.timeSlot}</span>
                              <span className="text-[#d4ff00] font-bold">HKD ${t.price} / {t.unit || '度'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 車友實測報告與回報表單 */}
                    <div className="pt-1 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[10px] text-white/40">💬 車友回報 ({selectedParking.chargingInfo?.userFeedbacks?.length || 0} 則)</span>
                      {currentUser && (
                        <button
                          type="button"
                          onClick={() => setShowFeedbackForm(prev => !prev)}
                          className="text-[10px] text-[#d4ff00] underline underline-offset-2 hover:opacity-80 cursor-pointer"
                        >
                          {showFeedbackForm ? '取消回報' : '我要求助 / 回報實測'}
                        </button>
                      )}
                    </div>

                    {showFeedbackForm && (
                      <form onSubmit={handleFeedbackSubmit} className="space-y-2 pt-2 border-t border-white/10 text-left">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-white/40 block">實測功率 (kW)</label>
                            <input 
                              type="number"
                              required
                              placeholder="例如 115"
                              value={feedbackKw}
                              onChange={(e) => setFeedbackKw(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded p-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-white/40 block">相容評級 (1-5星)</label>
                            <div className="flex gap-1 h-7 items-center bg-black rounded border border-white/20 px-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setFeedbackRating(i + 1)}
                                  className={i < feedbackRating ? "text-[#d4ff00]" : "text-white/20"}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] text-white/40 block">實測心得 (選填)</label>
                          <input 
                            type="text"
                            placeholder="協議匹配/是否曾跳槍..."
                            value={feedbackNote}
                            onChange={(e) => setFeedbackNote(e.target.value)}
                            className="w-full bg-black border border-white/20 rounded p-1.5 text-xs text-white"
                          />
                        </div>
                        {feedbackError && <p className="text-[10px] text-red-400">{feedbackError}</p>}
                        {feedbackSuccess && <p className="text-[10px] text-[#d4ff00]">{feedbackSuccess}</p>}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-1.5 bg-[#d4ff00] text-black font-bold rounded text-[11px] disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmitting ? '提交中...' : '確認提交實測報告'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. 底部動作欄 */}
            <div className="flex gap-2.5 pt-1">
              {selectedParking.videoGuide && (
                <a 
                  href={selectedParking.videoGuide}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-3 bg-white text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#d4ff00] transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] text-center cursor-pointer"
                >
                  <Youtube size={15} /> 泊車指南
                </a>
              )}
              <button 
                type="button"
                onClick={() => openNavigation(selectedParking.lat, selectedParking.lng, selectedParking.name)}
                className="flex-1 py-2.5 px-3 bg-[#d4ff00] hover:bg-[#b0f000] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center transition-all gap-1.5 shadow-[0_0_15px_rgba(212,255,0,0.3)] cursor-pointer active:scale-95"
              >
                <Navigation size={15} /> 🧭 一鍵導航
              </button>
            </div>
          </div>
        )}

        {/* 2. 停車場快速切換清單 (乾淨單層卡片，點擊即時聯動地圖與上方詳情卡) */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[140px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
            {filteredLots.map(lot => {
              const isSelected = selectedParking?.id === lot.id;
              return (
                <div 
                  key={lot.id}
                  ref={(el) => {
                    cardRefs.current[lot.id] = el;
                  }}
                  onClick={() => handleLotClick(lot)}
                  className={`p-3 rounded-xl border transition-all text-left relative group cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected 
                      ? 'bg-[#d4ff00]/10 border-[#d4ff00] shadow-[0_0_15px_rgba(212,255,0,0.2)] ring-1 ring-[#d4ff00]/60' 
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <span className={`font-bold text-xs sm:text-sm line-clamp-1 transition-colors ${
                        isSelected ? 'text-[#d4ff00]' : 'text-white group-hover:text-[#d4ff00]'
                      }`}>
                        {lot.name}
                      </span>
                      {lot.hasDifficulty !== false && lot.difficultyTag && (
                        <span 
                          style={{
                            fontSize: '9px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: lot.difficultyTag === '地獄' ? '#ff3b30' : '#d4ff00',
                            color: lot.difficultyTag === '地獄' ? '#fff' : '#000',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {lot.difficultyTag}
                        </span>
                      )}
                    </div>
                    {lot.address && (
                      <p className="text-[10px] text-white/40 truncate font-mono">
                        {lot.address}
                      </p>
                    )}
                  </div>

                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0">{lot.region}</span>
                      {lot.hasCharging && (
                        <span className="flex items-center gap-0.5 text-[#d4ff00] text-[8px] tracking-normal font-bold truncate">
                          ⚡ {lot.chargingInfo?.realKw || lot.chargingInfo?.officialKw || lot.maxKw || ''}kW
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNavigation(lot.lat, lot.lng, lot.name);
                      }}
                      className="px-2 py-0.5 rounded bg-[#d4ff00] text-black font-bold text-[9px] font-mono flex items-center gap-1 hover:bg-[#b0f000] transition-all cursor-pointer shrink-0"
                      title="一鍵導航"
                    >
                      <Navigation size={9} />
                      <span>導航</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
