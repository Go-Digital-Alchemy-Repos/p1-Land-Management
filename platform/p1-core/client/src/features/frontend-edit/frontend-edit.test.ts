import { describe, expect, it } from "vitest";
import {
  buildFrontendEditHref,
  canUseFrontendEditTarget,
  getFrontendEditQueryParam,
  shouldHideFrontendEditButton,
  type FrontendEditTarget,
} from "./frontend-edit";
import type { User } from "@shared/schema";

function user(role: string, adminPermissions: string[] = []): User {
  return {
    id: `${role}-1`,
    email: `${role}@example.com`,
    password: "",
    firstName: role,
    lastName: "User",
    role,
    adminPermissions,
    profileImageUrl: null,
    emailVerified: false,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}

describe("frontend edit helpers", () => {
  it("builds admin editor URLs with return targets", () => {
    const returnTo = "/insights/example-post?ref=nav";
    const targets: Array<[FrontendEditTarget, string]> = [
      [{ kind: "cms-page", id: "page-1", label: "Edit Page" }, "/admin/cms/pages/page-1"],
      [{ kind: "blog-post", id: "post-1", label: "Edit Post" }, "/admin/cms/blog/post-1"],
      [{ kind: "event", id: "event-1", label: "Edit Event" }, "/admin/events"],
      [{ kind: "career-job", id: "job-1", label: "Edit Job" }, "/admin/careers"],
      [{ kind: "directory-listing", id: "profile-1", label: "Edit Listing" }, "/admin/therapists"],
      [{ kind: "product", id: "product-1", label: "Edit Product" }, "/admin/ecommerce/products"],
    ];

    for (const [target, expectedPath] of targets) {
      const href = buildFrontendEditHref(target, returnTo);
      expect(href.startsWith(`${expectedPath}?`)).toBe(true);
      expect(decodeURIComponent(href)).toContain("returnTo=/insights/example-post?ref=nav");
    }

    expect(
      buildFrontendEditHref({ kind: "event", id: "event-1", label: "Edit Event" }, returnTo),
    ).toContain("edit=event-1");
    expect(
      buildFrontendEditHref({ kind: "career-job", id: "job-1", label: "Edit Job" }, returnTo),
    ).toContain("tab=jobs");
  });

  it("enforces admin and editor permissions per target type", () => {
    const contentEditor = user("editor", ["content"]);
    const directoryEditor = user("editor", ["directory"]);
    const admin = user("admin");
    const therapist = user("therapist");

    expect(
      canUseFrontendEditTarget(admin, [], { kind: "product", id: "product-1", label: "Product" }),
    ).toBe(true);
    expect(
      canUseFrontendEditTarget(contentEditor, ["content"], {
        kind: "blog-post",
        id: "post-1",
        label: "Post",
      }),
    ).toBe(true);
    expect(
      canUseFrontendEditTarget(contentEditor, ["content"], {
        kind: "directory-listing",
        id: "profile-1",
        label: "Listing",
      }),
    ).toBe(false);
    expect(
      canUseFrontendEditTarget(directoryEditor, ["directory"], {
        kind: "directory-listing",
        id: "profile-1",
        label: "Listing",
      }),
    ).toBe(true);
    expect(
      canUseFrontendEditTarget(directoryEditor, ["directory"], {
        kind: "product",
        id: "product-1",
        label: "Product",
      }),
    ).toBe(false);
    expect(
      canUseFrontendEditTarget(therapist, [], { kind: "cms-page", id: "page-1", label: "Page" }),
    ).toBe(false);
    expect(
      canUseFrontendEditTarget(null, [], { kind: "cms-page", id: "page-1", label: "Page" }),
    ).toBe(false);
  });

  it("hides the floating edit button on non-public routes", () => {
    expect(shouldHideFrontendEditButton("/admin/events")).toBe(true);
    expect(shouldHideFrontendEditButton("/auth/login")).toBe(true);
    expect(shouldHideFrontendEditButton("/account/orders")).toBe(true);
    expect(shouldHideFrontendEditButton("/forms/contact")).toBe(true);
    expect(shouldHideFrontendEditButton("/insights/example-post")).toBe(false);
    expect(shouldHideFrontendEditButton("/directory/profile-1")).toBe(false);
  });

  it("reads frontend edit query parameters from deep links", () => {
    const search = "?tab=jobs&edit=job-1&returnTo=%2Fcareers%2Fclinical-director%3Fsrc%3Dsite";

    expect(getFrontendEditQueryParam("edit", search)).toBe("job-1");
    expect(getFrontendEditQueryParam("tab", search)).toBe("jobs");
    expect(getFrontendEditQueryParam("returnTo", search)).toBe(
      "/careers/clinical-director?src=site",
    );
    expect(getFrontendEditQueryParam("missing", search)).toBeNull();
  });
});
