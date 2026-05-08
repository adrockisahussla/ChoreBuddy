import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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
  signOut: async () => {
    try { await GoogleSignin.signOut(); } catch { /* ignore */ }
    await auth().signOut();
  },
};
