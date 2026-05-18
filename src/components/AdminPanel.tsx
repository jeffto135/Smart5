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
  Youtube
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
import { Vehicle, LogEntry, Activity, Poll, UserProfile, ParkingLot, ActivityRegistration } from '../types';
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
  onUpdateLog: (id: string, data: Partial<LogEntry>) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onAddActivity: (data: Partial<Activity>) => Promise<any>;
  onUpdateActivity: (id: string, data: Partial<Activity>) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onAddPoll: (data: Partial<Poll>) => Promise<any>;
  onUpdatePoll: (id: string, data: Partial<Poll>) => Promise<void>;
  onDeletePoll: (id: string) => Promise<void>;
  onUpdateMemberRole: (userId: string, role: string) => Promise<void>;
  onDeleteMember: (userId: string) => Promise<void>;
  onClearActivities: () => Promise<void>;
  onClearPolls: () => Promise<void>;
  onUpdateRegistration: (regId: string, data: Partial<ActivityRegistration>) => Promise<void>;
  onAddParkingLot: (data: Partial<ParkingLot>) => Promise<any>;
  onUpdateParkingLot: (id: string, data: Partial<ParkingLot>) => Promise<void>;
  onDeleteParkingLot: (id: string) => Promise<void>;
  userProfile: UserProfile | null;
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onAddNotification: (data: any) => Promise<any>;
  onClearSystemNotifications: () => Promise<void>;
  isAdmin: boolean;
  isSubAdmin: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  fleetData, 
  parkingLots,
  allProfiles,
  isAdmin,
  isSubAdmin,
  onUpdateLog, 
  onDeleteLog, 
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onAddPoll,
  onUpdatePoll,
  onDeletePoll,
  onUpdateMemberRole,
  onDeleteMember,
  onClearActivities,
  onClearPolls,
  onUpdateRegistration,
  onAddParkingLot,
  onUpdateParkingLot,
  onDeleteParkingLot,
  userProfile,
  onUpdateProfile,
  onDeleteVehicle,
  onAddNotification,
  onClearSystemNotifications,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'fleet' | 'logs' | 'vehicles' | 'activities' | 'polls' | 'members' | 'account' | 'checkin' | 'parking'>('fleet');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'activity' | 'poll', data: any } | null>(null);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  
  // Tabs restriction
  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'fleet', label: '數據', icon: TrendingUp },
      { id: 'logs', label: '紀錄', icon: FileText },
      { id: 'vehicles', label: '車輛', icon: Car },
      { id: 'activities', label: '活動', icon: Calendar },
      { id: 'checkin', label: '簽到', icon: ShieldCheck },
      { id: 'parking', label: '泊車', icon: MapPin },
      { id: 'polls', label: '投票', icon: Vote },
      { id: 'notifications', label: '訊息', icon: MessageSquare },
      { id: 'members', label: '成員', icon: Users },
      { id: 'account', label: '帳戶', icon: User },
    ];

    if (isAdmin) return tabs;

    if (isSubAdmin) {
      // Sub-admins can see fleet summary (limited), vehicles, activities, polls, notifications, account, plus checkin and parking
      return tabs.filter(t => ['fleet', 'vehicles', 'activities', 'polls', 'notifications', 'account', 'checkin', 'parking'].includes(t.id));
    }
    
    return [{ id: 'account', label: '帳戶', icon: User }];
  }, [isAdmin, isSubAdmin]);

  useEffect(() => {
    if (!availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id as any);
    }
  }, [availableTabs, activeTab]);
  const [actTitle, setActTitle] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actDate, setActDate] = useState('');
  const [actDeadlineDate, setActDeadlineDate] = useState('');
  const [actLocation, setActLocation] = useState('');
  const [actLimit, setActLimit] = useState(20);

  // States for new Notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'success' | 'warning' | 'reminder'>('info');
  const [sendingNotif, setSendingNotif] = useState(false);

  // States for new Poll
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

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
    if (!actTitle || !actDate) return;
    const finalLimit = Math.max(1, actLimit);
    try {
      await onAddActivity({
        title: actTitle,
        description: actDescription,
        date: actDate,
        deadlineDate: actDeadlineDate,
        location: actLocation,
        limit: finalLimit,
        status: 'open'
      });
      alert('活動已發佈 / ACTIVITY PUBLISHED');
    } catch (error) {
      console.error("Failed to create activity:", error);
      alert('發佈失敗 / FAILED');
    } finally {
      // Force UI reset with delay
      setTimeout(() => {
        setActTitle('');
        setActDescription('');
        setActDate('');
        setActDeadlineDate('');
        setActLocation('');
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
        question: pollQuestion,
        options: pollOptions.map(text => ({ text, votes: 0 }))
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
        setShowAddPoll(false);
        setEditingId(null);
      }, 100);
    }
  };

  const handleUpdateActivity = async (id: string, data: Partial<Activity>) => {
    const finalData = { ...data };
    if (finalData.limit !== undefined) {
      finalData.limit = Math.max(1, finalData.limit);
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
          alert('更新失敗: ' + (error.message || '未知錯誤'));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setEditingId(null);
            setActTitle('');
            setActDate('');
            setActDeadlineDate('');
            setActLocation('');
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
    setActDeadlineDate(activity.deadlineDate || '');
    setActLocation(activity.location);
    setActLimit(activity.limit);
    setEditingId(activity.id);
    setShowAddActivity(true);
  };

  const startEditPoll = (poll: Poll) => {
    setPollQuestion(poll.question);
    setPollOptions(poll.options.map(o => o.text));
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
          alert('紀錄已刪除 / LOG DELETED');
        } catch (error) {
          alert('刪除失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setEditingLogId(null);
          }, 100);
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
          alert('紀錄已更新 / LOG UPDATED');
        } catch (error) {
          alert('更新失敗');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setEditingLogId(null);
          }, 100);
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
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-cyber-green/10 border border-cyber-green/30 rounded-lg text-[10px] font-mono font-bold text-cyber-green hover:bg-cyber-green hover:text-black transition-all"
            >
              <Download size={14} /> 匯出 CSV
            </button>
          )}
          <div className="w-10 h-10 cyber-border flex items-center justify-center rounded-lg bg-cyber-green/10">
            <Trophy className="text-cyber-green" size={20} />
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-cyber-bg via-cyber-bg/90 to-transparent">
        <div className="max-w-md mx-auto flex justify-between items-center bg-black/80 backdrop-blur-2xl border border-white/10 px-2 py-3 rounded-2xl shadow-[0_-15px_35px_rgba(0,0,0,0.6)]">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center gap-1 transition-all ${
                activeTab === tab.id ? 'text-cyber-green scale-110' : 'text-white/30 hover:text-white/50'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'cyber-text-glow' : ''} />
              <span className="text-[7px] font-mono font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
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
                    <CyberInput label="活動名稱" value={actTitle} onChange={e => setActTitle(e.target.value)} placeholder="例如: 電動車交流聚會" />
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest ml-1">活動簡介 / DESCRIPTION</label>
                      <textarea 
                        value={actDescription}
                        onChange={e => setActDescription(e.target.value)}
                        placeholder="請輸入活動詳情..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 transition-all min-h-[80px] resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <CyberInput label="日期" type="date" value={actDate} onChange={e => setActDate(e.target.value)} />
                      <CyberInput label="名額上限" type="number" value={actLimit} onChange={e => setActLimit(Number(e.target.value))} />
                    </div>
                    <CyberInput label="截止報名日期 (選填)" type="date" value={actDeadlineDate} onChange={e => setActDeadlineDate(e.target.value)} />
                    <CyberInput label="地點" value={actLocation} onChange={e => setActLocation(e.target.value)} placeholder="例如: 科學園" />
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => { setShowAddActivity(false); setEditingId(null); }} className="flex-1 py-2 rounded bg-white/5 text-xs font-mono">取消</button>
                      <CyberButton 
                        onClick={() => editingId ? handleUpdateActivity(editingId, { title: actTitle, description: actDescription, date: actDate, deadlineDate: actDeadlineDate, location: actLocation, limit: actLimit }) : handleCreateActivity()} 
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
                      <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">選項 / OPTIONS</label>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white"
                            value={opt}
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
                      <button onClick={() => { setShowAddPoll(false); setEditingId(null); }} className="flex-1 py-2 rounded bg-white/5 text-xs font-mono">取消</button>
                      <CyberButton 
                        onClick={() => {
                          if (editingId) {
                            const poll = fleetData.polls.find(p => p.id === editingId);
                            handleUpdatePoll(editingId, { 
                              question: pollQuestion, 
                              options: pollOptions.map((text, i) => ({ 
                                text, 
                                votes: poll?.options[i]?.text === text ? poll.options[i].votes : 0 
                              })) 
                            });
                          } else {
                            handleCreatePoll();
                          }
                        }} 
                        className="flex-1 text-xs py-2"
                      >
                        {editingId ? '儲存更改' : '發佈投票'}
                      </CyberButton>
                    </div>
                  </div>
                </CyberCard>
              )}

              <div className="space-y-6">
                {fleetData.polls.map(poll => (
                  <CyberCard key={poll.id} className="bg-white/[0.02]">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-white pr-8">{poll.question}</h4>
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
                          <Bar dataKey="votes" fill="#CCFF00" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                      總投票數: {poll.voters.length}
                    </div>
                  </CyberCard>
                ))}
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
                  <ParkingLeafletMap parkingLots={parkingLots} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="mb-4">
                <CyberInput 
                  placeholder="搜尋車牌或車名 / SEARCH LOGS..." 
                  value={logSearch} 
                  onChange={e => setLogSearch(e.target.value)}
                />
              </div>
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
                        <div className="text-sm font-bold text-white">{plate}</div>
                        <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                          最後紀錄: {format(logs[0].timestamp.toDate(), 'yyyy-MM-dd')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-cyber-green">{logs[0].odometer.toLocaleString()} KM</div>
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
                            <CyberCard key={log.id} className="p-3 bg-white/[0.01]">
                              <div className="flex justify-between items-start mb-2">
                                <div className="text-[9px] font-mono text-white/30 uppercase">
                                  {format(log.timestamp.toDate(), 'MM-dd HH:mm')}
                                </div>
                                <div className="flex gap-1">
                                  {isEditing ? (
                                    <button onClick={() => handleUpdateLogAction(log.id, { odometer: editOdometer, cost: editCost })} className="p-1.5 bg-cyber-green text-black rounded transition-transform active:scale-95">
                                      <Download size={12} />
                                    </button>
                                  ) : (
                                    <button onClick={() => startEdit(log)} className="p-1.5 hover:bg-white/5 text-white/30 rounded transition-colors">
                                      <Edit3 size={12} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleDeleteLogAction(log.id)}
                                    className="p-1.5 hover:bg-red-500/10 text-red-500/30 rounded transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-[10px] font-mono"><span className="opacity-30">里程:</span> {isEditing ? <input type="number" value={editOdometer} onChange={e => setEditOdometer(Number(e.target.value))} className="w-full bg-white/10 rounded px-1 outline-none text-cyber-green" /> : log.odometer}</div>
                                <div className="text-[10px] font-mono text-cyber-green"><span className="opacity-30 text-white">電量:</span> {log.batteryPercent}%</div>
                                <div className="text-[10px] font-mono"><span className="opacity-30">費用:</span> {isEditing ? <input type="number" value={editCost} onChange={e => setEditCost(Number(e.target.value))} className="w-full bg-white/10 rounded px-1 outline-none text-cyber-green" /> : `$${log.cost || 0}`}</div>
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
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-white/50 mb-6">全體訊息發佈</h3>
              <CyberCard title="撰寫新訊息" className="border-cyber-green/30">
                <div className="space-y-4">
                  <CyberInput 
                    label="訊息標題" 
                    value={notifTitle} 
                    onChange={e => setNotifTitle(e.target.value)} 
                    placeholder="例如: 系統公告 / SYSTEM NOTICE"
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">訊息內容</label>
                    <textarea 
                      value={notifMessage}
                      onChange={e => setNotifMessage(e.target.value)}
                      placeholder="請輸入訊息詳情..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyber-green/50 transition-all min-h-[120px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">訊息類型</label>
                    <div className="flex gap-2">
                      {['info', 'success', 'warning', 'reminder'].map(type => (
                        <button
                          key={type}
                          onClick={() => setNotifType(type as any)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest border transition-all ${
                            notifType === type 
                              ? 'bg-cyber-green text-black border-cyber-green' 
                              : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4">
                    <CyberButton 
                      onClick={handleSendNotification} 
                      className="w-full"
                      disabled={sendingNotif || !notifTitle || !notifMessage}
                    >
                      {sendingNotif ? '發佈中...' : '發佈至全體成員 BROADCAST'}
                    </CyberButton>
                  </div>
                </div>
              </CyberCard>

              {isAdmin && (
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: '清除全體訊息',
                        message: '確定要一鍵刪除所有全體系統訊息嗎？此動作無法復原。所有成員將無法再看到這些訊息。\nDELETE ALL BROADCAST MESSAGES? THIS CANNOT BE UNDONE.',
                        variant: 'danger',
                        onConfirm: async () => {
                          await onClearSystemNotifications();
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        }
                      });
                    }}
                    className="w-full py-4 rounded-xl border border-red-500/30 bg-red-500/5 text-red-500 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    一鍵清除所有全體系統訊息 / CLEAR ALL BROADCASTS
                  </button>
                </div>
              )}

              <div className="p-10 text-center space-y-4 opacity-40">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]">
                  發佈後，所有成員將會即時收到通知。<br />
                  BROADCAST MESSAGES ARE SENT TO EVERYONE INSTANTLY.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'members' && (
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
                const userVehicles = fleetData.vehicles.filter(v => v.userId === profile.id);
                return (
                  <CyberCard key={profile.id} className="bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setSelectedMember(profile)}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {profile.photoURL ? (
                            <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="text-white/20" size={20} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {profile.displayName && profile.displayName !== '匿名用戶' ? profile.displayName : (profile.phoneNumber || '匿名用戶')}
                            {profile.role !== 'member' && (
                              <span className="text-[8px] px-1 bg-cyber-green/20 text-cyber-green border border-cyber-green/30 rounded font-mono uppercase">
                                {profile.role}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-white/30 uppercase truncate max-w-[150px]">
                            {profile.email || profile.phoneNumber} • 加入於 {profile.joinedAt ? format(profile.joinedAt.toDate(), 'yyyy-MM-dd') : '未知'}
                          </div>
                          <div className="flex gap-2 mt-1">
                            {userVehicles.map(v => (
                              <span key={v.id} className="text-[8px] px-1 bg-cyber-green/10 text-cyber-green border border-cyber-green/20 rounded font-mono">
                                {v.plate}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right" onClick={e => e.stopPropagation()}>
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
                      </div>
                    </div>
                  </CyberCard>
                );
              })}

              {sortedProfiles.length > MEMBERS_PER_PAGE && (
                <div className="flex justify-between items-center pt-4">
                  <button 
                    onClick={() => {
                      setMemberPage(p => Math.max(1, p - 1));
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
                      setMemberPage(p => Math.min(Math.ceil(sortedProfiles.length / MEMBERS_PER_PAGE), p + 1));
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
          )}

          {activeTab === 'vehicles' && (
            <motion.div
              key="vehicles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
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

              {pagedVehicles.map(v => (
                <CyberCard key={v.id} className="p-4 bg-white/[0.02]">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center text-cyber-green">
                        <Car size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{v.name}</div>
                        <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                          {v.brand} {v.model} • {v.plate || '尚未設定車牌'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mb-4 flex items-center justify-end gap-2">
                        <div className="text-right">
                          <div className="text-[8px] uppercase tracking-widest text-white/20 font-mono">擁有者 ID</div>
                          <div className="text-[10px] font-mono text-white/40">{v.userId.slice(0, 12)}...</div>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="p-2 text-red-500/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] uppercase tracking-widest text-white/20 font-mono mb-1">同步狀態</div>
                        <div className="text-[10px] font-mono text-cyber-green flex items-center gap-1 justify-end">
                          <CheckCircle2 size={10} /> 雲端同步
                        </div>
                      </div>
                    </div>
                  </div>
                </CyberCard>
              ))}

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
            </motion.div>
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
                        {getUserDetails(selectedEntity.data.participants).map(user => (
                          <div key={user.uid} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 group">
                            <div>
                              <div className="text-sm font-bold text-white">{user.name}</div>
                              <div className="text-[10px] font-mono text-white/30">{user.email}</div>
                              <div className="text-[9px] font-mono text-cyber-green mt-0.5">{user.plate} • {user.phone}</div>
                            </div>
                            <button 
                              onClick={async () => {
                                if (window.confirm('確定要移出此成員嗎？ REMOVE THIS PARTICIPANT?')) {
                                  const updatedParticipants = selectedEntity.data.participants.filter((p: string) => p !== user.uid);
                                  await onUpdateActivity(selectedEntity.data.id, { participants: updatedParticipants });
                                  setSelectedEntity({ ...selectedEntity, data: { ...selectedEntity.data, participants: updatedParticipants } });
                                }
                              }}
                              className="p-2 text-red-500/0 group-hover:text-red-500/60 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        {selectedEntity.data.participants.length === 0 && (
                          <div className="text-center py-10 opacity-20 text-xs font-mono lowercase">no participants yet</div>
                        )}
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
