import {
  cmsFormFieldSchema,
  type CmsFormField,
  type CmsFormSettings,
  type InsertCmsForm,
} from "@shared/schema";
import { z } from "zod";
import { storage } from "../storage";
import { logger } from "../utils/logger";

type CmsFormFieldInput = z.input<typeof cmsFormFieldSchema>;

function field(
  id: string,
  key: string,
  label: string,
  type: CmsFormField["type"],
  options: Partial<CmsFormFieldInput> = {},
): CmsFormField {
  return cmsFormFieldSchema.parse({
    id,
    key,
    label,
    type,
    placeholder: "",
    helpText: "",
    required: false,
    width: "full",
    options: [],
    config: {},
    ...options,
  });
}

function settings(overrides: Partial<CmsFormSettings>): CmsFormSettings {
  return {
    submitButtonText: "Submit",
    successMessage: "Thanks! Your submission has been received.",
    mailchimpEnabled: false,
    mailchimpTag: "",
    notifyAdmins: false,
    storeAsContactMessage: false,
    createCrmLead: false,
    ...overrides,
  };
}

type ManagedSystemForm = InsertCmsForm;

const SYSTEM_FORMS: ManagedSystemForm[] = [{
  name: "P1 Estimate Request", slug: "p1-estimate", description: "Qualified property service inquiries", kind: "contact", isSystem: true, isActive: true,
  fields: [
    field("name", "name", "Name", "text", { required: true }),
    field("email", "email", "Email", "email", { required: true }),
    field("phone", "phone", "Phone", "text"),
    field("company", "company", "Company", "text"),
    field("address", "address", "Property location", "text", { required: true }),
    field("acreage", "acreage", "Approximate acreage", "text"),
    field("propertyType", "propertyType", "Property type", "text"),
    field("services", "services", "Services", "checkbox"),
    field("message", "message", "Project details", "textarea", { required: true }),
  ],
  settings: settings({ submitButtonText: "Request an estimate", successMessage: "Your estimate request has been received.", createCrmLead: true, notifyAdmins: true }),
}];

export async function ensureSystemForms() {
  logger.app.info("Ensuring system forms");

  for (const systemForm of SYSTEM_FORMS) {
    const existing = await storage.forms.getBySlug(systemForm.slug);
    if (existing) {
      await storage.forms.update(existing.id, {
        name: existing.name || systemForm.name,
        description: existing.description ?? systemForm.description ?? "",
        kind: existing.kind || systemForm.kind,
        isSystem: true,
        isActive: existing.isActive ?? true,
        fields:
          Array.isArray(existing.fields) && existing.fields.length > 0
            ? existing.fields
            : systemForm.fields,
        settings: {
          ...systemForm.settings,
          ...(typeof existing.settings === "object" && existing.settings ? existing.settings : {}),
        },
      });
      continue;
    }

    await storage.forms.create(systemForm);
  }

  logger.app.info("System forms ensured");
}
