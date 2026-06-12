import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';

const { ChoreBuddyPermissions } = NativeModules as {
  ChoreBuddyPermissions?: {
    check: () => Promise<{ exactAlarms: boolean; overlay: boolean }>;
    openAlarmSettings: () => void;
    openOverlaySettings: () => void;
    openAppNotificationSettings: () => void;
  };
};

export interface PermissionStatus {
  /** POST_NOTIFICATIONS (Android 13+). False means alarms display nothing. */
  notifications: boolean;
  /** SCHEDULE_EXACT_ALARM (Android 12+). False means alarms get batched. */
  exactAlarms: boolean;
  /** SYSTEM_ALERT_WINDOW. False means the in-app full-screen overlay won't draw. */
  overlay: boolean;
  /** True iff all three of the above are granted. */
  allGranted: boolean;
}

/** Pure check — no prompts. */
export async function checkReminderPermissions(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { notifications: true, exactAlarms: true, overlay: true, allGranted: true };
  }
  let notifications = false;
  try {
    const s = await notifee.getNotificationSettings();
    notifications = s.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  } catch {}
  let exactAlarms = true;
  let overlay = true;
  try {
    const native = await ChoreBuddyPermissions?.check();
    if (native) {
      exactAlarms = !!native.exactAlarms;
      overlay = !!native.overlay;
    }
  } catch {}
  const allGranted = notifications && exactAlarms && overlay;
  return { notifications, exactAlarms, overlay, allGranted };
}

/** Fire Notifee's in-app POST_NOTIFICATIONS prompt (the only one we can show
 *  in-app — exact-alarm and overlay require routing the user to Settings).
 *  Returns the resulting status. */
export async function requestReminderPermissions(): Promise<PermissionStatus> {
  if (Platform.OS === 'android') {
    try { await notifee.requestPermission(); } catch {}
  }
  return checkReminderPermissions();
}

/** Request foreground location (ACCESS_FINE_LOCATION). Returns true if granted.
 *  Background/while-locked tracking is a later phase — this covers recording
 *  while the app is open. */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location access',
        message: 'ChoreBuddy needs your location to record where you go on a property.',
        buttonPositive: 'Allow',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function openAlarmSettings(): void {
  ChoreBuddyPermissions?.openAlarmSettings();
}

export function openOverlaySettings(): void {
  ChoreBuddyPermissions?.openOverlaySettings();
}

export function openAppNotificationSettings(): void {
  ChoreBuddyPermissions?.openAppNotificationSettings();
}
