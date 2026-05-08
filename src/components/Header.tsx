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
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {rightSlot}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder, backgroundColor: theme.colors.bg },
  btn: { padding: 4, position: 'relative' },
  btnText: { color: theme.colors.accent, fontSize: 24, fontWeight: '900' },
  title: { flex: 1, color: theme.colors.accent, fontSize: 18, fontWeight: '900' },
  notif: { position: 'absolute', top: -2, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: theme.colors.bg },
  notifText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});
