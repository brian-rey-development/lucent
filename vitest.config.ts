import { defineConfig } from "vitest/config";

// Setting conditions replaces Vite's defaults, so they follow the source condition.
const CONDITIONS = ["@lucent/source", "module", "node", "development|production"];

export default defineConfig({
  ssr: {
    resolve: { conditions: CONDITIONS },
  },
  test: {
    include: ["test/**/*.test.ts", "{apps,packages}/*/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["{apps,packages}/*/src/**/*.ts"],
      exclude: ["apps/cli/src/main.ts"],
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
