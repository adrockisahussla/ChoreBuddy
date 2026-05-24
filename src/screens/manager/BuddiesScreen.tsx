import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Share, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useInvites } from '../../hooks/useInvites';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { isOverdue, chorePoints } from '../../utils/buddy';
import { inviteService } from '../../services/inviteService';
import {
  Header, Screen, Card, Avatar, Badge, Text, Button,
  AddBuddyForm, InviteBanner, useConfirm, SCREEN_BOTTOM_PAD,
} from '../../components';

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
    <Screen contentStyle={{ padding: 0 }} keyboardAware>
      <Header
        title="All Buddies"
        badge={totalPending}
        onMenuPress={() => navigation.getParent?.()?.openDrawer?.()}
      />
      <View style={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <InviteBanner />
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
                    ⏳ Pending · expires {new Date(inv.expiresAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
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

        <Text variant="sectionLabel">All Buddies</Text>
        {buddies.length === 0 && (
          <Text variant="empty">No buddies yet. Tap "+ Add a Buddy" to invite one.</Text>
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
            <Card
              key={b.uid}
              row
              onPress={() => navigation.navigate('BuddyProfile', { kidId: b.uid })}
              style={{ gap: 14 }}
              padding={14}
            >
              <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="md" attention={attention} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="h3" style={{ fontSize: 18 }} numberOfLines={1}>{b.displayName}</Text>
                <Text variant="meta" style={{ marginTop: 4, fontSize: 13 }}>
                  {active} {active === 1 ? 'chore' : 'chores'}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 13, color: theme.colors.accent, fontWeight: '700' }}>
                  ★ {points} pts
                </Text>
              </View>
              <Text style={s.arrow}>›</Text>
            </Card>
          );
        })}

        <Button
          label="+ Add a Buddy"
          variant="primary"
          onPress={() => setAddOpen(true)}
          style={{ marginTop: 10 }}
        />
        <AddBuddyForm visible={addOpen} onClose={() => setAddOpen(false)} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  inviteName: { color: '#92400e', fontWeight: '700', fontSize: 14 },
  invitePill: { backgroundColor: '#fcd34d', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  invitePillText: { color: '#78350f', fontSize: 10, fontWeight: '700' },
  inviteMeta: { color: '#92400e', fontSize: 12, fontWeight: '500', marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 999, backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { fontSize: 14, color: theme.colors.accent },
  statsCol: { alignItems: 'flex-end', gap: 4 },
  arrow: { color: theme.colors.muted, fontSize: 24, fontWeight: '900', marginLeft: 4 },
});
