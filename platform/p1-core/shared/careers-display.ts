// Data-only display constants shared by schemas and browser presentations.
export const CAREER_JOB_STATUSES = ["draft", "published", "closed", "archived"] as const;
export const CAREER_JOB_VISIBILITIES = ["public", "internal"] as const;
export const CAREER_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "volunteer",
] as const;
export const CAREER_WORK_MODES = ["on_site", "hybrid", "remote"] as const;
export const CAREER_APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "interviewing",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type CareerJobStatus = (typeof CAREER_JOB_STATUSES)[number];
export type CareerJobVisibility = (typeof CAREER_JOB_VISIBILITIES)[number];
export type CareerEmploymentType = (typeof CAREER_EMPLOYMENT_TYPES)[number];
export type CareerWorkMode = (typeof CAREER_WORK_MODES)[number];
export type CareerApplicationStatus = (typeof CAREER_APPLICATION_STATUSES)[number];

export const CAREER_JOB_STATUS_LABELS: Record<CareerJobStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

export const CAREER_EMPLOYMENT_TYPE_LABELS: Record<CareerEmploymentType, string> = {
  full_time: "Full-Time",
  part_time: "Part-Time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
  volunteer: "Volunteer",
};

export const CAREER_WORK_MODE_LABELS: Record<CareerWorkMode, string> = {
  on_site: "On-Site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const CAREER_APPLICATION_STATUS_LABELS: Record<CareerApplicationStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};
