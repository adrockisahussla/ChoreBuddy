import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Platform, ToastAndroid, Pressable, Modal, Text as RNText } from 'react-native';
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
import { Header, Screen, Card, Avatar, Pill, Button, Text, useConfirm, SCREEN_BOTTOM_PAD } from '../../components';

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
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Chore Pool" onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Card padding={14} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22 }}>
            The <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>Chore Pool</Text> is where you store common chores you want to draw from. Add chores to the pool, and assign them to your Buddies from here as well.
          </Text>
        </Card>

        <Button
          label="+ New Chore"
          variant="primary"
          onPress={openNew}
          full
          style={{ marginBottom: 12 }}
        />

        {chorePool.length === 0 ? (
          <Text variant="empty" style={{ padding: 30 }}>Your pool is empty. Tap "+ New Chore" to add one.</Text>
        ) : (
          chorePool.map(p => (
            <Card key={p.id} row radius={theme.radius.lg} padding={0} style={{ paddingRight: 12, gap: 6 }}>
              <TouchableOpacity style={s.cardMain} onPress={() => openEdit(p)}>
                <View style={s.starIcon}><RNText style={s.starText}>★</RNText></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{p.title}</Text>
                  <Text variant="meta">
                    {p.recurrence === 'daily' ? 'Daily' : p.recurrence === 'weekly' ? 'Weekly' : 'One-time'}
                    {' · '}
                    <Text style={{ color: theme.colors.accent, fontWeight: '900' }}>+{p.points} pts</Text>
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => onDelete(p)} hitSlop={12}>
                <RNText style={{ fontSize: 20 }}>🗑</RNText>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {formOpen && (
        <View style={s.fullCover}>
          <PoolFormScreen initial={editing} onClose={close} />
        </View>
      )}
    </Screen>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [onceDate, setOnceDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        editing ? `✓ Updated "${title.trim()}" in pool` : `✓ Saved "${title.trim()}" to pool`,
        ToastAndroid.SHORT,
      );
    }
    onClose();
  };
  const saveAndAssignTo = async (buddyUid: string) => {
    if (!title.trim() || !familyId) return;
    if (editing) await chorePoolService.update(initial!.id, buildPool());
    else await chorePoolService.add(buildPool());
    await choreService.add(buildAssigned(buddyUid));
    if (Platform.OS === 'android') {
      const buddy = buddies.find(b => b.uid === buddyUid);
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

  // Reserved for re-use if a custom date-change handler is needed.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) setOnceDate(selectedDate);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={s.formHeader}>
        <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={10}>
          <RNText style={s.backBtnText}>←</RNText>
        </TouchableOpacity>
        <Text variant="h2" style={{ fontSize: 18 }}>{editing ? 'Edit Chore' : 'New Chore'}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Title</Text>
        <TextInput
          style={[s.bigInput, { minHeight: 56 }]}
          placeholder="What's the chore?"
          placeholderTextColor={theme.colors.muted}
          value={title}
          onChangeText={setTitle}
          autoFocus={!editing}
          maxLength={120}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
        />

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Recurrence</Text>
        <View style={s.pillRow}>
          {(['daily', 'weekly', 'once'] as const).map(r => (
            <Pill
              key={r}
              label={r === 'once' ? 'One-time' : r.charAt(0).toUpperCase() + r.slice(1)}
              active={recur === r}
              onPress={() => {
                setRecur(r);
                setPoints(POINTS_PER[r]);
                if (r !== 'once') setOnceDate(null);
              }}
            />
          ))}
        </View>

        {recur === 'once' && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 16 }}>Due date</Text>
            <TouchableOpacity style={s.fieldBtn} onPress={() => setDateSheetOpen(true)}>
              <RNText style={s.fieldIcon}>📅</RNText>
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ fontSize: 15 }}>
                  {onceDate
                    ? onceDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                    : 'Pick a due date'}
                </Text>
                <Text variant="tiny" style={{ marginTop: 2 }}>
                  {onceDate ? 'Tap to change' : 'Today, tomorrow, weekend, or pick'}
                </Text>
              </View>
              <RNText style={s.fieldChev}>›</RNText>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={onceDate || new Date()}
                mode="date"
                minimumDate={new Date()}
                onChange={(e, sel) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (e.type === 'set' && sel) { setOnceDate(sel); setDateSheetOpen(false); }
                }}
              />
            )}
          </>
        )}

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Point value</Text>
        <View style={s.pillRow}>
          {[5, 10, 15, 20, 50].map(p => (
            <Pill key={p} label={String(p)} size="sm" active={points === p} onPress={() => setPoints(p)} />
          ))}
        </View>

        <View style={s.formFooter}>
          <View style={s.footerRow}>
            <TouchableOpacity
              style={[s.footerBtn, s.footerBtnSecondary, !canSave && s.btnDisabled]}
              disabled={!canSave}
              onPress={savePoolOnly}
            >
              <RNText style={s.footerBtnSecondaryText}>Save</RNText>
              <RNText style={s.footerBtnSubtext}>Pool only</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.footerBtn, s.footerBtnPrimary, (!canSave || buddies.length === 0) && s.btnDisabled]}
              disabled={!canSave || buddies.length === 0}
              onPress={() => setPickerOpen(true)}
            >
              <RNText style={s.footerBtnPrimaryText}>Save & Assign</RNText>
              <RNText style={[s.footerBtnSubtext, { color: '#000', opacity: 0.7 }]}>{buddies.length === 0 ? 'No buddies' : 'Pick a buddy →'}</RNText>
            </TouchableOpacity>
          </View>
          {editing && (
            <Button label="🗑 Delete chore" variant="danger" onPress={del} full style={{ marginTop: 4 }} />
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Date bottom-sheet — chip presets + Custom */}
      <Modal
        visible={dateSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDateSheetOpen(false)}
      >
        <Pressable style={s.sheetBackdrop} onPress={() => setDateSheetOpen(false)}>
          <Pressable style={s.sheetCard} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 12 }}>Pick a date</Text>
            {(() => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
              const dayOfWeek = today.getDay();
              const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
              const thisSat = new Date(today); thisSat.setDate(today.getDate() + daysUntilSat);
              const daysUntilNextMon = ((1 - dayOfWeek + 7) % 7) || 7;
              const nextMon = new Date(today); nextMon.setDate(today.getDate() + daysUntilNextMon + (dayOfWeek === 1 ? 7 : 0));
              const sameDay = (a: Date | null, b: Date) => !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
              const dpresets: { label: string; date: Date }[] = [
                { label: 'Today', date: today },
                { label: 'Tomorrow', date: tomorrow },
                { label: thisSat.toLocaleDateString(undefined, { weekday: 'short' }), date: thisSat },
                { label: 'Next Mon', date: nextMon },
              ];
              const isCustom = onceDate && !dpresets.some(p => sameDay(onceDate, p.date));
              return (
                <View style={s.chipGrid}>
                  {dpresets.map(p => {
                    const active = sameDay(onceDate, p.date);
                    return (
                      <TouchableOpacity
                        key={p.label}
                        style={[s.datePill, active && s.datePillActive]}
                        onPress={() => { setOnceDate(p.date); setDateSheetOpen(false); }}
                      >
                        <RNText style={[s.datePillLabel, active && { color: '#fff' }]}>{p.label}</RNText>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[s.datePill, isCustom && s.datePillActive]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <RNText style={[s.datePillLabel, isCustom && { color: '#fff' }]}>📅 Custom</RNText>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

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
              <Text variant="empty">No buddies yet — invite one first.</Text>
            ) : (
              buddies.map(b => (
                <TouchableOpacity
                  key={b.uid}
                  style={s.sheetRow}
                  onPress={() => { setPickerOpen(false); saveAndAssignTo(b.uid); }}
                >
                  <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="sm" />
                  <Text variant="h3" style={{ fontSize: 15, flex: 1 }}>{b.displayName}</Text>
                  <RNText style={s.sheetCheck}>›</RNText>
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  fullCover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.bg, zIndex: 100, elevation: 100 },
  starIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  starText: { color: theme.colors.accent, fontWeight: '900', fontSize: 16 },
  cardTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 15, marginBottom: 3 },
  delBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.danger + '60', backgroundColor: theme.colors.danger + '15', justifyContent: 'center', alignItems: 'center' },

  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  bigInput: { backgroundColor: theme.colors.card, color: theme.colors.text, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 16, fontSize: 17, fontWeight: '600', marginTop: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  fieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 14, marginTop: 6,
  },
  fieldIcon: { fontSize: 22 },
  fieldChev: { color: theme.colors.muted, fontSize: 22, fontWeight: '700' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Material 3 chip: 32dp tall, 14sp text, single-line, 8dp radius
  datePill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 32,
  },
  datePillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  // M3 chip label: 14sp body-large
  datePillLabel: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
  datePillSub: { color: theme.colors.muted, fontSize: 10, fontWeight: '500', marginTop: 2 },

  sheetBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, borderTopWidth: 1, borderColor: theme.colors.cardBorder },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.cardBorder, alignSelf: 'center', marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.radius.lg, marginBottom: 4 },
  sheetCheck: { color: theme.colors.muted, fontWeight: '900', fontSize: 18 },

  formFooter: { paddingTop: 24, gap: 10 },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerBtn: { flex: 1, padding: 14, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 64 },
  footerBtnPrimary: { backgroundColor: theme.colors.accent },
  footerBtnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 15 },
  footerBtnSecondary: { backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardBorder },
  footerBtnSecondaryText: { color: theme.colors.text, fontWeight: '900', fontSize: 15 },
  footerBtnSubtext: { fontSize: 11, fontWeight: '700', color: theme.colors.muted, marginTop: 2 },
  btnDisabled: { opacity: 0.4 },
});
