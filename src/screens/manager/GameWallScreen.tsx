import React, { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, Platform, ToastAndroid, StyleSheet, Modal, TextInput, Text as RNText } from 'react-native';
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
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const confirm = useConfirm();

  const sendMessage = async () => {
    const text = msgText.trim();
    if (!text || machines.length === 0) return;
    setSending(true);
    try {
      const { ok, fail } = await firewallControlService.messageAll(machines, text);
      setMsgOpen(false);
      setMsgText('');
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          fail === 0 ? `💬 Sent to ${ok} PC${ok === 1 ? '' : 's'}` : `Sent ${ok}, failed ${fail}`,
          ToastAndroid.LONG,
        );
      }
    } finally {
      setSending(false);
    }
  };

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

        {machines.length > 0 && (
          <TouchableOpacity style={s.msgBtn} onPress={() => setMsgOpen(true)} activeOpacity={0.7}>
            <RNText style={s.msgBtnText}>💬 Message all PCs ({machines.length})</RNText>
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

      <Modal visible={msgOpen} transparent animationType="fade" onRequestClose={() => setMsgOpen(false)}>
        <View style={s.scrim}>
          <View style={s.sheet}>
            <Text variant="h3" style={{ fontSize: 17, marginBottom: 4 }}>Message all PCs</Text>
            <Text variant="meta" style={{ fontSize: 12, marginBottom: 12 }}>
              Pops up on every paired computer ({machines.length}).
            </Text>
            <TextInput
              style={s.input}
              value={msgText}
              onChangeText={setMsgText}
              placeholder="e.g. Dinner in 10 minutes — wrap it up!"
              placeholderTextColor={theme.colors.muted}
              multiline
              maxLength={300}
              autoFocus
            />
            <View style={s.row}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setMsgOpen(false)} disabled={sending}>
                <RNText style={s.cancelText}>Cancel</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sendBtn, (!msgText.trim() || sending) && { opacity: 0.5 }]}
                onPress={sendMessage}
                disabled={!msgText.trim() || sending}
              >
                <RNText style={s.sendText}>{sending ? 'Sending…' : 'Send'}</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  msgBtn: {
    backgroundColor: theme.colors.blue,
    paddingVertical: 14, borderRadius: theme.radius.lg, alignItems: 'center', marginBottom: 16,
  },
  msgBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
  scrim: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: 18 },
  input: {
    minHeight: 96, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.md,
    padding: 12, fontSize: 15, color: theme.colors.text, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  cancelText: { color: theme.colors.muted, fontWeight: '800', fontSize: 14 },
  sendBtn: { backgroundColor: theme.colors.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 },
  sendText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
