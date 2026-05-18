import { useState, useEffect, useRef } from 'react';
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
  getDocs,
  arrayUnion
} from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Vehicle, LogEntry, UserProfile, Activity, Poll, EVNotification, ParkingLot, ActivityRegistration } from '../types';
import { format } from 'date-fns';
import { OperationType, handleFirestoreError } from '../lib/utils';

export function useEVStore() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [notifications, setNotifications] = useState<EVNotification[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [fleetData, setFleetData] = useState<{ 
    vehicles: Vehicle[], 
    logs: LogEntry[], 
    activities: Activity[], 
    polls: Poll[],
    registrations: ActivityRegistration[]
  }>({ vehicles: [], logs: [], activities: [], polls: [], registrations: [] });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Local state lock for unread status bounce fix and frontend authority
  const readMessagesRef = useRef<Set<string>>(new Set());
  const isUpdatingRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Derive permissions
  const isRevoked = auth.currentUser?.email === 'apadrama30@gmail.com';
  const isAdmin = !isRevoked && (auth.currentUser?.email === 'jeffto135@gmail.com' || userProfile?.role === 'admin');
  const isSubAdmin = !isRevoked && (isAdmin || userProfile?.role === 'sub-admin');

  // Unified loading state
  const isDataLoading = loading || profileLoading;

  // Sync User Profile
  useEffect(() => {
    if (!auth.currentUser) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const unsub = onSnapshot(doc(db, 'userProfiles', auth.currentUser.uid), (snap) => {
      const profileData = snap.data();
      if (snap.exists()) {
        const profile = { id: snap.id, ...profileData } as UserProfile;
        setUserProfile(profile);
        
        // Sync selectedVehicleId from cloud
        if (profile.selectedVehicleId && profile.selectedVehicleId !== selectedVehicleId) {
          setSelectedVehicleId(profile.selectedVehicleId);
        }
      } else {
        setUserProfile(null);
      }
      setProfileLoading(false);
    }, (error) => {
      console.warn("Profile fetch failed:", error);
      setProfileLoading(false);
    });
    return () => unsub();
  }, [auth.currentUser?.uid]);

  // fetch all profiles
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

  // Sync Parking Lots
  useEffect(() => {
    const q = query(collection(db, 'parking_slots'), orderBy('name', 'asc'));
    return onSnapshot(q, (snap) => {
      setParkingLots(snap.docs.map(d => ({ id: d.id, ...d.data() } as ParkingLot)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'parking_slots');
    });
  }, []);

  // Fetch Fleet Data (Admins)
  useEffect(() => {
    if (!isSubAdmin || !auth.currentUser) {
      setFleetData({ vehicles: [], logs: [], activities: [], polls: [], registrations: [] });
      return;
    }

    // Use onSnapshot for real-time updates and local cache benefits
    const unsubActivities = onSnapshot(
      query(collection(db, 'activities'), orderBy('createdAt', 'desc')),
      (snap) => {
        setFleetData(prev => ({ ...prev, activities: snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)) }));
      }
    );

    const unsubPolls = onSnapshot(
      query(collection(db, 'polls'), orderBy('createdAt', 'desc')),
      (snap) => {
        setFleetData(prev => ({ ...prev, polls: snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll)) }));
      }
    );

    const unsubVehicles = onSnapshot(
      query(collection(db, 'vehicles'), orderBy('createdAt', 'desc')),
      (snap) => {
        setFleetData(prev => ({ ...prev, vehicles: snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)) }));
      }
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(500)),
      (snap) => {
        setFleetData(prev => ({ ...prev, logs: snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry)) }));
      }
    );

    const unsubRegs = onSnapshot(
      query(collection(db, 'registrations')),
      (snap) => {
        setFleetData(prev => ({ ...prev, registrations: snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityRegistration)) }));
      }
    );

    return () => {
      unsubActivities();
      unsubPolls();
      unsubVehicles();
      unsubLogs();
      unsubRegs();
    };
  }, [isSubAdmin, auth.currentUser]);

  const vehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || null;

  // Sync current vehicle plate to user profile
  useEffect(() => {
    if (auth.currentUser && vehicle && vehicle.plate !== userProfile?.plate) {
      updateUserProfile({ plate: vehicle.plate });
    }
  }, [vehicle?.plate, userProfile?.plate, auth.currentUser?.uid]);
  const updateSelectedVehicle = async (id: string | null) => {
    setSelectedVehicleId(id);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'userProfiles', auth.currentUser.uid), {
          selectedVehicleId: id
        }, { merge: true });
      } catch (error) {
        console.warn("Failed to sync vehicle selection:", error);
      }
    }
  };

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

    const unsub = onSnapshot(q, { includeMetadataChanges: false }, (snap) => {
      // 1. Snapshot Validation: Only handle real data from server
      if (snap.metadata.hasPendingWrites) return;

      const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as EVNotification));
      
      // 2. Filter & Union State Logic (Frontend Authority)
      const filtered = allNotifs.filter(n => {
        const isDismissed = n.dismissedBy && n.dismissedBy.includes(uid);
        if (isDismissed) return false;

        if (n.userId === 'all') {
          const createdAt = n.createdAt?.toDate?.() || new Date(0);
          const joinDate = joinedAt.toDate?.() || new Date(0);
          return createdAt >= joinDate;
        }
        return true;
      }).map(n => {
        // Rule 3: Absolute Frontend Authority (Union State)
        // If local cache says it's read, FORCE it to be read regardless of Firestore data
        const isLocallyRead = readMessagesRef.current.has(n.id);
        const readBy = n.readBy || [];
        
        if (isLocallyRead && !readBy.includes(uid)) {
          return { ...n, readBy: [...readBy, uid] };
        }
        
        // Also update local cache if Firestore says it's read
        if (readBy.includes(uid)) {
          readMessagesRef.current.add(n.id);
        }
        
        return n;
      });

      setNotifications(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsub();
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

  const addLog = async (data: { 
    odometer: number; 
    batteryPercent: number; 
    cost?: number; 
    location?: string; 
    timestamp?: any;
    isCharging?: boolean;
    distance?: number;
    batteryDiff?: number;
  }) => {
    if (!vehicle || !auth.currentUser) return;

    try {
      const logTimestamp = data.timestamp || Timestamp.now();
      const newTimeMillis = logTimestamp.toMillis ? logTimestamp.toMillis() : logTimestamp.getTime();
      
      // 1. Precise Query for Previous Record (closest to input date)
      const prevQuery = query(
        collection(db, 'logs'),
        where('vehicleId', '==', vehicle.id),
        where('timestamp', '<', logTimestamp),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const prevSnap = await getDocs(prevQuery);
      const prevLog = prevSnap.docs.length > 0 ? prevSnap.docs[0].data() as LogEntry : null;

      // 2. Precise Query for Next Record (closest future record)
      const nextQuery = query(
        collection(db, 'logs'),
        where('vehicleId', '==', vehicle.id),
        where('timestamp', '>', logTimestamp),
        orderBy('timestamp', 'asc'),
        limit(1)
      );
      const nextSnap = await getDocs(nextQuery);
      const nextLog = nextSnap.docs.length > 0 ? { id: nextSnap.docs[0].id, ...nextSnap.docs[0].data() } as LogEntry : null;

      // 3. Logic based on prev records (if not provided by form)
      const isCharging = data.isCharging !== undefined ? data.isCharging : (prevLog ? data.batteryPercent > prevLog.batteryPercent : false);
      const distance = data.distance !== undefined ? data.distance : (prevLog ? data.odometer - prevLog.odometer : 0);
      const batteryDiff = data.batteryDiff !== undefined ? data.batteryDiff : (prevLog 
        ? (isCharging ? data.batteryPercent - prevLog.batteryPercent : prevLog.batteryPercent - data.batteryPercent)
        : 0);

      const logRef = doc(collection(db, 'logs'));
      const logId = logRef.id;

      await setDoc(logRef, {
        ...data,
        id: logId,
        vehicleId: vehicle.id,
        userId: auth.currentUser.uid,
        distance: Math.max(0, distance),
        batteryDiff: Math.max(0, batteryDiff),
        isCharging,
        timestamp: logTimestamp,
      });

      // 4. Update the newer record if it exists (recalculate its stats relative to new log)
      if (nextLog) {
        const nextDistance = nextLog.odometer - data.odometer;
        const nextIsCharging = nextLog.batteryPercent > data.batteryPercent;
        const nextBatteryDiff = nextIsCharging 
          ? nextLog.batteryPercent - data.batteryPercent 
          : data.batteryPercent - nextLog.batteryPercent;
          
        await updateDoc(doc(db, 'logs', nextLog.id), {
          distance: Math.max(0, nextDistance),
          batteryDiff: Math.max(0, nextBatteryDiff),
          isCharging: nextIsCharging
        });
      }

      // 5. Update vehicle if this is the newest overall
      if (!nextLog) {
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
    const uid = user.uid;

    setLoading(true);
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Collect all logs
      const logsQuery = query(collection(db, 'logs'), where('userId', '==', uid));
      const logsSnap = await getDocs(logsQuery);
      logsSnap.forEach(doc => batch.delete(doc.ref));

      // 2. Collect all vehicles
      const vehiclesQuery = query(collection(db, 'vehicles'), where('userId', '==', uid));
      const vehiclesSnap = await getDocs(vehiclesQuery);
      vehiclesSnap.forEach(doc => batch.delete(doc.ref));

      // 3. Collect notifications
      const notifsQuery = query(collection(db, 'notifications'), where('userId', '==', uid));
      const notifsSnap = await getDocs(notifsQuery);
      notifsSnap.forEach(doc => batch.delete(doc.ref));

      // 4. User profile
      batch.delete(doc(db, 'userProfiles', uid));

      // Execute batch deletion
      await batch.commit();

      // 5. Auth deletion (must be after data deletion success)
      try {
        await deleteUser(user);
      } catch (authError: any) {
        if (authError.code === 'auth/requires-recent-login') {
          const provider = new GoogleAuthProvider();
          if (user.email) provider.setCustomParameters({ login_hint: user.email });
          await reauthenticateWithPopup(user, provider);
          await deleteUser(user);
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      throw error;
    } finally {
      // Force UI reset even on partial failure
      setTimeout(() => {
        setVehicles([]);
        setLogs([]);
        setSelectedVehicleId(null);
        localStorage.removeItem('evlog_selected_vehicle_id');
        setLoading(false);
      }, 100);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      if (selectedVehicleId === vehicleId) {
        await updateSelectedVehicle(null);
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
      const current = activities.find(a => a.id === id);
      
      // Detect changes in critical fields
      const dateChanged = data.date !== undefined && current?.date !== data.date;
      const locationChanged = data.location !== undefined && current?.location !== data.location;
      
      // Timestamp comparisons
      const startChanged = data.eventStartDate !== undefined && 
        (!current?.eventStartDate || current.eventStartDate.toMillis() !== data.eventStartDate.toMillis());
      const endChanged = data.eventEndDate !== undefined && 
        (!current?.eventEndDate || current.eventEndDate.toMillis() !== data.eventEndDate.toMillis());
      
      const shouldNotify = (dateChanged || locationChanged || startChanged || endChanged) && 
                           current && current.participants && current.participants.length > 0;

      await updateDoc(doc(db, 'activities', id), data);

      if (shouldNotify) {
        await Promise.all(current.participants.map(uid => 
          addNotification({
            userId: uid,
            title: '活動資訊更動 / ACTIVITY UPDATE',
            message: `您報名的活動「${current.title}」之時間、日期或地點已更新，請進入活動詳情查看最新資訊。`,
            type: 'alert',
            relatedId: id,
            relatedType: 'activity'
          })
        ));
      }
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

  const registerForActivity = async (id: string, plate?: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    
    // 1. Is it a past activity for registration?
    const now = new Date();
    let regDeadline: Date;
    
    if (activity.deadlineDate) {
      // Deadline date: stop at end of that day
      regDeadline = new Date(activity.deadlineDate + 'T23:59:59');
    } else {
      // No deadline date: stop at event end time
      regDeadline = activity.eventEndDate?.toDate() || new Date(activity.date + 'T23:59:59');
    }

    if (now > regDeadline) {
      throw new Error('活動報名已截止 / REGISTRATION CLOSED');
    }

    if (activity.participants.includes(uid)) return;
    if (activity.participants.length >= activity.limit) return;
    
    try {
      const regId = `${id}_${uid}`;
      const regDoc = doc(db, 'registrations', regId);
      const { getDoc } = await import('firebase/firestore');
      const snap = await getDoc(regDoc);
      
      if (snap.exists()) {
        const existingData = snap.data() as ActivityRegistration;
        if (existingData.lockoutUntil && existingData.lockoutUntil.toDate() > now) {
          const lockoutTime = format(existingData.lockoutUntil.toDate(), 'yyyy-MM-dd HH:mm');
          throw new Error(`系統鎖定中 / LOCKOUT: 取消後需等待至 ${lockoutTime} 後才可重新報名。`);
        }
      }

      const regData: ActivityRegistration = {
        id: regId,
        eventId: id,
        userId: uid,
        plateNumber: plate || '未知',
        qrCodeUsed: false,
        attended: false,
        status: 'registered'
      };

      await Promise.all([
        updateDoc(doc(db, 'activities', id), {
          participants: arrayUnion(uid)
        }),
        setDoc(doc(db, 'registrations', regId), regData, { merge: true })
      ]);

      // Personal Success Notification
      await addNotification({
        userId: auth.currentUser.uid,
        title: '成功報名 / REGISTRATION SUCCESS',
        message: `您已成功報名活動「${activity.title}」。請在活動中使用 QR Code 簽到。`,
        type: 'success'
      });
    } catch (error: any) {
      if (error.message.includes('LOCKOUT') || error.message.includes('ENDED')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, 'activities');
      throw error;
    }
  };

  const cancelActivityRegistration = async (eventId: string, reason: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const regId = `${eventId}_${uid}`;
    const activity = activities.find(a => a.id === eventId);
    
    try {
      const { arrayRemove } = await import('firebase/firestore');
      const lockoutTime = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
      
      await Promise.all([
        updateDoc(doc(db, 'registrations', regId), {
          status: 'cancelled',
          cancelReason: reason,
          qrCodeUsed: true, // Invalidate QR code
          lockoutUntil: lockoutTime
        }),
        updateDoc(doc(db, 'activities', eventId), {
          participants: arrayRemove(uid)
        }),
        addNotification({
          userId: uid,
          title: '報名已取消 / REGISTRATION CANCELLED',
          message: `您已取消活動「${activity?.title || '相關活動'}」的報名。系統冷卻鎖已啟動，24小時內無法再次報名。`,
          type: 'alert'
        })
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'registrations');
      throw error;
    }
  };

  const adminRestoreRegistration = async (eventId: string, userId: string) => {
    if (!isSubAdmin) return;
    const regId = `${eventId}_${userId}`;
    const activity = fleetData.activities.find(a => a.id === eventId);
    
    try {
      await Promise.all([
        updateDoc(doc(db, 'registrations', regId), {
          status: 'registered',
          qrCodeUsed: false,
          lockoutUntil: null,
          cancelReason: null
        }),
        updateDoc(doc(db, 'activities', eventId), {
          participants: arrayUnion(userId)
        }),
        addNotification({
          userId: userId,
          title: '報名已恢復 / REGISTRATION RESTORED',
          message: `管理員已手動恢復您在活動「${activity?.title || '相關活動'}」的報名。`,
          type: 'success'
        })
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'registrations');
      throw error;
    }
  };

  const deleteRegistration = async (regId: string, userId: string, eventId: string) => {
    try {
      const { arrayRemove } = await import('firebase/firestore');
      const activity = activities.find(a => a.id === eventId) || fleetData.activities.find(a => a.id === eventId);
      
      await Promise.all([
        deleteDoc(doc(db, 'registrations', regId)),
        updateDoc(doc(db, 'activities', eventId), {
          participants: arrayRemove(userId)
        }),
        // Notify the user their registration was removed
        addNotification({
          userId: userId,
          title: '活動報名變動 / REGISTRATION UPDATE',
          message: `管理員已移除您在活動「${activity?.title || '相關活動'}」的報名。如有疑問請聯絡管理員。`,
          type: 'info'
        })
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'registrations');
      throw error; // Re-throw to handle in UI
    }
  };

  const updateRegistration = async (regId: string, data: Partial<ActivityRegistration>) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'registrations');
    }
  };

  const addParkingLot = async (data: Partial<ParkingLot>) => {
    try {
      const docRef = await addDoc(collection(db, 'parking_slots'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'parking_slots');
    }
  };

  const updateParkingLot = async (id: string, data: Partial<ParkingLot>) => {
    try {
      await updateDoc(doc(db, 'parking_slots', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'parking_slots');
    }
  };

  const deleteParkingLot = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'parking_slots', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'parking_slots');
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
    const uid = auth.currentUser.uid;
    
    // Rule 2 & 4: Strict Idempotency & Debounce
    if (readMessagesRef.current.has(id) || isUpdatingRef.current.has(id)) return;
    
    // Optimistic Logic (Frontend Authority)
    readMessagesRef.current.add(id);
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, readBy: [...(n.readBy || []), uid] } : n
    ));
    
    // Rule 4: Debounce the Firestore write
    if (debounceTimerRef.current[id]) clearTimeout(debounceTimerRef.current[id]);
    
    debounceTimerRef.current[id] = setTimeout(async () => {
      isUpdatingRef.current.add(id);
      try {
        await updateDoc(doc(db, 'notifications', id), {
          readBy: arrayUnion(uid)
        });
      } catch (error) {
        console.error('Mark as read failed:', error);
        // Rollback local cache only on critical failure or if re-read is needed
        // but technical mandate says "Frontend Authority", so we stay read in UI
        handleFirestoreError(error, OperationType.UPDATE, 'notifications');
      } finally {
        isUpdatingRef.current.delete(id);
        delete debounceTimerRef.current[id];
      }
    }, 300); // 300ms debounce
  };

  const markAllNotificationsAsRead = async () => {
    if (!auth.currentUser || notifications.length === 0) return;
    const uid = auth.currentUser.uid;
    const unread = notifications.filter(n => !(n.readBy || []).includes(uid) && !readMessagesRef.current.has(n.id));
    
    if (unread.length === 0) return;

    // 1. Local State Lock & Optimistic Update
    unread.forEach(n => readMessagesRef.current.add(n.id));
    setNotifications(prev => prev.map(n => {
      const isUnread = unread.some(u => u.id === n.id);
      return isUnread ? { ...n, readBy: [...(n.readBy || []), uid] } : n;
    }));
    
    try {
      await Promise.all(unread.map(n => 
        updateDoc(doc(db, 'notifications', n.id), {
          readBy: arrayUnion(uid)
        })
      ));
    } catch (error) {
      console.error('Mark all as read failed:', error);
      unread.forEach(n => readMessagesRef.current.delete(n.id));
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
    setSelectedVehicleId: updateSelectedVehicle,
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
    profileLoading,
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
    cancelActivityRegistration,
    adminRestoreRegistration,
    updateRegistration,
    deleteRegistration,
    addParkingLot,
    updateParkingLot,
    deleteParkingLot,
    parkingLots,
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
