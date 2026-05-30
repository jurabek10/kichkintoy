import { ORPCError } from "@orpc/client";

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

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof ORPCError) {
    return new ApiError(
      error.message,
      error.status ?? 500,
      extractIssues(error.data),
    );
  }

  const message =
    error instanceof Error ? error.message : "Request failed. Please try again.";
  return new ApiError(message, 500);
}

export function extractIssues(data: unknown): ApiErrorIssue[] {
  if (!isRecord(data)) return [];
  return Array.isArray(data.issues) ? (data.issues as ApiErrorIssue[]) : [];
}

export function extractRestError(payload: unknown): {
  message: string;
  issues: ApiErrorIssue[];
} {
  const fallback = "Request failed. Please try again.";

  if (!isRecord(payload)) {
    return { message: fallback, issues: [] };
  }

  const raw = payload.message ?? payload.error;

  if (typeof raw === "string") {
    return { message: raw, issues: [] };
  }

  if (isRecord(raw)) {
    const innerMessage =
      typeof raw.message === "string" ? raw.message : fallback;
    const issues = Array.isArray(raw.issues)
      ? (raw.issues as ApiErrorIssue[])
      : [];
    return { message: issues[0]?.message ?? innerMessage, issues };
  }

  return { message: fallback, issues: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}
