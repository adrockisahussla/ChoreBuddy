import React from 'react';
import {
  Modal, View, TouchableOpacity, StyleSheet, Pressable, Text as RNText,
} from 'react-native';
import { theme } from '../theme';
import Text from './Text';

interface Props {
  visible: boolean;
  /** Selected weekdays — array of 0..6 (0=Sunday). */
  value: number[];
  onClose: () => void;
  onConfirm: (value: number[]) => void;
}

const DAYS = [
  { value: 0, label: 'Sunday',    short: 'Sun' },
  { value: 1, label: 'Monday',    short: 'Mon' },
  { value: 2, label: 'Tuesday',   short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday',  short: 'Thu' },
  { value: 5, label: 'Friday',    short: 'Fri' },
  { value: 6, label: 'Saturday',  short: 'Sat' },
];

const WEEKDAYS_SET = new Set([1, 2, 3, 4, 5]);
const WEEKEND_SET = new Set([0, 6]);

/**
 * DayOfWeekPicker: bottom sheet matching RecurrencePicker shell.
 * Multi-select — tap rows to toggle days, then Done to confirm.
 * "Weekdays" / "Weekend" / "Every day" quick chips at top.
 */
export default function DayOfWeekPicker({ visible, value, onClose, onConfirm }: Props) {
  const [pick, setPick] = React.useState<Set<number>>(new Set(value));

  React.useEffect(() => {
    if (visible) setPick(new Set(value));
  }, [visible, value]);

  const toggle = (v: number) => {
    setPick(prev => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const setQuick = (set: Set<number>) => setPick(new Set(set));

  const isWeekdays = pick.size === 5 && Array.from(pick).every(d => WEEKDAYS_SET.has(d));
  const isWeekend  = pick.size === 2 && Array.from(pick).every(d => WEEKEND_SET.has(d));
  const isEveryDay = pick.size === 7;

  const confirm = () => {
    if (pick.size === 0) return; // need at least one
    const sorted = Array.from(pick).sort((a, b) => a - b);
    onConfirm(sorted);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 12 }}>Which days?</Text>

          {/* Quick presets */}
          <View style={s.presetRow}>
            <TouchableOpacity
              style={[s.preset, isWeekdays && s.presetActive]}
              onPress={() => setQuick(WEEKDAYS_SET)}
            >
              <RNText style={[s.presetText, isWeekdays && s.presetTextActive]}>Weekdays</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.preset, isWeekend && s.presetActive]}
              onPress={() => setQuick(WEEKEND_SET)}
            >
              <RNText style={[s.presetText, isWeekend && s.presetTextActive]}>Weekend</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.preset, isEveryDay && s.presetActive]}
              onPress={() => setQuick(new Set([0, 1, 2, 3, 4, 5, 6]))}
            >
              <RNText style={[s.presetText, isEveryDay && s.presetTextActive]}>Every day</RNText>
            </TouchableOpacity>
          </View>

          {DAYS.map(d => {
            const active = pick.has(d.value);
            return (
              <TouchableOpacity
                key={d.value}
                style={[s.row, active && s.rowActive]}
                onPress={() => toggle(d.value)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, active && s.checkboxActive]}>
                  {active && <RNText style={s.checkboxTick}>✓</RNText>}
                </View>
                <RNText style={s.title}>{d.label}</RNText>
              </TouchableOpacity>
            );
          })}

          {pick.size === 0 && (
            <Text variant="tiny" style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 6 }}>
              Pick at least one day.
            </Text>
          )}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <RNText style={s.cancelText}>Cancel</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, pick.size === 0 && s.confirmDisabled]}
              disabled={pick.size === 0}
              onPress={confirm}
            >
              <RNText style={s.confirmText}>Done</RNText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Display label for a set of weekdays (used by field buttons). */
export function weekdaysLabel(values: number[]): string {
  if (values.length === 0) return 'Pick days';
  if (values.length === 7) return 'Every day';
  const set = new Set(values);
  if (values.length === 5 && [1, 2, 3, 4, 5].every(d => set.has(d))) return 'Weekdays';
  if (values.length === 2 && set.has(0) && set.has(6)) return 'Weekend';
  // List by short name in Sun→Sat order
  return [...values].sort((a, b) => a - b).map(v => DAYS[v].short).join(', ');
}

/** Next firing date (epoch ms, time of day untouched) given a set of weekdays. */
export function nextWeekdayDate(weekdays: number[], from: Date = new Date()): Date {
  if (weekdays.length === 0) return from;
  const today = from.getDay();
  // Smallest non-negative offset that hits a chosen day.
  let best = 7;
  for (const w of weekdays) {
    const offset = (w - today + 7) % 7;
    if (offset < best) best = offset;
  }
  const d = new Date(from);
  d.setDate(d.getDate() + best);
  return d;
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
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  preset: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
  },
  presetActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  presetText: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  presetTextActive: { color: '#ffffff' },

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
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkboxTick: { color: '#ffffff', fontWeight: '900', fontSize: 14, lineHeight: 16 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },

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
  confirmDisabled: { opacity: 0.4 },
  confirmText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
