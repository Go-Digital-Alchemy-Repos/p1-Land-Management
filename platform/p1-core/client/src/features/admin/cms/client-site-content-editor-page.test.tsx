// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import ClientSiteContentEditorPage from "./client-site-content-editor-page";
import { queryClient, apiRequest } from "@/lib/queryClient";
const state = vi.hoisted(() => ({
  server: {} as any,
  canBlog: false,
  route: "home",
  delayedRead: null as Promise<any> | null,
  conflict: false,
  failRead: false,
  failReadAfterMutation: false,
  toast: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ hasAdminPermission: () => state.canBlog }),
}));
vi.mock("wouter", () => ({
  useRoute: () => [true, { routeId: state.route, componentKey: "home-content" }],
}));
vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: any) => <>{children}</>,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock("@/hooks/use-unsaved-changes-guard", () => ({
  useUnsavedChangesGuard: () => ({ dialog: null, confirmDiscardChanges: (fn: () => void) => fn() }),
}));
vi.mock("./builder/client-site-preview-frame", () => ({
  ClientSitePreviewFrame: () => <div>Actual preview adapter</div>,
}));
vi.mock("@/lib/queryClient", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: ({ queryKey }) => {
          if (
            state.delayedRead &&
            String(queryKey[0]) === "/api/admin/client-site-content/home/home-content"
          )
            return state.delayedRead;
          if (state.failRead) return Promise.reject(new Error("Fresh read failed"));
          return Promise.resolve(
            String(queryKey[0]).endsWith("/revisions") ? [] : structuredClone(state.server),
          );
        },
      },
    },
  });
  return {
    queryClient,
    apiRequest: vi.fn(async (_method: string, _url: string, payload: any) => {
      if (state.conflict) throw Error("Revision conflict");
      state.server = {
        ...state.server,
        draftRevision: state.server.draftRevision + 1,
        draftContent: structuredClone(payload.content),
      };
      if (state.failReadAfterMutation) state.failRead = true;
      return new Response(JSON.stringify(state.server));
    }),
  };
});
let root: Root, host: HTMLDivElement;
const endpoint = "/api/admin/client-site-content/home/home-content";
beforeEach(() => {
  state.canBlog = false;
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  queryClient.clear();
  vi.clearAllMocks();
  state.route = "home";
  state.delayedRead = null;
  state.conflict = false;
  state.failRead = false;
  state.failReadAfterMutation = false;
  state.server = {
    stackId: "p1-land-management",
    route: { id: "home", path: "/" },
    component: {
      key: "home-content",
      fields: [{ path: "title", label: "Page title", type: "text", maxLength: 100 }],
    },
    previewUrl: "https://www.p1landmanagement.com/?cmsPreview=1",
    draftContent: { title: "Original", unknown: { retained: true } },
    draftRevision: 1,
    publishedRevision: 1,
    publishedAt: null,
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  queryClient.clear();
});
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 10));
}
async function render() {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <ClientSiteContentEditorPage />
      </QueryClientProvider>,
    );
    await settle();
  });
  await act(settle);
}
async function type(value: string) {
  await act(async () => {
    const input = host.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function save() {
  await act(async () => {
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Save draft")!
      .click();
    await settle();
  });
  await act(settle);
}
it("background refetch retains dirty text and the original expected revision on conflict", async () => {
  await render();
  await type("Local draft");
  await act(async () => {
    state.server = { ...state.server, draftRevision: 2, draftContent: { title: "Another editor" } };
    await queryClient.invalidateQueries({ queryKey: [endpoint] });
  });
  expect((host.querySelector("input") as HTMLInputElement).value).toBe("Local draft");
  expect(host.textContent).toContain("Draft r1");
  state.conflict = true;
  await save();
  expect(apiRequest).toHaveBeenCalledWith(
    "PUT",
    `${endpoint}/draft`,
    expect.objectContaining({
      expectedRevision: 1,
      content: expect.objectContaining({ title: "Local draft" }),
    }),
  );
  expect((host.querySelector("input") as HTMLInputElement).value).toBe("Local draft");
  expect(apiRequest).toHaveBeenCalledTimes(1);
  await act(async () => {
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Reload latest revision")!
      .click();
    await settle();
  });
  await act(settle);
  expect((host.querySelector("input") as HTMLInputElement).value).toBe("Another editor");
  expect(host.textContent).toContain("Draft r2");
});
it("a successful save adopts the new revision before the next save", async () => {
  await render();
  await type("First draft");
  await save();
  expect(host.textContent).toContain("Draft r2");
  await type("Second draft");
  await save();
  expect(apiRequest).toHaveBeenLastCalledWith(
    "PUT",
    `${endpoint}/draft`,
    expect.objectContaining({
      expectedRevision: 2,
      content: { title: "Second draft", unknown: { retained: true } },
    }),
  );
  expect(host.textContent).toContain("Draft r3");
});

it("successful mutation plus failed readback retains local draft and reports refresh failure", async () => {
  await render();
  await type("Saved remotely, kept locally");
  state.failReadAfterMutation = true;
  await save();
  expect(state.server.draftRevision).toBe(2);
  expect((host.querySelector("input") as HTMLInputElement).value).toBe(
    "Saved remotely, kept locally",
  );
  expect(host.textContent).toContain("Draft r1");
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(state.toast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Content changed, but the latest revision could not be reloaded",
      variant: "destructive",
    }),
  );
  expect(state.toast).not.toHaveBeenCalledWith({ title: "Draft saved" });
});
it("failed explicit reload preserves dirty input and its revision", async () => {
  await render();
  await type("Keep this local draft");
  state.failRead = true;
  await act(async () => {
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Reload latest revision")!
      .click();
    await settle();
  });
  await act(settle);
  expect((host.querySelector("input") as HTMLInputElement).value).toBe("Keep this local draft");
  expect(host.textContent).toContain("Draft r1");
  expect(state.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Could not reload content", variant: "destructive" }),
  );
});

it.each(["reload", "save readback"])(
  "ignores delayed route A %s after route B becomes active",
  async (operation) => {
    await render();
    let resolve!: (value: any) => void;
    const old = {
      ...structuredClone(state.server),
      draftRevision: 5,
      draftContent: { title: "Late A" },
    };
    state.delayedRead = new Promise((r) => {
      resolve = r;
    });
    if (operation === "save readback") {
      await type("A draft");
      await save();
    } else
      await act(async () => {
        Array.from(host.querySelectorAll("button"))
          .find((b) => b.textContent === "Reload latest revision")!
          .click();
        await settle();
      });
    state.route = "about";
    state.server = {
      ...state.server,
      route: { id: "about", path: "/about" },
      draftRevision: 9,
      draftContent: { title: "B saved" },
    };
    await render();
    await type("B local draft");
    state.toast.mockClear();
    await act(async () => {
      resolve(old);
      await settle();
    });
    await act(settle);
    expect((host.querySelector("input") as HTMLInputElement).value).toBe("B local draft");
    expect(host.textContent).toContain("Draft r9");
    expect(state.toast).not.toHaveBeenCalled();
  },
);
it("fences route A to B to A generations while an old reload remains pending", async () => {
  await render();
  let resolve!: (v: any) => void;
  const old = {
    ...structuredClone(state.server),
    draftRevision: 5,
    draftContent: { title: "Obsolete A" },
  };
  state.delayedRead = new Promise((r) => {
    resolve = r;
  });
  await act(async () => {
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "Reload latest revision")!
      .click();
    await settle();
  });
  state.route = "about";
  await render();
  state.route = "home";
  await render();
  await type("New A local draft");
  state.toast.mockClear();
  await act(async () => {
    resolve(old);
    await settle();
  });
  await act(settle);
  expect((host.querySelector("input") as HTMLInputElement).value).toBe("New A local draft");
  expect(host.textContent).toContain("Draft r1");
  expect(state.toast).not.toHaveBeenCalled();
});
it("does not refresh or announce a mutation that completes after leaving its route", async () => {
  await render();
  let resolve!: (value: Response) => void;
  vi.mocked(apiRequest).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await type("A pending mutation");
  await save();
  state.route = "about";
  state.server = {
    ...state.server,
    route: { id: "about", path: "/about" },
    draftRevision: 9,
    draftContent: { title: "B saved" },
  };
  await render();
  await type("B local draft");
  state.toast.mockClear();
  const fetch = vi.spyOn(queryClient, "fetchQuery");
  await act(async () => {
    resolve(new Response("{}"));
    await settle();
  });
  await act(settle);
  expect(fetch).not.toHaveBeenCalled();
  expect(state.toast).not.toHaveBeenCalled();
  expect((host.querySelector("input") as HTMLInputElement).value).toBe("B local draft");
  expect(host.textContent).toContain("Draft r9");
  fetch.mockRestore();
});

