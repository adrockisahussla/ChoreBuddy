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
  /** When the assignee tapped "Collect" to bank their points. Only
   *  collected approvals count toward the spendable points balance. */
  collectedAt?: number;
  /** When the 30-day collect window lapsed without the kid tapping
   *  Collect. Forfeited chores are kept around (so history isn't lost)
   *  but no longer surface in the Collect section and don't count toward
   *  any balance. */
  forfeitedAt?: number;
  /** True once the assignee has been notified about a rejection. Cleared
   *  by submit() so re-rejection after re-submission notifies again. */
  notifiedRejection?: boolean;
}

/** Per-kid screen-time grant template. Manager curates this catalog;
 *  kid redeems entries by trading points for minutes. */
export interface RewardPoolItem {
  id: string;
  familyId: string;
  /** Kid (buddy or co-manager) this pool entry is offered to. */
  kidId: string;
  /** Display label (e.g. "30 min screen time"). Auto-defaulted from
   *  minutes if blank. */
  label: string;
  /** Screen-time grant size in minutes. */
  minutes: number;
  /** Cost to the kid, in collected points. */
  pointsCost: number;
  createdBy: string;
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
  /** For screen-time pool redemptions: minutes the kid gets when
   *  the claim is fulfilled. Absent on legacy claims. */
  minutes?: number;
  /** True once the kid has been notified of approve/deny. */
  notifiedClaimant?: boolean;
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
  /** Screen-time wallet for this user (kid). Incremented on claim
   *  fulfillment, decremented by the firewall agent (Phase 2) or
   *  by manual manager actions (Phase 1). */
  minutesRemaining?: number;
  /** When true, signing out cancels every scheduled Notifee alarm
   *  (reminders + chore-due) so they don't ring under another user's
   *  session on the same phone. Default off — flip on in Settings if
   *  the device is shared. */
  cancelAlarmsOnSignOut?: boolean;
  /** Machine id (Windows agent doc id under `firewallControl`) the kid
   *  is bound to. When set, fulfilling a screen-time claim auto-targets
   *  this PC — manager doesn't have to pick. When unset, fulfillment
   *  falls back to "any PC paired to this kid via firewallControl.kidId"
   *  and pushes ALLOW to all of them. */
  assignedMachineId?: string;
}

/** One weekday's gameplay rule. Two modes that don't overlap:
 *    'window' — block outside [start, end], no cap inside
 *    'cap'    — anytime, but only `maxHours` total per day
 *  Old docs without `mode` are read as 'window' (back-compat). */
export interface DaySchedule {
  enabled: boolean;
  mode?: 'window' | 'cap';
  start: string;     // window mode: opens, e.g. "16:00"
  end: string;       // window mode: closes, e.g. "18:00"
  maxHours?: number; // cap mode: total hours allowed per day
}

/** A buddy's weekly GameWall schedule. Doc id === buddyUid. */
export interface GameSchedule {
  id: string;
  buddyUid: string;
  familyId: string;
  /** Keyed mon,tue,wed,thu,fri,sat,sun. */
  days: { [day: string]: DaySchedule };
  updatedAt: number;
}

export const WEEK_DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export function defaultDay(): DaySchedule {
  return { enabled: false, mode: 'window', start: '16:00', end: '18:00', maxHours: 2 };
}
