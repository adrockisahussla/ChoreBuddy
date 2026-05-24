import { useEffect } from 'react';
import { useChores } from './useChores';
import { useCurrentUser } from './useCurrentUser';
import { choreService } from '../services/choreService';
import { notifyChoreApproved } from '../services/notificationService';
import { enqueueToast } from '../utils/toastQueue';
import { chorePoints } from '../utils/buddy';

/**
 * Fires a toast + system notification on the *assignee's* device every
 * time one of their chores is approved. Uses a persisted
 * `notifiedAssignee` flag on the chore so:
 *   • Each approval generates its own toast (no batching).
 *   • If multiple approvals happened while the user was offline, all
 *     fire on next sign-in.
 *   • The toast queue (utils/toastQueue) paces them so none overwrite.
 *
 * Toast format: 'Your chore "<title>" has been approved! +X points earned.'
 */
export function useApprovedChoreNotifier(): void {
  const { fbUser } = useCurrentUser();
  const { chores } = useChores();
  const myUid = fbUser?.uid;

  useEffect(() => {
    if (!myUid) return;
    const targets = chores.filter(c =>
      c.status === 'approved' &&
      c.assignedTo === myUid &&
      !c.notifiedAssignee,
    );
    if (targets.length === 0) return;

    for (const chore of targets) {
      const pts = chorePoints(chore);
      enqueueToast(
        `Your chore "${chore.title}" has been approved! +${pts} points earned.`,
        `approved-${chore.id}`,
      );
      notifyChoreApproved({
        choreId: chore.id,
        choreTitle: chore.title,
        points: pts,
      }).catch(() => { /* non-fatal */ });
      choreService.update(chore.id, { notifiedAssignee: true }).catch(() => { /* swallow */ });
    }
  }, [chores, myUid]);
}
