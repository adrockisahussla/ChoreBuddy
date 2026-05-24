import { useEffect } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import { useChores } from './useChores';
import { useBuddies } from './useBuddies';
import { useCurrentUser } from './useCurrentUser';
import { choreService } from '../services/choreService';
import { notifyChoreSubmittedForApproval } from '../services/notificationService';

/**
 * Fires a local Notifee notification on the *assigner's* device whenever
 * a chore they created flips to status='pending'. Uses a persisted
 * `notifiedAssigner` flag on the chore doc so:
 *   • Cold-start: any pending+un-notified chore I assigned still fires
 *     (i.e. "on next sign in" works).
 *   • A second device belonging to the same user won't re-notify (the
 *     first one's write wins the race).
 *   • Buddy re-submitting a previously rejected chore re-triggers
 *     (submit() clears the flag).
 *
 * Legacy chores with no `createdBy` fall back to the old behavior:
 * notify any manager in the family.
 */
export function usePendingChoreNotifier(): void {
  const { fbUser, userDoc } = useCurrentUser();
  const { chores } = useChores();
  const { buddies } = useBuddies();
  const myUid = fbUser?.uid;
  const iAmManager = userDoc?.role === 'manager';

  useEffect(() => {
    if (!myUid) return;
    const targets = chores.filter(c => {
      if (c.status !== 'pending') return false;
      if (c.notifiedAssigner) return false;
      if (c.createdBy) return c.createdBy === myUid;
      return iAmManager; // legacy fallback
    });
    if (targets.length === 0) return;

    for (const chore of targets) {
      const buddy = buddies.find(b => b.uid === chore.assignedTo);
      const who = buddy?.displayName || 'A buddy';
      if (Platform.OS === 'android') {
        ToastAndroid.showWithGravity(
          `⏳ ${who} submitted "${chore.title}" — review it`,
          ToastAndroid.LONG,
          ToastAndroid.TOP,
        );
      }
      notifyChoreSubmittedForApproval({
        choreId: chore.id,
        choreTitle: chore.title,
        buddyName: buddy?.displayName,
      }).catch(() => { /* notification failure is non-fatal */ });
      choreService.update(chore.id, { notifiedAssigner: true }).catch(() => { /* swallow */ });
    }
  }, [chores, buddies, myUid, iAmManager]);
}
