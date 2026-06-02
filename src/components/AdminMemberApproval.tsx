import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Check, X, Shield, ShieldAlert, Phone, Car, Mail } from 'lucide-react';
import { UserProfile, Vehicle } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

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
  onApprovePendingMember?: (userId: string) => Promise<void>;
  onRejectPendingMember?: (userId: string) => Promise<void>;
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
  onApprovePendingMember,
  onRejectPendingMember,
  format,
  privacyMode = false
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPlateValue, setEditingPlateValue] = useState<string>('');
  const [isPlateSaving, setIsPlateSaving] = useState(false);
  const [isActionPending, setIsActionPending] = useState<string | null>(null);

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

  // Approval actions
  const handleApprove = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActionPending(userId);
    try {
      if (onApprovePendingMember) {
        await onApprovePendingMember(userId);
      } else {
        await updateDoc(doc(db, 'userProfiles', userId), {
          status: 'approved',
          updatedAt: serverTimestamp()
        });
      }
      alert('已成功批准該成員實名認證 / APPROVED');
    } catch (err: any) {
      alert('審批失敗: ' + err.message);
    } finally {
      setIsActionPending(null);
    }
  };

  const handleReject = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('確定要拒絕並刪除該名申請成員嗎？此操作將清除其文檔與授權。')) return;
    setIsActionPending(userId);
    try {
      if (onRejectPendingMember) {
        await onRejectPendingMember(userId);
      } else {
        await deleteDoc(doc(db, 'userProfiles', userId));
      }
      alert('已成功拒絕並清除該成員申請 / REJECTED');
    } catch (err: any) {
      alert('拒絕操作失敗: ' + err.message);
    } finally {
      setIsActionPending(null);
    }
  };

  // 🟢 雙重防線：若明確「不是管理員或次管理員」嘗試加載此敏感組件，直接安全阻斷並強制跳轉
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'subAdmin') {
      alert("權限不足：此功能僅限管理群組使用！\nACCESS DENIED. THIS MODULE IS EXCLUSIVE TO WORKGROUP ADMINISTRATORS.");
      setActiveSubTab('fleet'); // 強制彈回數據圖表分頁
      return;
    }
  }, [userRole, setActiveSubTab]);

  if (userRole !== 'admin' && userRole !== 'subAdmin') {
    return (
      <div className="p-6 text-center border border-red-500/20 bg-red-500/5 rounded-xl font-mono text-xs text-red-500 uppercase">
        🚫 權限不足，此分頁僅限管理群組！
      </div>
    );
  }

  // Filter pending profiles (those awaiting verification)
  const pendingProfiles = sortedProfiles.filter(p => p.status === 'pending_verification');
  
  // Clean approved profiles for standard member management
  const approvedProfiles = sortedProfiles.filter(p => p.status !== 'pending_verification');
  const approvedPagedProfiles = pagedProfiles.filter(p => p.status !== 'pending_verification');

  return (
    <motion.div
      key="members"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 待審核實名認證申請 */}
      <div className="space-y-3">
        <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
          <ShieldAlert size={16} /> 🏎️ 待審核實名申請 ({pendingProfiles.length})
        </h3>
        
        {pendingProfiles.length === 0 ? (
          <div className="p-6 text-center bg-white/[0.01] border border-white/5 rounded-2xl">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest">目前沒有待審核的實名申請</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingProfiles.map(profile => {
              const blurClass = privacyMode ? "blur-md select-none hover:blur-none transition-all duration-300" : "";
              const displayPlate = profile.plate || profile.licensePlate || '未填寫';
              const displayPhone = profile.phoneNumber || profile.mobile || '未填寫';
              return (
                <CyberCard key={profile.id} className="border-amber-500/20 bg-amber-500/[0.01]">
                  <div className="space-y-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                          {profile.photoURL ? (
                            <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Users className="text-white/20" size={18} />
                          )}
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold text-white uppercase ${blurClass}`}>
                            {profile.displayName || '未填寫暱稱'}
                          </h4>
                          <p className={`text-[10px] font-mono text-white/40 flex items-center gap-1 mt-0.5 ${blurClass}`}>
                            <Mail size={10} /> {profile.email}
                          </p>
                        </div>
                      </div>
                      
                      <span className="text-[8px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded uppercase">
                        PENDING
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-white/[0.02] border border-white/5 rounded-xl font-mono text-[11px] leading-relaxed">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white/30 text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <Car size={10} /> 車車牌號:
                        </span>
                        <span className={`text-[#A3E635] font-bold ${blurClass}`}>{displayPlate}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white/30 text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <Phone size={10} /> 手提電話:
                        </span>
                        <span className={`text-white font-medium ${blurClass}`}>{displayPhone}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-white/5">
                      <button
                        onClick={(e) => handleApprove(profile.id, e)}
                        disabled={isActionPending !== null}
                        className="flex-1 py-2 bg-cyber-green text-black hover:bg-[#bbf055] rounded-lg text-xs font-bold font-mono uppercase flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_10px_rgba(163,230,53,0.15)]"
                      >
                        <Check size={14} /> 批准實名
                      </button>
                      <button
                        onClick={(e) => handleReject(profile.id, e)}
                        disabled={isActionPending !== null}
                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg text-xs font-bold font-mono uppercase flex items-center gap-1 transition-colors"
                      >
                        <X size={14} /> 拒絕
                      </button>
                    </div>
                  </div>
                </CyberCard>
              );
            })}
          </div>
        )}
      </div>

      <hr className="border-white/5 my-6" />

      {/* 已核准成員管理 */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
          <Shield size={16} /> 👥 已核准成員管理 ({approvedProfiles.length})
        </h3>
        
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

        {approvedPagedProfiles.length === 0 ? (
          <div className="p-6 text-center bg-white/[0.01] border border-white/5 rounded-2xl">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest">沒有核符合條件的成員</p>
          </div>
        ) : (
          approvedPagedProfiles.map(profile => {
            const userVehicles = vehicles.filter(v => v.userId === profile.id);
            const blurClass = privacyMode ? "blur-md select-none transition-all duration-300 hover:blur-none" : "";
            const displayPlate = profile.plate || (userVehicles.length > 0 ? userVehicles.map(v => v.plate).join(', ') : '') || '未填寫';
            const displayPhone = profile.mobile || profile.phoneNumber || '未填寫';

            if (userRole === 'subAdmin') {
              // subAdmin View: ONLY displayName, licensePlate (plate), and mobile (phone)
              return (
                <CyberCard key={profile.id} className="bg-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-default select-none">
                  <div className="flex justify-between items-center text-left py-1">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Users className="text-white/20" size={20} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span className={blurClass}>
                            {profile.displayName || '未填寫暱稱'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 font-mono text-[10px] text-white/50">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/30 text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                              <Phone size={10} /> 手提電話:
                            </span>
                            <span className={`text-white font-medium ${blurClass}`}>{displayPhone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/30 text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                              <Car size={10} /> 車車牌號:
                            </span>
                            <span className={`text-[#A3E635] font-bold ${blurClass}`}>{displayPlate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Read-Only defense label */}
                    <div className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-mono text-white/30 uppercase tracking-widest select-none">
                      🔒 唯讀鎖定 / READ ONLY
                    </div>
                  </div>
                </CyberCard>
              );
            }

            // admin View: Full info and editing capabilities
            return (
              <CyberCard key={profile.id} className="bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setSelectedMember(profile)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
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
          })
        )}

        {approvedProfiles.length > MEMBERS_PER_PAGE && (
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
            <span className="text-[10px] font-mono text-white/20">PAGE {memberPage} / {Math.ceil(approvedProfiles.length / MEMBERS_PER_PAGE)}</span>
            <button 
              onClick={() => {
                setMemberPage(p => Math.min(Math.ceil(approvedProfiles.length / MEMBERS_PER_PAGE), typeof p === 'function' ? p(1) : p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={memberPage === Math.ceil(approvedProfiles.length / MEMBERS_PER_PAGE)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 disabled:opacity-30"
            >
              NEXT
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
