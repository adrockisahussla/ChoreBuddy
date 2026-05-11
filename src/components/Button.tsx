import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'dashed' | 'danger' | 'ghost' | 'success';

interface Props {
  label: string;
  subLabel?: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  full?: boolean;
}

/**
 * Button: the standard tappable action.
 * - primary: pink (brand) fill with white text + soft shadow
 * - secondary: white card with light border
 * - dashed: empty fill, dashed accent (or muted) border
 * - danger: empty fill, red border + red text
 * - success: green fill (for "Complete" confirmations)
 * - ghost: no border, no fill
 */
export default function Button({ label, subLabel, onPress, variant = 'primary', disabled, style, full }: Props) {
  const v = variantStyles[variant];
  const shadow = (variant === 'primary' || variant === 'success') && !disabled
    ? theme.shadow.button
    : undefined;
  return (
    <TouchableOpacity
      style={[s.base, v.box, full && s.full, disabled && s.disabled, shadow, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[s.label, v.label]}>{label}</Text>
      {!!subLabel && <Text style={[s.sub, v.sub]}>{subLabel}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999, // fully rounded pill
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  full: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  label: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
});

const variantStyles: Record<Variant, { box: ViewStyle; label: TextStyle; sub: TextStyle }> = {
  primary: {
    box: { backgroundColor: theme.colors.accent },
    label: { color: theme.colors.accentText },
    sub: { color: theme.colors.accentText, opacity: 0.85 },
  },
  secondary: {
    box: { backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardBorder },
    label: { color: theme.colors.text },
    sub: { color: theme.colors.muted },
  },
  dashed: {
    box: { borderWidth: 2, borderColor: theme.colors.cardBorder, borderStyle: 'dashed', backgroundColor: theme.colors.card },
    label: { color: theme.colors.muted },
    sub: { color: theme.colors.muted },
  },
  danger: {
    box: { borderWidth: 1.5, borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft },
    label: { color: theme.colors.danger },
    sub: { color: theme.colors.danger },
  },
  success: {
    box: { backgroundColor: theme.colors.success },
    label: { color: '#ffffff' },
    sub: { color: '#ffffff', opacity: 0.85 },
  },
  ghost: {
    box: { backgroundColor: 'transparent' },
    label: { color: theme.colors.muted },
    sub: { color: theme.colors.muted },
  },
};
