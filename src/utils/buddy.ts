import { Chore, Recurrence, User } from '../types';

/** Format a buddy's display name from a user list. Falls back to the raw id. */
export const buddyLabel = (uid: string, buddies?: User[]): string => {
  if (buddies && buddies.length) {
    const b = buddies.find(x => x.uid === uid);
    if (b) return b.displayName;
  }
  // Legacy fallback for unmigrated data
  if (uid === 'Kid1') return 'Buddy 1';
  if (uid === 'Kid2') return 'Buddy 2';
  return uid;
};

export const POINTS_PER: Record<Recurrence, number> = { daily: 5, weekly: 15, once: 10 };

export const chorePoints = (c: Pick<Chore, 'points' | 'recurrence'> | null | undefined): number =>
  Number.isFinite(c?.points as number) ? (c!.points as number) : (POINTS_PER[c?.recurrence as Recurrence] || 10);

export const isOverdue = (c: Pick<Chore, 'dueDate' | 'status'> | null | undefined): boolean =>
  !!c?.dueDate && c.dueDate < Date.now() && c.status !== 'approved' && c.status !== 'pending';
