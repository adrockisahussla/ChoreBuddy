import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * App-wide navigation ref. Attached to the root NavigationContainer so
 * non-screen code (e.g. UsageTracker, feedback capture) can read the
 * current route — its name IS the "page + state" we log.
 */
export const navigationRef = createNavigationContainerRef<any>();

export function currentRouteName(): string | null {
  try {
    return navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name ?? null : null;
  } catch {
    return null;
  }
}
