import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import firestore from '@react-native-firebase/firestore';
import { resetWeeklyChores } from './src/services/choreService';
import { configureGoogleSignin } from './src/config/google';
import AuthGateway from './src/AuthGateway';
import DrawerNavigator from './src/navigation/DrawerNavigator';

configureGoogleSignin();

export default function App() {
  useEffect(() => {
    resetWeeklyChores(firestore()).catch(e => console.warn('resetWeeklyChores failed', e));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthGateway>
        <NavigationContainer>
          <DrawerNavigator />
        </NavigationContainer>
      </AuthGateway>
    </GestureHandlerRootView>
  );
}
