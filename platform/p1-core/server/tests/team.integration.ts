// DATABASE_URL=... npx tsx server/tests/team.integration.ts
// Requires a disposable local database provisioned with the current schema.
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { storage } from "../storage";
import { authenticateToken, requireAdminPermission, generateToken } from "../middleware/auth";
import { requireCmsEnabled } from "../middleware/site-features";
import { errorHandler } from "../middleware/error-handler";
import adminTeam from "../routes/admin/team.routes";
import publicCms from "../routes/cms-public.routes";
import { ensureSystemCmsSections } from "../services/system-cms-sections.service";

assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname),
  "Use a disposable local database",
);
const migrationSql = await readFile("migrations/0062_team_members.sql", "utf8");
const migrationClient = await pool.connect();
try {
  await migrationClient.query("BEGIN");
  await migrationClient.query("CREATE SCHEMA team_migration_verification");
  await migrationClient.query("SET LOCAL search_path TO team_migration_verification");
  await migrationClient.query("CREATE TABLE users (id varchar PRIMARY KEY)");
  await migrationClient.query(migrationSql);
  await migrationClient.query(migrationSql);
  const inserted = await migrationClient.query(
    "INSERT INTO team_members(name) VALUES ('Migration test') RETURNING status, photo_url, id",
  );
  assert.equal(inserted.rows[0].status, "draft");
  assert.equal(inserted.rows[0].photo_url, "");
  assert.ok(inserted.rows[0].id);
} finally {
  await migrationClient.query("ROLLBACK");
  migrationClient.release();
}
await pool.query(migrationSql);
const suffix = randomUUID();
const editor = await storage.users.createUser({
  email: `team-editor-${suffix}@example.test`,
  password: "test-only",
  role: "editor",
  adminPermissions: ["content"],
});
const denied = await storage.users.createUser({
  email: `team-denied-${suffix}@example.test`,
  password: "test-only",
  role: "editor",
  adminPermissions: ["design"],
});
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  "/admin",
  authenticateToken,
  requireCmsEnabled,
  requireAdminPermission("content"),
  adminTeam,
);
app.use("/public", requireCmsEnabled, publicCms);
app.use(errorHandler);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const request = (path: string, method = "GET", body?: unknown, user = editor) =>
  fetch(base + path, {
    method,
    headers: {
      Cookie: `corePlatform_token=${generateToken(user)}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
try {
  assert.equal((await fetch(base + "/admin/team")).status, 401);
  assert.equal((await request("/admin/team", "GET", undefined, denied)).status, 403);
  assert.equal((await request("/admin/team", "POST", { name: " " })).status, 400);
  const created = await request("/admin/team", "POST", {
    name: "Test Member",
    biography: "A full biography",
    photoUrl: "/test-portrait.svg",
    createdBy: denied.id,
  });
  assert.equal(created.status, 201, await created.clone().text());
  const member = await created.json();
  assert.equal(member.createdBy, editor.id);
  assert.equal(member.status, "draft");
  assert.ok(
    !(await (await fetch(base + "/public/team")).json()).some(
      (row: { id: string }) => row.id === member.id,
    ),
  );
  assert.equal(
    (await request(`/admin/team/${member.id}`, "PUT", { ...member, status: "published" })).status,
    200,
  );
  const published = (await (await fetch(base + "/public/team")).json()).find(
    (row: { id: string }) => row.id === member.id,
  );
  assert.equal(published.biography, "A full biography");
  assert.equal(published.createdBy, undefined);
  assert.equal(
    (await request(`/admin/team/${member.id}`, "PUT", { ...member, status: "archived" })).status,
    200,
  );
  assert.ok(
    !(await (await fetch(base + "/public/team")).json()).some(
      (row: { id: string }) => row.id === member.id,
    ),
  );
  assert.equal((await request("/admin/team/missing", "PUT", { name: "Missing" })).status, 404);
  const logs = await storage.activity.getByUser(editor.id);
  assert.equal(logs.filter((entry) => entry.details === member.id).length, 3);
  await ensureSystemCmsSections();
  await ensureSystemCmsSections();
  const sections = (await storage.cmsSections.getAllSections()).filter(
    (section) => section.name === "Team",
  );
  assert.equal(sections.length, 1);
  assert.equal((sections[0].blocks as Array<{ type: string }>)[0].type, "team");
  console.log(
    "PASS: idempotent migration and Team starter, auth/permission gates, validation, CRUD, publishing/archive visibility, audit records, public field projection",
  );
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
}
