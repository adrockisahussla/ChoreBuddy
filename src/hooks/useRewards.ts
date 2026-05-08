import { Reward, RewardClaim } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

export function useRewards() {
  const familyId = useFamilyId();
  const { items: rewardItems, loading } = useFirestoreCollection<Reward>(
    'rewards',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  return { rewardItems, loading };
}

export function useRewardClaims() {
  const familyId = useFamilyId();
  const { items: rewardClaims, loading } = useFirestoreCollection<RewardClaim>(
    'rewardClaims',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  return { rewardClaims, loading };
}
