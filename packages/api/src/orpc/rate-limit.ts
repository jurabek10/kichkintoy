import type { NextFunction, Request, Response } from "express";

// Lightweight fixed-window IP rate limiter for the /rpc surface. The oRPC routes
// are served by a raw Express handler and do NOT pass through Nest's
// ThrottlerGuard, so this restores the per-IP throttling that previously lived
// on the REST controllers. Fine-grained OTP send/verify brute-force protection
// still comes from the service-level limits in AuthService.
//
// Process-local (single-instance) — swap the Map for Redis when scaling out.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 100;
const MAX_BUCKETS = 50_000;

// Per-procedure caps (requests/min/IP). Matched by URL suffix so the /rpc prefix
// is irrelevant.
const RULES: Array<{ test: (path: string) => boolean; limit: number }> = [
  { test: (p) => p.endsWith("/auth/sendCode"), limit: 5 },
  {
    test: (p) =>
      p.endsWith("/auth/verifyCode") ||
      p.endsWith("/auth/login") ||
      p.endsWith("/auth/register"),
    limit: 10,
  },
];

function limitFor(path: string): number {
  for (const rule of RULES) if (rule.test(path)) return rule.limit;
  return DEFAULT_LIMIT;
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rpcRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Use originalUrl: inside this mounted handler req.path is stripped of the
  // /rpc prefix, which would break the per-procedure suffix match.
  const path = (req.originalUrl || req.url).split("?")[0];
  const limit = limitFor(path);
  // Strict auth procedures get their own bucket; everything else shares one.
  const key = `${clientIp(req)}:${limit === DEFAULT_LIMIT ? "_general" : path}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else if (bucket.count >= limit) {
    res
      .status(429)
      .json({ message: "Too many requests. Please slow down and try again." });
    return;
  } else {
    bucket.count += 1;
  }

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  next();
}
