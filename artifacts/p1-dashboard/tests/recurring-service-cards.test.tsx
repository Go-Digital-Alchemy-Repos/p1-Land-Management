// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RecurringServiceCards } from "../src/RecurringServiceCards";

let host: HTMLDivElement;
let root: Root;
const job = {
  id: "synthetic-job",
  property_id: "synthetic-property",
  title: "Synthetic grounds service",
  cadence: "weekly" as const,
  interval_count: 1,
  next_date: "2026-09-24",
  local_time: "10:00",
  next_visit: "2026-09-24T14:00:00.000Z",
  paused: true,
  agreement_status: "draft",
  client_name: "Synthetic client",
  property_name: "Synthetic property",
  visits_remaining: 3,
};
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("lets permitted staff inspect and activate a paused draft from a compact record", async () => {
  const onActivate = vi.fn();
  await act(async () => root.render(<RecurringServiceCards jobs={[job]} canActivate onActivate={onActivate} />));
  expect(host.querySelector("summary")?.textContent).toContain("Synthetic grounds service");
  expect(host.textContent).toContain("Synthetic property");
  await act(async () => host.querySelector("button")?.click());
  expect(onActivate).toHaveBeenCalledWith(job);

  await act(async () => root.render(<RecurringServiceCards jobs={[job]} canActivate={false} onActivate={onActivate} />));
  expect(host.querySelector("button")).toBeNull();
});
