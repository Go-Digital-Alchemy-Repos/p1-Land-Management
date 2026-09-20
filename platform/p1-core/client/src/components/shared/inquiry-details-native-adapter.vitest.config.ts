// Run from platform/p1-core: npx vitest run --config client/src/components/shared/inquiry-details-native-adapter.vitest.config.ts
// These adapter tests span the two existing React installations. Pin the test renderer
// and imported components to one React instance, as dashboard Vite does in production.
import { fileURLToPath } from "node:url";
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default {
  test: {
    environment: "jsdom",
    server: { deps: { inline: ["lucide-react"] } },
    include: [
      local("../../../../../../artifacts/p1-dashboard/tests/inquiry-details-native-adapter.spec.tsx"),
    ],
  },
  resolve: {
    alias: {
      "lucide-react": local("../../../../../../artifacts/p1-dashboard/node_modules/lucide-react"),
      react: local("../../../../../../artifacts/p1-dashboard/node_modules/react"),
      "react-dom": local("../../../../../../artifacts/p1-dashboard/node_modules/react-dom"),
      "@workspace/api-client-react/dashboard": local(
        "../../../../../../lib/api-client-react/src/dashboard/index.ts",
      ),
    },
  },
};
