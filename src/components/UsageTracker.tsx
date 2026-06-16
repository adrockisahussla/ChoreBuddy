import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { usageService } from '../services/usageService';
import { navigationRef, currentRouteName } from '../navigation/navigationRef';

/**
 * UsageTracker — invisible host (mounted once in App). While a signed-in
 * user is foregrounded it accumulates session time + per-screen time in
 * memory, then writes a single rolled-up record on backgrounding. Counts
 * an "open" each time the app comes to the foreground.
 *
 * No UI; safe to mount above the navigator. All writes are best-effort.
 */
export default function UsageTracker() {
  const { userDoc } = useCurrentUser();
  const who = useRef<{ uid: string; familyId: string; role?: string } | null>(null);

  const sessionStart = useRef<number | null>(null);
  const screenName = useRef<string | null>(null);
  const screenStart = useRef<number | null>(null);
  const screens = useRef<Record<string, number>>({});

  // keep latest identity available to listeners
  who.current = userDoc?.uid && userDoc?.familyId
    ? { uid: userDoc.uid, familyId: userDoc.familyId, role: (userDoc as any).role }
    : null;

  useEffect(() => {
    if (!who.current) return;
    const id = who.current;

    const beginScreen = () => {
      screenName.current = currentRouteName();
      screenStart.current = Date.now();
    };
    const accScreen = () => {
      if (screenStart.current && screenName.current) {
        const ms = Date.now() - screenStart.current;
        if (ms > 0) screens.current[screenName.current] = (screens.current[screenName.current] || 0) + ms;
      }
      screenStart.current = null;
    };
    const startSession = () => {
      usageService.logOpen(id);
      sessionStart.current = Date.now();
      beginScreen();
    };
    const endSession = () => {
      accScreen();
      const activeMs = sessionStart.current ? Date.now() - sessionStart.current : 0;
      const snap = screens.current;
      screens.current = {};
      sessionStart.current = null;
      usageService.flushSession(id, activeMs, snap);
    };

    // app already foreground at mount
    startSession();

    const onApp = (state: AppStateStatus) => {
      if (state === 'active') startSession();
      else if (state === 'background' || state === 'inactive') endSession();
    };
    const appSub = AppState.addEventListener('change', onApp);

    // per-screen timing: on each navigation, bank time for the old route
    let navUnsub = () => {};
    const attachNav = (tries = 0) => {
      if (navigationRef.isReady?.()) {
        navUnsub = navigationRef.addListener('state', () => {
          const next = currentRouteName();
          if (next !== screenName.current) { accScreen(); screenName.current = next; screenStart.current = Date.now(); }
        });
      } else if (tries < 20) {
        setTimeout(() => attachNav(tries + 1), 400);
      }
    };
    attachNav();

    return () => { appSub.remove(); navUnsub(); endSession(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.uid, userDoc?.familyId]);

  return null;
}
