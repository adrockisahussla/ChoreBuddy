import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text as RNText, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { resetWeeklyChores } from './src/services/choreService';
import { configureGoogleSignin } from './src/config/google';
import { initializeAppCheck } from './src/config/appCheck';
import AuthGateway from './src/AuthGateway';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import { ConfirmProvider } from './src/components/ConfirmModal';
import { CelebrationProvider } from './src/components/Celebration';
import SubmissionToasts from './src/components/SubmissionToasts';
import ReminderAlarmHost from './src/components/ReminderAlarmHost';
import { CurrentUserProvider } from './src/hooks/useCurrentUser';
import { TextScaleProvider } from './src/context/TextScaleContext';
import { getTextScale } from './src/utils/textScale';
import { useReminderScheduling } from './src/hooks/useReminderScheduling';
import { useChoreReminderScheduling } from './src/hooks/useChoreReminderScheduling';
import { usePendingChoreNotifier } from './src/hooks/usePendingChoreNotifier';
import { useApprovedChoreNotifier } from './src/hooks/useApprovedChoreNotifier';
import { useAssignedChoreNotifier } from './src/hooks/useAssignedChoreNotifier';
import { useClaimResolvedNotifier } from './src/hooks/useClaimResolvedNotifier';
import { useRejectedChoreNotifier } from './src/hooks/useRejectedChoreNotifier';
import { useScreenTimeBurner } from './src/hooks/useScreenTimeBurner';
import { useCollectExpirySweep } from './src/hooks/useCollectExpirySweep';

configureGoogleSignin();
// App Check temporarily disabled until Play Integrity API is enabled in
// Google Cloud Console. With it on, sideloaded builds hit a
// "caller doesn't have permission" attestation failure that breaks
// Firestore writes even though enforcement is off. Re-enable once Play
// Integrity is wired up in the console.
// initializeAppCheck();

// Patch React Native's <Text> render so any *raw* RNText in the codebase
// (chevrons, drawer labels, screen-level inline text, etc.) also picks up
// the in-app text-scale multiplier. The wrapper Text component handles its
// own scaling via context; this patch covers everything else, and the
// `epoch` key bump in App's tree forces re-render when scale changes so
// these patched elements pick up the new value.
//
// Also forces allowFontScaling=false so the OS-level "Font size" setting
// doesn't compound on top of the in-app slider.
function patchRNTextScaling() {
  const RNTextAny = RNText as any;
  if (RNTextAny.__appScalePatched) return;
  RNTextAny.__appScalePatched = true;
  const originalRender = RNTextAny.render;
  if (typeof originalRender !== 'function') return;
  RNTextAny.render = function patchedRender(...args: any[]) {
    const tree = originalRender.apply(this, args);
    if (!tree || !tree.props) return tree;
    const newProps: any = {};
    if (tree.props.allowFontScaling === undefined) {
      newProps.allowFontScaling = false;
    }
    const flat = StyleSheet.flatten(tree.props.style) || {};
    if (typeof flat.fontSize === 'number') {
      newProps.style = [tree.props.style, { fontSize: flat.fontSize * getTextScale() }];
    }
    return Object.keys(newProps).length
      ? { ...tree, props: { ...tree.props, ...newProps } }
      : tree;
  };
}
patchRNTextScaling();

/** Deep-link config: chorebuddy://chore/<id> → MyChores (buddy-only screen;
 *  managers don't get chore alarms so the manager case is moot). Reminder
 *  links land on the Reminders screen, which is role-aware for both roles. */
const linking: LinkingOptions<any> = {
  prefixes: ['chorebuddy://'],
  config: {
    screens: {
      MyChores: 'chore/:id',
      Reminders: 'reminder/:id',
    },
  },
};

/** Mount inside AuthGateway so it can call useReminders (needs familyId). */
function ReminderSchedulerHost() {
  useReminderScheduling();
  useChoreReminderScheduling();
  usePendingChoreNotifier();
  useApprovedChoreNotifier();
  useAssignedChoreNotifier();
  useClaimResolvedNotifier();
  useRejectedChoreNotifier();
  useScreenTimeBurner();
  useCollectExpirySweep();
  return null;
}

/** Mount once after auth — fires the Notifee POST_NOTIFICATIONS prompt the
 *  first time per app launch. Exact-alarm + overlay can't be requested
 *  in-app; users grant them via the Settings screen. */
function PermissionsBoot() {
  const askedRef = React.useRef(false);
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    import('./src/services/permissions').then(m => m.requestReminderPermissions()).catch(() => {});
  }, []);
  return null;
}

export default function App() {
  useEffect(() => {
    resetWeeklyChores(firestore()).catch(e => console.warn('resetWeeklyChores failed', e));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CurrentUserProvider>
          <TextScaleProvider>
            <AuthGateway>
              <CelebrationProvider>
                <SubmissionToasts />
                <ConfirmProvider>
                  <NavigationContainer linking={linking}>
                    <DrawerNavigator />
                  </NavigationContainer>
                </ConfirmProvider>
                <ReminderAlarmHost />
                <ReminderSchedulerHost />
                <PermissionsBoot />
              </CelebrationProvider>
            </AuthGateway>
          </TextScaleProvider>
        </CurrentUserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
