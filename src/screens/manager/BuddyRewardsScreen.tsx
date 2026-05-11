import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRewards, useRewardClaims } from '../../hooks/useRewards';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { rewardService, claimService } from '../../services/rewardService';
import { buddyLabel } from '../../utils/buddy';
import Header from '../../components/Header';
import { useConfirm } from '../../components/ConfirmModal';

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
    <SafeAreaView style={s.root}>
      <Header title={`${buddyLabel(buddyUid, buddies)} · Rewards`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        {requested.length > 0 && (
          <>
            <Text style={s.section}>Suggestions ({requested.length})</Text>
            {requested.map(r => (
              <View key={r.id} style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{r.title}</Text>
                  <Text style={s.meta}>Suggested: {r.suggestedCost} pts</Text>
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
                  <Text style={s.approveText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.reject} onPress={() => rewardService.deny(r.id)}>
                  <Text style={s.rejectText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {pending.length > 0 && (
          <>
            <Text style={s.section}>Claims ({pending.length})</Text>
            {pending.map(c => (
              <View key={c.id} style={[s.card, { borderColor: theme.colors.accent + '60' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>🎁 {c.rewardTitle}</Text>
                  <Text style={s.meta}>{c.cost} pts</Text>
                </View>
                <TouchableOpacity style={s.approve} onPress={() => claimService.approve(c.id)}>
                  <Text style={s.approveText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.reject} onPress={() => claimService.deny(c.id)}>
                  <Text style={s.rejectText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <Text style={s.section}>Active Rewards ({active.length})</Text>
        {active.length === 0 ? (
          <Text style={s.empty}>No active rewards.</Text>
        ) : active.map(r => (
          <View key={r.id} style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{r.title}</Text>
              <Text style={s.meta}>{r.cost} pts</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  section: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  empty: { color: theme.colors.muted, textAlign: 'center', padding: 20, fontStyle: 'italic' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, marginBottom: 8 },
  title: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  meta: { color: theme.colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  approve: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  reject: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  rejectText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
