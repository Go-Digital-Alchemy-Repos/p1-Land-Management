// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { BuilderPreviewReceiver } from "./builder-preview-receiver";
import { createBuilderPreviewMessage } from "@shared/cms-builder/preview";

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

it("renders sanitized drafts only for its parent session and ignores stale/replaced frames", () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const parent = { postMessage: vi.fn() } as unknown as Window;
  const origin = "https://dashboard.p1landmanagement.com";
  const channel = "11111111-1111-4111-8111-111111111111";
  const draft = (revision: number, text: string) =>
    createBuilderPreviewMessage(channel, revision, [
      {
        id: "html",
        type: "raw-html",
        props: { html: `<p>${text}<img src="/x" onerror="alert(1)"></p>` },
      },
    ]);
  const send = (data: unknown, source: unknown = parent, eventOrigin = origin) =>
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", { data, origin: eventOrigin, source: source as Window }),
      );
    });
  act(() =>
    root!.render(
      <BuilderPreviewReceiver parentOrigin={origin} channel={channel} parentWindow={parent} />,
    ),
  );
  expect(parent.postMessage).toHaveBeenCalledWith(
    { type: "p1:builder-preview-ready", version: 1, channel },
    origin,
  );
  send(draft(0, "Untrusted"), {}, "https://evil.test");
  expect(container.textContent).toContain("Waiting for editor preview");
  send(draft(1, "Latest draft"));
  expect(container.textContent).toContain("Latest draft");
  expect(container.querySelector("[onerror]")).toBeNull();
  expect(container.querySelector("[data-builder-preview-content]")?.hasAttribute("inert")).toBe(
    true,
  );
  send(draft(0, "Stale draft"));
  expect(container.textContent).toContain("Latest draft");
  const replacement = "22222222-2222-4222-8222-222222222222";
  act(() =>
    root!.render(
      <BuilderPreviewReceiver parentOrigin={origin} channel={replacement} parentWindow={parent} />,
    ),
  );
  send(draft(2, "Old channel"));
  expect(container.textContent).toContain("Waiting for editor preview");
  send({ ...draft(0, "New session"), channel: replacement });
  expect(container.textContent).toContain("New session");
});
