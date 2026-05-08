import { User } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

const ACCENTS = ['#8b5cf6', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#eab308'];

/** All buddies (role='buddy' users) in the current user's family. */
export function useBuddies() {
  const familyId = useFamilyId();
  const { items, loading } = useFirestoreCollection<User>(
    'users',
    q => familyId ? q.where('familyId', '==', familyId).where('role', '==', 'buddy') : null,
    [familyId]
  );
  // Stable sort + assign a fallback accent based on order if the user doc lacks one.
  const buddies = items
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .map((u, i) => ({ ...u, accent: u.accent || ACCENTS[i % ACCENTS.length] }));
  return { buddies, loading };
}

/** Look up a single buddy by uid. */
export function findBuddy(buddies: User[], uid: string): User | undefined {
  return buddies.find(b => b.uid === uid);
}
