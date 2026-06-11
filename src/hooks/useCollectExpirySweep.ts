import { useEffect, useRef } from 'react';
import { useChores } from './useChores';
import { useCurrentUser } from './useCurrentUser';
import { choreService } from '../services/choreService';
import { COLLECT_EXPIRY_MS } from '../utils/buddy';

/**
 * Sweeps approved-but-uncollected chores past the 30-day collect
 * window and stamps `forfeitedAt`. After that the chore stops counting
 * toward the kid's ready pile and no longer surfaces in the Collect
 * section.
 *
 * Runs only on manager devices to keep one writer doing the cleanup —
 * the kids' phones don't need to race for the same writes. Throttled to
 * one sweep per app launch (the effect retriggers on chore list change
 * but only acts on the first pass per session that has expirable docs).
 *
 * `completedAt` on an approved chore is the timestamp the manager
 * tapped Approve (see BuddyChoresScreen `onPressRow`), so it doubles as
 * the approval anchor here.
 */
export function useCollectExpirySweep(): void {
  const { userDoc } = useCurrentUser();
  const { chores } = useChores();
  const sweptRef = useRef(false);

  useEffect(() => {
    if (sweptRef.current) return;
    if (userDoc?.role !== 'manager') return;

    const cutoff = Date.now() - COLLECT_EXPIRY_MS;
    const expired = chores.filter(c =>
      c.status === 'approved' &&
      !c.collectedAt &&
      !c.forfeitedAt &&
      typeof c.completedAt === 'number' &&
      c.completedAt > 0 &&
      c.completedAt < cutoff,
    );
    if (expired.length === 0) return;

    sweptRef.current = true;
    (async () => {
      for (const c of expired) {
        try { await choreService.update(c.id, { forfeitedAt: Date.now() }); }
        catch { /* swallow — next launch will retry */ }
      }
    })();
  }, [chores, userDoc?.role]);
}
