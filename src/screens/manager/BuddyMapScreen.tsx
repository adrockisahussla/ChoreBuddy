import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { useBuddies } from '../../hooks/useBuddies';
import { buddyLabel } from '../../utils/buddy';
import { Header, Screen, Text } from '../../components';

export default function BuddyMapScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { buddies } = useBuddies();
  const buddy = buddies.find(b => b.uid === buddyUid);
  const name = buddy?.displayName || buddyLabel(buddyUid, buddies);
  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${name} · Map`} onBackPress={() => navigation.goBack()} />
      <View style={s.center}>
        <View style={s.box}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🗺️</Text>
          <Text variant="h2" style={{ marginBottom: 8 }}>{name}'s Location</Text>
          <Text variant="sectionLabel" style={{ marginTop: 24, marginBottom: 0 }}>Live map coming soon</Text>
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xxl, padding: 30, alignItems: 'center', width: '100%' },
});
