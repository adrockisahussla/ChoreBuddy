import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, ScrollView, TouchableOpacity, StyleSheet, Pressable, Platform,
  NativeSyntheticEvent, NativeScrollEvent, Text as RNText,
} from 'react-native';
import { theme } from '../theme';
import Text from './Text';

interface Props {
  visible: boolean;
  /** Initial value as { h: 0-23, m: 0-59 }. Defaults to 9:00 AM. */
  initial?: { h: number; m: number };
  onClose: () => void;
  /** Fires with 24-hour { h, m } on Done. */
  onConfirm: (value: { h: number; m: number }) => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;        // 2 above, current, 2 below — softer feel than 3
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);          // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);            // 0..59
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

/**
 * TimeWheel: bottom-sheet wheel/drum picker for time entry.
 * iOS-style three-column scroll: HH | MM | AM/PM.
 *
 * Uses native ScrollView with snapToInterval — no 3rd-party deps,
 * no native rebuild required. Top + bottom padding makes the
 * selected row sit in the centred highlight band.
 */
export default function TimeWheel({ visible, initial, onClose, onConfirm }: Props) {
  const initH24 = initial?.h ?? 9;
  const initM = initial?.m ?? 0;
  const initPeriod = initH24 >= 12 ? 'PM' : 'AM';
  const initH12 = initH24 % 12 === 0 ? 12 : initH24 % 12;

  const [hIndex, setHIndex] = useState(HOURS.indexOf(initH12));
  const [mIndex, setMIndex] = useState(initM);
  const [pIndex, setPIndex] = useState(PERIODS.indexOf(initPeriod));

  const hRef = useRef<ScrollView>(null);
  const mRef = useRef<ScrollView>(null);
  const pRef = useRef<ScrollView>(null);

  // Re-sync wheels to the latest `initial` each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const h24 = initial?.h ?? 9;
    const m = initial?.m ?? 0;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const hi = HOURS.indexOf(h12);
    const mi = m;
    const pi = PERIODS.indexOf(period);
    setHIndex(hi);
    setMIndex(mi);
    setPIndex(pi);
    // Wait a beat for the ScrollViews to mount, then snap to position.
    setTimeout(() => {
      hRef.current?.scrollTo({ y: hi * ITEM_HEIGHT, animated: false });
      mRef.current?.scrollTo({ y: mi * ITEM_HEIGHT, animated: false });
      pRef.current?.scrollTo({ y: pi * ITEM_HEIGHT, animated: false });
    }, 50);
  }, [visible, initial]);

  const onScrollEnd = (
    setter: (i: number) => void,
    max: number,
  ) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.max(0, Math.min(max - 1, Math.round(y / ITEM_HEIGHT)));
    setter(i);
  };

  const confirm = () => {
    const h12 = HOURS[hIndex];
    const m = MINUTES[mIndex];
    const period = PERIODS[pIndex];
    let h24: number;
    if (period === 'AM') {
      h24 = h12 === 12 ? 0 : h12;
    } else {
      h24 = h12 === 12 ? 12 : h12 + 12;
    }
    onConfirm({ h: h24, m });
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
      {/* Sibling layout: backdrop fills screen, sheet sits on top.
          Avoids the Pressable-wrapping-ScrollView gesture conflict that
          swallows scroll drags on Android. */}
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 16 }}>Pick a time</Text>

          <View style={s.wheelsRow}>
            {/* Centered highlight band sits behind the columns */}
            <View pointerEvents="none" style={s.centerBand} />

            {renderWheel(HOURS,   hIndex, hRef, onScrollEnd(setHIndex, HOURS.length))}
            <RNText style={s.separator}>:</RNText>
            {renderWheel(MINUTES, mIndex, mRef, onScrollEnd(setMIndex, MINUTES.length), v => String(v).padStart(2, '0'))}
            {renderWheel(PERIODS as unknown as string[], pIndex, pRef, onScrollEnd(setPIndex, PERIODS.length))}
          </View>

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
  /** Centered highlight band — the visible selection guide. */
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
    maxWidth: 110,
  },
  separator: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.muted,
    paddingHorizontal: 4,
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 22,
    fontWeight: '500',
    color: theme.colors.muted,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  rowTextActive: {
    fontSize: 26,
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
  confirmText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
