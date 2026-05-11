import React from 'react';
import { TouchableOpacity, Text, View, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'dashed' | 'danger' | 'ghost';

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
 * - primary: accent yellow fill, black text
 * - secondary: card-tone fill, accent border-less, white text
 * - dashed: empty fill, dashed accent (or muted) border
 * - danger: empty fill, red border + red text
 * - ghost: no border, no fill (text-only)
 *
 * subLabel renders a small line under the label (used for footer pairs
 * like "Save / Pool only").
 */
export default function Button({ label, subLabel, onPress, variant = 'primary', disabled, style, full }: Props) {
  const v = variantStyles[variant];
  return (
    <TouchableOpacity
      style={[s.base, v.box, full && s.full, disabled && s.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[s.label, v.label]}>{label}</Text>
      {!!subLabel && (
        <Text style={[s.sub, v.sub]}>{subLabel}</Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  full: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  label: { fontSize: 15, fontWeight: '900' },
  sub: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});

const variantStyles: Record<Variant, { box: ViewStyle; label: TextStyle; sub: TextStyle }> = {
  primary: {
    box: { backgroundColor: theme.colors.accent },
    label: { color: '#000' },
    sub: { color: '#000', opacity: 0.7 },
  },
  secondary: {
    box: { backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardBorder },
    label: { color: theme.colors.text },
    sub: { color: theme.colors.muted },
  },
  dashed: {
    box: { borderWidth: 2, borderColor: theme.colors.cardBorder, borderStyle: 'dashed' },
    label: { color: theme.colors.muted },
    sub: { color: theme.colors.muted },
  },
  danger: {
    box: { borderWidth: 1.5, borderColor: theme.colors.danger + '80' },
    label: { color: theme.colors.danger },
    sub: { color: theme.colors.danger },
  },
  ghost: {
    box: { backgroundColor: 'transparent' },
    label: { color: theme.colors.muted },
    sub: { color: theme.colors.muted },
  },
};
