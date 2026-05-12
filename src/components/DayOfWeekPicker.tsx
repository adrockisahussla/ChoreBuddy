import React from 'react';
import {
  Modal, View, TouchableOpacity, StyleSheet, Pressable, Text as RNText,
} from 'react-native';
import { theme } from '../theme';
import Text from './Text';

interface Props {
  visible: boolean;
  /** 0=Sunday … 6=Saturday */
  value: number;
  onClose: () => void;
  onConfirm: (value: number) => void;
}

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

/** Date of the *next* occurrence of weekday `target` (today counts). */
function nextOccurrenceLabel(target: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const today = d.getDay();
  const offset = (target - today + 7) % 7;
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * DayOfWeekPicker: bottom sheet matching RecurrencePicker shell.
 * Shown when a weekly reminder/chore is being created — picks which
 * day of the week the recurrence fires on. Returns 0..6 (Sun..Sat).
 */
export default function DayOfWeekPicker({ visible, value, onClose, onConfirm }: Props) {
  const [pick, setPick] = React.useState<number>(value);

  React.useEffect(() => {
    if (visible) setPick(value);
  }, [visible, value]);

  const confirm = () => {
    onConfirm(pick);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 16 }}>Which day?</Text>

          {DAYS.map(d => {
            const active = pick === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[s.row, active && s.rowActive]}
                onPress={() => setPick(d.value)}
                activeOpacity={0.7}
              >
                <RNText style={s.icon}>📆</RNText>
                <View style={{ flex: 1 }}>
                  <RNText style={s.title}>{d.label}</RNText>
                  <RNText style={s.sub}>Next: {nextOccurrenceLabel(d.value)}</RNText>
                </View>
                {active && <RNText style={s.check}>✓</RNText>}
              </TouchableOpacity>
            );
          })}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <RNText style={s.cancelText}>Cancel</RNText>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={confirm}>
              <RNText style={s.confirmText}>Done</RNText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Plural display label for a weekday value (used by field buttons). */
export function weekdayLabel(value: number): string {
  const day = DAYS.find(d => d.value === value);
  return day ? `${day.label}s` : 'Pick a day';
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.cardBorder,
    alignSelf: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  rowActive: { backgroundColor: theme.colors.accent + '15' },
  icon: { fontSize: 20, width: 28, textAlign: 'center' },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  sub: { color: theme.colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  check: { color: theme.colors.accent, fontSize: 20, fontWeight: '900' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  cancelText: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  confirmText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
