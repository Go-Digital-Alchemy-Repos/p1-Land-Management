import { fileURLToPath } from "node:url";
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default {
  test: { environment: "jsdom", include: [local("./lazy-surface.spec.tsx")] },
  resolve: {
    alias: {
      react: local("../node_modules/react"),
      "react-dom": local("../node_modules/react-dom"),
    },
  },
};
