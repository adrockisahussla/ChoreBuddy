import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, View, StyleSheet, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useChores } from '../../hooks/useChores';
import { useReminders } from '../../hooks/useReminders';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { chorePoints } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { Header, Screen, Card, Avatar, Text, StatCard, InviteBanner, SCREEN_BOTTOM_PAD } from '../../components';

/**
 * BuddyHomeScreen — buddy-side Home that mirrors the manager Home's
 * visual rhythm (Summary section of stacked full-width StatCards
 * + Recent Activity cards) so both roles feel like the same app.
 *
 *   • Available Points  — brand-pink StatCard, featured
 *   • Today's Chores    — count of daily chores not yet approved
 *   • Weekly Progress   — done/total for this week's weekly chores
 *   • Reminders         — upcoming + always-counts-as-upcoming recurring
 *   • Active Rewards    — rewards keyed to me, status=active
 */

/** Brief pulse on mount when `flash` is true — overlays the header
 *  brand color (theme.colors.accent) over the wrapped card to draw the
 *  eye. pointerEvents=none so the card stays tappable through it. */
function FlashWrap({ flash, children }: { flash: boolean; children: React.ReactNode }) {
  const overlay = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flash) { overlay.setValue(0); return; }
    Animated.sequence([
      Animated.timing(overlay, { toValue: 0.55, duration: 240, useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0,    duration: 240, useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.55, duration: 240, useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0,    duration: 240, useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.55, duration: 240, useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0,    duration: 240, useNativeDriver: true }),
    ]).start();
  }, [flash]);
  return (
    <View>
      {children}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radius.lg,
          opacity: overlay,
        }}
      />
    </View>
  );
}

