// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so workspace packages resolve.
config.watchFolders = [workspaceRoot];

// The web package drags in a second, incompatible react-native via optional
// peer deps. Pin Metro to this app's copy so it never bundles the other one.
// (Hierarchical lookup stays on — pnpm needs it for nested dependencies.)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// Packages that must be a single instance across the app AND the source-consumed
// workspace packages (mobile-shared). pnpm can symlink a *second* copy of these
// under mobile-shared/node_modules (peer-dep resolution differs), and Metro would
// then bundle two react-i18next instances: the app initializes one, but shared
// screens read the other — uninitialized — one, so `t()` echoes raw keys.
// Force every import of these to resolve from this app's node_modules.
const SINGLETON_PACKAGES = ['react', 'react-i18next', 'i18next'];
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const forced = SINGLETON_PACKAGES.find(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`),
  );
  if (forced) {
    // Resolve as if imported from this app's root so node lookup lands on the
    // app's copy, while still honoring subpath imports (e.g. react/jsx-runtime).
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.js') },
      moduleName,
      platform,
    );
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
