import { z } from "zod";
import { validateClientSiteComponentContent } from "./client-site-content-contract";
import { getDashboardOriginPolicyError } from "./client-origin-policy";

export const CLIENT_SITE_MANIFEST_SCHEMA_VERSION = "1.0" as const;

const identifier = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");
const version = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "must be a semantic version");
const sha = z.string().regex(/^[0-9a-f]{40}$/, "must be a full lowercase Git commit SHA");
const routePath = z.string().regex(/^\/(?:[^?#]*)?$/, "must be an absolute application path");
const relativePath = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith("/") && !value.split("/").includes(".."), {
    message: "must be a safe repository-relative path",
  });

const httpsOrigin = z.string().superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (url.hostname.includes("*")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "must use an exact hostname without wildcards",
      });
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      value.endsWith("/")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "must be a credential-free HTTPS origin with no path, query, hash, or trailing slash",
      });
    }
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "must be a valid HTTPS origin" });
  }
});

const exactImageOrigin = httpsOrigin.refine((value) => {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}, "must be a canonical exact HTTPS origin");

const secretReferenceId = identifier;

const ownerSchema = z
  .object({
    role: z.enum(["business", "technical", "content", "operations", "security"]),
    name: z.string().min(1),
    contactReference: z.string().min(1).optional(),
  })
  .strict();

const navigationSchema = z
  .object({
    label: z.string().min(1),
    location: z.enum(["primary", "footer", "utility"]),
    order: z.number().int().nonnegative(),
  })
  .strict();

