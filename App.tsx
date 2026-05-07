import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import ManagerScreen from './src/screens/ManagerScreen';
import KidScreen from './src/screens/KidScreen';
import { resetWeeklyChores } from './src/services/choreService';
import { configureGoogleSignin } from './src/config/google';
import AuthGateway from './src/AuthGateway';

const Stack = createNativeStackNavigator();

configureGoogleSignin();

export default function App() {
  useEffect(() => {
    resetWeeklyChores(firestore()).catch(e => console.warn('resetWeeklyChores failed', e));
  }, []);

  return (
    <AuthGateway>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="Manager" component={ManagerScreen} />
          <Stack.Screen name="Kid" component={KidScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthGateway>
  );
}
