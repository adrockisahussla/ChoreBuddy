import { Chore } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';

export function useChores() {
  const { items: chores, loading } = useFirestoreCollection<Chore>('chores');
  return { chores, loading };
}
