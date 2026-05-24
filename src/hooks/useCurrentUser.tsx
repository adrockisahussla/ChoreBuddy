import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from './useAuth';
import { userService } from '../services/userService';
import { User } from '../types';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

type CurrentUserCtx = {
  fbUser: FirebaseAuthTypes.User | null;
  userDoc: User | null;
  loading: boolean;
};

const CurrentUserContext = createContext<CurrentUserCtx | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { user: fbUser, initializing } = useAuth();
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const creatingForUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializing) return;
    if (!fbUser) {
      setUserDoc(null);
      setLoading(false);
      creatingForUidRef.current = null;
      return;
    }

    setLoading(true);
    let cancelled = false;

    // Subscribe to the user doc so any update — accept-invite flipping
    // familyId/role, in-app profile edits, etc. — propagates to every
    // family-scoped hook (useFamilyId, useBuddies, useChores...) without
    // requiring an app restart.
    const ref = firestore().collection('users').doc(fbUser.uid);
    const unsubscribe = ref.onSnapshot(
      async (snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setUserDoc({ id: snap.id, ...(snap.data() as any) } as User);
          setLoading(false);
          return;
        }
        // No doc — kick off first-time creation once. Guard against
        // concurrent triggers (snapshot may fire multiple times during
        // the create) by tracking which uid we're already creating for.
        if (creatingForUidRef.current === fbUser.uid) return;
        creatingForUidRef.current = fbUser.uid;
        try {
          await userService.createForNewSignIn(
            fbUser.uid,
            fbUser.email,
            fbUser.displayName,
          );
          // No setUserDoc here — the snapshot listener will fire again
          // with the newly-created doc and set state then.
        } catch (e) {
          console.warn('createForNewSignIn failed', e);
          if (!cancelled) setLoading(false);
        }
      },
      (err) => {
        console.warn('userDoc snapshot error', err);
        if (!cancelled) setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [fbUser, initializing]);

  return (
    <CurrentUserContext.Provider value={{ fbUser, userDoc, loading: initializing || loading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserCtx {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within <CurrentUserProvider>');
  }
  return ctx;
}