const editableComponentSchema = z
  .object({
    key: identifier,
    version,
    rendererRef: z.string().min(1),
    fieldSchemaRef: z.string().min(1),
    allowedRegions: z.array(identifier).min(1),
    editableFields: z.array(z.enum(["heading", "copy", "image", "imageAlt", "ctaTarget"])),
    fields: z
      .array(
        z
          .object({
            path: z.string().regex(/^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*$/),
            label: z.string().min(1),
            type: z.enum(["text", "textarea", "image", "imageAlt", "ctaTarget"]),
            required: z.boolean(),
            maxLength: z.number().int().positive().optional(),
            allowedImageOrigins: z
              .array(exactImageOrigin)
              .max(8)
              .refine(
                (origins) => new Set(origins).size === origins.length,
                "image origins must be unique",
              )
              .optional(),
          })
          .strict()
          .refine((field) => field.allowedImageOrigins === undefined || field.type === "image", {
            message: "allowedImageOrigins is only supported on image fields",
            path: ["allowedImageOrigins"],
          }),
      )
      .min(1),
    defaultContent: z.record(z.unknown()),
    lockedBehaviors: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .superRefine((component, context) => {
    addDuplicateIssues(
      component.fields.map((field) => field.path),
      ["fields"],
      "field path",
      context,
    );
  });

const clientSiteManifestBaseSchema = z
  .object({
    schemaVersion: z.literal(CLIENT_SITE_MANIFEST_SCHEMA_VERSION),
    status: z.enum(["draft", "approved"]),
    client: z
      .object({
        stackId: identifier,
        displayName: z.string().min(1),
        source: z
          .object({
            repository: z.string().url(),
            revision: sha,
          })
          .strict(),
        owners: z.array(ownerSchema).min(1),
      })
      .strict(),
    compatibility: z
      .object({
        corePlatform: z
          .object({
            minimum: version,
            maximumExclusive: version.optional(),
          })
          .strict(),
        siteAdapter: version,
        themeAdapter: version,
        puckRegistry: version,
      })
      .strict(),
    origins: z
      .object({
        publicSite: httpsOrigin,
        admin: httpsOrigin,
        publicApiPath: z.literal("/api"),
        adminApiPath: z.literal("/api"),
        routingMode: z.literal("same-origin-proxy"),
      })
      .strict(),
    build: z
      .object({
        packageManager: z.enum(["npm", "pnpm", "yarn", "bun"]),
        nodeVersion: z.string().regex(/^\d+(?:\.\d+){0,2}$/, "must be a numeric Node.js version"),
        installCommand: z.string().min(1),
        buildCommand: z.string().min(1),
        startCommand: z.string().min(1),
        outputDirectory: relativePath,
        artifact: z.literal("static-site"),
      })
      .strict(),
    routes: z
      .array(
        z
          .object({
            id: identifier,
            path: routePath,
            owner: z.enum(["site", "platform", "module"]),
            moduleId: identifier.optional(),
            componentRef: z.string().min(1),
            navigation: navigationSchema.optional(),
            editableRegions: z.array(identifier),
            lockedBehaviors: z.array(z.string().min(1)),
          })
          .strict(),
      )
      .min(1),
    assets: z
      .array(
        z
          .object({
            id: identifier,
            kind: z.enum(["image", "font", "icon", "document"]),
            path: routePath,
            sourceRef: relativePath,
            altPolicy: z.enum(["required", "decorative", "not-applicable"]),
          })
          .strict(),
      )
      .min(1),
    theme: z
      .object({
        adapterId: identifier,
        version,
        tokenSource: relativePath,
        semanticTokenGroups: z
          .array(
            z.enum([
              "color",
              "typography",
              "spacing",
              "radius",
              "shadow",
              "breakpoint",
              "motion",
              "zIndex",
            ]),
          )
          .min(1),
      })
      .strict(),
    puck: z
      .object({
        registryId: identifier,
        version,
        contentSchemaVersion: version,
        publishMode: z.enum(["decision-required", "runtime-api", "static-rebuild", "hybrid"]),
        editableComponents: z.array(editableComponentSchema),
      })
      .strict(),
    forms: z.array(
      z
        .object({
          id: identifier,
          routeId: identifier,
          endpoint: routePath,
          method: z.enum(["POST", "PUT", "PATCH"]),
          authentication: z.enum(["public", "session", "signed"]),
          handlerOwner: z.enum(["platform", "module"]),
          secretRefs: z.array(secretReferenceId),
        })
        .strict(),
    ),
    apiIntegrations: z.array(
      z
        .object({
          id: identifier,
          basePath: routePath,
          direction: z.enum(["site-to-platform", "platform-to-provider", "provider-to-platform"]),
          authentication: z.enum(["none", "session", "signed", "provider-secret"]),
          capabilities: z.array(identifier).min(1),
          secretRefs: z.array(secretReferenceId),
        })
        .strict(),
    ),
    modules: z.array(
      z
        .object({
          id: identifier,
          enabled: z.boolean(),
          required: z.boolean(),
          routeIds: z.array(identifier),
          themeRoles: z.array(identifier),
          configurationRefs: z.array(z.string().min(1)),
          secretRefs: z.array(secretReferenceId),
        })
        .strict(),
    ),
    secretReferences: z.array(
      z
        .object({
          id: secretReferenceId,
          environmentVariable: z
            .string()
            .regex(/^[A-Z][A-Z0-9_]*$/, "must be an environment variable name"),
          purpose: z.string().min(1),
          required: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((manifest, context) => {
    const dashboardOriginError = getDashboardOriginPolicyError(
      manifest.origins.publicSite,
      manifest.origins.admin,
    );
    if (dashboardOriginError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origins", "admin"],
        message: dashboardOriginError,
      });
    }

    addDuplicateIssues(
      manifest.routes.map((route) => route.id),
      ["routes"],
      "route id",
      context,
    );
    addDuplicateIssues(
      manifest.routes.map((route) => route.path),
      ["routes"],
      "route path",
      context,
    );
    addDuplicateIssues(
      manifest.assets.map((asset) => asset.id),
      ["assets"],
      "asset id",
      context,
    );
    addDuplicateIssues(
      manifest.modules.map((module) => module.id),
      ["modules"],
      "module id",
      context,
    );
    addDuplicateIssues(
      manifest.secretReferences.map((secret) => secret.id),
      ["secretReferences"],
      "secret reference id",
      context,
    );

    const routeIds = new Set(manifest.routes.map((route) => route.id));
    const moduleIds = new Set(manifest.modules.map((module) => module.id));
    const secretIds = new Set(manifest.secretReferences.map((secret) => secret.id));
    manifest.routes.forEach((route, index) => {
      if (route.owner === "module" && (!route.moduleId || !moduleIds.has(route.moduleId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["routes", index, "moduleId"],
          message: "must reference a declared module",
        });
      }
      if (route.owner !== "module" && route.moduleId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["routes", index, "moduleId"],
          message: "is only valid for module-owned routes",
        });
      }
    });
    manifest.forms.forEach((form, index) => {
      if (!routeIds.has(form.routeId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["forms", index, "routeId"],
          message: "must reference a declared route",
        });
      }
      addUnknownSecretIssues(form.secretRefs, secretIds, ["forms", index, "secretRefs"], context);
    });
    manifest.apiIntegrations.forEach((integration, index) =>
      addUnknownSecretIssues(
        integration.secretRefs,
        secretIds,
        ["apiIntegrations", index, "secretRefs"],
        context,
      ),
    );
    manifest.modules.forEach((module, index) => {
      module.routeIds.forEach((routeId, routeIndex) => {
        if (!routeIds.has(routeId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["modules", index, "routeIds", routeIndex],
            message: "must reference a declared route",
          });
        }
      });
      addUnknownSecretIssues(
        module.secretRefs,
        secretIds,
        ["modules", index, "secretRefs"],
        context,
      );
    });
  });

function addDuplicateIssues(
  values: string[],
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, index],
        message: `duplicate ${label}: ${value}`,
      });
    }
    seen.add(value);
  });
}

