import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, ToastAndroid, StyleSheet, Text as RNText } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Header, Screen, Card, Avatar, Text, useConfirm, SCREEN_BOTTOM_PAD } from '../../components';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { theme } from '../../theme';

interface Machine {
  id: string;
  machineName?: string;
  kidId?: string;
  command?: 'shutoff' | 'allow';
  timestamp?: number;
  lastSeenAt?: number;
}

const RTDB_URL = 'https://chorebuddy-67a5f-default-rtdb.firebaseio.com';

/**
 * Push a command to Realtime Database — this is the channel the PC agent
 * actually listens on (one held-open stream, instant, no polling, no
 * Firestore read-quota burn). Authenticated with the manager's Firebase
 * token via a plain REST PUT, so the "only the manager can send" rule is
 * satisfied without adding the RTDB native module.
 */
async function pushRtdbCommand(
  machineId: string,
  cmd: 'shutoff' | 'allow' | 'update',
  ts: number,
) {
  const user = auth().currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const url = `${RTDB_URL}/firewallControl/${encodeURIComponent(machineId)}/control.json?auth=${token}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: cmd, timestamp: ts }),
  });
  if (!resp.ok) throw new Error(`RTDB ${resp.status}: ${await resp.text()}`);
}

/**
 * FirewallScreen — manager-only. Lists every buddy (role === 'buddy')
 * with a toggle for their PC's game access. Each buddy can have zero,
 * one, or many machines paired (firewallControl docs keyed by
 * machineId; agent writes kidId on each one). Any orphan/unpaired
 * machines surface under an "Unpaired machines" section so the manager
 * can still control them or know they exist.
 */
export default function FirewallScreen({ navigation }: any) {
  const { members } = useFamilyMembers();
  const buddies = members.filter(m => m.role === 'buddy');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    const unsub = firestore()
      .collection('firewallControl')
      .onSnapshot(
        s => {
          setMachines(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
          setLoading(false);
        },
        () => setLoading(false),
      );
    return () => unsub();
  }, []);

  const machinesForKid = (uid: string) => machines.filter(m => m.kidId === uid);
  const unpaired = machines.filter(m => !m.kidId);

  const updateAllAgents = async () => {
    if (machines.length === 0) return;
    const ok = await confirm({
      title: `Update ${machines.length} agent${machines.length === 1 ? '' : 's'}?`,
      message: 'Every paired PC will check GitHub for a newer agent build and swap it in within a few seconds. Service restarts automatically. Kids see nothing.',
      confirmLabel: 'Update all',
    });
    if (!ok) return;
    setBusy('update-all');
    const ts = Date.now();
    let okCount = 0;
    let failCount = 0;
    for (const m of machines) {
      try {
        await pushRtdbCommand(m.id, 'update', ts);
        okCount++;
      } catch {
        failCount++;
      }
    }
    setBusy(null);
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        failCount === 0
          ? `🚀 Update triggered on ${okCount} PC${okCount === 1 ? '' : 's'}`
          : `Triggered ${okCount}, failed ${failCount}`,
        ToastAndroid.LONG,
      );
    }
  };

  const sendCommand = async (machine: Machine, cmd: 'shutoff' | 'allow') => {
    const key = `${machine.id}:${cmd}`;
    setBusy(key);
    const ts = Date.now();
    try {
      // 1. Firestore — keeps this screen's current-state badge in sync.
      await firestore().collection('firewallControl').doc(machine.id).set(
        {
          command: cmd,
          timestamp: ts,
          setBy: 'manager',
          machineName: machine.machineName || machine.id,
          ...(machine.kidId ? { kidId: machine.kidId } : {}),
          lastSeenAt: machine.lastSeenAt || ts,
        },
        { merge: true },
      );
      // 2. RTDB push — the channel the agent listens on (instant delivery).
      await pushRtdbCommand(machine.id, cmd, ts);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          cmd === 'shutoff'
            ? `🚫 Blocked games on ${machine.machineName || machine.id}`
            : `✅ Allowed games on ${machine.machineName || machine.id}`,
          ToastAndroid.SHORT,
        );
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Error: ${e?.message || e}`, ToastAndroid.LONG);
      }
    } finally {
      setBusy(null);
    }
  };

  const fmtTime = (ts?: number) => {
    if (!ts) return 'never';
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleString();
  };

  const MachineToggle = ({ m, kidName }: { m: Machine; kidName?: string }) => {
    const blocked = m.command === 'shutoff';
    const target: 'shutoff' | 'allow' = blocked ? 'allow' : 'shutoff';
    const isBusy = busy === `${m.id}:${target}`;
    const onTap = async () => {
      const who = kidName || m.machineName || m.id;
      const ok = await confirm({
        title: target === 'shutoff' ? `Block games on ${who}?` : `Allow games on ${who}?`,
        message: target === 'shutoff'
          ? 'All configured apps and games will be killed and blocked from launching.'
          : 'All blocks lift. Games + browsers can launch again until you re-block.',
        confirmLabel: target === 'shutoff' ? 'Block' : 'Allow',
        confirmDestructive: target === 'allow',
      });
      if (!ok) return;
      sendCommand(m, target);
    };
    return (
      <View style={s.machineRow}>
        <View style={{ flex: 1 }}>
          <Text variant="h3" style={{ fontSize: 14 }}>💻 {m.machineName || m.id}</Text>
          <Text variant="tiny" style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>
            {blocked ? '🚫 Games blocked' : '✅ Games allowed'} · last seen {fmtTime(m.lastSeenAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.toggle, blocked ? s.toggleOff : s.toggleOn, isBusy && s.toggleBusy]}
          disabled={isBusy}
          onPress={onTap}
          activeOpacity={0.7}
        >
          <View style={[s.toggleKnob, blocked ? s.toggleKnobOff : s.toggleKnobOn]} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Firewall" onMenuPress={() => navigation?.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Card style={{ marginBottom: 12, gap: 6 }}>
          <Text variant="h3" style={{ fontSize: 14, color: theme.colors.accent }}>🎮 Game access</Text>
          <Text variant="tiny" style={{ fontSize: 12, opacity: 0.8, lineHeight: 18 }}>
            Toggle each buddy's PC. Off = games blocked instantly (process kill + firewall block).
            On = games allowed.
          </Text>
        </Card>

        {machines.length > 0 && (
          <TouchableOpacity
            style={[s.updateAllBtn, busy === 'update-all' && s.updateAllBtnBusy]}
            disabled={busy === 'update-all'}
            onPress={updateAllAgents}
            activeOpacity={0.7}
          >
            <RNText style={s.updateAllText}>
              {busy === 'update-all' ? '🚀 Sending…' : `🚀 Update all PCs (${machines.length})`}
            </RNText>
          </TouchableOpacity>
        )}

        {loading && <Text variant="empty">Loading…</Text>}

        {!loading && buddies.length === 0 && (
          <Card style={{ padding: 28, alignItems: 'center', gap: 6 }}>
            <RNText style={{ fontSize: 36 }}>🧒</RNText>
            <Text variant="h3" style={{ fontSize: 15, textAlign: 'center' }}>No buddies in this family</Text>
            <Text variant="tiny" style={{ fontSize: 12, textAlign: 'center', opacity: 0.7 }}>
              Add a buddy first, then pair their PC with the agent.
            </Text>
          </Card>
        )}

        {!loading && buddies.map(b => {
          const mine = machinesForKid(b.uid);
          return (
            <Card key={b.uid} style={s.buddyCard}>
              <View style={s.buddyHeader}>
                <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="md" />
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 16 }}>{b.displayName}</Text>
                  <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                    {mine.length === 0
                      ? 'No PC paired yet'
                      : `${mine.length} ${mine.length === 1 ? 'PC' : 'PCs'} paired`}
                  </Text>
                </View>
              </View>
              {mine.length === 0 ? (
                <Text variant="tiny" style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                  Launch the ChoreBuddy agent on this kid's PC and pair it with their uid.
                </Text>
              ) : (
                mine.map(m => <MachineToggle key={m.id} m={m} kidName={b.displayName} />)
              )}
            </Card>
          );
        })}

        {!loading && unpaired.length > 0 && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 16 }}>Unpaired machines</Text>
            <Card style={{ marginBottom: 8 }}>
              <Text variant="tiny" style={{ fontSize: 11, opacity: 0.7 }}>
                These agents heartbeated in without a kidId. Run the agent's setup wizard to bind them to a buddy.
              </Text>
            </Card>
            {unpaired.map(m => (
              <Card key={m.id} style={{ marginBottom: 6 }}>
                <MachineToggle m={m} />
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  buddyCard: { marginBottom: 12, gap: 6 },
  buddyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  machineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: theme.colors.cardBorder,
    marginTop: 4,
  },

  toggle: {
    width: 56, height: 32, borderRadius: 16,
    padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: theme.colors.success },
  toggleOff: { backgroundColor: theme.colors.danger },
  toggleBusy: { opacity: 0.5 },
  toggleKnob: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  toggleKnobOn: { alignSelf: 'flex-end' },

  updateAllBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    marginBottom: 12,
  },
  updateAllBtnBusy: { opacity: 0.6 },
  updateAllText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
  toggleKnobOff: { alignSelf: 'flex-start' },
});
