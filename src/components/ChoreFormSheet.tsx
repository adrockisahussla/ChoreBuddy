import React, { useState } from 'react';
import {
  View, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Platform,
  ToastAndroid, Pressable, Modal, Text as RNText,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChorePoolItem, Recurrence } from '../types';
import { theme } from '../theme';
import { POINTS_PER } from '../utils/buddy';
import { useBuddies } from '../hooks/useBuddies';
import { useFamilyId } from '../hooks/useFamilyId';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { chorePoolService } from '../services/chorePoolService';
import { choreService, getWeekOf } from '../services/choreService';
import Avatar from './Avatar';
import Pill from './Pill';
import Button from './Button';
import Text from './Text';
import DateWheel from './DateWheel';
import RecurrencePicker, { recurrenceLabel } from './RecurrencePicker';
import DayOfWeekPicker, { weekdaysLabel, nextWeekdayDate } from './DayOfWeekPicker';
import TimeWheel from './TimeWheel';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Edit-mode: prefill from an existing chore-pool item. */
  initial?: ChorePoolItem | null;
  /** When set, the form is opened in the context of a single buddy. The
   *  Save & Assign action skips the picker and targets this uid directly,
   *  and `onceDate` defaults to today so the chore is due now. */
  defaultBuddyUid?: string;
}

/**
 * Full-screen chore creation/edit sheet. Originally inlined in
 * ChorePoolScreen — extracted so contextual surfaces (per-buddy chore
 * pages, FABs) can spawn the same dialog without code duplication.
 *
 * Two save modes:
 *   • Save (Pool only) — adds a reusable pool template
 *   • Save & Assign     — pool template + assigned chore for a buddy
 *
 * When `defaultBuddyUid` is provided, Save & Assign skips the picker
 * and immediately targets that buddy.
 */
export default function ChoreFormSheet({ visible, onClose, initial, defaultBuddyUid }: Props) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ChoreFormBody initial={initial || null} onClose={onClose} defaultBuddyUid={defaultBuddyUid} />
    </Modal>
  );
}

