import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Variant = 'default' | 'invite' | 'warning';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  onPress?: () => void;
  style?: ViewStyle;
  row?: boolean;
  padding?: number;
  radius?: number;
}

/**
 * Card: the standard surface used everywhere.
 * - default: dark card with cardBorder stroke
 * - invite: warm/yellow tinted (used for pending invites)
 * - warning: red-tinted outline
 */
export default function Card({ children, variant = 'default', onPress, style, row, padding, radius }: Props) {
  const variantStyle = variantStyles[variant];
  const baseStyle: ViewStyle = {
    ...s.base,
    ...variantStyle,
    flexDirection: row ? 'row' : 'column',
    alignItems: row ? 'center' : 'stretch',
    padding: padding ?? theme.spacing.md,
    borderRadius: radius ?? theme.radius.xl,
  };
  if (onPress) {
    return (
      <TouchableOpacity style={[baseStyle, style]} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[baseStyle, style]}>{children}</View>;
}

const s = StyleSheet.create({
  base: {
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  default: { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
  invite: { backgroundColor: '#1e1c10', borderColor: theme.colors.accent + '50' },
  warning: { backgroundColor: theme.colors.card, borderColor: theme.colors.danger + '60' },
};
