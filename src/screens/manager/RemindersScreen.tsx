import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useReminders } from '../../hooks/useReminders';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { reminderService } from '../../services/reminderService';
import { buddyLabel } from '../../utils/buddy';
import { Header, Screen, Card, Avatar, Text, useConfirm, SCREEN_BOTTOM_PAD } from '../../components';

export default function RemindersScreen({ route, navigation }: any) {
  const { reminders } = useReminders();
  const { buddies } = useBuddies();
  const confirm = useConfirm();
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
    <Screen contentStyle={{ padding: 0 }}>
      <Header
        title={title}
        onMenuPress={isSubScreen ? undefined : () => navigation?.openDrawer?.()}
        onBackPress={isSubScreen ? () => navigation.goBack() : undefined}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        {list.length === 0 ? (
          <Text variant="empty" style={{ padding: 40, lineHeight: 22 }}>
            No reminders yet.{'\n'}Reminder creation form coming next.
          </Text>
        ) : list.map(r => {
          const b = buddies.find(x => x.uid === r.assignedTo);
          const when = `${r.date}${r.time ? ' · ' + r.time : ' · all day'}`;
          return (
            <Card
              key={r.id}
              row
              onPress={async () => {
                const ok = await confirm({
                  title: 'Delete reminder?',
                  message: r.title,
                  confirmLabel: 'Delete',
                  confirmDestructive: true,
                });
                if (ok) reminderService.remove(r.id);
              }}
            >
              <Avatar emoji={b?.avatar || '🔔'} accent={b?.accent} size="sm" />
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ fontSize: 14 }}>{r.title}</Text>
                <Text variant="meta" style={{ marginTop: 2 }}>{when}</Text>
                {!!r.notes && (
                  <Text variant="tiny" style={{ marginTop: 4, opacity: 0.8 }} numberOfLines={2}>
                    {r.notes}
                  </Text>
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
