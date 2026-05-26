import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text as RNText } from 'react-native';
import { theme } from '../theme';
import Avatar from './Avatar';
import Text from './Text';

interface Buddy {
  uid: string;
  displayName: string;
  avatar?: string;
  accent?: string;
}

interface Props {
  buddy: Buddy;
  navigation: any;
  overdue: number;
  chores: number;
  approvals: number;
  reminders: number;
  rewards: number;
  /** Count of approved-but-uncollected chores. When > 0 the Total Chores
   *  pill flips to the accent palette and renders a "🪙 N" badge. */
  readyToCollect?: number;
  /** Skip the avatar + name + chevron header (used on BuddyProfile, where
   *  the hero card already shows that info). */
  hideHeader?: boolean;
}

/**
 * BuddyStatPillsCard — the canonical per-buddy summary card. Used on
 * the manager Home and on BuddyProfile so both screens stay visually in
 * sync. Each colored pill is its own tap target that deep-links into
 * the matching per-buddy screen with the right tab pre-selected.
 */
export default function BuddyStatPillsCard({
  buddy, navigation, overdue, chores, approvals, reminders, rewards,
  readyToCollect = 0, hideHeader,
}: Props) {
  const go = (route: string, params: any) => navigation.navigate(route, params);
  const hasReady = readyToCollect > 0;

  return (
    <View style={s.card}>
      {!hideHeader && (
        <TouchableOpacity
          style={s.headerRow}
          onPress={() => go('BuddyProfile', { kidId: buddy.uid })}
          activeOpacity={0.7}
        >
          <Avatar emoji={buddy.avatar || '👤'} accent={buddy.accent} size="md" />
          <Text variant="h3" style={{ fontSize: 16, flex: 1 }}>{buddy.displayName}</Text>
          <RNText style={s.chev}>›</RNText>
        </TouchableOpacity>
      )}

      <View style={s.pillStack}>
        <TouchableOpacity
          style={[s.pill, hasReady ? s.pillReady : s.pillChores]}
          onPress={() => go('BuddyChores', { kidId: buddy.uid, tab: hasReady ? 'done' : 'todo' })}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RNText style={[s.pillLabel, hasReady ? s.pillReadyText : s.pillChoresText]}>📋 Total Chores</RNText>
            {hasReady && (
              <View style={s.readyBadge}>
                <RNText style={s.readyBadgeText}>🪙 {readyToCollect}</RNText>
              </View>
            )}
          </View>
          <RNText style={[s.pillNum, hasReady ? s.pillReadyText : s.pillChoresText]}>{chores}</RNText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pill, overdue > 0 ? s.pillOverdue : s.pillNeutral]}
          onPress={() => go('BuddyChores', { kidId: buddy.uid, tab: 'todo' })}
          activeOpacity={0.7}
        >
          <RNText style={[s.pillLabel, overdue > 0 ? s.pillOverdueText : s.pillNeutralText]}>⚠ Overdue</RNText>
          <RNText style={[s.pillNum, overdue > 0 ? s.pillOverdueText : s.pillNeutralText]}>{overdue}</RNText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pill, s.pillApprovals]}
          onPress={() => go('BuddyChores', { kidId: buddy.uid, tab: 'pending' })}
          activeOpacity={0.7}
        >
          <RNText style={[s.pillLabel, s.pillApprovalsText]}>⏳ Pending Approval</RNText>
          <RNText style={[s.pillNum, s.pillApprovalsText]}>{approvals}</RNText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pill, s.pillRewards]}
          onPress={() => go('BuddyRewards', { kidId: buddy.uid })}
          activeOpacity={0.7}
        >
          <RNText style={[s.pillLabel, s.pillRewardsText]}>🎁 Rewards Requested</RNText>
          <RNText style={[s.pillNum, s.pillRewardsText]}>{rewards}</RNText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pill, s.pillReminders]}
          onPress={() => go('BuddyReminders', { kidId: buddy.uid })}
          activeOpacity={0.7}
        >
          <RNText style={[s.pillLabel, s.pillRemindersText]}>🔔 Reminders</RNText>
          <RNText style={[s.pillNum, s.pillRemindersText]}>{reminders}</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow.card,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  chev: { color: theme.colors.muted, fontSize: 24, fontWeight: '900' },
  pillStack: { gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  pillLabel: { fontSize: 13, fontWeight: '700' },
  pillNum: { fontSize: 15, fontWeight: '900' },
  pillOverdue: { backgroundColor: theme.colors.danger + '22' },
  pillOverdueText: { color: theme.colors.danger },
  pillNeutral: { backgroundColor: theme.colors.muted + '22' },
  pillNeutralText: { color: theme.colors.muted },
  pillChores: { backgroundColor: theme.colors.blue + '22' },
  pillChoresText: { color: theme.colors.blue },
  pillReady: { backgroundColor: theme.colors.accent + '22', borderWidth: 1, borderColor: theme.colors.accent },
  pillReadyText: { color: theme.colors.accent },
  readyBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  readyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  pillApprovals: { backgroundColor: '#f59e0b22' },
  pillApprovalsText: { color: '#f59e0b' },
  pillReminders: { backgroundColor: theme.colors.purple + '22' },
  pillRemindersText: { color: theme.colors.purple },
  pillRewards: { backgroundColor: theme.colors.success + '22' },
  pillRewardsText: { color: theme.colors.success },
});
