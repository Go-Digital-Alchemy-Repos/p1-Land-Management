// @vitest-environment jsdom
import React, { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  usePageEditorLease,
  type PageLeaseTransport,
} from "../../../platform/p1-core/client/src/components/shared/use-page-editor-lease";
describe("page editor instance lease", () => {
  let root: Root, container: HTMLDivElement;
  const leases = new Map<string, { id: string; instance: string }>();
  const snapshots = new Map<string, ReturnType<typeof usePageEditorLease>>();
  const transport: PageLeaseTransport = vi.fn(async (action, id, payload) => {
    let lease = leases.get(id);
    if (action === "acquire" && !lease) {
      lease = { id: crypto.randomUUID(), instance: payload.editorInstanceId };
      leases.set(id, lease);
    }
    const owned = Boolean(
      lease &&
      lease.instance === payload.editorInstanceId &&
      (action === "acquire" || lease.id === payload.leaseId),
    );
    if (action === "release" && owned) leases.delete(id);
    return {
      status: owned ? "acquired" : "locked_by_other",
      ownedByCurrentUser: true,
      ownedByCurrentEditor: owned,
      lock: lease
        ? {
            id: lease.id,
            editorInstanceId: lease.instance,
            lockedByName: "Same user",
          }
        : null,
    };
  });
  function Probe({ name, id = "one" }: { name: string; id?: string }) {
    const state = usePageEditorLease(id, transport);
    snapshots.set(name, state);
    return (
      <span>
        {name}:{state.owned ? "owned" : "readonly"}
      </span>
    );
  }
  beforeEach(() => {
    leases.clear();
    snapshots.clear();
    vi.clearAllMocks();
    Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    await new Promise((r) => setTimeout(r, 5));
    container.remove();
  });
  it("blocks a second editor even when it belongs to the same user", async () => {
    await act(async () =>
      root.render(
        <>
          <Probe name="first" />
          <Probe name="second" />
        </>,
      ),
    );
    expect(snapshots.get("first")!.owned).toBe(true);
    expect(snapshots.get("second")!.owned).toBe(false);
    await expect(snapshots.get("second")!.preconditions(3)).rejects.toThrow(
      "does not hold",
    );
    let fields;
    await act(async () => {
      fields = await snapshots.get("first")!.preconditions(3);
    });
    expect(fields).toMatchObject({
      expectedVersion: 3,
      leaseId: leases.get("one")!.id,
    });
  });
  it("does not release the active lease during StrictMode effect replay", async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <Probe name="strict" />
        </StrictMode>,
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(snapshots.get("strict")!.owned).toBe(true);
    expect(leases.has("one")).toBe(true);
    expect(
      vi
        .mocked(transport)
        .mock.calls.filter(([action]) => action === "release"),
    ).toHaveLength(0);
  });
  it("releases an old resource without releasing its replacement", async () => {
    await act(async () => root.render(<Probe name="editor" id="one" />));
    await act(async () => root.render(<Probe name="editor" id="two" />));
    await new Promise((r) => setTimeout(r, 10));
    expect(leases.has("one")).toBe(false);
    expect(leases.has("two")).toBe(true);
  });
});
