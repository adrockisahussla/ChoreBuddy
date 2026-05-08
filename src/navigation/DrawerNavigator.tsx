import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import HomeStack from './HomeStack';
import BuddiesStack from './BuddiesStack';
import ChorePoolScreen from '../screens/manager/ChorePoolScreen';
import RemindersScreen from '../screens/manager/RemindersScreen';
import { theme } from '../theme';
import { authService } from '../services/authService';
import { useCurrentUser } from '../hooks/useCurrentUser';

const Drawer = createDrawerNavigator();

const ITEMS: { route: string; label: string; icon: string }[] = [
  { route: 'Home', label: 'Home', icon: '🏠' },
  { route: 'Buddies', label: 'Buddies', icon: '👥' },
  { route: 'ChorePool', label: 'Chore Pool', icon: '⭐' },
  { route: 'Reminders', label: 'Reminders', icon: '🔔' },
];

function CustomDrawerContent(props: any) {
  const { fbUser, userDoc } = useCurrentUser();
  const name = userDoc?.displayName || fbUser?.displayName || 'Manager';
  const email = fbUser?.email || '';

  const signOut = () => Alert.alert('Sign Out', 'Sign out of BuddyMinder?', [
    { text: 'Cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: () => authService.signOut().catch(e => Alert.alert('Error', String(e))) },
  ]);

  const goRoute = (route: string) => {
    // Reset the route's stack to its first screen so revisiting always lands on the root
    const rootScreen = route === 'Home' ? 'HomeRoot' : route === 'Buddies' ? 'BuddiesRoot' : undefined;
    props.navigation.dispatch(
      CommonActions.navigate({ name: route, params: { screen: rootScreen } as any })
    );
    props.navigation.closeDrawer();
  };

  return (
    <SafeAreaView style={s.drawerRoot}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ padding: 0 }}>
        <View style={s.userBox}>
          <View style={s.userAvatar}><Text style={{ fontSize: 26 }}>👤</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{name}</Text>
            {!!email && <Text style={s.userEmail} numberOfLines={1}>{email}</Text>}
            <Text style={s.userRole}>Manager</Text>
          </View>
        </View>
        <View style={{ padding: 8 }}>
          {ITEMS.map(it => {
            const active = props.state.routeNames[props.state.index] === it.route;
            return (
              <TouchableOpacity
                key={it.route}
                style={[s.item, active && s.itemActive]}
                onPress={() => goRoute(it.route)}
              >
                <Text style={s.itemIcon}>{it.icon}</Text>
                <Text style={[s.itemLabel, active && { color: theme.colors.accent }]}>{it.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>
      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={CustomDrawerContent}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.colors.bg, width: 280 },
      }}
    >
      <Drawer.Screen name="Home" component={HomeStack} options={{ title: 'Home' }} />
      <Drawer.Screen name="Buddies" component={BuddiesStack} options={{ title: 'Buddies' }} />
      <Drawer.Screen name="ChorePool" component={ChorePoolScreen} options={{ title: 'Chore Pool' }} />
      <Drawer.Screen name="Reminders" component={RemindersScreen} options={{ title: 'Reminders' }} />
    </Drawer.Navigator>
  );
}

const s = StyleSheet.create({
  drawerRoot: { flex: 1, backgroundColor: theme.colors.bg },
  userBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder, marginBottom: 8 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' },
  userName: { color: theme.colors.text, fontWeight: '900', fontSize: 15 },
  userEmail: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  userRole: { color: theme.colors.accent, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 10 },
  itemActive: { backgroundColor: theme.colors.card },
  itemIcon: { fontSize: 18 },
  itemLabel: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  signOut: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder },
  signOutText: { color: theme.colors.danger, fontWeight: '900', textAlign: 'center', fontSize: 14 },
});
