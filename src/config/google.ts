import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const WEB_CLIENT_ID =
  '858139388832-lcmr06c4pf64m3fp4p4ivf8fcj47it23.apps.googleusercontent.com';

let configured = false;
export const configureGoogleSignin = () => {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
};
