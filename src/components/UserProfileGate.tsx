import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, ArrowRight, Car, Shield, LogOut } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';
import { CyberCard } from './ui/CyberCard';
import { logout } from '../lib/firebase';

interface UserProfileGateProps {
  user: any;
  userProfile: any;
  profileLoading: boolean;
  onUpdateProfile: (data: any) => Promise<void>;
  children: React.ReactNode;
}

export const UserProfileGate: React.FC<UserProfileGateProps> = ({ 
  user, 
  userProfile, 
  profileLoading, 
  onUpdateProfile, 
  children 
}) => {
  const formatPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      return cleaned;
    }
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)}`;
  };

  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);

  // If still fetching profile, show a subtle loading state
  if (profileLoading) {
    return (
      <div className="fixed inset-0 bg-cyber-bg z-[200] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyber-green/20 border-t-cyber-green rounded-full animate-spin" />
          <p className="text-[10px] font-mono text-cyber-green/60 uppercase tracking-widest">Verifying Identity...</p>
        </div>
      </div>
    );
  }

  // Check if we are currently logged in
  if (!user) return <>{children}</>;

  // User is logged in. Now evaluate status/inputs.
  const isPending = userProfile?.status === 'pending_verification';
  
  // If user profile does not have plate or phone number, they need to fill the verification form
  const hasDetails = (userProfile?.plate || userProfile?.licensePlate) && (userProfile?.phoneNumber || userProfile?.mobile);
  const needsForm = isPending && !hasDetails;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 8) {
      alert('請輸入有效之 8 位數字手提電話號碼');
      return;
    }
    if (!plate.trim()) {
      alert('請填寫車牌號碼');
      return;
    }
    
    setSaving(true);
    try {
      await onUpdateProfile({
        phoneNumber: cleanPhone,
        mobile: cleanPhone,
        plate: plate.toUpperCase().trim(),
        licensePlate: plate.toUpperCase().trim(),
        status: 'pending_verification'
      });
      alert('資料已成功提交，請等待管理團隊審批 / DETAILS SUBMITTED');
    } catch (error) {
      console.error("Failed to submit profile registration details:", error);
      alert('提交失敗，請重試: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Stage A: Logged in but registration fields are empty (Form required)
  if (needsForm) {
    return (
      <div className="fixed inset-0 z-[100] bg-cyber-bg flex items-center justify-center p-6 overflow-y-auto">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-25">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyber-green/5 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm my-auto"
        >
          <CyberCard title="實名車主驗證" className="relative border-cyber-green/30">
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-cyber-green/5 border border-cyber-green/20 flex items-center justify-center mb-2">
                  <Shield className="text-cyber-green" size={32} />
                </div>
                <h3 className="text-xl font-mono font-bold uppercase tracking-wider text-white">完善車友資訊</h3>
                <p className="text-[10px] text-white/50 uppercase tracking-widest leading-relaxed">
                  本系統為 Smart #5 實名車主專屬平台。<br />
                  請填寫以下資訊，這將提交至管理端進行人工認證。
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Odometer / License Plate Inputs */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-mono text-cyber-green/70 uppercase tracking-widest">🚗 車牌號碼</label>
                  <div className="relative group">
                    <div className="relative flex items-center gap-3 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl group-focus-within:border-cyber-green/50 transition-all">
                      <Car size={18} className="text-cyber-green/50" />
                      <input
                        type="text"
                        required
                        placeholder="例如: XX 8888"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder:text-white/20 uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-mono text-cyber-green/70 uppercase tracking-widest">📱 手提電話</label>
                  <div className="relative group">
                    <div className="relative flex items-center gap-3 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl group-focus-within:border-cyber-green/50 transition-all">
                      <Phone size={18} className="text-cyber-green/50" />
                      <input
                        type="tel"
                        inputMode="tel"
                        required
                        placeholder="例如: 9876 5432"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder:text-white/20"
                      />
                    </div>
                  </div>
                </div>

                <CyberButton 
                  type="submit" 
                  className="w-full py-4 h-auto text-sm font-bold tracking-wider" 
                  disabled={saving || !plate.trim() || phone.replace(/\s/g, '').length < 8}
                  glow
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      正在提交...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      提交審核 <ArrowRight size={18} />
                    </span>
                  )}
                </CyberButton>
              </form>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/70 tracking-widest font-mono uppercase transition-colors"
                >
                  <LogOut size={12} /> 返回登出
                </button>
              </div>
            </div>
          </CyberCard>
        </motion.div>
      </div>
    );
  }

  // Stage B: Logged in and has details but status === 'pending_verification' (Waiting Screen)
  if (isPending) {
    const displayPlate = userProfile?.plate || userProfile?.licensePlate || '審核中';
    return (
      <div className="fixed inset-0 z-[100] bg-cyber-bg flex items-center justify-center p-6 text-center">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-25">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <CyberCard title="🔐 實名認證處理中" className="border-amber-500/20">
            <div className="space-y-6 py-6 px-2">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-amber-500/5 border border-amber-500/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <Shield className="text-amber-500" size={36} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white tracking-wide">車主身份核實審批</h3>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 text-left font-mono text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-white/40">申請人帳戶:</span>
                    <span className="text-white">{userProfile?.email || user.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-white/40">車主車牌:</span>
                    <span className="text-amber-400 font-bold">{displayPlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">手提電話:</span>
                    <span className="text-white">{userProfile?.phoneNumber || userProfile?.mobile}</span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-300 leading-relaxed text-justify px-1">
                  🔒 實名認證處理中：本系統為 Smart #5 車主專屬平台。管理團隊正在核實您的車主身份與車牌（{displayPlate}）。核實成功後將自動為您解鎖，感謝您的支持！
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                <p className="text-[10px] text-white/30 tracking-widest uppercase font-mono">
                  如有疑問，請於 Slack / Whatsapp 車主群內聯絡管理員。
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-all border border-white/10 font-bold"
                  >
                    <LogOut size={14} /> 安全登出
                  </button>
                </div>
              </div>
            </div>
          </CyberCard>
        </motion.div>
      </div>
    );
  }

  // Approved! Render kids
  return <>{children}</>;
};
