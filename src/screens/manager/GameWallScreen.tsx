import React, { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, Platform, ToastAndroid, StyleSheet, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useBuddies } from '../../hooks/useBuddies';
import { firewallControlService, Machine } from '../../services/firewallControlService';
import {
  Header, Screen, Card, Avatar, Text, useConfirm, SCREEN_BOTTOM_PAD,
} from '../../components';

/**
 * GameWall — manager-only. Lists every buddy as a link; tapping one opens
 * their weekly play schedule (days, time window, daily hour cap).
 */
export default function GameWallScreen({ navigation }: any) {
  const { buddies, loading } = useBuddies();
  const kids = buddies.filter(b => b.role === 'buddy');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [updating, setUpdating] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    const unsub = firewallControlService.subscribeAll(setMachines);
    return () => unsub();
  }, []);

  const updateAll = async () => {
    if (machines.length === 0) return;
    const ok = await confirm({
      title: `Update ${machines.length} PC${machines.length === 1 ? '' : 's'}?`,
      message: 'Each paired PC will check GitHub for a newer agent build and swap in within a few seconds. Service restarts automatically. Kids see nothing.',
      confirmLabel: 'Update all',
    });
    if (!ok) return;
    setUpdating(true);
    try {
      const { ok: okCount, fail } = await firewallControlService.updateAll(machines);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          fail === 0
            ? `🚀 Update triggered on ${okCount} PC${okCount === 1 ? '' : 's'}`
            : `Triggered ${okCount}, failed ${fail}`,
          ToastAndroid.LONG,
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="GameWall" onMenuPress={() => navigation?.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        {machines.length > 0 && (
          <TouchableOpacity
            style={[s.updateAllBtn, updating && s.updateAllBtnBusy]}
            disabled={updating}
            onPress={updateAll}
            activeOpacity={0.7}
          >
            <RNText style={s.updateAllText}>
              {updating ? '🚀 Sending…' : `🚀 Update all PCs (${machines.length})`}
            </RNText>
          </TouchableOpacity>
        )}

        <Text variant="sectionLabel" style={{ marginBottom: 10 }}>Buddies</Text>

        {loading ? (
          <Text variant="empty">Loading…</Text>
        ) : kids.length === 0 ? (
          <Text variant="empty">No buddies yet. Add one from the Family screen.</Text>
        ) : kids.map(b => (
          <Card
            key={b.uid}
            row
            onPress={() => navigation.navigate('BuddySchedule', { buddyUid: b.uid })}
            style={{ gap: 12 }}
          >
            <Avatar emoji={b.avatar || '🎮'} accent={b.accent} size="sm" />
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 15 }}>{b.displayName}</Text>
              <Text variant="meta" style={{ marginTop: 2, fontSize: 12 }}>Tap to set play times</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('BuddySchedule', { buddyUid: b.uid })}>
              <Text style={{ fontSize: 22, color: theme.colors.muted }}>›</Text>
            </TouchableOpacity>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  updateAllBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    marginBottom: 16,
  },
  updateAllBtnBusy: { opacity: 0.6 },
  updateAllText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
});
