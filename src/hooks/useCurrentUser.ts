import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { userService } from '../services/userService';
import { User } from '../types';

export function useCurrentUser() {
  const { user: fbUser, initializing } = useAuth();
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initializing) return;
    if (!fbUser) {
      setUserDoc(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let doc = await userService.getByUid(fbUser.uid);
        if (!doc) {
          doc = await userService.createForNewSignIn(
            fbUser.uid,
            fbUser.email,
            fbUser.displayName
          );
        }
        if (!cancelled) {
          setUserDoc(doc);
          setLoading(false);
        }
      } catch (e) {
        console.warn('useCurrentUser failed', e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fbUser, initializing]);

  return { fbUser, userDoc, loading: initializing || loading };
}
