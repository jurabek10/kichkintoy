import type { ProcedureInput, QueryParams } from "../types";

export type RouteMatch = RegExpMatchArray;
export type ORPCRequest = Promise<unknown>;

export function input<TProcedure>(value: unknown): ProcedureInput<TProcedure> {
  return value as ProcedureInput<TProcedure>;
}

export function match(path: string, pattern: RegExp): RouteMatch | null {
  return path.match(pattern);
}

export function stringQuery(value: QueryParams[string]): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function queryWithoutEmptyValues(
  query: QueryParams,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    result[key] = String(value);
  }

  return result;
}
