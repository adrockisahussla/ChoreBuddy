import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Text as RNText } from 'react-native';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { rewardService, claimService } from '../../services/rewardService';
import { userService } from '../../services/userService';
import { firewallControlService, Machine } from '../../services/firewallControlService';
import { screenTimeBurnService } from '../../services/screenTimeBurnService';
import { scheduleBurnExpiryNotification } from '../../services/notificationService';
import { useFamilyId } from '../../hooks/useFamilyId';
import { buddyLabel } from '../../utils/buddy';
import { Platform, ToastAndroid } from 'react-native';
import { Header, Screen, Card, Text, useConfirm, SCREEN_BOTTOM_PAD } from '../../components';

type RewardsTab = 'pending' | 'collectable' | 'past';

export default function BuddyRewardsScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { buddies } = useBuddies();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();
  const familyId = useFamilyId();
  const confirm = useConfirm();
  const [tab, setTab] = useState<RewardsTab>('pending');

  // Subscribe to PCs paired with this kid — Fulfill auto-targets them.
  const [machines, setMachines] = useState<Machine[]>([]);
  useEffect(() => {
    if (!buddyUid) return;
    const unsub = firewallControlService.subscribeForKid(buddyUid, setMachines);
    return () => unsub();
  }, [buddyUid]);

  const buddy = buddies.find(b => b.uid === buddyUid);

  const myRewards = rewardItems.filter(r => r.kidId === buddyUid);
  const myClaims = rewardClaims.filter(c => c.kidId === buddyUid);

  const requested = myRewards.filter(r => r.status === 'requested');
  const pendingClaims = myClaims.filter(c => c.status === 'pending');
  const active = myRewards.filter(r => r.status === 'active');
  const resolvedClaims = myClaims
    .filter(c => c.status === 'approved' || c.status === 'denied')
    .slice()
    .sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0));

  const pendingCount = requested.length + pendingClaims.length;

  const fmtTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${buddyLabel(buddyUid, buddies)} · Rewards`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <View style={s.tabRow}>
          {(() => {
            const tabs = [
              { key: 'pending' as const, label: 'Pending', count: pendingCount },
              { key: 'collectable' as const, label: 'GET!', count: active.length },
              { key: 'past' as const, label: 'Past', count: undefined as number | undefined },
            ];
            return tabs.map((t, i) => {
              const activeTab = tab === t.key;
              const isFirst = i === 0;
              const isLast = i === tabs.length - 1;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    s.tabBtn,
                    activeTab && s.tabBtnActive,
                    isFirst && s.tabBtnFirst,
                    isLast && s.tabBtnLast,
                    !isFirst && s.tabBtnNoLeftBorder,
                  ]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <RNText style={[s.tabLabel, activeTab && s.tabLabelActive]}>{t.label}</RNText>
                  {t.count !== undefined && t.count > 0 && (
                    <View style={s.tabBadge}>
                      <RNText style={s.tabBadgeText}>{t.count}</RNText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            });
          })()}
        </View>

        {tab === 'pending' && (
          <>
            {requested.length === 0 && pendingClaims.length === 0 && (
              <Text variant="empty" style={{ padding: 40 }}>Nothing pending right now.</Text>
            )}

            {requested.length > 0 && (
              <>
                <Text variant="sectionLabel" style={{ marginTop: 12 }}>Suggestions awaiting approval ({requested.length})</Text>
                {requested.map(r => (
                  <Card key={r.id} row radius={theme.radius.lg} style={{ gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" style={{ fontSize: 14 }}>{r.title}</Text>
                      <Text variant="meta" style={{ marginTop: 2 }}>Suggested: {r.suggestedCost} pts</Text>
                      {!!r.description && (
                        <Text variant="tiny" style={{ marginTop: 4, opacity: 0.8 }} numberOfLines={2}>
                          {r.description}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={s.acceptBtn}
                      onPress={async () => {
                        const ok = await confirm({
                          title: 'Accept suggestion',
                          message: `Accept "${r.title}" at ${r.suggestedCost} pts?`,
                          confirmLabel: 'Accept',
                        });
                        if (ok) rewardService.approve(r.id, r.suggestedCost);
                      }}
                    >
                      <RNText style={s.actionText}>Accept</RNText>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => rewardService.deny(r.id)}>
                      <RNText style={s.actionText}>Reject</RNText>
                    </TouchableOpacity>
                  </Card>
                ))}
              </>
            )}

            {pendingClaims.length > 0 && (
              <>
                <Text variant="sectionLabel" style={{ marginTop: 12 }}>Claims awaiting fulfillment ({pendingClaims.length})</Text>
                {pendingClaims.map(c => {
                  const onFulfill = async () => {
                    try {
                      await claimService.approve(c.id);
                      if (c.minutes && c.kidId) {
                        await userService.addMinutes(c.kidId, c.minutes);

                        // Auto-target via assignedMachineId when set;
                        // otherwise fan out to every PC paired to the
                        // kid. Either way, push ALLOW immediately so the
                        // kid can start playing the moment Fulfill taps.
                        const assignedId = buddy?.assignedMachineId;
                        const targets = (assignedId
                          ? machines.filter(m => m.id === assignedId)
                          : machines);
                        for (const m of targets) {
                          try {
                            await firewallControlService.send(m, 'allow');
                          } catch { /* per-PC error already toasted */ }
                        }

                        // Persist the burn so SHUTOFF still fires even
                        // if this device dies before the timer rings.
                        const expiresAt = Date.now() + c.minutes * 60_000;
                        if (familyId) {
                          try {
                            const burnId = await screenTimeBurnService.add({
                              familyId,
                              kidId: c.kidId,
                              machineIds: targets.map(m => m.id),
                              expiresAt,
                              claimId: c.id,
                              minutes: c.minutes,
                            });
                            // Notifee nudge so the manager isn't blindsided
                            // when time runs out.
                            scheduleBurnExpiryNotification({
                              burnId,
                              kidName: buddyLabel(c.kidId, buddies),
                              machineName: targets[0]?.machineName,
                              fireAt: expiresAt,
                            }).catch(() => { /* non-fatal */ });
                          } catch { /* burn-doc write failed; manual shutoff still works */ }
                        }
                      }
                      if (Platform.OS === 'android') {
                        ToastAndroid.show(
                          c.minutes
                            ? `✓ +${c.minutes} min — PC unlocked`
                            : `✓ Fulfilled "${c.rewardTitle}"`,
                          ToastAndroid.SHORT,
                        );
                      }
                    } catch (e: any) {
                      if (Platform.OS === 'android') {
                        ToastAndroid.show(`Failed: ${e?.message || e}`, ToastAndroid.LONG);
                      }
                    }
                  };
                  const onDeny = async () => {
                    try {
                      await claimService.deny(c.id);
                      if (Platform.OS === 'android') {
                        ToastAndroid.show(`✗ Denied "${c.rewardTitle}"`, ToastAndroid.SHORT);
                      }
                    } catch (e: any) {
                      if (Platform.OS === 'android') {
                        ToastAndroid.show(`Failed: ${e?.message || e}`, ToastAndroid.LONG);
                      }
                    }
                  };
                  return (
                    <Card key={c.id} row radius={theme.radius.lg} style={{ gap: 8, borderColor: theme.colors.accent + '60' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="h3" style={{ fontSize: 14 }}>🎁 {c.rewardTitle}</Text>
                        <Text variant="meta" style={{ marginTop: 2 }}>
                          {c.minutes ? `${c.minutes} min · ` : ''}{c.cost} pts · claimed {fmtTime(c.claimedAt)}
                        </Text>
                      </View>
                      <TouchableOpacity style={s.acceptBtn} onPress={onFulfill}>
                        <RNText style={s.actionText}>Fulfill</RNText>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={onDeny}>
                        <RNText style={s.actionText}>Deny</RNText>
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </>
            )}
          </>
        )}

        {tab === 'collectable' && (
          <>
            {active.length === 0 ? (
              <Text variant="empty" style={{ padding: 40 }}>No collectable rewards.</Text>
            ) : active.map(r => (
              <Card key={r.id} row radius={theme.radius.lg} style={{ gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 14 }}>🎁 {r.title}</Text>
                  <Text variant="meta" style={{ marginTop: 2 }}>{r.cost} pts · available to claim</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {tab === 'past' && (
          <>
            {resolvedClaims.length === 0 ? (
              <Text variant="empty" style={{ padding: 40 }}>No past rewards yet.</Text>
            ) : resolvedClaims.map(c => {
              const isApproved = c.status === 'approved';
              const onDeletePast = async () => {
                const ok = await confirm({
                  title: 'Delete from history?',
                  message: `Remove "${c.rewardTitle}" from past rewards. This won't undo the points or minutes — just clears the row.`,
                  confirmLabel: 'Delete',
                  confirmDestructive: true,
                });
                if (!ok) return;
                try {
                  await claimService.remove(c.id);
                  if (Platform.OS === 'android') {
                    ToastAndroid.show(`Removed "${c.rewardTitle}"`, ToastAndroid.SHORT);
                  }
                } catch (e: any) {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
                  }
                }
              };
              return (
                <Card key={c.id} row radius={theme.radius.lg} style={{ gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 14 }}>🎁 {c.rewardTitle}</Text>
                    <Text variant="meta" style={{ marginTop: 2 }}>
                      {c.minutes ? `${c.minutes} min · ` : ''}{c.cost} pts · {fmtTime(c.resolvedAt)}
                    </Text>
                  </View>
                  <RNText style={[s.statusPill, isApproved ? s.statusApproved : s.statusDenied]}>
                    {isApproved ? '✓ Fulfilled' : '✕ Denied'}
                  </RNText>
                  {/* Only denied claims can be deleted — deleting an
                      approved claim would refund the kid's spent points
                      because the wallet math is derived live. */}
                  {!isApproved && (
                    <TouchableOpacity style={s.pastDelBtn} onPress={onDeletePast} hitSlop={10}>
                      <RNText style={{ fontSize: 14 }}>🗑</RNText>
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginVertical: 12 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  tabBtnFirst: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  tabBtnLast: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  tabBtnNoLeftBorder: { borderLeftWidth: 0 },
  tabBtnActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  tabLabel: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  tabLabelActive: { color: '#fff' },
  tabBadge: {
    minWidth: 20, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },

  acceptBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  statusPill: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  pastDelBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: theme.colors.danger + '60', backgroundColor: theme.colors.danger + '15', justifyContent: 'center', alignItems: 'center' },
  statusApproved: { backgroundColor: '#22c55e33', color: '#22c55e' },
  statusDenied: { backgroundColor: '#ef444433', color: '#ef4444' },
});
