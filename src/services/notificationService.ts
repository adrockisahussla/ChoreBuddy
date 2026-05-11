import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'chorebuddy-reminders';

let channelEnsured = false;

/**
 * Ensure the Android notification channel exists. Safe to call multiple
 * times; only does work on first call.
 */
async function ensureChannel(): Promise<void> {
  if (channelEnsured || Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });
  channelEnsured = true;
}

/**
 * Request notification permission. Required on Android 13+ at runtime.
 * Safe to call repeatedly; the OS handles "already granted" silently.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  } catch {
    return false;
  }
}

/**
 * Check whether the user has granted permission to schedule **exact**
 * alarms (Android 12+). Required for reliable timestamp-based reminders.
 * If false, the OS may delay notifications or batch them.
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.android.alarm === AndroidNotificationSetting.ENABLED;
  } catch {
    return true;
  }
}

interface ScheduleArgs {
  /** Firestore reminder doc id — used as a stable key for cancel/update. */
  reminderId: string;
  title: string;
  body: string;
  /** Epoch ms when the notification should fire. */
  fireAt: number;
}

/**
 * Schedule a local notification to fire at `fireAt`. Returns the
 * Notifee notification id (or empty string if scheduling failed) so
 * the caller can persist it on the reminder doc.
 *
 * If `fireAt` is in the past, no-ops and returns ''.
 */
export async function scheduleReminderNotification({
  reminderId, title, body, fireAt,
}: ScheduleArgs): Promise<string> {
  if (fireAt <= Date.now()) return '';
  try {
    await ensureChannel();
    await requestNotificationPermission();

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireAt,
      alarmManager: { allowWhileIdle: true },
    };

    const id = await notifee.createTriggerNotification(
      {
        id: `reminder:${reminderId}`,
        title: `🔔 ${title}`,
        body,
        data: { reminderId, kind: 'reminder' },
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default', launchActivity: 'default' },
          // For now: standard notification. Phase 2 wires up
          // fullScreenAction when the user toggles "alarm-style" in Settings.
        },
      },
      trigger,
    );
    return id;
  } catch (e) {
    console.warn('scheduleReminderNotification failed', e);
    return '';
  }
}

/** Cancel a previously scheduled notification by Notifee id. */
export async function cancelReminderNotification(id: string): Promise<void> {
  if (!id) return;
  try {
    await notifee.cancelTriggerNotification(id);
  } catch (e) {
    console.warn('cancelReminderNotification failed', e);
  }
}

/**
 * Subscribe to foreground notification events. Call once at app startup
 * (e.g. in App.tsx) to wire reminders firing while the app is open
 * into the in-app full-screen alarm overlay.
 */
export function onForegroundReminderEvent(handler: (reminderId: string) => void): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === 1 /* DELIVERED */ && detail.notification?.data?.kind === 'reminder') {
      const reminderId = detail.notification.data.reminderId as string;
      if (reminderId) handler(reminderId);
    }
  });
}
