import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    resolve: { conditions: ["@lucent/source", ...defaultServerConditions] },
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
