import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, ToastAndroid, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useChores } from '../../hooks/useChores';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { claimService } from '../../services/rewardService';
import { chorePoints } from '../../utils/buddy';
import { Reward } from '../../types';
import {
  Header, Screen, Card, Text, useConfirm, SCREEN_BOTTOM_PAD,
} from '../../components';

/**
 * BuddyRewardsScreen — the buddy view of the reward catalog. Shows their
 * current point balance, available rewards they can claim, and their
 * claim history. Tap an affordable reward → confirm → claim is created
 * with status 'pending'; manager approves or denies elsewhere.
 */
export default function BuddyRewardsScreen({ navigation }: any) {
  const { fbUser, userDoc } = useCurrentUser();
  const myUid = fbUser?.uid;
  const accent = userDoc?.accent || theme.colors.accent;

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

  const myRewards = rewardItems.filter(r => (r as any).kidId === myUid && r.status === 'active');
  const sortedClaims = myClaims.slice().sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0)).slice(0, 8);

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
        {/* Points hero */}
        <View style={[s.heroCard, { backgroundColor: accent }]}>
          <RNText style={s.heroNum}>{available}</RNText>
          <View style={{ flex: 1 }}>
            <RNText style={s.heroLabel}>Available Points</RNText>
            <RNText style={s.heroSub}>
              Earned {totalEarned} · Spent {spent}
              {pendingSpent > 0 ? ` · ${pendingSpent} pending` : ''}
            </RNText>
          </View>
        </View>

        {/* Available rewards */}
        <Text variant="sectionLabel" style={{ marginTop: 14 }}>Available Rewards</Text>
        {myRewards.length === 0 ? (
          <Text variant="empty" style={{ padding: 20 }}>
            No rewards yet. Ask your manager to set some up!
          </Text>
        ) : (
          myRewards.map(r => {
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
                <View style={s.giftBubble}>
                  <RNText style={{ fontSize: 20 }}>🎁</RNText>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 15 }}>{r.title}</Text>
                  {!!r.description && (
                    <Text variant="tiny" style={{ marginTop: 2, opacity: 0.8 }} numberOfLines={2}>
                      {r.description}
                    </Text>
                  )}
                </View>
                <View style={s.costPill}>
                  <RNText style={s.costPillText}>{r.cost}</RNText>
                  <RNText style={s.costPillLbl}>pts</RNText>
                </View>
              </Card>
            );
          })
        )}

        {/* Claim history */}
        {sortedClaims.length > 0 && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 18 }}>Recent Claims</Text>
            {sortedClaims.map(c => {
              const palette =
                c.status === 'approved' ? { bg: theme.colors.successSoft, fg: theme.colors.success, icon: '🎉', label: 'Got it!' } :
                c.status === 'denied'   ? { bg: theme.colors.dangerSoft,  fg: theme.colors.danger,  icon: '✕',  label: 'Denied' } :
                                          { bg: theme.colors.warningSoft, fg: theme.colors.warning, icon: '⏳', label: 'Pending' };
              return (
                <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 10, marginBottom: 6 }}>
                  <View style={[s.claimIcon, { backgroundColor: palette.bg, borderColor: palette.fg }]}>
                    <RNText style={[s.claimIconText, { color: palette.fg }]}>{palette.icon}</RNText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 14 }}>{c.rewardTitle}</Text>
                    <Text variant="tiny" style={{ marginTop: 2 }}>
                      {c.cost} pts · {palette.label}
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: theme.radius.xl,
    ...theme.shadow.button,
  },
  heroNum: { color: '#fff', fontWeight: '900', fontSize: 36, minWidth: 50 },
  heroLabel: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },

  giftBubble: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.purpleSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  costPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    alignItems: 'center',
    minWidth: 60,
  },
  costPillText: { color: '#fff', fontWeight: '900', fontSize: 16, lineHeight: 18 },
  costPillLbl: { color: '#fff', fontWeight: '700', fontSize: 9, opacity: 0.85, marginTop: -1 },

  claimIcon: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  claimIconText: { fontSize: 14, fontWeight: '900' },
});
