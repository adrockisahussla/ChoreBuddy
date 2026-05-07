import { useEffect, useState } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/**
 * Generic real-time Firestore collection hook.
 * Optionally accepts a query builder to scope/filter the collection.
 */
export function useFirestoreCollection<T>(
  collectionName: string,
  queryBuilder?: (q: FirebaseFirestoreTypes.CollectionReference<FirebaseFirestoreTypes.DocumentData>) => FirebaseFirestoreTypes.Query
): { items: T[]; loading: boolean } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = firestore().collection(collectionName);
    const q = queryBuilder ? queryBuilder(ref) : ref;
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
  // queryBuilder intentionally not in deps — pass a stable ref if you want to refetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName]);

  return { items, loading };
}
