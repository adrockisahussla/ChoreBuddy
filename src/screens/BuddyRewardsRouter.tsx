import React from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import ManagerBuddyRewards from './manager/BuddyRewardsScreen';
import SelfBuddyRewards from './buddy/BuddyRewardsScreen';

/**
 * Routes the BuddyRewards route to the right screen variant:
 *   • kidId === myUid → buddy/BuddyRewardsScreen (kid wallet,
 *     "Get screen time" tab with Redeem buttons, pool catalog).
 *   • kidId !== myUid → manager/BuddyRewardsScreen (review another
 *     buddy's pending claims, fulfill/deny).
 */
export default function BuddyRewardsRouter(props: any) {
  const { fbUser } = useCurrentUser();
  const kidId: string | undefined = props.route?.params?.kidId;
  const isSelf = !!fbUser?.uid && kidId === fbUser.uid;
  if (isSelf) return <SelfBuddyRewards {...props} />;
  return <ManagerBuddyRewards {...props} />;
}
