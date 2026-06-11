import { Chore, Recurrence, RewardClaim, User } from '../types';

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
  !!c?.dueDate && c.dueDate < Date.now() && c.status === 'todo';

/**
 * Canonical points breakdown for one buddy. Used by every manager-side
 * surface that shows the kid's balance so the number matches what the
 * kid actually sees in their own wallet.
 *
 *   available     = banked − pendingSpent           (spendable right now)
 *   banked        = lifetimeEarned − spent          (resting balance)
 *   ready         = uncollected approved chore pts  (kid hasn't tapped Collect yet)
 *   lifetimeEarned = collected approved chore pts
 *   spent         = sum of approved claims
 *   pendingSpent  = sum of pending claims (held until manager fulfills/denies)
 */
export interface BuddyPointsBreakdown {
  available: number;
  banked: number;
  ready: number;
  spent: number;
  pendingSpent: number;
  lifetimeEarned: number;
}

/** Window after which an approved-but-uncollected chore is forfeited.
 *  Matches the answer to the "Collect expiry" open question in the
 *  Rewards Overhaul plan. */
export const COLLECT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export const buddyPoints = (
  chores: Chore[],
  claims: RewardClaim[],
  uid: string,
): BuddyPointsBreakdown => {
  const myApproved = chores.filter(
    c => c.assignedTo === uid && c.status === 'approved' && !c.forfeitedAt,
  );
  const collected = myApproved.filter(c => !!c.collectedAt);
  const lifetimeEarned = collected.reduce((s, c) => s + chorePoints(c), 0);
  const ready = myApproved
    .filter(c => !c.collectedAt)
    .reduce((s, c) => s + chorePoints(c), 0);
  const myClaims = claims.filter(c => c.kidId === uid);
  const spent = myClaims
    .filter(c => c.status === 'approved')
    .reduce((s, c) => s + (c.cost || 0), 0);
  const pendingSpent = myClaims
    .filter(c => c.status === 'pending')
    .reduce((s, c) => s + (c.cost || 0), 0);
  const banked = lifetimeEarned - spent;
  const available = banked - pendingSpent;
  return { available, banked, ready, spent, pendingSpent, lifetimeEarned };
};
