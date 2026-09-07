import { describe, expect, it } from "vitest";
import {
  CAREER_APPLICATION_STATUSES,
  CAREER_EMPLOYMENT_TYPES,
  CAREER_JOB_STATUSES,
  careerSettingsSchema,
  insertCareerJobSchema,
} from "./careers";

describe("career schema", () => {
  it("defines production v1 enums", () => {
    expect(CAREER_JOB_STATUSES).toContain("published");
    expect(CAREER_APPLICATION_STATUSES).toContain("interviewing");
    expect(CAREER_EMPLOYMENT_TYPES).toContain("full_time");
  });

  it("validates job slugs", () => {
    const result = insertCareerJobSchema.safeParse({
      title: "Product Manager",
      slug: "product-manager",
    });
    expect(result.success).toBe(true);

    const invalid = insertCareerJobSchema.safeParse({
      title: "Product Manager",
      slug: "Product Manager",
    });
    expect(invalid.success).toBe(false);
  });

  it("defaults share settings on", () => {
    const settings = careerSettingsSchema.parse({});
    expect(settings.sharing.enabled).toBe(true);
    expect(settings.sharing.copyLink).toBe(true);
    expect(settings.integrations.indeedFeedEnabled).toBe(false);
  });
});
