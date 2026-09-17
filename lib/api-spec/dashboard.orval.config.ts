import { defineConfig } from "orval";
export default defineConfig({
  dashboard: {
    hooks: { afterAllFilesWrite: "node fix-dashboard-binary.mjs" },
    input: "./dashboard.openapi.json",
    output: {
      target: "../api-client-react/src/dashboard/generated.ts",
      schemas: "../api-client-react/src/dashboard/models",
      client: "fetch",
      mode: "split",
      baseUrl: "/api/v1",
      // Keep hand-written transport exports and the legacy estimate adapter.
      clean: ["!index.ts", "!legacy-estimate.ts"],
      headers: true,
      override: {
        fetch: { includeHttpResponseReturnType: false },
        mutator: {
          path: "../api-client-react/src/custom-fetch.ts",
          name: "customFetch",
        },
      },
    },
  },
});
