// Process-local idempotency cache: an offline write replayed on reconnect (with
// the same client-generated key) is applied at most once. Good enough for a
// single API instance; swap the Map for Redis when scaling out (design doc §22).
type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 10_000;

export async function withIdempotency<T>(
  key: string | undefined,
  produce: () => Promise<T>,
): Promise<T> {
  if (!key) return produce();

  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const value = await produce();
  store.set(key, { value, expiresAt: now + TTL_MS });

  if (store.size > MAX_ENTRIES) {
    for (const [k, entry] of store) {
      if (entry.expiresAt <= now) store.delete(k);
    }
  }

  return value;
}
