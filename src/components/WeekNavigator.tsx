import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text as RNText } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { currentWeek, shiftWeek, getWeekOf } from '../utils/week';
import Text from './Text';

interface Props {
  weekOf: string;
  onChange: (weekOf: string) => void;
}

/**
 * WeekNavigator: top-row widget for switching between ISO weeks.
 * - ← / → step prev/next
 * - Centre label shows "This week" or "Mar 10 – Mar 16"
 * - 📅 button opens a date picker; the picked date snaps to its week.
 */
export default function WeekNavigator({ weekOf, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const cur = currentWeek();
  const relation: 'past' | 'current' | 'future' =
    weekOf === cur ? 'current' : weekOf < cur ? 'past' : 'future';
  const label = weekRangeLabel(weekOf);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerOpen(false);
    if (event.type === 'set' && selected) {
      onChange(getWeekOf(selected));
    }
  };

  return (
    <View style={s.row}>
      <TouchableOpacity style={s.iconBtn} onPress={() => onChange(shiftWeek(weekOf, -1))} hitSlop={8}>
        <RNText style={s.iconText}>←</RNText>
      </TouchableOpacity>
      <View style={s.label}>
        <Text variant="h3" style={{ fontSize: 15, textAlign: 'center' }} numberOfLines={1}>{label}</Text>
        {relation === 'current' ? (
          <Text variant="tiny" style={{ fontSize: 10, color: theme.colors.muted, textAlign: 'center', marginTop: 2 }}>
            current
          </Text>
        ) : (
          <TouchableOpacity onPress={() => onChange(cur)}>
            <Text style={s.subLink} numberOfLines={1}>
              {relation === 'past' ? 'Past' : 'Future'} · return to present
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={s.iconBtn} onPress={() => onChange(shiftWeek(weekOf, 1))} hitSlop={8}>
        <RNText style={s.iconText}>→</RNText>
      </TouchableOpacity>
      <TouchableOpacity style={s.calBtn} onPress={() => setPickerOpen(true)} hitSlop={8}>
        <RNText style={s.calIcon}>📅</RNText>
      </TouchableOpacity>
      {pickerOpen && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={onDateChange}
        />
      )}
    </View>
  );
}

/**
 * Format weekOf as "Mar 10 – Mar 16". Falls back to the legacy
 * `fmtRange` shape if parsing fails.
 */
function weekRangeLabel(weekOf: string): string {
  try {
    const [y, w] = weekOf.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const jan4Day = (jan4.getUTCDay() + 6) % 7;
    const w1Mon = new Date(jan4); w1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
    const mon = new Date(w1Mon); mon.setUTCDate(w1Mon.getUTCDate() + (w - 1) * 7);
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return `${fmt(mon)} – ${fmt(sun)}`;
  } catch {
    return weekOf;
  }
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 8,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  iconText: { color: theme.colors.text, fontSize: 22, fontWeight: '700' },
  label: { flex: 1, justifyContent: 'center' },
  calBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  calIcon: { fontSize: 16 },
  subLink: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accent,
    textAlign: 'center',
    marginTop: 2,
  },
});
