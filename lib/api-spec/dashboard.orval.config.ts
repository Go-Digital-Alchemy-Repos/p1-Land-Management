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
      // Keep hand-written dashboard exports beside generated API files.
      clean: false,
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
