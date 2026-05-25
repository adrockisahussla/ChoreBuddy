import { useEffect } from 'react';
import { useChores } from './useChores';
import { useFamilyMembers } from './useFamilyMembers';
import { useCurrentUser } from './useCurrentUser';
import { choreService } from '../services/choreService';
import { notifyChoreAssigned } from '../services/notificationService';
import { enqueueToast } from '../utils/toastQueue';
import { chorePoints } from '../utils/buddy';

/** Don't retroactively toast for chores assigned weeks ago when this hook
 *  first ships — only fire for genuinely recent assignments. */
const FRESHNESS_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Fires a toast + system notification on the *assignee's* device when a
 * chore is newly assigned to them. Uses the persisted `notifiedAssignedTo`
 * flag on the chore doc so each chore notifies exactly once. The 48h
 * createdAt freshness gate prevents a flood of toasts the first time a
 * user opens a build that includes this hook — older chores are silently
 * marked as notified.
 *
 * Toast format: 'New chore: "<title>" from <assigner> · +<N> pts'
 */
export function useAssignedChoreNotifier(): void {
  const { fbUser } = useCurrentUser();
  const { chores } = useChores();
  const { members } = useFamilyMembers();
  const myUid = fbUser?.uid;

  useEffect(() => {
    if (!myUid) return;
    const now = Date.now();
    const candidates = chores.filter(c =>
      c.status === 'todo' &&
      c.assignedTo === myUid &&
      !c.notifiedAssignedTo,
    );
    if (candidates.length === 0) return;

    for (const chore of candidates) {
      const fresh = (chore.createdAt || 0) > now - FRESHNESS_WINDOW_MS;
      if (fresh) {
        const assigner = chore.createdBy
          ? members.find(m => m.uid === chore.createdBy)
          : undefined;
        const pts = chorePoints(chore);
        const whoSuffix = assigner?.displayName ? ` from ${assigner.displayName}` : '';
        enqueueToast(
          `📋 New chore: "${chore.title}"${whoSuffix} · +${pts} pts`,
          `assigned-${chore.id}`,
        );
        notifyChoreAssigned({
          choreId: chore.id,
          choreTitle: chore.title,
          points: pts,
          assignerName: assigner?.displayName,
        }).catch(() => { /* non-fatal */ });
      }
      // Mark even legacy/stale ones as notified so they never fire on a future tick.
      choreService.update(chore.id, { notifiedAssignedTo: true })
        .catch(() => { /* swallow */ });
    }
  }, [chores, members, myUid]);
}
