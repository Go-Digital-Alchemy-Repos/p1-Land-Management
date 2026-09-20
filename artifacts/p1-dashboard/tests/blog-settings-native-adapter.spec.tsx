import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const api = vi.hoisted(() =>
  Object.fromEntries(
    [
      "listMarketingBlogTaxonomies",
      "createMarketingBlogTaxonomy",
      "updateMarketingBlogTaxonomy",
      "deleteMarketingBlogTaxonomy",
      "getMarketingBlogCommentSettings",
      "saveMarketingBlogCommentSettings",
      "listMarketingBlogComments",
      "updateMarketingBlogComment",
      "setMarketingBlogCommentStatus",
      "deleteMarketingBlogComment",
    ].map((k) => [k, vi.fn()]),
  ),
);
vi.mock("@workspace/api-client-react/dashboard", () => api);
import {
  BlogTaxonomies,
  BlogComments,
  BlogCommentSettings,
} from "../src/marketing/BlogSettings";
let host: HTMLDivElement, root: Root;
const row = {
  id: "one",
  name: "Land",
  slug: "land",
  type: "category",
  parentId: null,
  sortOrder: 0,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  api.listMarketingBlogTaxonomies.mockResolvedValue([row]);
  api.getMarketingBlogCommentSettings.mockResolvedValue({
    settings: {
      commentsEnabled: false,
      allowGuestComments: false,
      allowLinksInComments: false,
      requireApproval: true,
      enableSpamProtection: true,
      enableHoneypot: true,
      enableRateLimit: true,
      rateLimitSeconds: 60,
      maxLinksPerComment: 2,
    },
    statusCounts: { pending: 2, approved: 1, spam: 0, rejected: 0 },
  });
  api.listMarketingBlogComments.mockResolvedValue([
    {
      id: "c",
      body: "Original comment",
      postTitle: "Post",
      authorName: "Guest",
      status: "pending",
      createdAt: "2026-09-19T12:00:00Z",
    },
  ]);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
const button = (text: string) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === text)!;
async function click(text: string) {
  await act(async () => button(text).click());
}
async function edit(value: string) {
  await act(async () => {
    const input = host.querySelector("input")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("blocks create until initial authoritative list loads, with retry", async () => {
  api.listMarketingBlogTaxonomies.mockRejectedValueOnce(Error("Offline"));
  await act(async () => root.render(<BlogTaxonomies />));
  expect(button("New category or tag").disabled).toBe(true);
  await submit();
  expect(api.createMarketingBlogTaxonomy).not.toHaveBeenCalled();
  await click("Reload taxonomies");
  expect(button("New category or tag").disabled).toBe(false);
});
it("normalizes repeated saves without response identity fields and shows parent paths", async () => {
  api.listMarketingBlogTaxonomies.mockResolvedValue([
    row,
    { ...row, id: "child", name: "Grading", parentId: "one" },
  ]);
  api.updateMarketingBlogTaxonomy.mockResolvedValue({
    ...row,
    name: "Changed",
    createdAt: "server-field",
  });
  await act(async () => root.render(<BlogTaxonomies />));
  expect(host.textContent).toContain("Land / Grading");
  await click("Edit Land");
  await edit("Changed");
  await submit();
  await edit("Again");
  await submit();
  expect(api.updateMarketingBlogTaxonomy.mock.calls[1][1]).toEqual({
    name: "Again",
    slug: "land",
    type: "category",
    parentId: null,
    sortOrder: 0,
  });
});
it("requires reloaded-list review after uncertain create and preserves draft", async () => {
  api.createMarketingBlogTaxonomy.mockRejectedValue(Error("lost response"));
  await act(async () => root.render(<BlogTaxonomies />));
  await edit("New taxonomy");
  await submit();
  await submit();
  expect(api.createMarketingBlogTaxonomy).toHaveBeenCalledTimes(1);
  expect((host.querySelector("input") as HTMLInputElement).value).toBe(
    "New taxonomy",
  );
  expect(button("I checked the list; allow another create").disabled).toBe(
    true,
  );
  await click("Reload taxonomies");
  await click("I checked the list; allow another create");
  await submit();
  expect(api.createMarketingBlogTaxonomy).toHaveBeenCalledTimes(2);
});
it("blocks navigation/filter changes during clean moderation mutation and displays counts/date", async () => {
  let resolve: (v: unknown) => void;
  api.setMarketingBlogCommentStatus.mockImplementation(
    () => new Promise((r) => (resolve = r)),
  );
  await act(async () => root.render(<BlogComments />));
  expect(host.textContent).toContain("pending (2)");
  expect(host.textContent).toContain("2026");
  await click("approved");
  expect(
    window.dispatchEvent(
      new Event("p1:before-navigation", { cancelable: true }),
    ),
  ).toBe(false);
  await act(async () =>
    resolve!({ id: "c", body: "Original comment", status: "approved" }),
  );
  expect(
    window.dispatchEvent(
      new Event("p1:before-navigation", { cancelable: true }),
    ),
  ).toBe(true);
});
it("offers settings retry and keeps edited values after failure", async () => {
  api.getMarketingBlogCommentSettings.mockRejectedValueOnce(Error("Offline"));
  await act(async () => root.render(<BlogCommentSettings />));
  await click("Retry loading settings");
  expect(host.textContent).toContain("Participation Rules");
  const input = host.querySelector("input")!;
  await act(async () => input.click());
  api.saveMarketingBlogCommentSettings.mockRejectedValue(Error("Conflict"));
  await submit();
  expect(input.checked).toBe(true);
  expect(host.textContent).toContain("Conflict");
});
it("hides stale comments after a failed filter read and restores only successful retry results", async () => {
  await act(async () => root.render(<BlogComments />));
  expect(host.querySelector("textarea")).not.toBeNull();
  api.listMarketingBlogComments.mockRejectedValueOnce(
    Error("Filter unavailable"),
  );
  await act(async () => {
    const select = host.querySelector("select")!;
    select.value = "spam";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.textContent).toContain("Filter unavailable");
  expect(host.querySelector("textarea")).toBeNull();
  expect(host.textContent).not.toContain("No comments match");
  api.listMarketingBlogComments.mockResolvedValue([]);
  await click("Reload comments");
  expect(host.textContent).toContain("No comments match this status.");
});
