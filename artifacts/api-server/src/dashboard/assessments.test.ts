import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
import {
  createManualAssessment,
  availabilityInput,
  readAvailability,
  saveAvailability,
  generateAvailability,
  availableSlots,
  bookAssessment,
  addBlackout,
  removeBlackout,
} from "./assessments";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Use isolated local assessment tests");
after(() => pool.end());
test(
  "assessment rules preserve bookings, honor buffers and DST, and serialize blackouts with booking",
  { skip: !base },
  async () => {
    const user = randomUUID(),
      client = randomUUID(),
      property = randomUUID();
    await pool.query('INSERT INTO "user"(id,name,email) VALUES($1,$2,$3)', [
      user,
      "Assessment test",
      user + "@example.test",
    ]);
    await pool.query("INSERT INTO client(id,name) VALUES($1,$2)", [
      client,
      "Assessment client",
    ]);
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,$3,$4)",
      [property, client, "Assessment property", "Synthetic"],
    );
    const config = (await readAvailability()).config;
    const input = {
      version: config.version,
      durationMinutes: 60,
      bufferBefore: 15,
      bufferAfter: 15,
      windows: [{ day: 0, start: "09:00", end: "12:00" }],
    };
    assert.equal(
      availabilityInput.safeParse({
        ...input,
        windows: [...input.windows, ...input.windows],
      }).success,
      false,
    );
    await saveAvailability(user, input);
    assert.equal(
      (await generateAvailability(user, "2032-03-07", "2032-03-14")).created,
      4,
    );
    assert.equal(
      (await generateAvailability(user, "2032-03-07", "2032-03-14")).created,
      0,
      "generation replay",
    );
    let slots = (await availableSlots()).filter(
      (s: any) => new Date(s.starts_at).getUTCFullYear() === 2032,
    );
    assert.equal(slots.length, 4);
    assert.equal(slots[0].starts_at.toISOString(), "2032-03-07T14:15:00.000Z");
    assert.equal(slots[2].starts_at.toISOString(), "2032-03-14T13:15:00.000Z");
    const results = await Promise.allSettled([
      bookAssessment(slots[0].id, property, user),
      bookAssessment(slots[0].id, property, user),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    await assert.rejects(
      () =>
        addBlackout(
          user,
          "2032-03-07T14:00:00Z",
          "2032-03-07T14:10:00Z",
          "Travel conflict",
        ),
      /booked/,
    );
    const blackout = await addBlackout(
      user,
      "2032-03-14T13:00:00Z",
      "2032-03-14T13:10:00Z",
      "Travel buffer blackout",
    );
    assert.equal(
      (await availableSlots()).some((s: any) => s.id === slots[2].id),
      false,
    );
    await assert.rejects(
      () => bookAssessment(slots[2].id, property, user),
      /no longer/,
    );
    await removeBlackout(user, blackout.id);
    assert.equal(
      (await availableSlots()).some((s: any) => s.id === slots[2].id),
      true,
    );
    const current = (await readAvailability()).config;
    await saveAvailability(user, {
      ...input,
      version: current.version,
      durationMinutes: 30,
    });
    await assert.rejects(
      () => saveAvailability(user, { ...input, version: current.version }),
      /changed/,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT property_id,cancelled FROM assessment_slot WHERE id=$1",
          [slots[0].id],
        )
      ).rows[0].property_id,
      property,
    );
    await assert.rejects(
      () => bookAssessment(slots[1].id, property, user),
      /no longer/,
    );
    assert.equal(
      (await generateAvailability(user, "2032-03-14", "2032-03-14")).created,
      3,
    );
    await assert.rejects(
      () => generateAvailability(user, "2032-01-01", "2033-01-01"),
      /90 days/,
    );
    const active = (await availableSlots()).filter((s: any) =>
      new Date(s.starts_at).toISOString().startsWith("2032-03-14"),
    );
    const race = await Promise.allSettled([
      bookAssessment(active[0].id, property, user),
      addBlackout(
        user,
        "2032-03-14T13:00:00Z",
        "2032-03-14T14:00:00Z",
        "Concurrent closure",
      ),
    ]);
    assert.equal(
      race.filter((r) => r.status === "fulfilled").length,
      1,
      "booking and overlapping blackout cannot both commit",
    );
    await assert.rejects(
      () =>
        createManualAssessment(
          user,
          "2032-03-07T14:00:00Z",
          "2032-03-07T14:10:00Z",
        ),
      /overlaps/,
    );
    const retired = (
      await pool.query(
        "SELECT * FROM assessment_slot WHERE cancelled=true AND property_id IS NULL LIMIT 1",
      )
    ).rows[0];
    if (retired) {
      const recreated = await createManualAssessment(
        user,
        new Date(retired.starts_at).toISOString(),
        new Date(retired.ends_at).toISOString(),
      );
      assert.equal(
        recreated.id,
        retired.id,
        "withdrawn slot can be reoffered without a duplicate start",
      );
    }
    for (const role of [
      "crew",
      "client",
      "sales",
      "finance",
      "manager",
      "dispatch",
    ]) {
      const uid = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [uid, role, uid + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [uid, role],
      );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, uid],
      );
      const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      const headers = {
        cookie:
          "p1-dashboard.session_token=" + encodeURIComponent(token + "." + sig),
        origin: base!,
        "Content-Type": "application/json",
      };
      const allowed = ["manager", "dispatch"].includes(role);
      assert.equal(
        (await fetch(base + "/api/v1/assessment-availability", { headers }))
          .status,
        allowed ? 200 : 403,
      );
      for (const path of [
        "",
        "/generate",
        "/blackouts",
        "/blackouts/" + randomUUID() + "/archive",
      ]) {
        const r = await fetch(base + "/api/v1/assessment-availability" + path, {
          method: "POST",
          headers,
          body: "{}",
        });
        assert.equal(
          r.status,
          allowed ? (path.includes("/archive") ? 404 : 400) : 403,
          role + path,
        );
      }
    }
  },
);
