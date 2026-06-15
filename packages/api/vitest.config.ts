import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only run TypeScript sources — never the compiled CJS output in dist/.
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
