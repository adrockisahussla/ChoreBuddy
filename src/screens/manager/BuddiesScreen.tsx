import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Share } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useInvites } from '../../hooks/useInvites';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { isOverdue, chorePoints } from '../../utils/buddy';
import { inviteService } from '../../services/inviteService';
import AddBuddyForm from '../../components/AddBuddyForm';
import Header from '../../components/Header';
import { useConfirm } from '../../components/ConfirmModal';

export default function BuddiesScreen({ navigation }: any) {
  const { chores } = useChores();
  const { reminders } = useReminders();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();
  const { invites } = useInvites();
  const { buddies } = useBuddies();
  const [addOpen, setAddOpen] = useState(false);
  const confirm = useConfirm();

  const pendingInvites = invites.filter(i => i.status === 'pending' && i.expiresAt > Date.now());
  const pendingChores = chores.filter(c => c.status === 'pending').length;
  const pendingRewards = rewardItems.filter(r => r.status === 'requested').length;
  const totalPendingClaims = rewardClaims.filter(c => c.status === 'pending').length;
  const totalPending = pendingChores + pendingRewards + totalPendingClaims;

  const shareInvite = async (token: string) => {
    try { await Share.share({ message: `You've been invited to BuddyMinder! Token: ${token}` }); } catch {}
  };

  return (
    <SafeAreaView style={s.root}>
      <Header
        title="All Buddies"
        badge={totalPending}
        onMenuPress={() => navigation.getParent?.()?.openDrawer?.()}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
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
                  <Text style={s.inviteMeta}>⏳ Pending · expires {new Date(inv.expiresAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</Text>
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

        <Text style={s.sectionLabel}>All Buddies</Text>
        {buddies.length === 0 && (
          <Text style={s.empty}>No buddies yet. Tap "+ Add a Buddy" to invite one.</Text>
        )}
        {buddies.map(b => {
          const my = chores.filter(c => c.assignedTo === b.uid);
          const active = my.filter(c => c.status === 'todo' || c.status === 'pending' || isOverdue(c)).length;
          const points = my.filter(c => c.status === 'approved').reduce((sum, c) => sum + chorePoints(c), 0);
          const reminderCount = reminders.filter(r => r.assignedTo === b.uid).length;
          const pendingMyChores = my.filter(c => c.status === 'pending').length;
          const pendingMyRewards = rewardItems.filter(r => r.kidId === b.uid && r.status === 'requested').length;
          const pendingClaims = rewardClaims.filter(c => c.kidId === b.uid && c.status === 'pending').length;
          const attention = pendingMyChores + pendingMyRewards + pendingClaims;
          return (
            <TouchableOpacity
              key={b.uid}
              style={s.row}
              onPress={() => navigation.navigate('BuddyProfile', { kidId: b.uid })}
            >
              <View style={[s.avatar, { backgroundColor: b.accent || theme.colors.purple }]}>
                <Text style={{ fontSize: 30 }}>{b.avatar || '👤'}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.name} numberOfLines={1}>{b.displayName}</Text>
                  {attention > 0 && (
                    <View style={s.attentionPill}><Text style={s.attentionPillText}>! {attention}</Text></View>
                  )}
                </View>
                {b.email && <Text style={s.metaSmall} numberOfLines={1}>{b.email}</Text>}
              </View>
              <View style={s.statsCol}>
                {active > 0 && <View style={s.activeBadge}><Text style={s.activeBadgeText}>{active}</Text></View>}
                {reminderCount > 0 && <View style={s.statPill}><Text style={s.statPillText}>🔔 {reminderCount}</Text></View>}
                <View style={s.pointsPill}><Text style={s.pointsPillText}>★ {points}</Text></View>
              </View>
              <Text style={s.arrow}>›</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.addBtn} onPress={() => setAddOpen(o => !o)}>
          <Text style={s.addBtnText}>{addOpen ? '— Close' : '+ Add a Buddy'}</Text>
        </TouchableOpacity>
        {addOpen && <AddBuddyForm onDone={() => setAddOpen(false)} />}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  sectionLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4, marginBottom: 10 },
  empty: { color: theme.colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 20, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, padding: 12, marginBottom: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  name: { color: theme.colors.text, fontWeight: '900', fontSize: 15 },
  metaSmall: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  attentionPill: { backgroundColor: theme.colors.danger, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  attentionPillText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  statsCol: { alignItems: 'flex-end', gap: 4 },
  activeBadge: { backgroundColor: theme.colors.danger, borderRadius: 10, minWidth: 22, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  statPill: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  statPillText: { color: theme.colors.muted, fontSize: 10, fontWeight: '900' },
  pointsPill: { backgroundColor: theme.colors.accent + '26', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  pointsPillText: { color: theme.colors.accent, fontSize: 10, fontWeight: '900' },
  arrow: { color: theme.colors.muted, fontSize: 24, fontWeight: '900', marginLeft: 4 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e1c10', borderWidth: 1, borderColor: theme.colors.accent + '50', borderRadius: theme.radius.xl, padding: 12, marginBottom: 8 },
  inviteAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent + '26', justifyContent: 'center', alignItems: 'center' },
  inviteName: { color: theme.colors.accent, fontWeight: '900', fontSize: 14 },
  invitePill: { backgroundColor: theme.colors.accent + '33', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  invitePillText: { color: theme.colors.accent, fontSize: 10, fontWeight: '900' },
  inviteMeta: { color: '#b8932f', fontSize: 11, fontWeight: '700', marginTop: 2 },
  iconBtn: { width: 32, height: 32, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { fontSize: 14, color: theme.colors.accent },
  addBtn: { padding: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, alignItems: 'center', marginTop: 10 },
  addBtnText: { color: theme.colors.muted, fontWeight: '900', fontSize: 14 },
});
