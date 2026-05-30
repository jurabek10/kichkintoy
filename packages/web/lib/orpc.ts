import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { appContract, type AppContract } from "@kichkintoy/shared";
import { apiBaseUrl, authTokenStorageKey } from "./config";

function rpcBaseUrl() {
  return apiBaseUrl.replace(/\/api\/v1\/?$/, "/rpc");
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const token = window.localStorage.getItem(authTokenStorageKey);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const link = new RPCLink({
  url: rpcBaseUrl(),
  headers: authHeaders,
});

export const orpc: ContractRouterClient<AppContract> =
  createORPCClient(link);

export { appContract };
