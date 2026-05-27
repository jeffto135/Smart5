import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Vehicle } from '../types';
import { Cpu, Flame, X, ShieldAlert, BadgeCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface MembershipCardProps {
  user: User | null;
  userProfile: UserProfile | null;
  vehicles: Vehicle[];
}

export const MembershipCard: React.FC<MembershipCardProps> = ({
  user,
  userProfile,
  vehicles = []
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Ref + Tilt state for inline small card
  const inlineCardRef = useRef<HTMLDivElement>(null);
  const [inlineTilt, setInlineTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [inlineSheen, setInlineSheen] = useState({ x: 50, y: 50 });
  const [isInlineHovered, setIsInlineHovered] = useState(false);

  // Ref + Tilt state for expanded fullscreen card
  const expandedCardRef = useRef<HTMLDivElement>(null);
  const [expandedTilt, setExpandedTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [expandedSheen, setExpandedSheen] = useState({ x: 50, y: 50 });
  const [isExpandedHovered, setIsExpandedHovered] = useState(false);

  // Real-time verification clock running continuously
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format YYYY-MM-DD HH:mm:ss
  const formatLiveTime = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  // Find vehicle model to determine if BRABUS
  const smart5Vehicle = vehicles.find(v => v.model.includes('#5')) || vehicles[0];
  const vehicleColor = smart5Vehicle?.color || '沉橡綠';
  const vehicleTrim = smart5Vehicle?.trim || (smart5Vehicle?.model.includes('BRABUS') ? 'BRABUS性能版' : 'Summit Edition');
  const vehiclePlate = smart5Vehicle?.plate || userProfile?.plate || 'S5 OWNERS';
  const isBrabus = vehicleTrim.toUpperCase().includes('BRABUS') || (smart5Vehicle?.model || '').toUpperCase().includes('BRABUS');

  // Member ID generation
  const getMemberId = () => {
    if (!user?.uid) return '#S5-OWNER';
    const cleanId = user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    return `#S5-${cleanId}`;
  };

  // Color Capsule styles mapping
  const getColorBadgeStyle = (color: string) => {
    const c = color.trim();
    if (c.includes('白')) return { bg: 'bg-white/10 border-white/20 text-white', dot: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' };
    if (c.includes('綠')) return { bg: 'bg-[#A3E635]/15 border-[#A3E635]/25 text-[#A3E635]', dot: 'bg-[#A3E635] shadow-[0_0_8px_rgba(163,230,21,0.6)]' };
    if (c.includes('棕') || c.includes('褐')) return { bg: 'bg-amber-700/10 border-amber-700/20 text-amber-500', dot: 'bg-amber-600' };
    if (c.includes('黑')) return { bg: 'bg-zinc-800/20 border-zinc-700/30 text-zinc-400', dot: 'bg-zinc-500' };
    if (c.includes('灰')) return { bg: 'bg-gray-400/10 border-gray-400/20 text-gray-400', dot: 'bg-gray-400' };
    if (c.includes('紅')) return { bg: 'bg-red-500/10 border-red-500/20 text-red-400', dot: 'bg-red-500' };
    if (c.includes('黃') || c.includes('金')) return { bg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', dot: 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.6)]' };
    if (c.includes('銀')) return { bg: 'bg-slate-300/10 border-slate-300/20 text-slate-300', dot: 'bg-slate-300' };
    if (c.includes('藍')) return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', dot: 'bg-blue-500' };
    if (c.includes('燕麥')) return { bg: 'bg-[#E5D3BF]/10 border-[#E5D3BF]/20 text-[#D7C2AD]', dot: 'bg-[#E5D3BF] shadow-[0_0_8px_rgba(229,211,191,0.6)]' };
    return { bg: 'bg-cyber-green/10 border-cyber-green/20 text-cyber-green', dot: 'bg-cyber-green' };
  };

  const badgeStyle = getColorBadgeStyle(vehicleColor);

  // 3D Motion Event Handlers - Inline Card
  const handleInlineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!inlineCardRef.current) return;
    const rect = inlineCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 14;
    const rotateY = ((x - centerX) / centerX) * 14;

    setInlineSheen({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    setInlineTilt({ rotateX, rotateY });
    setIsInlineHovered(true);
  };

  const handleInlineMouseLeave = () => {
    setInlineTilt({ rotateX: 0, rotateY: 0 });
    setIsInlineHovered(false);
  };

  const handleInlineTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!inlineCardRef.current || e.touches.length === 0) return;
    const rect = inlineCardRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      handleInlineMouseLeave();
      return;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 12;
    const rotateY = ((x - centerX) / centerX) * 12;

    setInlineSheen({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    setInlineTilt({ rotateX, rotateY });
    setIsInlineHovered(true);
  };

  // 3D Motion Event Handlers - Expanded Fullscreen Card
  const handleExpandedMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!expandedCardRef.current) return;
    const rect = expandedCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 16;
    const rotateY = ((x - centerX) / centerX) * 16;

    setExpandedSheen({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    setExpandedTilt({ rotateX, rotateY });
    setIsExpandedHovered(true);
  };

  const handleExpandedMouseLeave = () => {
    setExpandedTilt({ rotateX: 0, rotateY: 0 });
    setIsExpandedHovered(false);
  };

  const handleExpandedTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!expandedCardRef.current || e.touches.length === 0) return;
    const rect = expandedCardRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      handleExpandedMouseLeave();
      return;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 14;
    const rotateY = ((x - centerX) / centerX) * 14;

    setExpandedSheen({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    setExpandedTilt({ rotateX, rotateY });
    setIsExpandedHovered(true);
  };

  // Carbon Fiber bg pattern vs Brushed metal
  const cardBgStyle = isBrabus 
    ? {
        backgroundColor: '#070709',
        backgroundImage: `
          linear-gradient(45deg, #111 25%, transparent 25%), 
          linear-gradient(-45deg, #111 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #111 75%), 
          linear-gradient(-45deg, transparent 75%, #111 75%),
          linear-gradient(45deg, #1a1a20 25%, transparent 25%), 
          linear-gradient(-45deg, #1a1a20 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #1a1a20 75%), 
          linear-gradient(-45deg, transparent 75%, #1a1a20 75%)
        `,
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0, 4px 4px, 4px 0, 0 -4px, -4px 4px'
      }
    : {
        backgroundColor: '#101014',
        backgroundImage: `
          repeating-linear-gradient(90deg, rgba(255,255,255,0.005) 0px, rgba(255,255,255,0.005) 1px, transparent 1px, transparent 6px),
          repeating-linear-gradient(180deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 4px),
          linear-gradient(135deg, #1c1c22 0%, #060608 50%, #121216 100%)
        `
      };

  // Shared inner content renderer to guarantee 100% same layout & styling
  const renderCardContent = (
    ref: React.RefObject<HTMLDivElement | null>,
    tiltData: { rotateX: number; rotateY: number },
    sheenData: { x: number; y: number },
    hoveredState: boolean,
    mouseMoveHandler: (e: React.MouseEvent<HTMLDivElement>) => void,
    mouseLeaveHandler: () => void,
    touchMoveHandler: (e: React.TouchEvent<HTMLDivElement>) => void,
    cardStyles: React.CSSProperties,
    isFullscreen: boolean
  ) => {
    return (
      <div 
        ref={ref}
        onMouseMove={mouseMoveHandler}
        onMouseLeave={mouseLeaveHandler}
        onTouchMove={touchMoveHandler}
        onTouchEnd={mouseLeaveHandler}
        className={`w-full rounded-3xl p-6 border transition-all duration-150 relative overflow-hidden flex flex-col justify-between ${
          isFullscreen 
            ? 'h-[240px] md:h-[280px] text-base border-cyber-green' 
            : 'h-[225px] hover:scale-[1.015] active:scale-[0.99] border-[#A3E635]/40 shadow-xl shadow-[#A3E635]/5'
        }`}
        style={{
          ...cardStyles,
          transform: `rotateX(${tiltData.rotateX}deg) rotateY(${tiltData.rotateY}deg)`,
          boxShadow: isBrabus
            ? isFullscreen 
              ? '0 0 50px rgba(239, 68, 68, 0.25), inset 0 0 30px rgba(239, 68, 68, 0.15)'
              : 'inset 0 0 25px rgba(239,68,68,0.06), 0 12px 30px -5px rgba(0,0,0,0.8)'
            : isFullscreen 
              ? '0 0 50px rgba(163, 230, 21, 0.2), inset 0 0 30px rgba(163, 230, 21, 0.1)'
              : 'inset 0 0 25px rgba(163,230,21,0.04), 0 12px 30px -5px rgba(0,0,0,0.8)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Futuristic scanning lines */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#A3E635_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* BRABUS grid chequered flag element */}
        {isBrabus && (
          <div className="absolute top-0 right-0 w-44 h-full opacity-[0.08] pointer-events-none overflow-hidden text-red-500">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor), 
                  linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor)
                `,
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />
          </div>
        )}

        {/* Dynamic Sheen reflection */}
        {hoveredState && (
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 animate-pulse"
            style={{
              background: `radial-gradient(circle 220px at ${sheenData.x}% ${sheenData.y}%, rgba(255,255,255, 0.09) 0%, transparent 80%)`,
              mixBlendMode: 'overlay'
            }}
          />
        )}

        {/* TOP: Header brand name and verification badge */}
        <div className="flex items-start justify-between z-10" style={{ transform: 'translateZ(30px)' }}>
          <div>
            <div className={`font-mono font-bold tracking-[0.16em] flex items-center gap-1.5 ${
              isBrabus ? 'text-red-500 text-xs md:text-sm' : 'text-[#A3E635] text-xs md:text-sm'
            }`}>
              {isBrabus && <Flame size={14} className="text-red-500 fill-red-500 animate-pulse" />}
              <span>SMART#5 OWNERS CLUB</span>
            </div>
            <div className="text-[8px] font-mono text-white/45 tracking-widest leading-none mt-1">
              {isBrabus ? 'BRABUS HIGH PERFORMANCE' : 'OFFICIAL MEMBERSHIP EXECUTIVE'}
            </div>
          </div>

          {/* Neon Pulse verified badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border neon-glow-badge select-none ${
            isBrabus ? 'text-red-400 bg-red-500/10 border-red-500/35' : 'text-[#A3E635] bg-[#A3E635]/12 border-[#A3E635]/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isBrabus ? 'bg-red-500 shadow-[0_0_8px_#EF4444]' : 'bg-[#A3E635] shadow-[0_0_8px_#A3E635]'}`} />
            <span className="text-[8px] md:text-[9.5px] font-sans font-black tracking-wider uppercase">
              🟢 Verified Owner 實名車主
            </span>
          </div>
        </div>

        {/* MIDDLE: Chip & Owner Plate Name */}
        <div className="flex items-center justify-between z-10 mt-3" style={{ transform: 'translateZ(45px)' }}>
          {/* Smart Chip graphic */}
          <div className="w-11 h-9 rounded-lg bg-gradient-to-br from-amber-200/50 via-yellow-600/35 to-amber-500/25 border border-amber-400/40 relative overflow-hidden flex flex-col justify-between p-1.5 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]">
            <div className="w-full h-px bg-yellow-500/50" />
            <div className="flex justify-between">
              <div className="w-px h-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full border border-yellow-500/50" />
              <div className="w-px h-full bg-yellow-500/50" />
            </div>
            <div className="w-full h-px bg-yellow-500/50" />
            <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none">
              <Cpu size={16} className="text-yellow-400/50" />
            </div>
          </div>

          {/* Real owner physical metal/carbon plate with deep-set shadow effect */}
          <div className="text-right flex-1 pl-4">
            <h4 className="text-lg font-black font-sans text-white tracking-tight leading-tight uppercase">
              {userProfile?.displayName || user?.displayName || '車主會員'}
            </h4>
            <p 
              className="text-lg md:text-xl font-mono font-black tracking-widest leading-none mt-1.5 uppercase"
              style={{
                color: isBrabus ? '#EF4444' : '#A3E635',
                textShadow: '1px 1.5px 1.5px rgba(0,0,0,1), -0.5px -0.5px 0.5px rgba(255,255,255,0.1)'
              }}
            >
              {vehiclePlate}
            </p>
          </div>
        </div>

        {/* BOTTOM: Specs tags & unique member identification */}
        <div className="z-10 mt-auto pt-4 flex items-end justify-between border-t border-white/5" style={{ transform: 'translateZ(30px)' }}>
          <div className="space-y-1.5">
            <span className="block text-[10px] md:text-[11px] font-mono font-bold text-white/50 tracking-wider">
              Member ID: <span className="text-white font-extrabold">{getMemberId()}</span>
            </span>

            {/* Config Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black tracking-wider border hover:brightness-110 transition-all ${badgeStyle.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                🎨 {vehicleColor}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black tracking-wider border hover:brightness-110 transition-all ${
                isBrabus 
                  ? 'bg-red-500/15 border-red-500/30 text-red-400' 
                  : 'bg-[#A3E635]/12 border-[#A3E635]/30 text-[#A3E635]'
              }`}>
                ⚡ {vehicleTrim}
              </span>
            </div>
          </div>

          {/* Certification seal */}
          <div className="flex flex-col items-end opacity-25">
            <div className={`text-[7px] font-mono tracking-widest text-right font-black ${
              isBrabus ? 'text-red-500' : 'text-[#A3E635]'
            }`}>SECURE AUTH</div>
            <div className="text-[6px] font-mono text-white/60 text-right leading-none mt-0.5 font-bold">SMART#5 CERT</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-1 w-full max-w-sm mx-auto">
      {/* Safe glow animation stylesheet */}
      <style>{`
        @keyframes neonGlow {
          0%, 100% {
            box-shadow: 0 0 5px #A3E635, 0 0 10px rgba(163,214,21,0.35);
            background-color: rgba(163, 230, 21, 0.15);
            border-color: rgba(163, 230, 21, 0.4);
          }
          50% {
            box-shadow: 0 0 15px #A3E635, 0 0 22px rgba(163,214,21,0.65);
            background-color: rgba(163, 230, 21, 0.28);
            border-color: rgba(163, 230, 21, 0.9);
          }
        }
        .neon-glow-badge {
          animation: neonGlow 2.5s infinite ease-in-out;
        }
      `}</style>

      {/* 1. Inline interactive Card wrapper - clicking this opens the fullscreen modal */}
      <div 
        className="w-full select-none cursor-pointer"
        style={{ perspective: '1100px' }}
        onClick={() => setIsExpanded(true)}
        title="點擊放大出示會員卡 / Tap to Enlarge Member Card"
      >
        {renderCardContent(
          inlineCardRef,
          inlineTilt,
          inlineSheen,
          isInlineHovered,
          handleInlineMouseMove,
          handleInlineMouseLeave,
          handleInlineTouchMove,
          cardBgStyle,
          false
        )}
      </div>

      {/* 2. Embedded Dynamic Security Clock below inline card */}
      <div 
        onClick={() => setIsExpanded(true)}
        className="w-full mt-4 px-4 py-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-900 text-center flex items-center justify-center gap-2 shadow-2xl cursor-pointer hover:border-[#A3E635]/30 transition-all duration-300"
        id="live_verification_clock"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3E635] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3E635]"></span>
        </span>
        <span className="text-[11px] font-mono font-black text-white/90 tracking-widest">
          🛡️ 官方實時驗證：<span className="text-[#A3E635] select-none">{formatLiveTime(currentTime)}</span>
        </span>
      </div>

      {/* 3. Fullscreen immersive pop-up modal view */}
      <AnimatePresence>
        {isExpanded && (
          <div 
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-xl"
            onClick={() => setIsExpanded(false)}
          >
            {/* Backdrop Zooming Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30, rotateX: 12 }}
              animate={{ opacity: 1, scale: 1.1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              className="w-full max-w-sm md:max-w-md pointer-events-auto"
              style={{ perspective: '1200px' }}
              onClick={(e) => {
                // Clicking card triggers zoom out as requested by "用戶點擊卡片以外的黑化區域、或點擊卡片本身時，觸發 setIsExpanded(false)"
                e.stopPropagation();
                setIsExpanded(false);
              }}
            >
              {renderCardContent(
                expandedCardRef,
                expandedTilt,
                expandedSheen,
                isExpandedHovered,
                handleExpandedMouseMove,
                handleExpandedMouseLeave,
                handleExpandedTouchMove,
                cardBgStyle,
                true
              )}
            </motion.div>

            {/* Enlarged real-time verification clock */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-sm md:max-w-md mt-6 px-5 py-3 rounded-2xl bg-zinc-950 border border-zinc-900 text-center flex items-center justify-center gap-2.5 shadow-[0_4px_30px_rgba(163,230,21,0.08)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#A3E635] animate-ping" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#A3E635] absolute" />
              <span className="text-xs md:text-sm font-mono font-black text-white tracking-widest uppercase">
                🛡️ 官方實時防偽認證：<span className="text-[#A3E635] select-all">{formatLiveTime(currentTime)}</span>
              </span>
            </motion.div>

            {/* Glowing neon green tap anywhere to collapse hint */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ delay: 0.18 }}
              className="mt-12 text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#A3E635]/15 to-transparent border border-[#A3E635]/30 rounded-full text-xs font-mono font-black text-[#A3E635] tracking-widest uppercase animate-bounce cursor-pointer">
                ✖ 點擊任意位置收回 / TAP ANYWHERE TO CLOSE
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
