import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, ToastAndroid, StyleSheet, Text as RNText } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Header, Screen, Card, Text, SCREEN_BOTTOM_PAD } from '../../components';
import { theme } from '../../theme';

interface Machine {
  id: string;
  machineName?: string;
  command?: 'shutoff' | 'allow';
  timestamp?: number;
  lastSeenAt?: number;
}

/**
 * FirewallScreen — manager-only debug UI. Lists every Windows agent
 * that has heartbeated into the `firewallControl` Firestore collection
 * and exposes SHUTOFF / ALLOW commands per machine. Mirrors the
 * FirewallDebug component from manager-app.html.
 */
export default function FirewallScreen({ navigation }: any) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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

  const sendCommand = async (machine: Machine, cmd: 'shutoff' | 'allow') => {
    setBusy(`${machine.id}:${cmd}`);
    try {
      await firestore().collection('firewallControl').doc(machine.id).set(
        {
          command: cmd,
          timestamp: Date.now(),
          setBy: 'manager',
          machineName: machine.machineName || machine.id,
          lastSeenAt: machine.lastSeenAt || Date.now(),
        },
        { merge: true },
      );
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `${cmd === 'shutoff' ? '🚫' : '✅'} Sent ${cmd.toUpperCase()} to ${machine.machineName || machine.id}`,
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

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Firewall" onMenuPress={() => navigation?.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Card style={{ marginBottom: 12, gap: 6 }}>
          <Text variant="h3" style={{ fontSize: 14, color: theme.colors.accent }}>⚠ Debug controls</Text>
          <Text variant="tiny" style={{ fontSize: 12, opacity: 0.8, lineHeight: 18 }}>
            The firewall agent on each PC polls every 3 seconds for commands.{'\n'}
            SHUTOFF blocks every app where "Remote shutoff" is checked. Game launchers with "Kill related games" also kill all installed games.
          </Text>
        </Card>

        {loading && (
          <Text variant="empty">Loading…</Text>
        )}

        {!loading && machines.length === 0 && (
          <Card style={{ padding: 32, alignItems: 'center', gap: 8 }}>
            <RNText style={{ fontSize: 48 }}>📭</RNText>
            <Text variant="h3" style={{ fontSize: 16, textAlign: 'center' }}>No machines registered yet</Text>
            <Text variant="tiny" style={{ fontSize: 12, textAlign: 'center', opacity: 0.7, lineHeight: 18 }}>
              Launch the ChoreBuddy firewall agent on a PC as administrator.{'\n'}
              It will check in here within a minute.
            </Text>
          </Card>
        )}

        {!loading && machines.map(m => {
          const cmdColor = m.command === 'shutoff' ? theme.colors.danger : '#22c55e';
          return (
            <Card key={m.id} style={{ marginBottom: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="h3" style={{ fontSize: 15 }}>💻 {m.machineName || m.id}</Text>
                <Text variant="tiny" style={{ fontSize: 11, opacity: 0.7 }}>last seen: {fmtTime(m.lastSeenAt)}</Text>
              </View>
              {!!m.command && (
                <Text variant="tiny" style={{ fontSize: 11, color: cmdColor, fontWeight: '700' }}>
                  current: {m.command.toUpperCase()} ({fmtTime(m.timestamp)})
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[s.btn, s.btnShutoff, busy === `${m.id}:shutoff` && s.btnBusy]}
                  disabled={busy === `${m.id}:shutoff`}
                  onPress={() => sendCommand(m, 'shutoff')}
                >
                  <RNText style={s.btnText}>🚫 SHUTOFF</RNText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, s.btnAllow, busy === `${m.id}:allow` && s.btnBusy]}
                  disabled={busy === `${m.id}:allow`}
                  onPress={() => sendCommand(m, 'allow')}
                >
                  <RNText style={s.btnText}>✅ ALLOW</RNText>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnShutoff: { backgroundColor: '#dc2626' },
  btnAllow: { backgroundColor: '#22c55e' },
  btnBusy: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
