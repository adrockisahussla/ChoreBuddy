import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text as RNText } from 'react-native';
import { theme } from '../theme';
import { currentWeek, shiftWeek, getWeekOf } from '../utils/week';
import DateWheel from './DateWheel';

interface Props {
  weekOf: string;
  onChange: (weekOf: string) => void;
}

/**
 * WeekNavigator: top-row widget for switching between ISO weeks.
 *
 * Layout:
 *   row 1:  [← prev]   May 11 – 17   [next →]   [📅]
 *   row 2:  "Past · tap to return to present"  (or "Current week", or
 *           "Future · tap to return to present")
 *
 * Calendar icon opens the same DateWheel sheet used by the rest of the
 * app — picking any date sets the navigator to that date's ISO week.
 */
export default function WeekNavigator({ weekOf, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const cur = currentWeek();
  const relation: 'past' | 'current' | 'future' =
    weekOf === cur ? 'current' : weekOf < cur ? 'past' : 'future';
  const label = weekRangeLabel(weekOf);

  // Initial date for the picker: Monday of the currently displayed week.
  const initialPickerDate = useMemo(() => mondayOfWeek(weekOf), [weekOf]);

  // Allow picking any date within +/- 2 years of today.
  const yearsBack = 2;
  const minDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsBack);
    d.setMonth(0); d.setDate(1); d.setHours(0, 0, 0, 0);
    return d;
  }, []);

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

      <DateWheel
        visible={pickerOpen}
        initial={initialPickerDate}
        minDate={minDate}
        yearsBack={yearsBack}
        yearsAhead={2}
        onClose={() => setPickerOpen(false)}
        onConfirm={(picked) => onChange(getWeekOf(picked))}
      />
    </View>
  );
}

/** Monday (local) of the given ISO weekOf string. */
function mondayOfWeek(weekOf: string): Date {
  try {
    const [y, w] = weekOf.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const jan4Day = (jan4.getUTCDay() + 6) % 7;
    const w1Mon = new Date(jan4); w1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
    const mon = new Date(w1Mon); mon.setUTCDate(w1Mon.getUTCDate() + (w - 1) * 7);
    // Convert UTC midnight to a local Date with the same Y/M/D.
    return new Date(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate());
  } catch {
    return new Date();
  }
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
