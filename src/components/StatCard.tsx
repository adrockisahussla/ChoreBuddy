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
}

/**
 * StatCard: large-number + title + meta + chevron card used on Home for
 * Active Chores, Pending Approvals, Reminders.
 */
export default function StatCard({ num, numColor, title, meta, onPress }: Props) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={[s.num, { color: numColor || theme.colors.blue }]}>{num}</Text>
      <View style={{ flex: 1 }}>
        <Text variant="h3">{title}</Text>
        {!!meta && <Text variant="meta" style={{ marginTop: 2 }}>{meta}</Text>}
      </View>
      <Text style={s.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: 14, marginBottom: 8,
  },
  num: { fontSize: 32, fontWeight: '900', minWidth: 50, textAlign: 'center' },
  arrow: { color: theme.colors.muted, fontSize: 22, fontWeight: '900' },
});
