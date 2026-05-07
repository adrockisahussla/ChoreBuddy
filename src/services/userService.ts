import firestore from '@react-native-firebase/firestore';
import { Role, User } from '../types';

const usersCol = () => firestore().collection('users');
const familiesCol = () => firestore().collection('families');

export const userService = {
  getByUid: async (uid: string): Promise<User | null> => {
    const snap = await usersCol().where('uid', '==', uid).limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as User;
  },

  /** First sign-in becomes a Manager of a brand-new family. */
  createForNewSignIn: async (
    uid: string,
    email: string | null,
    displayName: string | null
  ): Promise<User> => {
    const familyRef = await familiesCol().add({
      createdAt: Date.now(),
      createdBy: uid,
      name: displayName ? `${displayName}'s Family` : 'New Family',
    });
    const data: Omit<User, 'id'> = {
      uid,
      familyId: familyRef.id,
      role: 'manager',
      displayName: displayName || 'Manager',
      email: email || undefined,
      createdAt: Date.now(),
    };
    const ref = await usersCol().add(data);
    return { id: ref.id, ...data };
  },

  /** Used by invite-acceptance flow (Phase 6). */
  joinFamily: async (
    uid: string,
    email: string | null,
    displayName: string | null,
    familyId: string,
    role: Role,
    avatar?: string
  ): Promise<User> => {
    const data: Omit<User, 'id'> = {
      uid,
      familyId,
      role,
      displayName: displayName || 'User',
      email: email || undefined,
      avatar,
      createdAt: Date.now(),
    };
    const ref = await usersCol().add(data);
    return { id: ref.id, ...data };
  },

  update: (id: string, patch: Partial<User>) =>
    usersCol().doc(id).update(patch),
};
