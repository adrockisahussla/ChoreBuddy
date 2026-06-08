import React from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { useBuddies } from '../../hooks/useBuddies';
import {
  Header, Screen, Card, Avatar, Text, SCREEN_BOTTOM_PAD,
} from '../../components';

/**
 * GameWall — manager-only. Lists every buddy as a link; tapping one opens
 * their weekly play schedule (days, time window, daily hour cap).
 */
export default function GameWallScreen({ navigation }: any) {
  const { buddies, loading } = useBuddies();
  const kids = buddies.filter(b => b.role === 'buddy');

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="GameWall" onMenuPress={() => navigation?.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Text variant="sectionLabel" style={{ marginBottom: 10 }}>Buddies</Text>

        {loading ? (
          <Text variant="empty">Loading…</Text>
        ) : kids.length === 0 ? (
          <Text variant="empty">No buddies yet. Add one from the Family screen.</Text>
        ) : kids.map(b => (
          <Card
            key={b.uid}
            row
            onPress={() => navigation.navigate('BuddySchedule', { buddyUid: b.uid })}
            style={{ gap: 12 }}
          >
            <Avatar emoji={b.avatar || '🎮'} accent={b.accent} size="sm" />
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 15 }}>{b.displayName}</Text>
              <Text variant="meta" style={{ marginTop: 2, fontSize: 12 }}>Tap to set play times</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('BuddySchedule', { buddyUid: b.uid })}>
              <Text style={{ fontSize: 22, color: theme.colors.muted }}>›</Text>
            </TouchableOpacity>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
