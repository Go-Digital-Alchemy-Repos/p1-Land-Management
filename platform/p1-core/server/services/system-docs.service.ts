import { promises as fs, type Dirent } from "fs";
import path from "path";
import { storage } from "../storage";
import { logger } from "../utils/logger";

type SystemDocDefinition = {
  title: string;
  slug: string;
  category: string;
  relativePath: string;
  sortOrder: number;
  content?: string;
};

const DOCS_ROOT = path.resolve(process.cwd(), "docs");

const CATEGORY_ORDER: Record<string, number> = {
  "Getting Started": 0,
  "Admin Guides": 1,
  Architecture: 2,
  "Architecture Decisions": 3,
  "Operations & Recovery": 4,
  "Deployment & Release": 5,
  "API Reference": 6,
  "Engineering Quality": 7,
  Security: 8,
  "Product & Planning": 9,
  Reference: 10,
};

const ROOT_FILE_CATEGORY_MAP: Record<string, string> = {
  "backend-architecture.md": "Architecture",
  "changelog.md": "Reference",
  "deployment-notes.md": "Deployment & Release",
  "documentation-coverage-audit.md": "Engineering Quality",
  "operations.md": "Operations & Recovery",
  "quality-gates.md": "Engineering Quality",
  "roadmap.md": "Product & Planning",
  "stabilization-plan.md": "Engineering Quality",
  "system-backups.md": "Operations & Recovery",
  "technical-debt.md": "Engineering Quality",
  "validation-report.md": "Engineering Quality",
};

const GENERATED_DOCS: Array<
  Pick<SystemDocDefinition, "title" | "slug" | "category" | "relativePath">
> = [
  {
    title: "System Architecture Map",
    slug: "system-architecture-map",
    category: "Architecture",
    relativePath: "__generated__/system-architecture-map.md",
  },
  {
    title: "System Module Index",
    slug: "system-module-index",
    category: "Architecture",
    relativePath: "__generated__/system-module-index.md",
  },
  {
    title: "System API Route Index",
    slug: "system-api-route-index",
    category: "API Reference",
    relativePath: "__generated__/system-api-route-index.md",
  },
  {
    title: "System Storage & Schema Index",
    slug: "system-storage-schema-index",
    category: "API Reference",
    relativePath: "__generated__/system-storage-schema-index.md",
  },
  {
    title: "System Services & Jobs Index",
    slug: "system-services-jobs-index",
    category: "Architecture",
    relativePath: "__generated__/system-services-jobs-index.md",
  },
];

function sortSystemDocs(a: SystemDocDefinition, b: SystemDocDefinition) {
  const categoryDiff = (CATEGORY_ORDER[a.category] ?? 999) - (CATEGORY_ORDER[b.category] ?? 999);
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  const sortDiff = a.sortOrder - b.sortOrder;
  if (sortDiff !== 0) {
    return sortDiff;
  }

  return a.title.localeCompare(b.title);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromHeadingOrPath(content: string, relativePath: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading;
  }

  return relativePath
    .replace(/\.md$/i, "")
    .split(/[\\/]/)
    .pop()!
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryForRelativePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized.startsWith("admin/")) {
    return "Admin Guides";
  }

  if (normalized.startsWith("architecture/")) {
    return "Architecture";
  }

  if (normalized.startsWith("adr/")) {
    return "Architecture Decisions";
  }

  if (normalized.startsWith("runbooks/")) {
    return "Operations & Recovery";
  }

  return ROOT_FILE_CATEGORY_MAP[path.basename(normalized)] ?? "Reference";
}

async function collectMarkdownFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectMarkdownFiles(absolutePath, relativePath);
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [relativePath];
      }

      return [];
    }),
  );

  return files.flat();
}

