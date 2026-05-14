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
  joinedAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  location: string;
  limit: number;
  participants: string[]; // UID array
  status: 'open' | 'closed';
  createdAt: Timestamp;
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
