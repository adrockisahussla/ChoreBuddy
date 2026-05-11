import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, ToastAndroid, Text as RNText, StyleSheet } from 'react-native';
import { useReminders } from '../../hooks/useReminders';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { reminderService } from '../../services/reminderService';
import { cancelReminderNotification } from '../../services/notificationService';
import { buddyLabel } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { Reminder } from '../../types';
import {
  Header, Screen, Card, Avatar, Text, Button, WeekNavigator, NewReminderForm,
  useConfirm, SCREEN_BOTTOM_PAD,
} from '../../components';

export default function RemindersScreen({ route, navigation }: any) {
  const { reminders } = useReminders();
  const { buddies } = useBuddies();
  const confirm = useConfirm();
  const filterKid: string | undefined = route?.params?.kidId;
  const isSubScreen = !!filterKid && navigation?.canGoBack?.();
  const title = filterKid ? `${buddyLabel(filterKid, buddies)} · Reminders` : 'Reminders';

  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeek());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);

  const list = reminders
    .filter(r => (filterKid ? r.assignedTo === filterKid : true))
    .filter(r => {
      // weekly/daily reminders carry forward; one-time only on their week.
      if (r.recurrence === 'weekly' || r.recurrence === 'daily') {
        return (r.weekOf || '') <= selectedWeek;
      }
      return r.weekOf === selectedWeek;
    })
    .slice()
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

  const onDelete = async (r: Reminder) => {
    const ok = await confirm({
      title: 'Delete reminder?',
      message: r.title,
      confirmLabel: 'Delete',
      confirmDestructive: true,
    });
    if (!ok) return;
    try {
      if (r.notificationId) await cancelReminderNotification(r.notificationId);
      await reminderService.remove(r.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Removed "${r.title}"`, ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const formatTime12h = (t: string): string => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    const h = Number(hStr); const m = Number(mStr);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header
        title={title}
        onMenuPress={isSubScreen ? undefined : () => navigation?.openDrawer?.()}
        onBackPress={isSubScreen ? () => navigation.goBack() : undefined}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <WeekNavigator weekOf={selectedWeek} onChange={setSelectedWeek} />

        <Button
          label="+ New Reminder"
          variant="primary"
          onPress={() => { setEditing(null); setCreateOpen(true); }}
          full
          style={{ marginBottom: 12 }}
        />

        {list.length === 0 ? (
          <Text variant="empty">No reminders this week.</Text>
        ) : list.map(r => {
          const b = buddies.find(x => x.uid === r.assignedTo);
          const dueDate = new Date(r.dueDate || Date.now());
          const dateLabel = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const when = r.allDay
            ? `${dateLabel} · all day`
            : `${dateLabel} · ${formatTime12h(r.time)}`;
          return (
            <Card key={r.id} row onPress={() => { setEditing(r); setCreateOpen(true); }} style={{ gap: 12 }}>
              <Avatar emoji={b?.avatar || '🔔'} accent={b?.accent} size="sm" />
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ fontSize: 15 }}>{r.title}</Text>
                <Text variant="meta" style={{ marginTop: 2, fontSize: 12 }}>{when}</Text>
                {!!r.notes && <Text variant="tiny" style={{ marginTop: 4, opacity: 0.8 }} numberOfLines={2}>{r.notes}</Text>}
              </View>
              <TouchableOpacity style={s.delBtn} onPress={() => onDelete(r)} hitSlop={10}>
                <RNText style={{ fontSize: 18 }}>🗑</RNText>
              </TouchableOpacity>
            </Card>
          );
        })}
      </ScrollView>

      <NewReminderForm
        visible={createOpen}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        defaultBuddyUid={filterKid}
        reminder={editing || undefined}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  delBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: theme.colors.danger + '60',
    backgroundColor: theme.colors.danger + '15',
    justifyContent: 'center', alignItems: 'center',
  },
});
