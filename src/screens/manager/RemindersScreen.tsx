import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useReminders } from '../../hooks/useReminders';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { reminderService } from '../../services/reminderService';
import { buddyLabel } from '../../utils/buddy';
import Header from '../../components/Header';

export default function RemindersScreen({ route, navigation }: any) {
  const { reminders } = useReminders();
  const { buddies } = useBuddies();
  const filterKid: string | undefined = route?.params?.kidId;
  const list = (filterKid ? reminders.filter(r => r.assignedTo === filterKid) : reminders)
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.date + (a.time ? 'T' + a.time : 'T00:00:00')).getTime();
      const tb = new Date(b.date + (b.time ? 'T' + b.time : 'T00:00:00')).getTime();
      return ta - tb;
    });

  const isSubScreen = !!filterKid && navigation?.canGoBack?.();
  const title = filterKid ? `${buddyLabel(filterKid, buddies)} · Reminders` : 'Reminders';

  return (
    <SafeAreaView style={s.root}>
      <Header
        title={title}
        onMenuPress={isSubScreen ? undefined : () => navigation?.openDrawer?.()}
        onBackPress={isSubScreen ? () => navigation.goBack() : undefined}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        {list.length === 0 ? (
          <Text style={s.empty}>No reminders yet.{'\n'}Reminder creation form coming next.</Text>
        ) : list.map(r => {
          const b = buddies.find(x => x.uid === r.assignedTo);
          const when = `${r.date}${r.time ? ' · ' + r.time : ' · all day'}`;
          return (
            <TouchableOpacity
              key={r.id}
              style={s.card}
              onLongPress={() => Alert.alert('Delete reminder?', r.title, [
                { text: 'Cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => reminderService.remove(r.id) },
              ])}
            >
              <View style={[s.avatar, { backgroundColor: (b?.accent || theme.colors.purple) + '40' }]}>
                <Text style={{ fontSize: 22 }}>{b?.avatar || '🔔'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{r.title}</Text>
                <Text style={s.meta}>{when}</Text>
                {!!r.notes && <Text style={s.notes} numberOfLines={2}>{r.notes}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  empty: { color: theme.colors.muted, textAlign: 'center', padding: 40, fontSize: 14, fontWeight: '700', lineHeight: 22 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, padding: 12, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  title: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  meta: { color: theme.colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  notes: { color: theme.colors.muted, fontSize: 11, fontWeight: '600', marginTop: 4, opacity: 0.8 },
});
