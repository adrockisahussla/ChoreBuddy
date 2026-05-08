import { Reminder } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

export function useReminders() {
  const familyId = useFamilyId();
  const { items: reminders, loading } = useFirestoreCollection<Reminder>(
    'reminders',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  return { reminders, loading };
}
