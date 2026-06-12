import { useCallback, useEffect, useRef, useState } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { locationService, distanceMeters } from '../services/locationService';
import { requestLocationPermission } from '../services/permissions';
import { useCurrentUser } from './useCurrentUser';

// Foreground GPS recorder. Starts a `tracks` session, then writes one point
// per fix (~every 4s) to its `points` subcollection. Background/locked-screen
// tracking is a later phase — this records while the app is open.
const SAMPLE_MS = 4000;

export function useTrackRecorder() {
  const { fbUser, userDoc } = useCurrentUser();
  const [recording, setRecording] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const trackId = useRef<string | null>(null);
  const seq = useRef(0);
  const lastFix = useRef<{ lat: number; lng: number } | null>(null);

  const stop = useCallback(async () => {
    if (watchId.current != null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    const id = trackId.current;
    trackId.current = null;
    setRecording(false);
    if (id) {
      try { await locationService.endTrack(id); } catch (e) { /* best-effort close */ }
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!fbUser?.uid || !userDoc?.familyId) {
      setError('You must be signed in to record.');
      return;
    }
    const ok = await requestLocationPermission();
    if (!ok) {
      setError('Location permission denied.');
      return;
    }

    seq.current = 0;
    lastFix.current = null;
    setPointCount(0);
    setDistance(0);

    try {
      trackId.current = await locationService.startTrack(
        userDoc.familyId,
        fbUser.uid,
        userDoc.displayName || fbUser.displayName || 'Member',
      );
    } catch (e) {
      setError('Could not start recording: ' + String(e));
      return;
    }
    setRecording(true);

    watchId.current = Geolocation.watchPosition(
      pos => {
        const id = trackId.current;
        if (!id) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy ?? null;
        if (lastFix.current) {
          setDistance(d => d + distanceMeters(lastFix.current!, { lat, lng }));
        }
        lastFix.current = { lat, lng };
        seq.current += 1;
        const n = seq.current;
        setPointCount(n);
        locationService.addPoint(id, { lat, lng, acc, seq: n }).catch(() => {});
        locationService.bumpCount(id, n).catch(() => {});
      },
      err => setError('GPS error: ' + err.message),
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: SAMPLE_MS,
        fastestInterval: SAMPLE_MS,
      },
    );
  }, [fbUser, userDoc]);

  // Safety: stop watching if the component using this unmounts mid-record.
  useEffect(() => {
    return () => {
      if (watchId.current != null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  return { recording, pointCount, distance, error, start, stop };
}
