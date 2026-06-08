import firestore from '@react-native-firebase/firestore';
import { GameSchedule, DaySchedule, WEEK_DAYS, defaultDay } from '../types';

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

  save: (s: GameSchedule) =>
    col().doc(s.buddyUid).set({ ...s, updatedAt: Date.now() }, { merge: true }),
};
