import firestore from '@react-native-firebase/firestore';
import { Reward, RewardClaim } from '../types';

const rewardsCol = () => firestore().collection('rewards');
const claimsCol = () => firestore().collection('rewardClaims');

export const rewardService = {
  request: (data: Omit<Reward, 'id' | 'status' | 'createdAt'>) =>
    rewardsCol().add({ ...data, status: 'requested', createdAt: Date.now() }),
  approve: (id: string, finalCost: number) =>
    rewardsCol().doc(id).update({ status: 'active', cost: finalCost, approvedAt: Date.now() }),
  deny: (id: string) =>
    rewardsCol().doc(id).delete(),
};

export const claimService = {
  request: (reward: Pick<Reward, 'id' | 'kidId' | 'title' | 'cost'>) =>
    claimsCol().add({
      rewardId: reward.id,
      kidId: reward.kidId,
      rewardTitle: reward.title,
      cost: reward.cost,
      status: 'pending',
      claimedAt: Date.now(),
    } as Omit<RewardClaim, 'id'>),
  approve: (claimId: string) =>
    claimsCol().doc(claimId).update({ status: 'approved', resolvedAt: Date.now() }),
  deny: (claimId: string) =>
    claimsCol().doc(claimId).update({ status: 'denied', resolvedAt: Date.now() }),
};
