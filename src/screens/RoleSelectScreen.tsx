import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function RoleSelectScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🧹 ChoreBuddy</Text>
      <Text style={styles.subtitle}>Who are you?</Text>
      <TouchableOpacity style={styles.btnManager} onPress={() => navigation.navigate('Manager')}>
        <Text style={styles.btnManagerText}>⚡ Manager</Text>
        <Text style={styles.btnSub}>Parent / Admin</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnKid1} onPress={() => navigation.navigate('Kid', { kidId: 'Kid1', kidName: 'Kid 1', color: '#7c3aed' })}>
        <Text style={styles.btnKidText}>🌟 Kid 1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnKid2} onPress={() => navigation.navigate('Kid', { kidId: 'Kid2', kidName: 'Kid 2', color: '#ea580c' })}>
        <Text style={styles.btnKidText}>🚀 Kid 2</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontFamily: 'System', fontSize: 36, fontWeight: '900', color: '#f5c842', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7b84a8', marginBottom: 40, fontWeight: '600' },
  btnManager: { backgroundColor: '#f5c842', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 16 },
  btnManagerText: { fontSize: 20, fontWeight: '900', color: '#000' },
  btnSub: { fontSize: 12, color: '#666', marginTop: 2 },
  btnKid1: { backgroundColor: '#7c3aed', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 16 },
  btnKid2: { backgroundColor: '#ea580c', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 16 },
  btnKidText: { fontSize: 20, fontWeight: '900', color: '#fff' },
});
