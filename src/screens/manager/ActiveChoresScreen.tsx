import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Modal, TextInput, Platform, ToastAndroid, Pressable } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useBuddies } from '../../hooks/useBuddies';
import { theme } from '../../theme';
import { chorePoints, isOverdue, POINTS_PER } from '../../utils/buddy';
import { choreService } from '../../services/choreService';
import { Chore, Recurrence } from '../../types';
import Header from '../../components/Header';

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
    <SafeAreaView style={s.root}>
      <Header title="Active Chores" onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        {totalOpen === 0 && (
          <Text style={s.empty}>No active chores. 🎉</Text>
        )}

        {buddies.map(b => {
          const my = openChores.filter(c => c.assignedTo === b.uid).sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
          if (my.length === 0) return null;
          return (
            <View key={b.uid} style={s.group}>
              <TouchableOpacity
                style={s.groupHeader}
                onPress={() => navigation.navigate('BuddyProfile', { kidId: b.uid })}
              >
                <View style={[s.groupAvatar, { backgroundColor: (b.accent || theme.colors.purple) + '40' }]}>
                  <Text style={{ fontSize: 22 }}>{b.avatar || '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupName}>{b.displayName}</Text>
                  <Text style={s.groupCount}>{my.length} open · {my.filter(c => c.status === 'pending').length} pending</Text>
                </View>
                <Text style={s.groupChevron}>›</Text>
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
    </SafeAreaView>
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
        <Text style={s.rowTitle}>{c.title}</Text>
        <Text style={s.rowMeta}>+{chorePoints(c)} pts · {c.recurrence}{overdue ? ' · ⚠ Overdue' : ''}</Text>
        {c.status === 'rejected' && !!c.rejectionNote && (
          <Text style={s.rejectNote}>❌ {c.rejectionNote}</Text>
        )}
      </View>
      {c.status === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
          <TouchableOpacity style={s.approve} onPress={onApprove}>
            <Text style={s.approveText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.reject} onPress={onReject}>
            <Text style={s.rejectText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <Text style={[s.statusPill, statusPillStyle(c.status)]}>{statusLabel(c.status)}</Text>
          <Pressable style={s.iconBtn} onPress={onDelete} hitSlop={10}>
            <Text style={s.iconBtnText}>🗑</Text>
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
      <SafeAreaView style={s.formScreen}>
        <View style={s.formHeader}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={10}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.formHeaderTitle}>Edit Chore</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Title</Text>
          <TextInput
            style={s.bigInput}
            placeholder="What's the chore?"
            placeholderTextColor={theme.colors.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />

          <Text style={s.fieldLabel}>Point value</Text>
          <View style={s.pillRow}>
            {[5, 10, 15, 20, 50].map(p => (
              <TouchableOpacity key={p} style={[s.smallPill, points === p && s.pillActive]} onPress={() => setPoints(p)}>
                <Text style={[s.smallPillText, points === p && s.pillTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLabel}>Assigned to</Text>
          <TouchableOpacity style={s.assignBtn} onPress={() => setPickerOpen(true)}>
            <View style={[s.assignAvatar, { backgroundColor: (currentBuddy?.accent || theme.colors.purple) + '40' }]}>
              <Text style={{ fontSize: 22 }}>{currentBuddy?.avatar || '👤'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.assignName}>{currentBuddy?.displayName || 'Unassigned'}</Text>
              <Text style={s.assignSubtle}>Tap to reassign</Text>
            </View>
            <Text style={s.assignChevron}>›</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.formFooter}>
          <TouchableOpacity
            style={[s.primaryBtnBig, !canSave && s.btnDisabled]}
            disabled={!canSave}
            onPress={save}
          >
            <Text style={s.primaryBtnBigText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={s.deleteFooterBtn}>
            <Text style={s.deleteFooterText}>🗑 Delete chore</Text>
          </TouchableOpacity>
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
            <Text style={s.sheetTitle}>Assign to</Text>
            {buddies.length === 0 ? (
              <Text style={s.assignEmpty}>No buddies yet.</Text>
            ) : (
              buddies.map(b => (
                <TouchableOpacity
                  key={b.uid}
                  style={[s.sheetRow, assignTo === b.uid && s.sheetRowActive]}
                  onPress={() => { setAssignTo(b.uid); setPickerOpen(false); }}
                >
                  <View style={[s.sheetAvatar, { backgroundColor: (b.accent || theme.colors.purple) + '40' }]}>
                    <Text style={{ fontSize: 22 }}>{b.avatar || '👤'}</Text>
                  </View>
                  <Text style={s.sheetRowName}>{b.displayName}</Text>
                  {assignTo === b.uid && <Text style={s.sheetCheck}>✓</Text>}
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
  root: { flex: 1, backgroundColor: theme.colors.bg },
  empty: { color: theme.colors.muted, textAlign: 'center', padding: 40, fontSize: 14, fontWeight: '700' },

  group: { marginBottom: 18 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 6 },
  groupAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  groupName: { color: theme.colors.text, fontWeight: '900', fontSize: 16 },
  groupCount: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  groupChevron: { color: theme.colors.muted, fontSize: 22, fontWeight: '900' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, marginBottom: 6 },
  rowOverdue: { borderColor: theme.colors.danger + '80' },
  rowPressed: { opacity: 0.7 },
  rowTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  rowMeta: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  rejectNote: { color: theme.colors.danger, fontSize: 11, fontWeight: '700', marginTop: 4 },

  statusPill: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  approve: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  reject: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  rejectText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: theme.colors.danger + '60', backgroundColor: theme.colors.danger + '15', justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { fontSize: 14 },

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

  fullCover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.bg, zIndex: 100, elevation: 100 },
  formScreen: { flex: 1, backgroundColor: theme.colors.bg },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  formHeaderTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  fieldLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  bigInput: { backgroundColor: theme.colors.card, color: theme.colors.text, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 16, fontSize: 17, fontWeight: '600' },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card },
  smallPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card, minWidth: 40, alignItems: 'center' },
  smallPillText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
  pillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pillText: { color: theme.colors.muted, fontWeight: '700', fontSize: 14 },
  pillTextActive: { color: '#000' },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12 },
  assignAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  assignName: { color: theme.colors.text, fontWeight: '900', fontSize: 15 },
  assignSubtle: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  assignChevron: { color: theme.colors.muted, fontSize: 22, fontWeight: '900' },
  sheetBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, borderTopWidth: 1, borderColor: theme.colors.cardBorder },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.cardBorder, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.radius.lg, marginBottom: 4 },
  sheetRowActive: { backgroundColor: theme.colors.accent + '15' },
  sheetAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sheetRowName: { color: theme.colors.text, fontWeight: '900', fontSize: 15, flex: 1 },
  sheetCheck: { color: theme.colors.accent, fontWeight: '900', fontSize: 18 },
  buddyPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card },
  buddyPillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  buddyPillText: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  buddyPillTextActive: { color: '#000' },
  assignEmpty: { color: theme.colors.muted, fontStyle: 'italic', fontSize: 13, paddingVertical: 6 },
  formFooter: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder, backgroundColor: theme.colors.bg, gap: 8 },
  primaryBtnBig: { backgroundColor: theme.colors.accent, padding: 16, borderRadius: theme.radius.lg, alignItems: 'center' },
  primaryBtnBigText: { color: '#000', fontWeight: '900', fontSize: 16 },
  btnDisabled: { opacity: 0.4 },
  deleteFooterBtn: { padding: 12, borderRadius: theme.radius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: theme.colors.danger + '80', marginTop: 4 },
  deleteFooterText: { color: theme.colors.danger, fontWeight: '900', fontSize: 14 },
});
