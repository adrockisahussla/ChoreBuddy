import { Reminder } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';

export function useReminders() {
  const { items: reminders, loading } = useFirestoreCollection<Reminder>('reminders');
  return { reminders, loading };
}
