import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let doc = await userService.getByUid(fbUser.uid);
        if (!doc) {
          if (creatingForUidRef.current === fbUser.uid) {
            if (!cancelled) setLoading(false);
            return;
          }
          creatingForUidRef.current = fbUser.uid;
          doc = await userService.createForNewSignIn(
            fbUser.uid,
            fbUser.email,
            fbUser.displayName,
          );
        }
        if (!cancelled) {
          setUserDoc(doc ?? null);
          setLoading(false);
        }
      } catch (e) {
        console.warn('CurrentUserProvider load failed', e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
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
