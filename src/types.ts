import { Timestamp } from 'firebase/firestore';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  brand: string;
  model: string;
  batteryCapacity: number;
  userId: string;
  lastOdometer: number;
  lastBatteryPercent: number;
  createdAt: Timestamp;
  color?: string;
  trim?: string;
}

export interface LogEntry {
  id: string;
  vehicleId: string;
  userId: string;
  plateNumber?: string;
  date?: string;
  odo?: number;
  soc?: number;
  odometer: number;
  batteryPercent: number;
  cost: number;
  location?: string;
  distance: number;
  batteryDiff: number;
  isCharging: boolean;
  efficiency?: number;
  timestamp: Timestamp;
  type?: 'charge' | 'drive';
  segmentDiff?: number;
  isChargeNode?: 'start' | 'end';
  odoDiff?: number;
}

export interface VehicleStats {
  totalSavings: number;
  efficiency: number; // kWh/100km
  rangeAchievement: number; // %
  logs: LogEntry[];
}

export type UserRole = 'admin' | 'sub-admin' | 'member';

export interface UserProfile {
  id: string;
  phoneNumber: string;
  role: UserRole;
  email?: string;
  photoURL?: string;
  displayName?: string;
  plate?: string;
  selectedVehicleId?: string | null;
  joinedAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  date: string; // Keep for backward compatibility/reference
  eventStartDate?: Timestamp; 
  eventEndDate?: Timestamp;
  location: string;
  locationCoordinates?: string;
  limit: number;
  deadlineDate?: string;
  participants: string[]; // UID array
  status: 'open' | 'closed';
  createdAt: Timestamp;
}

export interface ActivityRegistration {
  id: string; // eventId_userId
  eventId: string;
  userId: string;
  plateNumber: string;
  qrCodeUsed: boolean;
  attended: boolean;
  attendedAt?: Timestamp;
  status: 'registered' | 'cancelled';
  cancelReason?: string;
  lockoutUntil?: Timestamp;
}

export interface Feedback {
  userId: string;
  userDisplayName?: string;
  realKw: number;
  rating: number;
  createdAt: any;
  note?: string;
  testedGun?: string;
}

export interface ChargingInfo {
  provider: string;
  officialKw: number;
  realKw: number;
  rating: number | null;
  ratingCount?: number;
  totalRatingPoints?: number;
  note: string;
  userFeedbacks?: Feedback[];
}

export interface GunGroup {
  kw: number;
  gunType: 'DC 快充' | 'AC 慢充';
  count: number;
  note: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  region: '港島' | '九龍' | '新界';
  address?: string;
  lat: number;
  lng: number;
  difficultyTag?: '輕易' | '中等' | '地獄' | '不可能的任務' | null;
  adminNotes?: string;
  videoGuide?: string;
  hasCharging?: boolean;
  chargingInfo?: ChargingInfo;
  heightLimit?: string;
  difficultyNote?: string;
  chargingNote?: string;
  hasDifficulty?: boolean;
  maxKw?: number;
  totalGuns?: number;
  feeType?: 'kwh' | 'time';
  tariffs?: Array<{ timeSlot: string; price: number; unit: string }>;
  gunGroups?: GunGroup[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  question?: string; // backward compatibility
  isMultiSelect: boolean;
  maxChoices?: number;
  options: PollOption[];
  votedUserIds: string[];
  voters?: string[]; // backward compatibility
  endDate?: string;
  createdAt: Timestamp;
}

export interface EVNotification {
  id: string;
  userId: string; // "all" for broadcast or specific UID
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'reminder';
  relatedId?: string;
  relatedType?: 'activity' | 'poll' | 'groupBuy';
  createdAt: Timestamp;
  readBy: string[]; // UID array of people who read it
  dismissedBy?: string[]; // UID array of people who dismissed this
}

export interface GroupBuyRegistration {
  userId: string;
  email: string;
  qty: number;
  updatedAt: any; // Timestamp or similar
}

export interface GroupBuy {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  status: 'active' | 'closed';
  targetQuantity: number;
  currentRegistrations: GroupBuyRegistration[];
  createdAt: any; // Timestamp or similar
}

export interface ClubPerk {
  id: string;
  merchantName: string;
  category: '汽車美容' | '改裝配件' | '汽車保險' | '餐飲娛樂';
  title: string;
  discountDetail: string;
  contact: string;
  expiryDate?: string;
  createdAt: any;
}

