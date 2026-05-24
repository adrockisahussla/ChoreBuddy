import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Text as RNText, ActivityIndicator, Platform, ToastAndroid, AppState } from 'react-native';
import { theme } from '../../theme';
import { Header, Screen, Card, Text, SCREEN_BOTTOM_PAD } from '../../components';
import { useTextScale } from '../../context/TextScaleContext';
import { checkLatestRelease, installApk, CURRENT_VERSION, ReleaseInfo } from '../../services/updateService';
import {
  checkReminderPermissions, requestReminderPermissions,
  openAlarmSettings, openOverlaySettings, openAppNotificationSettings,
  PermissionStatus,
} from '../../services/permissions';
import { scheduleReminderNotification } from '../../services/notificationService';

function PermRow({ label, granted, onPress }: { label: string; granted: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.permRow} onPress={onPress} activeOpacity={0.7}>
      <RNText style={[s.permMark, granted ? s.permMarkOk : s.permMarkBad]}>{granted ? '✓' : '✗'}</RNText>
      <RNText style={s.permLabel}>{label}</RNText>
      <RNText style={s.permAction}>{granted ? 'Granted' : 'Fix →'}</RNText>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const { scale, bumpUp, bumpDown, setScale, min, max } = useTextScale();
  const pct = Math.round(scale * 100);
  const atMin = scale <= min + 0.001;
  const atMax = scale >= max - 0.001;

  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [latest, setLatest] = useState<ReleaseInfo | null>(null);
  const [updateMsg, setUpdateMsg] = useState<string>('');

  const [perms, setPerms] = useState<PermissionStatus | null>(null);
  const refreshPerms = async () => setPerms(await checkReminderPermissions());
  useEffect(() => {
    refreshPerms();
    // Re-check whenever the user comes back from a system settings page.
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refreshPerms();
    });
    return () => sub.remove();
  }, []);

  const onTestReminder = async () => {
    const fireAt = Date.now() + 10_000;
    const res = await scheduleReminderNotification({
      reminderId: `test-${Date.now()}`,
      title: 'Test reminder',
      body: 'If you see this, your reminders pipeline is working.',
      fireAt,
    });
    if (Platform.OS !== 'android') return;
    if (res.ok) {
      ToastAndroid.show('✓ Test reminder set for 10 seconds from now', ToastAndroid.LONG);
    } else {
      const msg =
        res.reason === 'no-notification-perm' ? 'Notifications permission missing — fix above'
        : res.reason === 'no-exact-alarm-perm' ? 'Exact-alarm permission missing — fix above'
        : res.reason === 'past' ? 'Past-time guard tripped (should not happen)'
        : `Test failed: ${res.message || 'unknown'}`;
      ToastAndroid.show(msg, ToastAndroid.LONG);
    }
  };

  const onRequestNotif = async () => {
    const next = await requestReminderPermissions();
    setPerms(next);
    if (!next.notifications) openAppNotificationSettings();
  };

  const onCheckUpdate = async () => {
    setChecking(true); setUpdateMsg('');
    try {
      const info = await checkLatestRelease();
      if (!info) { setUpdateMsg('No release info available.'); return; }
      setLatest(info);
      setUpdateMsg(info.isNewer
        ? `Update available: v${info.latestVersion}`
        : `You're on the latest version (v${CURRENT_VERSION}).`);
    } catch (e: any) {
      setUpdateMsg(`Check failed: ${e?.message || e}`);
    } finally {
      setChecking(false);
    }
  };

  const onInstall = async () => {
    if (!latest) return;
    setInstalling(true); setUpdateMsg('Downloading…');
    try {
      await installApk(latest.apkUrl);
      setUpdateMsg('Download complete — confirm install in the dialog.');
    } catch (e: any) {
      setUpdateMsg(`Install failed: ${e?.message || e}`);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Settings" onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Card padding={16} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 8 }}>Fonts</Text>
          <Text style={{ fontSize: 14, color: theme.colors.muted, marginBottom: 14 }}>
            Adjust the size of all text in the app.
          </Text>

          <View style={s.controlRow}>
            <TouchableOpacity
              style={[s.bumpBtn, atMin && s.bumpBtnDisabled]}
              disabled={atMin}
              onPress={bumpDown}
              hitSlop={6}
            >
              <RNText style={s.bumpText}>−</RNText>
            </TouchableOpacity>

            <View style={s.preview}>
              <RNText style={s.previewLabel}>{pct}%</RNText>
              <Text variant="h3">Sample text</Text>
              <Text variant="meta" style={{ marginTop: 2 }}>Smaller meta line</Text>
            </View>

            <TouchableOpacity
              style={[s.bumpBtn, atMax && s.bumpBtnDisabled]}
              disabled={atMax}
              onPress={bumpUp}
              hitSlop={6}
            >
              <RNText style={s.bumpText}>+</RNText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.resetBtn} onPress={() => setScale(1.0)}>
            <RNText style={s.resetText}>Reset to default (100%)</RNText>
          </TouchableOpacity>
        </Card>

        <Card padding={16} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 8 }}>Reminder permissions</Text>
          <Text style={{ fontSize: 13, color: theme.colors.muted, marginBottom: 12 }}>
            All three must be granted or alarms silently fail on Android 12+.
          </Text>

          <PermRow
            label="Notifications"
            granted={perms?.notifications ?? false}
            onPress={onRequestNotif}
          />
          <PermRow
            label="Exact alarms"
            granted={perms?.exactAlarms ?? false}
            onPress={openAlarmSettings}
          />
          <PermRow
            label="Display over other apps"
            granted={perms?.overlay ?? false}
            onPress={openOverlaySettings}
          />

          <TouchableOpacity style={[s.testBtn, !perms?.allGranted && s.testBtnDimmed]} onPress={onTestReminder}>
            <RNText style={s.testBtnText}>Send test reminder (10s)</RNText>
          </TouchableOpacity>
        </Card>

        <Card padding={16} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 8 }}>App version</Text>
          <Text style={{ fontSize: 14, color: theme.colors.muted, marginBottom: 4 }}>
            Current: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>v{CURRENT_VERSION}</Text>
          </Text>
          {!!updateMsg && (
            <Text style={{ fontSize: 13, color: latest?.isNewer ? theme.colors.accent : theme.colors.muted, marginBottom: 8, marginTop: 4 }}>
              {updateMsg}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[s.updateBtn, s.updateBtnSecondary, checking && s.updateBtnDisabled]}
              disabled={checking || installing}
              onPress={onCheckUpdate}
            >
              {checking
                ? <ActivityIndicator color={theme.colors.text} />
                : <RNText style={s.updateBtnSecondaryText}>Check for update</RNText>}
            </TouchableOpacity>
            {latest?.isNewer && (
              <TouchableOpacity
                style={[s.updateBtn, s.updateBtnPrimary, installing && s.updateBtnDisabled]}
                disabled={installing}
                onPress={onInstall}
              >
                {installing
                  ? <ActivityIndicator color="#fff" />
                  : <RNText style={s.updateBtnPrimaryText}>Download &amp; install</RNText>}
              </TouchableOpacity>
            )}
          </View>
        </Card>

        <Text style={{ textAlign: 'center', color: theme.colors.muted, fontSize: 12, marginTop: 8, marginBottom: 8 }}>
          ChoreBuddy v{CURRENT_VERSION}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bumpBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  bumpBtnDisabled: { opacity: 0.35 },
  bumpText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  preview: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 14,
    alignItems: 'flex-start',
  },
  previewLabel: {
    fontSize: 11, fontWeight: '900', letterSpacing: 1,
    color: theme.colors.accent, marginBottom: 6,
  },
  resetBtn: {
    marginTop: 14, alignSelf: 'center',
    paddingVertical: 8, paddingHorizontal: 14,
  },
  resetText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },

  updateBtn: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center',
    minHeight: 44,
  },
  updateBtnSecondary: {
    backgroundColor: theme.colors.card,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
  },
  updateBtnSecondaryText: { color: theme.colors.text, fontWeight: '800', fontSize: 13 },
  updateBtnPrimary: { backgroundColor: theme.colors.accent },
  updateBtnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  updateBtnDisabled: { opacity: 0.5 },

  permRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 8,
  },
  permMark: { fontSize: 18, fontWeight: '900', width: 22, textAlign: 'center' },
  permMarkOk: { color: theme.colors.success },
  permMarkBad: { color: theme.colors.danger },
  permLabel: { flex: 1, color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  permAction: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },

  testBtn: {
    marginTop: 12, padding: 12, borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  testBtnDimmed: { opacity: 0.6 },
  testBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
