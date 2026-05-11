import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { chorePoints, isOverdue, buddyLabel } from '../../utils/buddy';
import { choreService } from '../../services/choreService';
import Header from '../../components/Header';

export default function BuddyChoresScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { chores } = useChores();
  const { buddies } = useBuddies();
  const my = chores.filter(c => c.assignedTo === buddyUid).sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const openReject = (id: string) => { setRejectingId(id); setRejectionNote(''); };
  const closeReject = () => { setRejectingId(null); setRejectionNote(''); };
  const submitReject = () => {
    if (!rejectingId) return;
    const note = rejectionNote.trim();
    if (!note) return;
    choreService.update(rejectingId, { status: 'rejected', rejectionNote: note });
    closeReject();
  };

  const renderStatus = (st: string) => {
    if (st === 'pending') return <Text style={[s.statusPill, { backgroundColor: '#f59e0b33', color: '#f59e0b' }]}>Pending</Text>;
    if (st === 'approved') return <Text style={[s.statusPill, { backgroundColor: '#22c55e33', color: '#22c55e' }]}>Done</Text>;
    if (st === 'rejected') return <Text style={[s.statusPill, { backgroundColor: '#ef444433', color: '#ef4444' }]}>Redo</Text>;
    return <Text style={[s.statusPill, { backgroundColor: '#7b84a833', color: theme.colors.muted }]}>Todo</Text>;
  };

  return (
    <SafeAreaView style={s.root}>
      <Header title={`${buddyLabel(buddyUid, buddies)} · Chores`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        {my.length === 0 ? (
          <Text style={s.empty}>No chores assigned.</Text>
        ) : my.map(c => (
          <View key={c.id} style={[s.card, isOverdue(c) && { borderColor: theme.colors.danger + '80' }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{c.title}</Text>
              <Text style={s.meta}>+{chorePoints(c)} pts · {c.recurrence}{isOverdue(c) ? ' · ⚠ Overdue' : ''}</Text>
            </View>
            {renderStatus(c.status)}
            {c.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
                <TouchableOpacity style={s.approve} onPress={() => choreService.update(c.id, { status: 'approved', completedAt: Date.now() })}>
                  <Text style={s.approveText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.reject} onPress={() => openReject(c.id)}>
                  <Text style={s.rejectText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={rejectingId !== null} transparent animationType="fade" onRequestClose={closeReject}>
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Reject chore</Text>
            <Text style={s.modalSubtitle}>Tell your buddy why so they can fix it.</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Why? e.g. 'You missed the corners'"
              placeholderTextColor={theme.colors.muted}
              value={rejectionNote}
              onChangeText={setRejectionNote}
              multiline
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, s.modalCancel]} onPress={closeReject}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalSubmit, !rejectionNote.trim() && { opacity: 0.5 }]}
                onPress={submitReject}
                disabled={!rejectionNote.trim()}
              >
                <Text style={s.modalSubmitText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  empty: { color: theme.colors.muted, textAlign: 'center', padding: 30, fontStyle: 'italic' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, marginBottom: 8 },
  title: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  meta: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  statusPill: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  approve: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  reject: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  rejectText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.cardBorder, padding: theme.spacing.lg },
  modalTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 18, marginBottom: 4 },
  modalSubtitle: { color: theme.colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 12 },
  modalInput: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, color: theme.colors.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.lg },
  modalCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.cardBorder },
  modalCancelText: { color: theme.colors.text, fontWeight: '900', fontSize: 13 },
  modalSubmit: { backgroundColor: theme.colors.danger },
  modalSubmitText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
