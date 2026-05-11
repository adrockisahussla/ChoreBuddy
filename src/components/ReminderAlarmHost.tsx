import React, { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Reminder } from '../types';
import { onForegroundReminderEvent } from '../services/notificationService';
import ReminderAlarm from './ReminderAlarm';

/**
 * ReminderAlarmHost: app-level mount that listens for Notifee delivery
 * events. When a reminder fires while the app is open, fetches the
 * Reminder doc and shows the full-screen <ReminderAlarm> overlay.
 *
 * Mount once near the top of the tree (above NavigationContainer).
 */
export default function ReminderAlarmHost() {
  const [active, setActive] = useState<Reminder | null>(null);

  useEffect(() => {
    const unsub = onForegroundReminderEvent(async (reminderId) => {
      try {
        const snap = await firestore().collection('reminders').doc(reminderId).get();
        if (!snap.exists) return;
        const data = snap.data() as any;
        setActive({ id: snap.id, ...data });
      } catch (e) {
        console.warn('ReminderAlarmHost: fetch failed', e);
      }
    });
    return () => { try { unsub(); } catch {} };
  }, []);

  return <ReminderAlarm reminder={active} onDismiss={() => setActive(null)} />;
}
