import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Size = 'sm' | 'md';

interface Props {
  label: string;
  active?: boolean;
  size?: Size;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Pill: rounded toggle pill (recurrence, point values, filter chips).
 * Active state inverts to brand-pink fill with white text.
 */
export default function Pill({ label, active, size = 'md', onPress, disabled, style, textStyle }: Props) {
  const sizeStyle = size === 'sm' ? s.sm : s.md;
  const sizeText = size === 'sm' ? s.smText : s.mdText;
  return (
    <TouchableOpacity
      style={[s.base, sizeStyle, active && s.active, disabled && s.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[s.text, sizeText, active && s.activeText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  sm: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, minWidth: 44, borderWidth: 1 },
  active: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  disabled: { opacity: 0.4 },
  text: { color: theme.colors.muted, fontWeight: '600' },
  mdText: { fontSize: 14 },
  smText: { fontSize: 13 },
  activeText: { color: theme.colors.accentText, fontWeight: '700' },
});
