import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Poll } from '../types';
import { PollCard } from './PollCard';

interface PollListProps {
  polls: Poll[];
  userId: string;
  onVote: (pollId: string, selection: string[]) => Promise<void>;
  onClose: () => void;
}

export const PollList: React.FC<PollListProps> = ({ polls, userId, onVote, onClose }) => {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors animate-pulse">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">即時投票 <span className="text-cyber-green">Polls</span></h2>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest">
          尚無進行中投票
        </div>
      ) : (
        <div className="space-y-6">
          {/* 🟢 確保 DOM 節點獨立，防止新組件插入時造成舊組件重繪（Re-render）出錯 */}
          {polls.map((poll) => (
            <PollCard 
              key={poll.id} 
              poll={poll} 
              userId={userId} 
              onVote={onVote} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
