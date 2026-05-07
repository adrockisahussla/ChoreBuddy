import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Chore } from '../types';
import { getWeekOf, getEndOfWeek, currentWeek } from '../utils/week';

const col = () => firestore().collection('chores');

export const choreService = {
  add: (chore: Omit<Chore, 'id' | 'createdAt'>) =>
    col().add({ ...chore, createdAt: Date.now() }),
  update: (id: string, patch: Partial<Chore>) =>
    col().doc(id).update(patch),
  remove: (id: string) =>
    col().doc(id).delete(),
};

// Optional client-side weekly regeneration (kept for compatibility — not auto-run)
export const resetWeeklyChores = async (
  db: FirebaseFirestoreTypes.Module = firestore()
): Promise<void> => {
  const cw = currentWeek();
  const endOfWeek = getEndOfWeek(new Date());
  const snap = await db.collection('chores').where('recurrence', '==', 'weekly').get();
  const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const old = all.filter(c => c.weekOf !== cw);
  const current = all.filter(c => c.weekOf === cw);

  for (const c of old) {
    if (c.dueDate && c.dueDate < Date.now() && c.status !== 'approved' && !c.overdue) {
      await db.collection('chores').doc(c.id).update({ overdue: true });
    }
    const exists = current.some((x: any) => x.title === c.title && x.assignedTo === c.assignedTo);
    if (!exists) {
      await db.collection('chores').add({
        title: c.title,
        assignedTo: c.assignedTo,
        recurrence: 'weekly',
        status: 'todo',
        rejectionNote: '',
        weekOf: cw,
        dueDate: endOfWeek,
        completedAt: 0,
        overdue: false,
        createdAt: Date.now(),
      });
      current.push({ title: c.title, assignedTo: c.assignedTo, weekOf: cw } as any);
    }
  }
};

export { getWeekOf, getEndOfWeek, currentWeek };
export { isOverdue } from '../utils/buddy';
// Legacy alias for backward compat with the old screens
export const getCurrentWeekOf = currentWeek;
