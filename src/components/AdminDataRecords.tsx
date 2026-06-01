import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, FileText, Trash2, Edit3, CheckCircle2, Save, X, HelpCircle } from 'lucide-react';
import { LogEntry, Vehicle } from '../types';
import { CyberCard } from './ui/CyberCard';
import { CyberInput } from './ui/CyberInput';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface AdminDataRecordsProps {
  type: 'logs' | 'vehicles';
  userRole: 'admin' | 'subAdmin';
  fleetData: {
    vehicles: Vehicle[];
    logs: LogEntry[];
  };
  isAdmin: boolean;
  onUpdateLog: (id: string, data: Partial<LogEntry>) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  format: (date: Date, pattern: string) => string;
  privacyMode?: boolean;
}

export const AdminDataRecords: React.FC<AdminDataRecordsProps> = ({
  type,
  userRole,
  fleetData,
  isAdmin,
  onUpdateLog,
  onDeleteLog,
  onDeleteVehicle,
  format,
  privacyMode = false
}) => {
  // --- Common States & UI variables ---
  const [logSearch, setLogSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehiclePage, setVehiclePage] = useState(1);
  const VEHICLES_PER_PAGE = 20;

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info'
  });

  // --- Logs specific states ---
  const [expandedPlate, setExpandedPlate] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editOdometer, setEditOdometer] = useState<number>(0);
  const [editCost, setEditCost] = useState<number>(0);
  const [editBatteryPercent, setEditBatteryPercent] = useState<number>(100);

  // --- Vehicles specific states ---
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehName, setEditVehName] = useState('');
  const [editVehBrand, setEditVehBrand] = useState('');
  const [editVehModel, setEditVehModel] = useState('');
  const [editVehPlate, setEditVehPlate] = useState('');
  const [editVehOdo, setEditVehOdo] = useState<number>(0);

  const isUserAdmin = userRole === 'admin';

  // --- Validation Shield/Guard ---
  const checkAdminPermission = (actionDesc: string): boolean => {
    if (!isUserAdmin) {
      alert("對不起，只有最高管理員（主 Admin）有權更改或刪除此歷史紀錄！");
      return false;
    }
    return true;
  };

  // --- Grouped Logs matching the old search logic ---
  const filteredGroupedLogs = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {};
    const search = logSearch.toLowerCase();
    
    fleetData.logs.forEach(log => {
      const vehicle = fleetData.vehicles.find(v => v.id === log.vehicleId);
      const plate = vehicle?.plate || '未知車牌';
      const name = vehicle?.name || '';
      
      if (plate.toLowerCase().includes(search) || name.toLowerCase().includes(search)) {
        if (!groups[plate]) groups[plate] = [];
        groups[plate].push(log);
      }
    });
    return groups;
  }, [fleetData.logs, fleetData.vehicles, logSearch]);

  // --- Vehicles pagination and matching ---
  const filteredVehicles = useMemo(() => {
    const search = vehicleSearch.toLowerCase();
    return fleetData.vehicles.filter(v => {
      const name = (v.name || '').toLowerCase();
      const plate = (v.plate || '').toLowerCase();
      const brand = (v.brand || '').toLowerCase();
      const model = (v.model || '').toLowerCase();
      return name.includes(search) || plate.includes(search) || brand.includes(search) || model.includes(search);
    });
  }, [fleetData.vehicles, vehicleSearch]);

  const pagedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * VEHICLES_PER_PAGE;
    return filteredVehicles.slice(start, start + VEHICLES_PER_PAGE);
  }, [filteredVehicles, vehiclePage]);

  // --- Logs update/delete handlers ---
  const startEditLog = (log: LogEntry) => {
    if (!checkAdminPermission('edit_log_attempt')) return;
    setEditingLogId(log.id);
    setEditOdometer(log.odometer || 0);
    setEditCost(log.cost || 0);
    setEditBatteryPercent(log.batteryPercent || 100);
  };

  const handleUpdateLog = (id: string) => {
    if (!checkAdminPermission('modify_core_records')) return;
    setConfirmModal({
      isOpen: true,
      variant: 'info',
      title: '更新日誌紀錄',
      message: '⚠️ 確定執行此操作嗎？此動作將同步寫入系統日誌。',
      onConfirm: async () => {
        try {
          await onUpdateLog(id, { 
            odometer: editOdometer, 
            cost: editCost,
            batteryPercent: editBatteryPercent
          });
          setEditingLogId(null);
        } catch (err) {
          alert("資料更新失敗，請檢查系統配置。");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteLog = (id: string) => {
    if (!checkAdminPermission('modify_core_records')) return;
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '永久刪除日誌',
      message: '⚠️ 確定執行此操作嗎？此動作將同步寫入系統日誌。',
      onConfirm: async () => {
        try {
          await onDeleteLog(id);
        } catch (err) {
          alert("刪除日誌發生錯誤，請稍候再試。");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // --- Vehicles update/delete handlers ---
  const startEditVehicle = (v: Vehicle) => {
    if (!checkAdminPermission('edit_vehicle_attempt')) return;
    setEditingVehicleId(v.id);
    setEditVehName(v.name || '');
    setEditVehBrand(v.brand || '');
    setEditVehModel(v.model || '');
    setEditVehPlate(v.plate || '');
    setEditVehOdo(v.lastOdometer || 0);
  };

  const handleUpdateVehicle = (id: string) => {
    if (!checkAdminPermission('modify_core_records')) return;
    setConfirmModal({
      isOpen: true,
      variant: 'info',
      title: '更新車輛資料',
      message: '⚠️ 確定執行此操作嗎？此動作將同步寫入系統日誌。',
      onConfirm: async () => {
        try {
          const docRef = doc(db, 'vehicles', id);
          await updateDoc(docRef, {
            name: editVehName,
            brand: editVehBrand,
            model: editVehModel,
            plate: editVehPlate,
            lastOdometer: editVehOdo
          });
          setEditingVehicleId(null);
        } catch (err) {
          alert("更正車輛資料失敗，可能權限不足。");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteVehicleWithGuard = (id: string) => {
    if (!checkAdminPermission('modify_core_records')) return;
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '註銷永久刪除車輛',
      message: '⚠️ 確定執行此操作嗎？此動作將同步寫入系統日誌。',
      onConfirm: async () => {
        try {
          await onDeleteVehicle(id);
        } catch (err) {
          alert("清除車輛車宿失敗。");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (type === 'logs') {
    return (
      <motion.div
        key="logs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50">營運歷史紀錄</h3>
          {isUserAdmin && (
            <span className="text-[9px] px-1.5 py-0.5 bg-cyber-green/10 text-cyber-green border border-cyber-green/20 rounded font-mono uppercase">
              ⚙️ 最高管理雙擊解鎖
            </span>
          )}
        </div>
        <div className="mb-4">
          <CyberInput 
            placeholder="搜尋車牌或車名 / SEARCH LOGS..." 
            value={logSearch} 
            onChange={e => setLogSearch(e.target.value)}
          />
        </div>
        
        {Object.keys(filteredGroupedLogs).length === 0 && (
          <div className="p-8 text-center text-white/20 font-mono text-xs uppercase text-center border border-dashed border-white/5 rounded-xl">
            查無相關營運日誌紀錄
          </div>
        )}

        {(Object.entries(filteredGroupedLogs) as [string, LogEntry[]][]).map(([plate, logs]) => (
          <div key={plate} className="space-y-2">
            <button 
              onClick={() => setExpandedPlate(expandedPlate === plate ? null : plate)}
              className="w-full flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center text-cyber-green font-mono font-bold">
                  {logs.length}
                </div>
                <div className="text-left">
                  <div className={`text-sm font-bold text-white ${privacyMode ? 'blur-md select-none transition-all duration-300 hover:blur-none' : ''}`}>{plate}</div>
                  <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                    最後紀錄: {logs[0].date || format(logs[0].timestamp.toDate(), 'yyyy-MM-dd')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-cyber-green">{(logs[0].odometer || 0).toLocaleString()} KM</div>
                <div className="text-[8px] text-white/20 uppercase font-mono">LATEST ODO</div>
              </div>
            </button>

            <AnimatePresence>
              {expandedPlate === plate && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 pl-4"
                >
                  {logs.map(log => {
                    const isEditing = editingLogId === log.id;
                    return (
                      <CyberCard 
                        key={log.id} 
                        className={`p-3 bg-white/[0.01] transition-all ${
                          isUserAdmin ? 'hover:border-cyber-green/20' : ''
                        }`}
                        onDoubleClick={() => {
                          if (isUserAdmin && !isEditing) {
                            startEditLog(log);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-[9px] font-mono text-white/30 uppercase">
                            {log.date || format(log.timestamp.toDate(), 'yyyy-MM-dd')} {format(log.timestamp.toDate(), 'HH:mm')}
                          </div>
                          
                          {/* 🔐 Admin 權限特裝：如果是 subAdmin 則完全隱藏按鈕 */}
                          {isUserAdmin && (
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <button 
                                    onClick={() => handleUpdateLog(log.id)} 
                                    className="p-1 text-[10px] bg-cyber-green text-black rounded font-mono font-bold flex items-center gap-1 transition-transform active:scale-95"
                                  >
                                    <Save size={10} /> 存
                                  </button>
                                  <button 
                                    onClick={() => setEditingLogId(null)} 
                                    className="p-1 text-[10px] bg-white/20 hover:bg-white/30 text-white rounded font-mono font-bold flex items-center gap-1"
                                  >
                                    <X size={10} /> 否
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => startEditLog(log)} 
                                    className="p-1.5 hover:bg-white/5 text-white/30 hover:text-white/80 rounded transition-colors"
                                    title="🔨 雙擊亦能編輯 / 更改此紀錄"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="p-1.5 hover:bg-red-500/10 text-red-500/30 hover:text-red-500 rounded transition-colors"
                                    title="⚠️ 停權 / 移除選中日誌"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Editable Grid for Admin / Text layout for subAdmin */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-[10px] font-mono">
                            <span className="opacity-30">里程 (KM):</span>{' '}
                            {isEditing ? (
                              <input 
                                type="number" 
                                value={editOdometer} 
                                onChange={e => setEditOdometer(Number(e.target.value))} 
                                className="w-full bg-white/10 rounded px-1 outline-none text-cyber-green border border-white/10 focus:border-cyber-green/50" 
                              />
                            ) : (
                              log.odometer
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-cyber-green">
                            <span className="opacity-30 text-white">電量比例 (%):</span>{' '}
                            {isEditing ? (
                              <input 
                                type="number" 
                                value={editBatteryPercent} 
                                onChange={e => setEditBatteryPercent(Number(e.target.value))} 
                                className="w-full bg-white/10 rounded px-1 outline-none text-cyber-green border border-white/10 focus:border-cyber-green/50" 
                              />
                            ) : (
                              `${log.batteryPercent}%`
                            )}
                          </div>
                          <div className="text-[10px] font-mono">
                            <span className="opacity-30">費用 ($):</span>{' '}
                            {isEditing ? (
                              <input 
                                type="number" 
                                value={editCost} 
                                onChange={e => setEditCost(Number(e.target.value))} 
                                className="w-full bg-white/10 rounded px-1 outline-none text-cyber-green border border-white/10 focus:border-cyber-green/50" 
                              />
                            ) : (
                              <span className={privacyMode ? 'blur-md select-none transition-all duration-300 hover:blur-none' : ''}>
                                ${log.cost || 0}
                              </span>
                            )}
                          </div>
                        </div>
                      </CyberCard>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>
    );
  }

  // --- VEHICLES TAB (ONLY) ---
  return (
    <motion.div
      key="vehicles"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50">車會正式名單</h3>
        {isUserAdmin && (
          <span className="text-[9px] px-1.5 py-0.5 bg-cyber-green/10 text-cyber-green border border-cyber-green/20 rounded font-mono uppercase">
            ⚙️ 頂級雙擊快調車輛
          </span>
        )}
      </div>

      <div className="mb-4">
        <CyberInput 
          placeholder="搜尋車牌、品牌或型號 / SEARCH VEHICLES..." 
          value={vehicleSearch} 
          onChange={e => {
            setVehicleSearch(e.target.value);
            setVehiclePage(1);
          }}
        />
      </div>

      {pagedVehicles.length === 0 && (
        <div className="p-8 text-center text-white/20 font-mono text-xs uppercase text-center border border-dashed border-white/5 rounded-xl">
          車會名冊內無對應車輛資料
        </div>
      )}

      {pagedVehicles.map(v => {
        const isEditing = editingVehicleId === v.id;
        return (
          <CyberCard 
            key={v.id} 
            className={`p-4 bg-white/[0.02] transition-colors ${
              isUserAdmin && !isEditing ? 'hover:border-cyber-green/20' : ''
            }`}
            onDoubleClick={() => {
              if (isUserAdmin && !isEditing) {
                startEditVehicle(v);
              }
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center text-cyber-green shrink-0">
                  <Car size={18} />
                </div>
                
                {/* Editable inputs for admin / read only display for subAdmin */}
                <div className="flex-1 space-y-2">
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 pr-4">
                      <div className="space-y-1">
                        <span className="text-[8px] text-white/40 uppercase font-mono">車輛暱稱</span>
                        <input 
                          type="text" 
                          value={editVehName} 
                          onChange={e => setEditVehName(e.target.value)} 
                          className="w-full bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/15 focus:border-cyber-green/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] text-white/40 uppercase font-mono">配置車牌</span>
                        <input 
                          type="text" 
                          autoCapitalize="characters"
                          value={editVehPlate} 
                          onChange={e => setEditVehPlate(e.target.value.toUpperCase())} 
                          className="w-full bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/15 focus:border-cyber-green/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] text-white/40 uppercase font-mono">品牌</span>
                        <input 
                          type="text" 
                          value={editVehBrand} 
                          onChange={e => setEditVehBrand(e.target.value)} 
                          className="w-full bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/15 focus:border-cyber-green/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] text-white/40 uppercase font-mono">車型 Model</span>
                        <input 
                          type="text" 
                          value={editVehModel} 
                          onChange={e => setEditVehModel(e.target.value)} 
                          className="w-full bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/15 focus:border-cyber-green/50"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <span className="text-[8px] text-white/40 uppercase font-mono">行駛總里程 (KM)</span>
                        <input 
                          type="number" 
                          value={editVehOdo} 
                          onChange={e => setEditVehOdo(Number(e.target.value))} 
                          className="w-full bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/15 focus:border-cyber-green/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span className={privacyMode ? 'blur-md select-none transition-all duration-300 hover:blur-none' : ''}>
                          {v.name}
                        </span>
                        <span className="text-[8px] px-1 py-0.2 bg-white/5 border border-white/10 text-white/50 rounded font-mono uppercase">
                          {(v.lastOdometer || 0).toLocaleString()} KM
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                        {v.brand} {v.model} • <span className={privacyMode ? 'blur-md select-none transition-all duration-300 hover:blur-none' : ''}>{v.plate || '尚未編配車牌'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action column (Edit / Update / Delete) */}
              <div className="text-right flex flex-col justify-between h-full min-h-[50px] shrink-0">
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <div className="text-right pr-2">
                    <div className="text-[8px] uppercase tracking-widest text-white/20 font-mono">擁有者 ID</div>
                    <div className="text-[10px] font-mono text-white/40">{(v.userId || '').slice(0, 8)}...</div>
                  </div>

                  {/* 🔐 Admin 特權解鎖 ✏️ 與 🗑️ */}
                  {isUserAdmin && (
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={() => handleUpdateVehicle(v.id)}
                            className="p-1 px-1.5 bg-cyber-green text-black rounded text-[10px] font-mono font-bold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                            title="保存修改"
                          >
                            <Save size={10} /> 存
                          </button>
                          <button 
                            onClick={() => setEditingVehicleId(null)}
                            className="p-1 px-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-mono font-bold"
                            title="放棄修改"
                          >
                            <X size={10} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEditVehicle(v)}
                            className="p-1.5 hover:bg-white/5 text-white/30 hover:text-white/80 rounded transition-colors"
                            title="✏️ 按鈕或雙擊均可修改車輛屬性"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteVehicleWithGuard(v.id)}
                            className="p-1.5 text-red-500/20 hover:text-red-500 hover:bg-red-500/5 rounded transition-all"
                            title="🗑️ 停權並強制移出車會名單"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[8px] uppercase tracking-widest text-white/20 font-mono mb-1">對接系統</div>
                  <div className="text-[10px] font-mono text-cyber-green flex items-center gap-1 justify-end">
                    <CheckCircle2 size={10} /> 雲端核實
                  </div>
                </div>
              </div>
            </div>
          </CyberCard>
        );
      })}

      {filteredVehicles.length > VEHICLES_PER_PAGE && (
        <div className="flex justify-between items-center pt-4">
          <button 
            onClick={() => {
              setVehiclePage(p => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={vehiclePage === 1}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 disabled:opacity-30"
          >
            PREV
          </button>
          <span className="text-[10px] font-mono text-white/20">PAGE {vehiclePage} / {Math.ceil(filteredVehicles.length / VEHICLES_PER_PAGE)}</span>
          <button 
            onClick={() => {
              setVehiclePage(p => Math.min(Math.ceil(filteredVehicles.length / VEHICLES_PER_PAGE), p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={vehiclePage === Math.ceil(filteredVehicles.length / VEHICLES_PER_PAGE)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 disabled:opacity-30"
          >
            NEXT
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </motion.div>
  );
};
