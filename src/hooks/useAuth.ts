import { useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged(u => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  return { user, initializing };
}
