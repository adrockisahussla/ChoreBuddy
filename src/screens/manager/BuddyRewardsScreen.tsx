import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Text as RNText } from 'react-native';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { rewardService, claimService } from '../../services/rewardService';
import { buddyLabel } from '../../utils/buddy';
import { Header, Screen, Card, Text, useConfirm, SCREEN_BOTTOM_PAD } from '../../components';

export default function BuddyRewardsScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { buddies } = useBuddies();
  const { rewardItems } = useRewards();
  const { rewardClaims } = useRewardClaims();
  const confirm = useConfirm();
  const myRewards = rewardItems.filter(r => r.kidId === buddyUid);
  const myClaims = rewardClaims.filter(c => c.kidId === buddyUid);
  const pending = myClaims.filter(c => c.status === 'pending');
  const requested = myRewards.filter(r => r.status === 'requested');
  const active = myRewards.filter(r => r.status === 'active');

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${buddyLabel(buddyUid, buddies)} · Rewards`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        {requested.length > 0 && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 12 }}>Suggestions ({requested.length})</Text>
            {requested.map(r => (
              <Card key={r.id} row radius={theme.radius.lg} style={{ gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 14 }}>{r.title}</Text>
                  <Text variant="meta" style={{ marginTop: 2 }}>Suggested: {r.suggestedCost} pts</Text>
                </View>
                <TouchableOpacity
                  style={s.approve}
                  onPress={async () => {
                    const ok = await confirm({
                      title: 'Approve suggestion',
                      message: `Approve "${r.title}" at ${r.suggestedCost} pts?`,
                      confirmLabel: 'Approve suggestion',
                    });
                    if (ok) rewardService.approve(r.id, r.suggestedCost);
                  }}
                >
                  <RNText style={s.iconText}>✓</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={s.reject} onPress={() => rewardService.deny(r.id)}>
                  <RNText style={s.iconText}>✕</RNText>
                </TouchableOpacity>
              </Card>
            ))}
          </>
        )}

        {pending.length > 0 && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 12 }}>Claims ({pending.length})</Text>
            {pending.map(c => (
              <Card key={c.id} row radius={theme.radius.lg} style={{ gap: 8, borderColor: theme.colors.accent + '60' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 14 }}>🎁 {c.rewardTitle}</Text>
                  <Text variant="meta" style={{ marginTop: 2 }}>{c.cost} pts</Text>
                </View>
                <TouchableOpacity style={s.approve} onPress={() => claimService.approve(c.id)}>
                  <RNText style={s.iconText}>✓</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={s.reject} onPress={() => claimService.deny(c.id)}>
                  <RNText style={s.iconText}>✕</RNText>
                </TouchableOpacity>
              </Card>
            ))}
          </>
        )}

        <Text variant="sectionLabel" style={{ marginTop: 12 }}>Active Rewards ({active.length})</Text>
        {active.length === 0 ? (
          <Text variant="empty" style={{ padding: 20 }}>No active rewards.</Text>
        ) : active.map(r => (
          <Card key={r.id} row radius={theme.radius.lg} style={{ gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 14 }}>{r.title}</Text>
              <Text variant="meta" style={{ marginTop: 2 }}>{r.cost} pts</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  approve: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  reject: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
