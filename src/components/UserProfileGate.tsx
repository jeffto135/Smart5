import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, ArrowRight } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';
import { CyberCard } from './ui/CyberCard';

interface UserProfileGateProps {
  user: any;
  userProfile: any;
  profileLoading: boolean;
  onUpdateProfile: (data: { phoneNumber: string }) => Promise<void>;
  children: React.ReactNode;
}

export const UserProfileGate: React.FC<UserProfileGateProps> = ({ user, userProfile, profileLoading, onUpdateProfile, children }) => {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // If still fetching profile, show a subtle loading state
  if (profileLoading) {
    return (
      <div className="fixed inset-0 bg-cyber-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyber-green/20 border-t-cyber-green rounded-full animate-spin" />
          <p className="text-[10px] font-mono text-cyber-green/60 uppercase tracking-widest">Verifying Identity...</p>
        </div>
      </div>
    );
  }

  // Only show gate if user is logged in BUT profile has no phone number
  const needsPhone = user && (!userProfile || !userProfile.phoneNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8) return;
    
    setSaving(true);
    try {
      await onUpdateProfile({ phoneNumber: phone });
      alert('帳戶已啟動 / ACCOUNT ACTIVATED');
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!needsPhone) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-cyber-bg flex items-center justify-center p-6">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyber-green/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <CyberCard title="帳戶啟動" className="relative">
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-cyber-green/5 border border-cyber-green/20 flex items-center justify-center mb-2">
                <Phone className="text-cyber-green" size={32} />
              </div>
              <h3 className="text-xl font-mono font-bold uppercase">請輸入手機號碼</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                我們需要您的驗證資訊以完成帳戶設置。<br />
                這將用於事故通報及紀錄追蹤。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-cyber-green/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                <div className="relative flex items-center gap-3 px-4 py-4 bg-white/5 border border-white/10 rounded-xl group-focus-within:border-cyber-green/50 transition-all">
                  <Phone size={18} className="text-cyber-green/50" />
                  <input
                    type="tel"
                    required
                    placeholder="手機號碼 (例如: 98765432)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder:text-white/20"
                  />
                </div>
              </div>

              <CyberButton 
                type="submit" 
                className="w-full py-4 h-auto text-sm" 
                disabled={saving || phone.length < 8}
                glow
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    正在儲存...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    完成設置 <ArrowRight size={18} />
                  </span>
                )}
              </CyberButton>
            </form>

            <p className="text-[8px] text-center text-white/20 font-mono uppercase tracking-[0.2em]">
              SECURE BIOMETRIC ENCRYPTION ACTIVE
            </p>
          </div>
        </CyberCard>
      </motion.div>
    </div>
  );
};
