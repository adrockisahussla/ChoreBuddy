import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { chorePoints, isOverdue, buddyLabel } from '../../utils/buddy';
import { Header, Screen, Card, Avatar, Text, StatCard, AddBuddyForm, SCREEN_BOTTOM_PAD } from '../../components';

export default function BuddyProfileScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { buddies } = useBuddies();
  const buddy = buddies.find(b => b.uid === buddyUid);
  const [editOpen, setEditOpen] = useState(false);
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
    { label: 'Chores',  num: active,           meta: overdue > 0 ? `${overdue} overdue` : undefined,                onPress: () => navigation.navigate('BuddyChores',    { kidId: buddyUid }) },
    { label: 'Rewards', num: myRewards.length, meta: rewardsAttention > 0 ? `${rewardsAttention} pending` : undefined, onPress: () => navigation.navigate('BuddyRewards',   { kidId: buddyUid }) },
    { label: 'Alerts',  num: myReminders,      meta: myReminders > 0 ? 'upcoming' : undefined,                       onPress: () => navigation.navigate('BuddyReminders', { kidId: buddyUid }) },
    { label: 'Map',     num: '·',              meta: 'live',                                                         onPress: () => navigation.navigate('BuddyMap',       { kidId: buddyUid }) },
  ];

  const accent = buddy?.accent || theme.colors.purple;
  const name = buddy?.displayName || buddyLabel(buddyUid, buddies);

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${name} · Profile`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Card padding={20} radius={theme.radius.xl} style={s.heroCard}>
          {!!buddy && (
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => setEditOpen(true)}
              hitSlop={10}
            >
              <RNText style={s.editIcon}>✏️</RNText>
            </TouchableOpacity>
          )}
          <Avatar emoji={buddy?.avatar || '👤'} accent={accent} size="lg" />
          <Text variant="h1" style={{ marginTop: 14 }} numberOfLines={1}>{name}</Text>
          {buddy?.email && (
            <Text variant="meta" style={{ marginTop: 4, fontSize: 13 }} numberOfLines={1}>
              {buddy.email}
            </Text>
          )}
          <Text style={s.heroPoints}>★ {points} pts</Text>
        </Card>

        <AddBuddyForm
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          buddy={buddy}
        />

        <Text variant="sectionLabel" style={{ marginTop: 12 }}>Quick Access</Text>
        {QUICK.map(q => (
          <StatCard
            key={q.label}
            num={q.num}
            title={q.label}
            meta={q.meta}
            onPress={q.onPress}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  editBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  editIcon: { fontSize: 16 },
  heroPoints: {
    marginTop: 10,
    fontSize: 18,
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
