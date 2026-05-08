import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { chorePoints, isOverdue, buddyLabel } from '../../utils/buddy';
import Header from '../../components/Header';

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
  const myReminders = reminders.filter(r => r.assignedTo === buddyUid).length;

  const QUICK = [
    { label: 'Chores', icon: '✓', count: active, sub: overdue > 0 ? `${overdue} overdue` : 'active', onPress: () => navigation.navigate('BuddyChores', { kidId: buddyUid }) },
    { label: 'Rewards', icon: '🎁', count: myRewards.length, sub: pendingClaims > 0 ? `${pendingClaims} claim` : 'set', onPress: () => navigation.navigate('BuddyRewards', { kidId: buddyUid }) },
    { label: 'Reminders', icon: '🔔', count: myReminders, sub: 'upcoming', onPress: () => navigation.navigate('BuddyReminders', { kidId: buddyUid }) },
    { label: 'Map', icon: '📍', count: null as any, sub: 'live', onPress: () => navigation.navigate('BuddyMap', { kidId: buddyUid }) },
  ];

  const accent = buddy?.accent || theme.colors.purple;
  const name = buddy?.displayName || buddyLabel(buddyUid, buddies);

  return (
    <SafeAreaView style={s.root}>
      <Header title={`${name} · Profile`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={s.heroRow}>
          <View style={[s.avatar, { backgroundColor: accent + '40' }]}>
            <Text style={{ fontSize: 36 }}>{buddy?.avatar || '👤'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroName}>{name}</Text>
            {buddy?.email && <Text style={s.heroSub}>{buddy.email}</Text>}
            <Text style={s.heroSub}>★ {points} pts</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Quick Access</Text>
        <View style={s.quickGrid}>
          {QUICK.map(q => (
            <TouchableOpacity key={q.label} style={s.quickCard} onPress={q.onPress}>
              <Text style={s.quickIcon}>{q.icon}</Text>
              <Text style={s.quickLabel}>{q.label}</Text>
              {q.count !== null && <Text style={s.quickCount}>{q.count}</Text>}
              <Text style={s.quickSub}>{q.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xxl, marginBottom: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  heroName: { color: theme.colors.text, fontSize: 22, fontWeight: '900' },
  heroSub: { color: theme.colors.muted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  sectionLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '48%', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, padding: 14, alignItems: 'center' },
  quickIcon: { fontSize: 26, marginBottom: 4 },
  quickLabel: { color: theme.colors.text, fontWeight: '900', fontSize: 13 },
  quickCount: { color: theme.colors.accent, fontSize: 24, fontWeight: '900', marginTop: 4 },
  quickSub: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
});
