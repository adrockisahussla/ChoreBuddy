import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, View, TouchableOpacity, Platform, ToastAndroid, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { useBuddies } from '../../hooks/useBuddies';
import {
  Header, Screen, Card, Avatar, Text, FAB, SCREEN_BOTTOM_PAD,
} from '../../components';
import { GameSchedule, DaySchedule, WEEK_DAYS } from '../../types';
import { gameScheduleService, emptySchedule } from '../../services/gameScheduleService';
import { firewallControlService, Machine } from '../../services/firewallControlService';

const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toHHMM = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const fmt12 = (hhmm: string) => {
  const min = toMin(hhmm); let h = Math.floor(min / 60); const mm = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
};

function Stepper({ label, value, onDec, onInc }: any) {
  return (
    <View style={s.stepRow}>
      <Text variant="tiny" style={{ color: theme.colors.muted, fontWeight: '800', width: 70 }}>{label}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={onDec}><Text style={s.stepBtnTxt}>–</Text></TouchableOpacity>
      <Text style={s.stepVal}>{value}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={onInc}><Text style={s.stepBtnTxt}>+</Text></TouchableOpacity>
    </View>
  );
}

export default function BuddyScheduleScreen({ route, navigation }: any) {
  const buddyUid: string = route?.params?.buddyUid;
  const { buddies } = useBuddies();
  const buddy = buddies.find(b => b.uid === buddyUid);

  const [sched, setSched] = useState<GameSchedule | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!buddyUid || !buddy) return;
    const unsub = gameScheduleService.subscribe(buddyUid, s => {
      if (!dirty.current) setSched(s || emptySchedule(buddyUid, buddy.familyId));
    });
    return () => unsub();
  }, [buddyUid, buddy?.familyId]);

  useEffect(() => {
    if (!buddyUid) return;
    const unsub = firewallControlService.subscribeForKid(buddyUid, setMachines);
    return () => unsub();
  }, [buddyUid]);

  const toast = (m: string) => { if (Platform.OS === 'android') ToastAndroid.show(m, ToastAndroid.SHORT); };

  const patchDay = (key: string, patch: Partial<DaySchedule>) => {
    if (!sched) return;
    dirty.current = true;
    setSched({ ...sched, days: { ...sched.days, [key]: { ...sched.days[key], ...patch } } });
  };

  const save = async () => {
    if (!sched) return;
    try { await gameScheduleService.save(sched); dirty.current = false; toast('Schedule saved'); navigation.goBack(); }
    catch (e: any) { toast(`Save failed: ${e?.message || e}`); }
  };

  const manual = async (m: Machine, cmd: 'shutoff' | 'allow') => {
    setBusy(`${m.id}:${cmd}`);
    try { await firewallControlService.send(m, cmd); toast(cmd === 'shutoff' ? 'Blocked now' : 'Allowed now'); }
    catch (e: any) { toast(`Error: ${e?.message || e}`); }
    finally { setBusy(null); }
  };

  if (!buddy || !sched) {
    return (
      <Screen contentStyle={{ padding: 0 }}>
        <Header title="GameWall" onBackPress={() => navigation.goBack()} />
        <Text variant="empty">Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={`${buddy.displayName} · GameWall`} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD + 60 }}>

        {/* Manual override */}
        {machines.length > 0 && (
          <>
            <Text variant="sectionLabel" style={{ marginBottom: 10 }}>Right now</Text>
            {machines.map(m => {
              const blocked = m.command === 'shutoff';
              return (
                <Card key={m.id} row style={{ gap: 12 }}>
                  <Avatar emoji={blocked ? '🚫' : '🟢'} accent={blocked ? theme.colors.danger : theme.colors.success} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 15 }}>{m.machineName || m.id}</Text>
                    <Text variant="meta" style={{ fontSize: 12, color: blocked ? theme.colors.danger : theme.colors.success }}>
                      {blocked ? 'Blocked' : 'Allowed'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={!!busy}
                    style={[s.nowBtn, { backgroundColor: blocked ? theme.colors.success : theme.colors.danger }]}
                    onPress={() => manual(m, blocked ? 'allow' : 'shutoff')}
                  >
                    <Text style={s.nowBtnTxt}>{blocked ? 'Allow now' : 'Block now'}</Text>
                  </TouchableOpacity>
                </Card>
              );
            })}
          </>
        )}

        {/* Weekly schedule */}
        <Text variant="sectionLabel" style={{ marginTop: 18, marginBottom: 10 }}>Weekly play schedule</Text>
        {WEEK_DAYS.map(({ key, label }) => {
          const d = sched.days[key];
          return (
            <Card key={key} style={{ gap: 0 }}>
              <View style={s.dayHead}>
                <Text variant="h3" style={{ fontSize: 15, flex: 1 }}>{label}</Text>
                <TouchableOpacity
                  style={[s.toggle, d.enabled && s.toggleOn]}
                  onPress={() => patchDay(key, { enabled: !d.enabled })}
                >
                  <Text style={[s.toggleTxt, d.enabled && { color: '#fff' }]}>{d.enabled ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              </View>

              {d.enabled && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Stepper label="Starts" value={fmt12(d.start)}
                    onDec={() => patchDay(key, { start: toHHMM(toMin(d.start) - 30) })}
                    onInc={() => patchDay(key, { start: toHHMM(toMin(d.start) + 30) })} />
                  <Stepper label="Ends" value={fmt12(d.end)}
                    onDec={() => patchDay(key, { end: toHHMM(toMin(d.end) - 30) })}
                    onInc={() => patchDay(key, { end: toHHMM(toMin(d.end) + 30) })} />
                  <Stepper label="Max/day" value={(d.maxHours ?? 0) === 0 ? 'No cap' : `${d.maxHours}h`}
                    onDec={() => patchDay(key, { maxHours: Math.max(0, (d.maxHours ?? 0) - 0.5) })}
                    onInc={() => patchDay(key, { maxHours: Math.min(12, (d.maxHours ?? 0) + 0.5) })} />
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      <FAB label="✓" onPress={save} />
    </Screen>
  );
}

const s = StyleSheet.create({
  dayHead: { flexDirection: 'row', alignItems: 'center' },
  toggle: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: theme.colors.cardBorder },
  toggleOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  toggleTxt: { fontWeight: '900', fontSize: 13, color: theme.colors.muted },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  stepBtnTxt: { fontSize: 20, fontWeight: '800', color: theme.colors.accent },
  stepVal: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 15, color: theme.colors.text },
  nowBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  nowBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
