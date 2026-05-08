import { Chore } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

export function useChores() {
  const familyId = useFamilyId();
  const { items: chores, loading } = useFirestoreCollection<Chore>(
    'chores',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  return { chores, loading };
}
