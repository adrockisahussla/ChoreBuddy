import firestore from '@react-native-firebase/firestore';

/**
 * Usage capture — lightweight engagement telemetry that powers the
 * manager dashboard's Engagement metrics (opens, time-in-app, streaks,
 * top screens). One rolled-up doc per user per day:
 *
 *   usage/{uid}_{YYYYMMDD} = {
 *     uid, familyId, role, date: 'YYYYMMDD',
 *     opens,                 // app foregrounds that day
 *     activeMs,              // total foreground time that day
 *     lastActiveAt,          // ms epoch of last activity
 *     screens: { [route]: ms } // time per screen
 *   }
 *
 * Writes are coalesced: one write on each foreground (opens++), and one
 * write per session end (activeMs + screens). Cheap and offline-safe.
 */
const col = () => firestore().collection('usage');

export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
const docId = (uid: string) => `${uid}_${dayKey()}`;

interface Who { uid: string; familyId: string; role?: string }

export const usageService = {
  /** App came to the foreground — count an "open". */
  async logOpen({ uid, familyId, role }: Who): Promise<void> {
    if (!uid || !familyId) return;
    try {
      await col().doc(docId(uid)).set({
        uid, familyId, role: role || 'buddy', date: dayKey(),
        opens: firestore.FieldValue.increment(1),
        lastActiveAt: Date.now(),
      }, { merge: true });
    } catch (e) { /* offline / transient — RN Firebase queues */ }
  },

  /** End of a foreground session — bank the elapsed time + per-screen time. */
  async flushSession(
    { uid, familyId, role }: Who,
    activeMs: number,
    screens: Record<string, number>,
  ): Promise<void> {
    if (!uid || !familyId) return;
    const data: any = {
      uid, familyId, role: role || 'buddy', date: dayKey(),
      lastActiveAt: Date.now(),
    };
    if (activeMs > 0) data.activeMs = firestore.FieldValue.increment(Math.round(activeMs));
    const sc: Record<string, any> = {};
    for (const [k, v] of Object.entries(screens || {})) {
      if (v > 0) sc[k] = firestore.FieldValue.increment(Math.round(v));
    }
    if (Object.keys(sc).length) data.screens = sc;
    if (!data.activeMs && !data.screens) return; // nothing to record
    try {
      await col().doc(docId(uid)).set(data, { merge: true });
    } catch (e) { /* offline / transient */ }
  },
};
