import { useMemo } from 'react';
import { useFirestoreCollection } from './useFirestoreCollection';
import { useCurrentUser } from './useCurrentUser';
import { LocationTrack } from '../types';

/** Real-time list of recorded tracks for the current family, newest first. */
export function useTracks(): { tracks: LocationTrack[]; loading: boolean } {
  const { userDoc } = useCurrentUser();
  const familyId = userDoc?.familyId;

  const { items, loading } = useFirestoreCollection<LocationTrack>(
    'tracks',
    q => (familyId ? q.where('familyId', '==', familyId) : null),
    [familyId],
  );

  const tracks = useMemo(
    () => [...items].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)),
    [items],
  );

  return { tracks, loading };
}
