import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, MapPin, Youtube, ExternalLink, Search, X, Save, AlertCircle } from 'lucide-react';
import { ParkingLot } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberButton } from './ui/CyberButton';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface AdminParkingManagerProps {
  parkingLots: ParkingLot[];
  addParkingLot: (data: Partial<ParkingLot>) => Promise<string | undefined>;
  updateParkingLot: (id: string, data: Partial<ParkingLot>) => Promise<void>;
  deleteParkingLot: (id: string) => Promise<void>;
}

export const AdminParkingManager: React.FC<AdminParkingManagerProps> = ({
  parkingLots,
  addParkingLot,
  updateParkingLot,
  deleteParkingLot,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formState, setFormState] = useState({
    id: '',
    name: '',
    region: '港島' as '港島' | '九龍' | '新界',
    address: '',
    lat: 22.3193,
    lng: 114.1694,
    hasDifficulty: true,
    difficultyTag: '輕易' as '輕易' | '中等' | '地獄' | '不可能的任務' | null,
    difficultyNote: '',
    heightLimit: '',
    videoGuide: '',
    hasCharging: false,
    provider: '',
    officialKw: 120,
    realKw: 95,
    rating: 4,
    chargingNote: '',
    maxKw: 120,
    totalGuns: 2,
    feeType: 'kwh' as 'kwh' | 'time',
    tariffs: [] as Array<{ timeSlot: string; price: number; unit: string }>,
    gunGroups: [] as Array<{ kw: number; gunType: 'DC 快充' | 'AC 慢充'; count: number; note: string }>,
  });

  const addTariffRow = () => {
    const defaultUnit = formState.feeType === 'kwh' ? '元/度 (kWh)' : '元/分鐘';
    setFormState({
      ...formState,
      tariffs: [...(formState.tariffs || []), { timeSlot: '', price: 0, unit: defaultUnit }]
    });
  };

  const removeTariffRow = (index: number) => {
    const updated = [...(formState.tariffs || [])];
    updated.splice(index, 1);
    setFormState({ ...formState, tariffs: updated });
  };

  const updateTariffRow = (index: number, key: 'timeSlot' | 'price' | 'unit', value: any) => {
    const updated = [...(formState.tariffs || [])];
    updated[index] = {
      ...updated[index],
      [key]: key === 'price' ? parseFloat(value) || 0 : value
    };
    setFormState({ ...formState, tariffs: updated });
  };

  const addGunGroupRow = () => {
    setFormState({
      ...formState,
      gunGroups: [...(formState.gunGroups || []), { kw: 120, gunType: 'DC 快充', count: 2, note: '' }]
    });
  };

  const removeGunGroupRow = (index: number) => {
    const updated = [...(formState.gunGroups || [])];
    updated.splice(index, 1);
    setFormState({ ...formState, gunGroups: updated });
  };

  const updateGunGroupRow = (index: number, key: 'kw' | 'gunType' | 'count' | 'note', value: any) => {
    const updated = [...(formState.gunGroups || [])];
    updated[index] = {
      ...updated[index],
      [key]: (key === 'kw' || key === 'count') ? parseInt(value) || 0 : value
    };
    setFormState({ ...formState, gunGroups: updated });
  };

  const handleFeeTypeChange = (newType: 'kwh' | 'time') => {
    const updatedTariffs = (formState.tariffs || []).map(t => {
      if (newType === 'kwh') {
        return { ...t, unit: '元/度 (kWh)' };
      } else {
        const isPrevKwh = t.unit.includes('度');
        return { ...t, unit: isPrevKwh ? '元/分鐘' : t.unit };
      }
    });

    setFormState({
      ...formState,
      feeType: newType,
      tariffs: updatedTariffs
    });
  };

  const filteredLots = parkingLots.filter(lot => 
    lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lot.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if first tab requirements aren't met
    if (!formState.name || !formState.lat || !formState.lng) {
      setActiveTab(1);
      return;
    }

    const existingLot = parkingLots.find(l => l.id === formState.id);

    const hasCharging = formState.hasCharging;
    
    // Automatically calculate maximum kW and total guns from gunGroups if available
    const computedMaxKw = hasCharging && formState.gunGroups && formState.gunGroups.length > 0
      ? Math.max(...formState.gunGroups.map(g => g.kw))
      : 0;
    const computedTotalGuns = hasCharging && formState.gunGroups && formState.gunGroups.length > 0
      ? formState.gunGroups.reduce((acc, g) => acc + g.count, 0)
      : 0;

    // Assembly chargingInfo block
    const chargingInfo = hasCharging ? {
      provider: formState.provider || '未知',
      officialKw: computedMaxKw,
      realKw: Number(formState.realKw) || 0,
      rating: existingLot?.chargingInfo ? (existingLot.chargingInfo.rating !== undefined ? existingLot.chargingInfo.rating : null) : null,
      ratingCount: existingLot?.chargingInfo ? (existingLot.chargingInfo.ratingCount || 0) : 0,
      totalRatingPoints: existingLot?.chargingInfo ? (existingLot.chargingInfo.totalRatingPoints || 0) : 0,
      note: formState.chargingNote || '',
      userFeedbacks: existingLot?.chargingInfo?.userFeedbacks || []
    } : null;

    const hasDifficulty = formState.hasDifficulty;

    const data: Partial<ParkingLot> = {
      name: formState.name,
      region: formState.region,
      address: formState.address || '',
      lat: Number(formState.lat),
      lng: Number(formState.lng),
      hasDifficulty: hasDifficulty,
      difficultyTag: hasDifficulty ? formState.difficultyTag : null,
      difficultyNote: hasDifficulty ? formState.difficultyNote : '',
      adminNotes: hasDifficulty ? formState.difficultyNote : '', // Sync with adminNotes for compatibility with other views
      heightLimit: hasDifficulty ? (formState.heightLimit || '') : '',
      videoGuide: formState.videoGuide || '',
      hasCharging: hasCharging,
      chargingInfo: chargingInfo,
      chargingNote: hasCharging ? (formState.chargingNote || '') : '',
      maxKw: hasCharging ? computedMaxKw : null,
      totalGuns: hasCharging ? computedTotalGuns : null,
      feeType: hasCharging ? formState.feeType : null,
      tariffs: hasCharging ? formState.tariffs : null,
      gunGroups: hasCharging ? formState.gunGroups : [],
    };

    if (formState.id) {
      await updateParkingLot(formState.id, data);
    } else {
      await addParkingLot(data);
    }
    setIsEditing(false);
  };

  const openEdit = (lot?: ParkingLot) => {
    if (lot) {
      setFormState({
        id: lot.id || '',
        name: lot.name || '',
        region: lot.region || '港島',
        address: lot.address || '',
        lat: lot.lat || 22.3193,
        lng: lot.lng || 114.1694,
        hasDifficulty: lot.hasDifficulty !== undefined ? !!lot.hasDifficulty : !!lot.difficultyTag,
        difficultyTag: lot.difficultyTag || '輕易',
        difficultyNote: lot.difficultyNote || lot.adminNotes || '',
        heightLimit: lot.heightLimit || '',
        videoGuide: lot.videoGuide || '',
        hasCharging: lot.hasCharging || false,
        provider: lot.chargingInfo?.provider || '',
        officialKw: lot.chargingInfo?.officialKw || 120,
        realKw: lot.chargingInfo?.realKw || 95,
        rating: lot.chargingInfo?.rating || 4,
        chargingNote: lot.chargingNote || lot.chargingInfo?.note || '',
        maxKw: lot.maxKw || lot.chargingInfo?.officialKw || 120,
        totalGuns: lot.totalGuns || 2,
        feeType: lot.feeType || 'kwh',
        tariffs: lot.tariffs || [],
        gunGroups: lot.gunGroups || (lot.maxKw && lot.totalGuns ? [{ kw: lot.maxKw, gunType: 'DC 快充', count: lot.totalGuns, note: '' }] : []),
      });
    } else {
      setFormState({
        id: '',
        name: '',
        region: '港島',
        address: '',
        lat: 22.3193,
        lng: 114.1694,
        hasDifficulty: true,
        difficultyTag: '輕易',
        difficultyNote: '',
        heightLimit: '',
        videoGuide: '',
        hasCharging: false,
        provider: '',
        officialKw: 120,
        realKw: 95,
        rating: 4,
        chargingNote: '',
        maxKw: 120,
        totalGuns: 2,
        feeType: 'kwh',
        tariffs: [],
        gunGroups: [],
      });
    }
    setActiveTab(1);
    setIsEditing(true);
  };

  const getDifficultyColor = (tag: ParkingLot['difficultyTag']) => {
    switch (tag) {
      case '輕易': return 'text-cyber-green';
      case '中等': return 'text-yellow-400';
      case '地獄': return 'text-red-500';
      case '不可能的任務': return 'text-fuchsia-500';
      default: return 'text-white/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-mono font-bold text-white uppercase tracking-tight">停車場管理 PARKING MANAGER</h2>
          <p className="text-xs font-mono text-white/40 uppercase">管理地圖上的停車場數據與難度</p>
        </div>
        <CyberButton onClick={() => openEdit()}>
          <Plus size={16} />
          新增停車場
        </CyberButton>
      </div>

      {/* Search & List */}
      <CyberCard className="overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input
              type="text"
              placeholder="搜尋停車場或地區..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-cyber-green/50"
            />
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {filteredLots.length > 0 ? (
            filteredLots.map((lot) => (
              <div key={lot.id} className="p-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white uppercase group-hover:text-cyber-green transition-colors">
                        {lot.name}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-current ${getDifficultyColor(lot.difficultyTag)}`}>
                        {lot.difficultyTag}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-white/30 uppercase">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {lot.region}
                      </span>
                      {lot.address && <span>{lot.address}</span>}
                      <span>LAT: {lot.lat} / LNG: {lot.lng}</span>
                      {lot.videoGuide && (
                        <a href={lot.videoGuide} target="_blank" rel="noopener noreferrer" className="text-cyber-green/60 hover:text-cyber-green flex items-center gap-1">
                          <Youtube size={10} /> 影片路徑
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEdit(lot)}
                      className="p-2 text-white/20 hover:text-white transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(lot.id)}
                      className="p-2 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-white/20 font-mono text-sm uppercase">
              沒有找到相關停車場
            </div>
          )}
        </div>
      </CyberCard>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-3xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02] shrink-0">
                <h3 className="text-lg font-mono font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-pulse" />
                  {formState.id ? '編輯停車場' : '新增停車場'}
                </h3>
                <button onClick={() => setIsEditing(false)} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Progress/Tabs Navigation Header */}
              <div className="p-3.5 border-b border-white/5 bg-black/30 flex items-center justify-between shrink-0 select-none text-[10px] font-mono font-bold gap-1 overflow-x-auto scrollbar-hide">
                {[
                  { num: 1, label: '1. 停車場資料' },
                  { num: 2, label: '2. 泊車難度' },
                  { num: 3, label: '3. 充電資料' },
                ].map((t) => {
                  const isActive = activeTab === t.num;
                  const isCompleted = activeTab > t.num;
                  return (
                    <button
                      key={t.num}
                      type="button"
                      onClick={() => {
                        // Allow direct switching if general metadata is validated
                        if (t.num === 1 || formState.name) {
                          setActiveTab(t.num);
                        }
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all shrink-0 ${
                        isActive
                          ? 'bg-cyber-green text-black font-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                          : isCompleted
                          ? 'bg-white/10 text-cyber-green'
                          : 'bg-white/5 text-white/30 hover:text-white/60'
                      }`}
                    >
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Modal Body / Scrollable Content */}
              <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-5 sm:p-6 space-y-5">
                  {/* TAB 1: BASIC INFO */}
                  {activeTab === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-white/30 uppercase ml-1">停車場名稱 NAME *</label>
                          <input
                            required
                            type="text"
                            placeholder="例如：海港城停車場"
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50 placeholder:text-white/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-white/30 uppercase ml-1">地區 REGION *</label>
                          <select
                            required
                            value={formState.region}
                            onChange={(e) => setFormState({ ...formState, region: e.target.value as any })}
                            className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                          >
                            <option value="港島">港島</option>
                            <option value="九龍">九龍</option>
                            <option value="新界">新界</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase ml-1">詳細地址 ADDRESS</label>
                        <input
                          type="text"
                          placeholder="例如：九龍尖沙咀廣東道3-27號"
                          value={formState.address}
                          onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50 placeholder:text-white/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-white/30 uppercase ml-1">緯度 LATITUDE *</label>
                          <input
                            required
                            type="number"
                            step="any"
                            placeholder="如：22.2965"
                            value={formState.lat}
                            onChange={(e) => setFormState({ ...formState, lat: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-white/30 uppercase ml-1">經度 LONGITUDE *</label>
                          <input
                            required
                            type="number"
                            step="any"
                            placeholder="如：114.1672"
                            value={formState.lng}
                            onChange={(e) => setFormState({ ...formState, lng: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!formState.name) {
                            alert('請填寫停車場名稱！');
                            return;
                          }
                          setActiveTab(2);
                        }}
                        className="w-full mt-4 py-3 bg-cyber-green hover:bg-[#b0f000] text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(204,255,0,0.25)]"
                      >
                        下一步：填寫難度 ➡️
                      </button>
                    </div>
                  )}

                  {/* TAB 2: DIFFICULTY OPTIONS */}
                  {activeTab === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      {/* 頂部 Toggle */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between animate-fade-in">
                        <div>
                          <span className="block text-xs font-mono font-bold text-white uppercase">🚗 泊車難度記錄</span>
                          <span className="block text-[9px] text-white/40 font-mono uppercase mt-0.5">是否記錄此停車場的泊車難度？</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formState.hasDifficulty}
                            onChange={(e) => setFormState({ ...formState, hasDifficulty: e.target.checked })}
                            className="sr-only"
                          />
                          <div className={`w-10 h-5.5 rounded-full transition-colors ${formState.hasDifficulty ? 'bg-cyber-green' : 'bg-white/10'}`} />
                          <div className={`absolute w-4.5 h-4.5 rounded-full bg-black top-[2.5px] left-[2.5px] transition-transform ${formState.hasDifficulty ? 'translate-x-4.5' : 'translate-x-0 bg-white/40'}`} />
                        </label>
                      </div>

                      {formState.hasDifficulty && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono text-white/30 uppercase ml-1">難度評級 DIFFICULTY LEVEL *</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { value: '輕易', label: '🟢 輕易', desc: '新手無痛' },
                                { value: '中等', label: '🟡 普通', desc: '難度一般' },
                                { value: '地獄', label: '🔴 地獄級', desc: '考驗迴旋技術' },
                                { value: '不可能的任務', label: '🟣 魔王級', desc: '極限地獄考驗' },
                              ].map((opt) => {
                                const isSel = formState.difficultyTag === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormState({ ...formState, difficultyTag: opt.value as any })}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                      isSel
                                        ? 'bg-white/10 border-white text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                                        : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
                                    }`}
                                  >
                                    <span className="block text-xs font-mono font-bold">{opt.label}</span>
                                    <span className="block text-[8px] opacity-60 mt-0.5 leading-tight">{opt.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/30 uppercase ml-1">停車場限高 HEIGHT LIMIT</label>
                              <input
                                type="text"
                                placeholder="例如：2.1m"
                                value={formState.heightLimit}
                                onChange={(e) => setFormState({ ...formState, heightLimit: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50 placeholder:text-white/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/30 uppercase ml-1">教學/泊車影片 (VIDEO GUIDE)</label>
                              <input
                                type="url"
                                placeholder="https://youtube.com/..."
                                value={formState.videoGuide}
                                onChange={(e) => setFormState({ ...formState, videoGuide: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50 placeholder:text-white/20"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-white/30 uppercase ml-1">車位寬敞度描述 / 泊車心得 DIFFICULTY NOTES</label>
                            <textarea
                              placeholder="請輸入停車場泊位情況，例如：圓形多層迴旋通道極窄，或車位充足、光線明亮等..."
                              value={formState.difficultyNote}
                              onChange={(e) => setFormState({ ...formState, difficultyNote: e.target.value })}
                              rows={4}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-sans text-white focus:outline-none focus:border-cyber-green/50 resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab(1)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 font-mono font-bold text-xs rounded-xl transition-all"
                        >
                          ⬅️ 上一步
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab(3)}
                          className="flex-1 py-3 bg-cyber-green hover:bg-[#b0f000] text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          下一步：充電資訊 ➡️
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CHARGING CONFIG */}
                  {activeTab === 3 && (
                    <div className="space-y-4 animate-fade-in pb-4">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-mono font-bold text-white uppercase">⚡ 充電設備網絡</span>
                          <span className="block text-[9px] text-white/40 font-mono uppercase mt-0.5">此停車場是否設有充電設備？</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formState.hasCharging}
                            onChange={(e) => setFormState({ ...formState, hasCharging: e.target.checked })}
                            className="sr-only"
                          />
                          <div className={`w-10 h-5.5 rounded-full transition-colors ${formState.hasCharging ? 'bg-cyber-green' : 'bg-white/10'}`} />
                          <div className={`absolute w-4.5 h-4.5 rounded-full bg-black top-[2.5px] left-[2.5px] transition-transform ${formState.hasCharging ? 'translate-x-4.5' : 'translate-x-0 bg-white/40'}`} />
                        </label>
                      </div>

                      {formState.hasCharging && (
                        <div className="p-4 rounded-xl border border-dashed border-cyber-green/35 bg-cyber-green/[0.01] space-y-4 animate-fade-in">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-white/30 uppercase ml-1">充電供應商 PROVIDER</label>
                            <input
                              type="text"
                              placeholder="如：中電 / 港燈 / Shell / Tesla / Base"
                              value={formState.provider}
                              onChange={(e) => setFormState({ ...formState, provider: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50 placeholder:text-white/20"
                            />
                          </div>

                          {/* 動態充電規格 (GunGroup Repeater) */}
                          <div className="space-y-2 border-t border-white/5 pt-3">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-mono text-white/30 uppercase ml-1">🔌 充電槍規格群組 GUN SPECS REPEATER</label>
                              <button
                                type="button"
                                onClick={addGunGroupRow}
                                className="flex items-center gap-1.5 px-3 py-1 bg-cyber-green/15 text-cyber-green border border-cyber-green/20 hover:bg-cyber-green/25 font-mono text-[9px] font-bold rounded-lg transition-all"
                              >
                                <Plus size={10} /> 新增充電槍規格
                              </button>
                            </div>

                            {formState.gunGroups && formState.gunGroups.length > 0 ? (
                              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                {formState.gunGroups.map((gun, index) => (
                                  <div key={index} className="space-y-2 border border-white/10 p-3 rounded-lg bg-white/[0.02] relative animate-fade-in text-left">
                                    {/* Delete Button top-right */}
                                    <button
                                      type="button"
                                      onClick={() => removeGunGroupRow(index)}
                                      className="absolute right-2 top-2 p-1 text-red-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                      title="刪除此充電槍規格"
                                    >
                                      <Trash2 size={13} />
                                    </button>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-white/40 uppercase">功率 POWER (kW) *</label>
                                        <input
                                          required
                                          type="number"
                                          placeholder="例如：120"
                                          value={gun.kw || ''}
                                          onChange={(e) => updateGunGroupRow(index, 'kw', e.target.value)}
                                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white font-mono placeholder:text-white/20 focus:border-cyber-green/50"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-white/40 uppercase">類型 TYPE *</label>
                                        <select
                                          value={gun.gunType}
                                          onChange={(e) => updateGunGroupRow(index, 'gunType', e.target.value as any)}
                                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white font-mono focus:border-cyber-green/50"
                                        >
                                          <option value="DC 快充">⚡ DC 快充</option>
                                          <option value="AC 慢充">🔌 AC 慢充</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-white/40 uppercase">數量 COUNT *</label>
                                        <input
                                          required
                                          type="number"
                                          placeholder="數量"
                                          value={gun.count || ''}
                                          onChange={(e) => updateGunGroupRow(index, 'count', e.target.value)}
                                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white font-mono placeholder:text-white/20 focus:border-cyber-green/50"
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[9px] font-mono text-white/40 uppercase">此槍組專屬備註 NOTE</label>
                                      <input
                                        type="text"
                                        placeholder="例如：通常洗車位隔離"
                                        value={gun.note || ''}
                                        onChange={(e) => updateGunGroupRow(index, 'note', e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white font-sans placeholder:text-white/20 focus:border-cyber-green/50"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-white/30 italic py-3 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                                目前尚無自訂充電槍規格，點擊上方按鈕新增！
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/30 uppercase ml-1">車友實測功率 REAL POWER (kW)</label>
                              <input
                                type="number"
                                placeholder="例如：95"
                                value={formState.realKw}
                                onChange={(e) => setFormState({ ...formState, realKw: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                              />
                            </div>
                            <div className="space-y-1 flex flex-col justify-end">
                              <label className="text-[10px] font-mono text-white/30 uppercase ml-1">兼容性綜合評級 RATING</label>
                              <div className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/60 font-mono flex items-center justify-between h-[38px]">
                                <span>💬 眾包實測評分</span>
                                <span className="text-cyber-green font-bold">
                                  {formState.id && parkingLots.find(l => l.id === formState.id)?.chargingInfo?.rating !== undefined && parkingLots.find(l => l.id === formState.id)?.chargingInfo?.rating !== null
                                    ? `⭐ ${parkingLots.find(l => l.id === formState.id)?.chargingInfo?.rating} 分`
                                    : '🔄 暫無實測評分'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 計費模式選擇 (Radio單選) */}
                          <div className="space-y-1.5 pb-1 border-t border-white/5 pt-3">
                            <label className="text-[10px] font-mono text-white/30 uppercase ml-1">💡 計費模式 FEE TYPE *</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-white/80">
                                <input
                                  type="radio"
                                  name="feeType"
                                  value="kwh"
                                  checked={formState.feeType === 'kwh'}
                                  onChange={() => handleFeeTypeChange('kwh')}
                                  className="accent-cyber-green"
                                />
                                🔌 按度數計費 (HKD/kWh)
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-white/80">
                                <input
                                  type="radio"
                                  name="feeType"
                                  value="time"
                                  checked={formState.feeType === 'time'}
                                  onChange={() => handleFeeTypeChange('time')}
                                  className="accent-cyber-green"
                                />
                                ⏱️ 按時間計費 (HKD/分鐘或小時)
                              </label>
                            </div>
                          </div>

                          {/* 動態時段電費增刪欄位 (Tariff Repeater) */}
                          <div className="space-y-2 border-t border-white/5 pt-3">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-mono text-white/30 uppercase ml-1">📈 動態時段電費 TARIFF CONFIG</label>
                              <button
                                type="button"
                                onClick={addTariffRow}
                                className="flex items-center gap-1.5 px-3 py-1 bg-cyber-green/15 text-cyber-green border border-cyber-green/20 hover:bg-cyber-green/25 font-mono text-[9px] font-bold rounded-lg transition-all"
                              >
                                <Plus size={10} /> 新增時段電費
                              </button>
                            </div>

                            {formState.tariffs && formState.tariffs.length > 0 ? (
                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                {formState.tariffs.map((tariff, index) => (
                                  <div key={index} className="flex gap-2 items-center bg-white/[0.02] border border-white/5 p-2 rounded-xl animate-fade-in">
                                    <div className="flex-1 min-w-0">
                                      <input
                                        type="text"
                                        placeholder="時段 (如：22:00 - 08:00)"
                                        value={tariff.timeSlot}
                                        onChange={(e) => updateTariffRow(index, 'timeSlot', e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-lg p-1.5 text-xs text-white font-mono placeholder:text-white/20 focus:border-cyber-green/50"
                                      />
                                    </div>
                                    <div className="w-20">
                                      <input
                                        type="number"
                                        step="any"
                                        placeholder="價錢"
                                        value={tariff.price || ''}
                                        onChange={(e) => updateTariffRow(index, 'price', e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-lg p-1.5 text-xs text-white font-mono placeholder:text-white/20 text-center focus:border-cyber-green/50"
                                      />
                                    </div>
                                    <div className="w-28 text-xs text-white/50">
                                      {formState.feeType === 'kwh' ? (
                                        <span className="block px-2 text-[10px] font-mono text-white/40 bg-white/5 py-1.5 rounded-lg text-center select-none">
                                          元/度 (kWh)
                                        </span>
                                      ) : (
                                        <select
                                          value={tariff.unit}
                                          onChange={(e) => updateTariffRow(index, 'unit', e.target.value)}
                                          className="w-full bg-black border border-white/10 rounded-lg p-1.5 text-[10px] font-mono text-white focus:outline-none focus:border-cyber-green/50"
                                        >
                                          <option value="元/分鐘">元/分鐘</option>
                                          <option value="元/小時">元/小時</option>
                                        </select>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeTariffRow(index)}
                                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-white/30 italic py-3 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                                目前尚無自訂時段電費，點擊上方按鈕新增！
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-white/30 uppercase ml-1">充電注意事項備註 CHARGING NOTES</label>
                            <textarea
                              placeholder="請輸入充電方面的特別注意事項，例如：配合哪些充電線或協議更穩定..."
                              value={formState.chargingNote}
                              onChange={(e) => setFormState({ ...formState, chargingNote: e.target.value })}
                              rows={3}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-sans text-white focus:outline-none focus:border-cyber-green/50 resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab(2)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 font-mono font-bold text-xs rounded-xl transition-all"
                        >
                          ⬅️ 上一步
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-cyber-green hover:bg-[#b0f000] text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(204,255,0,0.35)]"
                        >
                          <Save size={14} />
                          🌟 確定提交並發佈
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        title="刪除停車場資料"
        message="確定要永久刪除此停車場資料嗎？此操作無法復原。"
        variant="danger"
        onConfirm={async () => {
          if (confirmDeleteId) {
            await deleteParkingLot(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
