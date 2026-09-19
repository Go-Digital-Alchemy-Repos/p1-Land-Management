const { createRequire } = require("node:module"),
  fs = require("node:fs");
const root = require("node:path").resolve(__dirname, "../../../.."),
  req = createRequire(root + "/platform/p1-core/package.json");
const source =
  fs.readFileSync(
    root +
      "/platform/p1-core/client/src/features/admin/cms/builder/image-position-picker-workspace.tsx",
    "utf8",
  ) +
  fs.readFileSync(
    root + "/artifacts/p1-dashboard/src/marketing/forms-primitives.tsx",
    "utf8",
  ) +
  [
    "blog-editor-presentation.tsx",
    "blog-list-presentation.tsx",
    "seo-preview.tsx",
    "structured-data-status.tsx",
    "cms-upload-dropzone.tsx",
  ]
    .map((file) =>
      fs.readFileSync(
        root + "/platform/p1-core/client/src/components/shared/" + file,
        "utf8",
      ),
    )
    .join("\n") +
  fs.readFileSync(
    root + "/artifacts/p1-dashboard/src/marketing/BlogManager.tsx",
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
    important: ".blog-presentation.blog-presentation",
    corePlugins: { preflight: false },
    theme: { extend: { colors } },
  }),
])
  .process("@tailwind utilities;", { from: undefined })
  .then((result) =>
    fs.writeFileSync(
      root + "/artifacts/p1-dashboard/src/marketing/blog-editor.utilities.css",
      "/* Generated from shared CMS page JSX using retained Core Tailwind; scoped adapter. */\n" +
        result.css,
    ),
  );
