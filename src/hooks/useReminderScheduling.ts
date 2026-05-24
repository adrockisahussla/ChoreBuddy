import { useEffect } from 'react';
import notifee from '@notifee/react-native';
import { useReminders } from './useReminders';
import { useCurrentUser } from './useCurrentUser';
import {
  scheduleReminderNotification,
  cancelReminderNotification,
} from '../services/notificationService';

/**
 * useReminderScheduling — per-device alarm sync.
 *
 * Notifee schedules notifications locally; they don't roam to other
 * devices via Firestore. That meant reminders the manager created
 * never produced an alarm on the buddy's phone — only on the manager's.
 *
 * This hook ensures every device with a signed-in user has a local
 * trigger queued for each future reminder assigned to them. The
 * notification id `reminder:<docId>` is stable, so re-running the
 * effect just refreshes the trigger in place (Notifee replaces an
 * existing trigger with the same id).
 *
 * Legacy reminders with a missing/empty assignedTo are treated as
 * "for everyone in the family" (parallel to RemindersScreen's filter)
 * so old data doesn't go silent.
 */
export function useReminderScheduling(): void {
  const { fbUser, userDoc } = useCurrentUser();
  const myUid = fbUser?.uid;
  const familyId = userDoc?.familyId;
  const { reminders } = useReminders();

  useEffect(() => {
    if (!myUid || !familyId) return;
    const now = Date.now();
    const mine = reminders.filter(r => {
      if (r.assignedTo && r.assignedTo !== myUid) return false;
      if (!r.dueDate || r.dueDate <= now) return false;
      return true;
    });

    let cancelled = false;
    (async () => {
      // Schedule everything that should fire in the future.
      for (const r of mine) {
        if (cancelled) return;
        try {
          const res = await scheduleReminderNotification({
            reminderId: r.id,
            title: r.title,
            body: '',
            fireAt: r.dueDate,
          });
          if (!res.ok && res.reason !== 'past') {
            console.warn('reminder schedule failed', r.id, res.reason);
          }
        } catch {}
      }

      // Cancel any stale triggers for reminders that no longer exist
      // (deleted) or whose due time has passed. Notifee gives us the
      // active trigger ids; ours follow the `reminder:<docId>` shape.
      try {
        const ids = await notifee.getTriggerNotificationIds();
        const validIds = new Set(mine.map(r => `reminder:${r.id}`));
        for (const id of ids) {
          if (id.startsWith('reminder:') && !validIds.has(id)) {
            await cancelReminderNotification(id);
          }
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [myUid, familyId, reminders]);
}
