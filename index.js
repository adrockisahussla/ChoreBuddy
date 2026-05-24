/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry, NativeModules } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Background handler for Notifee. When a reminder is delivered while
// the app is backgrounded/killed, draw a TYPE_APPLICATION_OVERLAY on
// top of whatever the user is doing. Samsung/OEM builds block activity
// launches from background even with SYSTEM_ALERT_WINDOW, so we don't
// try to launch MainActivity — we draw directly with WindowManager.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // EventType.DELIVERED = 3
  if (type !== 3) return;
  const data = detail.notification?.data;
  if (!data?.kind) return;
  const rawTitle = detail.notification?.title?.replace(/^[🔔⏰]\s*/, '') || '';
  const targetId = data.kind === 'chore'
    ? String(data.choreId || '')
    : String(data.reminderId || '');
  const displayTitle = rawTitle || (data.kind === 'chore' ? 'Chore' : 'Reminder');
  try {
    NativeModules.AlarmOverlay?.show(displayTitle, String(data.kind), targetId);
  } catch {}
});

AppRegistry.registerComponent(appName, () => App);
