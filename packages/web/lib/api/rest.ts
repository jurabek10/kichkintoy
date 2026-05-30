import { apiBaseUrl, authTokenStorageKey } from "../config";
import { ApiError, extractRestError } from "./errors";
import type { RequestOptions } from "./types";

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

export async function legacyFetchRequest<T>(
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
    const { message, issues } = extractRestError(payload);
    throw new ApiError(message, response.status, issues);
  }

  return payload as T;
}
