import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * The parent's globally selected kid (Kidsnote-style). The home-header switcher
 * changes it and every screen scopes to it via `useCurrentChild()`. The choice
 * survives restarts via AsyncStorage; a stale id silently falls back to the
 * first (primary) kid.
 */

const STORAGE_KEY = 'kichkintoy.selectedChildId';

type SelectedChildContextValue = {
  selectedChildId: string | null;
  select: (childId: string) => void;
};

const SelectedChildContext = createContext<SelectedChildContextValue | null>(null);

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled && value) setSelectedChildId(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SelectedChildContextValue>(
    () => ({
      selectedChildId,
      select: (childId: string) => {
        setSelectedChildId(childId);
        void AsyncStorage.setItem(STORAGE_KEY, childId);
      },
    }),
    [selectedChildId],
  );

  return <SelectedChildContext.Provider value={value}>{children}</SelectedChildContext.Provider>;
}

export function useSelectedChildId(): SelectedChildContextValue {
  const value = useContext(SelectedChildContext);
  if (!value) throw new Error('useSelectedChildId must be used within SelectedChildProvider');
  return value;
}
