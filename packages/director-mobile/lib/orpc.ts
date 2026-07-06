import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import type { AppContract } from '@kichkintoy/shared';

import { rpcBaseUrl } from './config';

// The bearer token lives in memory so the (synchronous) headers function can
// read it on every request. AsyncStorage only persists it across launches —
// the auth provider calls setAuthToken on restore, sign-in and sign-out.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

const link = new RPCLink({
  url: rpcBaseUrl,
  headers: () => (authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

/** Typed oRPC client for the whole app contract. */
export const orpc: ContractRouterClient<AppContract> = createORPCClient(link);
