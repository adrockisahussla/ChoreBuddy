import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
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
 * Display a foreground notification telling a manager that a chore was
 * just submitted for their approval. Fired by usePendingChoreNotifier
 * when a chore in their family flips to status='pending'.
 */
/**
 * Display a foreground notification telling a buddy/co-manager that a
 * new chore has been assigned to them. Stable id so re-fire doesn't
 * stack duplicates.
 */
export async function notifyChoreAssigned(opts: {
  choreId: string;
  choreTitle: string;
  points: number;
  assignerName?: string;
}): Promise<void> {
  await ensureChannel();
  await notifee.displayNotification({
    id: `chore-assigned-${opts.choreId}`,
    title: '📋 New chore',
    body: opts.assignerName
      ? `${opts.assignerName} assigned "${opts.choreTitle}" — +${opts.points} pts`
      : `"${opts.choreTitle}" — +${opts.points} pts`,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
}

/**
 * Display a foreground notification telling a kid their chore was
 * rejected, with the parent's note inline. Used by useRejectedChoreNotifier.
 */
export async function notifyChoreRejected(opts: {
  choreId: string;
  choreTitle: string;
  rejectionNote: string;
  assignerName?: string;
}): Promise<void> {
  await ensureChannel();
  const body = opts.rejectionNote
    ? `${opts.assignerName || 'Manager'}: ${opts.rejectionNote}`
    : opts.assignerName
      ? `Rejected by ${opts.assignerName}`
      : 'Take another look and re-submit';
  await notifee.displayNotification({
    id: `chore-rejected-${opts.choreId}`,
    title: `✗ "${opts.choreTitle}" rejected`,
    body,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
}

/**
 * Display a foreground notification telling a kid that their reward
 * claim was approved (with minutes credited) or denied. Used by
 * useClaimResolvedNotifier.
 */
export async function notifyClaimResolved(opts: {
  claimId: string;
  approved: boolean;
  title: string;
  minutes?: number;
}): Promise<void> {
  await ensureChannel();
  const body = opts.approved
    ? opts.minutes
      ? `+${opts.minutes} min screen time added · "${opts.title}"`
      : `"${opts.title}" was approved`
    : `"${opts.title}" was denied`;
  await notifee.displayNotification({
    id: `claim-${opts.claimId}`,
    title: opts.approved ? '🎉 Reward unlocked' : '✗ Request denied',
    body,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
}

/**
 * Display a foreground notification telling a buddy/co-manager that the
 * chore they submitted was approved. Each chore gets its own
 * notification (stable id) so the shade stacks them rather than
 * collapsing into one.
 */
export async function notifyChoreApproved(opts: {
  choreId: string;
  choreTitle: string;
  points: number;
}): Promise<void> {
  await ensureChannel();
  await notifee.displayNotification({
    id: `chore-approved-${opts.choreId}`,
    title: '🎉 Chore approved',
    body: `"${opts.choreTitle}" — +${opts.points} points earned`,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
}

export async function notifyChoreSubmittedForApproval(opts: {
  choreId: string;
  choreTitle: string;
  buddyName?: string;
}): Promise<void> {
  await ensureChannel();
  await notifee.displayNotification({
    id: `chore-pending-${opts.choreId}`,
    title: '✋ Chore awaiting approval',
    body: opts.buddyName
      ? `${opts.buddyName} submitted "${opts.choreTitle}"`
      : `"${opts.choreTitle}" was submitted for review`,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
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

export type ScheduleFailReason =
  | 'past'
  | 'no-notification-perm'
  | 'no-exact-alarm-perm'
  | 'error';

export type ScheduleResult =
  | { ok: true; id: string }
  | { ok: false; reason: ScheduleFailReason; message?: string };

/**
 * Schedule a local notification to fire at `fireAt`. Returns a tagged
 * result so callers can distinguish past-time, missing-permission, and
 * unexpected errors and surface a specific message to the user.
 *
 * Notifee replaces an existing trigger with the same id (`reminder:<docId>`).
 */
export async function scheduleReminderNotification({
  reminderId, title, body, fireAt,
}: ScheduleArgs): Promise<ScheduleResult> {
  if (fireAt <= Date.now()) return { ok: false, reason: 'past' };
  try {
    await ensureChannel();
    const okNotif = await requestNotificationPermission();
    if (!okNotif) return { ok: false, reason: 'no-notification-perm' };
    const okAlarm = await canScheduleExactAlarms();
    if (!okAlarm) return { ok: false, reason: 'no-exact-alarm-perm' };

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
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          pressAction: { id: 'default', launchActivity: 'default' },
          fullScreenAction: { id: 'default', launchActivity: 'default' },
        },
      },
      trigger,
    );
    return { ok: true, id };
  } catch (e: any) {
    console.warn('scheduleReminderNotification failed', e);
    return { ok: false, reason: 'error', message: e?.message || String(e) };
  }
}

interface ChoreScheduleArgs {
  /** Firestore chore doc id. */
  choreId: string;
  /** 'pre' fires before due, 'overdue' fires at the due time. */
  phase: 'pre' | 'overdue';
  title: string;
  fireAt: number;
}

/**
 * Schedule a chore alarm. Same alarm-style routing as reminders, but
 * data payload carries kind='chore' so the overlay can deep-link to
 * the chore screen. Stable id: `chore:<docId>:<phase>`.
 */
export async function scheduleChoreNotification({
  choreId, phase, title, fireAt,
}: ChoreScheduleArgs): Promise<ScheduleResult> {
  if (fireAt <= Date.now()) return { ok: false, reason: 'past' };
  try {
    await ensureChannel();
    const okNotif = await requestNotificationPermission();
    if (!okNotif) return { ok: false, reason: 'no-notification-perm' };
    const okAlarm = await canScheduleExactAlarms();
    if (!okAlarm) return { ok: false, reason: 'no-exact-alarm-perm' };

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireAt,
      alarmManager: { allowWhileIdle: true },
    };

    const emoji = phase === 'overdue' ? '⏰' : '🔔';
    const headline = phase === 'overdue' ? `OVERDUE: ${title}` : title;

    const id = await notifee.createTriggerNotification(
      {
        id: `chore:${choreId}:${phase}`,
        title: `${emoji} ${headline}`,
        body: phase === 'overdue' ? 'This chore is now due.' : 'Coming up soon.',
        data: { choreId, kind: 'chore', phase },
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_launcher',
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          pressAction: { id: 'default', launchActivity: 'default' },
          fullScreenAction: { id: 'default', launchActivity: 'default' },
        },
      },
      trigger,
    );
    return { ok: true, id };
  } catch (e: any) {
    console.warn('scheduleChoreNotification failed', e);
    return { ok: false, reason: 'error', message: e?.message || String(e) };
  }
}

/**
 * Schedule the manager-side "time's up — block this PC now" notification
 * for a screen-time burn. Fires at `fireAt` on the manager's phone. The
 * actual SHUTOFF push to RTDB is done in the foreground by the
 * useScreenTimeBurner hook when it observes `expiresAt < now()`; the
 * notification is a UX nudge plus a fallback wake when the app has been
 * backgrounded long enough that snapshots stop arriving.
 *
 * Stable id `burn:<id>` so re-schedule replaces.
 */
export async function scheduleBurnExpiryNotification(opts: {
  burnId: string;
  kidName: string;
  machineName?: string;
  fireAt: number;
}): Promise<ScheduleResult> {
  if (opts.fireAt <= Date.now()) return { ok: false, reason: 'past' };
  try {
    await ensureChannel();
    const okNotif = await requestNotificationPermission();
    if (!okNotif) return { ok: false, reason: 'no-notification-perm' };
    const okAlarm = await canScheduleExactAlarms();
    if (!okAlarm) return { ok: false, reason: 'no-exact-alarm-perm' };

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: opts.fireAt,
      alarmManager: { allowWhileIdle: true },
    };

    const id = await notifee.createTriggerNotification(
      {
        id: `burn:${opts.burnId}`,
        title: `⏱ ${opts.kidName}'s screen time is up`,
        body: opts.machineName
          ? `Tap to block "${opts.machineName}" now.`
          : 'Tap to block their PC now.',
        data: { burnId: opts.burnId, kind: 'burn' },
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_launcher',
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          pressAction: { id: 'default', launchActivity: 'default' },
        },
      },
      trigger,
    );
    return { ok: true, id };
  } catch (e: any) {
    console.warn('scheduleBurnExpiryNotification failed', e);
    return { ok: false, reason: 'error', message: e?.message || String(e) };
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

export type AlarmKind = 'reminder' | 'chore';
export interface AlarmEvent { kind: AlarmKind; id: string; phase?: 'pre' | 'overdue' }

/**
 * Subscribe to foreground notification events. Fires on both DELIVERED
 * (alarm rings while app is open) and PRESS (user / fullScreenAction
 * brings the app forward). Handles both reminder and chore kinds.
 */
export function onForegroundAlarmEvent(handler: (event: AlarmEvent) => void): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    // EventType.PRESS = 1, EventType.DELIVERED = 3
    if (type !== 1 && type !== 3) return;
    const data = detail.notification?.data;
    if (!data?.kind) return;
    if (data.kind === 'reminder' && typeof data.reminderId === 'string') {
      handler({ kind: 'reminder', id: data.reminderId });
    } else if (data.kind === 'chore' && typeof data.choreId === 'string') {
      handler({
        kind: 'chore',
        id: data.choreId,
        phase: data.phase === 'overdue' ? 'overdue' : 'pre',
      });
    }
  });
}

/** Back-compat shim — still exported as `onForegroundReminderEvent` for
 *  existing callers; only fires for reminder kind. */
export function onForegroundReminderEvent(handler: (reminderId: string) => void): () => void {
  return onForegroundAlarmEvent(e => { if (e.kind === 'reminder') handler(e.id); });
}

/**
 * If the app was cold-started from an alarm notification (tap or
 * fullScreenAction), return the alarm shape so the overlay can be
 * rendered on mount. Returns null when the app was opened normally.
 */
export async function getInitialAlarmEvent(): Promise<AlarmEvent | null> {
  try {
    const initial = await notifee.getInitialNotification();
    const data = initial?.notification?.data;
    if (!data?.kind) return null;
    if (data.kind === 'reminder' && typeof data.reminderId === 'string') {
      return { kind: 'reminder', id: data.reminderId };
    }
    if (data.kind === 'chore' && typeof data.choreId === 'string') {
      return {
        kind: 'chore',
        id: data.choreId,
        phase: data.phase === 'overdue' ? 'overdue' : 'pre',
      };
    }
  } catch {}
  return null;
}

/** Back-compat shim — reminders only. */
export async function getInitialReminderId(): Promise<string | null> {
  const e = await getInitialAlarmEvent();
  return e?.kind === 'reminder' ? e.id : null;
}
