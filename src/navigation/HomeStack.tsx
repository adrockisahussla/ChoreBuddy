import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/manager/HomeScreen';
import BuddyProfileScreen from '../screens/manager/BuddyProfileScreen';
import BuddyChoresScreen from '../screens/manager/BuddyChoresScreen';
import BuddyRewardsScreen from '../screens/manager/BuddyRewardsScreen';
import BuddyMapScreen from '../screens/manager/BuddyMapScreen';
import RemindersScreen from '../screens/manager/RemindersScreen';
import ActiveChoresScreen from '../screens/manager/ActiveChoresScreen';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="HomeRoot" component={HomeScreen} />
      <Stack.Screen name="ActiveChores" component={ActiveChoresScreen} />
      <Stack.Screen name="BuddyProfile" component={BuddyProfileScreen} />
      <Stack.Screen name="BuddyChores" component={BuddyChoresScreen} />
      <Stack.Screen name="BuddyRewards" component={BuddyRewardsScreen} />
      <Stack.Screen name="BuddyReminders" component={RemindersScreen} />
      <Stack.Screen name="BuddyMap" component={BuddyMapScreen} />
    </Stack.Navigator>
  );
}
