import firestore from '@react-native-firebase/firestore';
import { Invite } from '../types';

const col = () => firestore().collection('invites');

const generateToken = (): string =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export const inviteService = {
  create: async (data: Omit<Invite, 'id' | 'token' | 'familyId' | 'expiresAt' | 'createdAt' | 'status'> & { familyId?: string }) => {
    const token = generateToken();
    const ref = await col().add({
      ...data,
      token,
      familyId: data.familyId || 'default-family',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      status: 'pending',
    });
    return { id: ref.id, token };
  },
  accept: (id: string) =>
    col().doc(id).update({ status: 'accepted', acceptedAt: Date.now() }),
  revoke: (id: string) =>
    col().doc(id).delete(),
  findByToken: async (token: string): Promise<Invite | null> => {
    const snap = await col().where('token', '==', token).where('status', '==', 'pending').limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as Invite;
  },
};
