import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  ArrowLeft, 
  Car, 
  FileText, 
  Users, 
  Trash2, 
  Edit3, 
  Download,
  AlertCircle,
  Calendar,
  Vote,
  Plus,
  X,
  CheckCircle2,
  User,
  MessageSquare,
  ShieldCheck,
  MapPin,
  Youtube,
  ShoppingBag,
  Gift,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { CyberCard } from './ui/CyberCard';
import { CyberButton } from './ui/CyberButton';
import { CyberInput } from './ui/CyberInput';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { DisclaimerModal } from './DisclaimerModal';
import { AdminCheckIn } from './AdminCheckIn';
import { AdminParkingManager } from './AdminParkingManager';
import { ParkingLeafletMap } from './ParkingLeafletMap';
import { AdminGroupBuy } from './AdminGroupBuy';
import { AdminPerks } from './AdminPerks';
import { AdminMemberApproval } from './AdminMemberApproval';
import { AdminPushNotification } from './AdminPushNotification';
import { AdminDataRecords } from './AdminDataRecords';
import { AdminAuditLogs } from './AdminAuditLogs';
import { Vehicle, LogEntry, Activity, Poll, UserProfile, ParkingLot, ActivityRegistration, GroupBuy, ClubPerk } from '../types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

const COLORS = ['#CCFF00', '#00F0FF', '#FF00F0', '#FFFF00', '#00FF00'];

