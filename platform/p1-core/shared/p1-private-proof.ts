import { z } from "zod";
export const PRIVATE_PROOF_KEY = "p1_private_proof_inventory";
export const PRIVATE_PROOF_CATEGORY = "p1_private_proof";
export function isPrivateProofSetting(key: unknown, category?: unknown) {
  return [key, category].some(
    (value) =>
      typeof value === "string" &&
      [PRIVATE_PROOF_KEY, PRIVATE_PROOF_CATEGORY].includes(value.trim().toLowerCase()),
  );
}
export const proofCategories = [
  "Credentials and insurance",
  "Equipment and capacity",
  "Safety and onboarding",
  "Reporting samples",
  "Vendor documents",
  "Response arrangements",
  "Concrete flatwork scope",
  "Project stories",
  "Customer logos and endorsements",
] as const;
const text = z.string().trim().max(2000);
export const sourceUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.search &&
        !u.hash &&
        !u.port &&
        /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname) &&
        !/(?:^|\.)(localhost|local|internal|test|invalid)$/i.test(u.hostname)
      );
    } catch {
      return false;
    }
  }, "Use a public HTTPS source URL without credentials, query parameters or fragments.");
const date = z.union([
  z.literal(""),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v),
]);
export const proofDraftSchema = z
  .object({
    title: text,
    scope: text,
    delivery: z.enum(["unknown", "self_performed", "coordinated"]),
    sourceUrl,
    privateReference: text,
    sourceOwner: text,
    technicalReviewer: text,
    reviewedDate: date,
    expiryDate: date,
    permission: z.enum(["unknown", "pending", "granted", "denied"]),
    permissionScope: text,
    publicExcerpt: text,
    approvedAssetReference: text,
  })
  .strict();
export type ProofDraft = z.infer<typeof proofDraftSchema>;
export const emptyProofDraft: ProofDraft = {
  title: "",
  scope: "",
  delivery: "unknown",
  sourceUrl: "",
  privateReference: "",
  sourceOwner: "",
  technicalReviewer: "",
  reviewedDate: "",
  expiryDate: "",
  permission: "unknown",
  permissionScope: "",
  publicExcerpt: "",
  approvedAssetReference: "",
};
export type ProofRecord = {
  category: (typeof proofCategories)[number];
  draft: ProofDraft;
  status: "draft" | "approved" | "revoked";
  reviewedRevision?: number;
  reviewer?: string;
  reviewedAt?: string;
};
export type ProofInventory = {
  revision: number;
  records: ProofRecord[];
  history: Array<{
    action: string;
    category: string;
    actor: string;
    at: string;
    revision: number;
    draftDigest: string;
  }>;
};
export const proofActionSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    index: z.number().int().min(0).max(8),
    action: z.enum(["save", "approve", "revoke"]),
    draft: proofDraftSchema.optional(),
  })
  .strict();
