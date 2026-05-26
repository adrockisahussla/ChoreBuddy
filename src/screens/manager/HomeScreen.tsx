import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Share, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useInvites } from '../../hooks/useInvites';
import { useBuddies } from '../../hooks/useBuddies';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { theme } from '../../theme';
import { buddyLabel, isOverdue, chorePoints } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { inviteService } from '../../services/inviteService';
import {
  Header, Screen, Card, Avatar, Text, Button,
  AddBuddyForm, BuddyStatPillsCard, useConfirm, SCREEN_BOTTOM_PAD,
} from '../../components';

export default function HomeScreen({ navigation }: any) {
  const { chores } = useChores();
  const { reminders } = useReminders();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();
  const { invites } = useInvites();
  const { buddies } = useBuddies();
  const { members } = useFamilyMembers();
  const { fbUser, userDoc } = useCurrentUser();
  const myUid = fbUser?.uid;
  const coManagers = members.filter(m => m.role === 'manager' && m.uid !== myUid);
  const me = members.find(m => m.uid === myUid);
  const [addOpen, setAddOpen] = useState(false);
  const confirm = useConfirm();

  const pendingChores = chores.filter(c =>
    c.status === 'pending' &&
    (c.createdBy ? c.createdBy === myUid : true /* legacy fallback */),
  ).length;
  const pendingRewards = rewardItems.filter(r => r.status === 'requested').length;
  const pendingClaims = rewardClaims.filter(c => c.status === 'pending').length;
  const totalPending = pendingChores + pendingRewards + pendingClaims;

  const pendingInvites = invites.filter(i => i.status === 'pending' && i.expiresAt > Date.now());

  const events: { ts: number; icon: string; text: string }[] = [];
  chores.forEach(c => {
    if (c.status === 'approved' && c.collectedAt) {
      events.push({
        ts: c.collectedAt,
        icon: '🪙',
        text: `${buddyLabel(c.assignedTo, buddies)} banked +${chorePoints(c)}pts from "${c.title}"`,
      });
    } else if (c.status === 'approved' && c.completedAt) {
      events.push({
        ts: c.completedAt,
        icon: '✓',
        text: `Approved "${c.title}" — ${buddyLabel(c.assignedTo, buddies)} can collect +${chorePoints(c)}pts`,
      });
    }
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
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        {(() => {
          const statsFor = (uid: string) => {
            // Total chores = everything not yet collected (still meaningful
            // from a "what's outstanding" perspective). Collected approvals
            // are banked and considered done-done; they fall off the count.
            const choreCount = chores.filter(c =>
              c.assignedTo === uid &&
              (
                c.status === 'todo' ||
                c.status === 'pending' ||
                c.status === 'rejected' ||
                (c.status === 'approved' && !c.collectedAt)
              ),
            ).length;
            // Chores I assigned that are awaiting my approval — only
            // meaningful for the "me" row but cheap to compute per uid.
            const approvalsIOwe = chores.filter(c =>
              c.createdBy === myUid && c.status === 'pending',
            ).length;
            // For non-me rows: chores this kid submitted that are pending
            // (i.e., manager owes approval). For me-row: shows what I owe.
            const approvals = uid === myUid
              ? approvalsIOwe
              : chores.filter(c => c.assignedTo === uid && c.status === 'pending').length;
            // Uncollected approvals — points kid hasn't tapped Collect on yet.
            const readyToCollect = chores.filter(c =>
              c.assignedTo === uid && c.status === 'approved' && !c.collectedAt,
            ).length;
            // "Rewards" pill aggregates both: kid-suggested rewards waiting
            // for manager approval AND pool-redemption claims pending fulfillment.
            const rewardReq = rewardItems.filter(r => r.kidId === uid && r.status === 'requested').length
              + rewardClaims.filter(c => c.kidId === uid && c.status === 'pending').length;
            const remCount = reminders.filter(r => {
              if (r.assignedTo !== uid) return false;
              const t = new Date(r.date + (r.time ? 'T' + r.time : 'T23:59:59')).getTime();
              return t > Date.now();
            }).length;
            const overdue = chores.filter(c =>
              c.assignedTo === uid &&
              (c.status === 'todo' || c.status === 'pending') &&
              isOverdue(c),
            ).length;
            return { choreCount, approvals, rewardReq, remCount, overdue, readyToCollect };
          };

          const meRow = me && (
            <>
              <Text variant="sectionLabel" style={{ marginTop: 0 }}>My Chores</Text>
              <BuddyStatPillsCard
                buddy={{ uid: me.uid, displayName: `${me.displayName} (me)`, avatar: me.avatar, accent: me.accent }}
                navigation={navigation}
                overdue={statsFor(me.uid).overdue}
                chores={statsFor(me.uid).choreCount}
                approvals={statsFor(me.uid).approvals}
                reminders={statsFor(me.uid).remCount}
                rewards={statsFor(me.uid).rewardReq}
                readyToCollect={statsFor(me.uid).readyToCollect}
              />
            </>
          );

          return (
            <>
              {meRow}

              {(() => {
                // useBuddies returns ALL family members (legacy naming);
                // the Buddies section should only render OTHER buddies —
                // not me, and not co-managers. Both already have their own
                // section above/below.
                const actualBuddies = buddies.filter(b => b.role === 'buddy' && b.uid !== myUid);
                return (
              <>
              <Text variant="sectionLabel">Buddies — tap to see details</Text>
              {actualBuddies.length > 0 ? (
                actualBuddies.map(b => {
                  const st = statsFor(b.uid);
                  return (
                    <BuddyStatPillsCard
                      key={b.uid}
                      buddy={b}
                      navigation={navigation}
                      overdue={st.overdue}
                      chores={st.choreCount}
                      approvals={st.approvals}
                      reminders={st.remCount}
                      rewards={st.rewardReq}
                      readyToCollect={st.readyToCollect}
                    />
                  );
                })
              ) : (
                <Text variant="meta" style={{ marginBottom: 8 }}>No buddies yet — add one below.</Text>
              )}
              </>
                );
              })()}

              {coManagers.length > 0 && (
                <>
                  <Text variant="sectionLabel">Co-managers</Text>
                  {coManagers.map(m => {
                    const st = statsFor(m.uid);
                    return (
                      <BuddyStatPillsCard
                        key={m.uid}
                        buddy={{ uid: m.uid, displayName: m.displayName, avatar: m.avatar, accent: m.accent }}
                        navigation={navigation}
                        overdue={st.overdue}
                        chores={st.choreCount}
                        approvals={st.approvals}
                        reminders={st.remCount}
                        rewards={st.rewardReq}
                      />
                    );
                  })}
                </>
              )}
            </>
          );
        })()}

        <Button
          label="+ Add a Buddy"
          variant="primary"
          onPress={() => setAddOpen(true)}
          style={{ marginTop: 8 }}
        />
        <AddBuddyForm visible={addOpen} onClose={() => setAddOpen(false)} />

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
  inviteName: { color: '#92400e', fontWeight: '700', fontSize: 14 },
  invitePill: { backgroundColor: '#fcd34d', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  invitePillText: { color: '#78350f', fontSize: 10, fontWeight: '700' },
  inviteMeta: { color: '#92400e', fontSize: 12, fontWeight: '500', marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 999, backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { fontSize: 14, color: theme.colors.accent },
  activityIcon: { fontSize: 16, width: 24, textAlign: 'center', paddingTop: 1 },
});
