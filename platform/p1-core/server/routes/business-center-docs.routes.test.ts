import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({list:vi.fn(),create:vi.fn(),save:vi.fn(),remove:vi.fn(),sync:vi.fn(),definitions:vi.fn()}));
vi.mock("../storage",()=>({storage:{docs:{getVersionedDocs:state.list,createVersionedDoc:state.create,saveVersionedDoc:state.save,deleteVersionedDoc:state.remove,synchronizeVersionedDocs:state.sync}}}));
vi.mock("../services/system-docs.service",()=>({loadSystemDocDefinitions:state.definitions}));
import router from "./business-center-docs.routes";
let server:Server, origin:string;
const id="11111111-1111-4111-8111-111111111111", version="a".repeat(64);
const document={title:"Guide",slug:"guide",category:"Reference",content:"# Guide",sortOrder:0,isPublished:false};
beforeAll(async()=>{
 const app=express();app.use(express.json());
 app.use((req,_res,next)=>{req.user={id} as any; req.dashboardIdentity={active:req.get("x-active")!=="false",role:req.get("x-role")||"owner",ownerAttested:req.get("x-attested")!=="false"} as any;next();});
 app.use(router);
 app.use((e:any,_req:any,res:any,_next:any)=>res.status(e.statusCode||400).json({message:"Request rejected"}));
 server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
 origin=`http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())));
beforeEach(()=>{vi.clearAllMocks();state.list.mockResolvedValue({version,docs:[]});state.create.mockResolvedValue({id,...document,version});state.save.mockResolvedValue({id,...document,version});state.remove.mockResolvedValue(undefined);state.definitions.mockResolvedValue([]);state.sync.mockResolvedValue({docs:[],version});});
const request=(path="/",method="GET",body?:unknown,headers={})=>fetch(origin+path,{method,headers:{"content-type":"application/json",...headers},body:body===undefined?undefined:JSON.stringify(body)});
it("requires active attested Owner for every document operation",async()=>{
 for(const headers of [{"x-role":"admin"},{"x-role":"staff"},{"x-active":"false"},{"x-attested":"false"}])
 for(const [method,path,body] of [["GET","/",undefined],["POST","/",document],["PUT",`/${id}`,{document,expectedVersion:version}],["DELETE",`/${id}`,{expectedVersion:version}],["POST","/sync",{expectedVersion:version}]] as const)
 expect((await request(path,method,body,headers)).status).toBe(403);
 expect(state.list).not.toHaveBeenCalled();expect(state.save).not.toHaveBeenCalled();expect(state.sync).not.toHaveBeenCalled();
});
it("validates versions and editable fields without trusting caller provenance",async()=>{
 expect((await request("/","POST",{...document,createdBy:"other"})).status).toBe(400);
 expect((await request(`/${id}`,"PUT",{document})).status).toBe(400);
 expect((await request(`/${id}`,"DELETE",{})).status).toBe(400);
 expect((await request("/sync","POST",{expectedVersion:version,force:true})).status).toBe(400);
 expect((await request("/?actor=other")).status).toBe(400);
 expect((await request("/","POST",document)).status).toBe(201);
 expect(state.create).toHaveBeenCalledWith(document,{userId:id,action:"website_doc_created",details:"guide"});
});
it("returns no-store snapshots and passes conflict versions to audited writes",async()=>{
 const response=await request();expect(response.headers.get("cache-control")).toBe("private, no-store");expect(await response.json()).toEqual({version,docs:[]});
 expect((await request(`/${id}`,"PUT",{document,expectedVersion:version})).status).toBe(200);
 expect(state.save).toHaveBeenCalledWith(id,document,version,{userId:id,action:"website_doc_updated",details:id});
 state.save.mockRejectedValueOnce(Object.assign(Error(),{statusCode:409}));
 expect((await request(`/${id}`,"PUT",{document,expectedVersion:version})).status).toBe(409);
 expect((await request("/sync","POST",{expectedVersion:version})).status).toBe(200);
 expect(state.sync).toHaveBeenCalledWith([],version,{userId:id,action:"website_docs_synchronized",details:"Repository documentation refresh"});
});
