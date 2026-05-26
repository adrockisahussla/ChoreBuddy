import { useEffect } from 'react';
import { useChores } from './useChores';
import { useFamilyMembers } from './useFamilyMembers';
import { useCurrentUser } from './useCurrentUser';
import { choreService } from '../services/choreService';
import { notifyChoreRejected } from '../services/notificationService';
import { enqueueToast } from '../utils/toastQueue';

/**
 * Fires a toast + system notification on the *assignee's* device when
 * one of their chores is rejected by the assigner. Mirrors the
 * approved-chore pattern: persisted `notifiedRejection` flag on the
 * chore doc so each rejection notifies exactly once (with offline
 * catch-up via the toast queue).
 *
 * Quiet bottom toast (no celebration), since rejection is bad news.
 */
export function useRejectedChoreNotifier(): void {
  const { fbUser } = useCurrentUser();
  const { chores } = useChores();
  const { members } = useFamilyMembers();
  const myUid = fbUser?.uid;

  useEffect(() => {
    if (!myUid) return;
    const targets = chores.filter(c =>
      c.status === 'rejected' &&
      c.assignedTo === myUid &&
      !c.notifiedRejection,
    );
    if (targets.length === 0) return;

    for (const chore of targets) {
      const assigner = chore.createdBy
        ? members.find(m => m.uid === chore.createdBy)
        : undefined;
      const who = assigner?.displayName || 'manager';
      const note = chore.rejectionNote ? ` — ${chore.rejectionNote}` : '';
      enqueueToast(
        `✗ ${who} rejected "${chore.title}"${note}`,
        `rejected-${chore.id}`,
      );
      notifyChoreRejected({
        choreId: chore.id,
        choreTitle: chore.title,
        rejectionNote: chore.rejectionNote || '',
        assignerName: assigner?.displayName,
      }).catch(() => { /* non-fatal */ });
      choreService.update(chore.id, { notifiedRejection: true }).catch(() => { /* swallow */ });
    }
  }, [chores, members, myUid]);
}
