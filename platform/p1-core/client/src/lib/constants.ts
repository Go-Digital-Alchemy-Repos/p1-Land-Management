export { SPECIALIZATIONS, LANGUAGES, PracticeMode } from "@shared/types";

export const PRACTICE_MODES = {
  in_person: "In-Person",
  virtual: "Virtual",
  both: "Both",
} as const;

export const ROLE_LABELS = {
  admin: "Admin",
  therapist: "Provider",
  client: "Member",
} as const;
