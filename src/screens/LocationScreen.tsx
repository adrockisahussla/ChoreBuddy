import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Header, Screen, Text, Button, SCREEN_BOTTOM_PAD } from '../components';
import { theme } from '../theme';
import { useTrackRecorder } from '../hooks/useTrackRecorder';
import { useTracks } from '../hooks/useTracks';
import { LocationTrack } from '../types';

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}
function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}
function fmtWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function LocationScreen({ navigation }: any) {
  const { recording, pointCount, distance, error, start, stop } = useTrackRecorder();
  const { tracks, loading } = useTracks();

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title="Location" onMenuPress={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: SCREEN_BOTTOM_PAD }}>
        {/* Recorder card */}
        <View style={s.card}>
          <View style={s.recRow}>
            <View style={[s.dot, recording && s.dotLive]} />
            <Text variant="h3">{recording ? 'Recording…' : 'Record my location'}</Text>
          </View>

          {recording && (
            <View style={s.stats}>
              <View style={s.stat}>
                <Text variant="tiny">POINTS</Text>
                <Text variant="h2">{pointCount}</Text>
              </View>
              <View style={s.stat}>
                <Text variant="tiny">DISTANCE</Text>
                <Text variant="h2">{fmtDist(distance)}</Text>
              </View>
            </View>
          )}

          {!!error && <Text variant="meta" color={theme.colors.danger} style={{ marginTop: 8 }}>{error}</Text>}

          <View style={{ marginTop: 14 }}>
            {recording
              ? <Button label="■ Stop & Save" variant="danger" full onPress={stop} />
              : <Button label="● Record my location" variant="primary" full onPress={start} />}
          </View>

          <Text variant="tiny" style={{ marginTop: 10 }}>
            Keep the app open while recording. Background tracking comes later.
          </Text>
        </View>

        {/* Recorded tracks */}
        <Text variant="sectionLabel" style={{ marginTop: 20 }}>Travel Areas</Text>
        {loading ? (
          <Text variant="empty">Loading…</Text>
        ) : tracks.length === 0 ? (
          <Text variant="empty">No recordings yet. Tap Record to make one.</Text>
        ) : (
          tracks.map((t: LocationTrack) => {
            const dur = t.endedAt && t.startedAt ? fmtDuration(t.endedAt - t.startedAt) : (t.status === 'recording' ? 'live' : '—');
            return (
              <TouchableOpacity
                key={t.id}
                style={s.trk}
                onPress={() => navigation.navigate('TrackMap', { trackId: t.id, title: `${t.userName} · ${fmtWhen(t.startedAt)}` })}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '700' }}>{t.userName}</Text>
                  <Text variant="tiny">{fmtWhen(t.startedAt)} · {t.pointCount || 0} pts · {dur}</Text>
                </View>
                <Text style={{ fontSize: 20 }}>🗺️</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.xxl, padding: theme.spacing.lg, ...theme.shadow.card },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.muted },
  dotLive: { backgroundColor: theme.colors.danger },
  stats: { flexDirection: 'row', gap: 14, marginTop: 14 },
  stat: { flex: 1, backgroundColor: theme.colors.bg, borderRadius: theme.radius.lg, padding: 12 },
  trk: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radius.lg, padding: 14, marginBottom: 8 },
});
