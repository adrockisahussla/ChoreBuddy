import firestore from '@react-native-firebase/firestore';
import { Role, User } from '../types';

const usersCol = () => firestore().collection('users');
const familiesCol = () => firestore().collection('families');

export const userService = {
  getByUid: async (uid: string): Promise<User | null> => {
    const doc = await usersCol().doc(uid).get();
    if (!doc.exists()) return null;
    return { id: doc.id, ...(doc.data() as any) } as User;
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
    await usersCol().doc(uid).set(data);
    return { id: uid, ...data };
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
    await usersCol().doc(uid).set(data);
    return { id: uid, ...data };
  },

  update: (id: string, patch: Partial<User>) =>
    usersCol().doc(id).update(patch),

  /** Idempotent upsert — creates the doc if missing, merges fields if present.
   *  Used by the accept-invite flow which may run against a uid that has no
   *  user doc yet (e.g. when an Auth account was recreated and the prior
   *  Firestore doc is orphaned at the old uid). */
  upsert: (id: string, patch: Partial<User> & { uid: string }) =>
    usersCol().doc(id).set(patch, { merge: true }),

  remove: (id: string) => usersCol().doc(id).delete(),
};
