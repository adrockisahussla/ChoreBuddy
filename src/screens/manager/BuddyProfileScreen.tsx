import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { isOverdue, buddyLabel, buddyPoints } from '../../utils/buddy';
import { Header, Screen, Card, Avatar, Text, AddBuddyForm, BuddyStatPillsCard, SCREEN_BOTTOM_PAD } from '../../components';

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
  const pts = buddyPoints(chores, rewardClaims, buddyUid);
  // Total = todo + pending + approved + rejected (all active chore states).
  const myChores = my.filter(c =>
    c.status === 'todo' || c.status === 'pending' || c.status === 'approved' || c.status === 'rejected',
  ).length;
  const myReadyToCollect = my.filter(c => c.status === 'approved' && !c.collectedAt).length;
  const myApprovals = my.filter(c => c.status === 'pending').length;
  const myOverdue = my.filter(c => (c.status === 'todo' || c.status === 'pending') && isOverdue(c)).length;
  const myRewardReq = rewardItems.filter(r => r.kidId === buddyUid && r.status === 'requested').length
    + rewardClaims.filter(c => c.kidId === buddyUid && c.status === 'pending').length;
  const myReminders = reminders.filter(r => {
    if (r.assignedTo !== buddyUid) return false;
    const t = new Date(r.date + (r.time ? 'T' + r.time : 'T23:59:59')).getTime();
    return t > Date.now();
  }).length;

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
          <Text style={s.heroPoints}>★ {pts.available} pts</Text>
          {(pts.ready > 0 || pts.pendingSpent > 0) && (
            <Text style={s.heroPointsSub}>
              {pts.ready > 0 ? `${pts.ready} ready to collect` : ''}
              {pts.ready > 0 && pts.pendingSpent > 0 ? '  ·  ' : ''}
              {pts.pendingSpent > 0 ? `${pts.pendingSpent} pts pending claim` : ''}
            </Text>
          )}
        </Card>

        <AddBuddyForm
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          buddy={buddy}
        />

        {!!buddy && (
          <BuddyStatPillsCard
            buddy={buddy}
            navigation={navigation}
            overdue={myOverdue}
            chores={myChores}
            approvals={myApprovals}
            reminders={myReminders}
            rewards={myRewardReq}
            readyToCollect={myReadyToCollect}
            hideHeader
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  editBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
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
  heroPointsSub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '700',
  },
});
