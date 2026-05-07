export type Recurrence = 'daily' | 'weekly' | 'once';
export type ChoreStatus = 'todo' | 'pending' | 'approved' | 'rejected';
export type RewardStatus = 'requested' | 'active' | 'archived';
export type ClaimStatus = 'pending' | 'approved' | 'denied';
export type InviteStatus = 'pending' | 'accepted';
export type RepeatMode = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Role = 'manager' | 'buddy';

export interface Chore {
  id: string;
  title: string;
  assignedTo: string;
  status: ChoreStatus;
  rejectionNote: string;
  recurrence: Recurrence;
  dueDate: number;
  weekOf: string;
  points?: number;
  completedAt: number;
  overdue: boolean;
  createdAt: number;
}

export interface ChorePoolItem {
  id: string;
  title: string;
  recurrence: Recurrence;
  points: number;
  createdAt: number;
}

export interface Reminder {
  id: string;
  title: string;
  assignedTo: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm or '' for all-day
  allDay: boolean;
  repeat: RepeatMode;
  notify: number;        // minutes before
  notes: string;
  createdBy: string;
  createdAt: number;
}

export interface Reward {
  id: string;
  kidId: string;
  title: string;
  description: string;
  cost: number;
  suggestedCost: number;
  status: RewardStatus;
  createdBy: string;
  createdAt: number;
  approvedAt?: number;
}

export interface RewardClaim {
  id: string;
  rewardId: string;
  kidId: string;
  rewardTitle: string;
  cost: number;
  status: ClaimStatus;
  claimedAt: number;
  resolvedAt?: number;
}

export interface Invite {
  id: string;
  token: string;
  suggestedName: string;
  role: Role;
  email?: string;
  avatar?: string;
  age?: number | null;
  familyId: string;
  expiresAt: number;
  createdAt: number;
  status: InviteStatus;
  acceptedAt?: number;
}

export interface User {
  id: string;
  uid: string;            // Firebase Auth UID
  familyId: string;
  role: Role;
  displayName: string;
  email?: string;
  avatar?: string;
  createdAt: number;
}
