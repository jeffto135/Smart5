import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Reset pull distance when returning to idle
  useEffect(() => {
    if (status === 'idle') {
      controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
      setPullDistance(0);
    } else if (status === 'refreshing') {
      controls.start({ y: 55, transition: { type: 'spring', stiffness: 200, damping: 25 } });
    }
  }, [status, controls]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    // Only allow pulling if we are at the top of the scroll container
    if (container.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setPullDistance(0);
      if (status === 'idle') {
        setStatus('pulling');
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || startY === 0 || status === 'refreshing') return;

    if (container.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        // Apply responsive resistance friction logic (rubberband effect)
        const distance = Math.min(100, deltaY * 0.45);
        setPullDistance(distance);
        controls.set({ y: distance });

        if (distance >= 55) {
          setStatus('ready');
        } else {
          setStatus('pulling');
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (status === 'refreshing') return;

    setStartY(0);
    if (status === 'ready' || pullDistance >= 55) {
      setStatus('refreshing');
      try {
        await onRefresh();
      } catch (err) {
        console.error(err);
      } finally {
        // Guaranteed minimum 1 sec layout rotation for top polish
        setTimeout(() => {
          setStatus('idle');
        }, 1000);
      }
    } else {
      setStatus('idle');
    }
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-y-auto h-full w-full scrollbar-none"
    >
      {/* Pull down indicator overlay */}
      <div 
        className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center transition-all pointer-events-none"
        style={{
          height: '55px',
          transform: `translateY(${status === 'refreshing' ? 0 : pullDistance - 55}px)`,
          opacity: status === 'idle' ? 0 : Math.min(1, pullDistance / 40),
        }}
      >
        <div className="flex items-center gap-2 bg-[#0c0d0e]/95 border border-cyber-green/20 px-4 py-2.5 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.1)] backdrop-blur-md">
          {status === 'refreshing' ? (
            <RefreshCw size={14} className="text-cyber-green animate-spin" />
          ) : (
            <ArrowDown 
              size={14} 
              className={`text-cyber-green transition-transform duration-200 ${
                status === 'ready' ? 'rotate-180' : ''
              }`} 
            />
          )}
          <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider select-none">
            {status === 'pulling' && '下拉重新載入... / PULL'}
            {status === 'ready' && '鬆開立即刷新 / RELEASE'}
            {status === 'refreshing' && '⌛ 數據同步中... / REFRESHING'}
          </span>
        </div>
      </div>

      <motion.div animate={controls} className="w-full h-full">
        {children}
      </motion.div>
    </div>
  );
};
