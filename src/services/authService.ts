import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import notifee from '@notifee/react-native';

export const authService = {
  signInWithGoogle: async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result: any = await GoogleSignin.signIn();
    // v13+ returns { type, data: { idToken, ... } }; older returned the data directly
    const idToken: string | null = result?.data?.idToken ?? result?.idToken ?? null;
    if (!idToken) throw new Error('Google sign-in did not return an ID token');
    const credential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(credential);
  },
  /** Sign out and (optionally) cancel every scheduled Notifee trigger
   *  so reminders/chore alarms set under this account don't ring under
   *  the next account's session on the same phone. Trade-off: if no one
   *  signs back in before fire-time, the alarm is lost. */
  signOut: async (opts?: { cancelAlarms?: boolean }) => {
    if (opts?.cancelAlarms) {
      try { await notifee.cancelAllNotifications(); } catch { /* non-fatal */ }
    }
    try { await GoogleSignin.signOut(); } catch { /* ignore */ }
    await auth().signOut();
  },
};
