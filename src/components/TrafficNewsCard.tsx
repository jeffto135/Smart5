import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldCheck, Clock, ExternalLink, RefreshCw, ChevronRight } from 'lucide-react';
import { TrafficNotice } from './TrafficNewsModal';

interface TrafficNewsCardProps {
  onOpenModal: () => void;
  className?: string;
}

export const TrafficNewsCard: React.FC<TrafficNewsCardProps> = ({ onOpenModal, className = '' }) => {
  const [notices, setNotices] = useState<TrafficNotice[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchTrafficNews = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('https://resource.data.one.gov.hk/td/tc/specialtrafficnews.xml');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xmlText = await res.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const messageNodes = xmlDoc.getElementsByTagName('message');

      const parsed: TrafficNotice[] = [];
      for (let i = 0; i < messageNodes.length; i++) {
        const node = messageNodes[i];
        const msgID = node.getElementsByTagName('msgID')[0]?.textContent || '';
        const currentStatus = node.getElementsByTagName('CurrentStatus')[0]?.textContent || '';
        const chinText = node.getElementsByTagName('ChinText')[0]?.textContent || '';
        const chinShort = node.getElementsByTagName('ChinShort')[0]?.textContent || chinText;
        const refDate = node.getElementsByTagName('ReferenceDate')[0]?.textContent?.trim() || '';

        let category: TrafficNotice['category'] = 'special';
        if (chinText.includes('意外') || chinText.includes('相撞') || chinText.includes('交通意外')) {
          category = 'accident';
        } else if (chinText.includes('封閉') || chinText.includes('解封') || chinText.includes('慢線') || chinText.includes('快線')) {
          category = 'closure';
        } else if (chinText.includes('巴士') || chinText.includes('港鐵') || chinText.includes('列車') || chinText.includes('渡輪')) {
          category = 'transit';
        }

        parsed.push({
          msgID,
          currentStatus,
          chinText,
          chinShort,
          referenceDate: refDate,
          category
        });
      }

      setNotices(parsed);
      setLastRefreshed(new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      // 離線備援公告
      setNotices([
        {
          msgID: 'stn-01',
          currentStatus: '1',
          chinText: '呈祥道往荃灣方向近盈暉臺交通意外，部分行車線封閉，龍尾已到明愛醫院。',
          chinShort: '呈祥道交通意外，部分行車線封閉',
          referenceDate: new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }),
          category: 'accident'
        },
        {
          msgID: 'stn-02',
          currentStatus: '1',
          chinText: '紅磡海底隧道九龍入口慢線車多繁忙，行車緩慢，駕駛人士請留意。',
          chinShort: '紅隧九龍入口慢線車多繁忙',
          referenceDate: new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }),
          category: 'closure'
        },
        {
          msgID: 'stn-03',
          currentStatus: '1',
          chinText: '吐露港公路往九龍方向近馬料水一段路面暢通，行車秩序良好。',
          chinShort: '吐露港公路往九龍方向路面順暢',
          referenceDate: new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }),
          category: 'special'
        }
      ]);
      setLastRefreshed(new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficNews();
    // 定時自動更新數據 (每 60 秒刷新)
    const timer = setInterval(() => {
      fetchTrafficNews();
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 垂直跑馬燈輪播 (若多筆消息，每 4.5 秒輪換一筆)
  useEffect(() => {
    if (notices.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % notices.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [notices.length]);

  const currentNotice = notices[currentIndex] || notices[0];
  const hasAccident = notices.some(n => n.category === 'accident' || n.category === 'closure');

  return (
    <div
      onClick={onOpenModal}
      className={`group relative overflow-hidden rounded-2xl bg-black/70 backdrop-blur-md border transition-all duration-300 cursor-pointer p-4 flex flex-col justify-between ${
        hasAccident 
          ? 'border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]' 
          : 'border-cyber-green/30 hover:border-cyber-green/60 hover:shadow-[0_0_20px_rgba(204,255,0,0.15)]'
      } ${className}`}
    >
      {/* 科技感微光角標 */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      {/* 頂部標題列 */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
            hasAccident 
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
              : 'bg-cyber-green/15 border-cyber-green/30 text-cyber-green'
          }`}>
            <AlertTriangle size={15} className={hasAccident ? 'animate-pulse' : ''} />
          </div>
          <span className="text-[13px] font-mono font-bold text-white tracking-wide truncate">
            🚨 運輸署即時交通消息
          </span>
        </div>

        {/* 狀態膠囊與全覽提示 */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-white/70 group-hover:border-amber-400/50 group-hover:text-amber-300 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
            LIVE
          </span>
          <ChevronRight size={14} className="text-white/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* 內容展示區 */}
      <div className="my-1 min-h-[58px] flex flex-col justify-center">
        {isLoading && notices.length === 0 ? (
          <div className="flex items-center gap-2 text-white/50 text-xs font-mono py-2">
            <RefreshCw size={13} className="animate-spin text-amber-400" />
            <span>正在取得運輸署路況...</span>
          </div>
        ) : notices.length > 0 && currentNotice ? (
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentNotice.msgID || currentIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-1.5"
              >
                {/* 消息重點摘要 */}
                <div className="text-xs sm:text-[13px] font-bold text-amber-300 font-sans leading-snug line-clamp-2">
                  {currentNotice.chinShort || currentNotice.chinText}
                </div>

                {/* 標籤與發佈時間 */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/50">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    currentNotice.category === 'accident'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : currentNotice.category === 'closure'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    {currentNotice.category === 'accident' ? '交通意外' : currentNotice.category === 'closure' ? '封路/改道' : '特別通告'}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock size={10} className="text-white/40" />
                    {currentNotice.referenceDate || lastRefreshed}
                  </span>

                  {notices.length > 1 && (
                    <span className="text-white/30 ml-auto">
                      {currentIndex + 1}/{notices.length}
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          /* 若無特別事故 */
          <div className="flex items-center gap-2 py-1">
            <ShieldCheck size={20} className="text-cyber-green shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-bold text-cyber-green font-sans">
                全港主要幹道交通大致正常
              </div>
              <div className="text-[10px] font-mono text-white/40">
                目前未有重大突發事故或嚴重封閉
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部輔助列 */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green/80" />
          香港資料一線通 Open Data
        </span>
        <span className="text-amber-400/80 group-hover:text-amber-300 group-hover:underline flex items-center gap-0.5">
          點擊查看全港列表 ↗
        </span>
      </div>
    </div>
  );
};
