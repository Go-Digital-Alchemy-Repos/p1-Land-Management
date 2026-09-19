// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import WebsiteFeatures from "../../../../../../artifacts/p1-dashboard/src/marketing/WebsiteFeatures";

// Mirror the dashboard's deduplicated React runtime across the shared-source boundary.
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react",
  async () => await import("react"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-runtime",
  async () => await import("react/jsx-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-dev-runtime",
  async () => await import("react/jsx-dev-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/lucide-react",
  async () => await import("lucide-react"),
);
const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock("../../../../../../lib/api-client-react/src/dashboard/index", () => ({
  getWebsiteFeatures: api.load,
  saveWebsiteFeatures: api.save,
}));
let host: HTMLDivElement;
let root: Root;
const defaults = { cmsEnabled:true, blogEnabled:true, eventsEnabled:false, crmEnabled:true, careersEnabled:false };
const snapshot = () => ({ version:"original-version", features:{...defaults}, defaults:{...defaults} });
const toggle = (key:string) => host.querySelector<HTMLButtonElement>(`#feature-${key}`)!;
const button = (text:string) => Array.from(host.querySelectorAll("button")).find(e=>e.textContent?.includes(text))!;
async function click(text:string) { await act(async()=>button(text).click()); }
async function submit() { await act(async()=>{host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));}); }
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();
 api.load.mockResolvedValue(snapshot());api.save.mockResolvedValue({});
 host=document.createElement("div");document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<WebsiteFeatures/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
it("renders retained rows as labeled switches and preserves Events/Careers defaults",async()=>{
 expect(host.querySelectorAll('[role="switch"]')).toHaveLength(5);
 expect(toggle('cmsEnabled').getAttribute('aria-checked')).toBe('true');
 expect(toggle('eventsEnabled').getAttribute('aria-checked')).toBe('false');
 expect(toggle('careersEnabled').getAttribute('aria-checked')).toBe('false');
 expect(button('Save Configuration').disabled).toBe(true);
 await act(async()=>toggle('eventsEnabled').click());
 expect(api.save).not.toHaveBeenCalled();
 await click('Use default selections');
 expect(toggle('eventsEnabled').getAttribute('aria-checked')).toBe('false');
 expect(button('Save Configuration').disabled).toBe(true);
});
it("saves the existing versioned feature payload and confirms reload",async()=>{
 await act(async()=>toggle('blogEnabled').click());
 const next=snapshot();next.features.blogEnabled=false;api.load.mockResolvedValue(next);
 await submit();
 expect(api.save).toHaveBeenCalledWith({features:next.features,expectedVersion:'original-version'},expect.anything());
 expect(host.querySelector('[role="status"]')?.textContent).toContain('Website modules saved');
 expect(button('Save Configuration').disabled).toBe(true);
});
it("blocks edits after a rejected save, retains draft and guards navigation",async()=>{
 await act(async()=>toggle('blogEnabled').click());api.save.mockRejectedValue(new Error('Conflict'));
 await submit();
 expect(toggle('blogEnabled').getAttribute('aria-checked')).toBe('false');
 expect(toggle('blogEnabled').disabled).toBe(true);
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 await click('Reload saved modules');expect(confirm).toHaveBeenCalled();
 expect(toggle('blogEnabled').getAttribute('aria-checked')).toBe('false');
 confirm.mockReturnValue(true);await click('Reload saved modules');
 expect(toggle('blogEnabled').disabled).toBe(false);
 expect(toggle('blogEnabled').getAttribute('aria-checked')).toBe('true');
});
