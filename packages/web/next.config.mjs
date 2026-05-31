/** @type {import('next').NextConfig} */
const nextConfig = {
  // @kichkintoy/shared ships a compiled ESM `dist` with an `exports` map, so it
  // is consumed as a normal dependency. Do NOT add it to transpilePackages —
  // that makes the bundler resolve the TS `src` (whose .js ESM specifiers don't
  // exist there) and fail with "appContract not found / no exports".
};

export default nextConfig;
