import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Youtube, 
  Navigation, 
  ArrowLeft, 
  Zap, 
  Video, 
  Star, 
  ThumbsUp, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Layers, 
  Compass, 
  SlidersHorizontal, 
  Car, 
  Clock, 
  Check,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { ParkingLot, GunGroup, Feedback, ParkingMeter } from '../types';
import { auth } from '../lib/firebase';
import { CCTV_CAMERAS, TrafficCamera } from '../data/cctvCameras';
import { TrafficCCTVModal } from './TrafficCCTVModal';
import { TunnelDashboard } from './TunnelDashboard';
import { TrafficNewsModal } from './TrafficNewsModal';
import { fetchParkingMeterVacancy } from '../utils/parkingMeterApi';
import { CyberMarkerClusterLayer, ClusterMarkerItem } from './CyberMarkerClusterLayer';

interface ParkingLeafletMapProps {
  parkingLots: ParkingLot[];
  onAddChargingFeedback?: (
    lotId: string, 
    kw: number, 
    rating: number, 
    note: string, 
    gunType?: string
  ) => Promise<void>;
  onClose?: () => void;
  isEmbedded?: boolean;
}

// 香港中心基準座標
const HK_CENTER: [number, number] = [22.3193, 114.1694];

// 動態平滑平移控制組件
function MapController({ 
  center, 
  zoom, 
  flyTrigger 
}: { 
  center: [number, number]; 
  zoom: number; 
  flyTrigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (flyTrigger > 0) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, flyTrigger, map]);
  return null;
}

