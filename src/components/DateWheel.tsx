import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, ScrollView, TouchableOpacity, StyleSheet, Pressable,
  NativeSyntheticEvent, NativeScrollEvent, Text as RNText,
} from 'react-native';
import { theme } from '../theme';
import Text from './Text';

interface Props {
  visible: boolean;
  /** Initial value (defaults to today). */
  initial?: Date;
  /** Earliest pickable date (defaults to today — past dates dimmed). */
  minDate?: Date;
  /** How many years forward to include in the year wheel. Default 5. */
  yearsAhead?: number;
  onClose: () => void;
  onConfirm: (value: Date) => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Days in given month/year (handles Feb leap year). */
function daysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

/**
 * DateWheel: bottom-sheet 3-column drum picker — Month / Day / Year.
 * Same UX shell as TimeWheel: snap-scroll columns, center band,
 * dimmed neighbours, Done/Cancel actions.
 *
 * Day column auto-rebuilds when month or year changes (e.g. 31 → 30
 * when switching from Jan to Feb), clamping selection to the new max.
 */
export default function DateWheel({
  visible, initial, minDate, yearsAhead = 5, onClose, onConfirm,
}: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const startDate = initial || today;
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const startDay = startDate.getDate();

  // Year range: current year through current + yearsAhead.
  const years = useMemo(() => {
    const baseYear = today.getFullYear();
    return Array.from({ length: yearsAhead + 1 }, (_, i) => baseYear + i);
  }, [today, yearsAhead]);

  const [yIndex, setYIndex] = useState(Math.max(0, years.indexOf(startYear)));
  const [mIndex, setMIndex] = useState(startMonth);
  const [dIndex, setDIndex] = useState(startDay - 1);

  const yRef = useRef<ScrollView>(null);
  const mRef = useRef<ScrollView>(null);
  const dRef = useRef<ScrollView>(null);

  // Days available for currently-selected month/year.
  const days = useMemo(() => {
    const max = daysInMonth(years[yIndex], mIndex);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [years, yIndex, mIndex]);

  // Clamp day index when month/year change (e.g. Mar 31 → Feb 28).
  useEffect(() => {
    if (dIndex >= days.length) {
      const newIndex = days.length - 1;
      setDIndex(newIndex);
      setTimeout(() => {
        dRef.current?.scrollTo({ y: newIndex * ITEM_HEIGHT, animated: true });
      }, 20);
    }
  }, [days.length, dIndex]);

  // Re-sync to `initial` each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const d = initial || today;
    const yi = Math.max(0, years.indexOf(d.getFullYear()));
    const mi = d.getMonth();
    const di = d.getDate() - 1;
    setYIndex(yi);
    setMIndex(mi);
    setDIndex(di);
    setTimeout(() => {
      yRef.current?.scrollTo({ y: yi * ITEM_HEIGHT, animated: false });
      mRef.current?.scrollTo({ y: mi * ITEM_HEIGHT, animated: false });
      dRef.current?.scrollTo({ y: di * ITEM_HEIGHT, animated: false });
    }, 50);
  }, [visible, initial, today, years]);

  const onScrollEnd = (
    setter: (i: number) => void,
    max: number,
  ) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.max(0, Math.min(max - 1, Math.round(y / ITEM_HEIGHT)));
    setter(i);
  };

  const minMs = (minDate || today).getTime();
  const pickedDate = useMemo(
    () => new Date(years[yIndex], mIndex, days[dIndex] || 1),
    [years, yIndex, mIndex, days, dIndex],
  );
  const isValid = pickedDate.getTime() >= minMs;

  const confirm = () => {
    if (!isValid) return;
    onConfirm(pickedDate);
    onClose();
  };

  const renderWheel = (
    items: (string | number)[],
    activeIndex: number,
    ref: React.RefObject<ScrollView | null>,
    onEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => void,
    pad?: (v: number | string) => string,
  ) => (
    <View style={s.wheelCol}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PAD_ITEMS }}
        style={{ height: WHEEL_HEIGHT }}
        bounces={false}
        overScrollMode="never"
      >
        {items.map((v, i) => {
          const distance = Math.abs(i - activeIndex);
          return (
            <View key={i} style={s.row}>
              <RNText
                style={[
                  s.rowText,
                  distance === 0 && s.rowTextActive,
                  distance === 1 && s.rowTextNear,
                  distance >= 2 && s.rowTextFar,
                ]}
              >
                {pad ? pad(v) : v}
              </RNText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 16 }}>Pick a date</Text>

          <View style={s.wheelsRow}>
            <View pointerEvents="none" style={s.centerBand} />

            {renderWheel(MONTHS,                 mIndex, mRef, onScrollEnd(setMIndex, MONTHS.length))}
            {renderWheel(days,                   dIndex, dRef, onScrollEnd(setDIndex, days.length))}
            {renderWheel(years,                  yIndex, yRef, onScrollEnd(setYIndex, years.length))}
          </View>

          {!isValid && (
            <Text variant="tiny" style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 8 }}>
              Pick a date in the future.
            </Text>
          )}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <RNText style={s.cancelText}>Cancel</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, !isValid && s.confirmDisabled]}
              disabled={!isValid}
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
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
    height: WHEEL_HEIGHT,
  },
  centerBand: {
    position: 'absolute',
    top: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: theme.colors.bg,
    borderRadius: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  wheelCol: {
    flex: 1,
    maxWidth: 120,
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 20,
    fontWeight: '500',
    color: theme.colors.muted,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  rowTextActive: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowTextNear: { opacity: 0.7 },
  rowTextFar: { opacity: 0.35 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
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
