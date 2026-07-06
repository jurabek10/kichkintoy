"use client";

import { useEffect, useState } from "react";
import type { AuthResponse, Membership } from "@kichkintoy/shared";
import { orpc } from "./orpc";
import { getQueryClient } from "./query";
import { clearPersistedQueryCache } from "./query-persister";
import { authTokenStorageKey } from "./config";

export type StoredSession = {
  token: string;
  user: AuthResponse["user"];
  membership: Membership;
};

const sessionStorageKey = "kichkintoy_auth_session";

export function persistSession(response: AuthResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(authTokenStorageKey, response.session.token);
  const stored: StoredSession = {
    token: response.session.token,
    user: response.user,
    membership: response.membership,
  };
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(stored));
  window.dispatchEvent(new Event("kichkintoy:session"));
}

export function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(authTokenStorageKey);
  window.localStorage.removeItem(sessionStorageKey);
  window.dispatchEvent(new Event("kichkintoy:session"));
  // Drop cached data (may contain children's info) from memory and IndexedDB.
  getQueryClient().clear();
  void clearPersistedQueryCache();
}

export function useSession(): {
  session: StoredSession | null;
  loading: boolean;
} {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(readSession());
    setLoading(false);

    const onChange = () => setSession(readSession());
    window.addEventListener("kichkintoy:session", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("kichkintoy:session", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return { session, loading };
}

/**
 * Patch the locally stored user (e.g. after editing the profile) so the
 * dashboard header reflects the change without a full re-login.
 */
export function updateStoredUser(patch: Partial<StoredSession["user"]>) {
  if (typeof window === "undefined") return;
  const stored = readSession();
  if (!stored) return;
  const next: StoredSession = {
    ...stored,
    user: { ...stored.user, ...patch },
  };
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(next));
  window.dispatchEvent(new Event("kichkintoy:session"));
}

export async function logoutAndClear(token: string | null) {
  if (token) {
    try {
      await orpc.auth.logout({ token });
    } catch {
      // best-effort logout; clear locally regardless
    }
  }
  clearSession();
}

export function routeForMembership(
  _role: AuthResponse["user"]["role"],
  membership: Membership,
): string {
  if (membership.status === "pending") return "/pending";
  return "/dashboard";
}
