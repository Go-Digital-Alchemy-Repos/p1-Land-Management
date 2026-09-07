import { z } from "zod";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";

export interface TherapistWithUser extends TherapistProfile {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}

export interface PaginatedTherapists {
  items: TherapistWithUser[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DirectoryFilterOptions {
  languages: string[];
  countries: string[];
}

export const SortOption = {
  NAME: "name",
  NEWEST: "newest",
} as const;
export type SortOption = (typeof SortOption)[keyof typeof SortOption];

export const therapistSearchSchema = z.object({
  search: z.string().optional().default(""),
  specialization: z.string().optional().default(""),
  practiceMode: z.string().optional().default(""),
  language: z.string().optional().default(""),
  country: z.string().optional().default(""),
  acceptingClients: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true" || undefined),
  willingToTravel: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true" || undefined),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  sort: z.enum(["name", "newest"]).optional().default("name"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type TherapistSearchParams = z.infer<typeof therapistSearchSchema>;
