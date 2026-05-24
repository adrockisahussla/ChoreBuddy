import { User } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

const ACCENTS = ['#8b5cf6', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#eab308'];

/**
 * Everyone in the current user's family — managers + buddies. Used by the
 * chore assignment picker so anyone can assign a chore to anyone else.
 */
export function useFamilyMembers() {
  const familyId = useFamilyId();
  const { items, loading } = useFirestoreCollection<User>(
    'users',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  // Managers listed first, then buddies, then stable by createdAt.
  const members = items
    .slice()
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'manager' ? -1 : 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    })
    .map((u, i) => ({ ...u, accent: u.accent || ACCENTS[i % ACCENTS.length] }));
  return { members, loading };
}
