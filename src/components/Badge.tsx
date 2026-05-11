import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

type Variant = 'attention' | 'active' | 'points' | 'stat' | 'easy' | 'medium' | 'hard';

interface Props {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

/**
 * Badge: small emphasis tag.
 * - attention: red filled with white text (needs-your-attention counts)
 * - active: red circle/oval (single-digit count)
 * - points: pink-tinted (★ 60)
 * - stat: muted outlined (🔔 2)
 * - easy / medium / hard: difficulty levels
 */
export default function Badge({ label, variant = 'attention', style }: Props) {
  const v = variantStyles[variant];
  return (
    <View style={[v.box, style]}>
      <Text style={v.text}>{label}</Text>
    </View>
  );
}

const variantStyles: Record<Variant, { box: ViewStyle; text: TextStyle }> = {
  attention: {
    box: { backgroundColor: theme.colors.danger, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    text: { color: '#fff', fontSize: 11, fontWeight: '700' },
  },
  active: {
    box: { backgroundColor: theme.colors.danger, borderRadius: 999, minWidth: 24, height: 22, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
    text: { color: '#fff', fontSize: 12, fontWeight: '700' },
  },
  points: {
    box: { backgroundColor: theme.colors.accent + '22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    text: { color: theme.colors.accent, fontSize: 12, fontWeight: '700' },
  },
  stat: {
    box: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    text: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  },
  easy: {
    box: { backgroundColor: theme.colors.warningSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    text: { color: theme.colors.easy, fontSize: 11, fontWeight: '700' },
  },
  medium: {
    box: { backgroundColor: '#ffedd5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    text: { color: theme.colors.medium, fontSize: 11, fontWeight: '700' },
  },
  hard: {
    box: { backgroundColor: theme.colors.dangerSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    text: { color: theme.colors.hard, fontSize: 11, fontWeight: '700' },
  },
};
