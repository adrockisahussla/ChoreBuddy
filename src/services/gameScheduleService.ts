import firestore from '@react-native-firebase/firestore';
import { GameSchedule, DaySchedule, WEEK_DAYS, defaultDay } from '../types';
import { firewallControlService } from './firewallControlService';

const col = () => firestore().collection('gameSchedules');

/** Build a blank schedule (all days off) for a buddy. */
export function emptySchedule(buddyUid: string, familyId: string): GameSchedule {
  const days: { [k: string]: DaySchedule } = {};
  WEEK_DAYS.forEach(d => { days[d.key] = defaultDay(); });
  return { id: buddyUid, buddyUid, familyId, days, updatedAt: Date.now() };
}

export const gameScheduleService = {
  /** Live-subscribe to a buddy's schedule. Calls back with null if none yet. */
  subscribe: (buddyUid: string, cb: (s: GameSchedule | null) => void) =>
    col().doc(buddyUid).onSnapshot(
      doc => cb(doc.exists() ? ({ id: doc.id, ...(doc.data() as any) } as GameSchedule) : null),
      () => cb(null),
    ),

  save: async (s: GameSchedule) => {
    await col().doc(s.buddyUid).set({ ...s, updatedAt: Date.now() }, { merge: true });
    // Push reload to every PC paired with this kid so they refetch
    // immediately (instead of waiting for next service restart).
    try {
      const { ok, fail } = await firewallControlService.pushReloadForKid(s.buddyUid);
      return { pushed: ok, failed: fail };
    } catch {
      return { pushed: 0, failed: 0 };
    }
  },
};
