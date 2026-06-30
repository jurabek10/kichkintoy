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

module.exports = withNativeWind(config, { input: './global.css' });
