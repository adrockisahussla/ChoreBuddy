import firestore from '@react-native-firebase/firestore';

/**
 * Phase 1 of the screen-time loop.
 *
 * A "burn" represents an active grant of screen-time minutes that has
 * been ALLOWed on a PC and will be SHUTOFF'd at `expiresAt`. The
 * manager's phone is the system of record for these expirations until
 * the Windows agent learns to own the burn itself (Phase 2 of the
 * Rewards Overhaul plan). The agent already pauses/resumes; this layer
 * just schedules the SHUTOFF.
 *
 * Why a Firestore doc and not just a Notifee trigger?
 *
 *   • Cold-start safety. If the manager kills the app, a Notifee
 *     notification still rings — but the SHUTOFF push doesn't go out
 *     until the user opens the app. The hook reconciles on boot by
 *     looking at burns whose `expiresAt < now()` and `!processedAt`.
 *   • Co-manager hand-off. Either manager device can process an expired
 *     burn — whoever opens the app first wins via the `processedAt`
 *     guard.
 *   • Auditability. A history of grants + when they expired beats a
 *     fire-and-forget timer.
 */
export interface ScreenTimeBurn {
  id: string;
  familyId: string;
  kidId: string;
  /** Machines that received the ALLOW push for this grant. */
  machineIds: string[];
  /** Epoch ms when this grant lapses and a SHUTOFF should fire. */
  expiresAt: number;
  /** Epoch ms when the SHUTOFF push actually went out. While null/undefined
   *  the burner hook will keep trying to send. */
  processedAt?: number;
  /** Original claim id this burn was created from — for audit + history. */
  claimId: string;
  /** Minutes originally granted — kept on the doc so history surfaces
   *  read independently of the claim. */
  minutes: number;
  createdAt: number;
}

const col = () => firestore().collection('screenTimeBurns');

export const screenTimeBurnService = {
  /** Live-subscribe to all burns in a family. The hook filters out
   *  processed ones; we subscribe to the whole window because Firestore
   *  rules already family-scope. */
  subscribeFamily: (familyId: string, cb: (burns: ScreenTimeBurn[]) => void) =>
    col().where('familyId', '==', familyId).onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ScreenTimeBurn))),
      () => cb([]),
    ),

  add: async (data: Omit<ScreenTimeBurn, 'id' | 'createdAt'>) => {
    const ref = await col().add({ ...data, createdAt: Date.now() });
    return ref.id;
  },

  markProcessed: (id: string) =>
    col().doc(id).update({ processedAt: Date.now() }),
};
