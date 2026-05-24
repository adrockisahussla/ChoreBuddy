import { Invite } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useCurrentUser } from './useCurrentUser';

/**
 * Watches for a pending invite addressed to the currently signed-in user's
 * email. Used by InviteBanner to surface a "you've been invited" prompt on
 * the Buddies / Home screens whenever someone has invited this email but
 * the user hasn't yet accepted, declined, or blocked it.
 *
 * Skips invites that match the user's current family (to avoid prompting
 * yourself with invites you sent) and invites that have already expired.
 */
export function usePendingInviteForMe(): Invite | null {
  const { fbUser, userDoc } = useCurrentUser();
  const email = (fbUser?.email || '').toLowerCase();
  const myFamilyId = userDoc?.familyId || null;

  const { items } = useFirestoreCollection<Invite>(
    'invites',
    q => email
      ? q.where('email', '==', email).where('status', '==', 'pending')
      : null,
    [email]
  );

  const now = Date.now();
  const fresh = items.filter(
    i => (i.expiresAt || 0) > now && i.familyId !== myFamilyId,
  );
  return fresh[0] || null;
}
