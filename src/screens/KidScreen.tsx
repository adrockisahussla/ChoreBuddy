import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { isOverdue } from '../services/choreService';

export default function KidScreen({ route, navigation }: any) {
  const { kidId, kidName, color } = route.params;
  const [chores, setChores] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore().collection('chores')
      .where('assignedTo', '==', kidId)
      .onSnapshot(snap => {
        setChores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    return unsub;
  }, [kidId]);

  const addChore = async () => {
    if (!title.trim()) return;
    await firestore().collection('chores').add({ title, assignedTo: kidId, status: 'todo', createdAt: Date.now() });
    setTitle('');
  };

  const markDone = async (item: any) => {
    if (item.status === 'pending' || item.status === 'approved') return;
    await firestore().collection('chores').doc(item.id).update({ status: 'pending', rejectionNote: '' });
  };

  const resubmit = async (id: string) => {
    await firestore().collection('chores').doc(id).update({ status: 'pending', rejectionNote: '' });
  };

  const done = chores.filter(c => c.status === 'approved').length;
  const total = chores.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const rejected = chores.filter(c => c.status === 'rejected');
  const active = chores.filter(c => c.status === 'todo' || c.status === 'pending');
  const approved = chores.filter(c => c.status === 'approved');

  const ChoreItem = ({ item }: any) => {
    const isPending = item.status === 'pending';
    const isApproved = item.status === 'approved';
    const isRejected = item.status === 'rejected';
    const overdue = isOverdue(item);
    const dueLabel = item.dueDate
      ? new Date(item.dueDate).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
      : null;

    return (
      <TouchableOpacity
        style={[styles.card, isRejected && styles.cardRejected, isPending && styles.cardPending, isApproved && styles.cardApproved]}
        onPress={() => markDone(item)}
        activeOpacity={isPending || isApproved ? 1 : 0.7}
      >
        <View style={[styles.check, isPending && { backgroundColor: color, borderColor: color }, isApproved && styles.checkApproved]}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>{isPending ? '⏳' : isApproved ? '✓' : isRejected ? '✕' : ''}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, (isPending || isApproved) && styles.cardTitleDone]}>{item.title}</Text>
          {dueLabel && <Text style={[styles.due, overdue && styles.dueOverdue]}>Due: {dueLabel}{overdue ? ' · Overdue' : ''}</Text>}
          {isPending && <Text style={[styles.tag, { color }]}>Waiting for approval...</Text>}
          {isApproved && <Text style={[styles.tag, { color: '#22c55e' }]}>✓ Approved!</Text>}
          {isRejected && <>
            <Text style={styles.rejectNote}>💬 "{item.rejectionNote}"</Text>
            <TouchableOpacity style={[styles.resubmitBtn, { backgroundColor: color }]} onPress={() => resubmit(item.id)}>
              <Text style={styles.resubmitText}>Re-submit ↗</Text>
            </TouchableOpacity>
          </>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{kidName}'s Chores</Text>
      </View>

      <View style={styles.addForm}>
        <View style={styles.addRow}>
          <TextInput style={styles.input} placeholder="Add my own task..." placeholderTextColor="#aaa" value={title} onChangeText={setTitle} />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: color }]} onPress={addChore}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>{done} of {total} approved</Text>
          <Text style={styles.progressText}>{pct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>

      {loading ? <ActivityIndicator color={color} style={{ marginTop: 40 }} /> :
        <FlatList
          data={[
            ...rejected.map(c => ({ ...c, _s: 'rejected' })),
            ...active.map(c => ({ ...c, _s: 'active' })),
            ...approved.map(c => ({ ...c, _s: 'approved' })),
          ]}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ChoreItem item={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>No chores yet!</Text>}
        />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0ff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  back: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  addForm: { backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e8eaf6' },
  addRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#f8f9ff', borderRadius: 12, padding: 12, borderWidth: 2, borderColor: '#e8eaf6', fontSize: 14, color: '#1a1a2e' },
  addBtn: { borderRadius: 12, width: 46, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  progressWrap: { backgroundColor: '#fff', padding: 14, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: '#e8eaf6' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, fontWeight: '700', color: '#9999bb' },
  progressBg: { backgroundColor: '#e8eaf6', borderRadius: 40, height: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  cardPending: { borderColor: '#e8d5ff', backgroundColor: '#fdf8ff' },
  cardApproved: { borderColor: '#bbf7d0', backgroundColor: '#f0fff5', opacity: 0.75 },
  cardRejected: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkApproved: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  cardTitle: { fontWeight: '800', fontSize: 15, color: '#1a1a2e', marginBottom: 3 },
  cardTitleDone: { color: '#9999bb' },
  tag: { fontSize: 12, fontWeight: '700' },
  due: { fontSize: 11, fontWeight: '700', color: '#9999bb', marginBottom: 2 },
  dueOverdue: { color: '#dc2626' },
  rejectNote: { fontSize: 12, color: '#dc2626', fontWeight: '600', backgroundColor: '#fee2e2', borderRadius: 8, padding: 6, marginTop: 4 },
  resubmitBtn: { borderRadius: 8, padding: 6, paddingHorizontal: 10, alignSelf: 'flex-start', marginTop: 6 },
  resubmitText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  empty: { textAlign: 'center', color: '#9999bb', fontWeight: '700', marginTop: 40 },
});
