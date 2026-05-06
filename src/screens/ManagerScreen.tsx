import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, Alert, ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';

const KIDS = ['Kid1', 'Kid2'];

export default function ManagerScreen({ navigation }: any) {
  const [chores, setChores] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [selectedKid, setSelectedKid] = useState('Kid1');
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    const unsub = firestore().collection('chores').onSnapshot(snap => {
      setChores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addChore = async () => {
    if (!title.trim()) return;
    await firestore().collection('chores').add({ title, assignedTo: selectedKid, status: 'todo', createdAt: Date.now() });
    setTitle('');
  };

  const approve = async (id: string) => {
    await firestore().collection('chores').doc(id).update({ status: 'approved', rejectionNote: '' });
  };

  const reject = async () => {
    if (!rejectNote.trim()) return;
    await firestore().collection('chores').doc(rejectModal.id).update({ status: 'rejected', rejectionNote: rejectNote });
    setRejectModal(null);
    setRejectNote('');
  };

  const deleteChore = (id: string) => {
    Alert.alert('Delete', 'Remove this chore?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => firestore().collection('chores').doc(id).delete() }
    ]);
  };

  const pending = chores.filter(c => c.status === 'pending');
  const todo = chores.filter(c => c.status === 'todo' || c.status === 'rejected');
  const approved = chores.filter(c => c.status === 'approved');

  const ChoreItem = ({ item, showApprove }: any) => (
    <View style={[styles.card, item.status === 'pending' && styles.cardPending]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>{item.assignedTo} · <Text style={{ color: statusColor(item.status) }}>{statusLabel(item.status)}</Text></Text>
      </View>
      <View style={{ gap: 6 }}>
        {showApprove && <>
          <TouchableOpacity style={styles.btnApprove} onPress={() => approve(item.id)}>
            <Text style={styles.btnApproveText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnReject} onPress={() => setRejectModal(item)}>
            <Text style={styles.btnRejectText}>✕</Text>
          </TouchableOpacity>
        </>}
        <TouchableOpacity style={styles.btnDelete} onPress={() => deleteChore(item.id)}>
          <Text style={styles.btnDeleteText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>⚡ Manager</Text>
      </View>

      <View style={styles.addForm}>
        <TextInput style={styles.input} placeholder="New chore..." placeholderTextColor="#555" value={title} onChangeText={setTitle} />
        <View style={styles.kidRow}>
          {KIDS.map(k => (
            <TouchableOpacity key={k} style={[styles.kidBtn, selectedKid === k && styles.kidBtnActive]} onPress={() => setSelectedKid(k)}>
              <Text style={[styles.kidBtnText, selectedKid === k && styles.kidBtnTextActive]}>{k}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={addChore}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? <ActivityIndicator color="#f5c842" style={{ marginTop: 40 }} /> :
        <FlatList
          data={[
            ...pending.map(c => ({ ...c, _section: 'pending' })),
            ...todo.map(c => ({ ...c, _section: 'todo' })),
            ...approved.map(c => ({ ...c, _section: 'approved' })),
          ]}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ChoreItem item={item} showApprove={item._section === 'pending'} />}
          ListHeaderComponent={() => (
            <>
              {pending.length > 0 && <Text style={styles.sectionLabel}>⏳ Pending Review ({pending.length})</Text>}
            </>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        />
      }

      <Modal visible={!!rejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rejection Note</Text>
            <Text style={styles.modalSub}>Tell {rejectModal?.assignedTo} why:</Text>
            <TextInput style={styles.modalInput} multiline placeholder="e.g. You missed the corners!" placeholderTextColor="#666" value={rejectNote} onChangeText={setRejectNote} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setRejectModal(null); setRejectNote(''); }}>
                <Text style={{ color: '#888', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSendReject} onPress={reject}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const statusColor = (s: string) => ({ todo: '#60a5fa', pending: '#f5c842', approved: '#22c55e', rejected: '#ff5e5e' }[s] || '#888');
const statusLabel = (s: string) => ({ todo: 'To Do', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[s] || s);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e2235' },
  back: { fontSize: 22, color: '#f5c842' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#f5c842' },
  addForm: { backgroundColor: '#1a1d27', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e2235' },
  input: { backgroundColor: '#0f1117', color: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#2e3350', fontSize: 15 },
  kidRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  kidBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#2e3350' },
  kidBtnActive: { backgroundColor: '#f5c842', borderColor: '#f5c842' },
  kidBtnText: { color: '#7b84a8', fontWeight: '700', fontSize: 13 },
  kidBtnTextActive: { color: '#000' },
  addBtn: { marginLeft: 'auto', backgroundColor: '#f5c842', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontWeight: '900', color: '#000', fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#7b84a8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: '#1a1d27', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2e3350', gap: 10 },
  cardPending: { borderColor: '#f5c84250', backgroundColor: '#1e1c10' },
  cardTitle: { color: '#f0f2ff', fontWeight: '700', fontSize: 15, marginBottom: 3 },
  cardMeta: { color: '#7b84a8', fontSize: 12 },
  btnApprove: { backgroundColor: '#0d3d2a', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#22c55e' },
  btnApproveText: { color: '#22c55e', fontWeight: '900' },
  btnReject: { backgroundColor: '#3d0d0d', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ff5e5e' },
  btnRejectText: { color: '#ff5e5e', fontWeight: '900' },
  btnDelete: { backgroundColor: '#1a1d27', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#2e3350' },
  btnDeleteText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1a1d27', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#f0f2ff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#7b84a8', fontSize: 13, marginBottom: 14 },
  modalInput: { backgroundColor: '#0f1117', color: '#fff', borderRadius: 10, padding: 12, height: 90, borderWidth: 1, borderColor: '#2e3350', fontSize: 14, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btnCancel: { padding: 10, paddingHorizontal: 16 },
  btnSendReject: { backgroundColor: '#ff5e5e', borderRadius: 10, padding: 10, paddingHorizontal: 20 },
});
