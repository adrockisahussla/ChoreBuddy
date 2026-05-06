import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import ManagerScreen from './src/screens/ManagerScreen';
import KidScreen from './src/screens/KidScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="Manager" component={ManagerScreen} />
        <Stack.Screen name="Kid" component={KidScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
