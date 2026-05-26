import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuddiesScreen from '../screens/manager/BuddiesScreen';
import BuddyProfileScreen from '../screens/manager/BuddyProfileScreen';
import BuddyChoresScreen from '../screens/BuddyChoresRouter';
import BuddyRewardsScreen from '../screens/BuddyRewardsRouter';
import BuddyMapScreen from '../screens/manager/BuddyMapScreen';
import RemindersScreen from '../screens/manager/RemindersScreen';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();

export default function BuddiesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="BuddiesRoot" component={BuddiesScreen} />
      <Stack.Screen name="BuddyProfile" component={BuddyProfileScreen} />
      <Stack.Screen name="BuddyChores" component={BuddyChoresScreen} />
      <Stack.Screen name="BuddyRewards" component={BuddyRewardsScreen} />
      <Stack.Screen name="BuddyReminders" component={RemindersScreen} />
      <Stack.Screen name="BuddyMap" component={BuddyMapScreen} />
    </Stack.Navigator>
  );
}
