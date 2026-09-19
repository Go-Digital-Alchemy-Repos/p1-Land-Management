import { z } from "zod";
export const documentVersionSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const documentIdentifierSchema = z.string().uuid();
export const documentFieldsSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  category: z.string().trim().min(1).max(120),
  content: z.string().max(500000),
  sortOrder: z.number().int().min(-100000).max(100000),
  isPublished: z.boolean(),
}).strict();
