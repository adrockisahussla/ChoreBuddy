import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export const getWeekOf = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const getEndOfWeek = (date: Date): number => {
  const d = new Date(date);
  const dayNum = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayNum + 6);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export const getCurrentWeekOf = (): string => getWeekOf(new Date());

export const isOverdue = (chore: any): boolean =>
  !!chore.dueDate &&
  chore.dueDate < Date.now() &&
  chore.status !== 'approved' &&
  chore.status !== 'pending';

export const resetWeeklyChores = async (
  db: FirebaseFirestoreTypes.Module
): Promise<void> => {
  const currentWeek = getCurrentWeekOf();
  const endOfWeek = getEndOfWeek(new Date());
  const snap = await db.collection('chores').where('recurrence', '==', 'weekly').get();
  const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const old = all.filter(c => c.weekOf !== currentWeek);
  const current = all.filter(c => c.weekOf === currentWeek);

  for (const c of old) {
    if (c.dueDate && c.dueDate < Date.now() && c.status !== 'approved' && !c.overdue) {
      await db.collection('chores').doc(c.id).update({ overdue: true });
    }
    const exists = current.some(x => x.title === c.title && x.assignedTo === c.assignedTo);
    if (!exists) {
      await db.collection('chores').add({
        title: c.title,
        assignedTo: c.assignedTo,
        recurrence: 'weekly',
        status: 'todo',
        rejectionNote: '',
        weekOf: currentWeek,
        dueDate: endOfWeek,
        completedAt: 0,
        overdue: false,
        createdAt: Date.now(),
      });
      current.push({ title: c.title, assignedTo: c.assignedTo, weekOf: currentWeek } as any);
    }
  }
};
