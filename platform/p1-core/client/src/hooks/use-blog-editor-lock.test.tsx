// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useEditorLock } from "./use-editor-lock";
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
let root: Root, host: HTMLDivElement, lock: ReturnType<typeof useEditorLock>;
function Harness() {
  lock = useEditorLock({ resourceType: "blog_post", resourceId: "post1" });
  return <p>{String(lock.isReadOnly)}</p>;
}
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  await new Promise((resolve) => setTimeout(resolve, 5));
  host.remove();
  vi.unstubAllGlobals();
});
it("sends exact instance and lease proof for Blog heartbeat and release", async () => {
  const fetchMock = vi.fn(async (_url: unknown, options: RequestInit) => {
    const payload = JSON.parse(options.body as string);
    return new Response(
      JSON.stringify({
        status: "acquired",
        ownedByCurrentUser: true,
        ownedByCurrentEditor: true,
        lock: { id: "lease1", editorInstanceId: payload.editorInstanceId, lockedByName: "Owner" },
      }),
      { status: 200 },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  await act(async () => root.render(<Harness />));
  const instance = JSON.parse(fetchMock.mock.calls[0][1].body as string).editorInstanceId;
  expect(instance).toMatch(/^[a-f0-9-]{36}$/);
  let proof: unknown;
  await act(async () => {
    proof = await lock.preconditions(7);
  });
  expect(proof).toEqual({ expectedVersion: 7, editorInstanceId: instance, leaseId: "lease1" });
  expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/editor-locks/blog_post/post1/heartbeat");
  await act(async () => root.unmount());
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("/api/admin/editor-locks/blog_post/post1/release");
  expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body as string)).toEqual({
    editorInstanceId: instance,
    leaseId: "lease1",
  });
});
it("does not accept another editor owned by the same account", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "locked_by_other",
            ownedByCurrentUser: true,
            ownedByCurrentEditor: false,
            lock: { id: "other", lockedByName: "Owner" },
          }),
          { status: 200 },
        ),
    ),
  );
  await act(async () => root.render(<Harness />));
  expect(lock.isReadOnly).toBe(true);
  await expect(lock.preconditions(3)).rejects.toThrow("does not hold");
});
