import React, { useEffect, useRef } from 'react';
import { View, Modal, StyleSheet, Animated, Easing, TouchableOpacity, Image, Text as RNText } from 'react-native';
import { theme } from '../theme';
import { Reminder } from '../types';
import { useBuddies } from '../hooks/useBuddies';
import { reminderService } from '../services/reminderService';
import Text from './Text';
import Button from './Button';

const monsterImg = require('../assets/chore-monster.png');

interface Props {
  reminder: Reminder | null;
  onDismiss: () => void;
}

/**
 * ReminderAlarm: full-screen overlay that fires when a reminder triggers
 * while the app is open. Semi-transparent dark backdrop over the current
 * UI, an animated monster character (bounce + wiggle), the reminder title,
 * and Snooze / Dismiss actions.
 *
 * For now uses the existing chore-monster logo as the character. A
 * dedicated single-monster asset can swap in later.
 */
export default function ReminderAlarm({ reminder, onDismiss }: Props) {
  const bounce = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const { buddies } = useBuddies();

  useEffect(() => {
    if (!reminder) return;

    // Entrance: fade backdrop + scale-pop the monster
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Looping bounce — up 20px, down, repeat
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );

    // Looping wiggle — rotate -6° → 6° → -6°
    const wiggleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 400, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(800),
      ]),
    );

    bounceLoop.start();
    wiggleLoop.start();

    return () => {
      bounceLoop.stop();
      wiggleLoop.stop();
      fade.setValue(0);
      scale.setValue(0);
    };
  }, [reminder, bounce, wiggle, fade, scale]);

  if (!reminder) return null;

  const buddy = buddies.find(b => b.uid === reminder.assignedTo);
  const buddyName = buddy?.displayName || 'a buddy';

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });

  const dismiss = async () => {
    try { await reminderService.markFired(reminder.id); } catch {}
    onDismiss();
  };

  const snooze = async () => {
    // Snooze re-schedules for 5 minutes from now. Done in a separate task
    // when the notification service handles update properly. For now just
    // dismiss; user can re-create if needed.
    onDismiss();
  };

  return (
    <Modal visible={!!reminder} transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[s.backdrop, { opacity: fade }]}>
        <Animated.View style={[s.card, { transform: [{ scale }] }]}>
          <Animated.View style={[s.monsterWrap, { transform: [{ translateY }, { rotate }] }]}>
            <Image source={monsterImg} style={s.monster} resizeMode="contain" />
          </Animated.View>

          <Text style={s.bell}>🔔</Text>
          <Text variant="h1" style={s.title} numberOfLines={2}>{reminder.title}</Text>
          <Text variant="meta" style={s.subtitle}>For {buddyName}</Text>
          {!!reminder.notes && (
            <Text variant="meta" style={s.notes} numberOfLines={3}>{reminder.notes}</Text>
          )}

          <View style={s.actions}>
            <Button label="Snooze 5 min" variant="secondary" onPress={snooze} full />
            <View style={{ height: 10 }} />
            <Button label="Got it" variant="primary" onPress={dismiss} full />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 80, // leave room for the monster floating above
    paddingBottom: 24,
    alignItems: 'center',
    ...theme.shadow.button,
  },
  monsterWrap: {
    position: 'absolute',
    top: -90,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monster: {
    width: 200,
    height: 200,
  },
  bell: { fontSize: 28, marginBottom: 8 },
  title: {
    textAlign: 'center',
    fontSize: 22,
    color: theme.colors.text,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  notes: {
    textAlign: 'center',
    marginTop: 12,
    color: theme.colors.muted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    marginTop: 28,
  },
});
