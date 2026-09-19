import React, { act, lazy, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LazySurface, requestDashboardReload } from "../src/LazySurface";
import { useCmsUnsavedChanges } from "../src/marketing/useCmsUnsavedChanges";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
for (const message of [
  "Unable to preload CSS for /assets/BlogManager-old.css",
  "Failed to fetch dynamically imported module: /assets/BlogManager-old.js",
]) {
  it(`contains rejected lazy asset: ${message}`, async () => {
    const broken = lazy(() => Promise.reject(new Error(message)));
    const Broken = broken;
    function App() {
      useCmsUnsavedChanges(true, "Keep sibling draft?");
      const [text, setText] = useState("Retained sibling draft");
      return (
        <>
          <input
            aria-label="Other draft"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <nav>Dashboard navigation</nav>
          <LazySurface fallback={<p>Loading</p>}>
            <Broken />
          </LazySurface>
        </>
      );
    }
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await act(async () => root.render(<App />));
    expect(host.querySelector("[role=alert]")?.textContent).toContain(
      "This tool could not be loaded",
    );
    expect(host.querySelector("input")?.value).toBe("Retained sibling draft");
    expect(host.textContent).toContain("Dashboard navigation");
    expect(confirm).not.toHaveBeenCalled();
    const button = host.querySelector("button")!;
    button.focus();
    expect(document.activeElement).toBe(button);
    await act(async () => button.click());
    expect(confirm).toHaveBeenCalledWith("Keep sibling draft?");
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(host.querySelector("input")?.value).toBe("Retained sibling draft");
  });
}
it("does not reload when existing navigation guard cancels", () => {
  const reload = vi.fn(),
    confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const guard = (event: Event) => event.preventDefault();
  window.addEventListener("p1:before-navigation", guard);
  try {
    requestDashboardReload(reload);
    expect(reload).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener("p1:before-navigation", guard);
  }
});
it("requires explicit confirmation even after failed editor unmount", () => {
  const reload = vi.fn(),
    confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  requestDashboardReload(reload);
  expect(reload).not.toHaveBeenCalled();
  expect(confirm).toHaveBeenCalledWith(
    expect.stringContaining("Unsaved changes may be lost"),
  );
  confirm.mockReturnValue(true);
  requestDashboardReload(reload);
  expect(reload).toHaveBeenCalledTimes(1);
});
it("renders normal lazy content without changing the existing loading fallback", async () => {
  let ready!: (value: { default: React.ComponentType }) => void;
  const Tool = lazy(
    () =>
      new Promise((resolve) => {
        ready = resolve;
      }),
  );
  await act(async () =>
    root.render(
      <LazySurface fallback={<p>Loading tool</p>}>
        <Tool />
      </LazySurface>,
    ),
  );
  expect(host.textContent).toContain("Loading tool");
  await act(async () => ready({ default: () => <p>Loaded tool</p> }));
  expect(host.textContent).toContain("Loaded tool");
  expect(host.querySelector("[role=alert]")).toBeNull();
});

it("uses generic recovery copy for an unrelated runtime error", async () => {
  const Broken = () => {
    throw new Error("Unexpected render bug");
  };
  await act(async () =>
    root.render(
      <LazySurface>
        <Broken />
      </LazySurface>,
    ),
  );
  expect(host.textContent).toContain("This tool encountered a problem");
  expect(host.textContent).not.toContain("dashboard update");
});

it("resets only when navigating to a different keyed surface", async () => {
  const load = vi.fn(() =>
    Promise.reject(new Error("Failed to fetch dynamically imported module")),
  );
  const Broken = lazy(load);
  await act(async () =>
    root.render(
      <LazySurface>
        <Broken key="analytics" />
      </LazySurface>,
    ),
  );
  expect(host.querySelector("[role=alert]")).not.toBeNull();
  await act(async () =>
    root.render(
      <LazySurface>
        <Broken key="analytics" />
      </LazySurface>,
    ),
  );
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () =>
    root.render(
      <LazySurface>
        <p key="search-console">Healthy report</p>
      </LazySurface>,
    ),
  );
  expect(host.querySelector("[role=alert]")).toBeNull();
  expect(host.textContent).toContain("Healthy report");
});
