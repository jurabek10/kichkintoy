// Minimal ambient globals for this package's own standalone typecheck. The
// consuming apps provide the real types (Expo's env + node shims); this file is
// not imported anywhere, so it never leaks into the apps' compilation.
declare const process: { env: Record<string, string | undefined> };
