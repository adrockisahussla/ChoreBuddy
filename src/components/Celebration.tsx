import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text as RNText, StyleSheet, Pressable, Animated, Easing,
} from 'react-native';
import { theme } from '../theme';

export interface CelebrationPayload {
  /** Big emoji shown at the top of the card. */
  emoji: string;
  /** Headline — short, ALL CAPS recommended. e.g. "CHORE APPROVED!" */
  headline: string;
  /** What the celebration is about — e.g. the chore title. */
  subtitle: string;
  /** The big number to animate up to. Optional. */
  count?: number;
  /** Suffix shown next to the count (e.g. "POINTS", "MIN"). */
  countLabel?: string;
  /** Accent color override (defaults to theme.colors.accent). */
  accent?: string;
  /** Dedupe key so re-renders don't enqueue the same celebration twice. */
  dedupeKey?: string;
}

interface CelebrationCtx {
  celebrate: (payload: CelebrationPayload) => void;
}

const Ctx = createContext<CelebrationCtx>({ celebrate: () => {} });

export function useCelebration(): CelebrationCtx {
  return useContext(Ctx);
}

/**
 * CelebrationProvider — mount once near the top of the tree. Exposes
 * `celebrate(payload)` via context. Multiple celebrations queue and
 * display one at a time, like a social-media game's reward popup.
 */
export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CelebrationPayload[]>([]);
  const [current, setCurrent] = useState<CelebrationPayload | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const celebrate = useCallback((payload: CelebrationPayload) => {
    if (payload.dedupeKey) {
      if (seenRef.current.has(payload.dedupeKey)) return;
      seenRef.current.add(payload.dedupeKey);
    }
    setQueue(q => [...q, payload]);
  }, []);

  // When idle and queue non-empty, pop and show.
  useEffect(() => {
    if (current) return;
    if (queue.length === 0) return;
    setCurrent(queue[0]);
    setQueue(q => q.slice(1));
  }, [queue, current]);

  return (
    <Ctx.Provider value={{ celebrate }}>
      {children}
      <CelebrationModal
        payload={current}
        onDismiss={() => setCurrent(null)}
      />
    </Ctx.Provider>
  );
}

function CelebrationModal({ payload, onDismiss }: { payload: CelebrationPayload | null; onDismiss: () => void }) {
  const visible = !!payload;
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const counter = useRef(new Animated.Value(0)).current;
  const [counterText, setCounterText] = useState('0');

  useEffect(() => {
    if (!payload) {
      scale.setValue(0.5);
      opacity.setValue(0);
      counter.setValue(0);
      setCounterText('0');
      return;
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    if (payload.count !== undefined) {
      Animated.timing(counter, {
        toValue: payload.count,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      const id = counter.addListener(({ value }) => {
        setCounterText(String(Math.round(value)));
      });
      return () => counter.removeListener(id);
    }
  }, [payload]);

  if (!payload) return null;
  const accent = payload.accent || theme.colors.accent;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onDismiss}>
        <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>
          <View style={[s.emojiBubble, { backgroundColor: accent + '22', borderColor: accent }]}>
            <RNText style={s.emojiText}>{payload.emoji}</RNText>
          </View>
          <RNText style={[s.headline, { color: accent }]}>{payload.headline}</RNText>
          <RNText style={s.subtitle}>{payload.subtitle}</RNText>

          {payload.count !== undefined && (
            <View style={s.countRow}>
              <RNText style={[s.countNum, { color: accent }]}>+{counterText}</RNText>
              {payload.countLabel && (
                <RNText style={[s.countLabel, { color: accent }]}>{payload.countLabel}</RNText>
              )}
            </View>
          )}

          <Pressable style={[s.dismissBtn, { backgroundColor: accent }]} onPress={onDismiss}>
            <RNText style={s.dismissText}>Awesome!</RNText>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
  },
  emojiBubble: {
    position: 'absolute',
    top: -42,
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
    // shadow so the bubble pops off the card
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  emojiText: { fontSize: 48, lineHeight: 56 },
  headline: {
    fontSize: 18, fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.text,
    fontSize: 16, fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 22,
  },
  countNum: { fontSize: 56, fontWeight: '900', lineHeight: 64 },
  countLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 999,
    minWidth: 180,
    alignItems: 'center',
  },
  dismissText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
});
