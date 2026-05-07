import { Chore, Recurrence } from '../types';

export const buddyLabel = (k: string): string =>
  k === 'Kid1' ? 'Buddy 1' : k === 'Kid2' ? 'Buddy 2' : k;

export const POINTS_PER: Record<Recurrence, number> = { daily: 5, weekly: 15, once: 10 };

export const chorePoints = (c: Pick<Chore, 'points' | 'recurrence'> | null | undefined): number =>
  Number.isFinite(c?.points as number) ? (c!.points as number) : (POINTS_PER[c?.recurrence as Recurrence] || 10);

export const isOverdue = (c: Pick<Chore, 'dueDate' | 'status'> | null | undefined): boolean =>
  !!c?.dueDate && c.dueDate < Date.now() && c.status !== 'approved' && c.status !== 'pending';
