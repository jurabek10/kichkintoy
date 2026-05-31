import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

// One IndexedDB key holds the whole dehydrated query cache.
const CACHE_KEY = "kichkintoy-query-cache";

// IndexedDB-backed persister: the read cache survives reloads, so the app opens
// instantly with the last-seen data and serves reads offline — the key win for
// Uzbekistan's slow / intermittent connections. IndexedDB (vs localStorage) is
// async and roomy enough for the data + photos metadata we cache.
export function createIdbPersister() {
  return createAsyncStoragePersister({
    key: CACHE_KEY,
    storage: {
      getItem: async (key) => (await get<string>(key)) ?? null,
      setItem: (key, value) => set(key, value),
      removeItem: (key) => del(key),
    },
    // Don't write on every keystroke of cache churn; batch persists.
    throttleTime: 1000,
  });
}

// Children's data lives in this cache, so wipe it on logout.
export async function clearPersistedQueryCache() {
  await del(CACHE_KEY);
}
