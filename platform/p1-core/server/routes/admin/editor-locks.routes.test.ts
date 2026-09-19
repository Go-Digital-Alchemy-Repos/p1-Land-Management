import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rows: new Map<string, any>(),
  work: vi.fn(),
  pageLease: vi.fn(),
  blogLease: vi.fn(),
}));
vi.mock("../../services/blog-publication-leases.service", () => ({
  blogPublicationLease: state.blogLease,
}));
vi.mock("../../services/cms-page-leases.service", () => ({ pageLease: state.pageLease }));
vi.mock("../../storage", () => ({
  storage: {
    editorLocks: {
      async getByResource(type: string, id: string) {
        state.work();
        return state.rows.get(`${type}:${id}`);
      },
      async create(row: any) {
        state.work();
        const key = `${row.resourceType}:${row.resourceId}`;
        if (state.rows.has(key)) throw Error("conflict");
        const value = { ...row, id: key };
        state.rows.set(key, value);
        return value;
      },
      async update(id: string, values: any) {
        state.work();
        const row = state.rows.get(id);
        if (!row) return undefined;
        const next = { ...row, ...values };
        state.rows.set(id, next);
        return next;
      },
      async deleteById(id: string) {
        state.work();
        return state.rows.delete(id);
      },
      async deleteExpiredForResource(type: string, id: string, now: Date) {
        state.work();
        const key = `${type}:${id}`;
        const row = state.rows.get(key);
        if (row && row.expiresAt <= now) state.rows.delete(key);
      },
      async listActiveByResourceType(type: string, now: Date) {
        state.work();
        return [...state.rows.values()].filter(
          (row) => row.resourceType === type && row.expiresAt > now,
        );
      },
    },
  },
}));
import router from "./editor-locks.routes";
import { errorHandler } from "../../middleware/error-handler";
let server: Server, base: string;
let actor: any, grant: any;
beforeEach(async () => {
  state.rows.clear();
  state.work.mockClear();
  state.blogLease.mockReset();
  state.blogLease.mockImplementation(async (action, id, user) => {
    const legacy = await import("../../services/editor-locks.service");
    const operation = {
      status: legacy.getEditorLock,
      acquire: legacy.acquireEditorLock,
      heartbeat: legacy.heartbeatEditorLock,
      release: legacy.releaseEditorLock,
    }[action as "status" | "acquire" | "heartbeat" | "release"];
    return operation("blog_post", id, user);
  });
  state.pageLease.mockReset();
  state.pageLease.mockResolvedValue({ status: "acquired", ownedByCurrentEditor: true });
  actor = {
    id: "one",
    role: "admin",
    firstName: "First",
    lastName: "Editor",
    email: "synthetic@example.test",
  };
  grant = {
    active: true,
    role: "member",
    capabilities: ["marketing.content.pages"],
    ownerAttested: false,
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = actor;
    req.dashboardIdentity = grant;
    next();
  });
  app.use(router);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
function request(path: string, body?: unknown) {
  return fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
it("retains acquisition, ownership, heartbeat, collision and release across both route forms", async () => {
  grant.capabilities = ["marketing.content.blog"];
  const first = await request("/blog_post/page/acquire", {});
  expect(first.status).toBe(200);
  expect(await first.json()).toMatchObject({
    status: "acquired",
    ownedByCurrentUser: true,
    lock: { lockedByUserId: "one" },
  });
  expect(await (await request("/resource/blog_post")).json()).toHaveLength(1);
  actor.id = "two";
  expect(
    await (await request("/acquire", { resourceType: "blog_post", resourceId: "page" })).json(),
  ).toMatchObject({ status: "locked_by_other", ownedByCurrentUser: false });
  await request("/blog_post/page/release", {});
  expect(state.rows.size).toBe(1);
  actor.id = "one";
  expect(
    await (await request("/heartbeat", { resourceType: "blog_post", resourceId: "page" })).json(),
  ).toMatchObject({ status: "acquired", ownedByCurrentUser: true });
  await request("/release", { resourceType: "blog_post", resourceId: "page" });
  expect(state.rows.size).toBe(0);
});
it("authorizes by resource on all reads and writes, including legacy body-scoped operations", async () => {
  const capabilities: Record<string, string> = {
    cms_page: "pages",
    blog_post: "blog",
    event: "events",
    form: "forms",
    cms_section: "sections",
    cms_menu: "menus",
    cms_sidebar: "sidebars",
  };
  for (const [resource, tool] of Object.entries(capabilities)) {
    grant.capabilities = [];
    const before = state.work.mock.calls.length;
    for (const path of [`/resource/${resource}`, `/${resource}/record`])
      expect((await request(path)).status).toBe(403);
    for (const action of ["acquire", "heartbeat", "release"]) {
      expect(
        (await request(`/${action}`, { resourceType: resource, resourceId: "record" })).status,
      ).toBe(403);
      expect((await request(`/${resource}/record/${action}`, {})).status).toBe(403);
    }
    expect(state.work.mock.calls.length).toBe(before);
    grant.capabilities = [`marketing.content.${tool}`];
    expect((await request(`/${resource}/record/acquire`, { resourceType: "doc" })).status).toBe(
      200,
    );
    if (resource === "cms_page")
      expect(state.pageLease).toHaveBeenCalledWith("acquire", "record", actor, {
        resourceType: "doc",
      });
    else expect(state.rows.has(`${resource}:record`)).toBe(true);
    expect(state.rows.has("doc:record")).toBe(false);
  }
});
it("reserves website system locks for an active attested Owner", async () => {
  for (const resource of ["doc", "email_template"]) {
    expect((await request(`/${resource}/record/acquire`, {})).status).toBe(403);
    grant.role = "owner";
    expect((await request(`/${resource}/record/acquire`, {})).status).toBe(403);
    grant.ownerAttested = true;
    expect((await request(`/${resource}/record/acquire`, {})).status).toBe(200);
    grant.active = false;
    expect((await request(`/${resource}/record/heartbeat`, {})).status).toBe(403);
    grant = { active: true, role: "member", capabilities: [], ownerAttested: false };
  }
});
it("blocks revoked grants from extending reservations; abandoned locks still expire", async () => {
  grant.capabilities = ["marketing.content.blog"];
  await request("/blog_post/page/acquire", {});
  const before = state.work.mock.calls.length;
  grant.capabilities = [];
  expect((await request("/blog_post/page/heartbeat", {})).status).toBe(403);
  expect((await request("/blog_post/page/release", {})).status).toBe(403);
  expect(state.work.mock.calls.length).toBe(before);
  state.rows.get("blog_post:page").expiresAt = new Date(0);
  grant.capabilities = ["marketing.content.blog"];
  actor.id = "next";
  expect(await (await request("/blog_post/page/acquire", {})).json()).toMatchObject({
    status: "acquired",
    lock: { lockedByUserId: "next" },
  });
});

it("forwards exact page lease proof for body and path routes", async () => {
  const proof = {
    editorInstanceId: "11111111-1111-4111-8111-111111111111",
    leaseId: "22222222-2222-4222-8222-222222222222",
  };
  for (const action of ["acquire", "heartbeat", "release"]) {
    await request(`/cms_page/page/${action}`, proof);
    expect(state.pageLease).toHaveBeenLastCalledWith(action, "page", actor, proof);
    const body = { resourceType: "cms_page", resourceId: "page", ...proof };
    await request(`/${action}`, body);
    expect(state.pageLease).toHaveBeenLastCalledWith(action, "page", actor, body);
  }
});

it("forwards adopted Blog proof to exact-instance dispatch for generic and scoped routes", async () => {
  grant.capabilities = ["marketing.content.blog"];
  state.blogLease.mockResolvedValue({ status: "acquired", ownedByCurrentEditor: true });
  const proof = {
    editorInstanceId: "00000000-0000-4000-8000-000000000001",
    leaseId: "00000000-0000-4000-8000-000000000002",
  };
  for (const action of ["acquire", "heartbeat", "release"]) {
    await request(`/blog_post/post/${action}`, proof);
    expect(state.blogLease).toHaveBeenLastCalledWith(action, "post", actor, proof, true);
    await request(`/${action}`, { resourceType: "blog_post", resourceId: "post", ...proof });
    expect(state.blogLease).toHaveBeenLastCalledWith(action, "post", actor, proof, true);
  }
});
