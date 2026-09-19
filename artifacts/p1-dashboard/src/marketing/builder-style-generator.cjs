const { createRequire } = require("node:module"),
  fs = require("node:fs");
const root = require("node:path").resolve(__dirname, "../../../.."),
  req = createRequire(root + "/platform/p1-core/package.json");
const path = require("node:path");
const builderDir =
  root + "/platform/p1-core/client/src/features/admin/cms/builder";
const source =
  fs.readFileSync(
    root + "/platform/p1-core/client/src/components/ui/resizable.tsx",
    "utf8",
  ) +
  fs.readFileSync(
    root +
      "/platform/p1-core/client/src/components/shared/social-media-links.tsx",
    "utf8",
  ) +
  fs
    .readdirSync(builderDir)
    .filter((name) => name.endsWith(".tsx") && !name.includes("test"))
    .map((name) => fs.readFileSync(path.join(builderDir, name), "utf8"))
    .join("\n") +
  fs.readFileSync(
    root + "/artifacts/p1-dashboard/src/marketing/builder-primitives.tsx",
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
    important: ".native-page-builder.native-page-builder",
    corePlugins: { preflight: false },
    theme: { extend: { colors } },
  }),
])
  .process("@tailwind utilities;", { from: undefined })
  .then((result) =>
    fs.writeFileSync(
      root +
        "/artifacts/p1-dashboard/src/marketing/native-page-builder.utilities.css",
      "/* Generated from shared PageBuilder JSX using retained Core Tailwind; scoped adapter. */\n" +
        result.css,
    ),
  );
