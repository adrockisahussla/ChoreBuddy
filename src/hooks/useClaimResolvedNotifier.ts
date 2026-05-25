import { useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useRewardClaims } from './useRewards';
import { useCurrentUser } from './useCurrentUser';
import { notifyClaimResolved } from '../services/notificationService';
import { enqueueToast } from '../utils/toastQueue';

/**
 * Fires a toast + system notification on the *claimant's* device when
 * their reward claim is approved or denied. Mirrors the approved-chore
 * notifier pattern: persisted `notifiedClaimant` flag on the claim doc
 * so each resolution notifies exactly once, with offline catch-up.
 */
export function useClaimResolvedNotifier(): void {
  const { fbUser } = useCurrentUser();
  const { rewardClaims } = useRewardClaims();
  const myUid = fbUser?.uid;

  useEffect(() => {
    if (!myUid) return;
    const targets = rewardClaims.filter(c =>
      c.kidId === myUid &&
      (c.status === 'approved' || c.status === 'denied') &&
      !c.notifiedClaimant,
    );
    if (targets.length === 0) return;

    for (const claim of targets) {
      const approved = claim.status === 'approved';
      const message = approved
        ? claim.minutes
          ? `🎉 +${claim.minutes} min added to your screen-time wallet!`
          : `🎉 "${claim.rewardTitle}" was approved!`
        : `✗ Your "${claim.rewardTitle}" request was denied`;
      enqueueToast(message, `claim-${claim.id}`);
      notifyClaimResolved({
        claimId: claim.id,
        approved,
        title: claim.rewardTitle,
        minutes: claim.minutes,
      }).catch(() => { /* non-fatal */ });
      firestore().collection('rewardClaims').doc(claim.id)
        .update({ notifiedClaimant: true })
        .catch(() => { /* swallow */ });
    }
  }, [rewardClaims, myUid]);
}
