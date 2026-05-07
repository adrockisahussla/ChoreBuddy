import firestore from '@react-native-firebase/firestore';
import { ChorePoolItem } from '../types';

const col = () => firestore().collection('chorePool');

export const chorePoolService = {
  add: (p: Omit<ChorePoolItem, 'id' | 'createdAt'>) =>
    col().add({ ...p, createdAt: Date.now() }),
  update: (id: string, patch: Partial<ChorePoolItem>) =>
    col().doc(id).update(patch),
  remove: (id: string) =>
    col().doc(id).delete(),
};
