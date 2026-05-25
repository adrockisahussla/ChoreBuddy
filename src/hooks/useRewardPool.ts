import { RewardPoolItem } from '../types';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useFamilyId } from './useFamilyId';

export function useRewardPool() {
  const familyId = useFamilyId();
  const { items: rewardPool, loading } = useFirestoreCollection<RewardPoolItem>(
    'rewardPool',
    q => familyId ? q.where('familyId', '==', familyId) : null,
    [familyId]
  );
  return { rewardPool, loading };
}
