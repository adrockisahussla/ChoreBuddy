import firestore from '@react-native-firebase/firestore';
import { TrackPoint } from '../types';

// One recording session = one doc in `tracks`; its GPS samples live in the
// `points` subcollection. Family-scoped like every other collection.
const tracks = () => firestore().collection('tracks');

export const locationService = {
  /** Open a new recording session; returns the track id. */
  startTrack: async (familyId: string, userId: string, userName: string): Promise<string> => {
    const ref = await tracks().add({
      familyId,
      userId,
      userName,
      status: 'recording',
      startedAt: Date.now(),
      endedAt: null,
      pointCount: 0,
      createdAt: Date.now(),
    });
    return ref.id;
  },

  /** Append a single GPS sample to a track. */
  addPoint: (trackId: string, p: Omit<TrackPoint, 't'> & { t?: number }) =>
    tracks().doc(trackId).collection('points').add({
      lat: p.lat,
      lng: p.lng,
      acc: p.acc ?? null,
      seq: p.seq,
      t: p.t ?? Date.now(),
    }),

  /** Keep the track doc's running point count in sync (for the list view). */
  bumpCount: (trackId: string, count: number) =>
    tracks().doc(trackId).update({ pointCount: count }),

  /** Close the session. */
  endTrack: (trackId: string) =>
    tracks().doc(trackId).update({ status: 'done', endedAt: Date.now() }),

  remove: (trackId: string) => tracks().doc(trackId).delete(),

  /** Read all points of a track, ordered. */
  getPoints: async (trackId: string): Promise<TrackPoint[]> => {
    const snap = await tracks().doc(trackId).collection('points').orderBy('seq').get();
    return snap.docs.map(d => d.data() as TrackPoint);
  },
};

/** Metres between two lat/lng points (haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
