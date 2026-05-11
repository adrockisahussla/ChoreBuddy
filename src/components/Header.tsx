import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  title: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
  badge?: number;
}

/**
 * Header: top bar with brand gradient (currently a flat pink fill —
 * will be replaced with a real LinearGradient component once
 * react-native-linear-gradient lands). White text + icons throughout.
 */
export default function Header({ title, onMenuPress, onBackPress, rightSlot, badge }: Props) {
  return (
    <View style={s.row}>
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
        <Text style={s.sparkle}>✦ </Text>{title}
      </Text>
      {rightSlot}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: theme.colors.accent,
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
