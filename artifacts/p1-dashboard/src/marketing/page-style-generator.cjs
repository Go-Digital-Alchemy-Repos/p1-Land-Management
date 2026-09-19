const { createRequire } = require("node:module"),
  fs = require("node:fs");
const root = require("node:path").resolve(__dirname, "../../../.."),
  req = createRequire(root + "/platform/p1-core/package.json");
const source = [
  "platform/p1-core/client/src/components/shared/page-template-picker.tsx",
  "platform/p1-core/client/src/components/shared/page-landing-wizard.tsx",
  "platform/p1-core/client/src/components/shared/seo-preview.tsx",
  "platform/p1-core/client/src/components/shared/structured-data-status.tsx",
]
  .map((file) => fs.readFileSync(root + "/" + file, "utf8"))
  .join("\n");
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
    important: ".cms-page-presentation",
    corePlugins: { preflight: false },
    theme: { extend: { colors } },
  }),
])
  .process("@tailwind utilities;", { from: undefined })
  .then((result) =>
    fs.writeFileSync(
      root +
        "/platform/p1-core/client/src/components/shared/page-presentation.utilities.css",
      "/* Generated from shared CMS page JSX using retained Core Tailwind; scoped adapter. */\n" +
        result.css,
    ),
  );
