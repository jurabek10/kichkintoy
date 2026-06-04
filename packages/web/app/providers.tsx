"use client";

import { useEffect, useState } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { onlineManager } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query";
import { createIdbPersister } from "@/lib/query-persister";
import { registerOfflineMutations } from "@/lib/offline-mutations";

// Bump to invalidate every persisted cache after a breaking schema/shape change.
const PERSIST_BUSTER = "v1";
// Drop cached reads older than a day; fresh data is fetched in the background.
const MAX_AGE = 1000 * 60 * 60 * 24;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = getQueryClient();
    registerOfflineMutations(client);
    return client;
  });
  const [persister] = useState(() => createIdbPersister());

  // Replay queued offline writes whenever connectivity returns.
  useEffect(() => {
    return onlineManager.subscribe((online) => {
      if (online) void queryClient.resumePausedMutations();
    });
  }, [queryClient]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: MAX_AGE,
        buster: PERSIST_BUSTER,
        dehydrateOptions: {
          // Persist only successfully-loaded queries (skip pending/errored).
          // Paused offline mutations are persisted via the default mutation rule.
          shouldDehydrateQuery: (query) => query.state.status === "success",
        },
      }}
      // After the persisted cache is restored, flush any queued offline writes.
      onSuccess={() => {
        void queryClient.resumePausedMutations();
      }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </PersistQueryClientProvider>
  );
}
