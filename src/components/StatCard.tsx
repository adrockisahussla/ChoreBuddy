import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import Text from './Text';

interface Props {
  num: number | string;
  numColor?: string;
  title: string;
  meta?: string;
  onPress?: () => void;
  variant?: 'default' | 'brand';
}

/**
 * StatCard: large-number + title + meta + chevron card used on Home for
 * Active Chores, Pending Approvals, Reminders.
 *
 * `variant=brand` paints the card in the brand pink (used for the
 * featured "Active Chores" stat).
 */
export default function StatCard({ num, numColor, title, meta, onPress, variant = 'default' }: Props) {
  const brand = variant === 'brand';
  return (
    <TouchableOpacity
      style={[s.card, brand && s.brand, !brand && theme.shadow.card]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[s.num, { color: brand ? '#ffffff' : (numColor || theme.colors.purple) }]}>{num}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="h3" style={{ fontSize: 16, color: brand ? '#ffffff' : theme.colors.text }} numberOfLines={1}>{title}</Text>
        {!!meta && <Text variant="meta" style={{ marginTop: 2, fontSize: 12, color: brand ? '#ffffff' : theme.colors.muted, opacity: brand ? 0.85 : 1 }} numberOfLines={2}>{meta}</Text>}
      </View>
      <Text style={[s.arrow, brand && { color: '#ffffff' }]}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: 14, marginBottom: 10,
  },
  brand: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  num: { fontSize: 28, fontWeight: '700', minWidth: 38, textAlign: 'center' },
  arrow: { color: theme.colors.muted, fontSize: 22, fontWeight: '700' },
});
