import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text as RNText } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { currentWeek, shiftWeek, getWeekOf } from '../utils/week';

interface Props {
  weekOf: string;
  onChange: (weekOf: string) => void;
}

/**
 * WeekNavigator: top-row widget for switching between ISO weeks.
 *
 * Layout (option A):
 *   row 1:  [← prev]   May 11 – 17   [next →]   [📅]
 *   row 2:  "Past · tap to return to present"  (or "Current week", or
 *           "Future · tap to return to present")
 *
 * Date label collapses to "May 11 – 17" when both endpoints are in the
 * same month (drops the redundant second month name). Sublabel is its
 * own row so it never has to share width with the date.
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
    <View style={s.card}>
      <View style={s.row}>
        <TouchableOpacity style={s.arrow} onPress={() => onChange(shiftWeek(weekOf, -1))} hitSlop={8}>
          <RNText style={s.arrowText}>←</RNText>
        </TouchableOpacity>
        <RNText
          style={s.date}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {label}
        </RNText>
        <TouchableOpacity style={s.arrow} onPress={() => onChange(shiftWeek(weekOf, 1))} hitSlop={8}>
          <RNText style={s.arrowText}>→</RNText>
        </TouchableOpacity>
        <TouchableOpacity style={s.arrow} onPress={() => setPickerOpen(true)} hitSlop={8}>
          <RNText style={s.calIcon}>📅</RNText>
        </TouchableOpacity>
      </View>

      {relation === 'current' ? (
        <RNText style={[s.sub, s.subMuted]}>Current week</RNText>
      ) : (
        <TouchableOpacity onPress={() => onChange(cur)}>
          <RNText style={[s.sub, s.subLink]}>
            {relation === 'past' ? 'Past' : 'Future'} · tap to return to present
          </RNText>
        </TouchableOpacity>
      )}

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
 * Format weekOf as "May 11 – 17" (same month) or "Apr 28 – May 4"
 * (crossing months). Defensive fallback returns the raw weekOf string.
 */
function weekRangeLabel(weekOf: string): string {
  try {
    const [y, w] = weekOf.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const jan4Day = (jan4.getUTCDay() + 6) % 7;
    const w1Mon = new Date(jan4); w1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
    const mon = new Date(w1Mon); mon.setUTCDate(w1Mon.getUTCDate() + (w - 1) * 7);
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
    const monLabel = mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    if (mon.getUTCMonth() === sun.getUTCMonth()) {
      // Same month — drop the redundant second month name.
      const dayOnly = sun.toLocaleDateString(undefined, { day: 'numeric', timeZone: 'UTC' });
      return `${monLabel} – ${dayOnly}`;
    }
    const sunLabel = sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return `${monLabel} – ${sunLabel}`;
  } catch {
    return weekOf;
  }
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  arrowText: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  calIcon: { fontSize: 14 },
  date: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: 4,
  },
  sub: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  subMuted: { color: theme.colors.muted },
  subLink: { color: theme.colors.accent },
});
