import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Modal, TextInput, Platform, ToastAndroid, Pressable, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { chorePoints, isOverdue, POINTS_PER } from '../../utils/buddy';
import { choreService } from '../../services/choreService';
import { Chore, Recurrence } from '../../types';
import { Header, Screen, Card, Avatar, Pill, Button, Text } from '../../components';

export default function ActiveChoresScreen({ navigation }: any) {
  const { chores } = useChores();
  const { buddies } = useBuddies();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [editing, setEditing] = useState<Chore | null>(null);

  const openReject = (id: string) => { setRejectingId(id); setRejectionNote(''); };
  const closeReject = () => { setRejectingId(null); setRejectionNote(''); };
  const submitReject = () => {
    if (!rejectingId) return;
    const note = rejectionNote.trim();
    if (!note) return;
    choreService.update(rejectingId, { status: 'rejected', rejectionNote: note });
    closeReject();
  };

  const onDelete = async (chore: Chore) => {
    try {
      await choreService.remove(chore.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Removed "${chore.title}"`, ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const openChores = chores.filter(c => c.status !== 'approved');
  const totalOpen = openChores.length;

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Active Chores" onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        {totalOpen === 0 && (
          <Text variant="empty" style={{ padding: 40 }}>No active chores. 🎉</Text>
        )}

        {buddies.map(b => {
          const my = openChores.filter(c => c.assignedTo === b.uid).sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
          if (my.length === 0) return null;
          return (
            <View key={b.uid} style={{ marginBottom: 18 }}>
              <TouchableOpacity
                style={s.groupHeader}
                onPress={() => navigation.navigate('BuddyProfile', { kidId: b.uid })}
                activeOpacity={0.7}
              >
                <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 16 }}>{b.displayName}</Text>
                  <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                    {my.length} open · {my.filter(c => c.status === 'pending').length} pending
                  </Text>
                </View>
                <RNText style={s.groupChevron}>›</RNText>
              </TouchableOpacity>

              {my.map(c => (
                <ChoreRow
                  key={c.id}
                  chore={c}
                  onApprove={() => choreService.update(c.id, { status: 'approved', completedAt: Date.now() })}
                  onReject={() => openReject(c.id)}
                  onEdit={() => setEditing(c)}
                  onDelete={() => onDelete(c)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={rejectingId !== null} transparent animationType="fade" onRequestClose={closeReject}>
        <View style={s.modalBackdrop}>
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
        </View>
      </Modal>

      {editing && (
        <EditChoreModal
          chore={editing}
          buddies={buddies}
          onClose={() => setEditing(null)}
          onDelete={() => { onDelete(editing); setEditing(null); }}
        />
      )}
    </Screen>
  );
}

interface ChoreRowProps {
  chore: Chore;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ChoreRow({ chore: c, onApprove, onReject, onEdit, onDelete }: ChoreRowProps) {
  const overdue = isOverdue(c);
  return (
    <Pressable
      onPress={c.status === 'pending' ? undefined : onEdit}
      style={({ pressed }) => [s.row, overdue && s.rowOverdue, pressed && s.rowPressed]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="h3" style={{ fontSize: 14 }}>{c.title}</Text>
        <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
          +{chorePoints(c)} pts · {c.recurrence}{overdue ? ' · ⚠ Overdue' : ''}
        </Text>
        {c.status === 'rejected' && !!c.rejectionNote && (
          <Text style={s.rejectNote}>❌ {c.rejectionNote}</Text>
        )}
      </View>
      {c.status === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
          <TouchableOpacity style={s.approve} onPress={onApprove}>
            <RNText style={s.iconText}>✓</RNText>
          </TouchableOpacity>
          <TouchableOpacity style={s.reject} onPress={onReject}>
            <RNText style={s.iconText}>✕</RNText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <RNText style={[s.statusPill, statusPillStyle(c.status)]}>{statusLabel(c.status)}</RNText>
          <Pressable style={s.trashBtn} onPress={onDelete} hitSlop={10}>
            <RNText style={{ fontSize: 14 }}>🗑</RNText>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

interface EditModalProps {
  chore: Chore;
  buddies: Array<{ uid: string; displayName: string; avatar?: string; accent?: string }>;
  onClose: () => void;
  onDelete: () => void;
}

function EditChoreModal({ chore, buddies, onClose, onDelete }: EditModalProps) {
  const [title, setTitle] = useState(chore.title);
  const [points, setPoints] = useState<number>(chore.points ?? POINTS_PER[chore.recurrence as Recurrence] ?? 10);
  const [assignTo, setAssignTo] = useState<string>(chore.assignedTo);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canSave = !!title.trim();
  const save = async () => {
    if (!canSave) return;
    await choreService.update(chore.id, {
      title: title.trim(),
      points,
      assignedTo: assignTo,
    });
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Saved "${title.trim()}"`, ToastAndroid.SHORT);
    }
    onClose();
  };

  const currentBuddy = buddies.find(b => b.uid === assignTo);

  return (
    <View style={s.fullCover}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <View style={s.formHeader}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={10}>
            <RNText style={s.backBtnText}>←</RNText>
          </TouchableOpacity>
          <Text variant="h2" style={{ fontSize: 18 }}>Edit Chore</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Title</Text>
          <TextInput
            style={s.bigInput}
            placeholder="What's the chore?"
            placeholderTextColor={theme.colors.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Point value</Text>
          <View style={s.pillRow}>
            {[5, 10, 15, 20, 50].map(p => (
              <Pill
                key={p}
                label={String(p)}
                size="sm"
                active={points === p}
                onPress={() => setPoints(p)}
              />
            ))}
          </View>

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Assigned to</Text>
          <Card row onPress={() => setPickerOpen(true)} radius={theme.radius.lg} style={{ gap: 12, marginBottom: 0 }}>
            <Avatar emoji={currentBuddy?.avatar || '👤'} accent={currentBuddy?.accent} size="sm" />
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 15 }}>{currentBuddy?.displayName || 'Unassigned'}</Text>
              <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>Tap to reassign</Text>
            </View>
            <RNText style={s.chevron}>›</RNText>
          </Card>
        </ScrollView>

        <View style={s.formFooter}>
          <Button label="Save" variant="primary" onPress={save} disabled={!canSave} full />
          <Button label="🗑 Delete chore" variant="danger" onPress={onDelete} full style={{ marginTop: 4 }} />
        </View>
      </SafeAreaView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={s.sheetBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={s.sheetCard} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 12 }}>Assign to</Text>
            {buddies.length === 0 ? (
              <Text variant="empty">No buddies yet.</Text>
            ) : (
              buddies.map(b => (
                <TouchableOpacity
                  key={b.uid}
                  style={[s.sheetRow, assignTo === b.uid && s.sheetRowActive]}
                  onPress={() => { setAssignTo(b.uid); setPickerOpen(false); }}
                >
                  <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="sm" />
                  <Text variant="h3" style={{ fontSize: 15, flex: 1 }}>{b.displayName}</Text>
                  {assignTo === b.uid && <RNText style={s.sheetCheck}>✓</RNText>}
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function statusLabel(status: string): string {
  if (status === 'rejected') return 'Redo';
  if (status === 'todo') return 'Todo';
  if (status === 'pending') return 'Pending';
  if (status === 'approved') return 'Done';
  return status;
}

function statusPillStyle(status: string) {
  if (status === 'rejected') return { backgroundColor: '#ef444433', color: '#ef4444' };
  if (status === 'pending') return { backgroundColor: '#f59e0b33', color: '#f59e0b' };
  return { backgroundColor: '#7b84a833', color: theme.colors.muted };
}

const s = StyleSheet.create({
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 6 },
  groupChevron: { color: theme.colors.muted, fontSize: 22, fontWeight: '900' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, marginBottom: 6 },
  rowOverdue: { borderColor: theme.colors.danger + '80' },
  rowPressed: { opacity: 0.7 },
  rejectNote: { color: theme.colors.danger, fontSize: 11, fontWeight: '700', marginTop: 4 },

  statusPill: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  approve: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  reject: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  trashBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: theme.colors.danger + '60', backgroundColor: theme.colors.danger + '15', justifyContent: 'center', alignItems: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.cardBorder, padding: theme.spacing.lg },
  modalInput: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, color: theme.colors.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.lg },
  modalCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.cardBorder },
  modalCancelText: { color: theme.colors.text, fontWeight: '900', fontSize: 13 },
  modalSubmit: { backgroundColor: theme.colors.danger },
  modalSubmitText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  fullCover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.bg, zIndex: 100, elevation: 100 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  bigInput: { backgroundColor: theme.colors.card, color: theme.colors.text, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 16, fontSize: 17, fontWeight: '600', marginTop: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  chevron: { color: theme.colors.muted, fontSize: 22, fontWeight: '900' },
  sheetBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, borderTopWidth: 1, borderColor: theme.colors.cardBorder },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.cardBorder, alignSelf: 'center', marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.radius.lg, marginBottom: 4 },
  sheetRowActive: { backgroundColor: theme.colors.accent + '15' },
  sheetCheck: { color: theme.colors.accent, fontWeight: '900', fontSize: 18 },
  formFooter: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder, backgroundColor: theme.colors.bg, gap: 8 },
});
