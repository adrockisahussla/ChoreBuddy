import { useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useRewardClaims } from './useRewards';
import { useCurrentUser } from './useCurrentUser';
import { notifyClaimResolved } from '../services/notificationService';
import { useCelebration } from '../components/Celebration';
import { enqueueToast } from '../utils/toastQueue';

/**
 * Fires a celebration modal (approved) or a quick toast (denied) on
 * the *claimant's* device when a reward claim is resolved. Mirrors the
 * approved-chore notifier pattern: persisted `notifiedClaimant` flag
 * on the claim doc so each resolution notifies exactly once, with
 * offline catch-up via the CelebrationProvider queue.
 */
export function useClaimResolvedNotifier(): void {
  const { fbUser } = useCurrentUser();
  const { rewardClaims } = useRewardClaims();
  const { celebrate } = useCelebration();
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
      if (approved) {
        if (claim.minutes) {
          celebrate({
            emoji: '⏱',
            headline: 'SCREEN TIME UNLOCKED!',
            subtitle: claim.rewardTitle,
            count: claim.minutes,
            countLabel: claim.minutes === 1 ? 'MINUTE' : 'MINUTES',
            dedupeKey: `claim-${claim.id}`,
          });
        } else {
          celebrate({
            emoji: '🎉',
            headline: 'REWARD UNLOCKED!',
            subtitle: claim.rewardTitle,
            dedupeKey: `claim-${claim.id}`,
          });
        }
      } else {
        // Denials use a quiet bottom toast — no party for bad news.
        enqueueToast(
          `Your "${claim.rewardTitle}" request was denied`,
          `claim-${claim.id}`,
        );
      }
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
  }, [rewardClaims, myUid, celebrate]);
}
