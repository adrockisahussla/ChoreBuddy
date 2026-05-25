export type Recurrence = 'daily' | 'weekly' | 'once';
export type ChoreStatus = 'todo' | 'pending' | 'approved' | 'rejected';
export type RewardStatus = 'requested' | 'active' | 'archived';
export type ClaimStatus = 'pending' | 'approved' | 'denied';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
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
  /** For weekly recurrence — which day(s) of week (0=Sun..6=Sat). */
  weekdays?: number[];
  /** Minutes before dueDate to fire a pre-due alarm. null/undefined = none. */
  remindBeforeMinutes?: number | null;
  /** uid of the family member who created/assigned this chore. */
  createdBy?: string;
  /** True once the assigner has been notified of a submitted chore.
   *  Cleared whenever the buddy re-submits. */
  notifiedAssigner?: boolean;
  /** True once the assignee has been notified that their chore was
   *  approved. Cleared when the chore goes back to pending. */
  notifiedAssignee?: boolean;
  /** True once the assignee has been notified that this chore was
   *  newly assigned to them. Set on first surface-on-device; not
   *  cleared, since "newly assigned" only happens once per chore. */
  notifiedAssignedTo?: boolean;
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
  /** YYYY-MM-DD — date the reminder is for. */
  date: string;
  /** HH:MM (24h internal). Empty string = all-day. */
  time: string;
  allDay: boolean;
  /** Recurrence parallel to chores. once|daily|weekly. */
  recurrence: Recurrence;
  /** Epoch ms — when the reminder fires. Used for sorting + scheduling. */
  dueDate: number;
  /** ISO week (e.g. "2026-W19") — used by WeekNavigator filter. */
  weekOf: string;
  notes: string;
  createdBy: string;
  createdAt: number;
  /** Set when the reminder fires + the manager has been notified. */
  firedAt?: number;
  /** Notifee scheduled-notification id, so we can cancel on edit/delete. */
  notificationId?: string;
  /** For weekly recurrence — which day(s) of week (0=Sun..6=Sat). */
  weekdays?: number[];
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
  /** App-level UI text scale multiplier (1.0 = design size). */
  textScale?: number;
}
