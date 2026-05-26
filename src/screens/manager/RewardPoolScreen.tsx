import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Platform, ToastAndroid, Pressable, Modal, Text as RNText } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RewardPoolItem } from '../../types';
import { theme } from '../../theme';
import { useRewardPool } from '../../hooks/useRewardPool';
import { useBuddies } from '../../hooks/useBuddies';
import { useFamilyId } from '../../hooks/useFamilyId';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { rewardPoolService } from '../../services/rewardPoolService';
import { Header, Screen, Card, Avatar, Pill, Button, Text, useConfirm, SCREEN_BOTTOM_PAD } from '../../components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MINUTE_PRESETS = [5, 10, 15, 30, 45, 60, 90, 120];
const POINTS_PRESETS = [5, 10, 15, 20, 30, 50, 75, 100];

export default function RewardPoolScreen({ navigation }: any) {
  const { rewardPool } = useRewardPool();
  const { buddies } = useBuddies();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RewardPoolItem | null>(null);
  const confirm = useConfirm();

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item: RewardPoolItem) => { setEditing(item); setFormOpen(true); };
  const close = () => { setFormOpen(false); setEditing(null); };

  const onDelete = async (item: RewardPoolItem) => {
    const ok = await confirm({
      title: 'Delete reward?',
      message: `"${item.label}" will be removed from the Reward Pool.`,
      confirmLabel: 'Delete',
      confirmDestructive: true,
    });
    if (!ok) return;
    try {
      await rewardPoolService.remove(item.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Removed "${item.label}"`, ToastAndroid.SHORT);
      }
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Reward Pool" onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Card padding={14} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22 }}>
            The <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>Reward Pool</Text> is screen-time you offer each kid in exchange for points. Set the minutes + cost per entry. Kids redeem from their own pool.
          </Text>
        </Card>

        <Button
          label="+ New Reward"
          variant="primary"
          onPress={openNew}
          full
          style={{ marginBottom: 12 }}
        />

        {rewardPool.length === 0 ? (
          <Text variant="empty" style={{ padding: 30 }}>
            Your pool is empty. Tap "+ New Reward" to add one.
          </Text>
        ) : (
          rewardPool.map(p => {
            const kid = p.kidId ? buddies.find(b => b.uid === p.kidId) : null;
            const audience = kid ? `for ${kid.displayName}` : 'for all kids';
            return (
              <Card key={p.id} row radius={theme.radius.lg} padding={0} style={{ paddingRight: 12, gap: 6 }}>
                <TouchableOpacity style={s.cardMain} onPress={() => openEdit(p)}>
                  <View style={s.iconBubble}><RNText style={s.iconText}>⏱</RNText></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{p.label}</Text>
                    <Text variant="meta">
                      <Text style={{ color: theme.colors.accent, fontWeight: '900' }}>{p.minutes} min</Text>
                      {' · '}
                      <Text style={{ color: theme.colors.success, fontWeight: '900' }}>{p.pointsCost} pts</Text>
                      {' · '}{audience}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => onDelete(p)} hitSlop={12}>
                  <RNText style={{ fontSize: 20 }}>🗑</RNText>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" onRequestClose={close}>
        <RewardPoolForm initial={editing} onClose={close} />
      </Modal>
    </Screen>
  );
}

function RewardPoolForm({ initial, onClose }: { initial: RewardPoolItem | null; onClose: () => void }) {
  const editing = !!initial;
  const [label, setLabel] = useState(initial?.label || '');
  const [minutes, setMinutes] = useState<number>(initial?.minutes ?? 30);
  const [pointsCost, setPointsCost] = useState<number>(initial?.pointsCost ?? 30);
  const [kidUid, setKidUid] = useState<string>(initial?.kidId || '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { buddies } = useBuddies();
  const familyId = useFamilyId();
  const { fbUser } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const effectiveLabel = label.trim() || `${minutes} min screen time`;
  // kidUid === '' means "all kids" — they all see this entry in their pool.
  // Allow saving as long as the user has explicitly opened the picker
  // and picked something (initial '' is also valid → all kids).
  const [kidPicked, setKidPicked] = useState<boolean>(!!initial);
  const canSave = kidPicked && minutes > 0 && pointsCost > 0;

  const build = (): Omit<RewardPoolItem, 'id' | 'createdAt'> => ({
    familyId: familyId || '',
    kidId: kidUid,
    label: effectiveLabel,
    minutes,
    pointsCost,
    createdBy: fbUser?.uid || '',
  });

  const save = async () => {
    if (!canSave || !familyId) return;
    try {
      if (editing) await rewardPoolService.update(initial!.id, build());
      else await rewardPoolService.add(build());
      if (Platform.OS === 'android') {
        const kid = buddies.find(b => b.uid === kidUid);
        ToastAndroid.show(
          editing
            ? `✓ Updated "${effectiveLabel}"`
            : `✓ Added "${effectiveLabel}" to ${kid?.displayName ?? 'reward pool'}`,
          ToastAndroid.SHORT,
        );
      }
      onClose();
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Save failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const del = async () => {
    if (!editing) return;
    try {
      await rewardPoolService.remove(initial!.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Removed "${initial!.label}"`, ToastAndroid.SHORT);
      }
      onClose();
    } catch (e: any) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Delete failed: ${e?.message || e}`, ToastAndroid.LONG);
      }
    }
  };

  const selectedKid = buddies.find(b => b.uid === kidUid);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={s.formHeader}>
        <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={10}>
          <RNText style={s.backBtnText}>←</RNText>
        </TouchableOpacity>
        <Text variant="h2" style={{ fontSize: 18 }}>{editing ? 'Edit Reward' : 'New Reward'}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Text variant="sectionLabel" style={{ marginTop: 16 }}>For</Text>
        <TouchableOpacity style={s.fieldBtn} onPress={() => setPickerOpen(true)}>
          <RNText style={s.fieldIcon}>👤</RNText>
          <RNText style={s.fieldText} numberOfLines={1}>
            {!kidPicked ? 'Pick a kid' : (selectedKid?.displayName || 'All kids')}
          </RNText>
          <RNText style={s.fieldChev}>›</RNText>
        </TouchableOpacity>

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Label (optional)</Text>
        <TextInput
          style={s.bigInput}
          placeholder={`${minutes} min screen time`}
          placeholderTextColor={theme.colors.muted}
          value={label}
          onChangeText={setLabel}
          maxLength={80}
        />

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Minutes</Text>
        <View style={s.pillRow}>
          {MINUTE_PRESETS.map(m => (
            <Pill key={m} label={`${m} min`} size="sm" active={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </View>

        <Text variant="sectionLabel" style={{ marginTop: 16 }}>Points cost</Text>
        <View style={s.pillRow}>
          {POINTS_PRESETS.map(p => (
            <Pill key={p} label={`${p} pts`} size="sm" active={pointsCost === p} onPress={() => setPointsCost(p)} />
          ))}
        </View>

      </KeyboardAwareScrollView>

      <View style={[s.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.footerRow}>
          <TouchableOpacity
            style={[s.footerBtn, s.footerBtnPrimary, !canSave && s.btnDisabled]}
            onPress={save}
            disabled={!canSave}
          >
            <RNText style={s.footerBtnPrimaryText}>{editing ? 'Save changes' : 'Add to pool'}</RNText>
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity style={[s.footerBtn, s.footerBtnDanger]} onPress={del}>
              <RNText style={s.footerBtnDangerText}>🗑 Delete</RNText>
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
          <Pressable style={s.sheetCard} onPress={() => { /* swallow */ }}>
            <View style={s.sheetHandle} />
            <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 12 }}>Pick a kid</Text>
            <TouchableOpacity
              style={s.sheetRow}
              onPress={() => { setKidUid(''); setKidPicked(true); setPickerOpen(false); }}
            >
              <View style={[s.allBubble]}>
                <RNText style={{ fontSize: 18 }}>👨‍👩‍👧‍👦</RNText>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ fontSize: 15 }}>All kids</Text>
                <Text variant="tiny" style={{ marginTop: 2, opacity: 0.7 }}>
                  Every kid in the family can redeem this
                </Text>
              </View>
              <RNText style={s.sheetCheck}>›</RNText>
            </TouchableOpacity>
            {buddies.length === 0 ? (
              <Text variant="empty">No buddies yet — invite one first.</Text>
            ) : (
              buddies.map(b => (
                <TouchableOpacity
                  key={b.uid}
                  style={s.sheetRow}
                  onPress={() => { setKidUid(b.uid); setKidPicked(true); setPickerOpen(false); }}
                >
                  <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={{ fontSize: 15 }}>{b.displayName}</Text>
                  </View>
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
  iconBubble: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 16 },
  cardTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 15, marginBottom: 3 },
  delBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.danger + '60', backgroundColor: theme.colors.danger + '15', justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },

  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  bigInput: { backgroundColor: theme.colors.card, color: theme.colors.text, borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 16, fontSize: 17, fontWeight: '600', marginTop: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  fieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14, paddingVertical: 14, marginTop: 6,
  },
  fieldIcon: { fontSize: 18 },
  fieldText: { flex: 1, color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  fieldChev: { color: theme.colors.muted, fontSize: 22, fontWeight: '700' },

  sheetBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, borderTopWidth: 1, borderColor: theme.colors.cardBorder },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.cardBorder, alignSelf: 'center', marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.radius.lg, marginBottom: 4 },
  sheetCheck: { color: theme.colors.muted, fontWeight: '900', fontSize: 18 },
  allBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.accent + '22', borderWidth: 1, borderColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },

  formFooter: { paddingTop: 24, gap: 10 },
  stickyFooter: {
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1, borderTopColor: theme.colors.cardBorder,
    paddingHorizontal: 16, paddingTop: 12,
  },
  footerRow: { flexDirection: 'row', gap: 8 },
  footerBtn: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  footerBtnPrimary: { backgroundColor: theme.colors.accent },
  footerBtnPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  footerBtnDanger: { backgroundColor: theme.colors.danger },
  footerBtnDangerText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
});
