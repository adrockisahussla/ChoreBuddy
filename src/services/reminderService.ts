import firestore from '@react-native-firebase/firestore';
import { Reminder } from '../types';

const col = () => firestore().collection('reminders');

export const reminderService = {
  /** Create a new reminder. Returns the doc ref so the caller can capture
   *  the id (e.g. to attach a Notifee notificationId after scheduling). */
  add: (r: Omit<Reminder, 'id' | 'createdAt'>) =>
    col().add({ ...r, createdAt: Date.now() }),

  update: (id: string, patch: Partial<Reminder>) =>
    col().doc(id).update(patch),

  remove: (id: string) =>
    col().doc(id).delete(),

  /** Mark a reminder as fired (set firedAt timestamp) — used after the
   *  notification displays so we don't double-fire and so the manager UI
   *  can show "fired" state. */
  markFired: (id: string) =>
    col().doc(id).update({ firedAt: Date.now() }),
};
