import { authRequest } from "./orpc/auth";
import { catalogRequest, teacherRequest } from "./orpc/catalog";
import { directorRequest } from "./orpc/director";
import { reportRequest } from "./orpc/reports";
import type { ORPCRequest } from "./orpc/common";
import type { RequestOptions } from "./types";

export function requestViaORPC(
  path: string,
  options: RequestOptions,
): ORPCRequest | null {
  const method = options.method ?? "GET";
  const body = options.body;
  const query = options.query ?? {};

  return (
    authRequest(path, method, body) ??
    catalogRequest(path, method, query) ??
    teacherRequest(path, method) ??
    reportRequest(path, method, body, query) ??
    directorRequest(path, method, body, query)
  );
}
