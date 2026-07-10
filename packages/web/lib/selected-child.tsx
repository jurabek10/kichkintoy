"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { MyJoinRequest, ParentChild } from "@kichkintoy/shared";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";

/**
 * The parent's globally selected kid. Every parent page scopes its data to
 * this child; the header switcher changes it. The choice survives reloads via
 * localStorage and silently falls back to the primary (first) kid when the
 * stored id no longer belongs to this account.
 */

const STORAGE_KEY = "kichkintoy.selectedChildId";

type SelectedChildValue = {
  /** All active kids the parent guards, primary first. */
  children: ParentChild[];
  /** The parent's own pending "add a kid" requests. */
  pendingRequests: MyJoinRequest[];
  /** The selected kid — null only while loading or when there are none. */
  child: ParentChild | null;
  /** Convenience: `child?.id ?? ""` for query inputs. */
  childId: string;
  select: (childId: string) => void;
  isPending: boolean;
};

const SelectedChildContext = createContext<SelectedChildValue | null>(null);

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const enabled =
    session?.user.role === "parent" && session.membership.status === "active";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    setSelectedId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const childrenQuery = useQuery({
    queryKey: queryKeys.profile.children(),
    queryFn: () => orpc.profile.listChildren({}),
    enabled,
  });
  const pendingQuery = useQuery({
    queryKey: queryKeys.profile.joinRequests(),
    queryFn: () => orpc.profile.myJoinRequests({}),
    enabled,
  });

  const kids = useMemo(
    () => childrenQuery.data ?? [],
    [childrenQuery.data],
  );
  const child = kids.find((kid) => kid.id === selectedId) ?? kids[0] ?? null;

  const select = useCallback((childId: string) => {
    setSelectedId(childId);
    window.localStorage.setItem(STORAGE_KEY, childId);
  }, []);

  const value = useMemo<SelectedChildValue>(
    () => ({
      children: kids,
      pendingRequests: pendingQuery.data ?? [],
      child,
      childId: child?.id ?? "",
      select,
      isPending: enabled ? childrenQuery.isPending : false,
    }),
    [kids, pendingQuery.data, child, select, enabled, childrenQuery.isPending],
  );

  return (
    <SelectedChildContext.Provider value={value}>
      {children}
    </SelectedChildContext.Provider>
  );
}

export function useSelectedChild(): SelectedChildValue {
  const value = useContext(SelectedChildContext);
  if (!value) {
    throw new Error(
      "useSelectedChild must be used inside SelectedChildProvider",
    );
  }
  return value;
}
