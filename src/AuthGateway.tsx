import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useCurrentUser } from './hooks/useCurrentUser';
import SignInScreen from './screens/SignInScreen';

export default function AuthGateway({ children }: { children: React.ReactNode }) {
  const { fbUser, loading } = useCurrentUser();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f5c842" />
      </View>
    );
  }

  if (!fbUser) {
    return <SignInScreen />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0f1117', justifyContent: 'center', alignItems: 'center' },
});
