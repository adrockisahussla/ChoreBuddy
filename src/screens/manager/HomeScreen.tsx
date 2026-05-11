import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Share, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useInvites } from '../../hooks/useInvites';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { buddyLabel, isOverdue, chorePoints } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { inviteService } from '../../services/inviteService';
import {
  Header, Screen, Card, Avatar, Text, Button, StatCard,
  AddBuddyForm, useConfirm,
} from '../../components';

export default function HomeScreen({ navigation }: any) {
  const { chores } = useChores();
  const { reminders } = useReminders();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();
  const { invites } = useInvites();
  const { buddies } = useBuddies();
  const [addOpen, setAddOpen] = useState(false);
  const confirm = useConfirm();

  const drawer = navigation.getParent?.();
  const goActiveChores = () => navigation.navigate('ActiveChores');
  const goReminders = () => drawer?.navigate('Reminders');

  const pendingChores = chores.filter(c => c.status === 'pending').length;
  const pendingRewards = rewardItems.filter(r => r.status === 'requested').length;
  const pendingClaims = rewardClaims.filter(c => c.status === 'pending').length;
  const totalPending = pendingChores + pendingRewards + pendingClaims;

  const ws = currentWeek();
  const weekChores = chores.filter(c => {
    if (c.recurrence === 'weekly' || c.recurrence === 'daily') return (c.weekOf || '') <= ws;
    return c.weekOf === ws;
  });
  const overdueCount = weekChores.filter(isOverdue).length;
  const upcomingReminders = reminders.filter(r => {
    const t = new Date(r.date + (r.time ? 'T' + r.time : 'T23:59:59')).getTime();
    return t > Date.now();
  }).length;

  const pendingInvites = invites.filter(i => i.status === 'pending' && i.expiresAt > Date.now());

  const events: { ts: number; icon: string; text: string }[] = [];
  chores.forEach(c => {
    if (c.completedAt && c.status === 'approved') events.push({ ts: c.completedAt, icon: '✓', text: `${buddyLabel(c.assignedTo, buddies)} earned +${chorePoints(c)}pts for "${c.title}"` });
    if (c.status === 'pending') events.push({ ts: c.createdAt || 0, icon: '⏳', text: `${buddyLabel(c.assignedTo, buddies)} marked "${c.title}" done` });
    if (c.createdAt && c.status === 'todo') events.push({ ts: c.createdAt, icon: '+', text: `New chore "${c.title}" → ${buddyLabel(c.assignedTo, buddies)}` });
  });
  rewardItems.forEach(r => {
    if (r.status === 'requested') events.push({ ts: r.createdAt || 0, icon: '🎁', text: `${buddyLabel(r.kidId, buddies)} requested "${r.title}"` });
    if (r.approvedAt) events.push({ ts: r.approvedAt, icon: '✓', text: `Approved "${r.title}" for ${buddyLabel(r.kidId, buddies)}` });
  });
  rewardClaims.forEach(c => {
    if (c.status === 'pending') events.push({ ts: c.claimedAt, icon: '💸', text: `${buddyLabel(c.kidId, buddies)} wants to claim "${c.rewardTitle}"` });
    if (c.status === 'approved' && c.resolvedAt) events.push({ ts: c.resolvedAt, icon: '🎉', text: `${buddyLabel(c.kidId, buddies)} got "${c.rewardTitle}" (${c.cost}pts)` });
  });
  const recent = events.sort((a, b) => b.ts - a.ts).slice(0, 4);

  const shareInvite = async (token: string) => {
    try { await Share.share({ message: `You've been invited to BuddyMinder! Token: ${token}` }); } catch {}
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header
        title="Home"
        badge={totalPending}
        onMenuPress={() => navigation.getParent?.()?.openDrawer?.()}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Text variant="sectionLabel" style={{ marginTop: 0 }}>Buddies</Text>
        {buddies.length > 0 ? (
          <View style={s.buddiesGrid}>
            {buddies.map(b => {
              const myActive = chores.filter(c => c.assignedTo === b.uid && (c.status === 'todo' || c.status === 'pending')).length;
              const pendingMyChores = chores.filter(c => c.assignedTo === b.uid && c.status === 'pending').length;
              const pendingMyRewards = rewardItems.filter(r => r.kidId === b.uid && r.status === 'requested').length;
              const pendingMyClaims = rewardClaims.filter(c => c.kidId === b.uid && c.status === 'pending').length;
              const attention = pendingMyChores + pendingMyRewards + pendingMyClaims;
              return (
                <TouchableOpacity
                  key={b.uid}
                  style={s.buddyGridCard}
                  onPress={() => navigation.navigate('BuddyProfile', { kidId: b.uid })}
                  activeOpacity={0.85}
                >
                  <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="md" attention={attention} style={{ marginBottom: 8 }} />
                  <Text variant="body" style={{ fontSize: 14 }}>{b.displayName}</Text>
                  <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>{myActive} active</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text variant="meta" style={{ marginBottom: 8 }}>No buddies yet — add one below.</Text>
        )}
        <Button
          label={addOpen ? '— Close' : '+ Add a Buddy'}
          variant="primary"
          onPress={() => setAddOpen(o => !o)}
          style={{ marginTop: 8 }}
        />
        {addOpen && <AddBuddyForm onDone={() => setAddOpen(false)} />}

        <Text variant="sectionLabel" style={{ marginTop: 24 }}>Summary</Text>
        <StatCard
          num={weekChores.length}
          numColor={overdueCount > 0 ? theme.colors.danger : theme.colors.blue}
          title="Active Chores"
          meta={`This week${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}`}
          onPress={goActiveChores}
        />
        <StatCard
          num={totalPending}
          numColor={totalPending > 0 ? theme.colors.danger : theme.colors.muted}
          title="Approvals"
          meta={`${pendingChores} chores · ${pendingRewards} rewards · ${pendingClaims} claims`}
          onPress={goActiveChores}
        />
        <StatCard
          num={upcomingReminders}
          numColor={theme.colors.purple}
          title="Reminders"
          meta="Upcoming"
          onPress={goReminders}
        />

        {pendingInvites.length > 0 && (
          <>
            <Text variant="sectionLabel">Pending Invites ({pendingInvites.length})</Text>
            {pendingInvites.map(inv => (
              <Card key={inv.id} row variant="invite" style={{ gap: 12 }}>
                <Avatar emoji={inv.avatar || '👤'} accent={theme.colors.accent} size="sm" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.inviteName}>{inv.suggestedName}</Text>
                    <View style={s.invitePill}>
                      <RNText style={s.invitePillText}>{inv.role === 'manager' ? 'CO-MANAGER' : 'BUDDY'}</RNText>
                    </View>
                  </View>
                  <Text style={s.inviteMeta}>
                    ⏳ expires {new Date(inv.expiresAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity style={s.iconBtn} onPress={() => shareInvite(inv.token)}>
                  <RNText style={s.iconBtnText}>🔗</RNText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.iconBtn}
                  onPress={async () => {
                    const ok = await confirm({
                      title: 'Revoke',
                      message: 'Revoke this invite?',
                      confirmLabel: 'Revoke',
                      confirmDestructive: true,
                    });
                    if (ok) inviteService.revoke(inv.id);
                  }}
                >
                  <RNText style={s.iconBtnText}>🗑</RNText>
                </TouchableOpacity>
              </Card>
            ))}
          </>
        )}

        {recent.length > 0 && (
          <>
            <Text variant="sectionLabel">Recent Activity</Text>
            {recent.map((e, i) => (
              <Card key={i} row radius={theme.radius.lg} padding={10} style={{ alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                <RNText style={s.activityIcon}>{e.icon}</RNText>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontSize: 13, lineHeight: 18 }}>{e.text}</Text>
                  <Text variant="tiny" style={{ marginTop: 2 }}>
                    {new Date(e.ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  buddiesGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  buddyGridCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: 16,
    alignItems: 'center',
    ...theme.shadow.card,
  },
  inviteName: { color: '#92400e', fontWeight: '700', fontSize: 14 },
  invitePill: { backgroundColor: '#fcd34d', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  invitePillText: { color: '#78350f', fontSize: 10, fontWeight: '700' },
  inviteMeta: { color: '#92400e', fontSize: 12, fontWeight: '500', marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 999, backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { fontSize: 14, color: theme.colors.accent },
  activityIcon: { fontSize: 16, width: 24, textAlign: 'center', paddingTop: 1 },
});
