import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Youtube, Navigation, Filter, Info, X } from 'lucide-react';
import { ParkingLot } from '../types';
import { CyberCard } from './ui/CyberCard';

interface ParkingLeafletMapProps {
  parkingLots: ParkingLot[];
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

// Create a custom marker icon component
const createCustomIcon = (color: string, isSelected: boolean) => {
  const size = isSelected ? 40 : 30;
  
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
        box-shadow: 0 0 ${isSelected ? '20px' : '5px'} ${color};
        border: 2px solid rgba(255,255,255,0.4);
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="
          width: 35%;
          height: 35%;
          background: #000;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
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

export const ParkingLeafletMap: React.FC<ParkingLeafletMapProps> = ({ parkingLots }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | '港島' | '九龍' | '新界'>('all');
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(HK_CENTER);
  const [mapZoom, setMapZoom] = useState(11);

  const filteredLots = useMemo(() => {
    return parkingLots.filter(lot => {
      const matchSearch = lot.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRegion = regionFilter === 'all' || lot.region === regionFilter;
      return matchSearch && matchRegion;
    });
  }, [parkingLots, searchQuery, regionFilter]);

  const handleLotClick = (lot: ParkingLot) => {
    setSelectedLot(lot);
    setMapCenter([lot.lat, lot.lng]);
    setMapZoom(16);
  };

  const getDifficultyColor = (tag: ParkingLot['difficultyTag']) => {
    switch (tag) {
      case '輕易': return '#CCFF00'; // Neon Green
      case '中等': return '#FFD700'; // Gold/Yellow
      case '地獄': return '#FF4444'; // Red
      case '不可能的任務': return '#FF00FF'; // Magenta/Purple
      default: return '#CCFF00';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 sm:space-y-4">
      {/* Search & Filter Header - More compact on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-4 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shrink-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text" 
            placeholder="搜尋停車場..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 transition-all font-mono placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {(['all', '港島', '九龍', '新界'] as const).map(region => (
            <button
              key={region}
              onClick={() => setRegionFilter(region)}
              className={`flex-1 min-w-[60px] py-2 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest transition-all border ${
                regionFilter === region 
                  ? 'bg-cyber-green border-cyber-green text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' 
                  : 'bg-white/5 text-white/30 border-white/5 hover:border-white/20'
              }`}
            >
              {region === 'all' ? '全部' : region}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container - Height adjustment for small screens */}
      <div className="flex-1 min-h-[300px] sm:min-h-[400px] relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#1a1a1a] shadow-inner">
        <MapContainer
          center={HK_CENTER}
          zoom={11}
          style={{ width: '100%', height: '100%', background: '#1a1a1a' }}
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
              icon={createCustomIcon(getDifficultyColor(lot.difficultyTag), selectedLot?.id === lot.id)}
              eventHandlers={{
                click: () => handleLotClick(lot)
              }}
            />
          ))}
        </MapContainer>

        {/* Selected Lot Hover Card */}
        <AnimatePresence>
          {selectedLot && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              className="absolute bottom-6 left-1/2 z-[1000] w-[calc(100%-48px)] max-w-sm"
            >
              <CyberCard className="border-cyber-green/50 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-black/90 backdrop-blur-2xl">
                <button 
                  onClick={() => setSelectedLot(null)}
                  className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                        selectedLot.difficultyTag === '不可能的任務' ? 'bg-fuchsia-600 text-white' :
                        selectedLot.difficultyTag === '地獄' ? 'bg-red-500 text-white' : 
                        selectedLot.difficultyTag === '中等' ? 'bg-yellow-500 text-black' : 'bg-cyber-green text-black'
                      }`}>
                        {selectedLot.difficultyTag}難度
                      </span>
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">{selectedLot.region}</span>
                    </div>
                    <h4 className="text-xl font-bold text-white tracking-tight leading-tight">{selectedLot.name}</h4>
                    {selectedLot.address && (
                      <p className="text-[10px] text-white/40 font-mono mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {selectedLot.address}
                      </p>
                    )}
                  </div>
                  
                  {selectedLot.adminNotes && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-white/60 font-sans leading-relaxed flex gap-2">
                        <Info size={14} className="shrink-0 text-cyber-green/40 mt-0.5" />
                        {selectedLot.adminNotes}
                      </p>
                    </div>
                  )}

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
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs flex items-center justify-center hover:bg-white/10 transition-all"
                      title="導航 / NAVIGATE"
                    >
                      <Navigation size={16} />
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
            onClick={() => handleLotClick(lot)}
            className={`p-3 sm:p-4 rounded-xl border transition-all text-left relative group ${
              selectedLot?.id === lot.id 
                ? 'bg-cyber-green/10 border-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.1)]' 
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-start mb-1 gap-2">
              <span className="font-bold text-sm text-white group-hover:text-cyber-green transition-colors line-clamp-1">{lot.name}</span>
              <span className={`shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                lot.difficultyTag === '不可能的任務' ? 'text-fuchsia-500 border-fuchsia-500/20' :
                lot.difficultyTag === '地獄' ? 'text-red-500 border-red-500/20' : 
                lot.difficultyTag === '中等' ? 'text-yellow-500 border-yellow-500/20' : 'text-cyber-green border-cyber-green/20'
              }`}>
                {lot.difficultyTag}
              </span>
            </div>
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest flex items-center gap-1.5">
               {lot.region}
               {lot.videoGuide && (
                 <span className="flex items-center gap-0.5 text-cyber-green/50">
                    <Youtube size={10} /> VIDEO
                 </span>
               )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
