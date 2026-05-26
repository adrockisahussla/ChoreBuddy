import { useEffect } from 'react';
import { useChores } from './useChores';
import { useCurrentUser } from './useCurrentUser';
import { choreService } from '../services/choreService';
import { notifyChoreApproved } from '../services/notificationService';
import { useCelebration } from '../components/Celebration';
import { chorePoints } from '../utils/buddy';

/**
 * Fires a celebration modal + system notification on the *assignee's*
 * device every time one of their chores is approved. Uses a persisted
 * `notifiedAssignee` flag on the chore doc so:
 *   • Each approval generates its own modal (no batching).
 *   • If multiple approvals happened while the user was offline, all
 *     queue and display one-after-another via CelebrationProvider.
 *   • The chore must still be COLLECTED by the kid to bank the points
 *     (see CHORE_COLLECTED). This celebration just announces the
 *     approval; the Collect button on the Done tab is where banking
 *     actually happens.
 */
export function useApprovedChoreNotifier(): void {
  const { fbUser } = useCurrentUser();
  const { chores } = useChores();
  const { celebrate } = useCelebration();
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
      celebrate({
        emoji: '🎉',
        headline: 'APPROVED — GO COLLECT!',
        subtitle: chore.title,
        count: pts,
        countLabel: pts === 1 ? 'PT WAITING' : 'PTS WAITING',
        dedupeKey: `approved-${chore.id}`,
      });
      notifyChoreApproved({
        choreId: chore.id,
        choreTitle: chore.title,
        points: pts,
      }).catch(() => { /* non-fatal */ });
      choreService.update(chore.id, { notifiedAssignee: true }).catch(() => { /* swallow */ });
    }
  }, [chores, myUid, celebrate]);
}
