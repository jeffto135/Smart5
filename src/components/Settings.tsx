import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Settings, Save, ArrowLeft, Car, ShieldCheck, Mail, ChevronRight, X, Trash2, Trophy, Phone, UserX, ExternalLink, BookOpen, MapPin, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CyberInput } from './ui/CyberInput';
import { CyberButton } from './ui/CyberButton';
import { CyberCard } from './ui/CyberCard';
import { Vehicle, UserProfile, ParkingLot } from '../types';
import { HK_EV_MODELS } from '../constants';
import { DisclaimerModal } from './DisclaimerModal';
import { UserAgreementModal } from './UserAgreementModal';
import { AdminConductModal } from './AdminConductModal';
import { ParkingLeafletMap } from './ParkingLeafletMap';
import { MembershipCard } from './MembershipCard';

interface SettingsPageProps {
  user: User | null;
  userProfile: UserProfile | null;
  vehicles: Vehicle[];
  parkingLots: ParkingLot[];
  onUpdate: (id: string, data: Partial<Vehicle>) => Promise<void>;
  onAdd: (name: string) => Promise<string | undefined>;
  onDelete: (id: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onLogout: () => void;
  onClose: () => void;
  onAddChargingFeedback?: (lotId: string, realKw: number, rating: number, note: string, testedGun?: string) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, userProfile, vehicles, parkingLots, onUpdate, onAdd, onDelete, onDeleteAccount, isAdmin, onOpenAdmin, onLogout, onClose, onAddChargingFeedback }) => {
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAccDeleteConfirm, setShowAccDeleteConfirm] = useState(false);
  const [isDeletingAcc, setIsDeletingAcc] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showUserAgreementModal, setShowUserAgreementModal] = useState(false);
  const [showAdminConductModal, setShowAdminConductModal] = useState(false);
  const [showParkingMap, setShowParkingMap] = useState(false);
  
  // Modal states for form
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState(0);
  const [color, setColor] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [trim, setTrim] = useState('');

  const [saving, setSaving] = useState(false);

  // Auto pre-fill model trim option according to smart official HK naming conventions
  useEffect(() => {
    if (brand === 'smart' && model) {
      if (model.includes('BRABUS')) {
        setTrim('BRABUS性能版');
      } else if (model.includes('Summit')) {
        setTrim('Summit Edition 山野奇旅版');
      } else if (model.includes('Premium+')) {
        setTrim('Premium+ 豪華經典版');
      } else if (model.includes('Premium')) {
        setTrim('Premium 豪華版');
      } else if (model.includes('Pro+')) {
        setTrim('Pro+ 尊豪版');
      } else if (model.includes('Pro')) {
        setTrim('Pro 智雅版');
      }
    }
  }, [model, brand]);

  const resetForm = () => {
    setEditingVehicle(null);
    setIsAdding(false);
    setName('');
    setPlate('');
    setBrand('');
    setModel('');
    setCapacity(0);
    setColor('');
    setCustomColor('');
    setTrim('');
  };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setIsAdding(false);
    setName(v.name || '');
    setPlate(v.plate || '');
    setBrand(v.brand || '');
    setModel(v.model || '');
    setCapacity(v.batteryCapacity || 0);
    
    // Check if the current color is one of the standard colors
    const vehicleColor = v.color || '';
    if (vehicleColor === '') {
      setColor('');
      setCustomColor('');
    } else {
      let standardColors: string[] = [];
      const m = v.model || '';
      if (m.includes('#1')) {
        standardColors = ['粒子白', '曜石黑', '控墨灰', '時光綠', '能量黃', '亮銅金', '沉靜藍', 'BRABUS 運動紅', 'BRABUS 啞光灰'];
      } else if (m.includes('#3')) {
        standardColors = ['粒子白', '曜石黑', '光速銀', '控墨灰', '宇宙藍', '星塵紅', '鐳射蟬綠', 'BRABUS 鋼鐵灰'];
      } else if (m.includes('#5')) {
        standardColors = ['沉橡綠', '秘境綠', '流沙金', '太空燕麥', '粒子白', '曜石黑', '琥珀棕', '烈焰紅'];
      } else {
        standardColors = ['沉橡綠', '粒子白', '曜石黑', '琥珀棕', '流沙金', '太空燕麥', '鐳射蟬綠', '控墨灰', '烈焰紅'];
      }
      
      if (standardColors.includes(vehicleColor)) {
        setColor(vehicleColor);
        setCustomColor('');
      } else {
        setColor('其他');
        setCustomColor(vehicleColor);
      }
    }
    
    setTrim(v.trim || '');
  };

  const openAdd = () => {
    setIsAdding(true);
    setEditingVehicle(null);
    setName('');
    setPlate('');
    setBrand('');
    setModel('');
    setCapacity(0);
    setColor('');
    setCustomColor('');
    setTrim('');
  };

  const handleSave = async () => {
    if (!name || !plate || !brand || !model || !capacity) {
      alert('請填寫所有欄位 / PLEASE FILL ALL FIELDS');
      return;
    }
    setSaving(true);
    const data = {
      name,
      plate,
      brand,
      model,
      batteryCapacity: Number(capacity),
      color: color === '其他' ? customColor : color,
      trim
    };

    try {
      if (isAdding) {
        await onAdd(data as any);
        setSaving(false);
        resetForm();
        onClose();
      } else if (editingVehicle) {
        await onUpdate(editingVehicle.id, data);
        setSaving(false);
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error("Save error:", error);
      alert('儲存失敗，請檢查網路連線');
      setSaving(false);
    }
  };

  const selectedBrandData = HK_EV_MODELS.find(b => b.brand === brand);

  const getSmartColors = () => {
    let colors = [];
    if (model.includes('#1')) {
      colors = [
        { value: '粒子白', label: '粒子白 (Chroma White)' },
        { value: '曜石黑', label: '曜石黑 (Obsidian Black)' },
        { value: '控墨灰', label: '控墨灰 (Laser Grey)' },
        { value: '時光綠', label: '時光綠 (Grid Green)' },
        { value: '能量黃', label: '能量黃 (Digital Yellow)' },
        { value: '亮銅金', label: '亮銅金 (Clear Jaguar Brown)' },
        { value: '沉靜藍', label: '沉靜藍 (Silent Blue)' },
        ...(model.includes('BRABUS') ? [
          { value: 'BRABUS 運動紅', label: 'BRABUS 運動紅 (BRABUS Sport Red)' },
          { value: 'BRABUS 啞光灰', label: 'BRABUS 啞光灰 (BRABUS Matte Grey)' }
        ] : [])
      ];
    } else if (model.includes('#3')) {
      colors = [
        { value: '粒子白', label: '粒子白 (Chroma White)' },
        { value: '曜石黑', label: '曜石黑 (Obsidian Black)' },
        { value: '光速銀', label: '光速銀 (Speed Silver)' },
        { value: '控墨灰', label: '控墨灰 (Matter Grey)' },
        { value: '宇宙藍', label: '宇宙藍 (Photon Blue)' },
        { value: '星塵紅', label: '星塵紅 (Stardust Red)' },
        { value: '鐳射蟬綠', label: '鐳射蟬綠 (Acid Metallic Green)' },
        ...(model.includes('BRABUS') ? [
          { value: 'BRABUS 鋼鐵灰', label: 'BRABUS 鋼鐵灰 (BRABUS Matte Gray)' }
        ] : [])
      ];
    } else if (model.includes('#5')) {
      colors = [
        { value: '沉橡綠', label: '沉橡綠 (Forest Green)' },
        { value: '秘境綠', label: '秘境綠 (Secret Green)' },
        { value: '流沙金', label: '流沙金 (Sahara Desert Gold)' },
        { value: '太空燕麥', label: '太空燕麥 (Cosmic Oatmeal)' },
        { value: '粒子白', label: '粒子白 (Chroma White)' },
        { value: '曜石黑', label: '曜石黑 (Obsidian Black)' },
        { value: '琥珀棕', label: '琥珀棕 (Amber Brown)' },
        ...(model.includes('BRABUS') ? [
          { value: '烈焰紅', label: '烈焰紅 (BRABUS Flame Red)' }
        ] : [])
      ];
    } else {
      colors = [
        { value: '沉橡綠', label: '沉橡綠 (Forest Green)' },
        { value: '粒子白', label: '粒子白 (Chroma White)' },
        { value: '曜石黑', label: '曜石黑 (Obsidian Black)' },
        { value: '琥珀棕', label: '琥珀棕 (Amber Brown)' },
        { value: '流沙金', label: '流沙金 (Sahara Gold)' },
        { value: '太空燕麥', label: '太空燕麥 (Cosmic Oatmeal)' },
        { value: '鐳射蟬綠', label: '鐳射蟬綠 (Laser Green)' },
        { value: '控墨灰', label: '控墨灰 (Laser Grey)' },
        { value: '烈焰紅', label: '烈焰紅 (Flame Red)' }
      ];
    }
    return [...colors, { value: '其他', label: '其他 (自行輸入 / Custom)' }];
  };

  const getSmartTrims = () => {
    if (model.includes('#1') || model.includes('#3')) {
      return [
        { value: 'Pro+ 型動版', label: 'Pro+ 型動版 (Pro+)' },
        { value: 'Premium 豪華版', label: 'Premium 豪華版 (Premium)' },
        { value: 'BRABUS性能版', label: 'BRABUS 性能專屬版 (BRABUS)' }
      ];
    }
    if (model.includes('#5')) {
      return [
        { value: 'Pro 智雅版', label: 'Pro 智雅版 (Pro)' },
        { value: 'Pro+ 尊豪版', label: 'Pro+ 尊豪版 (Pro+)' },
        { value: 'Premium+ 豪華經典版', label: 'Premium+ 豪華經典版 (Premium+)' },
        { value: 'Summit Edition 山野奇旅版', label: 'Summit Edition 山野奇旅版 (Summit)' },
        { value: 'BRABUS性能版', label: 'BRABUS 性能版 (BRABUS)' }
      ];
    }
    return [
      { value: 'BRABUS性能版', label: 'BRABUS 性能版 (BRABUS)' },
      { value: 'Summit Edition 山野奇旅版', label: 'Summit Edition' },
      { value: 'Premium+ 豪華經典版', label: 'Premium+' },
      { value: 'Premium 豪華版', label: 'Premium' },
      { value: 'Pro+ 尊豪版', label: 'Pro+' },
      { value: 'Pro 智雅版', label: 'Pro' }
    ];
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-mono font-bold uppercase tracking-tight">
          更多資訊
        </h2>
        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-mono font-bold text-red-500/50 hover:text-red-500 uppercase tracking-[0.1em] transition-all"
          >
            登出
          </button>
          {user?.metadata.lastSignInTime && (
            <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest text-right">
              LAST LOGIN: {new Date(user.metadata.lastSignInTime).toLocaleDateString('zh-HK', { month: '2-digit', day: '2-digit' })} {new Date(user.metadata.lastSignInTime).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 0: Dynamic Membership Card */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-cyber-green rounded-full shadow-[0_0_8px_rgba(204,255,0,0.5)]"></div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-white/80">電子會員卡 / MEMBER CARD</h3>
          </div>
          <MembershipCard 
            user={user}
            userProfile={userProfile}
            vehicles={vehicles}
          />
        </section>

        {/* Section 1: My Account */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-cyber-green rounded-full shadow-[0_0_8px_rgba(204,255,0,0.5)]"></div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-white/80">我的帳戶</h3>
          </div>
          
          <button 
            onClick={() => setShowAccountDetails(true)}
            className="w-full text-left transition-transform active:scale-[0.98]"
          >
            <CyberCard className="bg-white/[0.02] hover:border-cyber-green/30 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ShieldCheck className="text-cyber-green" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div className="text-white font-bold">{user?.displayName || '匿名用戶'}</div>
                      <div className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                        userProfile?.role === 'admin' ? 'text-cyber-green border-cyber-green/30 bg-cyber-green/5' :
                        userProfile?.role === 'sub-admin' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' :
                        'text-white/40 border-white/10 bg-white/5'
                      }`}>
                        {userProfile?.role === 'admin' ? '管理員' : 
                         userProfile?.role === 'sub-admin' ? '次管理員' : '會員'}
                      </div>
                    </div>
                    <div className="text-[10px] text-white/40 font-mono flex items-center gap-1 mt-0.5">
                      <Mail size={10} />
                      {user?.email}
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-white/20 group-hover:text-cyber-green transition-colors" size={20} />
              </div>
            </CyberCard>
          </button>
        </section>

        {/* Admin Section (Hidden for normal users) */}
        {isAdmin && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1 h-4 bg-cyber-green rounded-full shadow-[0_0_8px_rgba(204,255,0,0.5)]"></div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-cyber-green">
                {userProfile?.role === 'admin' ? '車隊管理制度' : '管理員後台'}
              </h3>
            </div>
            
            <button 
              onClick={onOpenAdmin}
              className="w-full text-left transition-transform active:scale-[0.98]"
            >
              <CyberCard className="bg-cyber-green/[0.03] border-cyber-green/30 hover:bg-cyber-green/10 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/40 flex items-center justify-center">
                      <Trophy className="text-cyber-green" size={24} />
                    </div>
                    <div>
                      <div className="text-white font-bold">
                        {userProfile?.role === 'admin' ? '進入主管理面板' : '進入次管理面板'}
                      </div>
                      <div className="text-[10px] text-cyber-green/60 font-mono uppercase tracking-widest mt-0.5">
                        {userProfile?.role === 'admin' ? 'SYSTEM ADMIN ACCESS' : 'SUB-ADMIN ACCESS'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-cyber-green/40 group-hover:text-cyber-green transition-colors" size={20} />
                </div>
              </CyberCard>
            </button>
          </section>
        )}

        {/* Section 2: Useful Resources */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-cyber-green rounded-full shadow-[0_0_8px_rgba(204,255,0,0.5)]"></div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-white/80">實用資訊</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => setShowParkingMap(true)} 
              className="group block w-full text-left"
            >
              <CyberCard className="bg-cyber-green/[0.05] border-cyber-green/30 hover:border-cyber-green/50 transition-colors py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-green/20 border border-cyber-green/30 flex items-center justify-center">
                      <MapPin className="text-cyber-green" size={20} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">停車場難度地圖</span>
                      <span className="text-[10px] text-cyber-green/60 font-mono uppercase tracking-widest">Parking Difficulty Map</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-cyber-green transition-transform group-hover:translate-x-1" />
                </div>
              </CyberCard>
            </button>

            <a 
              href="https://effortless.com.hk/smart5/smart5-%E6%96%B0%E7%95%8C%E5%81%9C%E8%BB%8A%E5%A0%B4/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block"
            >
              <CyberCard className="bg-white/[0.02] hover:border-cyber-green/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                      <MapPin className="text-cyber-green" size={16} />
                    </div>
                    <span className="text-sm font-bold text-white/90">新界停車場</span>
                  </div>
                  <ExternalLink size={14} className="text-white/20 group-hover:text-cyber-green transition-colors" />
                </div>
              </CyberCard>
            </a>

            <a 
              href="https://effortless.com.hk/smart5/smart5-%E4%B9%9D%E9%BE%8D%E5%81%9C%E8%BB%8A%E5%A0%B4/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block"
            >
              <CyberCard className="bg-white/[0.02] hover:border-cyber-green/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                      <MapPin className="text-cyber-green" size={16} />
                    </div>
                    <span className="text-sm font-bold text-white/90">九龍停車場</span>
                  </div>
                  <ExternalLink size={14} className="text-white/20 group-hover:text-cyber-green transition-colors" />
                </div>
              </CyberCard>
            </a>

            <a 
              href="https://effortless.com.hk/smart5/smart5-%E6%B8%AF%E5%B3%B6%E5%81%9C%E8%BB%8A%E5%A0%B4/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block"
            >
              <CyberCard className="bg-white/[0.02] hover:border-cyber-green/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                      <MapPin className="text-cyber-green" size={16} />
                    </div>
                    <span className="text-sm font-bold text-white/90">港島停車場</span>
                  </div>
                  <ExternalLink size={14} className="text-white/20 group-hover:text-cyber-green transition-colors" />
                </div>
              </CyberCard>
            </a>

            <a 
              href="https://effortless.com.hk/wp-content/uploads/2026/02/%EF%BC%8Csmart_user_manual_5_20250908_tc_260207_094711.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block"
            >
              <CyberCard className="bg-cyber-green/[0.02] border-cyber-green/20 hover:border-cyber-green/40 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyber-green/20 border border-cyber-green/30 flex items-center justify-center">
                      <BookOpen className="text-cyber-green" size={16} />
                    </div>
                    <span className="text-sm font-bold text-cyber-green">User Manual</span>
                  </div>
                  <ExternalLink size={14} className="text-cyber-green/40 group-hover:text-cyber-green transition-colors" />
                </div>
              </CyberCard>
            </a>
          </div>
        </section>

        {/* Section 3: Vehicle Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-cyber-green rounded-full shadow-[0_0_8px_rgba(204,255,0,0.5)]"></div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-white/80">車輛管理</h3>
            </div>
            <button 
              onClick={openAdd}
              className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyber-green/60 hover:text-cyber-green transition-colors"
            >
              + 新增
            </button>
          </div>

          <div className="space-y-4">
            {vehicles.map(v => (
              <button 
                key={v.id}
                onClick={() => openEdit(v)}
                className="w-full text-left transition-transform active:scale-[0.98]"
              >
                <CyberCard className="hover:border-cyber-green/30 transition-colors group bg-white/[0.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 group-hover:text-cyber-green group-hover:border-cyber-green/30 transition-colors">
                        <Car size={24} />
                      </div>
                      <div>
                        <div className="text-white font-bold">{v.name || '未命名車輛'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/60 tracking-wider">
                            {v.plate || '無車牌'}
                          </span>
                          <span className="text-[10px] text-white/30 font-mono uppercase">
                            {v.brand} {v.model}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-white/20 group-hover:text-cyber-green transition-colors" size={20} />
                  </div>
                </CyberCard>
              </button>
            ))}
          </div>
        </section>

        {/* Section 4: Legal & Policies */}
        <section className="space-y-4 pb-12">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-cyber-green rounded-full shadow-[0_0_8px_rgba(204,255,0,0.5)]"></div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-white/80">政策與協議</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => setShowUserAgreementModal(true)}
              className="group block w-full text-left"
            >
              <CyberCard className="bg-white/[0.02] hover:border-cyber-green/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                      <FileText className="text-cyber-green" size={16} />
                    </div>
                    <span className="text-sm font-bold text-white/90">用戶協議</span>
                  </div>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-cyber-green transition-colors" />
                </div>
              </CyberCard>
            </button>

            <button 
              onClick={() => setShowDisclaimerModal(true)}
              className="group block w-full text-left"
            >
              <CyberCard className="bg-white/[0.02] hover:border-cyber-green/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                      <ShieldCheck className="text-cyber-green" size={16} />
                    </div>
                    <span className="text-sm font-bold text-white/90">版權及免責聲明</span>
                  </div>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-cyber-green transition-colors" />
                </div>
              </CyberCard>
            </button>

            <button 
              onClick={() => setShowAdminConductModal(true)}
              className="group block w-full text-left"
            >
              <CyberCard className="bg-white/[0.02] hover:border-cyber-green/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                      <ShieldCheck className="text-cyber-green" size={16} />
                    </div>
                    <span className="text-sm font-bold text-white/90">管理員專業操守與監督聲明</span>
                  </div>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-cyber-green transition-colors" />
                </div>
              </CyberCard>
            </button>
          </div>
        </section>
      </div>

      {/* Form Modal (Add or Edit) */}
      <AnimatePresence>
        {(editingVehicle || isAdding) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <CyberCard 
                title={isAdding ? "新增車輛資料" : "編輯車輛資料"} 
                className="border-cyber-green/30"
              >
                <div className="space-y-6 py-2">
                  <CyberInput
                    label="車輛暱稱"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如: My Smart"
                  />

                  <CyberInput
                    label="車牌號碼"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="例如：AA1234"
                    prefix="ID"
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">品牌</label>
                    <select 
                      value={brand}
                      onChange={(e) => {
                        setBrand(e.target.value);
                        setModel('');
                        setCapacity(0);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyber-green/50 transition-all font-mono appearance-none"
                    >
                      <option value="" className="bg-[#121212]">選擇品牌</option>
                      {HK_EV_MODELS.map(b => (
                        <option key={b.brand} value={b.brand} className="bg-[#121212]">{b.brand}</option>
                      ))}
                    </select>
                  </div>

                  {brand && (
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">型號</label>
                      <select 
                        value={model}
                        onChange={(e) => {
                          const val = e.target.value;
                          const m = selectedBrandData?.models.find(mod => mod.name === val);
                          setModel(val);
                          if (m) {
                            setCapacity(m.capacity);
                          }
                          
                          // Pre-fill model trim option according to smart official HK naming conventions
                          if (brand === 'smart') {
                            if (val.includes('BRABUS')) {
                              setTrim('BRABUS性能版');
                            } else if (val.includes('Summit')) {
                              setTrim('Summit Edition 山野奇旅版');
                            } else if (val.includes('Premium+')) {
                              setTrim('Premium+ 豪華經典版');
                            } else if (val.includes('Premium')) {
                              setTrim('Premium 豪華版');
                            } else if (val.includes('Pro+')) {
                              setTrim('Pro+ 尊豪版');
                            } else if (val.includes('Pro')) {
                              setTrim('Pro 智雅版');
                            }
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyber-green/50 transition-all font-mono appearance-none"
                      >
                        <option value="" className="bg-[#121212]">選擇型號</option>
                        {selectedBrandData?.models.map(m => (
                          <option key={m.name} value={m.name} className="bg-[#121212]">{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <CyberInput
                    label="電池容量 (kWh)"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    prefix="kWh"
                  />

                  {brand === 'smart' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase text-[#A3E635]/80 ml-1">車身顏色 / EXTERIOR COLOR</label>
                        <select
                          value={color}
                          onChange={(e) => {
                            const val = e.target.value;
                            setColor(val);
                            if (val !== '其他') {
                              setCustomColor('');
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyber-green/50 transition-all font-sans appearance-none"
                        >
                          <option value="" className="bg-[#121212]">選擇車色 (選填)</option>
                          {getSmartColors().map(col => (
                            <option key={col.value} value={col.value} className="bg-[#121212]">
                              {col.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {color === '其他' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="space-y-2">
                            <label className="text-xs font-mono uppercase text-[#A3E635]/80 ml-1">請手動輸入自訂顏色 / CUSTOM EXTERIOR COLOR</label>
                            <input
                              type="text"
                              value={customColor}
                              onChange={(e) => setCustomColor(e.target.value)}
                              placeholder="例如: 迷霧灰, 太空銀, Obsidian Grey..."
                              className="w-full bg-[#121212] border border-white/10 focus:border-[#A3E635]/50 focus:ring-1 focus:ring-[#A3E635]/30 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-all font-sans"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase text-[#A3E635]/80 ml-1">車型版本 / VEHICLE TRIM</label>
                        <select
                          value={trim}
                          onChange={(e) => setTrim(e.target.value)}
                          disabled={brand === 'smart'}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/55 focus:outline-none focus:border-cyber-green/50 transition-all font-sans appearance-none disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option value="" className="bg-[#121212]">選擇版本 (選填)</option>
                          {getSmartTrims().map(tr => (
                            <option key={tr.value} value={tr.value} className="bg-[#121212]">
                              {tr.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-white/30 font-mono ml-1 uppercase">車型版本已根據您選擇的型號自動配對填寫 / Auto-matched by model</p>
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap gap-3 pt-4">
                    <button
                      onClick={resetForm}
                      className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-mono uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                      取消
                    </button>
                    <CyberButton onClick={handleSave} className="flex-[2] flex items-center justify-center gap-2" disabled={saving}>
                      <Save size={18} />
                      {saving ? '儲存中...' : (isAdding ? '新增車輛' : '儲存變更')}
                    </CyberButton>
                    
                    {!isAdding && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-3 mt-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500/60 hover:text-red-500 hover:bg-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest"
                      >
                        <Trash2 size={14} />
                        刪除車輛
                      </button>
                    )}
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xs"
            >
              <CyberCard title="危險操作" className="border-cyber-green/50 shadow-[0_0_30px_rgba(204,255,0,0.2)]">
                <div className="py-4 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-cyber-green/30 bg-cyber-green/10 flex items-center justify-center text-cyber-green animate-pulse">
                      <Trash2 size={24} />
                    </div>
                    <p className="text-white text-lg font-bold">確定要刪除車輛嗎？</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">此操作無法復原，所有紀錄將會保留但不再連結。</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-mono uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                      取消
                    </button>
                    <CyberButton
                      onClick={async () => {
                        if (editingVehicle) {
                          try {
                            await onDelete(editingVehicle.id);
                            alert('刪除成功 / DELETED');
                          } catch (error) {
                            alert('刪除失敗');
                          } finally {
                            // Force immediate and delayed close sequence
                            setShowDeleteConfirm(false);
                            setTimeout(() => {
                              resetForm();
                            }, 100);
                          }
                        }
                      }}
                      className="flex-1"
                    >
                      確認刪除
                    </CyberButton>
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Account Details Modal */}
      <AnimatePresence>
        {showAccountDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccountDetails(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm"
            >
              <CyberCard 
                title="帳戶詳情" 
                className="border-cyber-green/30"
              >
                <div className="space-y-6 py-2">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center overflow-hidden">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ShieldCheck className="text-cyber-green" size={40} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white tracking-tight">{user?.displayName}</h4>
                      <p className="text-xs text-white/40 font-mono mt-1">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-[8px] uppercase tracking-widest text-white/30 font-mono mb-1">狀態</div>
                      <div className="text-[10px] text-cyber-green font-mono font-bold">已驗證</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-[8px] uppercase tracking-widest text-white/30 font-mono mb-1">登入方式</div>
                      <div className="text-[10px] text-white/80 font-mono">Google 登錄</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[8px] uppercase tracking-widest text-white/30 font-mono mb-1">最近登入時間</div>
                    <div className="text-[10px] text-white/80 font-mono">
                      {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString('zh-HK', { hour12: false }) : '未知'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    <div className="text-[8px] uppercase tracking-widest text-white/30 font-mono mb-1">唯一用戶識別碼</div>
                    <div className="text-[9px] text-white/40 font-mono break-all">{user?.uid}</div>
                  </div>

                  {userProfile?.phoneNumber && (
                    <div className="p-3 rounded-xl bg-cyber-green/[0.03] border border-cyber-green/20">
                      <div className="text-[8px] uppercase tracking-widest text-cyber-green/60 font-mono mb-1">手提號碼</div>
                      <div className="text-sm text-white font-mono font-bold">{userProfile.phoneNumber}</div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowAccountDetails(false);
                        setShowAccDeleteConfirm(true);
                      }}
                      className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500/60 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                    >
                      <UserX size={14} /> 刪除帳戶
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAccountDetails(false)}
                    className="w-full py-4 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-mono uppercase tracking-widest hover:bg-white/20 transition-colors"
                  >
                    關閉
                  </button>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Account Delete Confirmation Modal */}
      <AnimatePresence>
        {showAccDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingAcc && setShowAccDeleteConfirm(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm"
            >
              <CyberCard title="終極警告" className="border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                <div className="py-6 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center animate-pulse">
                      <UserX className="text-red-600" size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">徹底刪除您的帳戶？</h3>
                      <p className="text-[10px] text-red-500/60 font-mono uppercase tracking-widest leading-relaxed">
                        這將會永久抹除所有車輛數據、行車日誌及個人設定。<br />
                        此操作絕對無法復原。
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      disabled={isDeletingAcc}
                      onClick={async () => {
                        setIsDeletingAcc(true);
                        try {
                          await onDeleteAccount();
                          // Auth change will trigger redirect or logout
                        } catch (error) {
                          alert("刪除失敗。請嘗試重新登入後再次執行此操作。");
                        } finally {
                          setIsDeletingAcc(false);
                          setShowAccDeleteConfirm(false);
                        }
                      }}
                      className="w-full py-4 rounded-xl bg-red-600 text-white text-sm font-bold uppercase italic tracking-widest hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50"
                    >
                      {isDeletingAcc ? '系統抹除中...' : '確認永久刪除'}
                    </button>
                    <button
                      disabled={isDeletingAcc}
                      onClick={() => setShowAccDeleteConfirm(false)}
                      className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-mono uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DisclaimerModal 
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
      />

      <UserAgreementModal 
        isOpen={showUserAgreementModal}
        onClose={() => setShowUserAgreementModal(false)}
      />

      <AdminConductModal
        isOpen={showAdminConductModal}
        onClose={() => setShowAdminConductModal(false)}
      />

      {/* Parking Map Sub-page */}
      <AnimatePresence>
        {showParkingMap && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[120] bg-[#0a0a0a] flex flex-col"
          >
            <div className="px-4 py-3 sm:p-4 border-b border-white/5 flex items-center gap-4 bg-black/50 backdrop-blur-md shrink-0">
              <button 
                onClick={() => setShowParkingMap(false)}
                className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h3 className="text-base sm:text-lg font-mono font-bold text-white uppercase tracking-tight">停車場難度地圖</h3>
                <p className="text-[9px] sm:text-[10px] font-mono text-white/30 uppercase tracking-widest">Parking Difficulty Guide</p>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-3 sm:p-4">
              <ParkingLeafletMap parkingLots={parkingLots} onAddChargingFeedback={onAddChargingFeedback} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
