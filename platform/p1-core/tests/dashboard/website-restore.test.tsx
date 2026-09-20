// @vitest-environment jsdom
import React,{act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {beforeEach,afterEach,it,expect,vi} from "vitest";
const api=vi.hoisted(()=>({list:vi.fn(),review:vi.fn(),execute:vi.fn(),reconcile:vi.fn()}));
vi.mock("@workspace/api-client-react/dashboard",()=>({listWebsiteRestoreOperations:api.list,reviewWebsiteRestore:api.review,executeWebsiteRestore:api.execute,reconcileWebsiteRestore:api.reconcile}));
import WebsiteRestore from "../../../../artifacts/p1-dashboard/src/marketing/WebsiteRestore";
const row=()=>({id:"11111111-1111-4111-8111-111111111111",status:"reviewed",summary:{createdAt:"2026-09-20T00:00:00Z",clientStackId:"p1-land-management",tableCount:2,totalRowCount:3,mediaAssetCount:0},createdAt:"2026-09-20T00:00:00Z",updatedAt:"2026-09-20T00:00:00Z",expiresAt:new Date(Date.now()+60000).toISOString()});
let root:Root,container:HTMLDivElement;
beforeEach(()=>{vi.resetAllMocks();api.list.mockResolvedValue([]);api.review.mockResolvedValue(row());(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;container=document.createElement("div");document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
async function mount(){await act(async()=>root.render(<WebsiteRestore backups={[{key:"db/test",createdAt:"2026-09-20T00:00:00Z"}]}/>));}
function button(text:string){return [...container.querySelectorAll("button")].find(b=>b.textContent===text)!;}
async function choose(){await act(async()=>{const select=container.querySelector("select")!;select.value="db/test";select.dispatchEvent(new Event("change",{bubbles:true}));});}
async function type(value:string){await act(async()=>{const input=container.querySelector("input")!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));});}
it("requires exact typed intent and records uncertainty without another execution",async()=>{
 await mount();await choose();expect(api.review).toHaveBeenCalledTimes(1);
 expect(button("Restore selected backup").disabled).toBe(true);
 await type("restore");expect(button("Restore selected backup").disabled).toBe(true);
 await type("RESTORE WEBSITE DATABASE");expect(button("Restore selected backup").disabled).toBe(false);
 api.execute.mockResolvedValue({...row(),status:"uncertain"});
 await act(async()=>{button("Restore selected backup").click();button("Restore selected backup").click();});
 expect(api.execute).toHaveBeenCalledTimes(1);
 expect(container.textContent).toContain("New restores remain blocked");
 expect(container.querySelector("select")!.disabled).toBe(true);
 api.reconcile.mockResolvedValue({...row(),status:"not_applied"});
 await act(async()=>button("Check outcome").click());
 expect(api.execute).toHaveBeenCalledTimes(1);
 expect(container.textContent).toContain("No restore committed");
 expect(container.querySelector("select")!.disabled).toBe(false);
});
it("keeps expired reviews disabled and requires a new review",async()=>{
 api.review.mockResolvedValue({...row(),expiresAt:"2020-01-01T00:00:00Z"});await mount();await choose();await type("RESTORE WEBSITE DATABASE");
 expect(button("Restore selected backup").disabled).toBe(true);expect(container.textContent).toContain("review has expired");expect(api.execute).not.toHaveBeenCalled();
});
it("recovers unresolved history on a fresh mount without executing",async()=>{
 api.list.mockResolvedValue([{...row(),status:"running"}]);await mount();
 expect(container.querySelector("select")!.disabled).toBe(true);expect(button("Check outcome")).toBeTruthy();expect(api.execute).not.toHaveBeenCalled();
});
it("fails closed when history or execution response is unavailable",async()=>{
 api.list.mockRejectedValueOnce(Error("offline"));await mount();expect(container.querySelector("select")!.disabled).toBe(true);
 await act(async()=>button("Refresh restore history").click());await choose();await type("RESTORE WEBSITE DATABASE");api.execute.mockRejectedValue(Error("timeout"));
 await act(async()=>button("Restore selected backup").click());
 expect(button("Restore selected backup").disabled).toBe(true);expect(container.textContent).toContain("Do not start another restore");
});
