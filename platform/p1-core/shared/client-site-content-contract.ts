import { z } from "zod";
import type { ClientSiteManifest } from "./client-site-manifest";

export type ClientSiteEditableComponent = ClientSiteManifest["puck"]["editableComponents"][number];

// Explicitly reject URL controls and backslashes before browser normalization.
// eslint-disable-next-line no-control-regex
const sitePath = /^\/(?!\/)[^\s\\\u0000-\u001f\u007f]*$/;

export function isContactLink(value: string): boolean {
  return (
    /^tel:\+?[0-9 ()-]{3,30}$/.test(value) ||
    /^mailto:[a-zA-Z0-9.!#$&*+_=-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
  );
}

function isCredentialFreeHttps(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function flattenLeaves(
  value: unknown,
  allowedPaths: Set<string>,
  prefix = "",
): Map<string, unknown> {
  const leaves = new Map<string, unknown>();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) leaves.set(prefix, value);
    return leaves;
  }
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      if (![...allowedPaths].some((allowed) => allowed.startsWith(`${path}.`))) {
        throw new Error(`Content field is not editable: ${path}`);
      }
      for (const [leafPath, leaf] of flattenLeaves(child, allowedPaths, path))
        leaves.set(leafPath, leaf);
    } else {
      leaves.set(path, child);
    }
  }
  return leaves;
}

export function validateClientSiteComponentContent(
  component: ClientSiteEditableComponent,
  input: unknown,
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Content must be an object");
  }
  const allowed = new Set(component.fields.map((field) => field.path));
  const leaves = flattenLeaves(input, allowed);
  for (const path of leaves.keys()) {
    if (!allowed.has(path)) throw new Error(`Content field is not editable: ${path}`);
  }
  for (const field of component.fields) {
    const value = leaves.get(field.path);
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
      if (field.required) throw new Error(`${field.label} is required`);
      continue;
    }
    if (typeof value !== "string") throw new Error(`${field.label} must be text`);
    if (field.maxLength && value.trim().length > field.maxLength) {
      throw new Error(`${field.label} must be ${field.maxLength} characters or fewer`);
    }
    if (
      field.type === "ctaTarget" &&
      !(
        sitePath.test(value) ||
        isCredentialFreeHttps(value) ||
        isContactLink(value) ||
        /^#[a-zA-Z0-9_-]+$/.test(value)
      )
    ) {
      throw new Error(`${field.label} must be an internal path or credential-free HTTPS URL`);
    }
    if (field.type === "image") {
      let allowed = sitePath.test(value);
      if (!allowed && isCredentialFreeHttps(value)) {
        allowed =
          field.allowedImageOrigins === undefined ||
          // Reject browser URL normalization tricks before matching the exact configured origin.
          // eslint-disable-next-line no-control-regex
          (!/[\\\s\u0000-\u001f\u007f]/.test(value) &&
            field.allowedImageOrigins.includes(new URL(value).origin));
      }
      if (!allowed)
        throw new Error(`${field.label} must be an internal path or an allowed HTTPS image URL`);
    }
  }
  return z.record(z.unknown()).parse(input);
}
