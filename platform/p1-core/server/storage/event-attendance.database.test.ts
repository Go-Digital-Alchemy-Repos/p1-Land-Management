import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const testUrl = process.env.EVENT_ATTENDANCE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_event_attendance_test"
  )
    throw new Error("Use a local disposable core_event_attendance_test database");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({ connectionString: process.env.EVENT_ATTENDANCE_TEST_DATABASE_URL });
  return { pool, db: drizzle(pool, { schema }) };
});
import { pool, db } from "../db";
import { runMigrations } from "../migrate";
import { events, eventRegistrations } from "@shared/schema";
import { EventRegistrationStorage } from "./event-registration.storage";

describe.skipIf(!testUrl)("event attendance in disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60_000);
  afterAll(async () => {
    await pool.end();
  });
  it("scopes attendance to the event, preserves repeated check-in time and leaves payment and registration untouched", async () => {
    const eventId = randomUUID(),
      id = randomUUID();
    await db
      .insert(events)
      .values({ id: eventId, slug: eventId, title: "Synthetic attendance", date: new Date() });
    await db
      .insert(eventRegistrations)
      .values({
        id,
        eventId,
        fullName: "Synthetic Guest",
        email: "guest@example.test",
        status: "confirmed",
        paymentStatus: "paid",
        amountPaid: 12500,
        paymentIntentId: "synthetic-intent",
      });
    const store = new EventRegistrationStorage();
    expect(await store.setEventAttendance(randomUUID(), id, true)).toBeUndefined();
    expect((await store.getRegistration(id))?.attended).toBe(false);
    const checked = (await store.setEventAttendance(eventId, id, true))!;
    expect(checked.attended).toBe(true);
    expect(checked.checkedInAt).toBeInstanceOf(Date);
    await pool.query("SELECT pg_sleep(0.02)");
    const repeated = (await store.setEventAttendance(eventId, id, true))!;
    expect(repeated.checkedInAt?.getTime()).toBe(checked.checkedInAt?.getTime());
    const cleared = (await store.setEventAttendance(eventId, id, false))!;
    expect(cleared.attended).toBe(false);
    expect(cleared.checkedInAt).toBeNull();
    for (const row of [checked, repeated, cleared])
      expect(row).toMatchObject({
        eventId,
        status: "confirmed",
        paymentStatus: "paid",
        amountPaid: 12500,
        paymentIntentId: "synthetic-intent",
      });
    expect(await store.setEventAttendance(eventId, randomUUID(), true)).toBeUndefined();
  });
});
