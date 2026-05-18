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
}

export interface LogEntry {
  id: string;
  vehicleId: string;
  userId: string;
  odometer: number;
  batteryPercent: number;
  cost: number;
  location?: string;
  distance: number;
  batteryDiff: number;
  isCharging: boolean;
  efficiency?: number;
  timestamp: Timestamp;
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

export interface ParkingLot {
  id: string;
  name: string;
  region: '港島' | '九龍' | '新界';
  address?: string;
  lat: number;
  lng: number;
  difficultyTag: '輕易' | '中等' | '地獄' | '不可能的任務';
  adminNotes?: string;
  videoGuide?: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  voters: string[]; // UID array
  createdAt: Timestamp;
}

export interface EVNotification {
  id: string;
  userId: string; // "all" for broadcast or specific UID
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'reminder';
  relatedId?: string;
  relatedType?: 'activity' | 'poll';
  createdAt: Timestamp;
  readBy: string[]; // UID array of people who read it
  dismissedBy?: string[]; // UID array of people who dismissed this
}
