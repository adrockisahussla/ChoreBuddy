import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../theme';

interface Props {
  title: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
  badge?: number;
}

/**
 * Header: top bar with the brand LinearGradient sweeping
 * purple → pink → red. White text + icons throughout.
 */
export default function Header({ title, onMenuPress, onBackPress, rightSlot, badge }: Props) {
  return (
    <LinearGradient
      colors={theme.colors.brandGradient as unknown as string[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={s.row}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.brandGradient[0]} />
      {onBackPress ? (
        <TouchableOpacity style={s.btn} onPress={onBackPress}>
          <Text style={s.btnText}>←</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.btn} onPress={onMenuPress}>
          <Text style={s.btnText}>☰</Text>
          {!!badge && badge > 0 && (
            <View style={s.notif}>
              <Text style={s.notifText}>{badge}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      <Text style={s.title} numberOfLines={1}>
        {!onBackPress && <Text style={s.sparkle}>✦ </Text>}{title}
      </Text>
      {rightSlot}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  btn: { padding: 4, position: 'relative' },
  btnText: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  sparkle: { color: '#ffffff', fontSize: 18 },
  title: { flex: 1, color: '#ffffff', fontSize: 20, fontWeight: '700' },
  notif: {
    position: 'absolute', top: -2, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: theme.colors.accent,
  },
  notifText: { color: theme.colors.accent, fontSize: 10, fontWeight: '700' },
});
