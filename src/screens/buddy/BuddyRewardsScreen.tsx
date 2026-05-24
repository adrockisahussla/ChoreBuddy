import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, ToastAndroid, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useChores } from '../../hooks/useChores';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { claimService } from '../../services/rewardService';
import { chorePoints } from '../../utils/buddy';
import { Reward } from '../../types';
import {
  Header, Screen, Card, Text, StatCard, Button, SuggestRewardForm, useConfirm, SCREEN_BOTTOM_PAD,
} from '../../components';

type RewardsTab = 'pending' | 'collectable' | 'past';

/**
 * BuddyRewardsScreen — the buddy view of the reward catalog. Wallet stays
 * pinned at the top; the catalog + history are grouped under two tabs
 * matching the manager-side `BuddyRewardsScreen`:
 *   • Pending — rewards available to claim, plus claims still awaiting
 *               the manager's decision.
 *   • Past    — approved (got it!) and denied claims, newest first.
 */
export default function BuddyRewardsScreen({ navigation }: any) {
  const { fbUser } = useCurrentUser();
  const myUid = fbUser?.uid;
  const [tab, setTab] = useState<RewardsTab>('collectable');
  const [suggestOpen, setSuggestOpen] = useState(false);

  const { chores } = useChores();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();
  const confirm = useConfirm();

  const my = chores.filter(c => c.assignedTo === myUid && c.status === 'approved');
  const totalEarned = my.reduce((s, c) => s + chorePoints(c), 0);
  const myClaims = rewardClaims.filter(c => c.kidId === myUid);
  const spent = myClaims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.cost || 0), 0);
  const pendingSpent = myClaims.filter(c => c.status === 'pending').reduce((s, c) => s + (c.cost || 0), 0);
  const available = totalEarned - spent - pendingSpent;

  const collectable = rewardItems.filter(r => (r as any).kidId === myUid && r.status === 'active');
  const myRequested = rewardItems.filter(r => (r as any).kidId === myUid && r.status === 'requested');
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

  const onClaim = async (r: Reward) => {
    if (available < r.cost) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Need ${r.cost - available} more pts`, ToastAndroid.SHORT);
      }
      return;
    }
    const ok = await confirm({
      title: 'Claim this reward?',
      message: `"${r.title}" — costs ${r.cost} pts. You'll have ${available - r.cost} pts left.`,
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
      <Header title="Rewards" onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Text variant="sectionLabel" style={{ marginTop: 0 }}>Wallet</Text>
        <StatCard
          num={available}
          variant="brand"
          title="Available Points"
          meta={`Earned ${totalEarned} · Spent ${spent}${pendingSpent > 0 ? ` · ${pendingSpent} pending` : ''}`}
        />

        <Button
          label="+ Suggest a Reward"
          variant="primary"
          onPress={() => setSuggestOpen(true)}
          style={{ marginTop: 10 }}
        />
        <SuggestRewardForm visible={suggestOpen} onClose={() => setSuggestOpen(false)} />

        <View style={s.tabRow}>
          {(() => {
            const tabs = [
              { key: 'pending' as const, label: 'Pending', count: myRequested.length + pendingClaims.length },
              { key: 'collectable' as const, label: 'GET!', count: collectable.length },
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
            {myRequested.length === 0 && pendingClaims.length === 0 && (
              <Text variant="empty" style={{ padding: 40 }}>
                Nothing waiting on your manager.
              </Text>
            )}

            {myRequested.length > 0 && (
              <>
                <Text variant="sectionLabel" style={{ marginTop: 0 }}>Suggestions sent</Text>
                {myRequested.map(r => (
                  <Card key={r.id} row padding={12} radius={theme.radius.lg} style={{ gap: 10, marginBottom: 6 }}>
                    <View style={[s.claimIcon, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning }]}>
                      <RNText style={[s.claimIconText, { color: theme.colors.warning }]}>💡</RNText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" style={{ fontSize: 14 }}>{r.title}</Text>
                      <Text variant="tiny" style={{ marginTop: 2 }}>
                        Suggested {r.suggestedCost} pts · waiting for manager
                      </Text>
                    </View>
                  </Card>
                ))}
              </>
            )}

            {pendingClaims.length > 0 && (
              <>
                <Text variant="sectionLabel" style={{ marginTop: 14 }}>Claims waiting</Text>
                {pendingClaims.map(c => (
                  <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 10, marginBottom: 6 }}>
                    <View style={[s.claimIcon, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning }]}>
                      <RNText style={[s.claimIconText, { color: theme.colors.warning }]}>⏳</RNText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" style={{ fontSize: 14 }}>{c.rewardTitle}</Text>
                      <Text variant="tiny" style={{ marginTop: 2 }}>
                        {c.cost} pts · claimed {fmtTime(c.claimedAt)}
                      </Text>
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'collectable' && (
          <>
            {collectable.length === 0 ? (
              <Text variant="empty" style={{ padding: 40 }}>
                Nothing to collect yet. Suggest one, or wait for your manager to add some!
              </Text>
            ) : collectable.map(r => {
              const canAfford = available >= r.cost;
              return (
                <Card
                  key={r.id}
                  row
                  padding={14}
                  radius={theme.radius.lg}
                  onPress={() => onClaim(r)}
                  style={{ gap: 12, marginBottom: 6, opacity: canAfford ? 1 : 0.55 }}
                >
                  <RNText style={s.rewardIcon}>🎁</RNText>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 15 }}>{r.title}</Text>
                    {!!r.description && (
                      <Text variant="tiny" style={{ marginTop: 2, opacity: 0.8 }} numberOfLines={2}>
                        {r.description}
                      </Text>
                    )}
                  </View>
                  <Text style={s.costText}>{r.cost} pts</Text>
                </Card>
              );
            })}
          </>
        )}

        {tab === 'past' && (
          <>
            {resolvedClaims.length === 0 ? (
              <Text variant="empty" style={{ padding: 40 }}>No past rewards yet — claim something!</Text>
            ) : resolvedClaims.map(c => {
              const palette = c.status === 'approved'
                ? { bg: theme.colors.successSoft, fg: theme.colors.success, icon: '🎉', label: 'Got it!' }
                : { bg: theme.colors.dangerSoft,  fg: theme.colors.danger,  icon: '✕',  label: 'Denied' };
              return (
                <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 10, marginBottom: 6 }}>
                  <View style={[s.claimIcon, { backgroundColor: palette.bg, borderColor: palette.fg }]}>
                    <RNText style={[s.claimIconText, { color: palette.fg }]}>{palette.icon}</RNText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 14 }}>{c.rewardTitle}</Text>
                    <Text variant="tiny" style={{ marginTop: 2 }}>
                      {c.cost} pts · {palette.label} · {fmtTime(c.resolvedAt)}
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
  rewardIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  costText: { color: theme.colors.accent, fontWeight: '900', fontSize: 15 },

  claimIcon: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  claimIconText: { fontSize: 14, fontWeight: '900' },

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
});
