import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, ToastAndroid, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { useChores } from '../../hooks/useChores';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { choreService } from '../../services/choreService';
import { chorePoints, isOverdue } from '../../utils/buddy';
import { currentWeek } from '../../utils/week';
import { Chore } from '../../types';
import {
  Header, Screen, Card, Text, WeekNavigator, SCREEN_BOTTOM_PAD,
} from '../../components';

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
export default function BuddyChoresScreen({ navigation }: any) {
  const { fbUser } = useCurrentUser();
  const myUid = fbUser?.uid;
  const { chores } = useChores();
  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeek());

  const my = chores.filter(c => c.assignedTo === myUid);
  const inWeek = my.filter(c => {
    if (c.recurrence === 'daily') return true; // daily chores show every week
    return c.weekOf === selectedWeek;
  });

  const todo = inWeek.filter(c => c.status === 'todo' || c.status === 'rejected');
  const pending = inWeek.filter(c => c.status === 'pending');
  const approved = inWeek.filter(c => c.status === 'approved' && c.weekOf === selectedWeek);

  const totalPts = approved.reduce((s, c) => s + chorePoints(c), 0);

  const submit = async (c: Chore) => {
    try {
      await choreService.update(c.id, {
        status: 'pending',
        completedAt: Date.now(),
        rejectionNote: '',
      });
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
      <Header title="My Chores" onMenuPress={() => navigation.openDrawer?.()} />
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
            </View>
            <View style={s.ptsBubble}>
              <RNText style={s.ptsNum}>+{totalPts}</RNText>
              <RNText style={s.ptsLbl}>pts</RNText>
            </View>
          </View>
        </Card>

        {/* To-do section */}
        {todo.length > 0 && (
          <>
            <Text variant="sectionLabel">To do</Text>
            {todo.map(c => (
              <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 12, marginBottom: 6 }}>
                <TouchableOpacity
                  onPress={() => submit(c)}
                  style={s.checkBtn}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <RNText style={s.checkBtnText}>○</RNText>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 15 }}>{c.title}</Text>
                  <Text variant="meta" style={{ marginTop: 2, fontSize: 12 }}>
                    {c.recurrence === 'daily' ? 'Daily' : c.recurrence === 'weekly' ? 'Weekly' : 'One-time'}
                    {' · '}
                    <Text style={{ color: theme.colors.accent, fontWeight: '900' }}>+{chorePoints(c)} pts</Text>
                    {isOverdue(c) && (
                      <Text style={{ color: theme.colors.danger, fontWeight: '900' }}> · OVERDUE</Text>
                    )}
                  </Text>
                  {c.status === 'rejected' && !!c.rejectionNote && (
                    <View style={s.rejNote}>
                      <RNText style={s.rejNoteText}>↻ {c.rejectionNote}</RNText>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Waiting section */}
        {pending.length > 0 && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 14 }}>Waiting for review</Text>
            {pending.map(c => (
              <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 12, marginBottom: 6, opacity: 0.85 }}>
                <View style={s.waitingDot}>
                  <RNText style={s.waitingDotText}>⏳</RNText>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 15 }}>{c.title}</Text>
                  <Text variant="meta" style={{ marginTop: 2, fontSize: 12 }}>
                    Sent — parent will review
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Approved section */}
        {approved.length > 0 && (
          <>
            <Text variant="sectionLabel" style={{ marginTop: 14 }}>Done this week</Text>
            {approved.map(c => (
              <Card key={c.id} row padding={12} radius={theme.radius.lg} style={{ gap: 12, marginBottom: 6, opacity: 0.7 }}>
                <View style={s.doneDot}>
                  <RNText style={s.doneDotText}>✓</RNText>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={{ fontSize: 15, textDecorationLine: 'line-through' }}>{c.title}</Text>
                  <Text variant="meta" style={{ marginTop: 2, fontSize: 12 }}>
                    +{chorePoints(c)} pts earned
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {inWeek.length === 0 && (
          <Text variant="empty" style={{ padding: 30 }}>
            No chores for this week. Nice work!
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ptsBubble: {
    alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    minWidth: 70,
  },
  ptsNum: { color: '#fff', fontWeight: '900', fontSize: 18 },
  ptsLbl: { color: '#fff', fontWeight: '700', fontSize: 10, opacity: 0.85 },

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

  rejNote: {
    marginTop: 6,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  rejNoteText: { color: theme.colors.danger, fontWeight: '700', fontSize: 11 },
});
