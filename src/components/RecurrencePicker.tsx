import React from 'react';
import {
  Modal, View, TouchableOpacity, StyleSheet, Pressable, Text as RNText,
} from 'react-native';
import { theme } from '../theme';
import { Recurrence } from '../types';
import Text from './Text';

interface Props {
  visible: boolean;
  value: Recurrence;
  onClose: () => void;
  onConfirm: (value: Recurrence) => void;
}

interface Option {
  value: Recurrence;
  icon: string;
  title: string;
  sub: string;
}

const OPTIONS: Option[] = [
  { value: 'once',   icon: '📌', title: 'One-time', sub: 'Fires once on a chosen date' },
  { value: 'daily',  icon: '☀️', title: 'Daily',    sub: 'Every day at the chosen time' },
  { value: 'weekly', icon: '📆', title: 'Weekly',   sub: 'Same day each week' },
];

/**
 * RecurrencePicker: bottom-sheet matching DateWheel/TimeWheel shell.
 * Tap a row → check mark + Done confirms; Cancel discards.
 */
export default function RecurrencePicker({ visible, value, onClose, onConfirm }: Props) {
  const [pick, setPick] = React.useState<Recurrence>(value);

  // Re-sync to incoming `value` each time the sheet opens.
  React.useEffect(() => {
    if (visible) setPick(value);
  }, [visible, value]);

  const confirm = () => {
    onConfirm(pick);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 16 }}>How often?</Text>

          {OPTIONS.map(opt => {
            const active = pick === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.row, active && s.rowActive]}
                onPress={() => setPick(opt.value)}
                activeOpacity={0.7}
              >
                <RNText style={s.icon}>{opt.icon}</RNText>
                <View style={{ flex: 1 }}>
                  <RNText style={s.title}>{opt.title}</RNText>
                  <RNText style={s.sub}>{opt.sub}</RNText>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Display label for a Recurrence value (used by field buttons). */
export function recurrenceLabel(r: Recurrence): string {
  switch (r) {
    case 'once':   return 'One-time';
    case 'daily':  return 'Daily';
    case 'weekly': return 'Weekly';
  }
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  rowActive: { backgroundColor: theme.colors.accent + '15' },
  icon: { fontSize: 22, width: 28, textAlign: 'center' },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  sub: { color: theme.colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  check: { color: theme.colors.accent, fontSize: 20, fontWeight: '900' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
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
