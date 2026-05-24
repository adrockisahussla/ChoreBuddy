import React, { useEffect, useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, TextInput, View, TouchableOpacity, Platform, ToastAndroid, Alert, Text as RNText } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { theme } from '../theme';
import { useFamilyId } from '../hooks/useFamilyId';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { rewardService } from '../services/rewardService';
import Button from './Button';
import Pill from './Pill';
import Text from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * SuggestRewardForm — modal the buddy uses to suggest a new reward.
 * Mirrors the chore-form pattern. On submit creates a Reward doc with
 * status='requested' so the manager sees it under their Pending tab
 * and can Accept (set final cost) or Reject.
 */
export default function SuggestRewardForm({ visible, onClose }: Props) {
  const familyId = useFamilyId();
  const { fbUser } = useCurrentUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState<number>(20);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDescription('');
    setCost(20);
    setLoading(false);
  }, [visible]);

  const canSave = !!title.trim() && !!familyId && !!fbUser?.uid && cost > 0 && !loading;

  const submit = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await rewardService.request({
        familyId: familyId!,
        kidId: fbUser!.uid,
        title: title.trim(),
        description: description.trim(),
        cost,
        suggestedCost: cost,
        createdBy: fbUser!.uid,
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show(`✓ Sent "${title.trim()}" to manager`, ToastAndroid.SHORT);
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
          <RNText style={s.title} numberOfLines={1}>Suggest a Reward</RNText>
          <View style={s.backBtn} />
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <Text variant="sectionLabel" style={{ marginTop: 8 }}>What do you want?</Text>
          <TextInput
            style={[s.input, { minHeight: 52 }]}
            placeholder="e.g. 30 minutes of Minecraft"
            placeholderTextColor={theme.colors.muted}
            value={title}
            onChangeText={setTitle}
            autoFocus
            maxLength={80}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
          />

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>How many points?</Text>
          <View style={s.pillRow}>
            {[5, 10, 20, 30, 50, 100].map(p => (
              <Pill key={p} label={`${p}`} size="sm" active={cost === p} onPress={() => setCost(p)} />
            ))}
          </View>

          <Text variant="sectionLabel" style={{ marginTop: 16 }}>Notes (optional)</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            placeholder="Anything you want your manager to know?"
            placeholderTextColor={theme.colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />

          <View style={{ marginTop: 24 }}>
            <Button
              label={loading ? 'Sending…' : 'Send to manager'}
              variant="primary"
              onPress={submit}
              disabled={!canSave}
              full
            />
          </View>
        </KeyboardAwareScrollView>
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
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
});
