import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { chorePoints, isOverdue, buddyLabel } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { choreService } from '../../services/choreService';
import { Header, Screen, Card, Text, WeekNavigator, SCREEN_BOTTOM_PAD } from '../../components';

export default function BuddyChoresScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { chores } = useChores();
  const { buddies } = useBuddies();
  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeek());
  const my = chores
    .filter(c => c.assignedTo === buddyUid)
    .filter(c => {
      // weekly/daily chores carry forward — visible from creation onward.
      // one-time chores show only on their specific week.
      if (c.recurrence === 'weekly' || c.recurrence === 'daily') {
        return (c.weekOf || '') <= selectedWeek;
      }
      return c.weekOf === selectedWeek;
    })
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

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
    if (st === 'pending') return <RNText style={[s.statusPill, { backgroundColor: '#f59e0b33', color: '#f59e0b' }]}>Pending</RNText>;
    if (st === 'approved') return <RNText style={[s.statusPill, { backgroundColor: '#22c55e33', color: '#22c55e' }]}>Done</RNText>;
    if (st === 'rejected') return <RNText style={[s.statusPill, { backgroundColor: '#ef444433', color: '#ef4444' }]}>Redo</RNText>;
    return <RNText style={[s.statusPill, { backgroundColor: '#7b84a833', color: theme.colors.muted }]}>Todo</RNText>;
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${buddyLabel(buddyUid, buddies)} · Chores`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <WeekNavigator weekOf={selectedWeek} onChange={setSelectedWeek} />
        {my.length === 0 ? (
          <Text variant="empty">No chores this week.</Text>
        ) : my.map(c => (
          <Card key={c.id} row variant={isOverdue(c) ? 'warning' : 'default'} radius={theme.radius.lg} style={{ gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 14 }}>{c.title}</Text>
              <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                +{chorePoints(c)} pts · {c.recurrence}{isOverdue(c) ? ' · ⚠ Overdue' : ''}
              </Text>
            </View>
            {renderStatus(c.status)}
            {c.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
                <TouchableOpacity style={s.approve} onPress={() => choreService.update(c.id, { status: 'approved', completedAt: Date.now() })}>
                  <RNText style={s.iconText}>✓</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={s.reject} onPress={() => openReject(c.id)}>
                  <RNText style={s.iconText}>✕</RNText>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      <Modal visible={rejectingId !== null} transparent animationType="fade" onRequestClose={closeReject}>
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalCard}>
            <Text variant="h2" style={{ fontSize: 18, marginBottom: 4 }}>Reject chore</Text>
            <Text variant="meta" style={{ marginBottom: 12 }}>Tell your buddy why so they can fix it.</Text>
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
                <RNText style={s.modalCancelText}>Cancel</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalSubmit, !rejectionNote.trim() && { opacity: 0.5 }]}
                onPress={submitReject}
                disabled={!rejectionNote.trim()}
              >
                <RNText style={s.modalSubmitText}>Reject</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  statusPill: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  approve: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  reject: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.cardBorder, padding: theme.spacing.lg },
  modalInput: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, color: theme.colors.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.lg },
  modalCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.cardBorder },
  modalCancelText: { color: theme.colors.text, fontWeight: '900', fontSize: 13 },
  modalSubmit: { backgroundColor: theme.colors.danger },
  modalSubmitText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
