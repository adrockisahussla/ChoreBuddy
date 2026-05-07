import firestore from '@react-native-firebase/firestore';
import { Reminder } from '../types';

const col = () => firestore().collection('reminders');

export const reminderService = {
  add: (r: Omit<Reminder, 'id' | 'createdAt'>) =>
    col().add({ ...r, createdAt: Date.now() }),
  remove: (id: string) =>
    col().doc(id).delete(),
};
