import React from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  emoji?: string;
  accent?: string;
  size?: Size;
  attention?: number;
  style?: ViewStyle;
}

const SIZES: Record<Size, { box: number; emoji: number; dot: number; dotFont: number }> = {
  sm: { box: 44, emoji: 24, dot: 16, dotFont: 10 },
  md: { box: 60, emoji: 32, dot: 20, dotFont: 11 },
  lg: { box: 80, emoji: 40, dot: 22, dotFont: 12 },
};

/**
 * Avatar: circular accent-tinted bubble with an emoji glyph.
 * Optional attention badge (red dot with number) for unread items.
 *
 * Accent transparency dropped from 0x40 → 0x33 because the new white
 * card surface needs lighter tints to keep the avatar feeling soft.
 */
export default function Avatar({ emoji = '👤', accent, size = 'md', attention, style }: Props) {
  const dims = SIZES[size];
  const bg = (accent || theme.colors.purple) + '33';
  return (
    <View style={[{ width: dims.box, height: dims.box }, style]}>
      <View style={[s.bubble, { width: dims.box, height: dims.box, borderRadius: dims.box / 2, backgroundColor: bg }]}>
        <Text style={{ fontSize: dims.emoji }}>{emoji}</Text>
      </View>
      {!!attention && attention > 0 && (
        <View style={[s.dot, { width: dims.dot + 4, height: dims.dot + 4, borderRadius: (dims.dot + 4) / 2 }]}>
          <Text style={[s.dotText, { fontSize: dims.dotFont }]}>{attention}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bubble: { justifyContent: 'center', alignItems: 'center' },
  dot: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: theme.colors.danger,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#ffffff',
  },
  dotText: { color: '#fff', fontWeight: '700' },
});
