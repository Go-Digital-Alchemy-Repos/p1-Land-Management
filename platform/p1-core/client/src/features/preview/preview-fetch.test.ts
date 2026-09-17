import { expect, it, vi } from "vitest";
import { createBuilderPreviewFetch } from "./preview-fetch";

it("permits anonymous public reads and removes account credentials and caller headers", async () => {
  const transport = vi.fn(async () => new Response("[]"));
  const previewFetch = createBuilderPreviewFetch("https://core.example.test", transport);
  await previewFetch("/api/forms/contact-form", {
    credentials: "include",
    headers: { Authorization: "private" },
  });
  expect(transport).toHaveBeenCalledWith(
    "https://core.example.test/api/forms/contact-form",
    expect.objectContaining({
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" },
    }),
  );
  expect(await (await previewFetch("/api/auth/me")).json()).toBeNull();
  expect(transport).toHaveBeenCalledTimes(1);
});

it("denies mutations, account/private reads, external origins and path traversal", async () => {
  const transport = vi.fn(async () => new Response("[]"));
  const previewFetch = createBuilderPreviewFetch("https://core.example.test", transport);
  for (const path of [
    "/api/admin/cms/pages",
    "/api/events/recordings/my-purchases",
    "/api/forms/../../admin/users",
    "/api/forms/a%2Fb",
    "https://evil.test/api/blog",
    "/api/auth/me?token=ignored",
  ])
    await expect(previewFetch(path)).rejects.toThrow();
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"])
    await expect(previewFetch("/api/blog", { method })).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
});
