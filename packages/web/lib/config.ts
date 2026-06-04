export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export const rpcBaseUrl =
  process.env.NEXT_PUBLIC_RPC_BASE_URL ??
  apiBaseUrl.replace(/\/api\/v1\/?$/, "/rpc");

export const authTokenStorageKey = "kichkintoy_auth_token";
export const signupDraftStorageKey = "kichkintoy_signup_draft";
