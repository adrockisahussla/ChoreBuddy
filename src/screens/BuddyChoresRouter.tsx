import React from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import ManagerBuddyChores from './manager/BuddyChoresScreen';
import SelfBuddyChores from './buddy/BuddyChoresScreen';

/**
 * Routes the BuddyChores route to the right screen variant:
 *   • kidId === myUid → buddy/BuddyChoresScreen (Collect-your-points UI,
 *     submit-to-pending, tabs scoped to me).
 *   • kidId !== myUid → manager/BuddyChoresScreen (review another
 *     family member's queue; approve/reject/delete).
 *
 * Single navigation route name, two different screen implementations.
 */
export default function BuddyChoresRouter(props: any) {
  const { fbUser } = useCurrentUser();
  const kidId: string | undefined = props.route?.params?.kidId;
  const isSelf = !!fbUser?.uid && kidId === fbUser.uid;
  if (isSelf) return <SelfBuddyChores {...props} />;
  return <ManagerBuddyChores {...props} />;
}
