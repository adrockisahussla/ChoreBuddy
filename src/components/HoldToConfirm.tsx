import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, StyleSheet, Text as RNText, Easing } from 'react-native';
import { theme } from '../theme';
import Text from './Text';

interface Props {
  /** Label shown on the button. */
  label: string;
  /** Called once when the user has held continuously for `holdMs`. */
  onConfirm: () => void;
  /** Hold duration in ms before firing onConfirm. Default 5000. */
  holdMs?: number;
  /** Help text shown above the meter. */
  hint?: string;
}

/**
 * HoldToConfirm: a destructive-action button the user must press AND
 * HOLD for a duration before it fires. A meter above the button fills
 * from 0% → 100% over the hold window. Releasing early cancels.
 */
export default function HoldToConfirm({
  label,
  onConfirm,
  holdMs = 5000,
  hint = 'Press and HOLD to confirm',
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => () => animRef.current?.stop(), []);

  const start = () => {
    if (done) return;
    setHolding(true);
    progress.setValue(0);
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) {
        setDone(true);
        setHolding(false);
        onConfirm();
      }
    });
  };

  const cancel = () => {
    if (done) return;
    animRef.current?.stop();
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setHolding(false);
  };

  const widthAnim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.wrap}>
      <Text variant="tiny" style={s.hint}>
        {holding ? '⏳ Keep holding to remove…' : hint}
      </Text>
      <View style={s.meter}>
        <Animated.View style={[s.meterFill, { width: widthAnim }]} />
      </View>
      <Pressable
        onPressIn={start}
        onPressOut={cancel}
        style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
      >
        <RNText style={s.btnText}>{label}</RNText>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  hint: { textAlign: 'center', color: theme.colors.muted, fontSize: 11 },
  meter: {
    height: 8,
    backgroundColor: theme.colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: 8,
    backgroundColor: theme.colors.danger,
  },
  btn: {
    backgroundColor: theme.colors.danger,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  btnPressed: {
    backgroundColor: '#c41728',
    transform: [{ scale: 0.98 }],
  },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
