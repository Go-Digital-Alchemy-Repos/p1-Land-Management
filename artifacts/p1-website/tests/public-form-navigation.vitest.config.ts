import { fileURLToPath } from "node:url";

// From the repository root, with the website and Core dependencies installed:
// platform/p1-core/node_modules/.bin/vitest run --config artifacts/p1-website/tests/public-form-navigation.vitest.config.ts
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default {
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: [local("./public-form-navigation.spec.tsx")],
  },
  resolve: {
    alias: {
      "@": local("../src"),
      react: local("../node_modules/react"),
      "react-dom": local("../node_modules/react-dom"),
      "lucide-react": local("../node_modules/lucide-react"),
    },
  },
};
