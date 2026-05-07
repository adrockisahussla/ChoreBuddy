import { Invite } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';

export function useInvites() {
  const { items: invites, loading } = useFirestoreCollection<Invite>('invites');
  return { invites, loading };
}
