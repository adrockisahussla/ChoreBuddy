import { ChorePoolItem } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';

export function useChorePool() {
  const { items: chorePool, loading } = useFirestoreCollection<ChorePoolItem>('chorePool');
  return { chorePool, loading };
}