export default function BuddyHomeScreen({ navigation }: any) {
  const { fbUser, userDoc } = useCurrentUser();
  const myUid = fbUser?.uid;
  const myName = userDoc?.displayName || 'friend';

  const { chores } = useChores();
  const { reminders } = useReminders();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();

  const ws = currentWeek();
  const my = chores.filter(c => c.assignedTo === myUid);
  const myReminders = reminders.filter(r => r.assignedTo === myUid);
  const myRewards = rewardItems.filter(r => (r as any).kidId === myUid && r.status === 'active');
  const myClaims = rewardClaims.filter(c => c.kidId === myUid);

  const isDueToday = (c: any) => {
    if (c.recurrence === 'daily') return true;
    if (!c.dueDate) return false;
    const d = new Date(c.dueDate);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };
  const todaysOpen = my.filter(c => isDueToday(c) && c.status !== 'approved');
  const todayChores = todaysOpen.length;
  const todayOverdue = todaysOpen.filter(c => (c.dueDate || 0) > 0 && (c.dueDate || 0) < Date.now()).length;
  const weekly = my.filter(c => c.recurrence === 'weekly');
  const weeklyDone = weekly.filter(c => c.status === 'approved' && c.weekOf === ws).length;

  // Recurring reminders always count; one-time only when in the future
  const upcomingRem = myReminders.filter(r => {
    if (r.recurrence === 'daily' || r.recurrence === 'weekly') return true;
    return (r.dueDate || 0) > Date.now();
  }).length;

  // Available points = approved chore points − spent − pending claims
  const approved = my.filter(c => c.status === 'approved');
  const totalEarned = approved.reduce((s, c) => s + chorePoints(c), 0);
  const spent = myClaims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.cost || 0), 0);
  const pendingSpent = myClaims.filter(c => c.status === 'pending').reduce((s, c) => s + (c.cost || 0), 0);
  const available = totalEarned - spent - pendingSpent;

  // Recent activity for this buddy, sorted newest first
  const events: { ts: number; icon: string; text: string }[] = [];
  my.forEach(c => {
    if (c.completedAt && c.status === 'approved') {
      events.push({ ts: c.completedAt, icon: '✓', text: `Earned +${chorePoints(c)}pts for "${c.title}"` });
    }
    if (c.status === 'rejected') {
      events.push({ ts: c.createdAt || 0, icon: '✕', text: `"${c.title}" was rejected` });
    }
    if (c.createdAt && c.status === 'todo') {
      events.push({ ts: c.createdAt, icon: '+', text: `New chore: "${c.title}"` });
    }
    if (c.status === 'pending' && c.completedAt) {
      events.push({ ts: c.completedAt, icon: '⏳', text: `Sent "${c.title}" for review` });
    }
  });
  myClaims.forEach(c => {
    if (c.status === 'approved' && (c as any).resolvedAt) {
      events.push({ ts: (c as any).resolvedAt, icon: '🎉', text: `Got "${(c as any).rewardTitle}"!` });
    }
    if (c.status === 'pending') {
      events.push({ ts: c.claimedAt, icon: '💸', text: `Claimed "${(c as any).rewardTitle}"` });
    }
  });
  const recent = events.sort((a, b) => b.ts - a.ts).slice(0, 4);

  // Header badge: count "things to act on" — rejected chores + denied claims
  const rejectedCount = my.filter(c => c.status === 'rejected').length;
  const headerBadge = rejectedCount;

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header
        title={`Hi, ${myName}!`}
        badge={headerBadge}
        onMenuPress={() => navigation.openDrawer?.()}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <InviteBanner />
        {/* Identity strip — mirrors the manager Home's "Buddies" section,
            but for a single buddy: their own avatar + accent + name. */}
        <Text variant="sectionLabel" style={{ marginTop: 0 }}>You</Text>
        <Card row padding={14} radius={theme.radius.xl} style={{ gap: 12, marginBottom: theme.spacing.md }}>
          <Avatar emoji={userDoc?.avatar || '👤'} accent={userDoc?.accent} size="md" />
          <View style={{ flex: 1 }}>
            <Text variant="h3" style={{ fontSize: 16 }}>{myName}</Text>
            <Text variant="tiny" style={{ marginTop: 2 }}>Buddy</Text>
          </View>
        </Card>

        <Text variant="sectionLabel">Summary</Text>

        <StatCard
          num={available}
          variant="brand"
          title="Available Points"
          meta={available > 0 ? 'Ready to spend!' : 'Do some chores to earn more'}
          onPress={() => navigation.navigate('MyRewards')}
        />

        <FlashWrap flash={todayOverdue > 0}>
          <StatCard
            num={todayChores}
            numColor={todayOverdue > 0 ? theme.colors.danger : todayChores > 0 ? theme.colors.blue : theme.colors.blue}
            title={todayOverdue > 0 ? "⚠ Today's Chores" : "Today's Chores"}
            meta={
              todayOverdue > 0
                ? `${todayOverdue} overdue · ${todayChores} to do`
                : todayChores > 0 ? `${todayChores} to do` : 'All done — nice!'
            }
            onPress={() => navigation.navigate('MyChores')}
          />
        </FlashWrap>

        <StatCard
          num={`${weeklyDone}/${weekly.length}`}
          numColor={theme.colors.success}
          title="Weekly Progress"
          meta={weekly.length === 0 ? 'No weekly chores yet' : `${weekly.length - weeklyDone} left this week`}
          onPress={() => navigation.navigate('MyChores')}
        />

        <StatCard
          num={upcomingRem}
          numColor={theme.colors.purple}
          title="Reminders"
          meta="Upcoming"
          onPress={() => navigation.navigate('Reminders')}
        />

        <StatCard
          num={myRewards.length}
          numColor={theme.colors.warning}
          title="Available Rewards"
          meta={myRewards.length === 0 ? 'Ask your manager to set some up' : 'See what you can claim'}
          onPress={() => navigation.navigate('MyRewards')}
        />

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
  activityIcon: { fontSize: 16, width: 24, textAlign: 'center', paddingTop: 1 },
});
