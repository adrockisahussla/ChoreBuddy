import { firebase } from '@react-native-firebase/app-check';

// Initializes App Check so Firestore/Auth reject requests that don't come
// from a verified install of this APK. In release builds we use Play
// Integrity; in dev/Metro we use the debug provider so the emulator and
// JS bundle from the dev server still work.
//
// Setup checklist (Firebase Console → Project settings → App Check):
//   1. Register the Android app (com.chorebuddy)
//   2. Paste the Play Integrity SHA-256 signing key
//   3. Enforce App Check on Cloud Firestore + Authentication
//
// Dev setup: when running a debug build for the first time, the device
// logs an App Check debug token. Copy it and add it to the App Check
// console under "Manage debug tokens" for the Android app.
export async function initializeAppCheck(): Promise<void> {
  try {
    const provider = firebase
      .appCheck()
      .newReactNativeFirebaseAppCheckProvider();

    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttest',
      },
    });

    await firebase.appCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('App Check init failed', e);
  }
}
