import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

type Variant = 'attention' | 'active' | 'points' | 'stat';

interface Props {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

/**
 * Badge: small emphasis tag.
 * - attention: red filled with white text — for "needs your attention" counts
 * - active: red circle/oval — usually a single-digit count
 * - points: accent-tinted with star — "★ 60"
 * - stat: outlined neutral — "🔔 2"
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
    box: { backgroundColor: theme.colors.danger, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
    text: { color: '#fff', fontSize: 10, fontWeight: '900' },
  },
  active: {
    box: { backgroundColor: theme.colors.danger, borderRadius: 10, minWidth: 22, height: 20, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' },
    text: { color: '#fff', fontSize: 11, fontWeight: '900' },
  },
  points: {
    box: { backgroundColor: theme.colors.accent + '26', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    text: { color: theme.colors.accent, fontSize: 10, fontWeight: '900' },
  },
  stat: {
    box: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    text: { color: theme.colors.muted, fontSize: 10, fontWeight: '900' },
  },
};