interface AdminPanelProps {
  fleetData: { 
    vehicles: Vehicle[], 
    logs: LogEntry[],
    activities: Activity[],
    polls: Poll[],
    registrations: ActivityRegistration[]
  };
  parkingLots: ParkingLot[];
  allProfiles: UserProfile[];
  groupBuys: GroupBuy[];
  clubPerks: ClubPerk[];
  onUpdateLog: (id: string, data: Partial<LogEntry>) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onAddActivity: (data: Partial<Activity>) => Promise<any>;
  onUpdateActivity: (id: string, data: Partial<Activity>) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onAddPoll: (data: Partial<Poll>) => Promise<any>;
  onUpdatePoll: (id: string, data: Partial<Poll>) => Promise<void>;
  onDeletePoll: (id: string) => Promise<void>;
  onUpdateMemberRole: (userId: string, role: string) => Promise<void>;
  onUpdateMemberPlate?: (userId: string, plate: string) => Promise<void>;
  onDeleteMember: (userId: string) => Promise<void>;
  onClearActivities: () => Promise<void>;
  onClearPolls: () => Promise<void>;
  onUpdateRegistration: (regId: string, data: Partial<ActivityRegistration>) => Promise<void>;
  onAdminRestoreRegistration: (eventId: string, userId: string) => Promise<void>;
  onAddParkingLot: (data: Partial<ParkingLot>) => Promise<any>;
  onUpdateParkingLot: (id: string, data: Partial<ParkingLot>) => Promise<void>;
  onDeleteParkingLot: (id: string) => Promise<void>;
  onAddChargingFeedback?: (lotId: string, realKw: number, rating: number, note: string, testedGun?: string) => Promise<void>;
  onAddGroupBuy: (data: Partial<GroupBuy>) => Promise<any>;
  onUpdateGroupBuy: (id: string, data: Partial<GroupBuy>) => Promise<void>;
  onDeleteGroupBuy: (id: string) => Promise<void>;
  onAddPerk: (data: Omit<ClubPerk, 'id' | 'createdAt'>) => Promise<any>;
  onUpdatePerk: (id: string, data: Partial<ClubPerk>) => Promise<void>;
  onDeletePerk: (id: string) => Promise<void>;
  userProfile: UserProfile | null;
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onAddNotification: (data: any) => Promise<any>;
  onClearSystemNotifications: () => Promise<void>;
  isAdmin: boolean;
  isSubAdmin: boolean;
  isRoleLoading?: boolean;
  onClose: () => void;
  auditLogs?: any[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  fleetData, 
  parkingLots,
  allProfiles,
  groupBuys = [],
  clubPerks = [],
  auditLogs = [],
  isAdmin,
  isSubAdmin,
  isRoleLoading,
  onUpdateLog, 
  onDeleteLog, 
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onAddPoll,
  onUpdatePoll,
  onDeletePoll,
  onUpdateMemberRole,
  onUpdateMemberPlate,
  onDeleteMember,
  onClearActivities,
  onClearPolls,
  onUpdateRegistration,
  onAdminRestoreRegistration,
  onAddParkingLot,
  onUpdateParkingLot,
  onDeleteParkingLot,
  onAddChargingFeedback,
  onAddGroupBuy,
  onUpdateGroupBuy,
  onDeleteGroupBuy,
  onAddPerk,
  onUpdatePerk,
  onDeletePerk,
  userProfile,
  onUpdateProfile,
  onDeleteVehicle,
  onAddNotification,
  onClearSystemNotifications,
  onClose 
}) => {
  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-cyber-green flex items-center justify-center font-mono">
        <div className="text-center space-y-4">
          <div className="text-xl animate-pulse">🔒 安全權限驗證中...</div>
          <div className="text-[10px] text-cyber-green/50 uppercase tracking-[0.2em] animate-pulse">VERIFYING USER ACCESS CREDENTIALS...</div>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'fleet' | 'logs' | 'audit' | 'vehicles' | 'activities' | 'polls' | 'members' | 'account' | 'checkin' | 'parking' | 'groupBuys' | 'clubPerks' | 'notifications'>('fleet');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'activity' | 'poll', data: any } | null>(null);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  
  // Tabs restriction
  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'fleet', label: '數據', icon: TrendingUp },
      { id: 'logs', label: '紀錄', icon: FileText },
      { id: 'audit', label: '日誌', icon: Shield },
      { id: 'vehicles', label: '車輛', icon: Car },
      { id: 'activities', label: '活動', icon: Calendar },
      { id: 'checkin', label: '簽到', icon: ShieldCheck },
      { id: 'parking', label: '泊車', icon: MapPin },
      { id: 'polls', label: '投票', icon: Vote },
      { id: 'groupBuys', label: '團購', icon: ShoppingBag },
      { id: 'clubPerks', label: '福利', icon: Gift },
      { id: 'notifications', label: '訊息', icon: MessageSquare },
      { id: 'members', label: '成員', icon: Users },
      { id: 'account', label: '帳戶', icon: User },
    ];

    if (isAdmin) return tabs;

    if (isSubAdmin) {
      // Sub-admins can see fleet summary (limited), vehicles, activities, polls, notifications, account, plus checkin, parking, groupBuys, and clubPerks
      return tabs.filter(t => ['fleet', 'vehicles', 'activities', 'polls', 'notifications', 'account', 'checkin', 'parking', 'groupBuys', 'clubPerks'].includes(t.id));
    }
    
    return [{ id: 'account', label: '帳戶', icon: User }];
  }, [isAdmin, isSubAdmin]);

  const mainModules = useMemo(() => {
    const modules = [
      { id: 'analytics', label: '數據總覽', icon: TrendingUp },
      { id: 'community', label: '社群活動', icon: Calendar },
      { id: 'marketplace', label: '福利市集', icon: ShoppingBag },
      { id: 'parking', label: '泊車地圖', icon: MapPin },
      { id: 'account', label: '帳戶設定', icon: User }
    ];
    if (isAdmin || isSubAdmin) return modules;
    return [{ id: 'account', label: '帳戶設定', icon: User }];
  }, [isAdmin, isSubAdmin]);

  const activeModule = useMemo(() => {
    if (['fleet', 'logs', 'audit', 'vehicles', 'members'].includes(activeTab)) return 'analytics';
    if (['activities', 'checkin', 'polls', 'notifications'].includes(activeTab)) return 'community';
    if (['groupBuys', 'clubPerks'].includes(activeTab)) return 'marketplace';
    if (['parking'].includes(activeTab)) return 'parking';
    return 'account';
  }, [activeTab]);

  const subModules = useMemo(() => {
    const isOnlySubAdmin = isSubAdmin && !isAdmin; // 🚀 關鍵修復：確保當前僅為 subAdmin 時，才隱蔽高權限面板 (最高管理員 100% 通行)
    switch (activeModule) {
      case 'analytics':
        return [
          { id: 'fleet', label: '數據圖表' },
          ...(!isOnlySubAdmin ? [{ id: 'logs', label: '營運紀錄' }] : []),
          ...(!isOnlySubAdmin ? [{ id: 'audit', label: '系統日誌' }] : []),
          { id: 'vehicles', label: '車輛名單' },
          ...(!isOnlySubAdmin ? [{ id: 'members', label: '成員審批' }] : []),
        ];
      case 'community':
        return [
          { id: 'activities', label: '活動發佈' },
          { id: 'checkin', label: '現場簽到' },
          { id: 'polls', label: '發佈投票' },
          ...(!isOnlySubAdmin ? [{ id: 'notifications', label: '群發訊息' }] : []),
        ];
      case 'marketplace':
        return [
          { id: 'groupBuys', label: '團購項目' },
          { id: 'clubPerks', label: '商戶福利' },
        ];
      case 'parking':
        return [
          { id: 'parking', label: '泊車地圖' },
        ];
      case 'account':
      default:
        return [
          { id: 'account', label: '帳戶管理' },
        ];
    }
  }, [activeModule, isSubAdmin, isAdmin]);

  // Combined route guard syncing tab validations
  useEffect(() => {
    const isOnlySubAdmin = isSubAdmin && !isAdmin; // 🚀 關鍵修復：確保當前僅為 subAdmin 時才觸發安全防線攔截 (主 Admin 絕不受限)
    if (isOnlySubAdmin && ['logs', 'audit', 'members', 'notifications'].includes(activeTab)) {
      if (['logs', 'audit', 'members'].includes(activeTab)) {
        setActiveTab('fleet');
      } else if (activeTab === 'notifications') {
        setActiveTab('activities');
      }
    }
  }, [activeTab, isSubAdmin, isAdmin]);

  useEffect(() => {
    if (!availableTabs.find(t => t.id === activeTab)) {
      // Find fallback
      const found = subModules.find(s => s.id === activeTab);
      if (!found && subModules[0]) {
        setActiveTab(subModules[0].id as any);
      } else if (!found) {
        setActiveTab(availableTabs[0]?.id as any);
      }
    }
  }, [availableTabs, activeTab, subModules]);
  const [actTitle, setActTitle] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actDate, setActDate] = useState('');
  const [actStartDate, setActStartDate] = useState('');
  const [actEndDate, setActEndDate] = useState('');
  const [actDeadlineDate, setActDeadlineDate] = useState('');
  const [actLocation, setActLocation] = useState('');
  const [actLocationCoordinates, setActLocationCoordinates] = useState('');
  const [actLimit, setActLimit] = useState(20);

  // States for new Notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'success' | 'warning' | 'reminder'>('info');
  const [sendingNotif, setSendingNotif] = useState(false);

  // States for new Poll
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [maxChoices, setMaxChoices] = useState<number | ''>('');
  const [pollEndDate, setPollEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEntity, setEditingEntity] = useState<{ id: string, type: 'activity' | 'poll', data: any } | null>(null);

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editOdometer, setEditOdometer] = useState<number>(0);
  const [editCost, setEditCost] = useState<number>(0);

  const [showDisclaimer, setShowDisclaimer] = useState(false);

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

  const [editName, setEditName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehiclePage, setVehiclePage] = useState(1);
  const VEHICLES_PER_PAGE = 20;

  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const MEMBERS_PER_PAGE = 20;

  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    if (userProfile?.displayName) {
      setEditName(userProfile.displayName === '匿名用戶' ? '' : userProfile.displayName);
    }
  }, [userProfile]);

  const stats = useMemo(() => {
    const totalMileage = fleetData.vehicles.reduce((sum, v) => sum + (v.lastOdometer || 0), 0);
    const totalSavings = fleetData.logs.reduce((sum, l) => {
      const distance = l.distance || 0;
      const gasCost = (distance / 10) * 18;
      const savings = gasCost - (l.cost || 0);
      return sum + (savings > 0 ? savings : 0);
    }, 0);

    const vehicleCount = fleetData.vehicles.length;
    const memberCount = allProfiles.length;
    const logCount = fleetData.logs.length;

    // Model distribution for Pie Chart
    const modelMap: Record<string, number> = {};
    fleetData.vehicles.forEach(v => {
      const modelName = v.model || '未設定';
      modelMap[modelName] = (modelMap[modelName] || 0) + 1;
    });
    const modelData = Object.entries(modelMap).map(([name, value]) => ({ name, value }));

    // Chart data for fleet trends (by date)
    const sortedLogs = [...fleetData.logs].sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
    const dailyStats: Record<string, { date: string, mileage: number, savings: number }> = {};
    
    sortedLogs.forEach(log => {
      const date = format(log.timestamp.toDate(), 'MM/dd');
      if (!dailyStats[date]) dailyStats[date] = { date, mileage: 0, savings: 0 };
      
      dailyStats[date].mileage += (log.distance || 0);
      const gasCost = ((log.distance || 0) / 10) * 18;
      const savings = gasCost - (log.cost || 0);
      dailyStats[date].savings += (savings > 0 ? savings : 0);
    });

    return {
      totalMileage,
      totalSavings: Math.round(totalSavings),
      vehicleCount,
      memberCount,
      logCount,
      modelData,
      chartData: Object.values(dailyStats)
    };
  }, [fleetData, allProfiles]);

  const adminActivities = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const sorted = [...fleetData.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const active: Activity[] = [];
    const past: Activity[] = [];
    
    sorted.forEach(act => {
      const actDate = new Date(act.date);
      const finishDate = new Date(actDate);
      finishDate.setDate(finishDate.getDate() + 1);
      
      if (now >= finishDate) {
        past.push(act);
      } else {
        active.push(act);
      }
    });

    return [...active, ...past];
  }, [fleetData.activities]);

  const [expandedPlate, setExpandedPlate] = useState<string | null>(null);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {};
    fleetData.logs.forEach(log => {
      const vehicle = fleetData.vehicles.find(v => v.id === log.vehicleId);
      const plate = vehicle?.plate || '未知車牌';
      if (!groups[plate]) groups[plate] = [];
      groups[plate].push(log);
    });
    return groups;
  }, [fleetData.logs, fleetData.vehicles]);

  const sortedProfiles = useMemo(() => {
    const rolesOrder = { 'admin': 0, 'sub-admin': 1, 'member': 2 };
    const filtered = allProfiles.filter(p => {
      const search = memberSearch.toLowerCase();
      const displayName = p.displayName?.toLowerCase() || '';
      const email = p.email?.toLowerCase() || '';
      const phone = p.phoneNumber?.toLowerCase() || '';
      return displayName.includes(search) || email.includes(search) || phone.includes(search);
    });

    return [...filtered].sort((a, b) => {
      const roleA = rolesOrder[a.role as keyof typeof rolesOrder] ?? 3;
      const roleB = rolesOrder[b.role as keyof typeof rolesOrder] ?? 3;
      if (roleA !== roleB) return roleA - roleB;
      return (b.joinedAt?.toMillis() || 0) - (a.joinedAt?.toMillis() || 0);
    });
  }, [allProfiles, memberSearch]);

  const pagedProfiles = useMemo(() => {
    const start = (memberPage - 1) * MEMBERS_PER_PAGE;
    return sortedProfiles.slice(start, start + MEMBERS_PER_PAGE);
  }, [sortedProfiles, memberPage]);

  const filteredVehicles = useMemo(() => {
    return fleetData.vehicles.filter(v => {
      const search = vehicleSearch.toLowerCase();
      const name = v.name.toLowerCase();
      const plate = v.plate?.toLowerCase() || '';
      const brand = v.brand.toLowerCase();
      const model = v.model?.toLowerCase() || '';
      return name.includes(search) || plate.includes(search) || brand.includes(search) || model.includes(search);
    });
  }, [fleetData.vehicles, vehicleSearch]);

  const pagedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * VEHICLES_PER_PAGE;
    return filteredVehicles.slice(start, start + VEHICLES_PER_PAGE);
  }, [filteredVehicles, vehiclePage]);

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

  const getUserDetails = (uids: string[]) => {
    return uids.map(uid => {
      const profile = allProfiles.find(p => p.id === uid);
      const mainVehicle = fleetData.vehicles.find(v => v.userId === uid);
      const displayName = profile?.displayName && profile.displayName !== '匿名用戶' 
        ? profile.displayName 
        : (profile?.phoneNumber || '匿名用戶');
      
      return {
        uid,
        name: displayName,
        email: profile?.email || '無電子郵件',
        phone: profile?.phoneNumber || '無電話',
        plate: mainVehicle?.plate || '無車牌'
      };
    });
  };

  const handleExport = () => {
    const data = fleetData.logs.map(l => ({
      Date: format(l.timestamp.toDate(), 'yyyy-MM-dd HH:mm'),
      Vehicle: fleetData.vehicles.find(v => v.id === l.vehicleId)?.name || 'Unknown',
      Odometer: l.odometer,
      Cost: l.cost || 0,
      Distance: l.distance || 0
    }));

    const csvRows = [
      ['Date', 'Vehicle', 'Odometer', 'Cost', 'Distance'],
      ...data.map(row => [row.Date, row.Vehicle, row.Odometer, row.Cost, row.Distance])
    ];

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `evlog_fleet_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEdit = (log: LogEntry) => {
    setEditingLogId(log.id);
    setEditOdometer(log.odometer);
    setEditCost(log.cost || 0);
  };

  const saveEdit = async () => {
    if (!editingLogId) return;
    await onUpdateLog(editingLogId, { odometer: editOdometer, cost: editCost });
    setEditingLogId(null);
  };

  const handleCreateActivity = async () => {
    const finalLimit = parseInt(String(actLimit), 10) || 100;
    const finalDeadline = actDeadlineDate ? actDeadlineDate : null;
    try {
      await onAddActivity({
        title: actTitle,
        description: actDescription,
        date: actStartDate.split('T')[0], // For compatibility with older lists
        eventStartDate: actStartDate ? Timestamp.fromDate(new Date(actStartDate)) : undefined,
        eventEndDate: actEndDate ? Timestamp.fromDate(new Date(actEndDate)) : undefined,
        deadlineDate: finalDeadline,
        location: actLocation,
        locationCoordinates: actLocationCoordinates,
        limit: finalLimit,
        status: 'open'
      });
      alert('活動已發佈 / ACTIVITY PUBLISHED');
    } catch (error: any) {
      console.error("Firebase 寫入失敗詳細原因:", error);
      alert(`發佈失敗: ${error.message || '未知錯誤'}`);
    } finally {
      // Force UI reset with delay
      setTimeout(() => {
        setActTitle('');
        setActDescription('');
        setActDate('');
        setActStartDate('');
        setActEndDate('');
        setActDeadlineDate('');
        setActLocation('');
        setActLocationCoordinates('');
        setActLimit(20);
        setShowAddActivity(false);
        setEditingId(null);
      }, 100);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) return;
    setSendingNotif(true);
    try {
      await onAddNotification({
        userId: 'all',
        title: notifTitle,
        message: notifMessage,
        type: notifType
      });
      setNotifTitle('');
      setNotifMessage('');
      setNotifType('info');
      alert('訊息已發佈！MESSAGE SENT!');
    } catch (e: any) {
      alert('發佈失敗: ' + (e.message || '未知錯誤'));
    } finally {
      setSendingNotif(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion || pollOptions.some(o => !o)) return;
    try {
      await onAddPoll({
        title: pollQuestion,
        question: pollQuestion, // back-compat
        isMultiSelect: isMultiSelect,
        maxChoices: isMultiSelect && maxChoices !== '' ? Number(maxChoices) : undefined,
        endDate: pollEndDate || undefined,
        options: pollOptions.map((text, i) => ({ id: `opt_${i + 1}`, text, votes: 0 }))
      });
      alert('投票已建立了 / POLL CREATED');
    } catch (error) {
      console.error("Failed to create poll:", error);
      alert('發佈失敗 / FAILED');
    } finally {
      // Force UI reset with delay
      setTimeout(() => {
        setPollQuestion('');
        setPollOptions(['', '']);
        setIsMultiSelect(false);
        setMaxChoices('');
        setPollEndDate('');
        setShowAddPoll(false);
        setEditingId(null);
      }, 100);
    }
  };

  const handleUpdateActivity = async (id: string, data: Partial<Activity>) => {
    const finalData = { ...data };
    if (finalData.limit !== undefined) {
      finalData.limit = parseInt(String(finalData.limit), 10) || 100;
    }
    if (finalData.deadlineDate === "" || !finalData.deadlineDate) {
      finalData.deadlineDate = null;
    }
    setConfirmModal({
      isOpen: true,
      variant: 'info',
      title: '更新活動',
      message: '確定要更新此項資料嗎？',
      onConfirm: async () => {
        try {
          await onUpdateActivity(id, finalData);
          alert('更新成功 / ACTIVITY UPDATED');
        } catch (error: any) {
          console.error("Firebase 寫入失敗詳細原因:", error);
          alert('更新失敗: ' + (error.message || '未知錯誤'));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setEditingId(null);
            setActTitle('');
            setActDate('');
            setActStartDate('');
            setActEndDate('');
            setActDeadlineDate('');
            setActLocation('');
            setActLocationCoordinates('');
            setActLimit(20);
            setShowAddActivity(false);
          }, 100);
        }
      }
    });
  };

  const handleUpdatePoll = async (id: string, data: Partial<Poll>) => {
    setConfirmModal({
      isOpen: true,
      variant: 'info',
      title: '更新投票',
      message: '確定要更新此項資料嗎？',
      onConfirm: async () => {
        try {
          await onUpdatePoll(id, data);
          alert('更新成功 / POLL UPDATED');
        } catch (error: any) {
          alert('更新失敗: ' + (error.message || '未知錯誤'));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setEditingId(null);
            setPollQuestion('');
            setPollOptions(['', '']);
            setIsMultiSelect(false);
            setMaxChoices('');
            setPollEndDate('');
            setShowAddPoll(false);
          }, 100);
        }
      }
    });
  };

  const handleDeleteActivityAction = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '刪除活動',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      onConfirm: async () => {
        try {
          await onDeleteActivity(id);
          alert('活動已刪除 / ACTIVITY DELETED');
        } catch (error: any) {
          alert('刪除失敗: ' + (error.message || '未知錯誤'));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeletePollAction = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '刪除投票',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      onConfirm: async () => {
        try {
          await onDeletePoll(id);
          alert('投票已刪除 / POLL DELETED');
        } catch (error: any) {
          alert('刪除失敗: ' + (error.message || '未知錯誤'));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const startEditActivity = (activity: Activity) => {
    setActTitle(activity.title);
    setActDescription(activity.description || '');
    setActDate(activity.date);
    
    // Convert Timestamps to datetime-local string format
    const formatForInput = (ts?: any) => {
      if (!ts) return '';
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    };

    setActStartDate(formatForInput(activity.eventStartDate));
    setActEndDate(formatForInput(activity.eventEndDate));
    setActDeadlineDate(activity.deadlineDate || '');
    setActLocation(activity.location);
    setActLocationCoordinates(activity.locationCoordinates || '');
    setActLimit(activity.limit);
    setEditingId(activity.id);
    setShowAddActivity(true);
  };

  const startEditPoll = (poll: Poll) => {
    setPollQuestion(poll.title || poll.question || '');
    setPollOptions(poll.options.map(o => o.text));
    setIsMultiSelect(!!poll.isMultiSelect);
    setMaxChoices(poll.maxChoices !== undefined && poll.maxChoices !== null ? poll.maxChoices : '');
    setPollEndDate(poll.endDate || '');
    setEditingId(poll.id);
    setShowAddPoll(true);
  };

  const handleDeleteLogAction = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '刪除紀錄',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      onConfirm: async () => {
        try {
          await onDeleteLog(id);
        } catch (error) {
          alert('刪除失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUpdateLogAction = async (id: string, data: any) => {
    setConfirmModal({
      isOpen: true,
      variant: 'info',
      title: '更新紀錄',
      message: '確定要更新此項資料嗎？',
      onConfirm: async () => {
        try {
          await onUpdateLog(id, data);
        } catch (error) {
          alert('更新失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteVehicle = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '刪除車輛',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      onConfirm: async () => {
        try {
          await onDeleteVehicle(id);
          alert('車輛已刪除 / VEHICLE DELETED');
        } catch (error) {
          alert('刪除失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteMember = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '刪除成員',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      onConfirm: async () => {
        try {
          await onDeleteMember(id);
          alert('成員已刪除 / MEMBER DELETED');
        } catch (error) {
          alert('刪除失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setSelectedMember(null);
          }, 100);
        }
      }
    });
  };

  const handleAdminCheckIn = async (eventId: string, userId: string) => {
    const regId = `${eventId}_${userId}`;
    const registration = fleetData.registrations.find(r => r.id === regId);
    const activity = fleetData.activities.find(a => a.id === eventId);
    
    if (!registration) {
      return { success: false, message: '找不到相關報名記錄 / RECORD NOT FOUND' };
    }

    if (registration.status === 'cancelled') {
      return { success: false, message: '此報名已取消 / REGISTRATION CANCELLED' };
    }

    if (registration.qrCodeUsed || registration.attended) {
      return { success: false, message: '此條碼已被使用 / ALREADY USED' };
    }

    // Expiration check: 24h after event date
    const targetDate = activity?.eventEndDate || activity?.date || '';
    if (targetDate) {
      const endDateTime = new Date(targetDate + 'T23:59:59').getTime();
      const now = new Date().getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (now > (endDateTime + twentyFourHours)) {
        return { success: false, message: '活動簽到已截止 / EVENT EXPIRED' };
      }
    }

    try {
      await onUpdateRegistration(regId, {
        qrCodeUsed: true,
        attended: true,
        attendedAt: Timestamp.now()
      });
      return { success: true, message: `簽到成功！車牌: ${registration.plateNumber}` };
    } catch (e) {
      return { success: false, message: '系統更新失敗 / SYSTEM ERROR' };
    }
  };

  const handleUpdateMyProfile = async () => {
    if (!editName.trim()) return;
    setIsUpdatingProfile(true);
    try {
      await onUpdateProfile({ displayName: editName });
      alert('個人資料已更新！PROFILE UPDATED!');
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleClearActivities = async () => {
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '清除所有活動',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      onConfirm: async () => {
        try {
          await onClearActivities();
          alert('所有活動已清除 / ACTIVITIES CLEARED');
        } catch (error) {
          alert('清除失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleClearPolls = async () => {
    setConfirmModal({
      isOpen: true,
      variant: 'danger',
      title: '清除所有投票',
      message: '此操作無法撤銷，確定要永久刪除嗎？',
      onConfirm: async () => {
        try {
          await onClearPolls();
          alert('所有投票已清除 / POLLS CLEARED');
        } catch (error) {
          alert('清除失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-cyber-bg text-white pb-20">
      {/* Admin Header */}
      <header className="p-8 flex justify-between items-center border-b border-cyber-green/20 bg-cyber-green/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-cyber-green">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-mono font-black italic uppercase tracking-tighter text-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.3)]">
              管理後台
            </h1>
            <p className="text-[10px] font-mono tracking-widest opacity-50">管理系統 v1.0</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {isAdmin && (
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-cyber-green/10 border border-cyber-green/30 rounded-lg text-[10px] font-mono font-bold text-cyber-green hover:bg-cyber-green hover:text-black transition-all"
            >
              <Download size={14} /> 匯出 CSV
            </button>
          )}
          
          <div className="flex flex-col items-end font-mono">
            <div className="text-[14px] font-bold text-cyber-green leading-none">
              {format(currentTime, 'HH:mm')}
            </div>
            <div className="text-[8px] uppercase tracking-widest text-white/40 mt-1">
              {format(currentTime, 'yyyy/MM/dd')} • 24°C
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-cyber-bg via-cyber-bg/90 to-transparent">
        <div className="max-w-md mx-auto flex justify-between items-center bg-black/80 backdrop-blur-2xl border border-white/10 px-2 py-3 rounded-2xl shadow-[0_-15px_35px_rgba(0,0,0,0.6)]">
          {mainModules.map(module => (
            <button
              key={module.id}
              onClick={() => {
                let firstTab: any = 'account';
                if (module.id === 'analytics') {
                  firstTab = 'fleet';
                } else if (module.id === 'community') {
                  firstTab = 'activities';
                } else if (module.id === 'marketplace') {
                  firstTab = 'groupBuys';
                } else if (module.id === 'parking') {
                  firstTab = 'parking';
                }
                setActiveTab(firstTab);
              }}
              className={`flex-1 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeModule === module.id ? 'text-cyber-green scale-110' : 'text-white/30 hover:text-white/50'
              }`}
            >
              <module.icon size={18} className={activeModule === module.id ? 'cyber-text-glow' : ''} />
              <span className="text-[7px] font-mono font-bold uppercase tracking-wider">{module.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {subModules.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-3 scrollbar-none border-b border-white/5">
            {subModules.map(subTab => (
              <button
                key={subTab.id}
                onClick={() => setActiveTab(subTab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border whitespace-nowrap cursor-pointer ${
                  activeTab === subTab.id
                    ? 'bg-cyber-green text-black border-cyber-green shadow-[0_0_15px_rgba(204,255,0,0.15)]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {subTab.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'fleet' && (
            <motion.div
              key="fleet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Fleet Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {isAdmin && (
                  <>
                    <CyberCard className="bg-cyber-green/5 border-cyber-green/20">
                      <div className="text-[10px] font-mono text-cyber-green/60 uppercase tracking-widest">車隊總里程</div>
                      <div className="text-2xl font-mono font-black text-white mt-1">
                        {stats.totalMileage.toLocaleString()} <span className="text-xs opacity-50">KM</span>
                      </div>
                    </CyberCard>
                    <CyberCard className="bg-cyber-green/5 border-cyber-green/20">
                      <div className="text-[10px] font-mono text-cyber-green/60 uppercase tracking-widest">總節省成本</div>
                      <div className="text-2xl font-mono font-black text-cyber-green mt-1">
                        ${stats.totalSavings.toLocaleString()}
                      </div>
                    </CyberCard>
                  </>
                )}
                <CyberCard className="bg-white/5 border-white/10">
                  <div className="text-[10px] font-mono opacity-40 uppercase tracking-widest">總車輛數</div>
                  <div className="text-2xl font-mono font-black text-white mt-1">
                    {stats.vehicleCount} <span className="text-xs opacity-30">VEHICLES</span>
                  </div>
                </CyberCard>
                <CyberCard className="bg-white/5 border-white/10">
                  <div className="text-[10px] font-mono opacity-40 uppercase tracking-widest">總成員數</div>
                  <div className="text-2xl font-mono font-black text-white mt-1">
                    {stats.memberCount} <span className="text-xs opacity-30">MEMBERS</span>
                  </div>
                </CyberCard>
              </div>

              {/* Charts Row */}
              <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : ''} gap-6`}>
                {isAdmin && (
                  <CyberCard title="車隊活動趨勢" className="lg:col-span-2 p-0 overflow-hidden">
                    <div className="h-[300px] w-full p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.chartData}>
                          <defs>
                            <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#CCFF00" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} fontStyle="italic" />
                          <YAxis stroke="#ffffff40" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#050505', border: '1px solid #CCFF0030', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                          />
                          <Area type="monotone" dataKey="savings" stroke="#CCFF00" fillOpacity={1} fill="url(#colorSavings)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CyberCard>
                )}

                <CyberCard title="型號分佈" className={`${isAdmin ? '' : 'w-full'} p-0 overflow-hidden`}>
                  <div className="h-[300px] w-full p-4 flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={stats.modelData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.modelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#050505', border: '1px solid #CCFF0030', borderRadius: '8px' }}
                           itemStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 w-full px-4 overflow-y-auto max-h-[100px] scrollbar-hide">
                      {stats.modelData.map((model, i) => (
                        <div key={model.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis">{model.name}</span>
                          <span className="text-[10px] font-mono opacity-40 ml-auto">{model.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CyberCard>
              </div>
            </motion.div>
          )}

          {activeTab === 'activities' && (
            <motion.div
              key="activities"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50">活動管理</h3>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button 
                      onClick={handleClearActivities}
                      className="py-2 px-4 text-[10px] font-mono text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                      清除所有活動
                    </button>
                  )}
                  <CyberButton onClick={() => setShowAddActivity(true)} className="py-2 px-4 text-xs">
                    <Plus size={14} className="mr-1" /> 發佈活動
                  </CyberButton>
                </div>
              </div>

              {showAddActivity && (
                <CyberCard title={editingId ? "編輯活動" : "發佈新活動"} className="border-cyber-green/30">
                  <div className="space-y-4">
                    <CyberInput label="活動名稱 (必填)" value={actTitle} onChange={e => setActTitle(e.target.value)} placeholder="例如: 電動車交流聚會" />
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest ml-1">活動簡介 / DESCRIPTION (必填)</label>
                      <textarea 
                        value={actDescription}
                        onChange={e => setActDescription(e.target.value)}
                        placeholder="請輸入活動詳情..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 transition-all min-h-[80px] resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CyberInput label="開始時間 (必填)" type="datetime-local" value={actStartDate} onChange={e => setActStartDate(e.target.value)} />
                      <CyberInput label="完結時間 (必填)" type="datetime-local" value={actEndDate} onChange={e => setActEndDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <CyberInput label="名額上限 (必填)" type="number" value={actLimit} onChange={e => setActLimit(Number(e.target.value))} />
                      <CyberInput label="截止報名日期 (選填)" type="date" value={actDeadlineDate} onChange={e => setActDeadlineDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CyberInput label="地點名稱 (必填)" value={actLocation} onChange={e => setActLocation(e.target.value)} placeholder="例如: TKO Gateway" />
                      <CyberInput label="地點經緯度 (導航用 - 選填)" value={actLocationCoordinates} onChange={e => setActLocationCoordinates(e.target.value)} placeholder="例如: 22.3164,114.2694" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => { setShowAddActivity(false); setEditingId(null); }} className="flex-1 py-2 rounded bg-white/5 text-xs font-mono">取消</button>
                      <CyberButton 
                        onClick={() => {
                          if (!actTitle || !actStartDate || !actEndDate || !actLocation || !actDescription) {
                            alert('請填寫所有必填項目 / PLEASE FILL ALL REQUIRED FIELDS');
                            return;
                          }
                          editingId ? handleUpdateActivity(editingId, { 
                            title: actTitle, 
                            description: actDescription, 
                            date: actStartDate.split('T')[0],
                            eventStartDate: actStartDate ? Timestamp.fromDate(new Date(actStartDate)) : undefined,
                            eventEndDate: actEndDate ? Timestamp.fromDate(new Date(actEndDate)) : undefined,
                            deadlineDate: actDeadlineDate, 
                            location: actLocation, 
                            locationCoordinates: actLocationCoordinates,
                            limit: actLimit 
                          }) : handleCreateActivity();
                        }} 
                        className="flex-1 text-xs py-2"
                      >
                        {editingId ? '儲存更改' : '確認發佈'}
                      </CyberButton>
                    </div>
                  </div>
                </CyberCard>
              )}

              <div className="space-y-4">
                {adminActivities.map(activity => {
                  const actDate = new Date(activity.date);
                  const finishDate = new Date(actDate);
                  finishDate.setDate(finishDate.getDate() + 1);
                  const isPast = new Date() >= finishDate;

                  return (
                    <CyberCard key={activity.id} className={`bg-white/[0.02] ${isPast ? 'opacity-50 grayscale' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            {activity.title}
                            {isPast && <span className="text-[8px] px-1 bg-white/10 text-white/40 border border-white/20 rounded uppercase">過去 / PAST</span>}
                          </h4>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-white/40 uppercase">
                            <span>{activity.date}</span>
                            <span>{activity.location}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedEntity({ type: 'activity', data: activity })}
                            className="px-3 py-1 bg-white/5 rounded border border-white/10 text-[10px] font-mono hover:bg-cyber-green hover:text-black transition-all"
                          >
                            管理名單
                          </button>
                          <button 
                            onClick={() => startEditActivity(activity)}
                            className="p-2 text-white/30 hover:text-cyber-green"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteActivityAction(activity.id)} 
                            className="p-2 text-red-500/30 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-black/20 rounded border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">報名名單 ({activity.participants.length}/{activity.limit})</div>
                          <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-cyber-green shadow-[0_0_8px_#CCFF00]" 
                              style={{ width: `${(activity.participants.length / activity.limit) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CyberCard>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'polls' && (
            <motion.div
              key="polls"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50">投票管理</h3>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button 
                      onClick={handleClearPolls}
                      className="py-2 px-4 text-[10px] font-mono text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                      清除所有投票
                    </button>
                  )}
                  <CyberButton onClick={() => setShowAddPoll(true)} className="py-2 px-4 text-xs">
                    <Plus size={14} className="mr-1" /> 新增投票
                  </CyberButton>
                </div>
              </div>

              {showAddPoll && (
                <CyberCard title={editingId ? "編輯投票" : "建立新投票"} className="border-cyber-green/30">
                  <div className="space-y-4">
                    <CyberInput label="投票內容" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="例如: 您最喜歡的充電品牌？" />
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">投票模式 / POLL MODE</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsMultiSelect(false)}
                          className={`flex-1 py-1 px-3 rounded text-[11px] font-mono font-bold border transition-all ${
                            !isMultiSelect 
                              ? 'bg-cyber-green text-black border-cyber-green shadow-[0_0_10px_rgba(163,230,21,0.3)]'
                              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                          }`}
                        >
                          單選模式 / SINGLE
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMultiSelect(true)}
                          className={`flex-1 py-1 px-3 rounded text-[11px] font-mono font-bold border transition-all ${
                            isMultiSelect 
                              ? 'bg-cyber-green text-black border-cyber-green shadow-[0_0_10px_rgba(163,230,21,0.3)]'
                              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                          }`}
                        >
                          多選模式 / MULTI
                        </button>
                      </div>
                    </div>

                    {isMultiSelect && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">最多可選幾項 (選填) / MAX CHOICES (OPTIONAL)</label>
                        <input 
                          type="number"
                          min="1"
                          max={pollOptions.length}
                          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white"
                          placeholder="無限制 / NO LIMIT"
                          value={maxChoices}
                          onChange={e => {
                            const val = e.target.value;
                            setMaxChoices(val === '' ? '' : Number(val));
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">截止日期 / END DATE (OPTIONAL)</label>
                      <input 
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white"
                        value={pollEndDate}
                        onChange={e => setPollEndDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">選項 / OPTIONS</label>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white"
                            value={opt}
                            placeholder={`選項 ${i + 1}`}
                            onChange={e => {
                                const newOpts = [...pollOptions];
                                newOpts[i] = e.target.value;
                                setPollOptions(newOpts);
                            }}
                          />
                          {pollOptions.length > 2 && !editingId && (
                            <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="p-2 text-white/20"><X size={14}/></button>
                          )}
                        </div>
                      ))}
                      {!editingId && (
                        <button 
                          onClick={() => setPollOptions([...pollOptions, ''])}
                          className="text-[10px] font-mono text-cyber-green/60 hover:text-cyber-green transition-colors"
                        >
                          + 新增選項
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => { setShowAddPoll(false); setEditingId(null); }} className="flex-1 py-1 rounded bg-white/5 text-xs font-mono">取消</button>
                      <CyberButton 
                        onClick={() => {
                          if (editingId) {
                            const poll = fleetData.polls.find(p => p.id === editingId);
                            handleUpdatePoll(editingId, { 
                              title: pollQuestion,
                              question: pollQuestion, // back-compat
                              isMultiSelect: isMultiSelect,
                              maxChoices: isMultiSelect && maxChoices !== '' ? Number(maxChoices) : undefined,
                              endDate: pollEndDate || undefined,
                              options: pollOptions.map((text, i) => ({ 
                                id: poll?.options[i]?.id || `opt_${i + 1}`,
                                text, 
                                votes: poll?.options[i]?.text === text ? (poll.options[i].votes || 0) : 0 
                              })) 
                            });
                          } else {
                            handleCreatePoll();
                          }
                        }} 
                        className="flex-1 text-xs py-1"
                      >
                        {editingId ? '儲存更改' : '發佈投票'}
                      </CyberButton>
                    </div>
                  </div>
                </CyberCard>
              )}

              <div className="space-y-6">
                {fleetData.polls.map(poll => {
                  const votersCount = (poll.votedUserIds || poll.voters || []).length;
                  return (
                    <CyberCard key={poll.id} className="bg-white/[0.02]">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white pr-8">{poll.title || poll.question}</h4>
                          <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                            <span className="text-[#A3E635] bg-[#A3E635]/10 border border-[#A3E635]/20 px-2 py-0.5 rounded">
                              {poll.isMultiSelect ? `多選模式${poll.maxChoices ? ` (限選 ${poll.maxChoices} 項)` : ''}` : '單選模式'}
                            </span>
                            {poll.endDate && (
                              <span className="text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                                截止: {poll.endDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedEntity({ type: 'poll', data: poll })}
                            className="px-3 py-1 bg-white/5 rounded border border-white/10 text-[10px] font-mono hover:bg-cyber-green hover:text-black transition-all"
                          >
                            查看數據
                          </button>
                          <button 
                            onClick={() => startEditPoll(poll)}
                            className="p-2 text-white/30 hover:text-cyber-green"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeletePollAction(poll.id)} 
                            className="p-2 text-red-500/30 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="h-[150px] w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={poll.options} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="text" type="category" stroke="#ffffff40" fontSize={9} width={80} />
                            <Bar dataKey="votes" fill="#A3E635" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                        總投票數: {votersCount}
                      </div>
                    </CyberCard>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <AdminCheckIn 
                activities={fleetData.activities.filter(a => a.status === 'open')} 
                registrations={fleetData.registrations}
                onCheckIn={handleAdminCheckIn}
              />
            </motion.div>
          )}

          {activeTab === 'parking' && (
            <motion.div
              key="parking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <AdminParkingManager 
                parkingLots={parkingLots}
                addParkingLot={onAddParkingLot}
                updateParkingLot={onUpdateParkingLot}
                deleteParkingLot={onDeleteParkingLot}
              />

              <div className="pt-8 border-t border-white/5 space-y-4">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-white/30">地圖預覽 PREVIEW</h3>
                <div className="h-[600px] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <ParkingLeafletMap parkingLots={parkingLots} onAddChargingFeedback={onAddChargingFeedback} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <AdminDataRecords
              type="logs"
              userRole={isAdmin ? 'admin' : 'subAdmin'}
              fleetData={fleetData}
              isAdmin={isAdmin}
              onUpdateLog={onUpdateLog}
              onDeleteLog={onDeleteLog}
              onDeleteVehicle={onDeleteVehicle}
              format={format}
            />
          )}

          {activeTab === 'audit' && (
            <AdminAuditLogs
              userRole={isAdmin ? 'admin' : 'subAdmin'}
              auditLogs={auditLogs}
              format={format}
            />
          )}

          {activeTab === 'notifications' && (
            <AdminPushNotification
              userRole={isAdmin ? 'admin' : 'subAdmin'}
              setActiveSubTab={(tab) => {
                if (tab === 'dashboard') {
                  setActiveTab('fleet');
                } else {
                  setActiveTab(tab as any);
                }
              }}
              notifTitle={notifTitle}
              setNotifTitle={setNotifTitle}
              notifMessage={notifMessage}
              setNotifMessage={setNotifMessage}
              notifType={notifType}
              setNotifType={setNotifType}
              sendingNotif={sendingNotif}
              handleSendNotification={handleSendNotification}
              isAdmin={isAdmin}
              onClearSystemNotifications={onClearSystemNotifications}
              setConfirmModal={setConfirmModal}
            />
          )}

          {activeTab === 'members' && (
            <AdminMemberApproval
              userRole={isAdmin ? 'admin' : 'subAdmin'}
              setActiveSubTab={(tab) => {
                if (tab === 'dashboard') {
                  setActiveTab('fleet');
                } else {
                  setActiveTab(tab as any);
                }
              }}
              memberSearch={memberSearch}
              setMemberSearch={setMemberSearch}
              memberPage={memberPage}
              setMemberPage={setMemberPage}
              MEMBERS_PER_PAGE={MEMBERS_PER_PAGE}
              sortedProfiles={sortedProfiles}
              pagedProfiles={pagedProfiles}
              vehicles={fleetData.vehicles}
              setSelectedMember={setSelectedMember}
              isAdmin={isAdmin}
              onUpdateMemberRole={onUpdateMemberRole}
              onUpdateMemberPlate={onUpdateMemberPlate}
              onDeleteMember={onDeleteMember}
              format={format}
            />
          )}

          {activeTab === 'vehicles' && (
            <AdminDataRecords
              type="vehicles"
              userRole={isAdmin ? 'admin' : 'subAdmin'}
              fleetData={fleetData}
              isAdmin={isAdmin}
              onUpdateLog={onUpdateLog}
              onDeleteLog={onDeleteLog}
              onDeleteVehicle={onDeleteVehicle}
              format={format}
            />
          )}

          {activeTab === 'account' && userProfile && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50 mb-6">我的帳戶</h3>
              
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-2xl bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center overflow-hidden mb-4 shadow-[0_0_20px_rgba(204,255,0,0.1)]">
                  {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-cyber-green/40" size={40} />
                  )}
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white uppercase tracking-tight">{userProfile.displayName || '匿名用戶'}</div>
                  <div className="text-[10px] font-mono text-cyber-green uppercase tracking-[0.2em] mt-1">
                    {userProfile.role === 'admin' ? '系統管理員' : '次級管理員'}
                  </div>
                </div>
              </div>

              <CyberCard title="帳戶資料 SETTINGS" className="border-white/10">
                <div className="space-y-4">
                  <CyberInput 
                    label="顯示名稱" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    placeholder="請輸入您的顯示名稱"
                  />
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest ml-1">車牌號碼 (根據車輛管理)</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-cyber-green flex items-center gap-2">
                      <Car size={14} />
                      {userProfile.plate || '未設定車輛'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest ml-1">電子郵件 (唯讀)</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white/40">
                      {userProfile.email || '未設定'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest ml-1">電話號碼 (唯讀)</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white/40">
                      {userProfile.phoneNumber || '未設定'}
                    </div>
                  </div>

                  <div className="pt-4">
                    <CyberButton 
                      onClick={handleUpdateMyProfile} 
                      className="w-full"
                      disabled={isUpdatingProfile || editName === userProfile.displayName}
                    >
                      {isUpdatingProfile ? '更新中...' : '儲存更改 SAVE CHANGES'}
                    </CyberButton>
                  </div>
                </div>
              </CyberCard>

              <CyberCard className="bg-white/5 border-white/10">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.2em]">
                  <span className="text-white/30">加入日期</span>
                  <span className="text-white/60">
                    {userProfile.joinedAt ? format(userProfile.joinedAt.toDate(), 'yyyy-MM-dd') : '未知'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.2em] mt-3">
                  <span className="text-white/30">用戶 ID</span>
                  <span className="text-white/60">{userProfile.id.slice(0, 16)}...</span>
                </div>
              </CyberCard>
            </motion.div>
          )}

          {activeTab === 'groupBuys' && (
            <motion.div
              key="groupBuys"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <AdminGroupBuy 
                groupBuys={groupBuys}
                onAddGroupBuy={onAddGroupBuy}
                onUpdateGroupBuy={onUpdateGroupBuy}
                onDeleteGroupBuy={onDeleteGroupBuy}
                isSubAdmin={isSubAdmin}
                allProfiles={allProfiles}
              />
            </motion.div>
          )}

          {activeTab === 'clubPerks' && (
            <motion.div
              key="clubPerks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <AdminPerks 
                clubPerks={clubPerks}
                onAddPerk={onAddPerk}
                onUpdatePerk={onUpdatePerk}
                onDeletePerk={onDeletePerk}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Details Modal for Activities/Polls */}
      <AnimatePresence>
        {selectedEntity && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntity(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md max-h-[80vh] flex flex-col"
            >
              <CyberCard className="flex-1 flex flex-col pt-12 overflow-hidden">
                <button 
                  onClick={() => setSelectedEntity(null)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-white"
                >
                  <X size={20} />
                </button>

                <div className="px-6 mb-4">
                  <h3 className="text-xl font-mono font-bold uppercase text-cyber-green">
                    {selectedEntity.type === 'activity' ? '報名詳情' : '投票詳情'}
                  </h3>
                  <p className="text-xs text-white/40 font-mono uppercase tracking-widest mt-1">
                    {selectedEntity.data.title || selectedEntity.data.question}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-6">
                  {selectedEntity.type === 'activity' ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2 flex justify-between items-center">
                          <span>報名名單 PARTICIPANTS</span>
                          <span>{selectedEntity.data.participants.length} / {selectedEntity.data.limit}</span>
                        </div>
                        {(() => {
                          const activityRegs = fleetData.registrations.filter(r => r.eventId === selectedEntity.data.id);
                          if (activityRegs.length === 0) {
                            return <div className="text-center py-10 opacity-20 text-xs font-mono lowercase">no registrations yet</div>;
                          }
                          return activityRegs.map(reg => {
                            const user = getUserDetails([reg.userId])[0];
                            const isCancelled = reg.status === 'cancelled';
                            return (
                              <div key={reg.id} className={`flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 group ${isCancelled ? 'opacity-50 grayscale' : ''}`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-bold text-white">{user.name}</div>
                                    {isCancelled && <span className="text-[8px] bg-red-500/20 text-red-500 border border-red-500/30 px-1 rounded uppercase font-bold">已取消</span>}
                                  </div>
                                  <div className="text-[10px] font-mono text-white/30">{user.email}</div>
                                  <div className="text-[9px] font-mono text-cyber-green mt-0.5">
                                    {user.plate} • {user.phone}
                                    {isCancelled && reg.cancelReason && <span className="block text-red-400/60 mt-1 italic">原因: {reg.cancelReason}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isCancelled ? (
                                    <button 
                                      onClick={async () => {
                                        if (window.confirm('確定要手動恢復此成員的報名嗎？ RESTORE THIS PARTICIPANT?')) {
                                          await onAdminRestoreRegistration(selectedEntity.data.id, reg.userId);
                                          // Update local state is tricky here because data comes from props, 
                                          // but fleetData should update via some parent trigger or listener.
                                          // For now, we assume the prop update is enough or reload.
                                        }
                                      }}
                                      className="px-2 py-1 bg-cyber-green/10 border border-cyber-green/30 text-[9px] font-mono text-cyber-green rounded hover:bg-cyber-green hover:text-black transition-all"
                                    >
                                      手動加回
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={async () => {
                                        if (window.confirm('確定要移出此成員嗎？ REMOVE THIS PARTICIPANT?')) {
                                          const updatedParticipants = selectedEntity.data.participants.filter((p: string) => p !== user.uid);
                                          await onUpdateActivity(selectedEntity.data.id, { participants: updatedParticipants });
                                          // Also mark registration as cancelled via updateDoc if needed, 
                                          // but for now we follow the existing pattern for removal.
                                          // The user specifically asked for "手動加回" for "cancelled" users.
                                        }
                                      }}
                                      className="p-2 text-red-500/0 group-hover:text-red-500/60 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">手動增加成員 ADD PARTICIPANT</div>
                        <div className="space-y-2">
                          <select 
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50"
                            onChange={async (e) => {
                              const uid = e.target.value;
                              if (!uid) return;
                              if (selectedEntity.data.participants.includes(uid)) {
                                alert('該成員已在名單中 ALREADY IN LIST');
                                return;
                              }
                              const updatedParticipants = [...selectedEntity.data.participants, uid];
                              await onUpdateActivity(selectedEntity.data.id, { participants: updatedParticipants });
                              setSelectedEntity({ ...selectedEntity, data: { ...selectedEntity.data, participants: updatedParticipants } });
                              e.target.value = '';
                            }}
                          >
                            <option value="" className="bg-[#121212]">選擇成員...</option>
                            {allProfiles
                              .filter(p => !selectedEntity.data.participants.includes(p.id))
                              .sort((a,b) => (a.displayName || '').localeCompare(b.displayName || ''))
                              .map(p => (
                                <option key={p.id} value={p.id} className="bg-[#121212]">
                                  {p.displayName || p.phoneNumber} ({p.phoneNumber})
                                </option>
                              ))
                            }
                          </select>
                          <p className="text-[9px] font-mono text-white/20 italic text-center">管理員可無視截止日期與名額限制手動加人。</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        {selectedEntity.data.options.map((opt: any, i: number) => (
                           <div key={i} className="space-y-1">
                             <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                               <span>{opt.text}</span>
                               <span className="text-cyber-green">{opt.votes} 票</span>
                             </div>
                             <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-cyber-green shadow-[0_0_8px_#CCFF00]" 
                                 style={{ width: `${selectedEntity.data.voters.length > 0 ? (opt.votes / selectedEntity.data.voters.length) * 100 : 0}%` }}
                               />
                             </div>
                           </div>
                        ))}
                      </div>
                      <div className="space-y-2 pt-4 border-t border-white/5">
                        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">已投票成員</div>
                        {getUserDetails(selectedEntity.data.voters).map(user => (
                          <div key={user.uid} className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                            <div className="text-xs text-white/60">{user.name}</div>
                            <div className="text-[10px] font-mono text-white/30">{user.plate}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member Details Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md"
            >
              <CyberCard className="pt-12 p-6 flex flex-col items-center">
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-white"
                >
                  <X size={20} />
                </button>

                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden mb-6">
                  {selectedMember.photoURL ? (
                    <img src={selectedMember.photoURL} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="text-white/20" size={40} />
                  )}
                </div>

                <div className="text-center mb-8">
                  <h3 className="text-xl font-mono font-bold text-cyber-green uppercase">
                    {selectedMember.displayName && selectedMember.displayName !== '匿名用戶' ? selectedMember.displayName : (selectedMember.phoneNumber || '匿名用戶')}
                  </h3>
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">
                    UID: {selectedMember.id.slice(0, 16)}...
                  </p>
                </div>

                <div className="w-full space-y-4 bg-white/5 p-4 rounded-xl border border-white/5 mb-6 text-left">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <span className="block text-[8px] font-mono text-white/20 uppercase mb-1">電話號碼</span>
                       <span className="text-xs text-white/80">{selectedMember.phoneNumber || '未提供'}</span>
                     </div>
                     <div>
                       <span className="block text-[8px] font-mono text-white/20 uppercase mb-1">電子郵件</span>
                       <span className="text-xs text-white/80 truncate block">{selectedMember.email || '未提供'}</span>
                     </div>
                     <div>
                       <span className="block text-[8px] font-mono text-white/20 uppercase mb-1">身份地位</span>
                       <span className="text-xs text-cyber-green font-bold">
                         {selectedMember.role === 'admin' ? '管理員' : selectedMember.role === 'sub-admin' ? '次管理員' : '普通會員'}
                       </span>
                     </div>
                     <div>
                       <span className="block text-[8px] font-mono text-white/20 uppercase mb-1">車輛總數</span>
                       <span className="text-xs text-white/80">{fleetData.vehicles.filter(v => v.userId === selectedMember.id).length} 台</span>
                     </div>
                   </div>
                   
                   <div className="pt-4 border-t border-white/10">
                     <span className="block text-[8px] font-mono text-white/20 uppercase mb-2">持有的車輛</span>
                     <div className="space-y-2">
                       {fleetData.vehicles.filter(v => v.userId === selectedMember.id).map(v => (
                         <div key={v.id} className="flex justify-between items-center py-2 px-3 bg-black/20 rounded border border-white/5">
                           <div className="text-[10px] font-bold text-white">{v.name}</div>
                           <div className="text-[10px] font-mono text-cyber-green">{v.plate}</div>
                         </div>
                       ))}
                       {fleetData.vehicles.filter(v => v.userId === selectedMember.id).length === 0 && (
                         <div className="text-[10px] font-mono text-white/20 py-2">該成員尚未註冊車輛</div>
                       )}
                     </div>
                   </div>
                </div>

                <CyberButton onClick={() => setSelectedMember(null)} className="w-full">
                  關閉詳情 CLOSE
                </CyberButton>
                {isAdmin && selectedMember.id !== userProfile?.id && (
                  <button 
                    onClick={() => handleDeleteMember(selectedMember.id)}
                    className="mt-4 text-[10px] font-mono text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors mb-2"
                  >
                    徹底刪除該用戶 DELETE USER
                  </button>
                )}
              </CyberCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {!fleetData.logs.length && !fleetData.vehicles.length && activeTab !== 'activities' && activeTab !== 'polls' && activeTab !== 'members' && (
        <div className="p-20 text-center space-y-4">
          <AlertCircle className="mx-auto text-white/10" size={48} />
          <p className="text-[10px] uppercase font-mono tracking-[0.4em] text-white/20">暫無數據可供顯示</p>
        </div>
      )}

      <footer className="mt-20 mb-8 text-center px-6 space-y-2">
        <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
          Powered by <a href="https://effortless.com.hk/" target="_blank" rel="noopener noreferrer" className="hover:text-cyber-green transition-colors decoration-cyber-green/30 underline-offset-2 underline">Effortless Production Limited</a>
        </p>
        <button 
          onClick={() => setShowDisclaimer(true)}
          className="block w-full text-[9px] text-white/10 font-mono tracking-widest uppercase hover:text-white/30 transition-colors"
        >
          Copyright © 2026 Effortless Production Limited. All Rights Reserved.
        </button>
      </footer>

      <DisclaimerModal 
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
      />
    </div>
  );
};
