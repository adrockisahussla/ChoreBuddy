import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { chorePoints } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { Header, Screen, Card, Text, StatCard, SCREEN_BOTTOM_PAD } from '../../components';

/**
 * BuddyHomeScreen — the home view a buddy lands on after sign-in.
 * Mirrors the standalone buddy-app.html surface in the shared design
 * system: greeting header, available-points hero card, four small stat
 * tiles, and a recent-activity feed scoped to this buddy.
 */
export default function BuddyHomeScreen({ navigation }: any) {
  const { fbUser, userDoc } = useCurrentUser();
  const myUid = fbUser?.uid;
  const myName = userDoc?.displayName || 'friend';
  const accent = userDoc?.accent || theme.colors.purple;

  const { chores } = useChores();
  const { reminders } = useReminders();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();

  const my = chores.filter(c => c.assignedTo === myUid);
  const ws = currentWeek();

  const todayChores = my.filter(c => c.recurrence === 'daily' && c.status !== 'approved').length;
  const weekly = my.filter(c => c.recurrence === 'weekly');
  const weeklyDone = weekly.filter(c => c.status === 'approved' && c.weekOf === ws).length;

  const myReminders = reminders.filter(r => r.assignedTo === myUid);
  const upcomingRem = myReminders.filter(r => {
    if (r.recurrence === 'daily' || r.recurrence === 'weekly') return true;
    return (r.dueDate || 0) > Date.now();
  }).length;

  const activeRewards = rewardItems.filter(r => (r as any).kidId === myUid && r.status === 'active').length;

  const approved = my.filter(c => c.status === 'approved');
  const totalEarned = approved.reduce((s, c) => s + chorePoints(c), 0);
  const myClaims = rewardClaims.filter(c => c.kidId === myUid);
  const spent = myClaims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.cost || 0), 0);
  const pendingSpent = myClaims.filter(c => c.status === 'pending').reduce((s, c) => s + (c.cost || 0), 0);
  const available = totalEarned - spent - pendingSpent;

  // Recent activity (last 4 events affecting this buddy)
  const events: { ts: number; icon: string; text: string }[] = [];
  my.forEach(c => {
    if (c.completedAt && c.status === 'approved') {
      events.push({ ts: c.completedAt, icon: '✓', text: `Earned +${chorePoints(c)}pts for "${c.title}"` });
    }
    if (c.status === 'rejected') {
      events.push({ ts: c.createdAt || 0, icon: '✕', text: `"${c.title}" was rejected` });
    }
    if (c.createdAt && c.status === 'todo') {
      events.push({ ts: c.createdAt, icon: '+', text: `New chore: "${c.title}"` });
    }
  });
  myClaims.forEach(c => {
    if (c.status === 'approved' && (c as any).resolvedAt) {
      events.push({ ts: (c as any).resolvedAt, icon: '🎉', text: `Got "${(c as any).rewardTitle}"!` });
    }
  });
  const recent = events.sort((a, b) => b.ts - a.ts).slice(0, 4);

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`Hi, ${myName}!`} onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        {/* Available points hero */}
        <TouchableOpacity activeOpacity={0.85} style={[s.heroCard, { backgroundColor: accent }]}>
          <RNText style={s.heroNum}>{available}</RNText>
          <View style={{ flex: 1 }}>
            <RNText style={s.heroLabel}>Available Points</RNText>
            <RNText style={s.heroSub}>
              {available > 0 ? 'Ready to spend!' : 'Do some chores to earn more!'}
            </RNText>
          </View>
          <RNText style={s.heroChev}>›</RNText>
        </TouchableOpacity>

        {/* 4 stat tiles */}
        <View style={s.grid}>
          <StatCard num={todayChores} title="Today's Chores" />
          <StatCard num={`${weeklyDone}/${weekly.length}`} title="Weekly Progress" />
          <StatCard num={activeRewards} title="Rewards" />
          <StatCard num={upcomingRem} title="Reminders" />
        </View>

        {/* Recent activity */}
        <Text variant="sectionLabel" style={{ marginTop: 18 }}>Recent activity</Text>
        {recent.length === 0 ? (
          <Text variant="empty">Nothing here yet — do a chore!</Text>
        ) : (
          recent.map((e, i) => (
            <Card key={i} row padding={12} radius={theme.radius.lg} style={{ marginBottom: 6, gap: 10 }}>
              <View style={s.eventIcon}>
                <RNText style={s.eventIconText}>{e.icon}</RNText>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '700', fontSize: 14 }}>{e.text}</Text>
                <Text variant="tiny" style={{ marginTop: 2 }}>
                  {new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadow.button,
  },
  heroNum: { color: '#fff', fontWeight: '900', fontSize: 36, minWidth: 50 },
  heroLabel: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  heroChev: { color: '#fff', fontSize: 26, fontWeight: '900' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  eventIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.purpleSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  eventIconText: { color: theme.colors.purple, fontWeight: '900', fontSize: 14 },
});
