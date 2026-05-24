import React, { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Reminder } from '../types';
import {
  AlarmEvent,
  getInitialAlarmEvent,
  onForegroundAlarmEvent,
} from '../services/notificationService';
import ReminderAlarm from './ReminderAlarm';

/**
 * ReminderAlarmHost: app-level mount. Handles foreground delivery and
 * cold-start launches for both reminder and chore alarms. Chore alarms
 * synthesize a Reminder-shaped object so the same overlay renders;
 * the dismiss's reminderService.markFired call no-ops harmlessly when
 * the id doesn't resolve to a real reminder doc.
 */
export default function ReminderAlarmHost() {
  const [active, setActive] = useState<Reminder | null>(null);

  useEffect(() => {
    const showEvent = async (event: AlarmEvent) => {
      try {
        if (event.kind === 'reminder') {
          const snap = await firestore().collection('reminders').doc(event.id).get();
          if (!snap.exists) return;
          const data = snap.data() as any;
          setActive({ id: snap.id, ...data });
        } else {
          const snap = await firestore().collection('chores').doc(event.id).get();
          if (!snap.exists) return;
          const data = snap.data() as any;
          // Synthesize a Reminder shape from the chore so ReminderAlarm renders.
          setActive({
            id: snap.id,
            familyId: data.familyId,
            title: event.phase === 'overdue' ? `OVERDUE: ${data.title}` : data.title,
            assignedTo: data.assignedTo,
            date: '',
            time: '',
            allDay: false,
            recurrence: 'once',
            dueDate: data.dueDate || Date.now(),
            weekOf: '',
            notes: event.phase === 'overdue' ? 'This chore is now due.' : 'Coming up soon.',
            createdBy: '',
            createdAt: 0,
          } as Reminder);
        }
      } catch (e) {
        console.warn('ReminderAlarmHost: fetch failed', e);
      }
    };

    (async () => {
      const initial = await getInitialAlarmEvent();
      if (initial) showEvent(initial);
    })();

    const unsub = onForegroundAlarmEvent(showEvent);
    return () => { try { unsub(); } catch {} };
  }, []);

  return <ReminderAlarm reminder={active} onDismiss={() => setActive(null)} />;
}