export const ParkingLeafletMap: React.FC<ParkingLeafletMapProps> = ({ 
  parkingLots = [], 
  onAddChargingFeedback,
  onClose,
  isEmbedded = false
}) => {
  // --- 狀態管理 ---
  const [selectedParking, setSelectedParking] = useState<ParkingLot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | '港島' | '九龍' | '新界'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | '輕易' | '中等' | '地獄' | '不可能的任務'>('all');
  const [onlyChargingFilter, setOnlyChargingFilter] = useState<boolean>(false);
  const [onlyVideoFilter, setOnlyVideoFilter] = useState<boolean>(false);

  // 模式切換：'parking' (停車場難度) | 'cctv' (實時路面快拍) | 'meter' (實時咪錶空置)
  const [activeMapMode, setActiveMapMode] = useState<'parking' | 'cctv' | 'meter'>('parking');
  const [selectedCamera, setSelectedCamera] = useState<TrafficCamera | null>(null);
  const [showTunnelModal, setShowTunnelModal] = useState<boolean>(false);
  const [showNewsModal, setShowNewsModal] = useState<boolean>(false);

  // 實時停車收費錶 (咪錶) 狀態
  const [meters, setMeters] = useState<ParkingMeter[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<ParkingMeter | null>(null);
  const [meterSearch, setMeterSearch] = useState<string>('');
  const [meterRegion, setMeterRegion] = useState<'all' | '港島' | '九龍' | '新界'>('all');
  const [metersLoading, setMetersLoading] = useState<boolean>(true);
  const [metersLastUpdated, setMetersLastUpdated] = useState<string>('');
  const [meterStats, setMeterStats] = useState<{ totalSpots: number; totalVacant: number }>({ totalSpots: 0, totalVacant: 0 });
  const [isRefreshingMeters, setIsRefreshingMeters] = useState<boolean>(false);

  // 抓取與定期自動更新咪錶
  const loadMeters = async (isManual = false) => {
    if (isManual) setIsRefreshingMeters(true);
    try {
      const res = await fetchParkingMeterVacancy();
      setMeters(res.meters);
      setMetersLastUpdated(res.lastUpdated);
      setMeterStats({ totalSpots: res.totalSpots, totalVacant: res.totalVacant });
    } catch (e) {
      console.warn('Meter vacancy load fallback:', e);
    } finally {
      setMetersLoading(false);
      if (isManual) setTimeout(() => setIsRefreshingMeters(false), 500);
    }
  };

  useEffect(() => {
    loadMeters();
    // 運輸署咪錶空置數據每 45 秒定時自動更新
    const timer = setInterval(() => {
      loadMeters();
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  // CCTV 專屬搜尋與分區
  const [cctvSearch, setCctvSearch] = useState<string>('');
  const [cctvRegion, setCctvRegion] = useState<'all' | '香港島' | '九龍' | '新界'>('all');

  // 底圖風格: 'osm_dark' | 'carto_voyager' | 'carto_dark'
  const [mapTileStyle, setMapTileStyle] = useState<'osm_dark' | 'carto_voyager' | 'carto_dark'>('osm_dark');

  // 地圖視角
  const [mapCenter, setMapCenter] = useState<[number, number]>(HK_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(11.5);
  const [flyTrigger, setFlyTrigger] = useState<number>(0);

  // 三段式底部滑動抽屜 (Snap Points: 'collapsed' 130px | 'half' 55vh | 'full' 90vh)
  const [sheetStage, setSheetStage] = useState<'collapsed' | 'half' | 'full'>('collapsed');

  // 車友點讚本地記錄
  const [likedFeedbacks, setLikedFeedbacks] = useState<Record<string, number>>({});

  // 回報實測表單狀態
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackKw, setFeedbackKw] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [selectedTestedGun, setSelectedTestedGun] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // 抽屜拖拽觸控處理
  const touchStartY = useRef<number | null>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  // 顏色輔助
  const getDifficultyColor = (tag?: ParkingLot['difficultyTag'], hasDifficulty?: boolean) => {
    if (hasDifficulty === false || !tag || tag === '未有回報' || tag === 'pending') return '#71717a';
    switch (tag) {
      case '輕易': return '#d4ff00';
      case '中等': return '#FFD700';
      case '地獄': return '#ff3b30';
      case '不可能的任務': return '#E000FF';
      default: return '#71717a';
    }
  };

  // 篩選 CCTV 攝影機
  const filteredCctvCameras = useMemo(() => {
    return CCTV_CAMERAS.filter(cam => {
      const matchRegion = cctvRegion === 'all' || cam.region === cctvRegion;
      const matchSearch = !cctvSearch || 
        cam.description.toLowerCase().includes(cctvSearch.toLowerCase()) ||
        cam.district.toLowerCase().includes(cctvSearch.toLowerCase()) ||
        cam.key.toLowerCase().includes(cctvSearch.toLowerCase());
      return matchRegion && matchSearch;
    });
  }, [cctvRegion, cctvSearch]);

  // 全量渲染攝影機 Marker (取消 80/120/150 筆數上限限制，由 MarkerClusterGroup 聚合以確保流暢)
  const visibleCctvMarkers = filteredCctvCameras;

  // 篩選路旁停車收費錶 (咪錶) - 嚴禁過濾 0 空位，保留全量數據
  const filteredMeters = useMemo(() => {
    return meters.filter(m => {
      const matchRegion = meterRegion === 'all' || m.region === meterRegion;
      const matchSearch = !meterSearch || 
        m.streetName.toLowerCase().includes(meterSearch.toLowerCase()) ||
        m.district.toLowerCase().includes(meterSearch.toLowerCase());
      return matchRegion && matchSearch;
    });
  }, [meters, meterRegion, meterSearch]);

  // 自定義路旁咪錶 Marker 圖標 (小圓點，有空位時標記綠色圓圈；空置為 0 時標記灰色/紅色 [0 空位]，確保全港所有點位均可見)
  const createMeterMarkerIcon = (meter: ParkingMeter, isSelected: boolean) => {
    const hasVacancy = meter.vacantSpaces > 0;
    const dotColor = hasVacancy ? '#d4ff00' : '#71717a';
    const ringColor = hasVacancy ? 'rgba(212, 255, 0, 0.9)' : 'rgba(113, 113, 122, 0.7)';
    const glow = hasVacancy ? '0 0 10px rgba(212, 255, 0, 0.8)' : '0 0 4px rgba(113, 113, 122, 0.3)';
    const badgeBg = hasVacancy ? '#000000' : '#18181b';
    const badgeText = hasVacancy ? `${meter.vacantSpaces}空位` : '0 空位';
    const textColor = hasVacancy ? '#d4ff00' : '#a1a1aa';

    const html = `
      <div class="relative flex flex-col items-center select-none cursor-pointer transform transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
        <!-- 頂部微型空位標籤 -->
        <div class="px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-md border text-[9.5px] font-mono font-bold whitespace-nowrap mb-0.5"
             style="background-color: ${badgeBg}; border-color: ${isSelected ? '#d4ff00' : ringColor}; color: ${textColor};">
          <span style="font-size: 8px;">${hasVacancy ? '🟢' : '⚪'}</span>
          <span>${badgeText}</span>
        </div>

        <!-- 小圓點帶圓圈 (有空位綠色圓圈，0 空位灰色圓圈) -->
        <div class="relative flex items-center justify-center">
          ${isSelected ? `<div class="absolute -inset-1.5 rounded-full animate-ping opacity-60" style="background-color: ${dotColor};"></div>` : ''}
          <div class="w-4 h-4 rounded-full flex items-center justify-center border-2"
               style="background-color: #0d0d0d; border-color: ${isSelected ? '#ffffff' : ringColor}; box-shadow: ${glow};">
            <div class="w-2 h-2 rounded-full" style="background-color: ${dotColor};"></div>
          </div>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-meter-marker',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  };

  // 自定義 CCTV Marker 圖標
  const createCCTVMarkerIcon = (cam: TrafficCamera, isSelected: boolean) => {
    const html = `
      <div class="relative flex flex-col items-center select-none cursor-pointer transform transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
        <div class="px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.85)] border text-[10px] font-mono font-bold whitespace-nowrap mb-0.5"
             style="background-color: #09090b; border-color: ${isSelected ? '#ff3b30' : 'rgba(239,68,68,0.5)'}; color: #ffffff;">
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <span class="max-w-[75px] truncate">${cam.key}</span>
        </div>
        <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2"
             style="background-color: ${isSelected ? '#ff3b30' : '#dc2626'}; border-color: #ffffff; color: #ffffff;">
          <span style="font-size: 11px;">📹</span>
        </div>
        <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] mx-auto"
             style="border-top-color: #dc2626;"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-cctv-marker',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  };

  // 自定義 Leaflet Marker 圖標 (Kilowatt Style: 常駐黑色圓角膠囊價格標籤 + 藍色圓形停車場 Pin)
  const createMarkerIcon = (lot: ParkingLot, isSelected: boolean) => {
    const diffColor = getDifficultyColor(lot.difficultyTag, lot.hasDifficulty);
    const hasCharging = lot.hasCharging;

    // 價格標籤判定：平日時租優先、假日時租次之，咪錶顯示「咪錶」，未知顯示「P」
    let priceText = 'P';
    if (lot.hourlyRateWeekday && Number(lot.hourlyRateWeekday) > 0) {
      priceText = `$${lot.hourlyRateWeekday}`;
    } else if (lot.hourlyRateWeekend && Number(lot.hourlyRateWeekend) > 0) {
      priceText = `$${lot.hourlyRateWeekend}`;
    } else if (lot.name.includes('咪錶') || (lot.address && lot.address.includes('咪錶'))) {
      priceText = '咪錶';
    }

    const html = `
      <div class="relative flex flex-col items-center select-none cursor-pointer transform transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
        <!-- 1. 頂部常駐黑色圓角膠囊價格標籤 -->
        <div class="px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.85)] border text-[11px] font-mono font-bold whitespace-nowrap mb-0.5"
             style="background-color: #09090b; border-color: ${isSelected ? '#d4ff00' : 'rgba(255,255,255,0.2)'}; color: ${isSelected ? '#d4ff00' : '#ffffff'};">
          ${hasCharging ? `<span style="color: #d4ff00; font-size: 10px;">⚡</span>` : ''}
          <span>${priceText}</span>
        </div>

        <!-- 2. 下方經典藍色圓形停車場 Pin (帶難度外圈高亮) -->
        <div class="relative flex items-center justify-center">
          ${isSelected ? `<div class="absolute -inset-1.5 rounded-full animate-ping opacity-60" style="background-color: ${diffColor};"></div>` : ''}
          <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2"
               style="background-color: ${isSelected ? '#0284c7' : '#007aff'}; border-color: ${isSelected ? '#d4ff00' : '#ffffff'}; color: #ffffff;">
            <span style="font-size: 11px; font-weight: 900; font-family: monospace;">P</span>
          </div>
        </div>

        <!-- 3. 指向地圖的尖端小箭頭 -->
        <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] mx-auto"
             style="border-top-color: ${isSelected ? '#d4ff00' : '#007aff'};"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-marker',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  };

  // 一鍵喚起原生導航
  const openNavigation = (lat: number, lng: number, name: string) => {
    const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
    const destination = `${lat},${lng}`;
    const url = isApple
      ? `http://maps.apple.com/?daddr=${destination}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
  };

  // 當選中停車場時，地圖置中並將抽屜自動平滑彈出至 'half' (55vh)
  const handleSelectLot = (lot: ParkingLot) => {
    setSelectedParking(lot);
    setMapCenter([lot.lat, lot.lng]);
    setMapZoom(16);
    setFlyTrigger(prev => prev + 1);
    setSheetStage('half');

    // 重置回報表單狀態
    setShowFeedbackForm(false);
    setFeedbackError('');
    setFeedbackSuccess('');
    setFeedbackKw('');
    setFeedbackRating(5);
    setFeedbackNote('');
    setSelectedTestedGun('');

    // 將抽屜滾動重置至頂部
    if (sheetContentRef.current) {
      sheetContentRef.current.scrollTop = 0;
    }
  };

  // 關閉選中停車場，收合抽屜
  const handleCloseSelected = () => {
    setSelectedParking(null);
    setSheetStage('collapsed');
    setShowFeedbackForm(false);
  };

  // 抽屜觸控滑動手勢
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;
    touchStartY.current = null;

    // 向上滑動超過 40px -> 提升展開階段
    if (deltaY < -40) {
      if (sheetStage === 'collapsed') {
        setSheetStage(selectedParking ? 'half' : 'half');
      } else if (sheetStage === 'half') {
        setSheetStage('full');
      }
    } 
    // 向下滑動超過 40px -> 降低展開階段
    else if (deltaY > 40) {
      if (sheetStage === 'full') {
        setSheetStage('half');
      } else if (sheetStage === 'half') {
        setSheetStage('collapsed');
      }
    }
  };

  // 切換抽屜階段
  const toggleSheetStage = () => {
    if (sheetStage === 'collapsed') {
      setSheetStage('half');
    } else if (sheetStage === 'half') {
      setSheetStage('full');
    } else {
      setSheetStage('half');
    }
  };

  // 篩選停車場清單
  const filteredLots = useMemo(() => {
    return parkingLots.filter(lot => {
      const matchSearch = lot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lot.address && lot.address.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchRegion = regionFilter === 'all' || lot.region === regionFilter;
      const matchDifficulty = difficultyFilter === 'all' || lot.difficultyTag === difficultyFilter;
      const matchCharging = !onlyChargingFilter || lot.hasCharging === true;
      const matchVideo = !onlyVideoFilter || Boolean(lot.videoGuide);
      return matchSearch && matchRegion && matchDifficulty && matchCharging && matchVideo;
    });
  }, [parkingLots, searchQuery, regionFilter, difficultyFilter, onlyChargingFilter, onlyVideoFilter]);

  // 聚合點位列表 - 停車場
  const parkingClusterItems = useMemo<ClusterMarkerItem[]>(() => {
    return filteredLots.map(lot => ({
      id: lot.id,
      lat: lot.lat,
      lng: lot.lng,
      icon: createMarkerIcon(lot, selectedParking?.id === lot.id),
      onClick: () => handleSelectLot(lot)
    }));
  }, [filteredLots, selectedParking]);

  // 聚合點位列表 - 交通快拍 CCTV (全量 183 支攝影機)
  const cctvClusterItems = useMemo<ClusterMarkerItem[]>(() => {
    return visibleCctvMarkers.map(cam => ({
      id: cam.key,
      lat: cam.lat,
      lng: cam.lng,
      icon: createCCTVMarkerIcon(cam, selectedCamera?.key === cam.key),
      onClick: () => {
        setSelectedCamera(cam);
        setMapCenter([cam.lat, cam.lng]);
        setMapZoom(16);
        setFlyTrigger(prev => prev + 1);
      }
    }));
  }, [visibleCctvMarkers, selectedCamera]);

  // 聚合點位列表 - 實時停車收費錶 (咪錶全量 1500+ 群組)
  const meterClusterItems = useMemo<ClusterMarkerItem[]>(() => {
    return filteredMeters.map(meter => ({
      id: meter.meterId,
      lat: meter.lat,
      lng: meter.lng,
      icon: createMeterMarkerIcon(meter, selectedMeter?.meterId === meter.meterId),
      onClick: () => {
        setSelectedMeter(meter);
        setSelectedParking(null);
        setSelectedCamera(null);
        setMapCenter([meter.lat, meter.lng]);
        setMapZoom(16);
        setFlyTrigger(prev => prev + 1);
        setSheetStage('half');
      }
    }));
  }, [filteredMeters, selectedMeter]);

  // 回報實測提交
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
      }, 2500);
    } catch (err: any) {
      setFeedbackError(err.message || '提交失敗，請重試！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 車友點讚
  const handleLikeFeedback = (feedbackId: string) => {
    setLikedFeedbacks(prev => ({
      ...prev,
      [feedbackId]: (prev[feedbackId] || 0) + 1
    }));
  };


  // 高度設定映射 (Snap Points)
  const getSheetHeight = () => {
    switch (sheetStage) {
      case 'collapsed': return isEmbedded ? '130px' : '135px';
      case 'half': return isEmbedded ? '60%' : '55vh';
      case 'full': return isEmbedded ? '92%' : '90vh';
      default: return '135px';
    }
  };

  const containerClasses = isEmbedded 
    ? 'relative w-full h-full overflow-hidden bg-[#0a0a0a] rounded-3xl'
    : 'fixed inset-0 w-screen h-screen overflow-hidden bg-[#0a0a0a] z-[120]';

  return (
    <div className={containerClasses}>
      {/* 1. 全螢幕沉浸式地圖底圖 (Full-screen Map Canvas) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer
          center={HK_CENTER}
          zoom={11.5}
          style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
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
              maxZoom={19}
            />
          )}

          <MapController center={mapCenter} zoom={mapZoom} flyTrigger={flyTrigger} />

          {/* 渲染停車場 Markers (parking 模式，支援聚合以優化大量點位效能) */}
          {activeMapMode === 'parking' && (
            <CyberMarkerClusterLayer
              items={parkingClusterItems}
              mode="parking"
              maxClusterRadius={45}
            />
          )}

          {/* 渲染香港運輸署實時路面 CCTV Markers (cctv 模式，全港 183 支攝影機聚合) */}
          {activeMapMode === 'cctv' && (
            <CyberMarkerClusterLayer
              items={cctvClusterItems}
              mode="cctv"
              maxClusterRadius={55}
            />
          )}

          {/* 渲染香港運輸署實時停車收費錶 Markers (meter 模式，全港 1500+ 群組點位聚合，包含 0 空位標示) */}
          {activeMapMode === 'meter' && (
            <CyberMarkerClusterLayer
              items={meterClusterItems}
              mode="meter"
              maxClusterRadius={50}
            />
          )}
        </MapContainer>
      </div>

      {/* 2. 頂部浮動控制膠囊 (Top Floating Pill - Kilowatt Style) */}
      <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-20px)] max-w-2xl pointer-events-auto">
        <div className="bg-black/85 backdrop-blur-xl border border-white/15 rounded-full px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex items-center justify-between gap-1.5">
          {/* 返回鍵 */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
              title="返回設定 / 主選單"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          {/* 頂部核心功能 Tab 與篩選切換膠囊 */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
            {/* 全部 */}
            <button
              type="button"
              onClick={() => {
                setActiveMapMode('parking');
                setOnlyChargingFilter(false);
                setSelectedCamera(null);
                setSelectedMeter(null);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeMapMode === 'parking' && !onlyChargingFilter && !selectedMeter
                  ? 'bg-[#d4ff00] text-black shadow-[0_0_12px_rgba(212,255,0,0.4)]'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>全部</span>
            </button>

            {/* 🅿️ 地圖難度 */}
            <button
              type="button"
              onClick={() => {
                setActiveMapMode('parking');
                setSelectedCamera(null);
                setSelectedMeter(null);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeMapMode === 'parking'
                  ? 'bg-[#d4ff00]/20 border border-[#d4ff00] text-[#d4ff00]'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>🅿️ 地圖難度</span>
            </button>

            {/* ⚡ 充電 */}
            <button
              type="button"
              onClick={() => {
                setActiveMapMode('parking');
                setOnlyChargingFilter(prev => !prev);
                setSelectedCamera(null);
                setSelectedMeter(null);
              }}
              className={`px-2.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                onlyChargingFilter && activeMapMode === 'parking'
                  ? 'bg-[#d4ff00] text-black shadow-[0_0_12px_rgba(212,255,0,0.4)]'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="僅看設有充電之停車場"
            >
              <Zap size={11} className={onlyChargingFilter && activeMapMode === 'parking' ? "text-black" : "text-[#d4ff00]"} />
              <span>充電</span>
            </button>

            {/* 🅿️ 咪錶 快捷開關 */}
            <button
              type="button"
              onClick={() => {
                if (activeMapMode === 'meter') {
                  setActiveMapMode('parking');
                  setSelectedMeter(null);
                } else {
                  setActiveMapMode('meter');
                  setSelectedParking(null);
                  setSelectedCamera(null);
                  setSheetStage('half');
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeMapMode === 'meter'
                  ? 'bg-[#d4ff00] text-black shadow-[0_0_12px_rgba(212,255,0,0.5)]'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-[#d4ff00]/30'
              }`}
              title="香港運輸署實時路旁停車收費錶空置資訊"
            >
              <span>🅿️ 咪錶</span>
              <span className={`w-1.5 h-1.5 rounded-full ${activeMapMode === 'meter' ? 'bg-black' : 'bg-[#d4ff00]'} animate-pulse`} />
            </button>

            <span className="text-white/20 select-none">│</span>

            {/* 📹 實時快拍 (CCTV) */}
            <button
              type="button"
              onClick={() => {
                setActiveMapMode('cctv');
                setSelectedParking(null);
                setSelectedMeter(null);
                setSheetStage('half');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeMapMode === 'cctv'
                  ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Video size={13} className={activeMapMode === 'cctv' ? 'text-white' : 'text-red-400'} />
              <span>快拍</span>
            </button>

            {/* 🚇 過海三隧分流即時收費與時間 */}
            <button
              type="button"
              onClick={() => setShowTunnelModal(true)}
              className="px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              title="查看三隧分流即時收費與過海行車時間"
            >
              <Navigation size={13} className="text-sky-400" />
              <span>三隧分流</span>
            </button>

            {/* ⚠️ 特別交通消息 */}
            <button
              type="button"
              onClick={() => setShowNewsModal(true)}
              className="px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              title="查看香港特別交通消息通告"
            >
              <AlertTriangle size={13} className="text-amber-400" />
              <span>特別消息</span>
            </button>
          </div>

          {/* 底圖圖磚快速切換 */}
          <button
            type="button"
            onClick={() => {
              const styles: Array<typeof mapTileStyle> = ['osm_dark', 'carto_voyager', 'carto_dark'];
              const nextIdx = (styles.indexOf(mapTileStyle) + 1) % styles.length;
              setMapTileStyle(styles[nextIdx]);
            }}
            className="p-2 text-white/60 hover:text-[#d4ff00] hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
            title={`當前底圖: ${mapTileStyle} (點擊切換)`}
          >
            <Layers size={17} />
          </button>
        </div>
      </div>

      {/* 3. 地圖懸浮功能按鍵 (全港對焦 & 放大縮小) */}
      <div className="absolute right-3.5 top-20 z-[400] flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            setMapCenter(HK_CENTER);
            setMapZoom(11.5);
            setFlyTrigger(prev => prev + 1);
          }}
          className="w-10 h-10 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white/80 hover:text-[#d4ff00] hover:border-[#d4ff00]/50 flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="回位全港中心"
        >
          <Compass size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            setMapZoom(prev => Math.min(prev + 1, 18));
            setFlyTrigger(prev => prev + 1);
          }}
          className="w-10 h-10 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white/80 hover:text-white flex items-center justify-center text-lg font-bold transition-all shadow-xl cursor-pointer"
          title="放大地圖"
        >
          +
        </button>

        <button
          type="button"
          onClick={() => {
            setMapZoom(prev => Math.max(prev - 1, 10));
            setFlyTrigger(prev => prev + 1);
          }}
          className="w-10 h-10 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white/80 hover:text-white flex items-center justify-center text-lg font-bold transition-all shadow-xl cursor-pointer"
          title="縮小地圖"
        >
          -
        </button>
      </div>

      {/* 4. 遮罩層 (當抽屜在 Full 階段時可點擊收合) */}
      <AnimatePresence>
        {sheetStage === 'full' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheetStage('half')}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-[550] cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* 5. 三段式底部滑動抽屜 (Bottom Sheet) */}
      <motion.div
        animate={{ height: getSheetHeight() }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="absolute bottom-0 left-0 right-0 z-[600] bg-[#141414] border-t border-white/15 rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.85)] flex flex-col pointer-events-auto"
        style={{
          boxShadow: '0 -10px 40px rgba(0,0,0,0.9), 0 -1px 0 rgba(212,255,0,0.15)'
        }}
      >
        {/* 抽屜頂部手柄 (Drag Handle) */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={toggleSheetStage}
          className="pt-2.5 pb-2 px-4 cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="w-11 h-1.5 rounded-full bg-white/25 hover:bg-white/40 transition-colors mx-auto" />
          
          <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-white/40">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00]"></span>
              {selectedMeter
                ? '選中路旁咪錶'
                : selectedParking 
                ? '選中停車場詳情' 
                : activeMapMode === 'meter'
                ? `香港路旁咪錶 (${filteredMeters.length} 處)`
                : activeMapMode === 'cctv'
                ? `交通快拍鏡頭 (${filteredCctvCameras.length} 處)`
                : `全港難度庫 (${filteredLots.length} 場)`}
            </span>
            <span className="text-[#d4ff00] hover:underline flex items-center gap-0.5">
              {sheetStage === 'collapsed' ? '向上展開 ⌃' : sheetStage === 'half' ? '完整詳情 ⌃' : '向下收合 ⌄'}
            </span>
          </div>
        </div>

        {/* 抽屜可滾動主體 (Overflow-y Auto + iOS 慣性滑動 + 底部安全區) */}
        <div 
          ref={sheetContentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 custom-scrollbar"
          style={{
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'env(safe-area-inset-bottom, 30px)'
          }}
        >
          {/* ======================================================== */}
          {/* A1. 若當前【已選中特定咪錶】：展示路旁停車收費錶詳情 */}
          {/* ======================================================== */}
          {selectedMeter ? (
            <div className="space-y-4 pb-6 text-left">
              {/* 1. 標題、分區標籤與關閉按鈕 */}
              <div className="flex items-start justify-between gap-3 pt-1 border-b border-white/5 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyber-green/20 text-[#d4ff00] border border-[#d4ff00]/40 flex items-center gap-1">
                      <span>🅿️</span>
                      <span>實時停車收費錶</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-white/60 bg-white/5 border border-white/10">
                      {selectedMeter.district} ({selectedMeter.region})
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-white/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-ping inline-block" />
                      運輸署 Open Data
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight m-0">
                    {selectedMeter.streetName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMeter(null)}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                  title="關閉咪錶詳情"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 2. 【空置車位：X 個】與【總車位：Y 個】核心卡片 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-black/60 border border-[#d4ff00]/30 shadow-[0_0_20px_rgba(212,255,0,0.12)]">
                  <div className="text-[10px] font-mono uppercase text-white/50 tracking-wider">
                    即時空置車位
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-black text-[#d4ff00] flex items-baseline gap-1 mt-1">
                    {selectedMeter.vacantSpaces}
                    <span className="text-xs font-sans text-white/60 font-normal">個車位</span>
                  </div>
                  <div className="text-[11px] font-mono mt-1.5 flex items-center gap-1">
                    {selectedMeter.vacantSpaces > 0 ? (
                      <span className="text-[#d4ff00] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00]" />
                        目前尚有空位可停泊
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        目前已滿額 (流動性高)
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/50 tracking-wider">
                    路段總設咪錶位
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-black text-white flex items-baseline gap-1 mt-1">
                    {selectedMeter.totalSpaces}
                    <span className="text-xs font-sans text-white/60 font-normal">個總位</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/40 mt-1.5">
                    佔用率: {Math.round(((selectedMeter.totalSpaces - selectedMeter.vacantSpaces) / selectedMeter.totalSpaces) * 100)}%
                  </div>
                </div>
              </div>

              {/* 3. 空置比率進度條 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>車位流動佔用狀態</span>
                  <span>剩餘可用 {Math.round((selectedMeter.vacantSpaces / selectedMeter.totalSpaces) * 100)}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-[#d4ff00] transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(8, (selectedMeter.vacantSpaces / selectedMeter.totalSpaces) * 100))}%` }}
                  />
                </div>
              </div>

              {/* 4. 【收費時段】與費率規格 */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white font-mono">
                      收費時段：{selectedMeter.chargingPeriod}
                    </div>
                    <div className="text-[11px] font-mono text-white/45 mt-0.5">
                      非收費時段免費停泊 (請注意現場禁泊標誌與黃線管制)
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                  <DollarSign size={16} className="text-[#d4ff00] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#d4ff00] font-mono">
                      收費標準：每 15 分鐘 HK$ {selectedMeter.ratePer15Min?.toFixed(1) || '2.0'}（最長泊車：{selectedMeter.maxDuration || '2小時'}）
                    </div>
                    <div className="text-[11px] font-mono text-white/45 mt-0.5">
                      支援支付：{selectedMeter.paymentMethods?.join('、') || '八達通、感應式信用卡、轉數快'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. 導航直達與返回按鈕 */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openNavigation(selectedMeter.lat, selectedMeter.lng, selectedMeter.streetName)}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#d4ff00] text-black font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-[#bce600] transition-all shadow-[0_0_15px_rgba(212,255,0,0.3)] cursor-pointer"
                >
                  <Navigation size={15} />
                  <span>導航直達此路段咪錶</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMeter(null)}
                  className="py-3 px-4 rounded-xl bg-white/10 text-white font-mono font-bold text-xs hover:bg-white/20 transition-all cursor-pointer"
                >
                  返回列表
                </button>
              </div>
            </div>
          ) : selectedParking ? (
            <div className="space-y-4 pb-6">
              {/* 1. 標題、難度標籤與快速關閉按鈕 */}
              <div className="flex items-start justify-between gap-3 pt-1 border-b border-white/5 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight m-0">
                      {selectedParking.name}
                    </h2>
                    
                    {/* 難度標籤 (輕易為螢光綠、地獄為紅色、未有回報為深灰色 [ ❓ 待車友回報 ]) */}
                    {(!selectedParking.difficultyTag || selectedParking.difficultyTag === '未有回報' || selectedParking.hasDifficulty === false) ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold flex items-center gap-1">
                        <span>❓</span>
                        <span>待車友回報</span>
                      </span>
                    ) : (
                      <span 
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: selectedParking.difficultyTag === '地獄' 
                            ? '#ff3b30' 
                            : selectedParking.difficultyTag === '中等' 
                              ? '#eab308' 
                              : selectedParking.difficultyTag === '不可能的任務' 
                                ? '#a855f7' 
                                : '#d4ff00',
                          color: (selectedParking.difficultyTag === '地獄' || selectedParking.difficultyTag === '不可能的任務') ? '#fff' : '#000',
                          fontWeight: 'bold'
                        }}
                      >
                        {selectedParking.difficultyTag}
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                      {selectedParking.region}
                    </span>
                  </div>

                  {selectedParking.address && (
                    <p className="text-xs text-[#888] m-0 mt-1.5 flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#d4ff00] shrink-0" />
                      <span className="truncate">{selectedParking.address}</span>
                    </p>
                  )}
                </div>

                {/* 關閉按鈕 */}
                <button
                  type="button"
                  onClick={handleCloseSelected}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer text-sm font-bold"
                  title="收起詳情"
                >
                  ✕
                </button>
              </div>

              {/* 2. 雙核心行動按鈕：[ 🧭 導航至此 ] ＋ [ 📹 泊車指南 ] */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => openNavigation(selectedParking.lat, selectedParking.lng, selectedParking.name)}
                  className="flex-1 py-3 px-4 bg-[#d4ff00] hover:bg-[#b0f000] text-black rounded-xl font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,0,0.35)] active:scale-95 transition-all cursor-pointer"
                >
                  <Navigation size={17} />
                  <span>🧭 導航至此</span>
                </button>

                {selectedParking.videoGuide && (
                  <a
                    href={selectedParking.videoGuide}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Youtube size={17} className="text-red-500" />
                    <span>實錄</span>
                  </a>
                )}
              </div>

              {/* 3. 💰 泊車收費區塊 (條列平日時租、假日時租與優惠) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-left">
                <div className="text-white text-xs font-mono font-bold flex items-center gap-1.5 text-cyber-green">
                  <DollarSign size={14} className="text-[#d4ff00]" />
                  <span>💰 泊車時租與優惠收費</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-white/40 block text-[10px]">平日時租</span>
                    <span className="text-white font-bold text-sm mt-0.5 block">
                      {selectedParking.hourlyRateWeekday && Number(selectedParking.hourlyRateWeekday) > 0 
                        ? `HK$ ${selectedParking.hourlyRateWeekday} / 小時` 
                        : '依現場公布'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-white/40 block text-[10px]">假日時租</span>
                    <span className="text-white font-bold text-sm mt-0.5 block">
                      {selectedParking.hourlyRateWeekend && Number(selectedParking.hourlyRateWeekend) > 0 
                        ? `HK$ ${selectedParking.hourlyRateWeekend} / 小時` 
                        : (selectedParking.hourlyRateWeekday && Number(selectedParking.hourlyRateWeekday) > 0 
                            ? `HK$ ${selectedParking.hourlyRateWeekday} / 小時` 
                            : '依現場公布')}
                    </span>
                  </div>
                </div>
                {selectedParking.parkingDiscountNote && (
                  <div className="text-[11px] font-mono text-white/70 bg-white/5 border border-white/5 p-2 rounded-xl flex items-start gap-1.5">
                    <span className="text-[#d4ff00] shrink-0">🎁 泊車優惠:</span>
                    <span>{selectedParking.parkingDiscountNote}</span>
                  </div>
                )}
              </div>

              {/* 4. ⚡ 充電規格區塊 (充電商、快充功率、單價與逾時佔位費) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#d4ff00]/25 space-y-2.5 text-left">
                <div className="text-white text-xs font-mono font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#d4ff00]">
                    <Zap size={14} className="text-[#d4ff00]" />
                    <span>⚡ 充電規格與計費</span>
                  </span>
                  {selectedParking.hasCharging ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4ff00]/15 text-[#d4ff00] font-bold">
                      設有充電樁
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                      暫無充電
                    </span>
                  )}
                </div>

                {selectedParking.hasCharging ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-white/40 block text-[10px]">充電服務商</span>
                        <span className="text-white font-bold mt-0.5 block truncate">
                          {selectedParking.chargingProvider || selectedParking.chargingInfo?.provider || '現場充電商'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-white/40 block text-[10px]">快充功率與槍數</span>
                        <span className="text-[#d4ff00] font-bold mt-0.5 block">
                          快充 {selectedParking.maxKw || selectedParking.chargingInfo?.officialKw || 60} kW × {selectedParking.totalGuns || 2} 槍
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-white/40 block text-[10px]">充電計費單價</span>
                        <span className="text-white font-bold mt-0.5 block truncate">
                          {selectedParking.chargingPriceNote || (selectedParking.tariffs && selectedParking.tariffs.length > 0 ? `${selectedParking.tariffs[0].price} 元/${selectedParking.tariffs[0].unit}` : '免費 / 依現場公布')}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-white/40 block text-[10px]">逾時佔位費</span>
                        <span className="text-red-400 font-bold mt-0.5 block truncate">
                          {selectedParking.idleFeeNote || '無逾時佔位費'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-white/40 m-0 py-1">
                    此場地目前未登記充電設施。
                  </p>
                )}

                {/* 輔助規格：限高與實測星星 */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                  {selectedParking.heightLimit && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                      📏 限高 {selectedParking.heightLimit}
                    </span>
                  )}
                  {selectedParking.chargingInfo?.rating && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-lg">
                      ⭐ {selectedParking.chargingInfo.rating} 評分 ({selectedParking.chargingInfo.ratingCount || selectedParking.chargingInfo.userFeedbacks?.length || 1} 次實測)
                    </span>
                  )}
                </div>
              </div>

              {/* 5. 🚗 Smart #5 專屬心得區塊 (盲位提醒與首位實測車友按鈕) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#d4ff00]/30 space-y-2 text-left shadow-[0_0_15px_rgba(212,255,0,0.05)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[#d4ff00] text-xs font-mono font-bold flex items-center gap-1.5">
                    <Car size={15} />
                    <span>Smart #5 專屬泊位心得與轉彎盲位：</span>
                  </div>
                  {(!selectedParking.difficultyTag || selectedParking.difficultyTag === '未有回報') && (
                    <button
                      type="button"
                      onClick={() => setShowFeedbackForm(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#d4ff00] text-black text-[11px] font-mono font-bold hover:bg-[#b0f000] transition-colors cursor-pointer shrink-0"
                    >
                      ✍️ 我是第一個實測車友
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-[#ddd] leading-relaxed font-sans m-0">
                  {selectedParking.difficultyNote || selectedParking.adminNotes || (
                    (!selectedParking.difficultyTag || selectedParking.difficultyTag === '未有回報')
                      ? '⚠️ 本停車場目前尚無 Smart #5 車友實測回報！歡迎點擊右上角按鈕成為第一位實測車友，回報過彎與盲位心得！'
                      : '本停車場出入通道平整，車體寬闊亦可平順通過，請隨時留意柱位視角與行車引道劃線。'
                  )}
                </p>
              </div>

              {/* 6. 提示上滑查看更多細節按鈕（若在 Half 模式） */}
              {sheetStage === 'half' && (
                <button
                  type="button"
                  onClick={() => setSheetStage('full')}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>向上展開收費表、充電槍清單與車友回報 ({selectedParking.chargingInfo?.userFeedbacks?.length || 0})</span>
                  <ChevronUp size={14} />
                </button>
              )}

              {/* 6. 停車時租收費表與時段電費明細 */}
              <div className="space-y-3 pt-2 border-t border-white/10 text-left">
                {/* 時段電費收費明細 */}
                {selectedParking.tariffs && selectedParking.tariffs.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono font-bold text-white/60 flex items-center gap-1">
                      <Clock size={13} className="text-[#d4ff00]" />
                      時段充電收費明細 (TARIFFS)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {selectedParking.tariffs.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-xs font-mono">
                          <span className="text-white/80">⏳ {t.timeSlot}</span>
                          <span className="text-[#d4ff00] font-bold">HKD ${t.price} / {t.unit || '度'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 充電槍規格清單 */}
                {selectedParking.gunGroups && selectedParking.gunGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono font-bold text-white/60 flex items-center gap-1">
                      <Zap size={13} className="text-[#d4ff00]" />
                      充電槍詳細配備 (GUN GROUPS)
                    </span>
                    <div className="space-y-1.5">
                      {selectedParking.gunGroups.map((g, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#d4ff00]/15 text-[#d4ff00] font-bold text-[10px]">
                              {g.gunType}
                            </span>
                            <span className="text-white font-bold">{g.kw} kW</span>
                          </div>
                          <span className="text-white/60 text-xs">
                            {g.count} 支 {g.note ? `· ${g.note}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. 車友實測回報清單 (大數據 Wiki) */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-bold text-white/70 flex items-center gap-1">
                      <Star size={13} className="text-amber-400" />
                      車友實測回報 ({selectedParking.chargingInfo?.userFeedbacks?.length || 0} 則)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFeedbackForm(prev => !prev)}
                      className="text-xs font-mono text-[#d4ff00] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {showFeedbackForm ? '取消填寫' : '＋ 我要回報實測'}
                    </button>
                  </div>

                  {/* 回報表單 */}
                  {showFeedbackForm && (
                    <form onSubmit={handleFeedbackSubmit} className="p-3.5 rounded-2xl bg-black/60 border border-[#d4ff00]/40 space-y-3 animate-fade-in text-left">
                      <div className="text-xs font-mono font-bold text-[#d4ff00] flex items-center gap-1">
                        ✍️ 填寫 Smart #5 充電實測數據
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-white/50 block">實測最高功率 (kW) *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="300"
                            placeholder="例如: 120"
                            value={feedbackKw}
                            onChange={(e) => setFeedbackKw(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#d4ff00]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-white/50 block">協議相容評級</label>
                          <div className="flex gap-1 h-9 items-center bg-white/5 border border-white/15 rounded-xl px-2.5">
                            {[1, 2, 3, 4, 5].map(st => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setFeedbackRating(st)}
                                className={`text-base cursor-pointer transition-colors ${st <= feedbackRating ? "text-amber-400" : "text-white/20"}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/50 block">實測心得 / 是否跳槍 (選填)</label>
                        <input
                          type="text"
                          placeholder="例: 即插即充順暢，全程維持 110kW 以上"
                          value={feedbackNote}
                          onChange={(e) => setFeedbackNote(e.target.value)}
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#d4ff00]"
                        />
                      </div>

                      {feedbackError && <p className="text-xs text-red-400 font-mono">{feedbackError}</p>}
                      {feedbackSuccess && <p className="text-xs text-[#d4ff00] font-mono">{feedbackSuccess}</p>}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2 bg-[#d4ff00] text-black font-mono font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(212,255,0,0.3)] disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? '提交報告中...' : '確認發布實測大數據'}
                      </button>
                    </form>
                  )}

                  {/* 回報清單渲染 */}
                  {selectedParking.chargingInfo?.userFeedbacks && selectedParking.chargingInfo.userFeedbacks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedParking.chargingInfo.userFeedbacks.map((fb, idx) => {
                        const feedbackId = `${selectedParking.id}_fb_${idx}`;
                        const likes = (fb as any).likes || 0 + (likedFeedbacks[feedbackId] || 0);

                        return (
                          <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">
                                  {fb.userDisplayName || `車友 #${fb.userId?.substring(0, 5) || '852'}`}
                                </span>
                                <span className="text-amber-400">
                                  {'★'.repeat(fb.rating || 5)}
                                </span>
                              </div>
                              <span className="text-[#d4ff00] font-bold">
                                實測 {fb.realKw} kW
                              </span>
                            </div>

                            {fb.note && (
                              <p className="text-white/70 text-[11px] font-sans m-0 leading-relaxed">
                                {fb.note}
                              </p>
                            )}

                            <div className="flex justify-between items-center pt-1 text-[10px] text-white/30 border-t border-white/5">
                              <span>實測分享</span>
                              <button
                                type="button"
                                onClick={() => handleLikeFeedback(feedbackId)}
                                className="flex items-center gap-1 text-white/50 hover:text-[#d4ff00] transition-colors cursor-pointer"
                              >
                                <ThumbsUp size={11} />
                                <span>{likes > 0 ? likes : '實用'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs font-mono text-white/30 bg-white/[0.01] rounded-xl border border-white/5">
                      尚無車友回報實測紀錄，歡迎率先提供第一筆數據！
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* ======================================================== */
            /* B. 若未選中特定停車場：展示搜尋列、分區膠囊與清單列表 */
            /* ======================================================== */
            activeMapMode === 'meter' ? (
              /* B0. 實時路旁停車收費錶 (咪錶) 清單 */
              <div className="space-y-3 pb-8 text-left">
                {/* 咪錶搜尋列 */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input
                    type="text"
                    placeholder="搜尋路段名稱、如「士丹利街」、「謝斐道」、「沙田」..."
                    value={meterSearch}
                    onChange={(e) => setMeterSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-[#d4ff00] transition-all"
                  />
                  {meterSearch && (
                    <button
                      type="button"
                      onClick={() => setMeterSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 分區快速篩選膠囊與刷新 */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide py-0.5">
                  <div className="flex gap-1.5">
                    {(['all', '港島', '九龍', '新界'] as const).map(reg => (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => setMeterRegion(reg)}
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                          meterRegion === reg
                            ? 'bg-[#d4ff00] text-black shadow-[0_0_8px_rgba(212,255,0,0.3)]'
                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {reg === 'all' ? '全部區域' : reg}
                      </button>
                    ))}
                  </div>

                  {/* 手動刷新按鈕 */}
                  <button
                    type="button"
                    onClick={() => loadMeters(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono text-white/50 hover:text-[#d4ff00] bg-white/5 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="刷新實時咪錶空置數據"
                  >
                    <RefreshCw size={11} className={isRefreshingMeters ? 'animate-spin text-[#d4ff00]' : ''} />
                    <span>刷新</span>
                  </button>
                </div>

                {/* 狀態條：連線與總車位統計 */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                    運輸署開放數據 (定時自動更新)
                  </span>
                  <span className="text-[#d4ff00] font-bold">
                    全港即時空置: {meterStats.totalVacant} / {meterStats.totalSpots} 位
                  </span>
                </div>

                {/* 咪錶列表 */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  {filteredMeters.length > 0 ? (
                    filteredMeters.map(meter => {
                      const hasVacancy = meter.vacantSpaces > 0;
                      return (
                        <div
                          key={meter.meterId}
                          onClick={() => {
                            setSelectedMeter(meter);
                            setSelectedParking(null);
                            setSelectedCamera(null);
                            setMapCenter([meter.lat, meter.lng]);
                            setMapZoom(16);
                            setFlyTrigger(prev => prev + 1);
                          }}
                          className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-[#d4ff00]/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 mb-0.5">
                              <span className="text-[#d4ff00] font-bold">🅿️ 咪錶</span>
                              <span>·</span>
                              <span>{meter.district}</span>
                              <span>·</span>
                              <span>{meter.region}</span>
                            </div>
                            <div className="text-xs sm:text-[13px] font-bold text-white group-hover:text-[#d4ff00] transition-colors truncate">
                              {meter.streetName}
                            </div>
                            <div className="text-[10px] font-mono text-white/40 mt-0.5 truncate">
                              時段: {meter.chargingPeriod}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold inline-block ${
                              hasVacancy
                                ? 'bg-[#d4ff00]/15 text-[#d4ff00] border border-[#d4ff00]/30 shadow-[0_0_8px_rgba(212,255,0,0.15)]'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {hasVacancy ? `${meter.vacantSpaces} 空位` : '0 空位 (滿額)'}
                            </span>
                            <div className="text-[10px] font-mono text-white/30 mt-0.5">
                              共 {meter.totalSpaces} 位
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs font-mono text-white/30">
                      無符合條件之路旁咪錶
                    </div>
                  )}
                </div>
              </div>
            ) : activeMapMode === 'cctv' ? (
              /* B1. 實時路面 CCTV 快拍清單 */
              <div className="space-y-3 pb-8 text-left">
                {/* CCTV 搜尋列 */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input
                    type="text"
                    placeholder="搜尋道路、行政區或鏡頭代號 (如 告士打道、紅隧、K101)..."
                    value={cctvSearch}
                    onChange={(e) => setCctvSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-red-500 transition-all"
                  />
                  {cctvSearch && (
                    <button
                      type="button"
                      onClick={() => setCctvSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* CCTV 分區快速篩選膠囊 */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {(['all', '香港島', '九龍', '新界'] as const).map(reg => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setCctvRegion(reg)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                        cctvRegion === reg
                          ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {reg === 'all' ? '全部區域' : reg}
                    </button>
                  ))}
                </div>

                {/* CCTV 鏡頭列表 */}
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>即時路面快拍鏡頭 ({filteredCctvCameras.length})</span>
                    </span>
                    <span>點擊查看即時截圖</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredCctvCameras.slice(0, 30).map(cam => (
                      <div
                        key={cam.key}
                        onClick={() => {
                          setSelectedCamera(cam);
                          setMapCenter([cam.lat, cam.lng]);
                          setMapZoom(16);
                          setFlyTrigger(prev => prev + 1);
                        }}
                        className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-red-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 text-left group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="font-bold text-xs sm:text-sm text-white group-hover:text-red-400 transition-colors truncate">
                              {cam.description}
                            </span>
                          </div>
                          <div className="text-[10px] text-white/40 font-mono mt-0.5 flex items-center gap-1.5">
                            <span>{cam.region} · {cam.district}</span>
                            <span className="text-white/20">│</span>
                            <span className="text-white/30">{cam.key}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCamera(cam);
                            setMapCenter([cam.lat, cam.lng]);
                            setMapZoom(16);
                            setFlyTrigger(prev => prev + 1);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white font-mono font-bold text-[10px] flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                        >
                          <Video size={11} />
                          <span>看畫面</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* B2. 停車場列表 */
              <div className="space-y-3 pb-8 text-left">
                {/* 搜尋列 */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                  <input
                    type="text"
                    placeholder="搜尋停車場名稱、商場或地址..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-[#d4ff00] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 分區快速篩選膠囊 */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {(['all', '港島', '九龍', '新界'] as const).map(reg => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setRegionFilter(reg)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                        regionFilter === reg
                          ? 'bg-[#d4ff00] text-black shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {reg === 'all' ? '全部區域' : reg}
                    </button>
                  ))}
                </div>

                {/* 停車場列表卡片 */}
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center justify-between">
                    <span>附近推薦停車場 ({filteredLots.length})</span>
                    <span>點擊對焦地圖</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredLots.map(lot => {
                      const diffColor = getDifficultyColor(lot.difficultyTag, lot.hasDifficulty);
                      return (
                        <div
                          key={lot.id}
                          onClick={() => handleSelectLot(lot)}
                          className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-[#d4ff00]/40 transition-all cursor-pointer flex flex-col justify-between gap-2 text-left group"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-xs sm:text-sm text-white group-hover:text-[#d4ff00] transition-colors truncate">
                                {lot.name}
                              </span>
                              {lot.hasDifficulty !== false && lot.difficultyTag && (
                                <span 
                                  style={{
                                    fontSize: '9px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: (lot.difficultyTag === '未有回報' || lot.difficultyTag === 'pending')
                                      ? '#71717a'
                                      : lot.difficultyTag === '地獄' 
                                        ? '#ff3b30' 
                                        : lot.difficultyTag === '不可能的任務' 
                                          ? '#a855f7' 
                                          : '#d4ff00',
                                    color: (lot.difficultyTag === '未有回報' || lot.difficultyTag === 'pending' || lot.difficultyTag === '地獄' || lot.difficultyTag === '不可能的任務') ? '#fff' : '#000',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {lot.difficultyTag === 'pending' ? '未有回報' : lot.difficultyTag}
                                </span>
                              )}
                            </div>
                            {lot.address && (
                              <p className="text-[10px] text-white/40 truncate font-mono mt-0.5 m-0">
                                {lot.address}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono text-white/50">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white/40">{lot.region}</span>
                              {lot.hasCharging && (
                                <span className="text-[#d4ff00] font-bold">
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
                              className="px-2 py-0.5 rounded-lg bg-[#d4ff00] text-black font-bold text-[9px] flex items-center gap-1 hover:bg-[#b0f000] transition-all cursor-pointer shadow-sm"
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
            )
          )}
        </div>
      </motion.div>

      {/* 3. 實時路面交通快拍 CCTV 彈窗 */}
      <AnimatePresence>
        {selectedCamera && (
          <TrafficCCTVModal
            camera={selectedCamera}
            onClose={() => setSelectedCamera(null)}
            onSelectCamera={(cam) => {
              setSelectedCamera(cam);
              setMapCenter([cam.lat, cam.lng]);
              setMapZoom(16);
              setFlyTrigger(prev => prev + 1);
            }}
          />
        )}
      </AnimatePresence>

      {/* 4. 過海三隧分流即時收費與時間面板 */}
      <AnimatePresence>
        {showTunnelModal && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTunnelModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-xl bg-[#141414] border-t sm:border border-white/15 rounded-t-[28px] sm:rounded-2xl shadow-3xl overflow-hidden z-10 p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <TunnelDashboard onClose={() => setShowTunnelModal(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. 道路事故與特別交通消息通告彈窗 */}
      <AnimatePresence>
        {showNewsModal && (
          <TrafficNewsModal onClose={() => setShowNewsModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
