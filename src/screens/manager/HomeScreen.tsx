import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Share } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useInvites } from '../../hooks/useInvites';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { buddyLabel, isOverdue, chorePoints } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { inviteService } from '../../services/inviteService';
import AddBuddyForm from '../../components/AddBuddyForm';
import Header from '../../components/Header';
import { useConfirm } from '../../components/ConfirmModal';

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
    <SafeAreaView style={s.root}>
      <Header
        title="Home"
        badge={totalPending}
        onMenuPress={() => navigation.getParent?.()?.openDrawer?.()}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Text style={[s.sectionLabel, { marginTop: 0 }]}>Buddies</Text>
        {buddies.length > 0 ? (
          <View style={s.buddiesGrid}>
            {buddies.map(b => {
              const myActive = chores.filter(c => c.assignedTo === b.uid && (c.status === 'todo' || c.status === 'pending')).length;
              const pendingMyChores = chores.filter(c => c.assignedTo === b.uid && c.status === 'pending').length;
              const pendingMyRewards = rewardItems.filter(r => r.kidId === b.uid && r.status === 'requested').length;
              const pendingMyClaims = rewardClaims.filter(c => c.kidId === b.uid && c.status === 'pending').length;
              const attention = pendingMyChores + pendingMyRewards + pendingMyClaims;
              return (
                <TouchableOpacity key={b.uid} style={s.buddyCard} onPress={() => navigation.navigate('BuddyProfile', { kidId: b.uid })}>
                  <View style={[s.buddyAvatar, { backgroundColor: (b.accent || theme.colors.purple) + '40' }]}>
                    <Text style={{ fontSize: 28 }}>{b.avatar || '👤'}</Text>
                    {attention > 0 && (
                      <View style={s.attentionDot}><Text style={s.attentionDotText}>{attention}</Text></View>
                    )}
                  </View>
                  <Text style={s.buddyName}>{b.displayName}</Text>
                  <Text style={s.buddyMeta}>{myActive} active</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={s.emptyHint}>No buddies yet — add one below.</Text>
        )}
        <TouchableOpacity style={s.addBtn} onPress={() => setAddOpen(o => !o)}>
          <Text style={s.addBtnText}>{addOpen ? '— Close' : '+ Add a Buddy'}</Text>
        </TouchableOpacity>
        {addOpen && <AddBuddyForm onDone={() => setAddOpen(false)} />}

        <TouchableOpacity style={s.card} onPress={goActiveChores}>
          <Text style={[s.bigNum, { color: overdueCount > 0 ? theme.colors.danger : theme.colors.blue }]}>{weekChores.length}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Active Chores</Text>
            <Text style={s.cardMeta}>This week{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={goActiveChores}>
          <Text style={[s.bigNum, { color: totalPending > 0 ? theme.colors.danger : theme.colors.muted }]}>{totalPending}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Pending Approvals</Text>
            <Text style={s.cardMeta}>{pendingChores} chores · {pendingRewards} reward requests · {pendingClaims} claims</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={goReminders}>
          <Text style={[s.bigNum, { color: theme.colors.purple }]}>{upcomingReminders}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Reminders</Text>
            <Text style={s.cardMeta}>Upcoming</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>

        {pendingInvites.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Pending Invites ({pendingInvites.length})</Text>
            {pendingInvites.map(inv => (
              <View key={inv.id} style={s.inviteRow}>
                <View style={s.inviteAvatar}>
                  <Text style={{ fontSize: 22 }}>{inv.avatar || '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.inviteName}>{inv.suggestedName}</Text>
                    <View style={s.invitePill}>
                      <Text style={s.invitePillText}>{inv.role === 'manager' ? 'CO-MANAGER' : 'BUDDY'}</Text>
                    </View>
                  </View>
                  <Text style={s.inviteMeta}>⏳ expires {new Date(inv.expiresAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</Text>
                </View>
                <TouchableOpacity style={s.iconBtn} onPress={() => shareInvite(inv.token)}>
                  <Text style={s.iconBtnText}>🔗</Text>
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
                  <Text style={s.iconBtnText}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {recent.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Recent Activity</Text>
            {recent.map((e, i) => (
              <View key={i} style={s.activityRow}>
                <Text style={s.activityIcon}>{e.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.activityText}>{e.text}</Text>
                  <Text style={s.activityTime}>{new Date(e.ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, padding: 14, marginBottom: 8 },
  bigNum: { fontSize: 32, fontWeight: '900', minWidth: 50, textAlign: 'center' },
  cardTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 15 },
  cardMeta: { color: theme.colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  arrow: { color: theme.colors.muted, fontSize: 22, fontWeight: '900' },
  sectionLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
  buddiesGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  buddyCard: { flex: 1, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, padding: 14, alignItems: 'center' },
  buddyAvatar: { position: 'relative', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.card },
  attentionDot: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.colors.danger, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.colors.card },
  attentionDotText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  buddyName: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  buddyMeta: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e1c10', borderWidth: 1, borderColor: theme.colors.accent + '50', borderRadius: theme.radius.xl, padding: 12, marginBottom: 8 },
  inviteAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent + '26', justifyContent: 'center', alignItems: 'center' },
  inviteName: { color: theme.colors.accent, fontWeight: '900', fontSize: 14 },
  invitePill: { backgroundColor: theme.colors.accent + '33', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  invitePillText: { color: theme.colors.accent, fontSize: 10, fontWeight: '900' },
  inviteMeta: { color: '#b8932f', fontSize: 11, fontWeight: '700', marginTop: 2 },
  iconBtn: { width: 32, height: 32, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { fontSize: 14, color: theme.colors.accent },
  emptyHint: { color: theme.colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  addBtn: { padding: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, alignItems: 'center', marginTop: 6 },
  addBtnText: { color: theme.colors.muted, fontWeight: '900', fontSize: 14 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 10, marginBottom: 6 },
  activityIcon: { fontSize: 16, width: 24, textAlign: 'center', paddingTop: 1 },
  activityText: { color: theme.colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  activityTime: { color: theme.colors.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
});
