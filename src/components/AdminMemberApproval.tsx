import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users } from 'lucide-react';
import { UserProfile, Vehicle } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';

interface AdminMemberApprovalProps {
  userRole: 'admin' | 'subAdmin';
  setActiveSubTab: (tab: string) => void;
  memberSearch: string;
  setMemberSearch: (v: string) => void;
  memberPage: number;
  setMemberPage: (page: number | ((prev: number) => number)) => void;
  MEMBERS_PER_PAGE: number;
  sortedProfiles: UserProfile[];
  pagedProfiles: UserProfile[];
  vehicles: Vehicle[];
  setSelectedMember: (p: UserProfile | null) => void;
  isAdmin: boolean;
  onUpdateMemberRole: (id: string, role: string) => Promise<void>;
  onUpdateMemberPlate?: (id: string, plate: string) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  format: (date: Date, pattern: string) => string;
  privacyMode?: boolean;
}

export const AdminMemberApproval: React.FC<AdminMemberApprovalProps> = ({
  userRole,
  setActiveSubTab,
  memberSearch,
  setMemberSearch,
  memberPage,
  setMemberPage,
  MEMBERS_PER_PAGE,
  sortedProfiles,
  pagedProfiles,
  vehicles,
  setSelectedMember,
  isAdmin,
  onUpdateMemberRole,
  onUpdateMemberPlate,
  onDeleteMember,
  format,
  privacyMode = false
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPlateValue, setEditingPlateValue] = useState<string>('');
  const [isPlateSaving, setIsPlateSaving] = useState(false);

  const startEditPlate = (userId: string, currentPlate: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setEditingUserId(userId);
    setEditingPlateValue(currentPlate);
  };

  const handleSavePlate = async (userId: string) => {
    if (!editingPlateValue.trim()) {
      setEditingUserId(null);
      return;
    }
    setIsPlateSaving(true);
    try {
      if (onUpdateMemberPlate) {
        await onUpdateMemberPlate(userId, editingPlateValue.trim().toUpperCase());
      }
      setEditingUserId(null);
    } catch (err: any) {
      alert("修改車牌出錯: " + err.message);
    } finally {
      setIsPlateSaving(false);
    }
  };

  // 🟢 雙重防線：若明確「不是最高管理員」嘗試加載此敏感組件，直接安全阻斷並強制跳轉
  useEffect(() => {
    if (userRole !== 'admin') {
      alert("權限不足：此功能僅限最高管理員使用！\nACCESS DENIED. THIS MODULE IS EXCLUSIVE TO MAIN ADMINISTRATORS.");
      setActiveSubTab('fleet'); // 強制彈回數據圖表分頁
      return;
    }
  }, [userRole, setActiveSubTab]);

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center border border-red-500/20 bg-red-500/5 rounded-xl font-mono text-xs text-red-500 uppercase">
        🚫 權限不足，此分頁僅限最高管理員！
      </div>
    );
  }

  return (
    <motion.div
      key="members"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50 mb-6">成員管理</h3>
      <div className="mb-4">
        <CyberInput 
          placeholder="搜尋姓名、電話或電郵 / SEARCH MEMBERS..." 
          value={memberSearch} 
          onChange={e => {
            setMemberSearch(e.target.value);
            setMemberPage(1);
          }}
        />
      </div>
      {pagedProfiles.map(profile => {
        const userVehicles = vehicles.filter(v => v.userId === profile.id);
        const blurClass = privacyMode ? "blur-md select-none transition-all duration-300 hover:blur-none" : "";
        return (
          <CyberCard key={profile.id} className="bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setSelectedMember(profile)}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Users className="text-white/20" size={20} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span className={blurClass}>
                      {profile.displayName && profile.displayName !== '匿名用戶' ? profile.displayName : (profile.phoneNumber || '匿名用戶')}
                    </span>
                    {profile.role !== 'member' && (
                      <span className="text-[8px] px-1 bg-cyber-green/20 text-cyber-green border border-cyber-green/30 rounded font-mono uppercase">
                        {profile.role}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-white/30 uppercase truncate max-w-[150px]">
                    <span className={blurClass}>
                      {profile.email || profile.phoneNumber}
                    </span> • 加入於 {profile.joinedAt ? format(profile.joinedAt.toDate(), 'yyyy-MM-dd') : '未知'}
                  </div>
                  {editingUserId === profile.id ? (
                    <div className="mt-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingPlateValue}
                        onChange={(e) => setEditingPlateValue(e.target.value)}
                        onBlur={() => handleSavePlate(profile.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSavePlate(profile.id);
                          } else if (e.key === 'Escape') {
                            setEditingUserId(null);
                          }
                        }}
                        autoFocus
                        disabled={isPlateSaving}
                        className="bg-black border border-cyber-green/50 rounded px-1.5 py-0.5 text-[10px] font-mono text-cyber-green w-24 outline-none uppercase"
                      />
                      {isPlateSaving && <span className="text-[8px] font-mono text-cyber-green animate-pulse">SAVING...</span>}
                    </div>
                  ) : (
                    <div 
                      className="flex gap-2 mt-1 flex-wrap cursor-pointer items-center" 
                      title={isAdmin ? "雙擊修改車牌 / Double-click to edit plate" : ""}
                      onDoubleClick={(e) => {
                        if (isAdmin) {
                          const currentPlate = userVehicles[0]?.plate || profile.plate || '';
                          startEditPlate(profile.id, currentPlate, e);
                        }
                      }}
                    >
                      {userVehicles.length > 0 ? (
                        userVehicles.map(v => (
                          <span 
                            key={v.id} 
                            className={`text-[8px] px-1.5 py-0.5 bg-cyber-green/10 hover:bg-cyber-green/20 text-cyber-green border border-cyber-green/20 rounded font-mono select-none transition-colors ${blurClass}`}
                          >
                            {v.plate}
                          </span>
                        ))
                      ) : (
                        <span className={`text-[8px] px-1.5 py-0.5 bg-white/5 text-white/30 border border-white/10 rounded font-mono select-none ${blurClass}`}>
                          {profile.plate || '尚未配對車牌'}
                        </span>
                      )}
                      {isAdmin && (
                        <span className="text-[8px] text-white/20 self-center font-mono hover:text-cyber-green transition-colors pl-1">
                          (雙擊修改)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <select 
                  value={profile.role}
                  disabled={!isAdmin}
                  onChange={(e) => onUpdateMemberRole(profile.id, e.target.value)}
                  className={`bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono text-cyber-green outline-none focus:border-cyber-green/50 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="member" className="bg-[#121212]">會員</option>
                  <option value="sub-admin" className="bg-[#121212]">次管理員</option>
                  <option value="admin" className="bg-[#121212]">管理員</option>
                </select>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMember(profile.id);
                    }}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/50 rounded-lg text-red-500 transition-colors text-[9px] font-bold font-mono uppercase flex items-center gap-1"
                    title="停權 / 踢出車會"
                  >
                    <span>踢出</span>
                  </button>
                )}
              </div>
            </div>
          </CyberCard>
        );
      })}

      {sortedProfiles.length > MEMBERS_PER_PAGE && (
        <div className="flex justify-between items-center pt-4">
          <button 
            onClick={() => {
              setMemberPage(p => Math.max(1, typeof p === 'function' ? p(1) : p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={memberPage === 1}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 disabled:opacity-30"
          >
            PREV
          </button>
          <span className="text-[10px] font-mono text-white/20">PAGE {memberPage} / {Math.ceil(sortedProfiles.length / MEMBERS_PER_PAGE)}</span>
          <button 
            onClick={() => {
              setMemberPage(p => Math.min(Math.ceil(sortedProfiles.length / MEMBERS_PER_PAGE), typeof p === 'function' ? p(1) : p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={memberPage === Math.ceil(sortedProfiles.length / MEMBERS_PER_PAGE)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 disabled:opacity-30"
          >
            NEXT
          </button>
        </div>
      )}
    </motion.div>
  );
};
