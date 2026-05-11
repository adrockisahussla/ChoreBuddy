import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { chorePoints, isOverdue, buddyLabel } from '../../utils/buddy';
import { Header, Screen, Card, Avatar, Text } from '../../components';

export default function BuddyProfileScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { buddies } = useBuddies();
  const buddy = buddies.find(b => b.uid === buddyUid);
  const { chores } = useChores();
  const { reminders } = useReminders();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();

  const my = chores.filter(c => c.assignedTo === buddyUid);
  const active = my.filter(c => c.status === 'todo' || c.status === 'pending').length;
  const overdue = my.filter(isOverdue).length;
  const points = my.filter(c => c.status === 'approved').reduce((s, c) => s + chorePoints(c), 0);
  const myRewards = rewardItems.filter(r => r.kidId === buddyUid);
  const myClaims = rewardClaims.filter(c => c.kidId === buddyUid);
  const pendingClaims = myClaims.filter(c => c.status === 'pending').length;
  const pendingRequests = myRewards.filter(r => r.status === 'requested').length;
  const rewardsAttention = pendingRequests + pendingClaims;
  const myReminders = reminders.filter(r => r.assignedTo === buddyUid).length;

  const QUICK = [
    { label: 'Chores', icon: '✓', count: active, sub: overdue > 0 ? `${overdue} overdue` : 'active', onPress: () => navigation.navigate('BuddyChores', { kidId: buddyUid }) },
    { label: 'Rewards', icon: '🎁', count: myRewards.length, sub: rewardsAttention > 0 ? `${rewardsAttention} pending` : 'set', onPress: () => navigation.navigate('BuddyRewards', { kidId: buddyUid }) },
    { label: 'Reminders', icon: '🔔', count: myReminders, sub: 'upcoming', onPress: () => navigation.navigate('BuddyReminders', { kidId: buddyUid }) },
    { label: 'Map', icon: '📍', count: null as any, sub: 'live', onPress: () => navigation.navigate('BuddyMap', { kidId: buddyUid }) },
  ];

  const accent = buddy?.accent || theme.colors.purple;
  const name = buddy?.displayName || buddyLabel(buddyUid, buddies);

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${name} · Profile`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Card row padding={16} radius={theme.radius.xxl} style={{ gap: 16, marginBottom: 12 }}>
          <Avatar emoji={buddy?.avatar || '👤'} accent={accent} size="lg" />
          <View style={{ flex: 1 }}>
            <Text variant="h2" style={{ fontSize: 22 }}>{name}</Text>
            {buddy?.email && <Text variant="meta" style={{ marginTop: 4 }}>{buddy.email}</Text>}
            <Text variant="meta" style={{ marginTop: 4 }}>★ {points} pts</Text>
          </View>
        </Card>

        <Text variant="sectionLabel">Quick Access</Text>
        <View style={s.quickGrid}>
          {QUICK.map(q => (
            <TouchableOpacity key={q.label} style={s.quickCard} onPress={q.onPress} activeOpacity={0.85}>
              <Text style={s.quickIcon}>{q.icon}</Text>
              <Text variant="body" style={{ fontSize: 13 }}>{q.label}</Text>
              {q.count !== null && <Text style={s.quickCount}>{q.count}</Text>}
              <Text variant="tiny" style={{ marginTop: 2 }}>{q.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: 16,
    alignItems: 'center',
    ...theme.shadow.card,
  },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickCount: { color: theme.colors.accent, fontSize: 26, fontWeight: '700', marginTop: 4 },
});
