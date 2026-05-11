import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Platform, ToastAndroid, Pressable, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ChorePoolItem, Recurrence } from '../../types';
import { theme } from '../../theme';
import { POINTS_PER } from '../../utils/buddy';
import { useChorePool } from '../../hooks/useChorePool';
import { useBuddies } from '../../hooks/useBuddies';
import { useFamilyId } from '../../hooks/useFamilyId';
import { chorePoolService } from '../../services/chorePoolService';
import { choreService, getEndOfWeek, getWeekOf } from '../../services/choreService';
import Header from '../../components/Header';
import { useConfirm } from '../../components/ConfirmModal';

export default function ChorePoolScreen({ navigation }: any) {
  const { chorePool } = useChorePool();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChorePoolItem | null>(null);
  const confirm = useConfirm();

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item: ChorePoolItem) => { setEditing(item); setFormOpen(true); };
  const close = () => { setFormOpen(false); setEditing(null); };

  const onDelete = async (item: ChorePoolItem) => {
    const ok = await confirm({
      title: 'Delete chore?',
      message: `"${item.title}" will be removed from your Chore Pool.`,
      confirmLabel: 'Delete',
      confirmDestructive: true,
    });
    if (!ok) return;
    try {
      await chorePoolService.remove(item.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Removed "${item.title}"`, ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <Header title="Chore Pool" onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={s.intro}>
          <Text style={s.introText}>
            The <Text style={s.introBold}>Chore Pool</Text> is where you store common chores you want to draw from. Add chores to the pool, and assign them to your Buddies from here as well.
          </Text>
        </View>

        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Text style={s.addBtnText}>+ New Chore</Text>
        </TouchableOpacity>

        {chorePool.length === 0 ? (
          <Text style={s.empty}>Your pool is empty. Tap "+ New Chore" to add one.</Text>
        ) : (
          chorePool.map(p => (
            <View key={p.id} style={s.card}>
              <TouchableOpacity style={s.cardMain} onPress={() => openEdit(p)}>
                <View style={s.statusIcon}><Text style={s.starText}>★</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{p.title}</Text>
                  <Text style={s.cardMeta}>
                    {p.recurrence === 'daily' ? 'Daily' : p.recurrence === 'weekly' ? 'Weekly' : 'One-time'} · <Text style={{ color: theme.colors.accent, fontWeight: '900' }}>+{p.points} pts</Text>
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.delBtn}
                onPress={() => onDelete(p)}
                hitSlop={12}
              >
                <Text style={s.delBtnText}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {formOpen && (
        <View style={s.fullCover}>
          <PoolFormScreen initial={editing} onClose={close} />
        </View>
      )}
    </SafeAreaView>
  );
}

interface FormProps {
  initial: ChorePoolItem | null;
  onClose: () => void;
}

function PoolFormScreen({ initial, onClose }: FormProps) {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title || '');
  const [recur, setRecur] = useState<Recurrence>(initial?.recurrence || 'weekly');
  const [points, setPoints] = useState<number>(initial?.points ?? POINTS_PER.weekly);
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [onceDate, setOnceDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { buddies } = useBuddies();
  const familyId = useFamilyId();
  const currentBuddy = buddies.find(b => b.uid === assignTo);

  const buildPool = (): Omit<ChorePoolItem, 'id' | 'createdAt'> => ({
    familyId: familyId || '',
    title: title.trim(),
    recurrence: recur,
    points,
  });
  const buildAssigned = (buddyUid: string) => {
    const dueDate = recur === 'daily'
      ? (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })()
      : recur === 'once'
        ? (() => { const d = new Date(onceDate!); d.setHours(23, 59, 59, 999); return d.getTime(); })()
        : getEndOfWeek(new Date());
    return {
      familyId: familyId || '',
      title: title.trim(), assignedTo: buddyUid, status: 'todo' as const, rejectionNote: '',
      recurrence: recur, dueDate, weekOf: getWeekOf(new Date(dueDate)),
      points, completedAt: 0, overdue: false,
    };
  };
  const savePoolOnly = async () => {
    if (!title.trim() || !familyId) return;
    if (editing) await chorePoolService.update(initial!.id, buildPool());
    else await chorePoolService.add(buildPool());
    onClose();
  };
  const saveAndAssign = async () => {
    if (!title.trim() || !familyId || !assignTo) return;
    if (editing) await chorePoolService.update(initial!.id, buildPool());
    else await chorePoolService.add(buildPool());
    await choreService.add(buildAssigned(assignTo));
    if (Platform.OS === 'android') {
      const buddy = buddies.find(b => b.uid === assignTo);
      ToastAndroid.show(`✓ Assigned "${title.trim()}" to ${buddy?.displayName ?? 'buddy'}`, ToastAndroid.SHORT);
    }
    onClose();
  };
  const del = async () => {
    if (!editing) return;
    try {
      await chorePoolService.remove(initial!.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Removed "${initial!.title}"`, ToastAndroid.SHORT);
      }
      onClose();
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const canSave = !!title.trim() && (recur !== 'once' || !!onceDate);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) setOnceDate(selectedDate);
  };

  return (
    <SafeAreaView style={s.formScreen}>
      <View style={s.formHeader}>
        <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={10}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.formHeaderTitle}>{editing ? 'Edit Chore' : 'New Chore'}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.formBody}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Text style={s.fieldLabel}>Title</Text>
        <TextInput
          style={s.bigInput}
          placeholder="What's the chore?"
          placeholderTextColor={theme.colors.muted}
          value={title}
          onChangeText={setTitle}
          autoFocus={!editing}
          maxLength={60}
        />

        <Text style={s.fieldLabel}>Recurrence</Text>
        <View style={s.pillRow}>
          {(['daily', 'weekly', 'once'] as const).map(r => (
            <TouchableOpacity
              key={r}
              style={[s.pill, recur === r && s.pillActive]}
              onPress={() => {
                setRecur(r);
                setPoints(POINTS_PER[r]);
                if (r !== 'once') setOnceDate(null);
              }}
            >
              <Text style={[s.pillText, recur === r && s.pillTextActive]}>{r === 'once' ? 'One-time' : r.charAt(0).toUpperCase() + r.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {recur === 'once' && (
          <>
            <Text style={s.fieldLabel}>Due date</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={[s.dateBtnText, !onceDate && s.dateBtnPlaceholder]}>
                {onceDate ? onceDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Tap to choose a date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={onceDate || new Date()}
                mode="date"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}
          </>
        )}

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
          {currentBuddy ? (
            <>
              <View style={[s.assignAvatar, { backgroundColor: (currentBuddy.accent || theme.colors.purple) + '40' }]}>
                <Text style={{ fontSize: 22 }}>{currentBuddy.avatar || '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.assignName}>{currentBuddy.displayName}</Text>
                <Text style={s.assignSubtle}>Tap to change</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[s.assignAvatar, { backgroundColor: theme.colors.bg }]}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.assignName}>No one (save to pool only)</Text>
                <Text style={s.assignSubtle}>Tap to assign a buddy</Text>
              </View>
            </>
          )}
          <Text style={s.assignChevron}>›</Text>
        </TouchableOpacity>

      </KeyboardAwareScrollView>

      <View style={s.formFooter}>
        {assignTo ? (
          <>
            <TouchableOpacity
              style={[s.primaryBtnBig, !canSave && s.btnDisabled]}
              disabled={!canSave}
              onPress={saveAndAssign}
            >
              <Text style={s.primaryBtnBigText}>Save & Assign</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.secondaryBtn, !canSave && s.btnDisabled]}
              disabled={!canSave}
              onPress={savePoolOnly}
            >
              <Text style={s.secondaryBtnText}>Save to Pool only (don't assign)</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[s.primaryBtnBig, !canSave && s.btnDisabled]}
            disabled={!canSave}
            onPress={savePoolOnly}
          >
            <Text style={s.primaryBtnBigText}>Save to Pool</Text>
          </TouchableOpacity>
        )}
        {editing && (
          <TouchableOpacity onPress={del} style={s.deleteFooterBtn}>
            <Text style={s.deleteFooterText}>🗑 Delete chore</Text>
          </TouchableOpacity>
        )}
      </View>

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
              <Text style={s.assignEmpty}>No buddies yet — invite one first.</Text>
            ) : (
              <>
                <TouchableOpacity
                  style={[s.sheetRow, !assignTo && s.sheetRowActive]}
                  onPress={() => { setAssignTo(null); setPickerOpen(false); }}
                >
                  <View style={[s.sheetAvatar, { backgroundColor: theme.colors.bg }]}>
                    <Text style={{ fontSize: 22 }}>—</Text>
                  </View>
                  <Text style={s.sheetRowName}>No one (pool only)</Text>
                  {!assignTo && <Text style={s.sheetCheck}>✓</Text>}
                </TouchableOpacity>
                {buddies.map(b => (
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
                ))}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, paddingRight: 12, marginBottom: 8 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  fullCover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.bg, zIndex: 100, elevation: 100 },
  statusIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  starText: { color: theme.colors.accent, fontWeight: '900', fontSize: 16 },
  cardTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 15, marginBottom: 3 },
  cardMeta: { color: theme.colors.muted, fontSize: 12 },
  delBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.danger + '60', backgroundColor: theme.colors.danger + '15', justifyContent: 'center', alignItems: 'center' },
  delBtnPressed: { backgroundColor: theme.colors.danger + '40' },
  delBtnText: { fontSize: 20 },
  chevron: { color: theme.colors.muted, fontSize: 18, paddingRight: 4 },

  formScreen: { flex: 1, backgroundColor: theme.colors.bg },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  formHeaderTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  formBody: { padding: 20, paddingBottom: 40 },
  fieldLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  bigInput: { backgroundColor: theme.colors.card, color: theme.colors.text, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 16, fontSize: 17, fontWeight: '600' },
  dateBtn: { backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 16 },
  dateBtnText: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  dateBtnPlaceholder: { color: theme.colors.muted, fontWeight: '500' },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card },
  smallPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card, minWidth: 40, alignItems: 'center' },
  smallPillText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
  pillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pillText: { color: theme.colors.muted, fontWeight: '700', fontSize: 14 },
  pillTextActive: { color: '#000' },
  buddyPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card },
  buddyPillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  buddyPillText: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  buddyPillTextActive: { color: '#000' },
  assignEmpty: { color: theme.colors.muted, fontStyle: 'italic', fontSize: 13, paddingVertical: 6 },
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

  formFooter: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder, backgroundColor: theme.colors.bg, gap: 8 },
  primaryBtnBig: { backgroundColor: theme.colors.accent, padding: 16, borderRadius: theme.radius.lg, alignItems: 'center' },
  primaryBtnBigText: { color: '#000', fontWeight: '900', fontSize: 16 },
  secondaryBtn: { padding: 12, borderRadius: theme.radius.lg, alignItems: 'center' },
  secondaryBtnText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.4 },
  delLink: { color: theme.colors.danger, fontWeight: '700', fontSize: 13, textAlign: 'center', padding: 10 },
  deleteFooterBtn: { padding: 12, borderRadius: theme.radius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: theme.colors.danger + '80', marginTop: 4 },
  deleteFooterText: { color: theme.colors.danger, fontWeight: '900', fontSize: 14 },
});
