import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Invite } from '../types';

const col = () => firestore().collection('invites');

const generateToken = (): string =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export const BUDDY_APP_BASE = 'http://localhost:3000/buddy-app.html';

export const inviteService = {
  create: async (data: Omit<Invite, 'id' | 'token' | 'expiresAt' | 'createdAt' | 'status'>) => {
    if (!data.familyId) throw new Error('Cannot create invite: missing familyId');
    const token = generateToken();
    const email = (data.email || '').toLowerCase();
    const ref = await col().add({
      ...data,
      email,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      status: 'pending',
    });

    let emailSent = false;
    let emailError: string | null = null;
    if (email) {
      const continueUrl = `${BUDDY_APP_BASE}?invite=${token}&email=${encodeURIComponent(email)}`;
      try {
        await auth().sendSignInLinkToEmail(email, {
          url: continueUrl,
          handleCodeInApp: true,
        });
        emailSent = true;
      } catch (e: any) {
        emailError = e?.message || String(e);
      }
    }

    return { id: ref.id, token, emailSent, emailError };
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
