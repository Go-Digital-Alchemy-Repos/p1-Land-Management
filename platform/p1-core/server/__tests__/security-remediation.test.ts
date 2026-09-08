import { describe, expect, it } from "vitest";
import type { Event } from "@shared/schema/events";
import { updateOwnTherapistProfileSchema } from "@shared/schema";
import { validateClientStackEnvironment } from "../config/client-stack";
import {
  applyEventAccessEntitlements,
  canAccessPublicEvent,
  redactEventAccessFields,
} from "../services/public-event.service";
import { isDesignEditableBrandingSetting } from "../utils/branding-settings-policy";
import { isPublicR2Key } from "../utils/public-storage-policy";
import { sanitizePublicCmsContent, sanitizePublicRichHtml } from "../utils/sanitize-rich-html";

describe("security remediation policies", () => {
  it("requires the production bootstrap token in client-stack preflight", () => {
    const result = validateClientStackEnvironment({
      CLIENT_STACK_ID: "client-one",
      DATABASE_URL: "postgresql://db.example.test/core",
      SESSION_SECRET: "a".repeat(32),
      APP_URL: "https://core.example.test",
      TRUSTED_ORIGINS: "https://core.example.test",
    });

    expect(result.errors).toContain("SETUP_TOKEN is required");
  });

  it("allows design editors to submit only known non-secret branding keys", () => {
    expect(
      isDesignEditableBrandingSetting({
        key: "brand_primary_color",
        value: "#123456",
        category: "branding",
        isSecret: false,
      }),
    ).toBe(true);
    expect(
      isDesignEditableBrandingSetting({
        key: "stripe_secret_key",
        value: "replacement",
        category: "branding",
        isSecret: false,
      }),
    ).toBe(false);
    expect(
      isDesignEditableBrandingSetting({
        key: "frontend_logo_url",
        value: "replacement",
        category: "branding",
        isSecret: true,
      }),
    ).toBe(false);
  });

  it("strips provider moderation and lifecycle fields from self-service updates", () => {
    const parsed = updateOwnTherapistProfileSchema.parse({
      title: "Counselor",
      isApproved: true,
      isActive: true,
      isFeatured: true,
      featuredUntil: new Date(),
      rejectionReason: null,
      directoryMode: "store_locator",
    });

    expect(parsed).toEqual({ title: "Counselor" });
  });

  it("sanitizes provider rich content while preserving basic formatting", () => {
    const html = sanitizePublicRichHtml(
      '<p style="position:fixed">Hello <strong>there</strong></p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    );

    expect(html).toBe("<p>Hello <strong>there</strong></p><a>bad</a>");
  });

  it("sanitizes every HTML-bearing public CMS field while preserving editor rich content", () => {
    const createdAt = new Date("2026-09-03T00:00:00.000Z");
    const content = sanitizePublicCmsContent({
      createdAt,
      blocks: [
        {
          props: {
            content:
              '<h2>Heading</h2><p>Safe <a href="https://example.test">link</a></p><img src="/cms/photo.webp" alt="Farm" data-align="center" class="cms-richtext-media cms-richtext-media-center" onerror="alert(1)"><script>alert(1)</script>',
            ctaLink: "javascript:alert(1)",
            ctaSecondaryLink: "/give",
          },
        },
      ],
      widgets: [
        { settings: { html: '<p>Widget</p><iframe src="https://evil.example"></iframe>' } },
      ],
      fields: [{ config: { htmlContent: '<p>Form copy</p><img src="javascript:alert(1)">' } }],
    });

    expect(content).toMatchObject({
      createdAt,
      blocks: [
        {
          props: {
            content:
              '<h2>Heading</h2><p>Safe <a href="https://example.test">link</a></p><img src="/cms/photo.webp" alt="Farm" data-align="center" class="cms-richtext-media cms-richtext-media-center" />',
            ctaLink: "#",
          },
        },
      ],
      widgets: [{ settings: { html: "<p>Widget</p>" } }],
      fields: [{ config: { htmlContent: "<p>Form copy</p><img />" } }],
    });
  });

  it("allows only safe public CMS URL schemes", () => {
    expect(
      sanitizePublicCmsContent({
        ctaLink: "javascript:alert(1)",
        primaryLink: "data:text/html,unsafe",
        secondaryLink: "/fund-a-farm",
        link: "https://example.test/donate",
      }),
    ).toEqual({
      ctaLink: "#",
      primaryLink: "#",
      secondaryLink: "/fund-a-farm",
      link: "https://example.test/donate",
    });
  });

  it("keeps private R2 namespaces out of the public object proxy", () => {
    expect(isPublicR2Key("cms/media/photo.webp")).toBe(true);
    expect(isPublicR2Key("career-resumes/resume.pdf")).toBe(false);
    expect(isPublicR2Key("cms/../career-resumes/resume.pdf")).toBe(false);
  });

  it("redacts event access material and denies restricted events to anonymous users", () => {
    const event = {
      visibility: "members_only",
      virtualJoinUrl: "https://meeting.example.test/join",
      zoomLink: "https://zoom.example.test/join",
      virtualDialInInfo: "555-0100",
      recordingUrl: "https://media.example.test/paid",
    } as Event;

    expect(canAccessPublicEvent(event, null)).toBe(false);
    expect(canAccessPublicEvent(event, "therapist")).toBe(true);
    expect(redactEventAccessFields(event)).toMatchObject({
      virtualJoinUrl: null,
      zoomLink: null,
      virtualDialInInfo: null,
      recordingUrl: null,
    });
    expect(
      applyEventAccessEntitlements(event, { canJoin: false, canViewRecording: true }),
    ).toMatchObject({
      virtualJoinUrl: null,
      zoomLink: null,
      virtualDialInInfo: null,
      recordingUrl: "https://media.example.test/paid",
    });
  });
});
