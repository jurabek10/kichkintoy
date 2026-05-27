import { apiBaseUrl, authTokenStorageKey } from "./config";

export type ApiErrorIssue = { path: string; message: string };

export class ApiError extends Error {
  status: number;
  issues: ApiErrorIssue[];

  constructor(message: string, status: number, issues: ApiErrorIssue[] = []) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  token?: string | null;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(authTokenStorageKey);
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${apiBaseUrl}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, auth = false, token } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const resolvedToken = token ?? (auth ? getStoredToken() : null);
  if (resolvedToken) {
    headers["Authorization"] = `Bearer ${resolvedToken}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const { message, issues } = extractError(payload);
    throw new ApiError(message, response.status, issues);
  }

  return payload as T;
}

function extractError(payload: unknown): {
  message: string;
  issues: ApiErrorIssue[];
} {
  const fallback = "Request failed. Please try again.";

  if (!payload || typeof payload !== "object") {
    return { message: fallback, issues: [] };
  }

  const data = payload as Record<string, unknown>;
  const raw = data.message ?? data.error;

  if (typeof raw === "string") {
    return { message: raw, issues: [] };
  }

  if (raw && typeof raw === "object") {
    const inner = raw as Record<string, unknown>;
    const innerMessage =
      typeof inner.message === "string" ? inner.message : fallback;
    const issues: ApiErrorIssue[] = Array.isArray(inner.issues)
      ? (inner.issues as ApiErrorIssue[])
      : [];
    return { message: issues[0]?.message ?? innerMessage, issues };
  }

  return { message: fallback, issues: [] };
}
