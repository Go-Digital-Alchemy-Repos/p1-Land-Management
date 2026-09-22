import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import type { Actor } from "./access";
import {
  addAgreementCompositionLineItem,
  archiveAgreementCompositionDraft,
  createAgreementCompositionDraft,
  installStandardAgreementTemplate,
  removeAgreementCompositionLineItem,
  updateAgreementCompositionDraft,
  updateAgreementCompositionLineItem,
} from "./agreement-composition";

test("standard agreement templates create isolated, versioned client composition drafts with no operational side effects", { skip: !process.env.DASHBOARD_TEST_ORIGIN }, async () => {
  const userId = randomUUID(), clientId = randomUUID(), propertyId = randomUUID();
  const actor: Actor = { id: userId, name: "Agreement composer", role: "manager" };
  try {
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [userId, actor.name, `${userId}@example.test`]);
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,'manager')", [userId]);
    await pool.query("INSERT INTO client(id,name) VALUES($1,'Composition client')", [clientId]);
    await pool.query("INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Composition property','Synthetic address')", [propertyId, clientId]);

    const master = await installStandardAgreementTemplate(actor, "master-services-agreement");
    assert.equal(master.created, true);
    const masterAgain = await installStandardAgreementTemplate(actor, "master-services-agreement");
    assert.deepEqual(masterAgain, { id: master.id, created: false });
    const template = (await pool.query("SELECT name,body,source_slug FROM agreement_template WHERE id=$1", [master.id])).rows[0];
    assert.equal(template.name, "Master Services Agreement");
    assert.equal(template.source_slug, "master-services-agreement");
    assert.match(template.body, /MASTER SERVICES AGREEMENT/);
    assert.doesNotMatch(template.body, /EXHIBIT A\s+WORK ORDER/);
    const snow = await installStandardAgreementTemplate(actor, "standard-snow-ice-removal");
    assert.equal(snow.created, true);
    assert.match((await pool.query("SELECT body FROM agreement_template WHERE id=$1", [snow.id])).rows[0].body, /COMMERCIAL SNOW AND ICE MANAGEMENT AGREEMENT/);

    const created = await createAgreementCompositionDraft(actor, { templateId: master.id, clientId, propertyId });
    assert.equal(created.version, 1);
    assert.equal(created.clientId, clientId);
    assert.equal(created.propertyId, propertyId);
    assert.match(created.body, /MASTER SERVICES AGREEMENT/);
    assert.equal(created.lineItems.length, 0);
    const line = await addAgreementCompositionLineItem(actor, created.id, { expectedVersion: 1, description: "Monthly site maintenance", unit: "month", quantity: 1, unitPriceCents: 250000 });
    assert.equal(line.version, 2);
    assert.deepEqual(line.lineItems.map((item: { description: string; quantity: number; unitPriceCents: number }) => ({ description: item.description, quantity: item.quantity, unitPriceCents: item.unitPriceCents })), [{ description: "Monthly site maintenance", quantity: 1, unitPriceCents: 250000 }]);
    await assert.rejects(
      updateAgreementCompositionDraft(actor, created.id, { expectedVersion: 1, title: "Stale save" }),
      /changed; reload/,
    );
    const changed = await updateAgreementCompositionLineItem(actor, created.id, line.lineItems[0].id, { expectedVersion: 2, description: "Monthly site maintenance and inspections", unit: "month", quantity: 2, unitPriceCents: 125000 });
    assert.equal(changed.version, 3);
    const removed = await removeAgreementCompositionLineItem(actor, created.id, line.lineItems[0].id, { expectedVersion: 3 });
    assert.equal(removed.version, 4);
    assert.equal(removed.lineItems.length, 0);
    const archived = await archiveAgreementCompositionDraft(actor, created.id, { expectedVersion: 4 });
    assert.equal(archived.status, "archived");
    await assert.rejects(addAgreementCompositionLineItem(actor, created.id, { expectedVersion: 5, description: "Not permitted", quantity: 1, unitPriceCents: 1 }), /Archived/);
    const sideEffects = await pool.query("SELECT (SELECT count(*) FROM estimate WHERE property_id=$1)::int AS estimates,(SELECT count(*) FROM service_agreement WHERE property_id=$1)::int AS agreements,(SELECT count(*) FROM work_order WHERE property_id=$1)::int AS work_orders,(SELECT count(*) FROM billing_draft WHERE property_id=$1)::int AS billing_drafts", [propertyId]);
    assert.deepEqual(sideEffects.rows[0], { estimates: 0, agreements: 0, work_orders: 0, billing_drafts: 0 });
  } finally {
    await pool.query("DELETE FROM agreement_composition_draft WHERE client_id=$1", [clientId]);
    await pool.query("DELETE FROM agreement_template WHERE created_by=$1", [userId]);
    await pool.query("DELETE FROM property WHERE id=$1", [propertyId]);
    await pool.query("DELETE FROM client WHERE id=$1", [clientId]);
    await pool.query("DELETE FROM staff_profile WHERE user_id=$1", [userId]);
    await pool.query("DELETE FROM audit_event WHERE user_id=$1", [userId]);
    await pool.query('DELETE FROM "user" WHERE id=$1', [userId]);
  }
});
