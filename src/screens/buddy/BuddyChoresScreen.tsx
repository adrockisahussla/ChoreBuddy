import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, ToastAndroid, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useChores } from '../../hooks/useChores';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { choreService } from '../../services/choreService';
import { chorePoints, isOverdue } from '../../utils/buddy';
import { statusLabel, statusPillStyle } from '../../utils/choreStatus';
import { currentWeek } from '../../utils/week';
import { Chore } from '../../types';
import {
  Header, Screen, Card, Text, Pill, WeekNavigator, FAB, ChoreFormSheet, SCREEN_BOTTOM_PAD,
} from '../../components';
import { useCelebration } from '../../components/Celebration';

const fmtChoreDue = (ts: number, recurrence: string): string => {
  const d = new Date(ts);
  const period = d.getHours() >= 12 ? 'PM' : 'AM';
  const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  const timeStr = `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${period}`;
  if (recurrence === 'daily') return `Today ${timeStr}`;
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return `Today ${timeStr}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ${timeStr}`;
};

/**
 * BuddyChoresScreen — the buddy view of their own assigned chores.
 *
 * Three sections per week:
 *   • To do          — tap circle to mark done → status becomes 'pending'
 *                      (manager will approve/reject)
 *   • Waiting        — already submitted, waiting on manager
 *   • Approved       — done ✓ (earned points)
 *
 * Rejected chores re-appear in "To do" with a red rejection note shown
 * so the buddy can see what to fix and re-submit.
 */
type BuddyChoreTab = 'todo' | 'waiting' | 'done';
const isBuddyChoreTab = (v: any): v is BuddyChoreTab => v === 'todo' || v === 'waiting' || v === 'done';

