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
  const [editingLot, setEditingLot] = useState<Partial<ParkingLot> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLots = parkingLots.filter(lot => 
    lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lot.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLot) return;

    const data = {
      ...editingLot,
      lat: Number(editingLot.lat),
      lng: Number(editingLot.lng),
    };

    if (editingLot.id) {
      await updateParkingLot(editingLot.id, data);
    } else {
      await addParkingLot(data);
    }
    setIsEditing(false);
    setEditingLot(null);
  };

  const openEdit = (lot?: ParkingLot) => {
    setEditingLot(lot ? { ...lot } : {
      name: '',
      region: '港島',
      address: '',
      lat: 22.3193,
      lng: 114.1694,
      difficultyTag: '輕易',
      adminNotes: '',
      videoGuide: '',
    });
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
        {isEditing && editingLot && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[85vh] flex flex-col overflow-y-auto overscroll-contain custom-scrollbar"
            >
              <CyberCard className="border-cyber-green/30 flex flex-col h-auto p-0">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-white/[0.02] shrink-0">
                  <h3 className="text-lg font-mono font-bold text-white uppercase tracking-tight">
                    {editingLot.id ? '編輯停車場' : '新增停車場'}
                  </h3>
                  <button onClick={() => setIsEditing(false)} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="flex flex-col">
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase ml-1">名稱 NAME</label>
                        <input
                          required
                          type="text"
                          value={editingLot.name}
                          onChange={(e) => setEditingLot({ ...editingLot, name: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase ml-1">地區 REGION</label>
                        <select
                          required
                          value={editingLot.region}
                          onChange={(e) => setEditingLot({ ...editingLot, region: e.target.value as any })}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
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
                        value={editingLot.address || ''}
                        onChange={(e) => setEditingLot({ ...editingLot, address: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase ml-1">緯度 LATITUDE</label>
                        <input
                          required
                          type="number"
                          step="0.000001"
                          value={editingLot.lat}
                          onChange={(e) => setEditingLot({ ...editingLot, lat: parseFloat(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase ml-1">經度 LONGITUDE</label>
                        <input
                          required
                          type="number"
                          step="0.000001"
                          value={editingLot.lng}
                          onChange={(e) => setEditingLot({ ...editingLot, lng: parseFloat(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase ml-1">難度等級 DIFFICULTY</label>
                        <select
                          required
                          value={editingLot.difficultyTag}
                          onChange={(e) => setEditingLot({ ...editingLot, difficultyTag: e.target.value as any })}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                        >
                          <option value="輕易">輕易 (Easy)</option>
                          <option value="中等">中等 (Medium)</option>
                          <option value="地獄">地獄 (Hell)</option>
                          <option value="不可能的任務">不可能的任務 (Mission Impossible)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase ml-1">影片連結 VIDEO LINK</label>
                        <input
                          type="url"
                          placeholder="https://youtube.com/..."
                          value={editingLot.videoGuide || ''}
                          onChange={(e) => setEditingLot({ ...editingLot, videoGuide: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-white/30 uppercase ml-1">注意備註 NOTES</label>
                      <textarea
                        value={editingLot.adminNotes || ''}
                        onChange={(e) => setEditingLot({ ...editingLot, adminNotes: e.target.value })}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-green/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 border-t border-white/5 bg-white/[0.01] flex gap-3 shrink-0">
                    <CyberButton type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                      取消
                    </CyberButton>
                    <CyberButton type="submit" className="flex-1">
                      <Save size={16} />
                      保存
                    </CyberButton>
                  </div>
                </form>
              </CyberCard>
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
