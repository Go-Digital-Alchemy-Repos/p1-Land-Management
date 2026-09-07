// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import PrivateProofPage from "./private-proof-page";
import { proofCategories, emptyProofDraft } from "@shared/p1-private-proof";
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { role: "editor" } }) }));
vi.mock("../admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: async () => {
    throw new Error(
      "This inventory changed. Your inputs are retained; reload the latest version before applying your edits.",
    );
  },
}));
Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
it("keeps the editor's draft and version after a stale-save conflict", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(["/api/admin/cms/private-proof"], {
    revision: 3,
    records: proofCategories.map((category) => ({
      category,
      draft: { ...emptyProofDraft, title: "Unsaved evidence marker" },
      status: "draft",
    })),
    history: [],
  });
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <PrivateProofPage />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(container.textContent).toContain("Your inputs are retained");
  expect((container.querySelector('input[type="text"]') as HTMLInputElement).value).toBe(
    "Unsaved evidence marker",
  );
  expect(container.textContent).toContain("Inventory revision 3");
  expect(container.textContent).not.toContain("Approve evidence privately");
  expect(container.querySelector('input[type="file"]')).toBeNull();
  await act(async () => root.unmount());
  client.clear();
});
