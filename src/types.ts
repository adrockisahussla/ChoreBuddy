export type Recurrence = 'daily' | 'weekly' | 'once';
export type ChoreStatus = 'todo' | 'pending' | 'approved' | 'rejected';
export type RewardStatus = 'requested' | 'active' | 'archived';
export type ClaimStatus = 'pending' | 'approved' | 'denied';
export type InviteStatus = 'pending' | 'accepted';
export type RepeatMode = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Role = 'manager' | 'buddy';

export interface Chore {
  id: string;
  familyId: string;
  title: string;
  assignedTo: string;          // buddy's user-doc uid
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
  familyId: string;
  title: string;
  recurrence: Recurrence;
  points: number;
  createdAt: number;
}

export interface Reminder {
  id: string;
  familyId: string;
  title: string;
  assignedTo: string;          // buddy uid
  date: string;
  time: string;
  allDay: boolean;
  repeat: RepeatMode;
  notify: number;
  notes: string;
  createdBy: string;
  createdAt: number;
}

export interface Reward {
  id: string;
  familyId: string;
  kidId: string;               // buddy uid
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
  familyId: string;
  rewardId: string;
  kidId: string;               // buddy uid
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
  acceptedByUid?: string;
}

export interface User {
  id: string;
  uid: string;
  familyId: string;
  role: Role;
  displayName: string;
  email?: string;
  avatar?: string;
  accent?: string;
  age?: number;
  createdAt: number;
}
