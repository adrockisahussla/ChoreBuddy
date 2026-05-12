import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Text as RNText } from 'react-native';
import { theme } from '../../theme';
import { Header, Screen, Card, Text, SCREEN_BOTTOM_PAD } from '../../components';
import { useTextScale } from '../../context/TextScaleContext';

export default function SettingsScreen({ navigation }: any) {
  const { scale, bumpUp, bumpDown, setScale, min, max } = useTextScale();
  const pct = Math.round(scale * 100);
  const atMin = scale <= min + 0.001;
  const atMax = scale >= max - 0.001;

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Settings" onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        <Card padding={16} radius={theme.radius.lg} style={{ marginBottom: 12 }}>
          <Text variant="sectionLabel" style={{ marginTop: 0, marginBottom: 8 }}>Fonts</Text>
          <Text style={{ fontSize: 14, color: theme.colors.muted, marginBottom: 14 }}>
            Adjust the size of all text in the app.
          </Text>

          <View style={s.controlRow}>
            <TouchableOpacity
              style={[s.bumpBtn, atMin && s.bumpBtnDisabled]}
              disabled={atMin}
              onPress={bumpDown}
              hitSlop={6}
            >
              <RNText style={s.bumpText}>−</RNText>
            </TouchableOpacity>

            <View style={s.preview}>
              <RNText style={s.previewLabel}>{pct}%</RNText>
              <Text variant="h3">Sample text</Text>
              <Text variant="meta" style={{ marginTop: 2 }}>Smaller meta line</Text>
            </View>

            <TouchableOpacity
              style={[s.bumpBtn, atMax && s.bumpBtnDisabled]}
              disabled={atMax}
              onPress={bumpUp}
              hitSlop={6}
            >
              <RNText style={s.bumpText}>+</RNText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.resetBtn} onPress={() => setScale(1.0)}>
            <RNText style={s.resetText}>Reset to default (100%)</RNText>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bumpBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  bumpBtnDisabled: { opacity: 0.35 },
  bumpText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  preview: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg,
    padding: 14,
    alignItems: 'flex-start',
  },
  previewLabel: {
    fontSize: 11, fontWeight: '900', letterSpacing: 1,
    color: theme.colors.accent, marginBottom: 6,
  },
  resetBtn: {
    marginTop: 14, alignSelf: 'center',
    paddingVertical: 8, paddingHorizontal: 14,
  },
  resetText: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
});
