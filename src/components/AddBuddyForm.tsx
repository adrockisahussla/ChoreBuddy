import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Share } from 'react-native';
import { theme } from '../theme';
import { inviteService } from '../services/inviteService';
import { useFamilyId } from '../hooks/useFamilyId';
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

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = !!name.trim() && emailValid && !!familyId;

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
      <View style={s.formCard}>
        <Text style={[s.formLabel, { color: theme.colors.success }]}>
          {created.emailSent ? '✓ Invite Sent' : '✓ Invite Created'}
        </Text>
        <View style={{ alignItems: 'center', padding: 16 }}>
          <Text style={{ fontSize: 48, marginBottom: 6 }}>{avatar}</Text>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>{name.trim()}</Text>
          <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{created.email}</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>
            {role === 'manager' ? 'Co-Manager' : 'Buddy'} · expires in 24h
          </Text>
        </View>
        {created.emailSent ? (
          <Text style={s.statusOk}>📬 Sign-in link emailed to {created.email}</Text>
        ) : (
          <Text style={s.statusWarn}>
            ⚠ Email not sent{created.emailError ? `: ${created.emailError}` : ''}. Share this link manually:
          </Text>
        )}
        <View style={s.linkBox}>
          <Text style={s.linkText} selectable>{link}</Text>
        </View>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => Share.share({
            message: `You've been invited to BuddyMinder! Sign in with ${created.email}: ${link}`,
          }).catch(() => {})}
        >
          <Text style={s.primaryBtnText}>Share Link</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDone} style={{ marginTop: 6 }}>
          <Text style={{ color: theme.colors.muted, fontWeight: '700', textAlign: 'center', padding: 8 }}>Done</Text>
        </TouchableOpacity>
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
