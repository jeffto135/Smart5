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
  getDoc,
  arrayUnion,
  getDocsFromCache,
  runTransaction,
  collectionGroup
} from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Vehicle, LogEntry, UserProfile, Activity, Poll, EVNotification, ParkingLot, ActivityRegistration, GroupBuy, GroupBuyRegistration, ClubPerk } from '../types';
import { format } from 'date-fns';
import { OperationType, handleFirestoreError } from '../lib/utils';
import { createAuditLog } from '../utils/logger';

export function useEVStore() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [clubPerks, setClubPerks] = useState<ClubPerk[]>([]);
  const [notifications, setNotifications] = useState<EVNotification[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
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
  const isSubAdmin = !isRevoked && (isAdmin || userProfile?.role === 'sub-admin' || userProfile?.role === 'subAdmin');

  // Unified loading state
  const isDataLoading = loading || profileLoading;

  // 🚀 [PERFORMANCE] 極速進場：非同步並行載入 (Promise.all)
  // 在偵聽器啟動的同時，先嘗試一次性抓取分頁關鍵數據，利用離線快取達到秒開
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const warmUpData = async () => {
      try {
        const uid = auth.currentUser!.uid;
        // 並行請求：車輛、關鍵通知、近期活動、投票、團購
        await Promise.all([
          getDocs(query(collection(db, 'vehicles'), where('userId', '==', uid), limit(10))),
          getDocs(query(collection(db, 'notifications'), where('userId', '==', uid), limit(10))),
          getDocs(query(collection(db, 'activities'), limit(10))),
          getDocs(query(collection(db, 'polls'), limit(5))),
          getDocs(query(collection(db, 'groupBuys'), limit(5)))
        ]);
        // 抓完後不一定要在這裡 setState，因為 onSnapshot 會緊接著利用快取觸發
        // 但完成 Promise.all 代表快取已熱，載入狀態可以提早解除
        console.log("⚡️ [效能優化] 數據預熱完成");
      } catch (err) {
        console.warn("[效能優化] 預熱失敗:", err);
      } finally {
        // 解鎖加載狀態
        // Note: Individual snapshots will still keep data fresh
        setLoading(false);
      }
    };

    warmUpData();
  }, [auth.currentUser?.uid]);

  const refreshData = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      await Promise.all([
        getDocs(query(collection(db, 'vehicles'), where('userId', '==', uid), limit(10))),
        getDocs(query(collection(db, 'notifications'), where('userId', '==', uid), limit(10))),
        getDocs(query(collection(db, 'activities'), limit(10))),
        getDocs(query(collection(db, 'polls'), limit(5))),
        getDocs(query(collection(db, 'groupBuys'), limit(5))),
        getDocs(query(collection(db, 'clubPerks'), limit(15)))
      ]);
      console.log("⚡️ [效能優化] 數據刷新預熱完成");
    } catch (err) {
      console.warn("[效能優化] 重新載入失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync User Profile
  useEffect(() => {
    if (!auth.currentUser) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const unsub = onSnapshot(doc(db, 'userProfiles', auth.currentUser.uid), async (snap) => {
      if (snap.exists()) {
        const profileData = snap.data();
        const profile = { id: snap.id, ...profileData } as UserProfile;
        setUserProfile(profile);
        
        // Sync selectedVehicleId from cloud
        if (profile.selectedVehicleId && profile.selectedVehicleId !== selectedVehicleId) {
          setSelectedVehicleId(profile.selectedVehicleId);
        }
        setProfileLoading(false);
      } else {
        // If profile doesn't exist, initialize it
        try {
          const isPrimaryAdmin = auth.currentUser.email === 'jeffto135@gmail.com';
          const initialProfile = {
            id: auth.currentUser.uid,
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            displayName: auth.currentUser.displayName || '',
            photoURL: auth.currentUser.photoURL || '',
            role: isPrimaryAdmin ? 'admin' : 'member',
            status: isPrimaryAdmin ? 'approved' : 'pending_verification',
            licensePlate: '',
            plate: '',
            mobile: '',
            phoneNumber: '',
            selectedVehicleId: null,
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(doc(db, 'userProfiles', auth.currentUser.uid), initialProfile);
          // Wait for the next onSnapshot trigger to set userProfile
        } catch (err) {
          console.error("Failed to initialize user profile on auth change:", err);
          setProfileLoading(false);
        }
      }
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
    if (!auth.currentUser) {
      setParkingLots([]);
      return;
    }
    const q = query(collection(db, 'parking_slots'), orderBy('name', 'asc'));
    return onSnapshot(q, async (snap) => {
      const lots = snap.docs.map(d => ({ id: d.id, ...d.data() } as ParkingLot));
      setParkingLots(lots);
      
      const hasPark001 = lots.some(l => l.id === 'park_001');
      const hasPark002 = lots.some(l => l.id === 'park_002');
      if (!hasPark001 || !hasPark002) {
        console.log("Seeding parking and charging slot data...");
        if (!hasPark001) {
          try {
            await setDoc(doc(db, 'parking_slots', 'park_001'), {
              name: '合和中心停車場 (灣仔)',
              region: '港島',
              address: '香港灣仔皇后大道東183號',
              lat: 22.274,
              lng: 114.172,
              difficultyTag: '輕易',
              adminNotes: '車位寬敞，新手友善。配有 Shell Recharge 120kW 快速充電樁。',
              hasCharging: true,
              chargingInfo: {
                provider: 'Shell Recharge',
                officialKw: 120,
                realKw: 95,
                rating: 4,
                note: '車位寬敞極好泊。快充速度理想，食到95kW。',
                userFeedbacks: []
              }
            });
          } catch (err) {
            console.error("Error seeding park_001:", err);
          }
        }
        if (!hasPark002) {
          try {
            await setDoc(doc(db, 'parking_slots', 'park_002'), {
              name: '秀茂坪商場停車場',
              region: '九龍',
              address: '九龍觀塘秀茂坪秀明道101號',
              lat: 22.319,
              lng: 114.232,
              difficultyTag: '地獄',
              adminNotes: '通道十分狹窄，盲位極多，拐彎需特別小心。設有 Cornerstone 中速充電設備。',
              hasCharging: true,
              chargingInfo: {
                provider: 'Cornerstone',
                officialKw: 7,
                realKw: 7,
                rating: 3,
                note: '🚨地獄級窄位，極度考驗車主技術！內置中速 7kW 慢充，僅供長停補電。',
                userFeedbacks: []
              }
            });
          } catch (err) {
            console.error("Error seeding park_002:", err);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'parking_slots');
    });
  }, [auth.currentUser]);

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
      query(collection(db, 'vehicleLogs'), orderBy('date', 'desc'), limit(500)),
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

  // Sync GroupBuys
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'groupBuys'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setGroupBuys(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupBuy)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'groupBuys');
    });
  }, [auth.currentUser]);

  // Sync ClubPerks
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'clubPerks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setClubPerks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClubPerk)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clubPerks');
    });
  }, [auth.currentUser]);

  // Sync AuditLogs - restricted to main Admin to avoid Firestore permission denied error for non-admins
  useEffect(() => {
    if (!auth.currentUser || !isAdmin) {
      setAuditLogs([]);
      return;
    }
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Audit logs subscription restricted or failed:", error);
    });
  }, [auth.currentUser, isAdmin]);

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
      collection(db, 'vehicleLogs'),
      where('userId', '==', vehicle.userId),
      orderBy('date', 'desc'),
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
  }, [vehicle?.id, vehicle?.userId, auth.currentUser?.uid]);

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

  const runPipeline = async (userId: string, vehicleId: string, plateNumber: string) => {
    try {
      const logsRef = collection(db, 'vehicleLogs');
      const q = query(
        logsRef,
        where('userId', '==', userId)
      );

      let snap;
      try {
        // 🚀 Optimistic cache-first read: Retrieve all synced vehicle records from local IndexedDB instantly (~0-5ms)
        snap = await getDocsFromCache(q);
        if (snap.empty) {
          snap = await getDocs(q);
        }
      } catch (cacheErr) {
        // Fallback to direct network query
        snap = await getDocs(q);
      }
      
      const records = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ref: docSnap.ref,
        ...docSnap.data()
      })) as any[];
      
      if (records.length === 0) return;

      // 1. Sort globally: Date, then Odo, then isChargeNode
      records.sort((a, b) => {
        const dateCompare = (a.date || "").localeCompare(b.date || "");
        if (dateCompare !== 0) return dateCompare;
        const aOdo = Number(a.odo ?? a.odometer ?? 0);
        const bOdo = Number(b.odo ?? b.odometer ?? 0);
        const odoCompare = aOdo - bOdo;
        if (odoCompare !== 0) return odoCompare;

        const nodeA = a.isChargeNode || "";
        const nodeB = b.isChargeNode || "";
        if (nodeA !== nodeB) {
          if (nodeA === "start") return -1;
          if (nodeB === "start") return 1;
          if (nodeA === "end") return 1;
          if (nodeB === "end") return -1;
        }
        return 0;
      });

      // 2. Linear traversal & smart recalculation
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      let batchSize = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        let updatedType: "charge" | "drive" = "drive";
        let updatedSegmentDiff = 0;
        let calculatedDistance = 0;
        let odoDiff = 0;

        const currentOdo = Number(record.odo ?? record.odometer ?? 0);
        const currentSoc = Number(record.soc ?? record.batteryPercent ?? 100);

        if (i === 0) {
          updatedType = "drive";
          updatedSegmentDiff = 0;
          calculatedDistance = 0;
          odoDiff = 0;
        } else {
          const prev = records[i - 1];
          const prevOdo = Number(prev.odo ?? prev.odometer ?? 0);
          const prevSoc = Number(prev.soc ?? prev.batteryPercent ?? 100);

          calculatedDistance = Math.max(0, currentOdo - prevOdo);
          odoDiff = Math.max(0, currentOdo - prevOdo);

          if (currentSoc > prevSoc) {
            updatedType = "charge";
            updatedSegmentDiff = currentSoc - prevSoc;
          } else {
            updatedType = "drive";
            updatedSegmentDiff = prevSoc - currentSoc;
          }
        }

        const isChargingBool = updatedType === "charge";
        const statusStr = isChargingBool ? "CHARGED" : "DRIVING";

        // Check if any fields changed to avoid extra Firestore write overhead
        if (
          record.type !== updatedType ||
          record.segmentDiff !== updatedSegmentDiff ||
          record.distance !== calculatedDistance ||
          record.odoDiff !== odoDiff ||
          record.isCharging !== isChargingBool ||
          record.status !== statusStr ||
          record.batteryDiff !== updatedSegmentDiff ||
          record.odo !== currentOdo ||
          record.soc !== currentSoc ||
          record.odometer !== currentOdo ||
          record.batteryPercent !== currentSoc
        ) {
          batch.update(record.ref, {
            type: updatedType,
            segmentDiff: updatedSegmentDiff,
            batteryDiff: updatedSegmentDiff,
            distance: calculatedDistance,
            odoDiff: odoDiff,
            isCharging: isChargingBool,
            status: statusStr,
            odo: currentOdo,
            soc: currentSoc,
            odometer: currentOdo,
            batteryPercent: currentSoc,
            updatedAt: serverTimestamp()
          });
          batchSize++;
        }
      }

      if (batchSize > 0) {
        await batch.commit();
        console.log(`⚡️ [Rebuild Pipeline] Sorted and synchronized ${batchSize} logs.`);
      }

      // Sync active vehicle's head statistics to the chronologically last log
      const latestRecord = records[records.length - 1];
      if (latestRecord) {
        const latestOdo = Number(latestRecord.odo ?? latestRecord.odometer ?? 0);
        const latestSoc = Number(latestRecord.soc ?? latestRecord.batteryPercent ?? 100);
        await updateDoc(doc(db, 'vehicles', vehicleId), {
          lastOdometer: latestOdo,
          lastBatteryPercent: latestSoc,
        });
      }

    } catch (err) {
      console.error("Pipeline Sync Failed:", err);
    }
  };

  const addLog = async (data: { 
    odometer: number; 
    batteryPercent: number; 
    date?: string;
    status?: string;
    cost?: number; 
    location?: string; 
    timestamp?: any;
    isCharging?: boolean;
    distance?: number;
    batteryDiff?: number;
    isDualCharge?: boolean;
    startSoc?: number;
    endSoc?: number;
  }) => {
    if (!vehicle || !auth.currentUser) return;

    try {
      const logTimestamp = data.timestamp || Timestamp.now();
      const dateStr = data.date || format(logTimestamp.toDate(), 'yyyy-MM-dd');

      if (data.isDualCharge) {
        // Dual Document Batch Commit!
        const { writeBatch, doc: fireDoc, collection: fireCollection } = await import('firebase/firestore');
        const batch = writeBatch(db);
        const logsRef = collection(db, 'vehicleLogs');

        // Document 1 (start node):
        const doc1Ref = doc(logsRef);
        const doc1Data = {
          id: doc1Ref.id,
          userId: auth.currentUser.uid,
          vehicleId: vehicle.id,
          plateNumber: vehicle.plate,
          odo: Number(data.odometer),
          soc: Number(data.startSoc ?? 50),
          odometer: Number(data.odometer),
          batteryPercent: Number(data.startSoc ?? 50),
          date: dateStr,
          status: "DRIVING",
          cost: 0, // start node represents end of previous drive, zero cost
          location: data.location || '',
          distance: 0,
          batteryDiff: 0,
          isCharging: false,
          isChargeNode: "start",
          timestamp: logTimestamp,
          createdAt: serverTimestamp()
        };
        batch.set(doc1Ref, doc1Data);

        // Document 2 (end node):
        const doc2Ref = doc(logsRef);
        const doc2Data = {
          id: doc2Ref.id,
          userId: auth.currentUser.uid,
          vehicleId: vehicle.id,
          plateNumber: vehicle.plate,
          odo: Number(data.odometer),
          soc: Number(data.endSoc ?? 100),
          odometer: Number(data.odometer),
          batteryPercent: Number(data.endSoc ?? 100),
          date: dateStr,
          status: "CHARGED",
          cost: Number(data.cost || 0), // Full cost recorded at end of charge
          location: data.location || '',
          distance: 0,
          batteryDiff: 0,
          isCharging: true,
          isChargeNode: "end",
          timestamp: Timestamp.fromMillis(logTimestamp.toMillis() + 100), // Slightly after start node for absolute safety
          createdAt: serverTimestamp()
        };
        batch.set(doc2Ref, doc2Data);

        await batch.commit();

        // Run automatic pipeline reordering & calculation
        await runPipeline(auth.currentUser.uid, vehicle.id, vehicle.plate);

        if ('vibrate' in navigator) navigator.vibrate(50);
        return { logId: doc2Ref.id, catchUpInfo: null };
      } else {
        // 🚀 Optimistic Single Write: Pre-generate log document ID offline to avoid create-then-update roundtrips!
        const logsRef = collection(db, 'vehicleLogs');
        const newLogDoc = doc(logsRef);
        const logId = newLogDoc.id;

        await setDoc(newLogDoc, {
          id: logId,
          userId: auth.currentUser.uid,
          vehicleId: vehicle.id,
          plateNumber: vehicle.plate,
          odo: Number(data.odometer),
          soc: Number(data.batteryPercent),
          odometer: Number(data.odometer),
          batteryPercent: Number(data.batteryPercent),
          date: dateStr,
          status: data.isCharging ? "CHARGED" : "DRIVING",
          cost: Number(data.cost || 0),
          location: data.location || '',
          distance: 0,
          batteryDiff: 0,
          isCharging: !!data.isCharging,
          timestamp: logTimestamp,
          createdAt: serverTimestamp()
        });

        // Run automatic pipeline reordering & calculation
        await runPipeline(auth.currentUser.uid, vehicle.id, vehicle.plate);

        if ('vibrate' in navigator) navigator.vibrate(50);
        return { logId, catchUpInfo: null };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vehicleLogs');
    }
  };

  const updateLog = async (logId: string, data: Partial<LogEntry>) => {
    try {
      const updateData: any = { ...data };
      if (data.odometer !== undefined) updateData.odo = Number(data.odometer);
      if (data.batteryPercent !== undefined) updateData.soc = Number(data.batteryPercent);
      
      await updateDoc(doc(db, 'vehicleLogs', logId), {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      if (auth.currentUser && vehicle) {
        await runPipeline(auth.currentUser.uid, vehicle.id, vehicle.plate);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'vehicleLogs');
    }
  };

  const deleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'vehicleLogs', logId));

      if (auth.currentUser && vehicle) {
        await runPipeline(auth.currentUser.uid, vehicle.id, vehicle.plate);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'vehicleLogs');
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
      
      // 🚀 Performance Optimization: Parallel Snapshot Queries
      const [logsSnap, vehiclesSnap, notifsSnap] = await Promise.all([
        getDocs(query(collection(db, 'vehicleLogs'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'vehicles'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'notifications'), where('userId', '==', uid)))
      ]);

      const batch = writeBatch(db);

      // 1. Collect all logs
      logsSnap.forEach(doc => batch.delete(doc.ref));

      // 2. Collect all vehicles
      vehiclesSnap.forEach(doc => batch.delete(doc.ref));

      // 3. Collect notifications
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

  const registerForActivity = async (id: string, plate?: string, selectedOption?: string) => {
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
        status: 'registered',
        selectedOption: selectedOption || ''
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
          qrCodeUsed: true, 
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

  const addChargingFeedback = async (lotId: string, realKw: number, rating: number, note: string, testedGun?: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("請先登入 / Please login first");
      
      const lotRef = doc(db, 'parking_slots', lotId);
      const lotSnap = await getDoc(lotRef);
      if (!lotSnap.exists()) return;
      const lotData = lotSnap.data() as ParkingLot;
      
      const currentFeedbacks = lotData.chargingInfo?.userFeedbacks || [];
      const username = user.displayName || user.email?.split('@')[0] || '車友';
      const newFeedback = {
        userId: user.uid,
        userDisplayName: username,
        realKw,
        rating,
        note: note.trim() || '',
        createdAt: Timestamp.now(),
        ...(testedGun ? { testedGun } : {})
      };
      
      const updatedFeedbacks = [...currentFeedbacks, newFeedback];
      const totalFeedbacks = updatedFeedbacks.length;
      const sumKw = updatedFeedbacks.reduce((sum, f) => sum + f.realKw, 0);
      
      const averageRealKw = Math.round(sumKw / totalFeedbacks);
      
      // Calculate utilizing the specified ratingCount and totalRatingPoints logic
      let ratingCount = lotData.chargingInfo?.ratingCount !== undefined ? lotData.chargingInfo.ratingCount : currentFeedbacks.length;
      let totalRatingPoints = lotData.chargingInfo?.totalRatingPoints !== undefined ? lotData.chargingInfo.totalRatingPoints : currentFeedbacks.reduce((sum, f) => sum + f.rating, 0);
      
      let newCalculatedRating: number | null = null;
      if (ratingCount === 0) {
        totalRatingPoints = rating;
        ratingCount = 1;
        newCalculatedRating = rating;
      } else {
        totalRatingPoints += rating;
        ratingCount += 1;
        newCalculatedRating = Math.round((totalRatingPoints / ratingCount) * 10) / 10;
      }
      
      const currentChargingInfo = lotData.chargingInfo || {
        provider: '未知',
        officialKw: realKw,
        note: '',
      };
      
      await updateDoc(lotRef, {
        chargingInfo: {
          ...currentChargingInfo,
          realKw: averageRealKw,
          rating: newCalculatedRating,
          ratingCount,
          totalRatingPoints,
          userFeedbacks: updatedFeedbacks
        }
      });
    } catch (error) {
      console.error('addChargingFeedback error:', error);
      throw error;
    }
  };

  const addPoll = async (data: Partial<Poll>) => {
    try {
      const formattedOptions = (data.options || []).map((opt, idx) => ({
        id: opt.id || `opt_${idx + 1}`,
        text: opt.text || '',
        votes: opt.votes || 0
      }));

      const docRef = await addDoc(collection(db, 'polls'), {
        title: data.title || data.question || '',
        question: data.title || data.question || '', // backward compat
        isMultiSelect: !!data.isMultiSelect,
        maxChoices: data.maxChoices || null,
        endDate: data.endDate || null,
        options: formattedOptions,
        voters: [],
        votedUserIds: [],
        createdAt: serverTimestamp(),
      });
      // Broadcast Notification
      await addNotification({
        userId: 'all',
        title: '新投票發佈 / NEW POLL',
        message: `「${data.title || data.question || ''}」即時投票現已開始！`,
        type: 'info',
        relatedId: docRef.id,
        relatedType: 'poll'
      });
      // Trigger FCM & OS Live banner broadcast
      await sendFCMBroadcast(
        '新投票發佈 / NEW POLL',
        `「${data.title || data.question || ''}」即時投票現已開始！`,
        docRef.id,
        'poll'
      );
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'polls');
    }
  };

  const updatePoll = async (id: string, data: Partial<Poll>) => {
    try {
      await updateDoc(doc(db, 'polls', id), {
        ...data,
        question: data.title || data.question // keep sync
      });
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

  const voteInPoll = async (pollId: string, selection: number | string | number[] | string[]) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    try {
      await runTransaction(db, async (transaction) => {
        const pollDocRef = doc(db, 'polls', pollId);
        const pollSnap = await transaction.get(pollDocRef);
        if (!pollSnap.exists()) {
          throw new Error('投票不存在 / POLL DOES NOT EXIST');
        }

        const pollData = pollSnap.data() as Poll;
        const votedUserIds = pollData.votedUserIds || [];
        const voters = pollData.voters || [];

        // Dual-array checks for maximum voting integrity:
        if (votedUserIds.includes(uid) || voters.includes(uid)) {
          throw new Error('您已經進行過投票了 / ALREADY VOTED');
        }

        // Convert selection to selected option IDs
        let selectedOptionIds: string[] = [];
        if (typeof selection === 'number') {
          const opt = pollData.options[selection];
          if (opt) selectedOptionIds.push(opt.id || `opt_${selection + 1}`);
        } else if (typeof selection === 'string') {
          selectedOptionIds.push(selection);
        } else if (Array.isArray(selection)) {
          selection.forEach(item => {
            if (typeof item === 'number') {
              const opt = pollData.options[item];
              if (opt) selectedOptionIds.push(opt.id || `opt_${item + 1}`);
            } else if (typeof item === 'string') {
              selectedOptionIds.push(item);
            }
          });
        }

        if (selectedOptionIds.length === 0) {
          throw new Error('未選擇任何選項 / NO SELECTION');
        }

        // Ensure max choices constraint isn't bypassed
        if (pollData.isMultiSelect && pollData.maxChoices && selectedOptionIds.length > pollData.maxChoices) {
          throw new Error(`最多只能選擇 ${pollData.maxChoices} 個選項！`);
        } else if (!pollData.isMultiSelect && selectedOptionIds.length > 1) {
          throw new Error('單選模式不允許選擇多個選項！');
        }

        const updatedOptions = pollData.options.map((opt, i) => {
          const optId = opt.id || `opt_${i + 1}`;
          if (selectedOptionIds.includes(optId)) {
            return {
              ...opt,
              id: optId,
              votes: (opt.votes || 0) + 1
            };
          }
          return {
            ...opt,
            id: optId,
            votes: opt.votes || 0
          };
        });

        transaction.update(pollDocRef, {
          options: updatedOptions,
          votedUserIds: [...votedUserIds, uid],
          voters: [...voters, uid] // backward compat
        });
      });

      // Get poll details for success notification
      const poll = polls.find(p => p.id === pollId);
      const pollTitle = poll ? (poll.title || poll.question) : '投票';

      await addNotification({
        userId: auth.currentUser.uid,
        title: '投票成功 / VOTE RECORDED',
        message: `您已完成「${pollTitle}」的投票。`,
        type: 'success'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'polls');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    
    // Strict Idempotency Check
    if (readMessagesRef.current.has(id)) return;
    
    // Optimistic Update (Frontend Authority)
    readMessagesRef.current.add(id);
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, readBy: [...(n.readBy || []), uid] } : n
    ));
    
    try {
      // Direct Cloud Write (No debounce for critical state sync)
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, {
        readBy: arrayUnion(uid)
      });
      console.log(`[Message Authority] Message ${id} successfully marked as read in Cloud Firestore.`);
    } catch (error: any) {
      console.error('[CRITICAL] Mark as read failed in Cloud:', error);
      
      // Rollback local state if sync failed to prevent false "read" promise
      readMessagesRef.current.delete(id);
      
      // Explicit Alert for tracking according to user request
      const errorMsg = error.message || 'Unknown error';
      alert(`[同步失敗] 無法更新訊息狀態至雲端: ${errorMsg}\n請檢查網路連線或權限設置。`);
      
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!auth.currentUser || notifications.length === 0) return;
    const uid = auth.currentUser.uid;
    const unread = notifications.filter(n => !(n.readBy || []).includes(uid) && !readMessagesRef.current.has(n.id));
    
    if (unread.length === 0) return;

    // 1. Optimistic Update
    const originalReadIds = new Set(readMessagesRef.current);
    unread.forEach(n => readMessagesRef.current.add(n.id));
    setNotifications(prev => prev.map(n => {
      const isUnread = unread.some(u => u.id === n.id);
      return isUnread ? { ...n, readBy: [...(n.readBy || []), uid] } : n;
    }));
    
    try {
      // 🚀 Optimize: Use Batch Write to compress multiple parallel updates into a single roundtrip payload
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), {
          readBy: arrayUnion(uid)
        });
      });
      await batch.commit();
      console.log('[Message Authority] All unread messages synchronized to Cloud.');
    } catch (error: any) {
      console.error('[CRITICAL] Bulk mark as read failed:', error);
      
      // Rollback
      readMessagesRef.current = originalReadIds;
      
      const errorMsg = error.message || 'Unknown error';
      alert(`[批量同步失敗] 無法將訊息標記為已讀: ${errorMsg}`);
      
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
      // 🚀 Optimize: Convert parallel asynchronous updates and deletes into a unified batch transaction
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const ref = doc(db, 'notifications', n.id);
        if (n.userId === 'all') {
          batch.update(ref, {
            dismissedBy: arrayUnion(uid)
          });
        } else {
          batch.delete(ref);
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const clearAllSystemNotifications = async () => {
    if (!isSubAdmin) return;
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', 'all'));
      const snap = await getDocs(q);
      
      // 🚀 Optimize: Batch systems delete requests
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
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

  const sendFCMBroadcast = async (title: string, message: string, relatedId: string, relatedType: 'poll' | 'groupBuy') => {
    try {
      const tokensSet = new Set<string>();

      // 1. Gather tokens from users
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(d => {
          const data = d.data();
          if (data.fcmToken) tokensSet.add(data.fcmToken);
          if (data.token) tokensSet.add(data.token);
        });
      } catch (e) {
        console.warn('Querying users for tokens failed:', e);
      }

      // 2. Gather tokens from userProfiles
      try {
        const userProfilesSnap = await getDocs(collection(db, 'userProfiles'));
        userProfilesSnap.forEach(d => {
          const data = d.data();
          if (data.fcmToken) tokensSet.add(data.fcmToken);
          if (data.token) tokensSet.add(data.token);
        });
      } catch (e) {
        console.warn('Querying userProfiles for tokens failed:', e);
      }

      // 3. Gather tokens from tokens subcollection group (using collectionGroup)
      try {
        const tokensSnap = await getDocs(collectionGroup(db, 'tokens'));
        tokensSnap.forEach(d => {
          const data = d.data();
          if (data.token) tokensSet.add(data.token);
          if (data.fcmToken) tokensSet.add(data.fcmToken);
        });
      } catch (e) {
        console.warn('Querying collection group tokens failed:', e);
      }

      const tokens = Array.from(tokensSet).filter(Boolean);
      console.log(`[PWA Broadcast] 找到 ${tokens.length} 個已連結的 FCM 設備 Token:`, tokens);

      if (tokens.length > 0) {
        // Direct call to FCM API legacy REST endpoint
        const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
        const payload = {
          registration_ids: tokens,
          notification: {
            title,
            body: message,
            icon: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
            badge: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
            sound: 'default'
          },
          data: {
            relatedId,
            relatedType,
            click_action: window.location.origin
          }
        };

        fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key=AIzaSyCAM2sX_OVXioieZYZG5Jyyk3gB_tLxddU' // Primary API Key matching client configuration
          },
          body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(result => console.log('FCM REST API Response:', result))
        .catch(err => console.error('FCM REST API call error:', err));
      }

      // Broadcast immediately in-app/online status stream by creating a live db broadcast doc
      await addDoc(collection(db, 'system_pushes'), {
        title,
        message,
        relatedId,
        relatedType,
        createdAt: serverTimestamp(),
        tokensCount: tokens.length
      });

    } catch (err) {
      console.error('sendFCMBroadcast error:', err);
    }
  };

  const updateMemberRole = async (userId: string, role: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'userProfiles', userId), {
        role,
        updatedAt: serverTimestamp()
      });
      // 📝 Audit log tracing
      const profile = allProfiles.find(p => p.id === userId);
      const memberPlate = profile?.plate || '未知車牌';
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      await createAuditLog(operator, 'APPROVE_MEMBER', 'users', '批准了車牌 ' + memberPlate + ' 的實名認證');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    }
  };

  const adminUpdateMemberPlate = async (userId: string, newPlate: string) => {
    if (!isAdmin) {
      throw new Error("權限不足：僅限最高管理員執行此動作 / UNAUTHORIZED");
    }
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Update user profile plate
      const profileRef = doc(db, 'userProfiles', userId);
      batch.update(profileRef, {
        plate: newPlate,
        updatedAt: serverTimestamp()
      });

      // 2. Fetch and update matching vehicle document(s) in vehicles collection
      const vehiclesSnap = await getDocs(
        query(collection(db, 'vehicles'), where('userId', '==', userId))
      );
      
      vehiclesSnap.forEach((vDoc) => {
        batch.update(vDoc.ref, {
          plate: newPlate
        });
      });

      await batch.commit();

      // 📝 Audit log tracing
      const profile = allProfiles.find(p => p.id === userId);
      const oldPlate = profile?.plate || '未知車牌';
      const operatorRole = 'admin';
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      await createAuditLog(operator, 'UPDATE_MEMBER_PLATE', 'userProfiles', `管理員修改了成員 ${profile?.displayName || userId} 的車牌從 ${oldPlate} 到 ${newPlate}`);
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

  const approvePendingMember = async (userId: string) => {
    if (!isSubAdmin) return;
    try {
      await updateDoc(doc(db, 'userProfiles', userId), {
        status: 'approved',
        updatedAt: serverTimestamp()
      });
      // 📝 Audit log tracing
      const profile = allProfiles.find(p => p.id === userId);
      const memberPlate = profile?.plate || profile?.licensePlate || '未知車牌';
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      await createAuditLog(operator, 'APPROVE_MEMBER', 'users', '批准了車籍 ' + memberPlate + ' 的實名認證');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    }
  };

  const rejectPendingMember = async (userId: string) => {
    if (!isSubAdmin) return;
    try {
      const profile = allProfiles.find(p => p.id === userId);
      const memberPlate = profile?.plate || profile?.licensePlate || '未知車牌';
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      await deleteDoc(doc(db, 'userProfiles', userId));
      await createAuditLog(operator, 'REJECT_MEMBER', 'userProfiles', `拒絕了車籍 ${memberPlate} （${profile?.displayName || userId}） 的實名認證申請`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'userProfiles');
    }
  };

  const clearAllActivities = async () => {
    if (!isAdmin) return;
    try {
      const snap = await getDocs(collection(db, 'activities'));
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'activities');
    }
  };

  const clearAllPolls = async () => {
    if (!isAdmin) return;
    try {
      const snap = await getDocs(collection(db, 'polls'));
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'polls');
    }
  };

  const addGroupBuy = async (data: Partial<GroupBuy>) => {
    if (!isSubAdmin) return;
    try {
      const docRef = await addDoc(collection(db, 'groupBuys'), {
        title: data.title || '',
        description: data.description || '',
        price: Number(data.price) || 0,
        imageUrl: data.imageUrl || '',
        status: data.status || 'active',
        targetQuantity: Number(data.targetQuantity) || 1,
        minQuantity: data.minQuantity ? Number(data.minQuantity) : null,
        maxQuantity: data.maxQuantity ? Number(data.maxQuantity) : null,
        endDate: data.endDate ? (data.endDate instanceof Timestamp ? data.endDate : Timestamp.fromDate(new Date(data.endDate))) : null,
        currentRegistrations: [],
        createdAt: serverTimestamp(),
      });
      // Broadcast Notification
      await addNotification({
        userId: 'all',
        title: '新團購市集上架 / NEW GROUP BUY',
        message: `官方團購「${data.title}」今日正式成立！立即前往認購！`,
        type: 'groupBuy',
        relatedId: docRef.id,
        relatedType: 'groupBuy',
        createdAt: serverTimestamp(),
        readBy: []
      } as any);
      // Trigger FCM & OS Live banner broadcast
      await sendFCMBroadcast(
        '新團購市集上架 / NEW GROUP BUY',
        `官方團購「${data.title}」今日正式成立！立即前往認購！`,
        docRef.id,
        'groupBuy'
      );

      // 📝 Audit log tracing
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      await createAuditLog(operator, 'UPDATE_GROUP_BUY', 'groupBuys', '修改了團購：' + (data.title || ''));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groupBuys');
    }
  };

  const updateGroupBuy = async (id: string, data: Partial<GroupBuy>) => {
    if (!isSubAdmin) return;
    try {
      await updateDoc(doc(db, 'groupBuys', id), data);

      // 📝 Audit log tracing
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      const existingGb = groupBuys.find(g => g.id === id);
      const title = data.title || existingGb?.title || '';
      await createAuditLog(operator, 'UPDATE_GROUP_BUY', 'groupBuys', '修改了團購：' + title);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'groupBuys');
    }
  };

  const deleteGroupBuy = async (id: string, hardClean: boolean = false) => {
    if (!isSubAdmin) return;
    try {
      const existingGb = groupBuys.find(g => g.id === id);
      const title = existingGb?.title || '';

      if (hardClean) {
        await deleteDoc(doc(db, 'groupBuys', id));
        // Method B: 連帶清理 notifications
        const q = query(collection(db, "notifications"), where("relatedId", "==", id));
        const querySnapshot = await getDocs(q);
        for (const docSnap of querySnapshot.docs) {
          await deleteDoc(doc(db, "notifications", docSnap.id));
        }
      } else {
        // Method A: 軟刪除
        await updateDoc(doc(db, 'groupBuys', id), { status: 'deleted' });
      }

      // 📝 Audit log tracing
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      await createAuditLog(operator, 'DELETE_GROUP_BUY', 'groupBuys', `下架/刪除了團購項目（採用${hardClean ? '物理強刪 + 通知連帶清理' : '狀態軟刪除'}）：` + title);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'groupBuys');
    }
  };

  const addClubPerk = async (data: Omit<ClubPerk, 'id' | 'createdAt'>) => {
    if (!isSubAdmin) {
      throw new Error("無權限執行此操作 / Unauthorized");
    }
    try {
      const docRef = await addDoc(collection(db, 'clubPerks'), {
        merchantName: data.merchantName,
        category: data.category,
        title: data.title,
        discountDetail: data.discountDetail,
        contact: data.contact,
        expiryDate: data.expiryDate || '',
        originalPrice: data.originalPrice !== undefined ? data.originalPrice : null,
        discountPrice: data.discountPrice !== undefined ? data.discountPrice : null,
        address: data.address || '',
        googleMapsUrl: data.googleMapsUrl || '',
        createdAt: serverTimestamp(),
      });

      // 📝 Audit log tracing
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      await createAuditLog(operator, 'CREATE_PERK', 'clubPerks', '上架了新福利：' + (data.merchantName || ''));

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clubPerks');
    }
  };

  const updateClubPerk = async (id: string, data: Partial<ClubPerk>) => {
    if (!isSubAdmin) {
      throw new Error("無權限執行此操作 / Unauthorized");
    }
    try {
      await updateDoc(doc(db, 'clubPerks', id), data);

      // 📝 Audit log tracing
      const operatorRole = isAdmin ? 'admin' : (isSubAdmin ? 'subAdmin' : 'member');
      const operator = {
        uid: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || userProfile?.email || '',
        role: operatorRole
      };
      const perk = clubPerks.find(p => p.id === id);
      const merchantName = data.merchantName || perk?.merchantName || '';
      await createAuditLog(operator, 'CREATE_PERK', 'clubPerks', '上架了新福利：' + merchantName);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clubPerks');
    }
  };

  const deleteClubPerk = async (id: string) => {
    if (!isSubAdmin) {
      throw new Error("無權限執行此操作 / Unauthorized");
    }
    try {
      await deleteDoc(doc(db, 'clubPerks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clubPerks');
    }
  };

  const registerGroupBuy = async (gbId: string, quantity: number) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const email = auth.currentUser.email || '';

    try {
      await runTransaction(db, async (transaction) => {
        const gbDocRef = doc(db, 'groupBuys', gbId);
        const gbSnap = await transaction.get(gbDocRef);
        if (!gbSnap.exists()) {
          throw new Error('團購項目不存在 / GROUP BUY DOES NOT EXIST');
        }

        const gbData = gbSnap.data() as GroupBuy;
        
        // Check if the deadline has passed
        if (gbData.endDate) {
          const endDateObj = typeof gbData.endDate.toDate === 'function' ? gbData.endDate.toDate() : new Date(gbData.endDate);
          if (new Date() > endDateObj) {
            throw new Error('⚠️ 本項目已過截止時間，認購名單已鎖定，如需協助請聯絡會長。');
          }
        }

        const currentRegs = gbData.currentRegistrations || [];

        // Check if user already registered
        const existingIdx = currentRegs.findIndex(r => r.userId === uid);
        let updatedRegs = [...currentRegs];

        if (existingIdx >= 0) {
          // Update existing
          if (quantity <= 0) {
            // If user sets qty to 0 (or cancels), remove the entry
            updatedRegs.splice(existingIdx, 1);
          } else {
            updatedRegs[existingIdx] = {
              ...updatedRegs[existingIdx],
              qty: quantity,
              updatedAt: Timestamp.now()
            };
          }
        } else {
          // Add new
          if (quantity > 0) {
            updatedRegs.push({
              userId: uid,
              email: email,
              qty: quantity,
              updatedAt: Timestamp.now()
            });
          }
        }

        // Apply maximum quantity limit check
        const maxQty = gbData.maxQuantity || 0;
        if (maxQty > 0) {
          const totalQtyAfterUpdate = updatedRegs.reduce((acc, curr) => acc + curr.qty, 0);
          if (totalQtyAfterUpdate > maxQty) {
            const otherRegsQty = currentRegs
              .filter(r => r.userId !== uid)
              .reduce((acc, curr) => acc + curr.qty, 0);
            const remaining = Math.max(0, maxQty - otherRegsQty);
            throw new Error(`認購失敗：本團最大限量為 ${maxQty} 套，當前剩餘可認購名額為 ${remaining} 套。`);
          }
        }

        transaction.update(gbDocRef, {
          currentRegistrations: updatedRegs
        });
      });

      // Show personal registration notification
      const gbObj = groupBuys.find(g => g.id === gbId);
      const gbTitle = gbObj ? gbObj.title : '團購項目';
      await addNotification({
        userId: auth.currentUser.uid,
        title: '團購登記成功 / REGISTRATION COMPLETED',
        message: quantity > 0 ? `您已登記「${gbTitle}」共 ${quantity} 套。` : `您已取消「${gbTitle}」的登記。`,
        type: 'success'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'groupBuys');
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
    groupBuys,
    auditLogs,
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
    addChargingFeedback,
    parkingLots,
    addPoll,
    updatePoll,
    deletePoll,
    voteInPoll,
    addGroupBuy,
    updateGroupBuy,
    deleteGroupBuy,
    registerGroupBuy,
    clubPerks,
    addClubPerk,
    updateClubPerk,
    deleteClubPerk,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    updateMemberRole,
    adminUpdateMemberPlate,
    deleteMember,
    approvePendingMember,
    rejectPendingMember,
    clearAllActivities,
    clearAllPolls,
    clearAllSystemNotifications,
    addNotification,
    refreshData
  };
}