it.each([false, true])(
  "owned Blog fields are archived with permission-gated navigation: %s",
  async (canBlog) => {
    state.canBlog = canBlog;
    state.server.ownedBlog = {
      postId: "post-one",
      sourceSlug: "land-clearing-cost-per-acre-south-carolina",
    };
    await render();
    expect(host.textContent).toContain("This article is managed in Blog");
    expect(host.querySelector("fieldset")!.disabled).toBe(true);
    expect(
      Array.from(host.querySelectorAll("button")).some((b) => b.textContent === "Open Blog editor"),
    ).toBe(canBlog);
    await save();
    expect(apiRequest).not.toHaveBeenCalled();
  },
);
it("adopts ownership notice from a refetch without discarding a dirty archived draft", async () => {
  await render();
  await type("Keep my unsaved text");
  await act(async () => {
    queryClient.setQueryData([endpoint], {
      ...state.server,
      ownedBlog: { postId: "post-one", sourceSlug: "land-clearing-cost-per-acre-south-carolina" },
    });
    await settle();
  });
  expect((host.querySelector("#website-field-title") as HTMLInputElement).value).toBe(
    "Keep my unsaved text",
  );
  expect(host.textContent).toContain("This article is managed in Blog");
  expect(host.querySelector("fieldset")!.disabled).toBe(true);
  await save();
  expect(apiRequest).not.toHaveBeenCalled();
});
