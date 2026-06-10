import React from 'react';
import { Pressable, Text as RNText, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  onPress: () => void;
  label?: string;
  /** Vertical offset from the bottom. Defaults to 24px. Override when the
   *  containing screen has its own bottom UI (drawer handles, etc.). */
  bottom?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Floating Action Button — round pink "+" pinned bottom-right of its
 * parent. Parent should be a positioning root (e.g. <Screen> or a
 * `position: relative` View) so the absolute placement anchors correctly.
 */
export default function FAB({ onPress, label = '+', bottom = 24, style, testID }: Props) {
  const insets = useSafeAreaInsets();
  // Lift the FAB above the Android system gesture/nav bar. Without the
  // inset, the button sits behind the Samsung nav buttons on phones where
  // the system bar overlaps the app's drawing area.
  const effectiveBottom = bottom + insets.bottom;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        s.fab,
        { bottom: effectiveBottom },
        pressed && { transform: [{ scale: 0.94 }], opacity: 0.92 },
        style,
      ]}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Add"
    >
      <RNText style={s.fabLabel}>{label}</RNText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.button,
    zIndex: 50,
    elevation: 8,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
});