async function collectFiles(
  root: string,
  predicate: (relativePath: string) => boolean,
): Promise<string[]> {
  async function walk(dir: string, prefix = ""): Promise<string[]> {
    let entries: Dirent[];

    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const files = await Promise.all(
      entries.map(async (entry) => {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        const absolutePath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") {
            return [];
          }
          return walk(absolutePath, relativePath);
        }

        if (entry.isFile() && predicate(relativePath)) {
          return [relativePath];
        }

        return [];
      }),
    );

    return files.flat().sort((a, b) => a.localeCompare(b));
  }

  return walk(root);
}

function toTitle(value: string) {
  return value
    .replace(/\.(routes|route|storage|service|schema|test|ts|tsx)$/g, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function bulletList(items: string[], emptyText: string) {
  if (items.length === 0) {
    return `- ${emptyText}`;
  }

  return items.map((item) => `- \`${item}\``).join("\n");
}

function table(headers: string[], rows: string[][]) {
  if (rows.length === 0) {
    return "_No entries found._";
  }

  return [
    `| ${headers.join(" |")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

async function buildGeneratedDocs(): Promise<SystemDocDefinition[]> {
  const root = process.cwd();
  const routeFiles = await collectFiles(path.join(root, "server/routes"), (file) =>
    file.endsWith(".ts"),
  );
  const adminRouteFiles = routeFiles.filter((file) => file.startsWith("admin/"));
  const publicRouteFiles = routeFiles.filter((file) => !file.startsWith("admin/"));
  const schemaFiles = await collectFiles(
    path.join(root, "shared/schema"),
    (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
  );
  const storageFiles = await collectFiles(
    path.join(root, "server/storage"),
    (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
  );
  const serviceFiles = await collectFiles(
    path.join(root, "server/services"),
    (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
  );
  const scriptFiles = await collectFiles(path.join(root, "server/scripts"), (file) =>
    file.endsWith(".ts"),
  );
  const featureFiles = await collectFiles(
    path.join(root, "client/src/features"),
    (file) => file.endsWith(".tsx") || file.endsWith(".ts"),
  );

  const featureModules = [
    ...new Set(featureFiles.map((file) => file.split("/")[0]).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const docs: Record<string, string> = {
    "system-architecture-map": [
      "# System Architecture Map",
      "",
      "Generated from the repository so maintainers can orient themselves before opening source files.",
      "",
      "## Core Runtime",
      "",
      "- **Frontend**: React feature modules in `client/src/features`, shared UI in `client/src/components`, and shared utilities in `client/src/lib`.",
      "- **Backend**: Express route modules in `server/routes`, cross-cutting services in `server/services`, and persistence through the `server/storage` facade.",
      "- **Shared contract**: Drizzle schemas and shared types live in `shared/schema` and `shared/types`.",
      "- **Documentation source**: Long-form markdown lives in `docs/`; generated index documents are refreshed by `Sync System Docs`.",
      "",
      "## Generated Indexes",
      "",
      "- [System Module Index](/admin/docs/system-module-index)",
      "- [System API Route Index](/admin/docs/system-api-route-index)",
      "- [System Storage & Schema Index](/admin/docs/system-storage-schema-index)",
      "- [System Services & Jobs Index](/admin/docs/system-services-jobs-index)",
      "- [Architecture Overview](/admin/docs/architecture-overview)",
    ].join("\n"),
    "system-module-index": [
      "# System Module Index",
      "",
      "Generated from `client/src/features` and the top-level backend domains.",
      "",
      "## Frontend Feature Modules",
      "",
      table(
        ["Module", "Files"],
        featureModules.map((moduleName) => [
          `\`${moduleName}\``,
          String(featureFiles.filter((file) => file.startsWith(`${moduleName}/`)).length),
        ]),
      ),
      "",
      "## Backend Route Domains",
      "",
      table(
        ["Domain", "File"],
        routeFiles.map((file) => [toTitle(path.basename(file)), `\`server/routes/${file}\``]),
      ),
    ].join("\n"),
    "system-api-route-index": [
      "# System API Route Index",
      "",
      "Generated from `server/routes`. Use this with [Backend Route Organization](/admin/docs/architecture-backend-routes) for route intent and middleware notes.",
      "",
      "## Public and Mixed Routes",
      "",
      bulletList(
        publicRouteFiles.map((file) => `server/routes/${file}`),
        "No public route files found.",
      ),
      "",
      "## Admin Routes",
      "",
      bulletList(
        adminRouteFiles.map((file) => `server/routes/${file}`),
        "No admin route files found.",
      ),
    ].join("\n"),
    "system-storage-schema-index": [
      "# System Storage & Schema Index",
      "",
      "Generated from `shared/schema` and `server/storage`.",
      "",
      "## Schema Files",
      "",
      bulletList(
        schemaFiles.map((file) => `shared/schema/${file}`),
        "No schema files found.",
      ),
      "",
      "## Storage Files",
      "",
      bulletList(
        storageFiles.map((file) => `server/storage/${file}`),
        "No storage files found.",
      ),
    ].join("\n"),
    "system-services-jobs-index": [
      "# System Services & Jobs Index",
      "",
      "Generated from `server/services` and `server/scripts`.",
      "",
      "## Services",
      "",
      bulletList(
        serviceFiles.map((file) => `server/services/${file}`),
        "No service files found.",
      ),
      "",
      "## Jobs and Scripts",
      "",
      bulletList(
        scriptFiles.map((file) => `server/scripts/${file}`),
        "No scripts found.",
      ),
    ].join("\n"),
  };

  return GENERATED_DOCS.map((definition) => ({
    ...definition,
    sortOrder: 0,
    content: docs[definition.slug],
  }));
}

