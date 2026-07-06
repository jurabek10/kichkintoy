import Constants from 'expo-constants';

/**
 * RPC base URL.
 *
 * In dev the API runs on the same machine as the Metro bundler, so we derive
 * the host from Metro's `hostUri` (e.g. "192.168.1.20:8081"). This means the
 * app reaches the API by the Mac's LAN IP on a physical device and by
 * localhost on the simulator — no manual config. Override with
 * EXPO_PUBLIC_RPC_BASE_URL for staging/production.
 */
function devRpcBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:4000/rpc` : 'http://localhost:4000/rpc';
}

export const rpcBaseUrl = process.env.EXPO_PUBLIC_RPC_BASE_URL ?? devRpcBaseUrl();

export const sessionStorageKey = 'kichkintoy.auth.session';
