import { Reward, RewardClaim } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';

export function useRewards() {
  const { items: rewardItems, loading } = useFirestoreCollection<Reward>('rewards');
  return { rewardItems, loading };
}

export function useRewardClaims() {
  const { items: rewardClaims, loading } = useFirestoreCollection<RewardClaim>('rewardClaims');
  return { rewardClaims, loading };
}
