import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, ToastAndroid, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useChores } from '../../hooks/useChores';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useRewardPool } from '../../hooks/useRewardPool';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { claimService } from '../../services/rewardService';
import { chorePoints } from '../../utils/buddy';
import { RewardPoolItem } from '../../types';
import {
  Header, Screen, Card, Text, Button, useConfirm, SCREEN_BOTTOM_PAD,
} from '../../components';

type RewardsTab = 'pool' | 'pending' | 'past';

/**
 * BuddyRewardsScreen — kid view. Wallet shows two numbers: 🪙 points (only
 * COLLECTED chores count toward this) and ⏱ minutes of screen time
 * remaining (granted by manager-fulfilled redemptions). Pool tab shows
 * the reward catalog the manager has set up for this kid; Redeem trades
 * points for minutes once the manager approves the request.
 */
export default function BuddyRewardsScreen({ navigation }: any) {
  const { fbUser, userDoc } = useCurrentUser();
  const myUid = fbUser?.uid;
  const [tab, setTab] = useState<RewardsTab>('pool');

  const { chores } = useChores();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();
  const { rewardPool } = useRewardPool();
  const confirm = useConfirm();

  // Points balance: only chores I've collected count. Uncollected approvals
  // sit on the chores screen waiting for me to tap Collect.
  const myApproved = chores.filter(c => c.assignedTo === myUid && c.status === 'approved');
  const collected = myApproved.filter(c => !!c.collectedAt);
  const uncollected = myApproved.filter(c => !c.collectedAt);
  const totalEarned = collected.reduce((s, c) => s + chorePoints(c), 0);
  const readyToCollect = uncollected.reduce((s, c) => s + chorePoints(c), 0);

  const myClaims = rewardClaims.filter(c => c.kidId === myUid);
  const spent = myClaims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.cost || 0), 0);
  const pendingSpent = myClaims.filter(c => c.status === 'pending').reduce((s, c) => s + (c.cost || 0), 0);
  const available = totalEarned - spent - pendingSpent;
  const minutesRemaining = userDoc?.minutesRemaining || 0;

  // My pool entries — per-kid entries assigned to me PLUS any "all kids"
  // entries (kidId === '') the manager set up family-wide.
  const myPool = rewardPool.filter(p => p.kidId === myUid || !p.kidId);

  // Legacy active rewards (pre-pool model) — surface alongside pool
  const legacyActive = rewardItems.filter(r => (r as any).kidId === myUid && r.status === 'active');

  const pendingClaims = myClaims
    .filter(c => c.status === 'pending')
    .slice()
    .sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0));
  const resolvedClaims = myClaims
    .filter(c => c.status === 'approved' || c.status === 'denied')
    .slice()
    .sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0));

  const fmtTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const onRedeemPool = async (p: RewardPoolItem) => {
    if (available < p.pointsCost) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Need ${p.pointsCost - available} more pts`, ToastAndroid.SHORT);
      }
      return;
    }
    const ok = await confirm({
      title: 'Redeem screen time?',
      message: `"${p.label}" — ${p.minutes} min for ${p.pointsCost} pts.\n\nYou'll have ${available - p.pointsCost} pts left if approved.`,
      confirmLabel: 'Redeem',
    });
    if (!ok) return;
    try {
      await claimService.requestFromPool({
        poolItemId: p.id,
        kidId: myUid!,
        label: p.label,
        minutes: p.minutes,
        pointsCost: p.pointsCost,
        familyId: p.familyId,
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show(`✓ Asked manager for ${p.minutes} min of screen time`, ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const onClaimLegacy = async (r: typeof legacyActive[number]) => {
    if (available < r.cost) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Need ${r.cost - available} more pts`, ToastAndroid.SHORT);
      }
      return;
    }
    const ok = await confirm({
      title: 'Claim this reward?',
      message: `"${r.title}" — costs ${r.cost} pts.`,
      confirmLabel: 'Claim',
    });
    if (!ok) return;
    try {
      await claimService.request({ id: r.id, kidId: myUid!, title: r.title, cost: r.cost });
      if (Platform.OS === 'android') {
        ToastAndroid.show('✓ Sent to manager for approval', ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header
        title="Rewards"
        onBackPress={navigation.canGoBack?.() ? () => navigation.goBack() : undefined}
        onMenuPress={navigation.canGoBack?.() ? undefined : () => navigation.openDrawer?.()}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Text variant="sectionLabel" style={{ marginTop: 0 }}>Wallet</Text>
        <Card padding={16} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <View style={s.walletRow}>
            <View style={s.walletHalf}>
              <RNText style={s.walletEmoji}>🪙</RNText>
              <RNText style={s.walletNum}>{available}</RNText>
              <RNText style={s.walletLabel}>points</RNText>
              {pendingSpent > 0 && (
                <RNText style={s.walletSub}>{pendingSpent} pts pending</RNText>
              )}
            </View>
            <View style={s.walletDivider} />
            <View style={s.walletHalf}>
              <RNText style={s.walletEmoji}>⏱</RNText>
              <RNText style={s.walletNum}>{minutesRemaining}</RNText>
              <RNText style={s.walletLabel}>minutes</RNText>
              <RNText style={s.walletSub}>screen time left</RNText>
            </View>
          </View>
          {readyToCollect > 0 && (
            <TouchableOpacity
              style={s.collectNudge}
              onPress={() => navigation.navigate('BuddyChores', { kidId: myUid, tab: 'done' })}
            >
              <RNText style={s.collectNudgeText}>
                🪙 {readyToCollect} pts ready to collect — tap to go to Chores
              </RNText>
            </TouchableOpacity>
          )}
        </Card>

        <View style={s.tabRow}>
          {(() => {
            const tabs = [
              { key: 'pool' as const, label: 'Get screen time', count: myPool.length + legacyActive.length },
              { key: 'pending' as const, label: 'Pending', count: pendingClaims.length },
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

        {tab === 'pool' && (
          <>
            {myPool.length === 0 && legacyActive.length === 0 && (
              <Text variant="empty" style={{ padding: 40 }}>
                Your manager hasn't set up any screen-time rewards yet.
              </Text>
            )}
            {myPool.map(p => {
              const canAfford = available >= p.pointsCost;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[s.poolCard, !canAfford && s.poolCardDim]}
                  onPress={() => onRedeemPool(p)}
                  activeOpacity={0.7}
                >
                  <View style={s.poolIcon}><RNText style={s.poolIconText}>⏱</RNText></View>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 15 }}>{p.label}</Text>
                    <Text variant="tiny" style={{ marginTop: 2 }}>
                      <Text style={{ color: theme.colors.accent, fontWeight: '900' }}>{p.minutes} min</Text>
                      {' · '}
                      <Text style={{ color: theme.colors.success, fontWeight: '900' }}>{p.pointsCost} pts</Text>
                    </Text>
                  </View>
                  {canAfford ? (
                    <View style={s.redeemBtn}>
                      <RNText style={s.redeemBtnText}>Redeem</RNText>
                    </View>
                  ) : (
                    <Text variant="tiny" style={{ color: theme.colors.danger, fontWeight: '900' }}>
                      Need {p.pointsCost - available}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {legacyActive.length > 0 && (
              <>
                <Text variant="sectionLabel" style={{ marginTop: 12 }}>Other rewards</Text>
                {legacyActive.map(r => {
                  const canAfford = available >= r.cost;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[s.poolCard, !canAfford && s.poolCardDim]}
                      onPress={() => onClaimLegacy(r)}
                      activeOpacity={0.7}
                    >
                      <RNText style={{ fontSize: 22 }}>🎁</RNText>
                      <View style={{ flex: 1 }}>
                        <Text variant="h3" style={{ fontSize: 15 }}>{r.title}</Text>
                        <Text variant="tiny" style={{ marginTop: 2 }}>
                          <Text style={{ color: theme.colors.success, fontWeight: '900' }}>{r.cost} pts</Text>
                        </Text>
                      </View>
                      {canAfford ? (
                        <View style={s.redeemBtn}>
                          <RNText style={s.redeemBtnText}>Claim</RNText>
                        </View>
                      ) : (
                        <Text variant="tiny" style={{ color: theme.colors.danger, fontWeight: '900' }}>
                          Need {r.cost - available}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </>
        )}

        {tab === 'pending' && (
          <>
            {pendingClaims.length === 0 ? (
              <Text variant="empty" style={{ padding: 40 }}>Nothing waiting on your manager.</Text>
            ) : pendingClaims.map(c => (
              <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 10, marginBottom: 6 }}>
                <View style={[s.claimIcon, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning }]}>
                  <RNText style={[s.claimIconText, { color: theme.colors.warning }]}>⏳</RNText>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 14 }}>{c.rewardTitle}</Text>
                  <Text variant="tiny" style={{ marginTop: 2 }}>
                    {c.minutes ? `${c.minutes} min · ` : ''}{c.cost} pts · claimed {fmtTime(c.claimedAt)}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {tab === 'past' && (
          <>
            {resolvedClaims.length === 0 ? (
              <Text variant="empty" style={{ padding: 40 }}>No past redemptions yet.</Text>
            ) : resolvedClaims.map(c => {
              const palette = c.status === 'approved'
                ? { bg: theme.colors.successSoft, fg: theme.colors.success, icon: '🎉', label: 'Got it!' }
                : { bg: theme.colors.dangerSoft, fg: theme.colors.danger, icon: '✕', label: 'Denied' };
              return (
                <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 10, marginBottom: 6 }}>
                  <View style={[s.claimIcon, { backgroundColor: palette.bg, borderColor: palette.fg }]}>
                    <RNText style={[s.claimIconText, { color: palette.fg }]}>{palette.icon}</RNText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 14 }}>{c.rewardTitle}</Text>
                    <Text variant="tiny" style={{ marginTop: 2 }}>
                      {c.minutes ? `${c.minutes} min · ` : ''}{c.cost} pts · {palette.label} · {fmtTime(c.resolvedAt)}
                    </Text>
                  </View>
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
  walletRow: { flexDirection: 'row', alignItems: 'stretch' },
  walletHalf: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  walletDivider: { width: 1, backgroundColor: theme.colors.cardBorder, marginHorizontal: 12 },
  walletEmoji: { fontSize: 22 },
  walletNum: { fontSize: 32, fontWeight: '900', color: theme.colors.accent, marginTop: 4 },
  walletLabel: { fontSize: 12, fontWeight: '900', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  walletSub: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  collectNudge: {
    marginTop: 12, padding: 10, borderRadius: 10,
    backgroundColor: theme.colors.accent + '22',
    borderWidth: 1, borderColor: theme.colors.accent,
  },
  collectNudgeText: { color: theme.colors.accent, fontWeight: '900', fontSize: 13, textAlign: 'center' },

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
  tabLabel: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
  tabLabelActive: { color: '#fff' },
  tabBadge: {
    minWidth: 20, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },

  poolCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 14, marginBottom: 6,
  },
  poolCardDim: { opacity: 0.55 },
  poolIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.accent + '22', borderWidth: 1, borderColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  poolIconText: { fontSize: 18 },
  redeemBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.accent },
  redeemBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  claimIcon: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  claimIconText: { fontSize: 14, fontWeight: '900' },
});
