import React, { useState } from 'react';
import { View, Pressable, Text as RNText, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { usePendingInviteForMe } from '../hooks/usePendingInviteForMe';
import AcceptInviteModal from './AcceptInviteModal';

/**
 * Pink/purple banner pinned to the top of BuddiesScreen + BuddyHomeScreen
 * whenever the signed-in user has a pending invite. Tapping it opens
 * <AcceptInviteModal /> for Accept / Decline / Block. Returns null when
 * there's nothing to surface.
 */
export default function InviteBanner() {
  const invite = usePendingInviteForMe();
  const [open, setOpen] = useState(false);

  if (!invite) return null;

  const inviterLabel = invite.suggestedName
    ? `${invite.suggestedName}'s family`
    : 'a family';

  return (
    <>
      <Pressable style={s.banner} onPress={() => setOpen(true)}>
        <View style={s.iconWrap}>
          <RNText style={s.iconText}>✉️</RNText>
        </View>
        <View style={{ flex: 1 }}>
          <RNText style={s.title}>You've been invited!</RNText>
          <RNText style={s.sub} numberOfLines={1}>
            Tap to view invitation from {inviterLabel}
          </RNText>
        </View>
        <View style={s.cta}>
          <RNText style={s.ctaText}>View</RNText>
        </View>
      </Pressable>
      <AcceptInviteModal
        invite={invite}
        visible={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.purple, // brand pink/purple solid (close enough to gradient at this size)
    borderRadius: theme.radius.xl,
    padding: 14,
    marginBottom: theme.spacing.md,
    ...theme.shadow.button,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  title: { color: '#fff', fontWeight: '900', fontSize: 15 },
  sub: { color: 'rgba(255,255,255,0.92)', fontSize: 12.5, marginTop: 2 },
  cta: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.md,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
