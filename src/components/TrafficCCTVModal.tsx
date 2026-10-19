import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, RefreshCw, X, MapPin, ExternalLink, ZoomIn, Search, Check, ArrowRight } from 'lucide-react';
import { TrafficCamera, CCTV_CAMERAS } from '../data/cctvCameras';

interface TrafficCCTVModalProps {
  camera: TrafficCamera | null;
  onClose: () => void;
  onSelectCamera?: (camera: TrafficCamera) => void;
}

export const TrafficCCTVModal: React.FC<TrafficCCTVModalProps> = ({
  camera,
  onClose,
  onSelectCamera
}) => {
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 每次切換鏡頭時重置狀態
  useEffect(() => {
    if (camera) {
      setTimestamp(Date.now());
      setImageError(false);
      setImageLoading(true);
    }
  }, [camera?.key]);

  if (!camera) return null;

  // 強制加上 timestamp 防 CDN/瀏覽器緩存，取得最新 2 分鐘內拍攝畫面
  const liveImageUrl = `https://tdcctv.data.one.gov.hk/${camera.key}.JPG?t=${timestamp}`;

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setImageLoading(true);
    setImageError(false);
    setTimestamp(Date.now());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // 附近的相關推薦鏡頭（同區或同路段）
  const relatedCameras = CCTV_CAMERAS.filter(c => 
    c.key !== camera.key && 
    (c.district === camera.district || c.description.slice(0, 4) === camera.description.slice(0, 4))
  ).slice(0, 6);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* 遮罩背景 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
      />

      {/* 彈窗主體 (Bottom sheet on mobile, modal on desktop) */}
      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#141414] border-t sm:border border-white/15 rounded-t-[28px] sm:rounded-2xl shadow-3xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* 頂部手柄與關閉列 */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <Video size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white truncate">
                  {camera.description}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 shrink-0 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="text-[10px] font-mono text-white/40 flex items-center gap-1.5 mt-0.5">
                <MapPin size={11} className="text-[#d4ff00]" />
                <span>{camera.region} · {camera.district}</span>
                <span className="text-white/20">│</span>
                <span>ID: {camera.key}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="重新整理影像"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-[#d4ff00]' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 影像展示區 */}
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-[4/3] flex items-center justify-center group shadow-2xl">
            {imageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 space-y-2">
                <RefreshCw size={24} className="animate-spin text-[#d4ff00]" />
                <span className="text-xs font-mono text-white/50">正在連線運輸署實時鏡頭...</span>
              </div>
            )}

            {imageError ? (
              <div className="text-center p-6 space-y-2">
                <div className="text-2xl">📹</div>
                <div className="text-xs font-mono text-white/60">此路段鏡頭正進行維修或暫停服務</div>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="px-3 py-1.5 bg-[#d4ff00] text-black text-xs font-mono font-bold rounded-lg mt-2 cursor-pointer"
                >
                  重試連線
                </button>
              </div>
            ) : (
              <img
                src={liveImageUrl}
                alt={camera.description}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}

            {/* 浮水印與時間戳記 */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-white/80 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 pointer-events-none">
              <span className="flex items-center gap-1 text-[#d4ff00] font-bold">
                <span>🇭🇰 香港運輸署實時快拍</span>
              </span>
              <span>{new Date(timestamp).toLocaleTimeString('zh-HK')}</span>
            </div>
          </div>

          {/* 鏡頭資訊與導航 */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-white/40 block text-[10px]">官方編號</span>
              <span className="text-white font-bold">{camera.key}</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">座標</span>
              <span className="text-white/70">{camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</span>
            </div>
            <a
              href={`https://maps.google.com/?q=${camera.lat},${camera.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white/10 hover:bg-[#d4ff00] hover:text-black text-white rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
            >
              <span>導航</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* 附近/同區其他鏡頭推薦 */}
          {relatedCameras.length > 0 && onSelectCamera && (
            <div className="space-y-2 pt-2 border-t border-white/5 text-left">
              <span className="text-[11px] font-mono text-white/50 block font-bold">
                附近其他路段閉路電視 ({camera.district})
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {relatedCameras.map(rel => (
                  <button
                    key={rel.key}
                    type="button"
                    onClick={() => onSelectCamera(rel)}
                    className="p-2 rounded-xl bg-black/40 hover:bg-white/10 border border-white/5 hover:border-[#d4ff00]/40 text-left transition-all cursor-pointer truncate"
                  >
                    <span className="text-xs font-mono text-white font-bold block truncate">
                      {rel.description}
                    </span>
                    <span className="text-[9px] font-mono text-white/40 block">
                      ID: {rel.key}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
