import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Invite } from '../types';

const col = () => firestore().collection('invites');

const generateToken = (): string =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// Public invite landing page hosted via Firebase Hosting under the
// existing chorebuddy-67a5f project. Recipients of the Firebase Auth
// sign-in-link land here, see their invite token, and get a link to
// install the APK.
export const BUDDY_APP_BASE = 'https://chorebuddy-67a5f.web.app/invite';

export const inviteService = {
  create: async (data: Omit<Invite, 'id' | 'token' | 'expiresAt' | 'createdAt' | 'status'>) => {
    if (!data.familyId) throw new Error('Cannot create invite: missing familyId');
    const token = generateToken();
    const email = (data.email || '').toLowerCase();
    // Key the doc by the token so recipients can fetch it by code alone
    // (doc id = the secret), which is what the security rules gate `get` on.
    const ref = col().doc(token);
    await ref.set({
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
  accept: (id: string, acceptedByUid?: string) =>
    col().doc(id).update({
      status: 'accepted',
      acceptedAt: Date.now(),
      ...(acceptedByUid ? { acceptedByUid } : {}),
    }),
  decline: (id: string) =>
    col().doc(id).update({ status: 'declined' }),
  block: (id: string) =>
    col().doc(id).update({ status: 'blocked' }),
  revoke: (id: string) =>
    col().doc(id).delete(),
  findByToken: async (token: string): Promise<Invite | null> => {
    // Invites are keyed by token, so fetch by doc id (works for a code-holder
    // who isn't yet in the family). Skip used/expired codes.
    const snap = await col().doc(token.trim().toUpperCase()).get();
    if (!snap.exists) return null;
    const d = snap.data() as any;
    if (!d || d.status !== 'pending') return null;
    if (d.expiresAt && d.expiresAt < Date.now()) return null;
    return { id: snap.id, ...d } as Invite;
  },
  /** Used at first sign-in: find a pending invite for this email so the
   *  new user joins the inviter's family instead of starting a new one. */
  findByEmail: async (email: string): Promise<Invite | null> => {
    const normalized = email.toLowerCase();
    const snap = await col()
      .where('email', '==', normalized)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as Invite;
  },
};