export default function BuddyChoresScreen({ route, navigation }: any) {
  const { fbUser } = useCurrentUser();
  const myUid = fbUser?.uid;
  const [addChoreOpen, setAddChoreOpen] = useState(false);
  const { chores } = useChores();
  const { members } = useFamilyMembers();
  const { celebrate } = useCelebration();
  const assignerName = (uid?: string) =>
    uid ? (members.find(m => m.uid === uid)?.displayName || 'a manager') : 'a manager';
  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeek());
  const initialTab: BuddyChoreTab = isBuddyChoreTab(route?.params?.tab) ? route.params.tab : 'todo';
  const [tab, setTab] = useState<BuddyChoreTab>(initialTab);

  const my = chores.filter(c => c.assignedTo === myUid);
  const inWeek = my.filter(c => {
    if (c.recurrence === 'daily') return true; // daily chores show every week
    return c.weekOf === selectedWeek;
  });

  const todo = inWeek.filter(c => c.status === 'todo' || c.status === 'rejected');
  const pending = inWeek.filter(c => c.status === 'pending');
  const approved = inWeek.filter(c => c.status === 'approved' && c.weekOf === selectedWeek);
  const uncollected = approved.filter(c => !c.collectedAt);
  const collected = approved.filter(c => !!c.collectedAt);

  // Wallet pill only counts collected — uncollected is "ready to collect"
  // and is called out separately so the kid sees the difference.
  const totalPts = collected.reduce((s, c) => s + chorePoints(c), 0);
  const readyPts = uncollected.reduce((s, c) => s + chorePoints(c), 0);

  const collect = async (c: Chore) => {
    try {
      await choreService.update(c.id, { collectedAt: Date.now() });
      const pts = chorePoints(c);
      celebrate({
        emoji: '🪙',
        headline: 'POINTS COLLECTED!',
        subtitle: c.title,
        count: pts,
        countLabel: pts === 1 ? 'POINT' : 'POINTS',
        dedupeKey: `collected-${c.id}`,
      });
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const submit = async (c: Chore) => {
    try {
      await choreService.update(c.id, {
        status: 'pending',
        completedAt: Date.now(),
        rejectionNote: '',
        notifiedAssigner: false,
        notifiedAssignee: false,
      });
      setTab('waiting');
      if (Platform.OS === 'android') {
        ToastAndroid.show('✓ Sent for approval', ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header
        title="My Chores"
        onBackPress={navigation.canGoBack?.() ? () => navigation.goBack() : undefined}
        onMenuPress={navigation.canGoBack?.() ? undefined : () => navigation.openDrawer?.()}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <WeekNavigator weekOf={selectedWeek} onChange={setSelectedWeek} />

        {/* Progress summary */}
        <Card padding={14} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <View style={s.summaryRow}>
            <View>
              <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 4 }}>
                This week
              </Text>
              <Text variant="h3" style={{ fontSize: 16 }}>
                {approved.length} done · {todo.length} to do
              </Text>
              {readyPts > 0 && (
                <Text style={s.readyHint}>
                  🪙 {readyPts} pts ready to collect →
                </Text>
              )}
            </View>
            <Pill label={`+${totalPts} pts`} active size="md" />
          </View>
        </Card>

        <View style={s.tabRow}>
          {(() => {
            const tabs = [
              { key: 'todo' as const, label: 'To do', count: todo.length },
              { key: 'waiting' as const, label: 'Pending', count: pending.length },
              { key: 'done' as const, label: 'Done', count: uncollected.length > 0 ? uncollected.length : undefined },
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

        {/* To-do section — tap the empty box to submit */}
        {tab === 'todo' && todo.length > 0 && (
          <>
            {todo.map(c => {
              const overdue = isOverdue(c);
              return (
                <View key={c.id} style={[s.row, overdue && s.rowOverdue]}>
                  <TouchableOpacity
                    onPress={() => submit(c)}
                    activeOpacity={0.6}
                    hitSlop={8}
                    style={s.checkbox}
                  />
                  <TouchableOpacity
                    onPress={() => submit(c)}
                    activeOpacity={0.7}
                    style={{ flex: 1 }}
                  >
                    <Text variant="h3" style={{ fontSize: 14 }}>{c.title}</Text>
                    <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                      +{chorePoints(c)} pts · {c.recurrence}
                      {c.dueDate ? ` · ${fmtChoreDue(c.dueDate, c.recurrence)}` : ''}
                      {overdue ? ' · ⚠ Overdue' : ''}
                    </Text>
                    <Text variant="tiny" style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>
                      From {assignerName(c.createdBy)}
                    </Text>
                    {c.status === 'rejected' && !!c.rejectionNote && (
                      <Text style={s.rejectNote}>❌ {c.rejectionNote}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* Waiting section — empty box, disabled, with ⏳ to show it's awaiting */}
        {tab === 'waiting' && pending.length > 0 && (
          <>
            {pending.map(c => (
              <View key={c.id} style={s.row}>
                <View style={[s.checkbox, s.checkboxWaiting]}>
                  <RNText style={s.checkboxWaitMark}>⏳</RNText>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 14 }}>{c.title}</Text>
                  <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                    Sent — {assignerName(c.createdBy)} will review
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Done tab — uncollected at top with big Collect buttons, collected below */}
        {tab === 'done' && approved.length > 0 && (
          <>
            {uncollected.length > 0 && (
              <>
                <Text variant="sectionLabel" style={{ marginTop: 0, color: theme.colors.accent }}>
                  🪙 Collect your points!
                </Text>
                {uncollected.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={s.collectRow}
                    onPress={() => collect(c)}
                    activeOpacity={0.7}
                  >
                    <View style={s.coinIcon}>
                      <RNText style={s.coinText}>🪙</RNText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" style={{ fontSize: 14 }}>{c.title}</Text>
                      <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                        Approved by {assignerName(c.createdBy)} — tap to bank +{chorePoints(c)} pts
                      </Text>
                    </View>
                    <View style={s.collectBtn}>
                      <RNText style={s.collectBtnText}>+{chorePoints(c)}</RNText>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {collected.length > 0 && (
              <>
                {uncollected.length > 0 && (
                  <Text variant="sectionLabel" style={{ marginTop: 16 }}>Collected</Text>
                )}
                {collected.map(c => (
                  <View key={c.id} style={s.row}>
                    <View style={[s.checkbox, s.checkboxDone]}>
                      <RNText style={s.checkboxDoneMark}>✓</RNText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" style={{ fontSize: 14, textDecorationLine: 'line-through' }}>{c.title}</Text>
                      <Text variant="tiny" style={{ marginTop: 2, fontSize: 11 }}>
                        +{chorePoints(c)} pts banked · from {assignerName(c.createdBy)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {inWeek.length === 0 && (
          <Text variant="empty" style={{ padding: 30 }}>
            No chores for this week. Nice work!
          </Text>
        )}

        {inWeek.length > 0 && (
          (tab === 'todo' && todo.length === 0) ||
          (tab === 'waiting' && pending.length === 0) ||
          (tab === 'done' && approved.length === 0)
        ) && (
          <Text variant="empty" style={{ padding: 30 }}>
            {tab === 'todo' ? 'Nothing to do here.' : tab === 'waiting' ? 'Nothing waiting for review.' : 'No completed chores yet.'}
          </Text>
        )}
      </ScrollView>

      {myUid && (
        <>
          <FAB onPress={() => setAddChoreOpen(true)} />
          <ChoreFormSheet
            visible={addChoreOpen}
            onClose={() => setAddChoreOpen(false)}
            defaultBuddyUid={myUid}
          />
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  tabRow: { flexDirection: 'row', marginBottom: 12 },
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
  readyHint: { color: theme.colors.accent, fontSize: 11, fontWeight: '900', marginTop: 4 },
  collectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.accent + '15',
    borderWidth: 2, borderColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    padding: 12, marginBottom: 6,
  },
  coinIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  coinText: { fontSize: 18 },
  collectBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: theme.colors.accent,
    minWidth: 60, alignItems: 'center',
  },
  collectBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  rowOverdue: { borderColor: theme.colors.danger, borderWidth: 2, backgroundColor: theme.colors.danger + '10' },
  rejectNote: { color: theme.colors.danger, fontSize: 11, fontWeight: '700', marginTop: 4 },

  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: theme.colors.accent,
    backgroundColor: theme.colors.card,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxWaiting: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
  },
  checkboxWaitMark: { fontSize: 14, lineHeight: 16 },
  checkboxDone: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success,
  },
  checkboxDoneMark: { color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 18 },

  checkBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: theme.colors.accent,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  checkBtnText: { color: theme.colors.accent, fontSize: 24, fontWeight: '900', lineHeight: 26 },

  waitingDot: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.warningSoft,
    borderWidth: 1.5, borderColor: theme.colors.warning,
    justifyContent: 'center', alignItems: 'center',
  },
  waitingDotText: { fontSize: 18 },

  doneDot: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1.5, borderColor: theme.colors.success,
    justifyContent: 'center', alignItems: 'center',
  },
  doneDotText: { color: theme.colors.success, fontSize: 18, fontWeight: '900' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  dangerPill: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.danger,
  },
  dangerPillText: { color: theme.colors.danger, fontWeight: '900' },
});
