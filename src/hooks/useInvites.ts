import { Invite } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

export function useInvites() {
  const familyId = useFamilyId();
  const { items: invites, loading } = useFirestoreCollection<Invite>(
    'invites',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  return { invites, loading };
}
