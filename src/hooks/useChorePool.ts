import { ChorePoolItem } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

export function useChorePool() {
  const familyId = useFamilyId();
  const { items: chorePool, loading } = useFirestoreCollection<ChorePoolItem>(
    'chorePool',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  return { chorePool, loading };
}
