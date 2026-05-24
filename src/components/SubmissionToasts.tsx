import { useEffect, useRef } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import { useChores } from '../hooks/useChores';
import { useRewards, useRewardClaims } from '../hooks/useRewards';
import { useFamilyMembers } from '../hooks/useFamilyMembers';

const memberName = (uid: string, members: Array<{ uid: string; displayName: string }>) =>
  members.find(m => m.uid === uid)?.displayName || 'Someone';

/**
 * Mounted once high in the tree (inside AuthGateway). Watches the family's
 * chores / rewards / rewardClaims streams and surfaces an Android toast when
 * a buddy submission lands, mirroring the buddy-side toast UX.
 *
 * First snapshot (or any re-subscription, e.g. after family/auth change) is
 * captured silently — toasts only fire for transitions observed after that.
 */
export default function SubmissionToasts() {
  const { chores, loading: choresLoading } = useChores();
  const { rewardItems, loading: rewardsLoading } = useRewards();
  const { rewardClaims, loading: claimsLoading } = useRewardClaims();
  const { members } = useFamilyMembers();

  const prevChoreStatus = useRef(new Map<string, string>());
  const prevRewardStatus = useRef(new Map<string, string>());
  const prevClaimStatus = useRef(new Map<string, string>());
  const choreWasLoading = useRef(true);
  const rewardWasLoading = useRef(true);
  const claimWasLoading = useRef(true);

  useEffect(() => {
    if (choresLoading) { choreWasLoading.current = true; return; }
    const next = new Map<string, string>();
    chores.forEach(c => next.set(c.id, c.status));
    if (choreWasLoading.current) {
      prevChoreStatus.current = next;
      choreWasLoading.current = false;
      return;
    }
    if (Platform.OS === 'android') {
      chores.forEach(c => {
        const prev = prevChoreStatus.current.get(c.id);
        if (prev !== 'pending' && c.status === 'pending') {
          ToastAndroid.show(
            `✓ ${memberName(c.assignedTo, members)} marked "${c.title}" done`,
            ToastAndroid.SHORT,
          );
        }
      });
    }
    prevChoreStatus.current = next;
  }, [chores, choresLoading, members]);

  useEffect(() => {
    if (rewardsLoading) { rewardWasLoading.current = true; return; }
    const next = new Map<string, string>();
    rewardItems.forEach(r => next.set(r.id, r.status));
    if (rewardWasLoading.current) {
      prevRewardStatus.current = next;
      rewardWasLoading.current = false;
      return;
    }
    if (Platform.OS === 'android') {
      rewardItems.forEach(r => {
        const prev = prevRewardStatus.current.get(r.id);
        if (prev !== 'requested' && r.status === 'requested') {
          ToastAndroid.show(
            `🎁 ${memberName(r.kidId, members)} suggested "${r.title}" (${r.suggestedCost} pts)`,
            ToastAndroid.SHORT,
          );
        }
      });
    }
    prevRewardStatus.current = next;
  }, [rewardItems, rewardsLoading, members]);

  useEffect(() => {
    if (claimsLoading) { claimWasLoading.current = true; return; }
    const next = new Map<string, string>();
    rewardClaims.forEach(c => next.set(c.id, c.status));
    if (claimWasLoading.current) {
      prevClaimStatus.current = next;
      claimWasLoading.current = false;
      return;
    }
    if (Platform.OS === 'android') {
      rewardClaims.forEach(c => {
        const prev = prevClaimStatus.current.get(c.id);
        if (prev !== 'pending' && c.status === 'pending') {
          ToastAndroid.show(
            `💸 ${memberName(c.kidId, members)} wants to claim "${c.rewardTitle}" (${c.cost} pts)`,
            ToastAndroid.SHORT,
          );
        }
      });
    }
    prevClaimStatus.current = next;
  }, [rewardClaims, claimsLoading, members]);

  return null;
}
