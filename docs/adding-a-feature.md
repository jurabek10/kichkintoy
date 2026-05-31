# Adding a Feature (oRPC API + TanStack Query)

The API is **oRPC-only** and the web data layer is **TanStack Query**. The golden rule: the **contract in `@kichkintoy/shared` is the single source of truth** — define a procedure once and both the server handler and the web client get full type-safety for free.

```
shared/api/orpc-contract.ts   ← define input + output schemas (source of truth)
        │  (rebuild shared)
        ├──► api: service (logic) → orpc router handler (auth + parse)
        └──► web: queryKeys → useQuery / useMutation(orpc.x.y) + invalidate
```

This guide walks the full stack with one example: a per-center **announcement** the director sets and everyone reads (one read + one write — the two shapes you'll always need).

---

## Layer 1 — Define the contract (`@kichkintoy/shared`)

Schemas in the domain file, then wire them into `appContract`.

```ts
// packages/shared/src/api/centers.ts
export const centerAnnouncementSchema = z.object({
  message: z.string().nullable(),
  updatedAt: isoDateTimeSchema.nullable(),
});
export type CenterAnnouncement = z.infer<typeof centerAnnouncementSchema>;

export const setAnnouncementRequestSchema = z.object({
  message: z.string().trim().max(2000),
});
```

```ts
// packages/shared/src/api/orpc-contract.ts  (inside appContract)
import { centerAnnouncementSchema, setAnnouncementRequestSchema } from "./centers.js";

centers: {
  // ...existing...
  announcement: oc.input(centerIdInputSchema).output(centerAnnouncementSchema),
},
director: {
  // ...existing...
  setAnnouncement: oc
    .input(centerIdInputSchema.extend({ body: setAnnouncementRequestSchema }))
    .output(centerAnnouncementSchema),
},
```

> **⚠️ Always rebuild shared after editing the contract:** `pnpm --filter @kichkintoy/shared build`. If a new export doesn't show up in consumers, delete the incremental cache first: `rm packages/shared/tsconfig.tsbuildinfo` (the incremental build silently skips new exports — a real trap).
>
> Never ship `z.unknown()` as an `output` — give every procedure a real response schema.

## Layer 2 — Service (business logic, NestJS)

The data + DB work. (A new field means a Prisma migration — add the columns, then `pnpm db:migrate`.)

```ts
// packages/api/src/centers/centers.service.ts
async getAnnouncement(centerId: string) {
  const c = await this.prisma.center.findUnique({
    where: { id: centerId },
    select: { announcement: true, announcementUpdatedAt: true },
  });
  if (!c) throw new NotFoundException("Center not found.");
  return { message: c.announcement, updatedAt: c.announcementUpdatedAt?.toISOString() ?? null };
}
```
```ts
// packages/api/src/director/director.service.ts
async setAnnouncement(centerId: string, message: string, actorUserId: string) {
  const c = await this.prisma.center.update({
    where: { id: centerId },
    data: { announcement: message.trim() || null, announcementUpdatedAt: new Date() },
  });
  await this.audit.log({ centerId, actorUserId, action: "center.announcement_updated", entityType: "center", entityId: centerId });
  return { message: c.announcement, updatedAt: c.announcementUpdatedAt?.toISOString() ?? null };
}
```

## Layer 3 — oRPC handler (auth + wire service to contract)

Authorization lives **here**, via `requireUser` / `requireCenterAccess` (not Nest guards — there are no guards on `/rpc`).

```ts
// packages/api/src/orpc/routers/catalog.router.ts  (createCentersRouter)
announcement: os.centers.announcement.handler(async ({ input, context }) => {
  await requireUser(deps.prisma, context.req);                 // any signed-in user
  return deps.centersService.getAnnouncement(input.centerId);
}),
```
```ts
// packages/api/src/orpc/routers/director.router.ts  (createDirectorRouter)
setAnnouncement: os.director.setAnnouncement.handler(async ({ input, context }) => {
  const user = await requireUser(deps.prisma, context.req);
  await requireCenterAccess(deps.prisma, context.req, input.centerId, { directorOnly: true });
  return deps.directorService.setAnnouncement(input.centerId, input.body.message, user.id);
}),
```

> **The recurring gotcha — parse-coercion.** oRPC checks at compile time that the handler return matches the output schema's *input* type. If the service returns loose Prisma types that don't narrow (an enum as a bare `string`, a `Date` where the schema wants an ISO string), wrap the return in `schema.parse(...)` — the pattern used throughout the codebase (`centerTeachersResponseSchema.parse(rows)`, `classDetailSchema.parse(...)` inside `getClass`, etc.). It both fixes the types and validates the response. Plain string/number shapes (like this example) need no parse.

## Layer 4 — Web query key

```ts
// packages/web/lib/query-keys.ts
centers: {
  // ...existing...
  announcement: (centerId: string) => ["centers", centerId, "announcement"] as const,
},
```

## Layer 5 — Web component (TanStack + the typed `orpc` client)

```tsx
"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";

export function Announcement({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient();
  const key = queryKeys.centers.announcement(centerId);

  // READ — `data` is typed as CenterAnnouncement automatically, no casts.
  const { data, isPending, error } = useQuery({
    queryKey: key,
    queryFn: () => orpc.centers.announcement({ centerId }),
  });

  // WRITE
  const [draft, setDraft] = useState("");
  const save = useMutation({
    mutationFn: (message: string) =>
      orpc.director.setAnnouncement({ centerId, body: { message } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (err) => alert(toApiError(err).message), // orpc throws ORPCError; normalize it
  });

  if (isPending) return <p>Loading…</p>;
  if (error) return <p>{toApiError(error).message}</p>;
  return (
    <div>
      <p>{data.message ?? "No announcement yet"}</p>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={() => save.mutate(draft)} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
```

`data.message` is fully typed, and `setAnnouncement({ centerId, body: { message } })` is checked against the contract — misspell a field and it won't compile.

---

## Web data-layer conventions (the "TanStack stuff")

- **Client:** `lib/query.ts` exports an SSR-safe `getQueryClient()` (defaults: `staleTime 60s`, `gcTime 5m`, `refetchOnWindowFocus: false`, retry-with-backoff that skips 4xx). Wrapped by `app/providers.tsx`.
- **Persistence:** the cache is persisted to **IndexedDB** (`lib/query-persister.ts` + `PersistQueryClientProvider`, 24h `maxAge`, `buster` version) so reloads open instantly and reads work offline. It's **cleared on logout** (`lib/session.ts`) because it holds children's data.
- **queryKeys factory** (`lib/query-keys.ts`) — always use it so `invalidateQueries` matches.
- **Reads** → `useQuery({ queryKey, queryFn: () => orpc.x.y(input) })`. **Writes** → `useMutation({ mutationFn: () => orpc.x.y(input), onSuccess: invalidate, onError: toApiError })`.
- **Errors:** the oRPC client throws `ORPCError`; normalize with `toApiError(err).message` from `@/lib/api/errors`.
- **Offline-capable writes** (optional): register a resumable keyed default in `lib/offline-mutations.ts` (see the report-comment example) so a write made offline is queued, persisted, and replayed on reconnect with an `idempotencyKey` the server dedupes.

## Auth / security cheatsheet

- Read access → `requireUser(deps.prisma, context.req)`. Center-scoped → `requireCenterAccess(..., { directorOnly?: true })`. Parent→child → `child_guardians`; teacher→class → `teacher_class_assignments`.
- `/rpc` is rate-limited (`orpc/rate-limit.ts`); auth procedures have stricter caps + service-level OTP limits.
- Run new endpoints against **[`security/security-checklist.md`](./security/security-checklist.md)** — especially **AUTHZ** (object-level ownership + tenant scope) for anything touching a center or child.

## Checklist when adding a feature

- [ ] Schemas in `shared/src/api/<domain>.ts`; procedures in `orpc-contract.ts` with a **real `output`** (never `z.unknown()`)
- [ ] **Rebuild shared** (`rm tsconfig.tsbuildinfo` if exports go missing)
- [ ] Prisma migration if new data
- [ ] Service method (logic + `audit.log` for sensitive actions, `$transaction` for multi-step writes)
- [ ] Router handler with `requireUser` / `requireCenterAccess`; `schema.parse(...)` if return types are loose
- [ ] queryKey in the factory; `useQuery` / `useMutation` calling `orpc.*`; `invalidateQueries` on the key after writes
- [ ] Score against `security/security-checklist.md`
- [ ] `pnpm --filter @kichkintoy/{shared build, api typecheck, web typecheck}` all green
