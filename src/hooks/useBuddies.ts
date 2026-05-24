import { User } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

const ACCENTS = ['#8b5cf6', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#eab308'];

/** All members of the current user's family. Originally returned only
 *  role='buddy' users; now returns everyone so anyone can assign
 *  chores/reminders to anyone else. Name kept for call-site compatibility. */
export function useBuddies() {
  const familyId = useFamilyId();
  const { items, loading } = useFirestoreCollection<User>(
    'users',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  // Stable sort by createdAt; fallback accent based on order if missing.
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
