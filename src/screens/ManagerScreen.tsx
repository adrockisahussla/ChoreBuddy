import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Modal, Alert, ActivityIndicator, Platform
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getCurrentWeekOf, getEndOfWeek, getWeekOf, isOverdue } from '../services/choreService';

const KIDS = ['Kid1', 'Kid2'];

const fmtRange = (weekOf: string): string => {
  const [y, w] = weekOf.split('-W');
  const jan4 = new Date(Date.UTC(parseInt(y, 10), 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
  const mon = new Date(week1Mon);
  mon.setUTCDate(week1Mon.getUTCDate() + (parseInt(w, 10) - 1) * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return `Week of ${mon.toLocaleDateString('en-CA', opts)} – ${sun.toLocaleDateString('en-CA', { ...opts, year: 'numeric' })}`;
};

const shiftWeek = (weekOf: string, delta: number): string => {
  const [y, w] = weekOf.split('-W');
  const jan4 = new Date(Date.UTC(parseInt(y, 10), 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
  const target = new Date(week1Mon);
  target.setUTCDate(week1Mon.getUTCDate() + (parseInt(w, 10) - 1 + delta) * 7);
  return getWeekOf(target);
};

export default function ManagerScreen({ navigation }: any) {
  const [chores, setChores] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [selectedKid, setSelectedKid] = useState('Kid1');
  const [recurrence, setRecurrence] = useState<'once' | 'weekly'>('weekly');
  const [onceDate, setOnceDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [view, setView] = useState<'list' | 'week'>('list');
  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeekOf());
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
    const dueDate = recurrence === 'weekly' ? getEndOfWeek(new Date()) : getEndOfWeek(onceDate);
    await firestore().collection('chores').add({
      title,
      assignedTo: selectedKid,
      status: 'todo',
      rejectionNote: '',
      recurrence,
      dueDate,
      weekOf: getWeekOf(new Date(dueDate)),
      completedAt: 0,
      overdue: false,
      createdAt: Date.now(),
    });
    setTitle('');
  };

  const approve = async (id: string) => {
    await firestore().collection('chores').doc(id).update({ status: 'approved', rejectionNote: '', completedAt: Date.now() });
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

  const weekChores = useMemo(() => chores.filter(c => c.weekOf === selectedWeek), [chores, selectedWeek]);
  const weekStats = useMemo(() => ({
    total: weekChores.length,
    approved: weekChores.filter(c => c.status === 'approved').length,
    pending: weekChores.filter(c => c.status === 'pending').length,
    overdue: weekChores.filter(c => isOverdue(c)).length,
  }), [weekChores]);

  const dueLabel = (c: any) => c.dueDate
    ? new Date(c.dueDate).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  const statusIcon = (c: any) => {
    if (c.status === 'approved') return '✓';
    if (c.status === 'pending') return '⏳';
    if (isOverdue(c)) return '✕';
    return '□';
  };

  const ChoreItem = ({ item, showApprove }: any) => (
    <View style={[styles.card, item.status === 'pending' && styles.cardPending]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          {item.assignedTo} · <Text style={{ color: statusColor(item.status) }}>{statusLabel(item.status)}</Text>
          {item.recurrence === 'weekly' ? ' · Weekly' : ''}
          {item.dueDate ? ` · Due ${dueLabel(item)}` : ''}
          {isOverdue(item) ? <Text style={{ color: '#ff5e5e' }}>  Overdue</Text> : null}
        </Text>
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

  const WeekRow = ({ item }: any) => {
    const overdue = isOverdue(item);
    const tap = item.status === 'pending' ? () => setRejectModal(null) : undefined;
    return (
      <TouchableOpacity
        activeOpacity={item.status === 'pending' ? 0.7 : 1}
        onPress={item.status === 'pending' ? () => approveOrRejectPrompt(item) : undefined}
        style={styles.weekRow}
      >
        <Text style={styles.weekIcon}>{statusIcon(item)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.weekTitle}>{item.title}</Text>
          {item.dueDate && <Text style={[styles.weekDue, overdue && { color: '#ff5e5e' }]}>Due {dueLabel(item)}{overdue ? ' · Overdue' : ''}</Text>}
        </View>
        <Text style={[styles.weekPill, { color: statusColor(item.status), borderColor: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
      </TouchableOpacity>
    );
  };

  const approveOrRejectPrompt = (item: any) => {
    Alert.alert(item.title, `${item.assignedTo} marked this done.`, [
      { text: 'Reject', style: 'destructive', onPress: () => setRejectModal(item) },
      { text: 'Approve', onPress: () => approve(item.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderListView = () => (
    <FlatList
      data={[
        ...pending.map(c => ({ ...c, _section: 'pending' })),
        ...todo.map(c => ({ ...c, _section: 'todo' })),
        ...approved.map(c => ({ ...c, _section: 'approved' })),
      ]}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <ChoreItem item={item} showApprove={item._section === 'pending'} />}
      ListHeaderComponent={() => (
        <>{pending.length > 0 && <Text style={styles.sectionLabel}>⏳ Pending Review ({pending.length})</Text>}</>
      )}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    />
  );

  const renderWeekView = () => {
    const byKid = KIDS.map(k => ({ kid: k, items: weekChores.filter(c => c.assignedTo === k) }));
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => setSelectedWeek(shiftWeek(selectedWeek, -1))}><Text style={styles.weekNav}>‹</Text></TouchableOpacity>
          <Text style={styles.weekHeaderText}>{fmtRange(selectedWeek)}</Text>
          <TouchableOpacity onPress={() => setSelectedWeek(shiftWeek(selectedWeek, 1))}><Text style={styles.weekNav}>›</Text></TouchableOpacity>
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryItem}>Total {weekStats.total}</Text>
          <Text style={[styles.summaryItem, { color: '#22c55e' }]}>✓ {weekStats.approved}</Text>
          <Text style={[styles.summaryItem, { color: '#f5c842' }]}>⏳ {weekStats.pending}</Text>
          <Text style={[styles.summaryItem, { color: '#ff5e5e' }]}>✕ {weekStats.overdue}</Text>
        </View>
        <FlatList
          data={byKid}
          keyExtractor={g => g.kid}
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.kidGroupLabel}>{group.kid.toUpperCase()}</Text>
              {group.items.length === 0
                ? <Text style={styles.weekEmpty}>No chores this week</Text>
                : group.items.map(c => <WeekRow key={c.id} item={c} />)}
            </View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>⚡ Manager</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, view === 'list' && styles.tabActive]} onPress={() => setView('list')}>
          <Text style={[styles.tabText, view === 'list' && styles.tabTextActive]}>List View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'week' && styles.tabActive]} onPress={() => setView('week')}>
          <Text style={[styles.tabText, view === 'week' && styles.tabTextActive]}>Week View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addForm}>
        <TextInput style={styles.input} placeholder="New chore..." placeholderTextColor="#555" value={title} onChangeText={setTitle} />
        <View style={styles.kidRow}>
          {KIDS.map(k => (
            <TouchableOpacity key={k} style={[styles.kidBtn, selectedKid === k && styles.kidBtnActive]} onPress={() => setSelectedKid(k)}>
              <Text style={[styles.kidBtnText, selectedKid === k && styles.kidBtnTextActive]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.kidRow, { marginTop: 8 }]}>
          {(['weekly', 'once'] as const).map(r => (
            <TouchableOpacity key={r} style={[styles.kidBtn, recurrence === r && styles.kidBtnActive]} onPress={() => setRecurrence(r)}>
              <Text style={[styles.kidBtnText, recurrence === r && styles.kidBtnTextActive]}>{r === 'weekly' ? 'Weekly' : 'One-time'}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={addChore}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dueLine}>
          {recurrence === 'weekly'
            ? `Due: ${new Date(getEndOfWeek(new Date())).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}`
            : null}
        </Text>
        {recurrence === 'once' && (
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>Due: {onceDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </TouchableOpacity>
        )}
        {showPicker && (
          <DateTimePicker
            value={onceDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowPicker(false); if (d) setOnceDate(d); }}
          />
        )}
      </View>

      {loading ? <ActivityIndicator color="#f5c842" style={{ marginTop: 40 }} /> :
        (view === 'list' ? renderListView() : renderWeekView())}

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
  tabRow: { flexDirection: 'row', backgroundColor: '#1a1d27', borderBottomWidth: 1, borderBottomColor: '#1e2235' },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#f5c842' },
  tabText: { color: '#7b84a8', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#f5c842' },
  addForm: { backgroundColor: '#1a1d27', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e2235' },
  input: { backgroundColor: '#0f1117', color: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#2e3350', fontSize: 15 },
  kidRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  kidBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#2e3350' },
  kidBtnActive: { backgroundColor: '#f5c842', borderColor: '#f5c842' },
  kidBtnText: { color: '#7b84a8', fontWeight: '700', fontSize: 13 },
  kidBtnTextActive: { color: '#000' },
  addBtn: { marginLeft: 'auto', backgroundColor: '#f5c842', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontWeight: '900', color: '#000', fontSize: 14 },
  dueLine: { color: '#7b84a8', fontSize: 12, fontWeight: '700', marginTop: 8 },
  dateBtn: { marginTop: 8, backgroundColor: '#0f1117', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2e3350' },
  dateBtnText: { color: '#f0f2ff', fontSize: 13, fontWeight: '700' },
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
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#1a1d27', borderBottomWidth: 1, borderBottomColor: '#1e2235' },
  weekHeaderText: { color: '#f0f2ff', fontWeight: '800', fontSize: 14 },
  weekNav: { color: '#f5c842', fontSize: 28, fontWeight: '900', paddingHorizontal: 12 },
  summary: { flexDirection: 'row', gap: 14, padding: 12, backgroundColor: '#0f1117', borderBottomWidth: 1, borderBottomColor: '#1e2235' },
  summaryItem: { color: '#f0f2ff', fontWeight: '800', fontSize: 13 },
  kidGroupLabel: { color: '#7b84a8', fontWeight: '900', fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1d27', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#2e3350' },
  weekIcon: { color: '#f0f2ff', fontSize: 18, fontWeight: '900', width: 24, textAlign: 'center' },
  weekTitle: { color: '#f0f2ff', fontWeight: '700', fontSize: 14 },
  weekDue: { color: '#7b84a8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  weekPill: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  weekEmpty: { color: '#7b84a8', fontStyle: 'italic', fontSize: 12, marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1a1d27', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#f0f2ff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#7b84a8', fontSize: 13, marginBottom: 14 },
  modalInput: { backgroundColor: '#0f1117', color: '#fff', borderRadius: 10, padding: 12, height: 90, borderWidth: 1, borderColor: '#2e3350', fontSize: 14, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btnCancel: { padding: 10, paddingHorizontal: 16 },
  btnSendReject: { backgroundColor: '#ff5e5e', borderRadius: 10, padding: 10, paddingHorizontal: 20 },
});
