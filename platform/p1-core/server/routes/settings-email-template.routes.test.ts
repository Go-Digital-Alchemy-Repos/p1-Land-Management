import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const version = "a".repeat(64);
const state = vi.hoisted(() => ({ role: "admin", list: vi.fn(), save: vi.fn(), restore: vi.fn(), send: vi.fn() }));
vi.mock("../middleware/auth", () => ({
  authenticateToken: (req: any, _res: any, next: any) => { req.user = {id:"authenticated-actor",email:"synthetic@example.invalid",role:state.role}; next(); },
  hasAdminPermission: () => false,
  requireRole: (role: string) => (req: any, res: any, next: any) => req.user.role === role ? next() : res.status(403).json({message:"Forbidden"}),
}));
vi.mock("../storage/index", () => ({ storage: { emailTemplates: {getVersionedTemplates:state.list,saveVersionedTemplate:state.save,restoreVersionedTemplates:state.restore} } }));
vi.mock("../services/email.service", () => ({sendEmail:state.send,testMailgunConnection:vi.fn(),renderEmailShell:vi.fn(),renderTemplate:vi.fn(),resetEmailBrandingCache:vi.fn()}));
vi.mock("../services/r2.service", () => ({resetClient:vi.fn()}));
vi.mock("../services/mailchimp.service", () => ({testMailchimpConnection:vi.fn()}));
vi.mock("../services/system-email-templates.service", () => ({SYSTEM_EMAIL_TEMPLATE_DEFAULTS:[{slug:"synthetic-default"}]}));
vi.mock("../utils/logger", () => ({logger:{app:{warn:vi.fn(),error:vi.fn()}}}));
import router from "./settings.routes";
import { errorHandler } from "../middleware/error-handler";
let server:Server, base:string;
beforeEach(async () => {
  vi.clearAllMocks(); state.role="admin";
  state.list.mockResolvedValue({version,templates:[{slug:"welcome",version}]});
  state.save.mockResolvedValue({slug:"welcome",version:"b".repeat(64)});
  state.restore.mockResolvedValue({version:"c".repeat(64),templates:[],restored:1});
  const app=express(); app.use(express.json(),router,errorHandler);
  server=app.listen(0,"127.0.0.1"); await new Promise<void>(resolve=>server.once("listening",resolve));
  base=`http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => { expect(state.send).not.toHaveBeenCalled(); await new Promise<void>(resolve=>server.close(()=>resolve())); });
const request=(path:string,method:string,body?:unknown)=>fetch(base+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
describe("retained email template version contract",()=>{
  it("reads the versioned collection in a private envelope",async()=>{
    const res=await request("/email-templates","GET");
    expect(res.status).toBe(200); expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({version,templates:[{slug:"welcome",version}]});
  });
  it("passes edit version and derives the audit actor from authentication",async()=>{
    const template={subject:"Updated",htmlBody:"<p>{{firstName}}</p>",isActive:false};
    const res=await request("/email-templates/welcome","PUT",{template,expectedVersion:version});
    expect(res.status).toBe(200);
    expect(state.save).toHaveBeenCalledWith("welcome",template,version,{userId:"authenticated-actor",action:"website_email_template_updated",details:"welcome"});
  });
  it("rejects unversioned, malformed, empty and unknown edit fields before storage",async()=>{
    for(const body of [{subject:"Old client"},{template:{subject:"Missing version"}},{template:{subject:"Bad version"},expectedVersion:"bad"},{template:{},expectedVersion:version},{template:{variables:["injected"]},expectedVersion:version},{template:{subject:"Valid"},expectedVersion:version,userId:"spoofed"},{template:{subject:"Valid",slug:"other"},expectedVersion:version}]) {
      expect((await request("/email-templates/welcome","PUT",body)).status).toBe(400);
    }
    expect(state.save).not.toHaveBeenCalled();
  });
  it("restores canonical defaults with the collection version and authenticated actor",async()=>{
    const res=await request("/email-templates/restore","POST",{expectedVersion:version});
    expect(res.status).toBe(200);
    expect(state.restore).toHaveBeenCalledWith([{slug:"synthetic-default"}],version,{userId:"authenticated-actor",action:"website_email_templates_restored",details:"System defaults restored; activation preserved"});
    expect(await res.json()).toMatchObject({restored:1,templates:[]});
  });
  it("rejects missing restore version, caller defaults and audit spoofing",async()=>{
    for(const body of [{},{expectedVersion:"bad"},{expectedVersion:version,defaults:[]},{expectedVersion:version,userId:"spoofed"}])
      expect((await request("/email-templates/restore","POST",body)).status).toBe(400);
    expect(state.restore).not.toHaveBeenCalled();
  });
  it("preserves conflict status without retrying edits or restore",async()=>{
    const error=Object.assign(new Error("Templates changed"),{statusCode:409});
    state.save.mockRejectedValue(error);state.restore.mockRejectedValue(error);
    expect((await request("/email-templates/welcome","PUT",{template:{isActive:true},expectedVersion:version})).status).toBe(409);
    expect((await request("/email-templates/restore","POST",{expectedVersion:version})).status).toBe(409);
    expect(state.save).toHaveBeenCalledTimes(1);expect(state.restore).toHaveBeenCalledTimes(1);
  });
  it("retains the legacy administrator gate for reads and mutations",async()=>{
    state.role="editor";
    expect((await request("/email-templates","GET")).status).toBe(403);
    expect((await request("/email-templates/welcome","PUT",{template:{isActive:true},expectedVersion:version})).status).toBe(403);
    expect((await request("/email-templates/restore","POST",{expectedVersion:version})).status).toBe(403);
    expect(state.list).not.toHaveBeenCalled();expect(state.save).not.toHaveBeenCalled();expect(state.restore).not.toHaveBeenCalled();
  });
});
