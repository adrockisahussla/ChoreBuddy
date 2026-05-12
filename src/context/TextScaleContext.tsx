import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { userService } from '../services/userService';
import {
  setTextScale, getTextScale, subscribeTextScale,
  TEXT_SCALE_MIN, TEXT_SCALE_MAX, TEXT_SCALE_STEP,
} from '../utils/textScale';

interface Ctx {
  /** Current scale multiplier (1.0 = design size). */
  scale: number;
  /** Set absolute scale value; persists to the user's Firestore doc. */
  setScale: (v: number) => void;
  /** Bump scale by +TEXT_SCALE_STEP. */
  bumpUp: () => void;
  /** Bump scale by -TEXT_SCALE_STEP. */
  bumpDown: () => void;
  min: number;
  max: number;
  step: number;
  /** Re-render epoch — increment forces subtree remount so raw RNText picks up new scale. */
  epoch: number;
}

const TextScaleContext = createContext<Ctx | null>(null);

export function useTextScale(): Ctx {
  const ctx = useContext(TextScaleContext);
  if (!ctx) throw new Error('useTextScale must be used within TextScaleProvider');
  return ctx;
}

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
  const { userDoc } = useCurrentUser();
  const [scale, setScaleState] = useState<number>(getTextScale());
  const [epoch, setEpoch] = useState(0);

  // Hydrate from the user doc when it loads / changes.
  useEffect(() => {
    if (userDoc?.textScale && userDoc.textScale !== getTextScale()) {
      setTextScale(userDoc.textScale);
    }
  }, [userDoc?.textScale]);

  // Subscribe to module-level changes so the context value tracks them.
  useEffect(() => {
    return subscribeTextScale(() => {
      setScaleState(getTextScale());
      setEpoch(e => e + 1);
    });
  }, []);

  const persist = useCallback((next: number) => {
    setTextScale(next);
    if (userDoc?.id) {
      userService.update(userDoc.id, { textScale: getTextScale() }).catch(() => {});
    }
  }, [userDoc?.id]);

  const setScale = useCallback((v: number) => persist(v), [persist]);
  const bumpUp = useCallback(() => persist(getTextScale() + TEXT_SCALE_STEP), [persist]);
  const bumpDown = useCallback(() => persist(getTextScale() - TEXT_SCALE_STEP), [persist]);

  return (
    <TextScaleContext.Provider
      value={{
        scale,
        setScale,
        bumpUp,
        bumpDown,
        min: TEXT_SCALE_MIN,
        max: TEXT_SCALE_MAX,
        step: TEXT_SCALE_STEP,
        epoch,
      }}
    >
      {children}
    </TextScaleContext.Provider>
  );
}