function ChoreFormBody({ initial, onClose, defaultBuddyUid }: {
  initial: ChorePoolItem | null;
  onClose: () => void;
  defaultBuddyUid?: string;
}) {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title || '');
  const [recur, setRecur] = useState<Recurrence>(initial?.recurrence || 'weekly');
  const [points, setPoints] = useState<number>(initial?.points ?? POINTS_PER.weekly);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Default the one-time date to today so the user can hit Save without
  // touching the date wheel. (Only matters when recur === 'once'.)
  const [onceDate, setOnceDate] = useState<Date | null>(new Date());
  const [dateWheelOpen, setDateWheelOpen] = useState(false);
  const [recurOpen, setRecurOpen] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([new Date().getDay()]);
  const [dayOpen, setDayOpen] = useState(false);
  // Default to 2-minute pre-due reminder so kids get a heads-up by default.
  const [remindBefore, setRemindBefore] = useState<number | null>(2);
  const [time, setTime] = useState<{ h: number; m: number }>(() => {
    const n = new Date();
    return { h: n.getHours(), m: n.getMinutes() };
  });
  const [wheelOpen, setWheelOpen] = useState(false);
  const { buddies } = useBuddies();
  const familyId = useFamilyId();
  const { fbUser } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const buildPool = (): Omit<ChorePoolItem, 'id' | 'createdAt'> => ({
    familyId: familyId || '',
    title: title.trim(),
    recurrence: recur,
    points,
  });
  const buildAssigned = (buddyUid: string) => {
    const applyTime = (d: Date) => { d.setHours(time.h, time.m, 0, 0); return d; };
    const dueDate = recur === 'daily'
      ? applyTime(new Date()).getTime()
      : recur === 'once'
        ? applyTime(new Date(onceDate!)).getTime()
        : applyTime(nextWeekdayDate(weekdays)).getTime();
    return {
      familyId: familyId || '',
      title: title.trim(), assignedTo: buddyUid, status: 'todo' as const, rejectionNote: '',
      recurrence: recur, dueDate, weekOf: getWeekOf(new Date(dueDate)),
      points, completedAt: 0, overdue: false,
      ...(recur === 'weekly' ? { weekdays } : {}),
      ...(remindBefore != null ? { remindBeforeMinutes: remindBefore } : {}),
      ...(fbUser?.uid ? { createdBy: fbUser.uid } : {}),
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

  // When a defaultBuddyUid is set, the primary action is "Save & Assign to
  // THIS buddy" (no picker). Otherwise the picker decides who gets it.
  const primaryAssign = () => {
    if (defaultBuddyUid) saveAndAssignTo(defaultBuddyUid);
    else setPickerOpen(true);
  };
  const targetBuddy = defaultBuddyUid
    ? buddies.find(b => b.uid === defaultBuddyUid)
    : null;

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
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
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
        <TouchableOpacity style={s.dateFieldBtn} onPress={() => setRecurOpen(true)}>
          <RNText style={s.dateIcon}>🔁</RNText>
          <RNText style={s.dateText} numberOfLines={1}>{recurrenceLabel(recur)}</RNText>
          <RNText style={s.dateChev}>›</RNText>
        </TouchableOpacity>

        {recur === 'weekly' && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 16 }}>Days of week</Text>
            <TouchableOpacity style={s.dateFieldBtn} onPress={() => setDayOpen(true)}>
              <RNText style={s.dateIcon}>📆</RNText>
              <RNText style={s.dateText} numberOfLines={1}>{weekdaysLabel(weekdays)}</RNText>
              <RNText style={s.dateChev}>›</RNText>
            </TouchableOpacity>
          </>
        )}

        {recur === 'once' && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 16 }}>Due date</Text>
            <TouchableOpacity style={s.dateFieldBtn} onPress={() => setDateWheelOpen(true)}>
              <RNText style={s.dateIcon}>📅</RNText>
              <RNText style={s.dateText} numberOfLines={1}>
                {onceDate
                  ? onceDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Pick a date'}
              </RNText>
              <RNText style={s.dateChev}>›</RNText>
            </TouchableOpacity>
          </>
        )}

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Due time</Text>
        <TouchableOpacity style={s.dateFieldBtn} onPress={() => setWheelOpen(true)}>
          <RNText style={s.dateIcon}>🕒</RNText>
          <RNText style={s.dateText} numberOfLines={1}>
            {(() => {
              const period = time.h >= 12 ? 'PM' : 'AM';
              const h12 = time.h % 12 === 0 ? 12 : time.h % 12;
              return `${h12}:${String(time.m).padStart(2, '0')} ${period}`;
            })()}
          </RNText>
          <RNText style={s.dateChev}>›</RNText>
        </TouchableOpacity>

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Point value</Text>
        <View style={s.pillRow}>
          {[5, 10, 15, 20, 50].map(p => (
            <Pill key={p} label={String(p)} size="sm" active={points === p} onPress={() => setPoints(p)} />
          ))}
        </View>

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Remind me before due</Text>
        <View style={s.pillRow}>
          {([
            { label: 'None', value: null },
            { label: '2 min', value: 2 },
            { label: '30 min', value: 30 },
            { label: '1 hr', value: 60 },
            { label: '2 hrs', value: 120 },
            { label: '4 hrs', value: 240 },
            { label: '1 day', value: 1440 },
          ] as Array<{ label: string; value: number | null }>).map(opt => (
            <Pill
              key={String(opt.value)}
              label={opt.label}
              size="sm"
              active={remindBefore === opt.value}
              onPress={() => setRemindBefore(opt.value)}
            />
          ))}
        </View>

      </KeyboardAwareScrollView>

      <View style={[s.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
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
            style={[s.footerBtn, s.footerBtnPrimary, (!canSave || (!defaultBuddyUid && buddies.length === 0)) && s.btnDisabled]}
            disabled={!canSave || (!defaultBuddyUid && buddies.length === 0)}
            onPress={primaryAssign}
          >
            <RNText style={s.footerBtnPrimaryText}>Save &amp; Assign</RNText>
            <RNText style={[s.footerBtnSubtext, { color: '#000', opacity: 0.7 }]}>
              {targetBuddy
                ? `to ${targetBuddy.displayName}`
                : (buddies.length === 0 ? 'No buddies' : 'Pick a buddy →')}
            </RNText>
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity
              style={[s.footerBtn, s.footerBtnDanger]}
              onPress={del}
            >
              <RNText style={s.footerBtnDangerText}>🗑 Delete</RNText>
              <RNText style={[s.footerBtnSubtext, { color: '#fff', opacity: 0.85 }]}>Remove</RNText>
            </TouchableOpacity>
          )}
        </View>
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
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 15 }}>{b.displayName}</Text>
                    {!!b.email && <Text variant="tiny" style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{b.email}</Text>}
                  </View>
                  <RNText style={s.sheetCheck}>›</RNText>
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <DateWheel
        visible={dateWheelOpen}
        initial={onceDate || undefined}
        onClose={() => setDateWheelOpen(false)}
        onConfirm={(d) => setOnceDate(d)}
      />

      <TimeWheel
        visible={wheelOpen}
        initial={time}
        onClose={() => setWheelOpen(false)}
        onConfirm={(v) => setTime(v)}
      />

      <RecurrencePicker
        visible={recurOpen}
        value={recur}
        onClose={() => setRecurOpen(false)}
        onConfirm={(r) => {
          setRecur(r);
          setPoints(POINTS_PER[r]);
          // Switching back to 'once' restores today as the default; switching
          // away keeps the existing value harmlessly (it's ignored unless once).
          if (r === 'once' && !onceDate) setOnceDate(new Date());
        }}
      />

      <DayOfWeekPicker
        visible={dayOpen}
        value={weekdays}
        onClose={() => setDayOpen(false)}
        onConfirm={(w) => setWeekdays(w)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  bigInput: { backgroundColor: theme.colors.card, color: theme.colors.text, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 16, fontSize: 17, fontWeight: '600', marginTop: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  dateFieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14, paddingVertical: 14, marginTop: 6,
  },
  dateIcon: { fontSize: 18 },
  dateText: { flex: 1, color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  dateChev: { color: theme.colors.muted, fontSize: 22, fontWeight: '700' },

  sheetBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, borderTopWidth: 1, borderColor: theme.colors.cardBorder },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.cardBorder, alignSelf: 'center', marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.radius.lg, marginBottom: 4 },
  sheetCheck: { color: theme.colors.muted, fontWeight: '900', fontSize: 18 },

  formFooter: { paddingTop: 24, gap: 10 },
  stickyFooter: {
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1, borderTopColor: theme.colors.cardBorder,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
  },
  footerRow: { flexDirection: 'row', gap: 8 },
  footerBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 64 },
  footerBtnPrimary: { backgroundColor: theme.colors.accent },
  footerBtnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 14 },
  footerBtnSecondary: { backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardBorder },
  footerBtnSecondaryText: { color: theme.colors.text, fontWeight: '900', fontSize: 14 },
  footerBtnDanger: { backgroundColor: theme.colors.danger },
  footerBtnDangerText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  footerBtnSubtext: { fontSize: 10, fontWeight: '700', color: theme.colors.muted, marginTop: 2 },
  btnDisabled: { opacity: 0.4 },
});
