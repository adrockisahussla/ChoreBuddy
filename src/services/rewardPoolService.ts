import firestore from '@react-native-firebase/firestore';
import { RewardPoolItem } from '../types';

const col = () => firestore().collection('rewardPool');

export const rewardPoolService = {
  add: (p: Omit<RewardPoolItem, 'id' | 'createdAt'>) =>
    col().add({ ...p, createdAt: Date.now() }),
  update: (id: string, patch: Partial<RewardPoolItem>) =>
    col().doc(id).update(patch),
  remove: (id: string) =>
    col().doc(id).delete(),
};
