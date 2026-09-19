const { createRequire } = require("node:module"),
  fs = require("node:fs");
const root = require("node:path").resolve(__dirname, "../../../.."),
  req = createRequire(root + "/platform/p1-core/package.json");
const source =
  fs.readFileSync(
    root + "/platform/p1-core/client/src/components/shared/forms-workspace.tsx",
    "utf8",
  ) +
  fs.readFileSync(
    root + "/artifacts/p1-dashboard/src/marketing/forms-primitives.tsx",
    "utf8",
  );
const colors = Object.fromEntries(
  [
    "background",
    "foreground",
    "primary",
    "primary-foreground",
    "muted",
    "muted-foreground",
    "card",
    "card-border",
    "card-foreground",
    "border",
    "input",
    "destructive",
  ].map((x) => [x, `hsl(var(--${x}) / <alpha-value>)`]),
);
req("postcss")([
  req("tailwindcss")({
    content: [{ raw: source, extension: "tsx" }],
    important: ".native-forms",
    corePlugins: { preflight: false },
    theme: { extend: { colors } },
  }),
])
  .process("@tailwind utilities;", { from: undefined })
  .then((result) =>
    fs.writeFileSync(
      root +
        "/artifacts/p1-dashboard/src/marketing/forms-workspace.utilities.css",
      "/* Generated from shared Forms JSX using retained Core Tailwind; scoped adapter. */\n" +
        result.css,
    ),
  );
