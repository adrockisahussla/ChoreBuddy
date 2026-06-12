import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LocationScreen from '../screens/LocationScreen';
import TrackMapScreen from '../screens/manager/TrackMapScreen';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();

export default function LocationStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="LocationRoot" component={LocationScreen} />
      <Stack.Screen name="TrackMap" component={TrackMapScreen} />
    </Stack.Navigator>
  );
}
