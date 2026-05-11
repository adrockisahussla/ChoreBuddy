import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ScrollView, SafeAreaView, Platform, ToastAndroid, Text as RNText } from 'react-native';
import { theme } from '../theme';
import { inviteService } from '../services/inviteService';
import { useFamilyId } from '../hooks/useFamilyId';
import { Role } from '../types';
import Pill from './Pill';
import Button from './Button';
import Text from './Text';

const AVATARS = ['💜', '🧡', '💚', '💙', '❤️', '💛', '🦊', '🐯', '🐼', '🦄', '🐶', '🐱'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * AddBuddyForm: full-screen modal that creates a buddy invite.
 *
 * - Back arrow at top-left cancels (no invite written).
 * - Send Invite creates the invite doc (status="pending") and dismisses.
 * - The pending invite then surfaces in BuddiesScreen's
 *   "Pending Invites" section automatically (Firestore subscription).
 */
export default function AddBuddyForm({ visible, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('buddy');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [showAvatars, setShowAvatars] = useState(false);
  const [loading, setLoading] = useState(false);
  const familyId = useFamilyId();

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = !!name.trim() && emailValid && !!familyId;

  const reset = () => {
    setName(''); setEmail(''); setRole('buddy'); setAvatar(AVATARS[0]);
    setShowAvatars(false); setLoading(false);
  };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!canSubmit || !familyId) return;
    setLoading(true);
    try {
      const res = await inviteService.create({
        suggestedName: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        avatar,
        familyId,
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          res.emailSent
            ? `✓ Invite sent to ${email.trim()}`
            : `Invite created — share the link manually (${res.emailError || 'email not sent'})`,
          ToastAndroid.LONG,
        );
      }
      close();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || String(e));
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={close} style={s.backBtn} hitSlop={10}>
            <RNText style={s.backText}>←</RNText>
          </TouchableOpacity>
          <RNText style={s.title}>Add a Buddy</RNText>
          <View style={s.backBtn} />
        </View>

        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <View style={s.bigAvatar}>
              <RNText style={{ fontSize: 32 }}>{avatar}</RNText>
            </View>
            <TouchableOpacity style={s.smallBtn} onPress={() => setShowAvatars(sa => !sa)}>
              <RNText style={s.smallBtnText}>{showAvatars ? 'Done' : 'Change avatar'}</RNText>
            </TouchableOpacity>
          </View>

          {showAvatars && (
            <View style={s.avatarGrid}>
              {AVATARS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[s.avatarPick, a === avatar && s.avatarPickSel]}
                  onPress={() => setAvatar(a)}
                >
                  <RNText style={{ fontSize: 22 }}>{a}</RNText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Role</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Pill label="Buddy" active={role === 'buddy'} onPress={() => setRole('buddy')} />
            <Pill label="Co-Manager" active={role === 'manager'} onPress={() => setRole('manager')} />
          </View>

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>{role === 'manager' ? 'Their name' : "Buddy's name"}</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex"
            placeholderTextColor={theme.colors.muted}
            maxLength={24}
          />

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="alex@example.com"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text variant="tiny" style={{ marginTop: 16, lineHeight: 18 }}>
            They'll get an email with a link to sign in. Until they accept and install
            the app, they'll show as <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>Pending</Text> on
            your Buddies page.
          </Text>

          <View style={{ marginTop: 24 }}>
            <Button
              label={loading ? 'Sending...' : 'Send Invite'}
              variant="primary"
              onPress={submit}
              disabled={!canSubmit || loading}
              full
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 18,
    backgroundColor: theme.colors.accent,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  title: { flex: 1, color: '#ffffff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.purpleSoft,
    borderWidth: 2, borderColor: theme.colors.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  smallBtn: {
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: theme.colors.card,
  },
  smallBtnText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: 12, backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg, marginTop: 12,
  },
  avatarPick: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: 'transparent',
    backgroundColor: theme.colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPickSel: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '15',
  },
  input: {
    backgroundColor: theme.colors.card, color: theme.colors.text,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 14, fontSize: 16, marginTop: 6,
  },
});
