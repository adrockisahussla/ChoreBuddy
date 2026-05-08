import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '../../theme';
import { useBuddies } from '../../hooks/useBuddies';
import { buddyLabel } from '../../utils/buddy';
import Header from '../../components/Header';

export default function BuddyMapScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { buddies } = useBuddies();
  const buddy = buddies.find(b => b.uid === buddyUid);
  const name = buddy?.displayName || buddyLabel(buddyUid, buddies);
  return (
    <SafeAreaView style={s.root}>
      <Header title={`${name} · Map`} onBackPress={() => navigation.goBack()} />
      <View style={s.center}>
        <View style={s.box}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🗺️</Text>
          <Text style={s.title}>{name}'s Location</Text>
          <Text style={s.placeholder}>Live map coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xxl, padding: 30, alignItems: 'center', width: '100%' },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '900', marginBottom: 8 },
  placeholder: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 24 },
});
