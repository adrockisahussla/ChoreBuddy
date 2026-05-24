import { useEffect } from 'react';
import notifee from '@notifee/react-native';
import { useChores } from './useChores';
import { useCurrentUser } from './useCurrentUser';
import {
  scheduleChoreNotification,
  cancelReminderNotification,
} from '../services/notificationService';

/**
 * useChoreReminderScheduling — per-device alarm sync for chore alarms.
 *
 * For every chore assigned to the signed-in user with a future dueDate
 * and `remindBeforeMinutes` set, schedules two local Notifee triggers:
 *   `chore:<id>:pre`      — fires at (dueDate - remindBeforeMinutes*60_000)
 *   `chore:<id>:overdue`  — fires at dueDate
 *
 * Approved chores are excluded — once a chore is done, the alarms are
 * cancelled. Stale triggers (deleted or completed chores) are cleaned
 * up at the end of each sync.
 */
export function useChoreReminderScheduling(): void {
  const { fbUser, userDoc } = useCurrentUser();
  const myUid = fbUser?.uid;
  const familyId = userDoc?.familyId;
  const { chores } = useChores();

  useEffect(() => {
    if (!myUid || !familyId) return;
    const now = Date.now();
    const mine = chores.filter(c => {
      if (c.assignedTo !== myUid) return false;
      if (c.status === 'approved') return false;
      if (!c.dueDate) return false;
      if (typeof c.remindBeforeMinutes !== 'number') return false;
      return true;
    });

    let cancelled = false;
    (async () => {
      const validIds = new Set<string>();
      for (const c of mine) {
        if (cancelled) return;
        const offset = (c.remindBeforeMinutes || 0) * 60 * 1000;
        const preFireAt = c.dueDate - offset;
        const overdueFireAt = c.dueDate;
        try {
          if (offset > 0 && preFireAt > now) {
            await scheduleChoreNotification({
              choreId: c.id, phase: 'pre', title: c.title, fireAt: preFireAt,
            });
            validIds.add(`chore:${c.id}:pre`);
          }
          if (overdueFireAt > now) {
            await scheduleChoreNotification({
              choreId: c.id, phase: 'overdue', title: c.title, fireAt: overdueFireAt,
            });
            validIds.add(`chore:${c.id}:overdue`);
          }
        } catch {}
      }

      try {
        const ids = await notifee.getTriggerNotificationIds();
        for (const id of ids) {
          if (id.startsWith('chore:') && !validIds.has(id)) {
            await cancelReminderNotification(id);
          }
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [myUid, familyId, chores]);
}
