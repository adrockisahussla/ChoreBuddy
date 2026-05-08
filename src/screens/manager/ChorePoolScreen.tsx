import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, SafeAreaView } from 'react-native';
import { ChorePoolItem, Recurrence } from '../../types';
import { theme } from '../../theme';
import { POINTS_PER } from '../../utils/buddy';
import { useChorePool } from '../../hooks/useChorePool';
import { useBuddies } from '../../hooks/useBuddies';
import { useFamilyId } from '../../hooks/useFamilyId';
import { chorePoolService } from '../../services/chorePoolService';
import { choreService, getEndOfWeek, getWeekOf } from '../../services/choreService';
import Header from '../../components/Header';

export default function ChorePoolScreen({ navigation }: any) {
  const { chorePool } = useChorePool();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <SafeAreaView style={s.root}>
      <Header title="Chore Pool" onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={s.intro}>
          <Text style={s.introText}>
            The <Text style={s.introBold}>Chore Pool</Text> is where you store common chores you want to draw from. Add chores to the pool, and assign them to your Buddies from here as well.
          </Text>
        </View>

        <TouchableOpacity style={s.addBtn} onPress={() => { setAddOpen(o => !o); setEditingId(null); }}>
          <Text style={s.addBtnText}>{addOpen ? '— Close' : '+ New Chore'}</Text>
        </TouchableOpacity>

        {addOpen && <NewPoolForm onClose={() => setAddOpen(false)} />}

        {chorePool.length === 0 && !addOpen ? (
          <Text style={s.empty}>Your pool is empty. Tap "+ New Chore" to add one.</Text>
        ) : (
          chorePool.map(p => (
            <View key={p.id}>
              <TouchableOpacity
                style={[s.card, editingId === p.id && s.cardActive]}
                onPress={() => { setEditingId(editingId === p.id ? null : p.id); setAddOpen(false); }}
              >
                <View style={s.statusIcon}><Text style={s.starText}>★</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{p.title}</Text>
                  <Text style={s.cardMeta}>
                    {p.recurrence === 'daily' ? 'Daily' : p.recurrence === 'weekly' ? 'Weekly' : 'One-time'} · <Text style={{ color: theme.colors.accent, fontWeight: '900' }}>+{p.points} pts</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.delBtn}
                  onPress={() => Alert.alert('Delete', `Remove "${p.title}" from pool?`, [
                    { text: 'Cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => chorePoolService.remove(p.id) },
                  ])}
                >
                  <Text style={s.delBtnText}>🗑</Text>
                </TouchableOpacity>
                <Text style={s.chevron}>{editingId === p.id ? '▾' : '›'}</Text>
              </TouchableOpacity>
              {editingId === p.id && <NewPoolForm initial={p} onClose={() => setEditingId(null)} />}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface FormProps {
  initial?: ChorePoolItem;
  onClose: () => void;
}

function NewPoolForm({ initial, onClose }: FormProps) {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title || '');
  const [recur, setRecur] = useState<Recurrence>(initial?.recurrence || 'weekly');
  const [points, setPoints] = useState<number>(initial?.points ?? POINTS_PER.weekly);
  const [showAssign, setShowAssign] = useState(false);
  const { buddies } = useBuddies();
  const familyId = useFamilyId();

  const buildPool = (): Omit<ChorePoolItem, 'id' | 'createdAt'> => ({
    familyId: familyId || '',
    title: title.trim(),
    recurrence: recur,
    points,
  });
  const buildAssigned = (buddyUid: string) => {
    const dueDate = recur === 'daily'
      ? (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })()
      : getEndOfWeek(new Date());
    return {
      familyId: familyId || '',
      title: title.trim(), assignedTo: buddyUid, status: 'todo' as const, rejectionNote: '',
      recurrence: recur, dueDate, weekOf: getWeekOf(new Date(dueDate)),
      points, completedAt: 0, overdue: false,
    };
  };
  const save = async () => {
    if (!title.trim() || !familyId) return;
    if (editing) await chorePoolService.update(initial!.id, buildPool());
    else await chorePoolService.add(buildPool());
    onClose();
  };
  const saveAndAssign = async (buddyUid: string) => {
    if (!title.trim() || !familyId) return;
    if (editing) await chorePoolService.update(initial!.id, buildPool());
    else await chorePoolService.add(buildPool());
    await choreService.add(buildAssigned(buddyUid));
    onClose();
  };
  const del = () => Alert.alert('Delete', `Remove "${initial!.title}"?`, [
    { text: 'Cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await chorePoolService.remove(initial!.id); onClose(); } },
  ]);

  return (
    <View style={s.form}>
      <Text style={s.formLabel}>{editing ? 'Edit Chore' : 'New Pool Chore'}</Text>
      <TextInput
        style={s.input}
        placeholder="Chore title..."
        placeholderTextColor={theme.colors.muted}
        value={title}
        onChangeText={setTitle}
        autoFocus
      />
      <View style={s.pillRow}>
        {(['daily', 'weekly', 'once'] as const).map(r => (
          <TouchableOpacity
            key={r}
            style={[s.pill, recur === r && s.pillActive]}
            onPress={() => { setRecur(r); setPoints(POINTS_PER[r]); }}
          >
            <Text style={[s.pillText, recur === r && s.pillTextActive]}>{r === 'once' ? 'One-time' : r.charAt(0).toUpperCase() + r.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.dueLine}>Point value</Text>
      <View style={s.pillRow}>
        {[5, 10, 15, 20, 50].map(p => (
          <TouchableOpacity key={p} style={[s.pill, points === p && s.pillActive]} onPress={() => setPoints(p)}>
            <Text style={[s.pillText, points === p && s.pillTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {showAssign ? (
        <View style={s.assignBox}>
          <Text style={s.dueLine}>Assign to whom?</Text>
          <View style={s.pillRow}>
            {buddies.length === 0 && <Text style={s.pillText}>No buddies yet — invite one first.</Text>}
            {buddies.map(b => (
              <TouchableOpacity key={b.uid} style={s.pill} onPress={() => saveAndAssign(b.uid)}>
                <Text style={s.pillText}>{b.avatar || '👤'} {b.displayName}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.pill, { marginLeft: 'auto', opacity: 0.5 }]} onPress={() => setShowAssign(false)}>
              <Text style={s.pillText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.primaryBtn, !title.trim() && s.btnDisabled]} disabled={!title.trim()} onPress={save}>
            <Text style={s.primaryBtnText}>{editing ? 'Save' : 'Store'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.altBtn, !title.trim() && s.btnDisabled]} disabled={!title.trim()} onPress={() => setShowAssign(true)}>
            <Text style={s.altBtnText}>{editing ? 'Save & Assign' : 'Store & Assign'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {editing && (
        <TouchableOpacity onPress={del} style={{ marginTop: 8 }}>
          <Text style={s.delLink}>Delete chore</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  intro: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, marginBottom: 12 },
  introText: { color: '#c5cae9', fontSize: 13, lineHeight: 20 },
  introBold: { color: theme.colors.accent, fontWeight: '900' },
  addBtn: { padding: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.accent, borderRadius: theme.radius.xl, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: theme.colors.accent, fontWeight: '900', fontSize: 14 },
  empty: { textAlign: 'center', color: theme.colors.muted, fontStyle: 'italic', padding: 30 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, marginBottom: 8 },
  cardActive: { borderColor: theme.colors.accent, backgroundColor: '#1e1c10' },
  statusIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  starText: { color: theme.colors.accent, fontWeight: '900', fontSize: 16 },
  cardTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 15, marginBottom: 3 },
  cardMeta: { color: theme.colors.muted, fontSize: 12 },
  delBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.cardBorder },
  delBtnText: { fontSize: 14 },
  chevron: { color: theme.colors.muted, fontSize: 18 },
  form: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xl, padding: 14, marginBottom: 12 },
  formLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: theme.colors.bg, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.md, padding: 12, fontSize: 15, marginBottom: 10 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.cardBorder },
  pillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pillText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
  pillTextActive: { color: '#000' },
  dueLine: { color: theme.colors.muted, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryBtn: { flex: 1, backgroundColor: theme.colors.accent, padding: 12, borderRadius: theme.radius.md, alignItems: 'center' },
  primaryBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  altBtn: { flex: 1, backgroundColor: theme.colors.cardBorder, padding: 12, borderRadius: theme.radius.md, alignItems: 'center' },
  altBtnText: { color: theme.colors.accent, fontWeight: '900', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  assignBox: { marginTop: 10, padding: 10, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.md },
  delLink: { color: theme.colors.danger, fontWeight: '700', fontSize: 13, textAlign: 'center', padding: 10 },
});
