import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, SafeAreaView, Platform, ToastAndroid, Pressable, Text as RNText } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { Recurrence, Reminder, User } from '../types';
import { reminderService } from '../services/reminderService';
import { useBuddies } from '../hooks/useBuddies';
import { useFamilyId } from '../hooks/useFamilyId';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getWeekOf } from '../utils/week';
import { scheduleReminderNotification, cancelReminderNotification } from '../services/notificationService';
import Pill from './Pill';
import Button from './Button';
import Text from './Text';
import Avatar from './Avatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Pre-select this buddy in the assign-to picker. */
  defaultBuddyUid?: string;
  /** When provided, the form is in EDIT mode for an existing reminder. */
  reminder?: Reminder;
}

/**
 * NewReminderForm: full-screen modal that creates or edits a reminder.
 * Mirrors the chore-create UX (recurrence pills, date chips, assign-to
 * sheet) minus point value, plus a time picker so the parent picks
 * exactly when the alert fires.
 */
export default function NewReminderForm({ visible, onClose, defaultBuddyUid, reminder }: Props) {
  const isEdit = !!reminder;
  const { buddies } = useBuddies();
  const familyId = useFamilyId();
  const { fbUser } = useCurrentUser();

  const [title, setTitle] = useState('');
  const [recur, setRecur] = useState<Recurrence>('once');
  const [onceDate, setOnceDate] = useState<Date | null>(null);
  const [time, setTime] = useState<{ h: number; m: number } | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hydrate on open
  useEffect(() => {
    if (!visible) return;
    if (reminder) {
      setTitle(reminder.title);
      setRecur(reminder.recurrence || 'once');
      setOnceDate(reminder.date ? new Date(reminder.date + 'T00:00:00') : null);
      if (reminder.time) {
        const [h, m] = reminder.time.split(':').map(Number);
        setTime({ h, m });
      } else {
        setTime(null);
      }
      setAllDay(!!reminder.allDay);
      setAssignTo(reminder.assignedTo);
      setNotes(reminder.notes || '');
    } else {
      setTitle('');
      setRecur('once');
      setOnceDate(null);
      setTime({ h: 9, m: 0 });
      setAllDay(false);
      setAssignTo(defaultBuddyUid || null);
      setNotes('');
    }
    setLoading(false);
  }, [visible, reminder, defaultBuddyUid]);

  const currentBuddy = buddies.find(b => b.uid === assignTo);

  const canSave =
    !!title.trim() &&
    !!familyId &&
    !!assignTo &&
    (recur !== 'once' || !!onceDate) &&
    (allDay || !!time) &&
    !loading;

  /** Compute the dueDate epoch ms from the form state. */
  const computeDueDate = (): number => {
    let d: Date;
    if (recur === 'once' && onceDate) {
      d = new Date(onceDate);
    } else {
      // For daily/weekly, the "next" fire is today (if time hasn't passed)
      // or tomorrow (if it has). Daily/weekly recurring reminders re-arm on
      // a separate sweep — here we just pick a sensible first-fire timestamp.
      d = new Date();
    }
    if (allDay) {
      d.setHours(9, 0, 0, 0); // 9am default for all-day
    } else if (time) {
      d.setHours(time.h, time.m, 0, 0);
    }
    return d.getTime();
  };

  const formatTime12h = (h: number, m: number): string => {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const submit = async () => {
    if (!canSave || !familyId || !assignTo) return;
    setLoading(true);
    try {
      const dueDate = computeDueDate();
      const dateStr = new Date(dueDate).toLocaleDateString('en-CA');
      const timeStr = allDay || !time ? '' : `${String(time!.h).padStart(2, '0')}:${String(time!.m).padStart(2, '0')}`;

      const data: Omit<Reminder, 'id' | 'createdAt'> = {
        familyId,
        title: title.trim(),
        assignedTo,
        date: dateStr,
        time: timeStr,
        allDay,
        recurrence: recur,
        dueDate,
        weekOf: getWeekOf(new Date(dueDate)),
        notes: notes.trim(),
        createdBy: fbUser?.uid || '',
      };

      let docId: string;
      if (isEdit && reminder) {
        await reminderService.update(reminder.id, data);
        docId = reminder.id;
        // Re-schedule the notification (cancel old, schedule new)
        if (reminder.notificationId) {
          await cancelReminderNotification(reminder.notificationId);
        }
      } else {
        const ref = await reminderService.add(data);
        docId = ref.id;
      }

      // Schedule the local notification for the new dueDate
      const notificationId = await scheduleReminderNotification({
        reminderId: docId,
        title: title.trim(),
        body: currentBuddy?.displayName ? `For ${currentBuddy.displayName}` : '',
        fireAt: dueDate,
      });
      if (notificationId) {
        await reminderService.update(docId, { notificationId });
      }

      if (Platform.OS === 'android') {
        ToastAndroid.show(
          isEdit ? `✓ Updated "${title.trim()}"` : `✓ Reminder set for ${currentBuddy?.displayName ?? 'buddy'}`,
          ToastAndroid.SHORT,
        );
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || String(e));
      setLoading(false);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selected) setOnceDate(selected);
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && selected) {
      setTime({ h: selected.getHours(), m: selected.getMinutes() });
    }
  };

  // Date chip math (same as ChorePool)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayOfWeek = today.getDay();
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const thisSat = new Date(today); thisSat.setDate(today.getDate() + daysUntilSat);
  const daysUntilNextMon = ((1 - dayOfWeek + 7) % 7) || 7;
  const nextMon = new Date(today); nextMon.setDate(today.getDate() + daysUntilNextMon + (dayOfWeek === 1 ? 7 : 0));
  const sameDay = (a: Date | null, b: Date) =>
    !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const presets: { label: string; date: Date }[] = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: tomorrow },
    { label: thisSat.toLocaleDateString(undefined, { weekday: 'short' }), date: thisSat },
    { label: 'Next Mon', date: nextMon },
  ];
  const isCustomDate = onceDate && !presets.some(p => sameDay(onceDate, p.date));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={10}>
            <RNText style={s.backText}>←</RNText>
          </TouchableOpacity>
          <RNText style={s.title}>{isEdit ? 'Edit Reminder' : 'New Reminder'}</RNText>
          <View style={s.backBtn} />
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <Text variant="sectionLabel" style={{ marginTop: 8 }}>Title</Text>
          <TextInput
            style={s.input}
            placeholder="What's the reminder?"
            placeholderTextColor={theme.colors.muted}
            value={title}
            onChangeText={setTitle}
            autoFocus={!isEdit}
            maxLength={60}
          />

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Recurrence</Text>
          <View style={s.pillRow}>
            {(['once', 'daily', 'weekly'] as const).map(r => (
              <Pill
                key={r}
                label={r === 'once' ? 'One-time' : r.charAt(0).toUpperCase() + r.slice(1)}
                active={recur === r}
                onPress={() => {
                  setRecur(r);
                  if (r !== 'once') setOnceDate(null);
                }}
              />
            ))}
          </View>

          {recur === 'once' && (
            <>
              <Text variant="sectionLabel" style={{ marginTop: 16 }}>Date</Text>
              <View style={s.pillRow}>
                {presets.map(p => {
                  const active = sameDay(onceDate, p.date);
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[s.datePill, active && s.datePillActive]}
                      onPress={() => setOnceDate(p.date)}
                    >
                      <RNText style={[s.datePillLabel, active && { color: '#fff' }]}>{p.label}</RNText>
                      <RNText style={[s.datePillSub, active && { color: '#fff', opacity: 0.85 }]}>
                        {p.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </RNText>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[s.datePill, isCustomDate && s.datePillActive]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <RNText style={[s.datePillLabel, isCustomDate && { color: '#fff' }]}>📅 Pick</RNText>
                  <RNText style={[s.datePillSub, isCustomDate && { color: '#fff', opacity: 0.85 }]}>
                    {isCustomDate ? onceDate!.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'a date'}
                  </RNText>
                </TouchableOpacity>
              </View>
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

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Time</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <TouchableOpacity
              style={[s.timeBtn, allDay && s.timeBtnDisabled]}
              onPress={() => setShowTimePicker(true)}
              disabled={allDay}
            >
              <RNText style={[s.timeText, allDay && { color: theme.colors.muted }]}>
                🕒 {time && !allDay ? formatTime12h(time.h, time.m) : 'Pick a time'}
              </RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.allDayChip, allDay && s.allDayChipActive]}
              onPress={() => setAllDay(a => !a)}
            >
              <RNText style={[s.allDayChipText, allDay && { color: '#fff' }]}>All day</RNText>
            </TouchableOpacity>
          </View>
          {showTimePicker && (
            <DateTimePicker
              value={(() => {
                const d = new Date();
                if (time) { d.setHours(time.h, time.m, 0, 0); }
                return d;
              })()}
              mode="time"
              is24Hour={false}
              onChange={onTimeChange}
            />
          )}

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Assign to</Text>
          <TouchableOpacity style={s.assignBtn} onPress={() => setPickerOpen(true)}>
            {currentBuddy ? (
              <>
                <Avatar emoji={currentBuddy.avatar || '👤'} accent={currentBuddy.accent} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 15 }}>{currentBuddy.displayName}</Text>
                  <Text variant="tiny">Tap to change</Text>
                </View>
                <RNText style={s.chev}>›</RNText>
              </>
            ) : (
              <>
                <View style={s.placeholderAv}><RNText style={{ fontSize: 22 }}>👤</RNText></View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 15, color: theme.colors.muted }}>Pick a buddy</Text>
                  <Text variant="tiny">This reminder fires for them</Text>
                </View>
                <RNText style={s.chev}>›</RNText>
              </>
            )}
          </TouchableOpacity>

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Notes (optional)</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            placeholder="Anything else?"
            placeholderTextColor={theme.colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={200}
          />

          <View style={{ marginTop: 24 }}>
            <Button
              label={loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Reminder')}
              variant="primary"
              onPress={submit}
              disabled={!canSave}
              full
            />
          </View>
        </KeyboardAwareScrollView>

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
                buddies.map((b: User) => (
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
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 18,
    backgroundColor: theme.colors.accent,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  title: { flex: 1, color: '#ffffff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  input: {
    backgroundColor: theme.colors.card, color: theme.colors.text,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 14, fontSize: 16, marginTop: 6,
  },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  datePill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center', minWidth: 70,
  },
  datePillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  datePillLabel: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  datePillSub: { color: theme.colors.muted, fontSize: 10, fontWeight: '500', marginTop: 2 },
  timeBtn: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  timeBtnDisabled: { opacity: 0.5 },
  timeText: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  allDayChip: {
    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 999,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
  },
  allDayChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  allDayChipText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 12, marginTop: 6,
  },
  placeholderAv: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  chev: { color: theme.colors.muted, fontSize: 22, fontWeight: '700' },
  sheetBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl,
    borderTopWidth: 1, borderColor: theme.colors.cardBorder,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.cardBorder,
    alignSelf: 'center', marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: theme.radius.lg, marginBottom: 4,
  },
  sheetRowActive: { backgroundColor: theme.colors.accent + '15' },
  sheetCheck: { color: theme.colors.accent, fontWeight: '700', fontSize: 18 },
});
