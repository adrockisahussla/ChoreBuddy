import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameWallScreen from '../screens/manager/GameWallScreen';
import BuddyScheduleScreen from '../screens/manager/BuddyScheduleScreen';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();

export default function GameWallStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}
    >
      <Stack.Screen name="GameWallRoot" component={GameWallScreen} />
      <Stack.Screen name="BuddySchedule" component={BuddyScheduleScreen} />
    </Stack.Navigator>
  );
}
