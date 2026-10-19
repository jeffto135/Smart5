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

export type RecordType = 'driving' | 'charging' | 'maintenance' | 'parking' | 'accessory' | 'other';

export interface RecordItem {
  id: string;
  userId: string;
  vehicleId?: string;
  plateNumber?: string;
  type: RecordType;
  amountHKD: number;
  kwhAdded?: number;
  location?: string;
  recordDate: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
  odometer?: number;
  startSoc?: number;
  endSoc?: number;
  odoKM?: number;
  currentSOC?: number;
  consumption?: number;
  tripKM?: number;
  deltaSOC?: number;
  calculatedConsumption?: string;
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
  licensePlate?: string;
  mobile?: string;
  status?: string;
  selectedVehicleId?: string | null;
  joinedAt?: Timestamp;
  updatedAt: Timestamp;
  lastMaintenanceKM?: number;
  lastMaintenanceDate?: Timestamp | null;
  licenseExpiryDate?: Timestamp | null;
  insuranceExpiryDate?: Timestamp | null;
  currentODO?: number;
  baseSOC?: number;
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
  hasCustomOptions?: boolean;
  customOptionsTitle?: string;
  customOptionsTemplate?: string[];
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
  selectedOption?: string;
}

export interface Feedback {
  userId: string;
  userDisplayName?: string;
  realKw: number;
  rating: number;
  createdAt: any;
  note?: string;
  testedGun?: string;
  reportedDifficulty?: ParkingLotDifficulty;
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

export type ParkingLotDifficulty = '未有回報' | '輕易' | '中等' | '地獄' | '不可能的任務' | null;

export interface ParkingLot {
  id: string;
  name: string;
  region: '港島' | '九龍' | '新界';
  address?: string;
  lat: number;
  lng: number;
  difficultyTag?: ParkingLotDifficulty;
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

  // 泊車收費資訊
  hourlyRateWeekday?: number; // 平日時租 (HKD)
  hourlyRateWeekend?: number; // 假日時租 (HKD)
  parkingDiscountNote?: string; // 泊車優惠備忘

  // 充電設施與費用
  chargingProvider?: string; // 充電商名稱 (如 The Point、Evoasis)
  chargingPriceNote?: string; // 充電收費 (如 HK$ 2.33/kWh 或 免費)
  idleFeeNote?: string; // 逾時佔位費 (如 HK$ 5/分鐘)
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
  type: 'info' | 'success' | 'alert' | 'reminder' | 'groupBuy' | 'poll' | 'activity';
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
  pickupStatus?: 'pending' | 'picked_up';
  paymentStatus?: 'unpaid' | 'paid';
  pickupPin?: string;
}

export interface GroupBuy {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  status: 'active' | 'closed';
  targetQuantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  endDate?: any; // Timestamp or similar
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
  originalPrice?: number | null;
  discountPrice?: number;
  address?: string;
  googleMapsUrl?: string;
  createdAt: any;
}

