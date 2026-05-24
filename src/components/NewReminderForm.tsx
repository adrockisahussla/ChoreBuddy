import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, SafeAreaView, Platform, ToastAndroid, Text as RNText } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { theme } from '../theme';
import { Recurrence, Reminder } from '../types';
import { reminderService } from '../services/reminderService';
import { useBuddies } from '../hooks/useBuddies';
import { useFamilyId } from '../hooks/useFamilyId';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getWeekOf } from '../utils/week';
import { scheduleReminderNotification, cancelReminderNotification } from '../services/notificationService';
import Button from './Button';
import Text from './Text';
import TimeWheel from './TimeWheel';
import DateWheel from './DateWheel';
import RecurrencePicker, { recurrenceLabel } from './RecurrencePicker';
import DayOfWeekPicker, { weekdaysLabel, nextWeekdayDate } from './DayOfWeekPicker';
import BuddyPicker, { buddiesLabel } from './BuddyPicker';

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
 * All scheduling inputs use the same bottom-sheet field-button pattern:
 *   Title → Recurrence → (Date if one-time) → Time → Assign → Notes
 * No "All day" toggle — time is always required.
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
  const [assignTos, setAssignTos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([new Date().getDay()]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [dateWheelOpen, setDateWheelOpen] = useState(false);
  const [recurOpen, setRecurOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
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
        setTime({ h: 9, m: 0 });
      }
      // Prefer the saved weekdays array; fall back to deriving from dueDate.
      setWeekdays(
        reminder.weekdays && reminder.weekdays.length > 0
          ? reminder.weekdays
          : [reminder.dueDate ? new Date(reminder.dueDate).getDay() : new Date().getDay()],
      );
      setAssignTos(reminder.assignedTo ? [reminder.assignedTo] : []);
      setNotes(reminder.notes || '');
    } else {
      const now = new Date();
      setTitle('');
      setRecur('once');
      setOnceDate(now);
      setTime({ h: now.getHours(), m: now.getMinutes() });
      setWeekdays([now.getDay()]);
      setAssignTos(defaultBuddyUid ? [defaultBuddyUid] : []);
      setNotes('');
    }
    setLoading(false);
  }, [visible, reminder, defaultBuddyUid]);

  const previewDue = (() => {
    if (!time) return null;
    let d: Date;
    if (recur === 'once' && onceDate) d = new Date(onceDate);
    else if (recur === 'weekly') d = nextWeekdayDate(weekdays);
    else d = new Date();
    d.setHours(time.h, time.m, 0, 0);
    return d.getTime();
  })();
  const isPastTime = previewDue !== null && previewDue <= Date.now() + 30_000;

  const canSave =
    !!title.trim() &&
    !!familyId &&
    assignTos.length > 0 &&
    (recur !== 'once' || !!onceDate) &&
    !!time &&
    !isPastTime &&
    !loading;

  /** Compute the dueDate epoch ms from the form state. */
  const computeDueDate = (): number => {
    let d: Date;
    if (recur === 'once' && onceDate) {
      d = new Date(onceDate);
    } else if (recur === 'weekly') {
      // Soonest of the chosen weekdays (today counts).
      d = nextWeekdayDate(weekdays);
    } else {
      // Daily — fires today; the recurring sweep re-arms each day.
      d = new Date();
    }
    if (time) {
      d.setHours(time.h, time.m, 0, 0);
    }
    return d.getTime();
  };

  const formatTime12h = (h: number, m: number): string => {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  /** Save: edit mode patches the single existing doc, create mode writes one
   *  reminder per selected buddy and schedules notifications for each. */
  const submit = async () => {
    if (!canSave || !familyId || assignTos.length === 0) return;
    setLoading(true);
    try {
      const dueDate = computeDueDate();
      const dateStr = new Date(dueDate).toLocaleDateString('en-CA');
      const timeStr = !time ? '' : `${String(time.h).padStart(2, '0')}:${String(time.m).padStart(2, '0')}`;

      const buildData = (buddyUid: string): Omit<Reminder, 'id' | 'createdAt'> => ({
        familyId,
        title: title.trim(),
        assignedTo: buddyUid,
        date: dateStr,
        time: timeStr,
        allDay: false,
        recurrence: recur,
        dueDate,
        weekOf: getWeekOf(new Date(dueDate)),
        notes: notes.trim(),
        createdBy: fbUser?.uid || '',
        ...(recur === 'weekly' ? { weekdays } : {}),
      });

      const announceFailure = (res: Extract<Awaited<ReturnType<typeof scheduleReminderNotification>>, { ok: false }>) => {
        if (Platform.OS !== 'android') return;
        const msg =
          res.reason === 'past' ? 'Reminder time is in the past — pick a future time'
          : res.reason === 'no-notification-perm' ? 'Notifications are off — open Settings to grant'
          : res.reason === 'no-exact-alarm-perm' ? 'Exact-alarm permission is off — open Settings to grant'
          : `Reminder scheduling failed: ${res.message || 'unknown'}`;
        ToastAndroid.show(msg, ToastAndroid.LONG);
      };

      if (isEdit && reminder) {
        // Edit mode is single-buddy. assignTos[0] is the (possibly changed) target.
        const data = buildData(assignTos[0]);
        await reminderService.update(reminder.id, data);
        if (reminder.notificationId) {
          await cancelReminderNotification(reminder.notificationId);
        }
        const buddy = buddies.find(b => b.uid === assignTos[0]);
        const res = await scheduleReminderNotification({
          reminderId: reminder.id,
          title: title.trim(),
          body: buddy?.displayName ? `For ${buddy.displayName}` : '',
          fireAt: dueDate,
        });
        if (res.ok) {
          await reminderService.update(reminder.id, { notificationId: res.id });
          if (Platform.OS === 'android') {
            ToastAndroid.show(`✓ Updated "${title.trim()}"`, ToastAndroid.SHORT);
          }
        } else {
          announceFailure(res);
        }
      } else {
        // Create mode — one Reminder doc per selected buddy.
        let scheduled = 0;
        let lastFail: Extract<Awaited<ReturnType<typeof scheduleReminderNotification>>, { ok: false }> | null = null;
        for (const uid of assignTos) {
          const data = buildData(uid);
          const ref = await reminderService.add(data);
          const buddy = buddies.find(b => b.uid === uid);
          const res = await scheduleReminderNotification({
            reminderId: ref.id,
            title: title.trim(),
            body: buddy?.displayName ? `For ${buddy.displayName}` : '',
            fireAt: dueDate,
          });
          if (res.ok) {
            await reminderService.update(ref.id, { notificationId: res.id });
            scheduled += 1;
          } else {
            lastFail = res;
          }
        }
        if (Platform.OS === 'android') {
          if (scheduled > 0) {
            const summary = assignTos.length === 1
              ? `for ${buddies.find(b => b.uid === assignTos[0])?.displayName ?? 'buddy'}`
              : `for ${scheduled} buddies`;
            ToastAndroid.show(`✓ Reminder set ${summary}`, ToastAndroid.SHORT);
          }
          if (lastFail) announceFailure(lastFail);
        }
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || String(e));
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={10}>
            <RNText style={s.backText}>←</RNText>
          </TouchableOpacity>
          <RNText style={s.title} numberOfLines={1}>{isEdit ? 'Edit Reminder' : 'New Reminder'}</RNText>
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
            style={[s.input, { minHeight: 52 }]}
            placeholder="What's the reminder?"
            placeholderTextColor={theme.colors.muted}
            value={title}
            onChangeText={setTitle}
            autoFocus={!isEdit}
            maxLength={120}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
          />

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Recurrence</Text>
          <TouchableOpacity style={s.timeFieldBtn} onPress={() => setRecurOpen(true)}>
            <RNText style={s.timeIcon}>🔁</RNText>
            <RNText style={s.timeText} numberOfLines={1}>{recurrenceLabel(recur)}</RNText>
            <RNText style={s.timeChev}>›</RNText>
          </TouchableOpacity>

          {recur === 'weekly' && (
            <>
              <Text variant="sectionLabel" style={{ marginTop: 16 }}>Days of week</Text>
              <TouchableOpacity style={s.timeFieldBtn} onPress={() => setDayOpen(true)}>
                <RNText style={s.timeIcon}>📆</RNText>
                <RNText style={s.timeText} numberOfLines={1}>{weekdaysLabel(weekdays)}</RNText>
                <RNText style={s.timeChev}>›</RNText>
              </TouchableOpacity>
            </>
          )}

          {recur === 'once' && (
            <>
              <Text variant="sectionLabel" style={{ marginTop: 16 }}>Date</Text>
              <TouchableOpacity style={s.timeFieldBtn} onPress={() => setDateWheelOpen(true)}>
                <RNText style={s.timeIcon}>📅</RNText>
                <RNText style={s.timeText} numberOfLines={1}>
                  {onceDate
                    ? onceDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Pick a date'}
                </RNText>
                <RNText style={s.timeChev}>›</RNText>
              </TouchableOpacity>
            </>
          )}

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Time</Text>
          <TouchableOpacity style={s.timeFieldBtn} onPress={() => setWheelOpen(true)}>
            <RNText style={s.timeIcon}>🕒</RNText>
            <RNText style={s.timeText} numberOfLines={1}>
              {time ? formatTime12h(time.h, time.m) : 'Pick a time'}
            </RNText>
            <RNText style={s.timeChev}>›</RNText>
          </TouchableOpacity>
          {isPastTime && (
            <RNText style={s.helperError}>
              Pick a time at least a few seconds in the future.
            </RNText>
          )}

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>
            {isEdit ? 'Assigned to' : 'Assign to'}
          </Text>
          <TouchableOpacity style={s.timeFieldBtn} onPress={() => setPickerOpen(true)}>
            <RNText style={s.timeIcon}>👤</RNText>
            <RNText style={s.timeText} numberOfLines={1}>
              {buddiesLabel(assignTos, buddies)}
            </RNText>
            <RNText style={s.timeChev}>›</RNText>
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

        <BuddyPicker
          visible={pickerOpen}
          buddies={buddies}
          value={assignTos}
          single={isEdit}
          onClose={() => setPickerOpen(false)}
          onConfirm={(uids) => setAssignTos(uids)}
        />

        <TimeWheel
          visible={wheelOpen}
          initial={time || { h: 9, m: 0 }}
          onClose={() => setWheelOpen(false)}
          onConfirm={(v) => setTime(v)}
        />

        <DateWheel
          visible={dateWheelOpen}
          initial={onceDate || undefined}
          onClose={() => setDateWheelOpen(false)}
          onConfirm={(d) => setOnceDate(d)}
        />

        <RecurrencePicker
          visible={recurOpen}
          value={recur}
          onClose={() => setRecurOpen(false)}
          onConfirm={(r) => {
            setRecur(r);
            if (r !== 'once') setOnceDate(null);
          }}
        />

        <DayOfWeekPicker
          visible={dayOpen}
          value={weekdays}
          onClose={() => setDayOpen(false)}
          onConfirm={(w) => setWeekdays(w)}
        />
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
  title: { flex: 1, color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  input: {
    backgroundColor: theme.colors.card, color: theme.colors.text,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 14, fontSize: 16, marginTop: 6,
  },
  // Shared field-button pattern — Recurrence, Date, Time all use this
  timeFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  timeIcon: { fontSize: 18 },
  timeText: { flex: 1, color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  timeChev: { color: theme.colors.muted, fontSize: 22, fontWeight: '700' },
  helperError: {
    color: theme.colors.danger, fontSize: 12, fontWeight: '700',
    marginTop: 6, marginLeft: 4,
  },
});
