import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Share } from 'react-native';
import { theme } from '../theme';
import { inviteService } from '../services/inviteService';
import { useFamilyId } from '../hooks/useFamilyId';
import { useInvites } from '../hooks/useInvites';
import { Role } from '../types';

const AVATARS = ['💜', '🧡', '💚', '💙', '❤️', '💛', '🦊', '🐯', '🐼', '🦄', '🐶', '🐱'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_BASE_URL = 'http://localhost:3000/buddy-app.html';

export default function AddBuddyForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('buddy');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [showAvatars, setShowAvatars] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ token: string; email: string; emailSent: boolean; emailError: string | null } | null>(null);
  const familyId = useFamilyId();
  const { invites } = useInvites();

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = !!name.trim() && emailValid && !!familyId;

  const accepted = !!created && invites.some(inv => inv.token === created.token && inv.status === 'accepted');
  useEffect(() => {
    if (accepted) onDone();
  }, [accepted, onDone]);

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
      setCreated({ token: res.token, email: email.trim().toLowerCase(), emailSent: res.emailSent, emailError: res.emailError });
    } catch (e: any) {
      Alert.alert('Failed', e?.message || String(e));
    } finally { setLoading(false); }
  };

  if (created) {
    const link = `${INVITE_BASE_URL}?invite=${created.token}&email=${encodeURIComponent(created.email)}`;
    return (
      <View style={[s.formCard, { padding: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>{avatar}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '900' }} numberOfLines={1}>
              {name.trim()} <Text style={{ color: theme.colors.muted, fontWeight: '700', fontSize: 11 }}>· {role === 'manager' ? 'Co-Manager' : 'Buddy'}</Text>
            </Text>
            <Text style={{ color: created.emailSent ? theme.colors.success : theme.colors.warning, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
              {created.emailSent
                ? `✓ Sent to ${created.email}`
                : `⚠ Email not sent${created.emailError ? `: ${created.emailError}` : ''}`}
            </Text>
          </View>
          <TouchableOpacity onPress={onDone} hitSlop={8}>
            <Text style={{ color: theme.colors.muted, fontWeight: '900', fontSize: 12, paddingHorizontal: 6 }}>Done</Text>
          </TouchableOpacity>
        </View>
        {!created.emailSent && (
          <>
            <View style={[s.linkBox, { marginTop: 8, marginBottom: 8 }]}>
              <Text style={s.linkText} selectable>{link}</Text>
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, { padding: 10, marginTop: 0 }]}
              onPress={() => Share.share({
                message: `You've been invited to BuddyMinder! Sign in with ${created.email}: ${link}`,
              }).catch(() => {})}
            >
              <Text style={s.primaryBtnText}>Share Link</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={s.formCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <View style={s.bigAvatar}><Text style={{ fontSize: 32 }}>{avatar}</Text></View>
        <TouchableOpacity style={s.smallBtn} onPress={() => setShowAvatars(sa => !sa)}>
          <Text style={s.smallBtnText}>{showAvatars ? 'Done' : 'Change avatar'}</Text>
        </TouchableOpacity>
      </View>
      {showAvatars && (
        <View style={s.avatarGrid}>
          {AVATARS.map(a => (
            <TouchableOpacity key={a} style={[s.avatarPick, a === avatar && s.avatarPickSel]} onPress={() => setAvatar(a)}>
              <Text style={{ fontSize: 22 }}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={s.dueLine}>Role</Text>
      <View style={s.pillRow}>
        <TouchableOpacity style={[s.pill, role === 'buddy' && s.pillActive]} onPress={() => setRole('buddy')}>
          <Text style={[s.pillText, role === 'buddy' && s.pillTextActive]}>Buddy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.pill, role === 'manager' && s.pillActive]} onPress={() => setRole('manager')}>
          <Text style={[s.pillText, role === 'manager' && s.pillTextActive]}>Co-Manager</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.dueLine}>{role === 'manager' ? 'Their Name' : "Buddy's Name"}</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Alex"
        placeholderTextColor={theme.colors.muted}
        maxLength={24}
      />
      <Text style={s.dueLine}>Email</Text>
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
      <TouchableOpacity
        style={[s.primaryBtn, !canSubmit && s.btnDisabled]}
        disabled={!canSubmit || loading}
        onPress={submit}
      >
        <Text style={s.primaryBtnText}>{loading ? 'Generating...' : 'Send Invite'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  formCard: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, padding: 14, marginTop: 8 },
  formLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  bigAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.bg, borderWidth: 2, borderColor: theme.colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  smallBtn: { borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  smallBtnText: { color: theme.colors.muted, fontWeight: '900', fontSize: 12 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 10, marginBottom: 14 },
  avatarPick: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' },
  avatarPickSel: { borderColor: theme.colors.accent, backgroundColor: '#2a2410' },
  dueLine: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.cardBorder },
  pillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pillText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
  pillTextActive: { color: '#000' },
  input: { backgroundColor: theme.colors.bg, color: theme.colors.text, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12 },
  primaryBtn: { backgroundColor: theme.colors.accent, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  linkBox: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: 8, padding: 10, marginBottom: 12 },
  linkText: { color: '#c5cae9', fontFamily: 'monospace', fontSize: 11 },
  statusOk: { color: theme.colors.success, fontSize: 12, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  statusWarn: { color: theme.colors.warning, fontSize: 12, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
});
