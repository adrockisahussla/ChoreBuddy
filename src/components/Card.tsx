import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Variant = 'default' | 'invite' | 'warning' | 'gradient';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  onPress?: () => void;
  style?: ViewStyle;
  row?: boolean;
  padding?: number;
  radius?: number;
  noShadow?: boolean;
}

/**
 * Card: a white surface used everywhere.
 * - default: white card with very-light-purple border + soft shadow
 * - invite: warm-amber tinted (pending invites)
 * - warning: red-bordered (overdue, urgent)
 * - gradient: brand-gradient fill (used for headline stat cards;
 *   stub falls back to a flat pink until LinearGradient ships)
 */
export default function Card({
  children, variant = 'default', onPress, style, row, padding, radius, noShadow,
}: Props) {
  const v = variantStyles[variant];
  const baseStyle: ViewStyle = {
    ...s.base,
    ...v,
    flexDirection: row ? 'row' : 'column',
    alignItems: row ? 'center' : 'stretch',
    padding: padding ?? theme.spacing.md,
    borderRadius: radius ?? theme.radius.xl,
  };
  const shadow = !noShadow && variant !== 'gradient' ? theme.shadow.card : undefined;
  if (onPress) {
    return (
      <TouchableOpacity style={[baseStyle, shadow, style]} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[baseStyle, shadow, style]}>{children}</View>;
}

const s = StyleSheet.create({
  base: {
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  default: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.cardBorder,
  },
  invite: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  warning: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.danger + '80',
  },
  gradient: {
    // Flat-fill stub for brand gradient. Replace with LinearGradient when
    // react-native-linear-gradient lands.
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
};
