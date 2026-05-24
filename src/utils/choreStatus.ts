import { TextStyle } from 'react-native';
import { theme } from '../theme';

/** Human label for a chore status — shown on row pills. Shared between
 *  buddy and manager views so the wording stays consistent. */
export function statusLabel(status: string): string {
  if (status === 'rejected') return 'Redo';
  if (status === 'todo') return 'Todo';
  if (status === 'pending') return 'Pending';
  if (status === 'approved') return 'Done';
  return status;
}

/** Inline color + bg for the status pill. Returns a partial style that's
 *  spread onto the base s.statusPill style at the call site. */
export function statusPillStyle(status: string): TextStyle {
  if (status === 'rejected') return { backgroundColor: '#ef444433', color: '#ef4444' };
  if (status === 'pending') return { backgroundColor: '#f59e0b33', color: '#f59e0b' };
  if (status === 'approved') return { backgroundColor: '#22c55e33', color: '#22c55e' };
  return { backgroundColor: '#7b84a833', color: theme.colors.muted };
}

/** Shared base style for the status pill itself (size, padding, weight). */
export const statusPillBase: TextStyle = {
  fontSize: 10,
  fontWeight: '900',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
  overflow: 'hidden',
};
