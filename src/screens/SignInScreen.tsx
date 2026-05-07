import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { authService } from '../services/authService';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (e: any) {
      console.warn('Sign-in failed', e);
      Alert.alert('Sign-in failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>🧹</Text>
        <Text style={styles.title}>BuddyMinder</Text>
        <Text style={styles.sub}>Family chores, made fun</Text>
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Sign in with Google</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { color: '#f5c842', fontSize: 36, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 },
  sub: { color: '#7b84a8', fontSize: 14, fontWeight: '600', marginBottom: 50 },
  btn: { backgroundColor: '#f5c842', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, minWidth: 220, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#000', fontWeight: '900', fontSize: 16 },
});