async function getSystemDocDefinitions(): Promise<SystemDocDefinition[]> {
  const files = await collectMarkdownFiles(DOCS_ROOT);
  const markdownDefinitions = await Promise.all(
    files.map(async (relativePath) => {
      const absolutePath = path.join(DOCS_ROOT, relativePath);
      const content = await fs.readFile(absolutePath, "utf8");
      const category = categoryForRelativePath(relativePath);
      const categoryBase = (CATEGORY_ORDER[category] ?? 999) * 100;

      return {
        title: titleFromHeadingOrPath(content, relativePath),
        slug: slugify(relativePath),
        category,
        relativePath,
        sortOrder: categoryBase,
      };
    }),
  );
  const generatedDefinitions = await buildGeneratedDocs();
  const definitions = [...generatedDefinitions, ...markdownDefinitions];

  return definitions.sort(sortSystemDocs).map((definition, index) => ({
    ...definition,
    sortOrder: index + 1,
  }));
}

type EnsureSystemDocsOptions = {
  refreshExisting?: boolean;
};

export async function ensureSystemDocs(options: EnsureSystemDocsOptions = {}) {
  const { refreshExisting = true } = options;
  const definitions = await getSystemDocDefinitions();

  let created = 0;
  let updated = 0;

  for (const definition of definitions) {
    const absolutePath = path.join(DOCS_ROOT, definition.relativePath);
    const content = definition.content ?? (await fs.readFile(absolutePath, "utf8"));
    const existing = await storage.docs.getDocBySlug(definition.slug);

    if (existing) {
      if (refreshExisting) {
        await storage.docs.updateDoc(existing.id, {
          title: definition.title,
          category: definition.category,
          content,
          sortOrder: definition.sortOrder,
        });
        updated += 1;
      }
      continue;
    }

    await storage.docs.createDoc({
      title: definition.title,
      slug: definition.slug,
      category: definition.category,
      content,
      sortOrder: definition.sortOrder,
      isPublished: true,
    });
    created += 1;
  }

  logger.app.info("System documentation synced", {
    total: definitions.length,
    created,
    updated,
  });

  return {
    total: definitions.length,
    created,
    updated,
  };
}
