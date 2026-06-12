import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';
import { Header, Screen, Text, Button } from '../../components';
import { theme } from '../../theme';
import { locationService, distanceMeters } from '../../services/locationService';
import { TrackPoint } from '../../types';

export default function TrackMapScreen({ route, navigation }: any) {
  const trackId: string = route.params?.trackId;
  const title: string = route.params?.title || 'Travel Area';
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayIdx, setReplayIdx] = useState<number | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    locationService.getPoints(trackId).then(pts => {
      if (!alive) return;
      setPoints(pts);
      setLoading(false);
    });
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [trackId]);

  const coords: LatLng[] = points.map(p => ({ latitude: p.lat, longitude: p.lng }));

  useEffect(() => {
    if (coords.length && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 120, left: 60 },
        animated: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);

  const replay = () => {
    if (!coords.length) return;
    if (timer.current) clearInterval(timer.current);
    let i = 0;
    setReplayIdx(0);
    timer.current = setInterval(() => {
      i += 1;
      if (i >= coords.length) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        return;
      }
      setReplayIdx(i);
    }, 120);
  };

  const totalDist = points.reduce(
    (acc, p, i) => (i === 0 ? 0 : acc + distanceMeters(points[i - 1], { lat: p.lat, lng: p.lng })),
    0,
  );

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <Header title={title} onBackPress={() => navigation.goBack()} />
      {loading ? (
        <View style={s.center}><Text variant="empty">Loading path…</Text></View>
      ) : coords.length === 0 ? (
        <View style={s.center}><Text variant="empty">No GPS points were recorded for this track.</Text></View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            mapType="satellite"
            initialRegion={{
              latitude: coords[0].latitude,
              longitude: coords[0].longitude,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
          >
            <Polyline coordinates={coords} strokeColor={theme.colors.accent} strokeWidth={4} />
            <Marker coordinate={coords[0]} title="Start" pinColor={theme.colors.success} />
            <Marker coordinate={coords[coords.length - 1]} title="End" pinColor={theme.colors.danger} />
            {replayIdx != null && coords[replayIdx] && (
              <Marker coordinate={coords[replayIdx]} title="Replay" pinColor={theme.colors.accent} />
            )}
          </MapView>

          <View style={s.overlay}>
            <View style={s.statRow}>
              <Text variant="tiny">DISTANCE</Text>
              <Text variant="h3">{totalDist < 1000 ? `${Math.round(totalDist)} m` : `${(totalDist / 1000).toFixed(2)} km`}</Text>
            </View>
            <View style={s.statRow}>
              <Text variant="tiny">POINTS</Text>
              <Text variant="h3">{points.length}</Text>
            </View>
            <Button label="▶ Replay" variant="primary" onPress={replay} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  overlay: {
    position: 'absolute', left: 14, right: 14, bottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: theme.colors.card, borderRadius: theme.radius.xl,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    paddingHorizontal: 16, paddingVertical: 12, ...theme.shadow.card,
  },
  statRow: { alignItems: 'flex-start' },
});