function addUnknownSecretIssues(
  refs: string[],
  known: Set<string>,
  path: (string | number)[],
  context: z.RefinementCtx,
): void {
  refs.forEach((reference, index) => {
    if (!known.has(reference)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, index],
        message: "must reference a declared secret",
      });
    }
  });
}

const forbiddenSecretKeys = new Set([
  "secret",
  "password",
  "token",
  "apikey",
  "credential",
  "privatekey",
  "clientsecret",
]);
const secretValuePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}\b/,
  /\bwhsec_[A-Za-z0-9]{12,}\b/,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i,
];

export type ClientSiteManifest = z.infer<typeof clientSiteManifestBaseSchema>;
export type ClientSiteManifestError = { path: string; code: string; message: string };
export type ClientSiteManifestValidation =
  | { success: true; data: ClientSiteManifest; errors: [] }
  | { success: false; errors: ClientSiteManifestError[] };

export const clientSiteManifestSchema = clientSiteManifestBaseSchema;

export function validateClientSiteManifest(input: unknown): ClientSiteManifestValidation {
  const embeddedSecretErrors = findEmbeddedSecrets(input);
  const parsed = clientSiteManifestSchema.safeParse(input);
  const schemaErrors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        path: issue.path.length ? issue.path.join(".") : "$",
        code: issue.code,
        message: issue.message,
      }));
  const contentErrors = parsed.success
    ? parsed.data.puck.editableComponents.flatMap((component, index) => {
        try {
          validateClientSiteComponentContent(component, component.defaultContent);
          return [];
        } catch (error) {
          return [
            {
              path: `puck.editableComponents.${index}.defaultContent`,
              code: "invalid_default_content",
              message: error instanceof Error ? error.message : "default content is invalid",
            },
          ];
        }
      })
    : [];
  const errors = [...embeddedSecretErrors, ...schemaErrors, ...contentErrors];
  return errors.length === 0 && parsed.success
    ? { success: true, data: parsed.data, errors: [] }
    : { success: false, errors };
}

function findEmbeddedSecrets(
  value: unknown,
  path: (string | number)[] = [],
): ClientSiteManifestError[] {
  if (Array.isArray(value))
    return value.flatMap((entry, index) => findEmbeddedSecrets(entry, [...path, index]));
  if (!value || typeof value !== "object") return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const nextPath = [...path, key];
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "");
    const errors: ClientSiteManifestError[] = [];
    if (forbiddenSecretKeys.has(normalizedKey)) {
      errors.push({
        path: nextPath.join("."),
        code: "embedded_secret_field",
        message: "secret values are forbidden; use secretRefs",
      });
    }
    if (typeof entry === "string" && secretValuePatterns.some((pattern) => pattern.test(entry))) {
      errors.push({
        path: nextPath.join("."),
        code: "embedded_secret_value",
        message: "appears to contain a secret value; use secretRefs",
      });
    }
    return [...errors, ...findEmbeddedSecrets(entry, nextPath)];
  });
}
