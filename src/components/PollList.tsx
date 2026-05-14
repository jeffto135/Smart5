import React, { useState } from 'react';
import { ChevronLeft, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { Poll } from '../types';
import { motion } from 'motion/react';
import { CyberCard } from './ui/CyberCard';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { format } from 'date-fns';

interface PollListProps {
  polls: Poll[];
  userId: string;
  onVote: (pollId: string, optionIndex: number) => Promise<void>;
  onClose: () => void;
}

export const PollList: React.FC<PollListProps> = ({ polls, userId, onVote, onClose }) => {
  const [confirmingVote, setConfirmingVote] = useState<{ pollId: string; optionIndex: number } | null>(null);

  const handleVoteClick = (pollId: string, optionIndex: number) => {
    setConfirmingVote({ pollId, optionIndex });
  };

  const executeVote = async () => {
    if (!confirmingVote) return;
    await onVote(confirmingVote.pollId, confirmingVote.optionIndex);
    setConfirmingVote(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">即時投票 <span className="text-cyber-green">Polls</span></h2>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-20 opacity-30 font-mono text-sm uppercase tracking-widest">
          尚無進行中投票
        </div>
      ) : (
        polls.map((poll) => {
          const hasVoted = poll.voters.includes(userId);
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

          return (
            <motion.div
              key={poll.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CyberCard className={`overflow-hidden transition-all duration-300 ${hasVoted ? 'border-cyber-green shadow-[0_0_20px_rgba(204,255,0,0.1)] bg-cyber-green/5' : 'border-cyber-green/20'}`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className={`text-lg font-mono font-bold tracking-tight uppercase ${hasVoted ? 'text-cyber-green cyber-text-glow' : 'text-white'}`}>
                      {poll.question}
                    </h3>
                    {hasVoted && (
                      <div className="text-[10px] font-mono px-3 py-1 bg-cyber-green text-black rounded-full font-black shadow-[0_0_10px_#CCFF00]">
                        VOTED
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
                    <Clock size={12} />
                    發佈於 {format(poll.createdAt.toDate(), 'yyyy-MM-dd HH:mm')}
                  </div>

                  <div className="space-y-4">
                    {poll.options.map((option, idx) => {
                      const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                      
                      return (
                        <div key={idx} className="relative">
                          {hasVoted ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-mono px-1">
                                <span className="text-white/70 font-bold">{option.text}</span>
                                <div className="flex gap-3">
                                  <span className="text-white/40">{option.votes} 票</span>
                                  <span className="text-cyber-green font-black">{percentage.toFixed(0)}%</span>
                                </div>
                              </div>
                              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-cyber-green/10 p-[1px]">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className="h-full bg-cyber-green shadow-[0_0_15px_#CCFF00] rounded-full"
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVoteClick(poll.id, idx)}
                              className="w-full p-4 text-left rounded-xl bg-white/5 border border-white/10 hover:border-cyber-green hover:bg-cyber-green/10 transition-all text-xs font-mono font-bold group relative overflow-hidden"
                            >
                              <div className="relative z-10 flex justify-between items-center">
                                <span className="group-hover:text-cyber-green group-hover:cyber-text-glow transition-all">{option.text}</span>
                                <div className="w-5 h-5 rounded-full border-2 border-white/20 group-hover:border-cyber-green group-hover:shadow-[0_0_10px_#CCFF00] transition-all flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-cyber-green opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-r from-cyber-green/0 to-cyber-green/0 group-hover:from-cyber-green/5 transition-all" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {hasVoted && (
                    <div className="pt-4 border-t border-cyber-green/10 flex items-center gap-3 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      <BarChart3 size={14} className="text-cyber-green" />
                      即時數據更新中 • 總票數 {totalVotes}
                    </div>
                  )}
                </div>
              </CyberCard>
            </motion.div>
          );
        })
      )}

      <ConfirmationModal
        isOpen={!!confirmingVote}
        title="確認投票"
        message="確定要投下這一票嗎？\nSUBMIT YOUR VOTE?"
        variant="info"
        onConfirm={executeVote}
        onCancel={() => setConfirmingVote(null)}
      />
    </div>
  );
};
