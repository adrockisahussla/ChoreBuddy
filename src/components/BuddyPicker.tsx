import React from 'react';
import {
  Modal, View, TouchableOpacity, StyleSheet, Pressable, ScrollView, Text as RNText,
} from 'react-native';
import { theme } from '../theme';
import { User } from '../types';
import Text from './Text';
import Avatar from './Avatar';

interface Props {
  visible: boolean;
  buddies: User[];
  /** Currently-selected buddy uids. */
  value: string[];
  /** When true, only one buddy can be selected (used for edit mode). */
  single?: boolean;
  onClose: () => void;
  onConfirm: (uids: string[]) => void;
}

/**
 * BuddyPicker: bottom-sheet picker for assigning a reminder/chore to one
 * or more buddies. Matches the RecurrencePicker / DayOfWeekPicker shell.
 *
 * Single-select mode (passed for edit) collapses to "tap to confirm".
 * Multi-select mode requires Done to commit.
 */
export default function BuddyPicker({
  visible, buddies, value, single, onClose, onConfirm,
}: Props) {
  const [pick, setPick] = React.useState<Set<string>>(new Set(value));

  React.useEffect(() => {
    if (visible) setPick(new Set(value));
  }, [visible, value]);

  const toggle = (uid: string) => {
    if (single) {
      onConfirm([uid]);
      onClose();
      return;
    }
    setPick(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const allSelected = buddies.length > 0 && buddies.every(b => pick.has(b.uid));

  const toggleAll = () => {
    if (allSelected) setPick(new Set());
    else setPick(new Set(buddies.map(b => b.uid)));
  };

  const confirm = () => {
    if (pick.size === 0) return;
    onConfirm(Array.from(pick));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 12 }}>
            {single ? 'Reassign to' : 'Assign to'}
          </Text>

          {!single && buddies.length > 1 && (
            <TouchableOpacity style={s.allBtn} onPress={toggleAll} activeOpacity={0.7}>
              <View style={[s.checkbox, allSelected && s.checkboxActive]}>
                {allSelected && <RNText style={s.checkboxTick}>✓</RNText>}
              </View>
              <RNText style={s.allText}>{allSelected ? 'Deselect all' : 'Select all'}</RNText>
            </TouchableOpacity>
          )}

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {buddies.length === 0 ? (
              <Text variant="empty">No buddies yet — invite one first.</Text>
            ) : (
              buddies.map(b => {
                const active = pick.has(b.uid);
                return (
                  <TouchableOpacity
                    key={b.uid}
                    style={[s.row, active && s.rowActive]}
                    onPress={() => toggle(b.uid)}
                    activeOpacity={0.7}
                  >
                    {!single && (
                      <View style={[s.checkbox, active && s.checkboxActive]}>
                        {active && <RNText style={s.checkboxTick}>✓</RNText>}
                      </View>
                    )}
                    <Avatar emoji={b.avatar || '👤'} accent={b.accent} size="sm" />
                    <View style={{ flex: 1 }}>
                      <RNText style={s.title} numberOfLines={1}>{b.displayName}</RNText>
                      {!!b.email && <RNText style={s.email} numberOfLines={1}>{b.email}</RNText>}
                    </View>
                    {single && active && <RNText style={s.singleCheck}>✓</RNText>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {!single && pick.size === 0 && (
            <Text variant="tiny" style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 6 }}>
              Pick at least one buddy.
            </Text>
          )}

          {!single && (
            <View style={s.actions}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <RNText style={s.cancelText}>Cancel</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, pick.size === 0 && s.confirmDisabled]}
                disabled={pick.size === 0}
                onPress={confirm}
              >
                <RNText style={s.confirmText}>Done</RNText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Display label for a list of selected buddy uids (used by field buttons). */
export function buddiesLabel(uids: string[], buddies: User[]): string {
  if (uids.length === 0) return 'Pick a buddy';
  if (uids.length === buddies.length && buddies.length > 1) return 'All buddies';
  if (uids.length === 1) {
    const b = buddies.find(x => x.uid === uids[0]);
    return b?.displayName || '1 buddy';
  }
  if (uids.length <= 2) {
    return uids
      .map(uid => buddies.find(b => b.uid === uid)?.displayName)
      .filter(Boolean)
      .join(', ');
  }
  return `${uids.length} buddies`;
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.cardBorder,
    alignSelf: 'center',
    marginBottom: 12,
  },
  allBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.bg,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  allText: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  rowActive: { backgroundColor: theme.colors.accent + '15' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkboxTick: { color: '#ffffff', fontWeight: '900', fontSize: 14, lineHeight: 16 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  email: { color: theme.colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  singleCheck: { color: theme.colors.accent, fontSize: 20, fontWeight: '900' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  cancelText: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
