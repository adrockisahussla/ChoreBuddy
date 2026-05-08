import { useCurrentUser } from './useCurrentUser';

/** Returns the current user's familyId, or null while loading / signed-out. */
export function useFamilyId(): string | null {
  const { userDoc } = useCurrentUser();
  return userDoc?.familyId || null;
}
