import { ApiError, type ApiErrorIssue, toApiError } from "./api/errors";
import { requestViaORPC } from "./api/orpc-adapter";
import { legacyFetchRequest } from "./api/rest";
import type { RequestOptions } from "./api/types";

export { ApiError, type ApiErrorIssue, type RequestOptions };

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  try {
    const rpcRequest = requestViaORPC(path, options);

    if (rpcRequest) {
      return (await rpcRequest) as T;
    }

    return legacyFetchRequest<T>(path, options);
  } catch (error) {
    throw toApiError(error);
  }
}
