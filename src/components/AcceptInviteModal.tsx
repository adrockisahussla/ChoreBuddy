import React, { useState } from 'react';
import {
  Modal, View, Text as RNText, StyleSheet, Pressable, ToastAndroid, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { theme } from '../theme';
import { Invite } from '../types';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { inviteService } from '../services/inviteService';
import { userService } from '../services/userService';

interface Props {
  invite: Invite | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen accept/decline/block modal for an inbound family invite.
 * Opened from <InviteBanner /> when the signed-in user has a pending
 * invite addressed to their email.
 *
 * Accept: updates the user doc with the inviting family's id + role,
 * marks the invite accepted. The previously auto-created family (if any)
 * becomes an unreferenced orphan — acceptable for now.
 * Decline / Block: marks the invite so it stops surfacing.
 */
export default function AcceptInviteModal({ invite, visible, onClose }: Props) {
  const { fbUser, userDoc } = useCurrentUser();
  const [busy, setBusy] = useState(false);

  if (!invite) return null;

  const toast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  };

  const onAccept = async () => {
    if (!fbUser || !userDoc || busy) return;
    setBusy(true);
    const ctx = [
      `auth.uid: ${fbUser.uid}`,
      `auth.email: ${fbUser.email || '(none)'}`,
      `userDoc.id: ${userDoc.id}`,
      `userDoc.familyId: ${userDoc.familyId}`,
      `invite.id: ${invite.id}`,
      `invite.familyId: ${invite.familyId}`,
      `invite.email: ${invite.email || '(none)'}`,
      `invite.role: ${invite.role}`,
    ].join('\n');
    // 1) Switch our own user doc into the inviting family. Use upsert
    //    (set + merge) instead of update so this also works when the
    //    user's Firestore doc is missing or partially populated — e.g.
    //    after their Auth account was recreated and the prior doc is
    //    stranded at an old uid.
    try {
      await userService.upsert(userDoc.id, {
        uid: fbUser.uid,
        familyId: invite.familyId,
        role: invite.role,
        displayName: userDoc.displayName || fbUser.displayName || 'User',
        email: fbUser.email || undefined,
        createdAt: userDoc.createdAt || Date.now(),
        ...(invite.avatar ? { avatar: invite.avatar } : {}),
      });
    } catch (e: any) {
      setBusy(false);
      Alert.alert(
        'Step 1 (update user) failed',
        `code: ${e?.code || 'n/a'}\nmessage: ${e?.message || 'unknown'}\n\nContext:\n${ctx}`,
      );
      return;
    }
    // 2) Mark the invite accepted. If this fails we leave the user in
    //    the new family — they're already joined, the invite is just
    //    cosmetic at that point. Surface the error but don't unwind.
    try {
      await inviteService.accept(invite.id, fbUser.uid);
    } catch (e: any) {
      setBusy(false);
      Alert.alert(
        'Joined, but invite mark failed',
        `You're now in the family but the invite stayed pending.\n\ncode: ${e?.code || 'n/a'}\nmessage: ${e?.message || 'unknown'}\n\nContext:\n${ctx}`,
      );
      onClose();
      return;
    }
    setBusy(false);
    toast('Joined family');
    onClose();
  };

  const onDecline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await inviteService.decline(invite.id);
      toast('Invite declined');
      onClose();
    } catch (e: any) {
      toast(`Couldn’t decline: ${e?.message || 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const onBlock = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await inviteService.block(invite.id);
      toast('Sender blocked');
      onClose();
    } catch (e: any) {
      toast(`Couldn’t block: ${e?.message || 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const roleLabel = invite.role === 'manager' ? 'Co-Manager' : 'Buddy';
  const inviterInitial = (invite.suggestedName || invite.email || '?').slice(0, 1).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.modal} onPress={() => { /* swallow */ }}>
          <RNText style={s.emoji}>🎉</RNText>
          <RNText style={s.headline}>You've been invited!</RNText>
          <RNText style={s.sub}>
            Join {invite.suggestedName ? `${invite.suggestedName}'s family` : 'this family'} on
            ChoreBuddy and start collaborating on chores and rewards.
          </RNText>

          <View style={s.inviterRow}>
            <View style={s.inviterAvatar}>
              <RNText style={s.inviterAvatarText}>{inviterInitial}</RNText>
            </View>
            <View style={{ flex: 1 }}>
              <RNText style={s.inviterName} numberOfLines={1}>
                {invite.suggestedName || 'Family invite'}
              </RNText>
              {!!invite.email && (
                <RNText style={s.inviterEmail} numberOfLines={1}>{invite.email}</RNText>
              )}
            </View>
          </View>

          <View style={s.rolePill}>
            <RNText style={s.rolePillText}>{roleLabel}</RNText>
          </View>

          <View style={{ width: '100%', gap: 10 }}>
            <Pressable
              style={[s.btn, s.btnAccept, busy && s.btnDisabled]}
              onPress={onAccept}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <RNText style={s.btnAcceptText}>Accept &amp; join family</RNText>}
            </Pressable>
            <Pressable
              style={[s.btn, s.btnDecline, busy && s.btnDisabled]}
              onPress={onDecline}
              disabled={busy}
            >
              <RNText style={s.btnDeclineText}>Decline</RNText>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnBlock, busy && s.btnDisabled]}
              onPress={onBlock}
              disabled={busy}
            >
              <RNText style={s.btnBlockText}>Block this sender</RNText>
            </Pressable>
          </View>

          <RNText style={s.finePrint}>
            Block hides all future invites from this sender.{'\n'}
            Decline can be undone if they invite you again.
          </RNText>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modal: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xxl,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
  },
  emoji: { fontSize: 52, marginBottom: 4 },
  headline: {
    fontSize: 22, fontWeight: '900', color: theme.colors.text,
    marginBottom: 6, textAlign: 'center',
  },
  sub: {
    color: theme.colors.muted, fontSize: 14, lineHeight: 20,
    textAlign: 'center', marginBottom: 18,
  },
  inviterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb',
    borderRadius: theme.radius.lg,
    padding: 12, width: '100%', marginBottom: 18,
  },
  inviterAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  inviterAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  inviterName: { fontWeight: '700', fontSize: 14, color: theme.colors.text },
  inviterEmail: { color: theme.colors.muted, fontSize: 12, marginTop: 2 },
  rolePill: {
    backgroundColor: theme.colors.purple,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, marginBottom: 18,
  },
  rolePillText: {
    color: '#fff', fontSize: 11, fontWeight: '800',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  btn: {
    width: '100%', padding: 14, borderRadius: theme.radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  btnAccept: {
    backgroundColor: theme.colors.accent,
    ...theme.shadow.button,
  },
  btnAcceptText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnDecline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  btnDeclineText: { color: theme.colors.mutedDark, fontSize: 15, fontWeight: '800' },
  btnBlock: { backgroundColor: theme.colors.dangerSoft },
  btnBlockText: { color: theme.colors.danger, fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  finePrint: {
    fontSize: 11, color: theme.colors.muted,
    marginTop: 12, textAlign: 'center', lineHeight: 16,
  },
});
