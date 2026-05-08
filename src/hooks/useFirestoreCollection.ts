import { useEffect, useState } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/**
 * Generic real-time Firestore collection hook.
 * Pass deps so the subscription re-runs when scoping values (e.g. familyId) change.
 * Returning a falsy value from queryBuilder means "skip" — sets items=[] and stays loading=false.
 */
export function useFirestoreCollection<T>(
  collectionName: string,
  queryBuilder?: (q: FirebaseFirestoreTypes.CollectionReference<FirebaseFirestoreTypes.DocumentData>) => FirebaseFirestoreTypes.Query | null,
  deps: any[] = []
): { items: T[]; loading: boolean } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = firestore().collection(collectionName);
    const q = queryBuilder ? queryBuilder(ref) : ref;
    if (!q) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = q.onSnapshot(
      snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
        setLoading(false);
      },
      err => {
        console.warn(`[${collectionName}] snapshot error:`, err);
        setLoading(false);
      }
    );
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, ...deps]);

  return { items, loading };
}
