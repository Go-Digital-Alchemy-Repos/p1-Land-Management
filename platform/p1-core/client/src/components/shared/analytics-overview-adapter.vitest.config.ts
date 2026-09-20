// Run from platform/p1-core: npx vitest run --config client/src/components/shared/analytics-overview-adapter.vitest.config.ts
// These adapter tests span the two existing React installations. Pin the test renderer
// and imported components to one React instance, as dashboard Vite does in production.
import { fileURLToPath } from "node:url";
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const modules =
  process.env.ANALYTICS_TEST_REACT_HOST === "core"
    ? "../../../../node_modules/"
    : "../../../../../../artifacts/p1-dashboard/node_modules/";
export default {
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    server: { deps: { inline: ["lucide-react", "recharts"] } },
    include: [
      local("../../../../../../artifacts/p1-dashboard/tests/analytics-overview-adapter.spec.tsx"),
    ],
  },
  resolve: {
    alias: {
      recharts: local(modules + "recharts"),
      "lucide-react": local(modules + "lucide-react"),
      react: local(modules + "react"),
      "react-dom": local(modules + "react-dom"),
      "@workspace/api-client-react/dashboard": local(
        "../../../../../../lib/api-client-react/src/dashboard/index.ts",
      ),
    },
  },
};
