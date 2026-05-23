import React, { useState } from 'react';
import { ChevronLeft, BarChart3, Clock } from 'lucide-react';
import { Poll } from '../types';
import { motion } from 'motion/react';
import { CyberCard } from './ui/CyberCard';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { format } from 'date-fns';

interface PollListProps {
  polls: Poll[];
  userId: string;
  onVote: (pollId: string, selection: string[]) => Promise<void>;
  onClose: () => void;
}

export const PollList: React.FC<PollListProps> = ({ polls, userId, onVote, onClose }) => {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [warningMessage, setWarningMessage] = useState<Record<string, string>>({});
  const [confirmingPollId, setConfirmingPollId] = useState<string | null>(null);

  const handleOptionToggle = (poll: Poll, optionId: string) => {
    const pollId = poll.id;
    const isMulti = !!poll.isMultiSelect;
    const max = poll.maxChoices || 0;
    const current = selections[pollId] || [];

    if (!isMulti) {
      // Single select: replace selections
      setSelections(prev => ({
        ...prev,
        [pollId]: [optionId]
      }));
      setWarningMessage(prev => ({ ...prev, [pollId]: '' }));
    } else {
      // Multi select: toggle selections
      if (current.includes(optionId)) {
        setSelections(prev => ({
          ...prev,
          [pollId]: current.filter(id => id !== optionId)
        }));
        setWarningMessage(prev => ({ ...prev, [pollId]: '' }));
      } else {
        if (max > 0 && current.length >= max) {
          // Exceeds limit! Warning
          setWarningMessage(prev => ({
            ...prev,
            [pollId]: `⚠️ 最多只能選擇 ${max} 項 / Maximum ${max} options allowed!`
          }));
          // Remove warning after 4 seconds
          setTimeout(() => {
            setWarningMessage(prev => ({
              ...prev,
              [pollId]: ''
            }));
          }, 4000);
          return;
        }
        setSelections(prev => ({
          ...prev,
          [pollId]: [...current, optionId]
        }));
        setWarningMessage(prev => ({ ...prev, [pollId]: '' }));
      }
    }
  };

  const handleVoteSubmitClick = (pollId: string) => {
    const list = selections[pollId] || [];
    if (list.length === 0) return;
    setConfirmingPollId(pollId);
  };

  const executeVote = async () => {
    if (!confirmingPollId) return;
    const list = selections[confirmingPollId] || [];
    try {
      await onVote(confirmingPollId, list);
      // Clean selections on success
      setSelections(prev => {
        const next = { ...prev };
        delete next[confirmingPollId];
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmingPollId(null);
    }
  };

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
        polls.map((poll) => {
          const hasVoted = (poll.votedUserIds || poll.voters || []).includes(userId);
          const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
          const currentSelection = selections[poll.id] || [];

          return (
            <motion.div
              key={poll.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CyberCard className={`overflow-hidden transition-all duration-300 ${hasVoted ? 'border-cyber-green shadow-[0_0_20px_rgba(163,230,21,0.08)] bg-[#A3E635]/[0.02]' : 'border-white/10'}`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <h3 className={`text-lg font-mono font-bold tracking-tight uppercase ${hasVoted ? 'text-[#A3E635] cyber-text-glow' : 'text-white'}`}>
                        {poll.title || poll.question}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-[9px] font-mono">
                        <span className="text-[#A3E635] bg-[#A3E635]/15 border border-[#A3E635]/25 px-2 py-0.5 rounded">
                          {poll.isMultiSelect ? `多選模式${poll.maxChoices ? ` (限選 ${poll.maxChoices} 項)` : ''}` : '單選模式'}
                        </span>
                        {poll.endDate && (
                          <span className="text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                            截至: {poll.endDate}
                          </span>
                        )}
                      </div>
                    </div>
                    {hasVoted && (
                      <div className="text-[10px] font-mono px-3 py-1 bg-cyber-green text-black rounded-lg font-black shadow-[0_0_10px_rgba(163,230,21,0.5)]">
                        VOTED
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
                    <Clock size={12} />
                    發佈於 {poll.createdAt ? format(poll.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '未知時間'}
                  </div>

                  <div className="space-y-3">
                    {poll.options.map((option, idx) => {
                      const optId = option.id || `opt_${idx + 1}`;
                      const isSelected = currentSelection.includes(optId);
                      const percentage = totalVotes > 0 ? ((option.votes || 0) / totalVotes) * 100 : 0;
                      
                      return (
                        <div key={idx} className="relative">
                          {hasVoted ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-mono px-1">
                                <span className="text-white/70 font-bold">{option.text}</span>
                                <div className="flex gap-3">
                                  <span className="text-white/40">{option.votes || 0} 票</span>
                                  <span className="text-cyber-green font-black">{percentage.toFixed(0)}%</span>
                                </div>
                              </div>
                              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-[#A3E635]/10 p-[1px]">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className="h-full bg-cyber-green shadow-[0_0_15px_#CCFF00] rounded-full"
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOptionToggle(poll, optId)}
                              className={`w-full p-4 text-left rounded-xl bg-white/5 border transition-all text-xs font-mono font-bold group relative overflow-hidden ${
                                isSelected 
                                  ? 'border-[#A3E635] bg-[#A3E635]/5 shadow-[0_0_15px_rgba(163,230,21,0.1)]' 
                                  : 'border-white/10 hover:border-[#A3E635]/40 hover:bg-[#A3E635]/5'
                              }`}
                            >
                              <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {/* Radio / Checkbox Marker */}
                                  {poll.isMultiSelect ? (
                                    <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                                      isSelected
                                        ? 'border-[#A3E635] bg-[#A3E635] shadow-[0_0_10px_rgba(163,230,21,0.5)]'
                                        : 'border-white/20 group-hover:border-[#A3E635]'
                                    }`}>
                                      {isSelected && (
                                        <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                                      isSelected
                                        ? 'border-[#A3E635]'
                                        : 'border-white/20 group-hover:border-[#A3E635]'
                                    }`}>
                                      {isSelected && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#A3E635] shadow-[0_0_8px_#A3E635]" />
                                      )}
                                    </div>
                                  )}
                                  <span className={`transition-all ${isSelected ? 'text-[#A3E635] font-black' : 'text-white group-hover:text-white/80'}`}>{option.text}</span>
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-r from-cyber-green/0 to-cyber-green/0 group-hover:from-cyber-green/5 transition-all" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Button & Warnings Section */}
                  {!hasVoted && (
                    <div className="pt-2 flex flex-col gap-2">
                      {warningMessage[poll.id] && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs font-mono text-red-400 font-bold bg-red-950/40 border border-red-500/20 px-3 py-2 rounded-lg text-center"
                        >
                          {warningMessage[poll.id]}
                        </motion.div>
                      )}
                      <button
                        disabled={currentSelection.length === 0}
                        onClick={() => handleVoteSubmitClick(poll.id)}
                        className={`w-full py-3 rounded-xl font-mono text-xs font-bold uppercase transition-all tracking-widest ${
                          currentSelection.length > 0
                            ? 'bg-[#A3E635] text-black shadow-[0_0_15px_rgba(163,230,21,0.4)] hover:shadow-[0_0_25px_rgba(163,230,21,0.6)] cursor-pointer'
                            : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        提交投票 / Submit Vote (已選 {currentSelection.length} 項)
                      </button>
                    </div>
                  )}

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
        isOpen={!!confirmingPollId}
        title="確認送出投票"
        message="投票經送出後便無法撤回或更改，確定要提交您選取的項目嗎？\nSUBMIT YOUR VOTE SELECTIONS?"
        variant="info"
        onConfirm={executeVote}
        onCancel={() => setConfirmingPollId(null)}
      />
    </div>
  );
};
