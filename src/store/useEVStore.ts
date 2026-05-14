import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  limit,
  setDoc,
  deleteDoc,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Vehicle, LogEntry, UserProfile, Activity, Poll, EVNotification } from '../types';
import { format } from 'date-fns';
import { OperationType, handleFirestoreError } from '../lib/utils';

export function useEVStore() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(localStorage.getItem('evlog_selected_vehicle_id'));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [notifications, setNotifications] = useState<EVNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [fleetData, setFleetData] = useState<{ 
    vehicles: Vehicle[], 
    logs: LogEntry[], 
    activities: Activity[], 
    polls: Poll[] 
  }>({ vehicles: [], logs: [], activities: [], polls: [] });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Derive permissions
  const isRevoked = auth.currentUser?.email === 'apadrama30@gmail.com';
  const isAdmin = !isRevoked && (auth.currentUser?.email === 'jeffto135@gmail.com' || userProfile?.role === 'admin');
  const isSubAdmin = !isRevoked && (isAdmin || userProfile?.role === 'sub-admin');

  // Fetch All Profiles (Sub-Admin and above)
  useEffect(() => {
    if (!isSubAdmin || !auth.currentUser) {
      setAllProfiles([]);
      return;
    }
    const q = query(collection(db, 'userProfiles'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setAllProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });
  }, [isSubAdmin, auth.currentUser]);

  // Sync User Profile
  useEffect(() => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'userProfiles', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setUserProfile({ id: snap.id, ...snap.data() } as UserProfile);
      } else {
        setUserProfile(null);
      }
    }, (error) => {
      console.warn("Profile fetch failed:", error);
    });
    return () => unsub();
  }, [auth.currentUser?.uid]);

  // Fetch fleet data
  useEffect(() => {
    if (!isSubAdmin || !auth.currentUser) return;

    // Fleet data (Activities and Polls for any admin level)
    const aQuery = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    const unsubActivities = onSnapshot(aQuery, (snapshot) => {
      const aList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setFleetData(prev => ({ ...prev, activities: aList }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'activities');
    });

    const pQuery = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const unsubPolls = onSnapshot(pQuery, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll));
      setFleetData(prev => ({ ...prev, polls: pList }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'polls');
    });

    // Vehicles and Logs for Sub-Admin and above
    let unsubVehicles = () => {};
    let unsubLogs = () => {};

    if (isSubAdmin) {
      const vQuery = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
      unsubVehicles = onSnapshot(vQuery, (snapshot) => {
        const vList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        setFleetData(prev => ({ ...prev, vehicles: vList }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'vehicles');
      });

      const lQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(200));
      unsubLogs = onSnapshot(lQuery, (snapshot) => {
        const lList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
        setFleetData(prev => ({ ...prev, logs: lList }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'logs');
      });
    }

    return () => {
      unsubVehicles();
      unsubLogs();
      unsubActivities();
      unsubPolls();
    };
  }, [isAdmin, isSubAdmin, auth.currentUser]);

  const vehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || null;

  // Sync Activities
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'activities'), orderBy('date', 'asc'));
    return onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'activities');
    });
  }, [auth.currentUser]);

  // Sync Polls
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPolls(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'polls');
    });
  }, [auth.currentUser]);

  // Sync Notifications
  useEffect(() => {
    if (!auth.currentUser || !userProfile?.joinedAt) return;
    const uid = auth.currentUser.uid;
    const joinedAt = userProfile.joinedAt;

    const q = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [uid, 'all']),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as EVNotification));
      
      // Filter:
      // 1. If it's a broadcast ('all'), it must be created after user joined
      // 2. It must not be dismissed by the current user
      const filtered = allNotifs.filter(n => {
        const isDismissed = n.dismissedBy && n.dismissedBy.includes(uid);
        if (isDismissed) return false;

        if (n.userId === 'all') {
          const createdAt = n.createdAt?.toDate?.() || new Date(0);
          const joinDate = joinedAt.toDate?.() || new Date(0);
          return createdAt >= joinDate;
        }
        return true;
      });

      setNotifications(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
  }, [auth.currentUser, userProfile?.joinedAt]);

  // Activity Reminders
  useEffect(() => {
    if (!auth.currentUser || activities.length === 0) return;
    const uid = auth.currentUser.uid;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    activities.forEach(activity => {
      if (activity.participants.includes(uid) && activity.date === tomorrowStr) {
        // Check if reminder already exists
        const exists = notifications.find(n => 
          n.userId === uid && 
          n.type === 'reminder' && 
          n.message.includes(activity.title)
        );
        if (!exists) {
          addNotification({
            userId: uid,
            title: '活動提醒 / EVENT REMINDER',
            message: `您報名的活動「${activity.title}」將於明天舉行。`,
            type: 'reminder'
          });
        }
      }
    });
  }, [activities, notifications, auth.currentUser]);

  // Sync all user vehicles
  useEffect(() => {
    if (!auth.currentUser) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'vehicles'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vList);
      if (vList.length > 0) {
        // If the persisted ID no longer exists or none was set, fallback to the first one
        const exists = vList.some(v => v.id === selectedVehicleId);
        if (!exists) {
          setSelectedVehicleId(vList[0].id);
        }
      } else {
        setSelectedVehicleId(null);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false); // Ensure loading stops on error
      handleFirestoreError(error, OperationType.GET, 'vehicles');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Sync Logs for the selected vehicle
  useEffect(() => {
    if (!vehicle || !auth.currentUser) {
      setLogs([]);
      return;
    }

    const q = query(
      collection(db, 'logs'),
      where('userId', '==', auth.currentUser.uid),
      where('vehicleId', '==', vehicle.id),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
      setLogs(logList);
    }, (error) => {
      // Don't crash on log fetch errors, just log it
      console.warn("Log fetch failed:", error);
    });

    return () => unsubscribe();
  }, [vehicle?.id, auth.currentUser?.uid]);

  const addVehicle = async (data: Partial<Vehicle>) => {
    if (!auth.currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'vehicles'), {
        name: '',
        plate: '',
        brand: '',
        model: '',
        batteryCapacity: 0,
        lastOdometer: 0,
        lastBatteryPercent: 100,
        ...data,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vehicles');
    }
  };

  const updateVehicle = async (vehicleId: string, data: Partial<Vehicle>) => {
    try {
      await updateDoc(doc(db, 'vehicles', vehicleId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'vehicles');
    }
  };

  const addLog = async (data: { odometer: number; batteryPercent: number; cost?: number; location?: string; timestamp?: any }) => {
    if (!vehicle || !auth.currentUser) return;

    try {
      const logTimestamp = data.timestamp || Timestamp.now();
      const newDateStr = format(logTimestamp.toDate ? logTimestamp.toDate() : new Date(logTimestamp), 'yyyy-MM-dd');
      
      // Check for same day record
      const hasRecordToday = logs.some(l => 
        format(l.timestamp.toDate(), 'yyyy-MM-dd') === newDateStr
      );

      if (hasRecordToday) {
        throw new Error('今日已具備行車紀錄，無法重複新增。');
      }

      const newTimeMillis = logTimestamp.toMillis ? logTimestamp.toMillis() : logTimestamp.getTime();
      
      // Find neighbors in current logs state (sorted desc)
      const sortedLogs = [...logs].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
      const prevLog = sortedLogs.find(l => l.timestamp.toMillis() <= newTimeMillis);
      const nextLog = [...sortedLogs].reverse().find(l => l.timestamp.toMillis() > newTimeMillis);

      const distance = prevLog ? data.odometer - prevLog.odometer : 0;
      const batteryDiff = prevLog ? prevLog.batteryPercent - data.batteryPercent : 0;

      const logRef = doc(collection(db, 'logs'));
      const logId = logRef.id;

      await setDoc(logRef, {
        ...data,
        id: logId,
        vehicleId: vehicle.id,
        userId: auth.currentUser.uid,
        distance,
        batteryDiff,
        timestamp: logTimestamp,
      });

      // Update the newer record if it exists
      if (nextLog) {
        const nextDistance = nextLog.odometer - data.odometer;
        const nextBatteryDiff = data.batteryPercent - nextLog.batteryPercent;
        await updateDoc(doc(db, 'logs', nextLog.id), {
          distance: nextDistance,
          batteryDiff: nextBatteryDiff
        });
      }

      // Update vehicle if this is the newest overall
      const isNewest = !nextLog;
      if (isNewest) {
        await updateDoc(doc(db, 'vehicles', vehicle.id), {
          lastOdometer: data.odometer,
          lastBatteryPercent: data.batteryPercent,
        });
      }
      
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    }
  };

  const updateLog = async (logId: string, data: Partial<LogEntry>) => {
    try {
      await updateDoc(doc(db, 'logs', logId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'logs');
    }
  };

  const deleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'logs', logId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'logs');
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!auth.currentUser) return;
    try {
      const profileDoc = doc(db, 'userProfiles', auth.currentUser.uid);
      
      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      // Set default role if it's a new profile
      if (!userProfile?.role) {
        // Special case for hardcoded primary admin
        if (auth.currentUser.email === 'jeffto135@gmail.com') {
          updateData.role = 'admin';
        } else {
          updateData.role = 'member';
        }
      }

      // Ensure we capture user credentials from auth if they are not in the existing profile or data
      if (!userProfile?.email && auth.currentUser.email) updateData.email = auth.currentUser.email;
      if (!userProfile?.displayName && auth.currentUser.displayName) updateData.displayName = auth.currentUser.displayName;
      if (!userProfile?.photoURL && auth.currentUser.photoURL) updateData.photoURL = auth.currentUser.photoURL;
      
      // Set join date if it's a new profile
      if (!userProfile?.joinedAt) {
        updateData.joinedAt = serverTimestamp();
      }

      await setDoc(profileDoc, updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    const user = auth.currentUser;
    try {
      // 1. Delete logs
      const logsQuery = query(collection(db, 'logs'), where('userId', '==', user.uid));
      const logsSnap = await getDocs(logsQuery);
      await Promise.all(logsSnap.docs.map(d => deleteDoc(d.ref)));

      // 2. Delete vehicles
      const vehiclesQuery = query(collection(db, 'vehicles'), where('userId', '==', user.uid));
      const vehiclesSnap = await getDocs(vehiclesQuery);
      await Promise.all(vehiclesSnap.docs.map(d => deleteDoc(d.ref)));

      // 3. Delete profile
      await deleteDoc(doc(db, 'userProfiles', user.uid));

      // 4. Clear local state
      localStorage.removeItem('evlog_selected_vehicle_id');
      setSelectedVehicleId(null);

      // 5. Delete auth user
      try {
        await deleteUser(user);
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
          try {
            const provider = new GoogleAuthProvider();
            if (user.email) {
              provider.setCustomParameters({ login_hint: user.email });
            }
            await reauthenticateWithPopup(user, provider);
            localStorage.removeItem('evlog_selected_vehicle_id');
            setSelectedVehicleId(null);
            await deleteUser(user);
          } catch (reauthError: any) {
            if (reauthError.code === 'auth/user-mismatch') {
              throw new Error('重新驗證失敗：請選擇正確的帳戶進行刪除。 / RE-AUTH FAILED: Please select the correct account.');
            }
            throw reauthError;
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Account deletion failed:", error);
      throw error;
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      if (selectedVehicleId === vehicleId) {
        setSelectedVehicleId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'vehicles');
    }
  };

  const addActivity = async (data: Partial<Activity>) => {
    try {
      const docRef = await addDoc(collection(db, 'activities'), {
        ...data,
        participants: [],
        createdAt: serverTimestamp(),
      });
      // Broadcast Notification
      await addNotification({
        userId: 'all',
        title: '新活動發佈 / NEW ACTIVITY',
        message: `全新的活動「${data.title}」已經開放報名！`,
        type: 'info',
        relatedId: docRef.id,
        relatedType: 'activity'
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'activities');
    }
  };

  const updateActivity = async (id: string, data: Partial<Activity>) => {
    try {
      await updateDoc(doc(db, 'activities', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'activities');
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'activities');
    }
  };

  const registerForActivity = async (id: string) => {
    if (!auth.currentUser) return;
    const activity = activities.find(a => a.id === id);
    if (!activity || activity.participants.includes(auth.currentUser.uid)) return;
    if (activity.participants.length >= activity.limit) return;
    
    try {
      await updateDoc(doc(db, 'activities', id), {
        participants: [...activity.participants, auth.currentUser.uid]
      });
      // Personal Success Notification
      await addNotification({
        userId: auth.currentUser.uid,
        title: '成功報名 / REGISTRATION SUCCESS',
        message: `您已成功報名活動「${activity.title}」。`,
        type: 'success'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'activities');
    }
  };

  const addPoll = async (data: Partial<Poll>) => {
    try {
      const docRef = await addDoc(collection(db, 'polls'), {
        ...data,
        voters: [],
        createdAt: serverTimestamp(),
      });
      // Broadcast Notification
      await addNotification({
        userId: 'all',
        title: '新投票發佈 / NEW POLL',
        message: `「${data.question}」即時投票現已開始！`,
        type: 'info',
        relatedId: docRef.id,
        relatedType: 'poll'
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'polls');
    }
  };

  const updatePoll = async (id: string, data: Partial<Poll>) => {
    try {
      await updateDoc(doc(db, 'polls', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'polls');
    }
  };

  const deletePoll = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'polls', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'polls');
    }
  };

  const voteInPoll = async (pollId: string, optionIndex: number) => {
    if (!auth.currentUser) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.voters.includes(auth.currentUser.uid)) return;

    try {
      const newOptions = [...poll.options];
      newOptions[optionIndex].votes += 1;
      await updateDoc(doc(db, 'polls', pollId), {
        options: newOptions,
        voters: [...poll.voters, auth.currentUser.uid]
      });
      // Personal Success Notification
      await addNotification({
        userId: auth.currentUser.uid,
        title: '投票成功 / VOTE RECORDED',
        message: `您已完成「${poll.question}」的投票。`,
        type: 'success'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'polls');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!auth.currentUser) return;
    const notif = notifications.find(n => n.id === id);
    if (!notif || (notif.readBy && notif.readBy.includes(auth.currentUser.uid))) return;
    
    try {
      await updateDoc(doc(db, 'notifications', id), {
        readBy: [...(notif.readBy || []), auth.currentUser.uid]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!auth.currentUser || notifications.length === 0) return;
    const uid = auth.currentUser.uid;
    const unread = notifications.filter(n => !(n.readBy || []).includes(uid));
    
    try {
      await Promise.all(unread.map(n => 
        updateDoc(doc(db, 'notifications', n.id), {
          readBy: [...(n.readBy || []), uid]
        })
      ));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    try {
      if (notif.userId === 'all') {
        // Shared notification: just dismiss for this user
        await updateDoc(doc(db, 'notifications', id), {
          dismissedBy: [...(notif.dismissedBy || []), uid]
        });
      } else {
        // Personal notification: delete it
        await deleteDoc(doc(db, 'notifications', id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const clearAllNotifications = async () => {
    if (!auth.currentUser || notifications.length === 0) return;
    const uid = auth.currentUser.uid;
    try {
      await Promise.all(notifications.map(async (n) => {
        if (n.userId === 'all') {
          return updateDoc(doc(db, 'notifications', n.id), {
            dismissedBy: [...(n.dismissedBy || []), uid]
          });
        } else {
          return deleteDoc(doc(db, 'notifications', n.id));
        }
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const clearAllSystemNotifications = async () => {
    if (!isSubAdmin) return;
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', 'all'));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const addNotification = async (data: Partial<EVNotification>) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...data,
        readBy: [],
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const updateMemberRole = async (userId: string, role: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'userProfiles', userId), {
        role,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    }
  };

  const deleteMember = async (userId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'userProfiles', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'userProfiles');
    }
  };

  const clearAllActivities = async () => {
    if (!isAdmin) return;
    try {
      const snap = await getDocs(collection(db, 'activities'));
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'activities');
    }
  };

  const clearAllPolls = async () => {
    if (!isAdmin) return;
    try {
      const snap = await getDocs(collection(db, 'polls'));
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'polls');
    }
  };

  return {
    vehicle,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    logs,
    activities,
    polls,
    notifications,
    loading,
    isAdmin,
    isSubAdmin,
    allProfiles,
    fleetData,
    userProfile,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateLog,
    deleteLog,
    addLog,
    updateUserProfile,
    deleteAccount,
    addActivity,
    updateActivity,
    deleteActivity,
    registerForActivity,
    addPoll,
    updatePoll,
    deletePoll,
    voteInPoll,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    updateMemberRole,
    deleteMember,
    clearAllActivities,
    clearAllPolls,
    clearAllSystemNotifications,
    addNotification
  };
}
