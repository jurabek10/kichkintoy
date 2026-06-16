import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse } from '@kichkintoy/shared';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { sessionStorageKey } from './config';
import { orpc, setAuthToken } from './orpc';
import { queryClient } from './query';

export type StoredSession = {
  token: string;
  user: AuthResponse['user'];
  membership: AuthResponse['membership'];
};

type AuthContextValue = {
  session: StoredSession | null;
  /** True until the persisted session has been read from storage. */
  loading: boolean;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a persisted session on launch.
  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(sessionStorageKey);
        if (raw) {
          const stored = JSON.parse(raw) as StoredSession;
          setAuthToken(stored.token);
          setSession(stored);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(response: AuthResponse) {
    const stored: StoredSession = {
      token: response.session.token,
      user: response.user,
      membership: response.membership,
    };
    setAuthToken(stored.token);
    await AsyncStorage.setItem(sessionStorageKey, JSON.stringify(stored));
    setSession(stored);
  }

  async function signOut() {
    try {
      await orpc.auth.logout({ token: session?.token });
    } catch {
      // best-effort; clear locally regardless
    }
    setAuthToken(null);
    await AsyncStorage.removeItem(sessionStorageKey);
    queryClient.clear();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
