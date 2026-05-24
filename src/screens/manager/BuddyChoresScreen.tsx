import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ToastAndroid, Pressable, Text as RNText } from 'react-native';
import { useChores } from '../../hooks/useChores';
import { useBuddies } from '../../hooks/useBuddies';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { theme } from '../../theme';
import { chorePoints, isOverdue, buddyLabel } from '../../utils/buddy';
import { statusLabel, statusPillStyle } from '../../utils/choreStatus';
import { currentWeek } from '../../utils/week';
import { choreService } from '../../services/choreService';
import { Chore } from '../../types';
import { Header, Screen, Text, WeekNavigator, useConfirm, FAB, ChoreFormSheet, SCREEN_BOTTOM_PAD } from '../../components';

type ChoreTab = 'pending' | 'todo' | 'done';

export default function BuddyChoresScreen({ route, navigation }: any) {
  const buddyUid: string = route.params?.kidId || '';
  const { chores } = useChores();
  const { buddies } = useBuddies();
  const { members } = useFamilyMembers();
  const { fbUser } = useCurrentUser();
  const myUid = fbUser?.uid;
  const viewingSelf = buddyUid === myUid;
  const assignerName = (uid?: string) =>
    uid ? (members.find(m => m.uid === uid)?.displayName || 'someone') : 'someone';
  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeek());
  const initialTabParam = route.params?.tab;
  const initialTab: ChoreTab =
    initialTabParam === 'todo' || initialTabParam === 'done' || initialTabParam === 'pending'
      ? initialTabParam
      : 'pending';
  const [tab, setTab] = useState<ChoreTab>(initialTab);

  const inScope = chores
    .filter(c => c.assignedTo === buddyUid)
    .filter(c => {
      if (c.recurrence === 'weekly' || c.recurrence === 'daily') {
        return (c.weekOf || '') <= selectedWeek;
      }
      return c.weekOf === selectedWeek;
    });

  const pendingCount = inScope.filter(c => c.status === 'pending').length;
  const todoCount = inScope.filter(c => c.status === 'todo' || c.status === 'rejected').length;

  const tabChores = inScope
    .filter(c => {
      if (tab === 'pending') return c.status === 'pending';
      if (tab === 'done') return c.status === 'approved';
      return c.status === 'todo' || c.status === 'rejected';
    })
    .sort((a, b) => {
      // overdue first within todo tab; otherwise by dueDate
      const aOver = (a.dueDate || 0) < Date.now() ? 0 : 1;
      const bOver = (b.dueDate || 0) < Date.now() ? 0 : 1;
      const r = aOver - bOver;
      return r !== 0 ? r : (a.dueDate || 0) - (b.dueDate || 0);
    });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [addChoreOpen, setAddChoreOpen] = useState(false);
  const confirm = useConfirm();

  const onDelete = async (c: any) => {
    const ok = await confirm({
      title: 'Delete chore?',
      message: `"${c.title}" will be removed.`,
      confirmLabel: 'Delete',
      confirmDestructive: true,
    });
    if (!ok) return;
    try {
      await choreService.remove(c.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Removed "${c.title}"`, ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const openReject = (id: string) => { setRejectingId(id); setRejectionNote(''); };
  const closeReject = () => { setRejectingId(null); setRejectionNote(''); };
  const submitReject = () => {
    if (!rejectingId) return;
    const note = rejectionNote.trim();
    if (!note) return;
    const choreTitle = chores.find(c => c.id === rejectingId)?.title || 'chore';
    choreService.update(rejectingId, { status: 'rejected', rejectionNote: note });
    if (Platform.OS === 'android') {
      ToastAndroid.show(`✗ Rejected "${choreTitle}"`, ToastAndroid.SHORT);
    }
    closeReject();
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${buddyLabel(buddyUid, buddies)} · Chores`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <WeekNavigator weekOf={selectedWeek} onChange={setSelectedWeek} />

        <View style={s.tabRow}>
          {(() => {
            const tabs = [
              { key: 'pending' as const, label: 'Pending', count: pendingCount },
              { key: 'todo' as const, label: 'Todo', count: todoCount },
              { key: 'done' as const, label: 'Done', count: undefined as number | undefined },
            ];
            return tabs.map((t, i) => {
              const active = tab === t.key;
              const isFirst = i === 0;
              const isLast = i === tabs.length - 1;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    s.tabBtn,
                    active && s.tabBtnActive,
                    isFirst && s.tabBtnFirst,
                    isLast && s.tabBtnLast,
                    !isFirst && s.tabBtnNoLeftBorder,
                  ]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <RNText style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</RNText>
                  {t.count !== undefined && t.count > 0 && (
                    <View style={s.tabBadge}>
                      <RNText style={s.tabBadgeText}>{t.count}</RNText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            });
          })()}
        </View>

        {tabChores.length === 0 ? (
          <Text variant="empty" style={{ padding: 40 }}>
            {tab === 'pending' ? 'Nothing waiting for review.' : tab === 'done' ? 'No completed chores yet.' : 'No active chores.'}
          </Text>
        ) : tabChores.map(c => {
          const overdue = isOverdue(c);
          const isDone = c.status === 'approved';
          const onTapCircle = () => {
            if (viewingSelf) {
              // I'm the assignee — submit for review instead of self-approving.
              if (c.status === 'todo' || c.status === 'rejected') {
                choreService.update(c.id, {
                  status: 'pending',
                  completedAt: Date.now(),
                  rejectionNote: '',
                  notifiedAssigner: false,
                  notifiedAssignee: false,
                });
                setTab('pending');
                if (Platform.OS === 'android') {
                  ToastAndroid.show('✓ Sent for approval', ToastAndroid.SHORT);
                }
              }
              // status === 'pending' for self is a no-op (waiting on assigner).
              return;
            }
            // Reviewing someone else's chore — approve directly.
            choreService.update(c.id, {
              status: 'approved',
              completedAt: Date.now(),
              notifiedAssignee: false,
            });
            if (Platform.OS === 'android') {
              ToastAndroid.show(`✓ Approved "${c.title}"`, ToastAndroid.SHORT);
            }
          };
          return (
            <View key={c.id} style={[s.row, overdue && s.rowOverdue]}>
              {isDone ? (
                <View style={[s.checkbox, s.checkboxDone]}>
                  <RNText style={s.checkboxDoneMark}>✓</RNText>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={onTapCircle}
                  hitSlop={8}
                  activeOpacity={0.6}
                  style={[s.checkbox, c.status === 'pending' && s.checkboxPending]}
                />
              )}

              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ fontSize: 14, ...(isDone ? { textDecorationLine: 'line-through' as const } : {}) }}>{c.title}</Text>
                <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                  +{chorePoints(c)} pts · {c.recurrence}{overdue ? ' · ⚠ Overdue' : ''}
                  {c.status === 'pending' ? ' · awaiting your approval' : ''}
                </Text>
                <Text variant="tiny" style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>
                  Assigned by {assignerName(c.createdBy)}
                </Text>
              </View>

              {viewingSelf ? null : c.status === 'pending' ? (
                <TouchableOpacity style={s.reject} onPress={() => openReject(c.id)}>
                  <RNText style={s.iconText}>✕</RNText>
                </TouchableOpacity>
              ) : (
                <Pressable style={s.delBtn} onPress={() => onDelete(c)} hitSlop={10}>
                  <RNText style={{ fontSize: 14 }}>🗑</RNText>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      <FAB onPress={() => setAddChoreOpen(true)} />

      <ChoreFormSheet
        visible={addChoreOpen}
        onClose={() => setAddChoreOpen(false)}
        defaultBuddyUid={buddyUid}
      />

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
  tabRow: { flexDirection: 'row', marginVertical: 12 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  tabBtnFirst: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  tabBtnLast: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  tabBtnNoLeftBorder: { borderLeftWidth: 0 },
  tabBtnActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  tabLabel: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  tabLabelActive: { color: '#fff' },
  tabBadge: {
    minWidth: 20, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 12, marginBottom: 6 },
  rowOverdue: { borderColor: theme.colors.danger, borderWidth: 2, backgroundColor: theme.colors.danger + '10' },
  rowPressed: { opacity: 0.7 },

  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: theme.colors.accent,
    backgroundColor: theme.colors.card,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxPending: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
  },
  checkboxDone: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success,
  },
  checkboxDoneMark: { color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 18 },

  statusPill: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  approve: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  reject: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  delBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: theme.colors.danger + '60', backgroundColor: theme.colors.danger + '15', justifyContent: 'center', alignItems: 'center' },

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
