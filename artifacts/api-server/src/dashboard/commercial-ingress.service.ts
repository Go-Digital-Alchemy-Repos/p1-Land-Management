import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { transaction } from "./database";
import { HttpError } from "./policy";
import {
  commercialIntakeEventSchema,
  commercialSignatureInput,
  type CommercialIntakeResult,
} from "./commercial-intake-contract";
const keyConfig = z.record(
  z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  z
    .object({
      secretHex: z.string().regex(/^[a-fA-F0-9]{64}$/),
      sourceInstanceId: z.string().uuid(),
    })
    .strict(),
);
export function verifyCommercialSignature(
  body: Buffer,
  headers: { keyId?: string; sentAt?: string; signature?: string },
  now = Date.now(),
) {
  const { keyId, sentAt, signature } = headers;
  if (
    !keyId ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(keyId) ||
    !sentAt ||
    !/^\d{10}$/.test(sentAt) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    Math.abs(now / 1000 - Number(sentAt)) > 300
  )
    throw new HttpError(401, "commercial_signature_invalid");
  let keys: z.infer<typeof keyConfig>;
  try {
    keys = keyConfig.parse(
      JSON.parse(process.env.CORE_INGRESS_HMAC_KEYS || "{}"),
    );
  } catch {
    throw new HttpError(503, "commercial_ingress_unconfigured");
  }
  const key = Object.hasOwn(keys, keyId) ? keys[keyId] : undefined;
  if (!key) throw new HttpError(401, "commercial_issuer_unknown");
  const fingerprint = createHash("sha256").update(body).digest("hex");
  const expected = createHmac("sha256", Buffer.from(key.secretHex, "hex"))
    .update(commercialSignatureInput(keyId, sentAt, fingerprint))
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw new HttpError(401, "commercial_signature_invalid");
  return { keyId, key, fingerprint };
}
export async function receiveCommercialInquiry(
  body: Buffer,
  headers: { keyId?: string; sentAt?: string; signature?: string },
): Promise<CommercialIntakeResult> {
  if (body.length > 65536)
    throw new HttpError(413, "commercial_payload_too_large");
  const verified = verifyCommercialSignature(body, headers);
  let event: z.infer<typeof commercialIntakeEventSchema>;
  try {
    event = commercialIntakeEventSchema.parse(
      JSON.parse(body.toString("utf8")),
    );
  } catch {
    throw new HttpError(400, "commercial_payload_invalid");
  }
  if (event.sourceInstanceId !== verified.key.sourceInstanceId)
    throw new HttpError(403, "commercial_source_mismatch");
  return transaction(async (c) => {
    // Configured key metadata is provisioned once. Revocation is never undone on replay/startup.
    await c.query(
      "INSERT INTO integration_ingress_key(key_id,source_instance_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [verified.keyId, verified.key.sourceInstanceId],
    );
    const issuer = (
      await c.query(
        "SELECT * FROM integration_ingress_key WHERE key_id=$1 FOR SHARE",
        [verified.keyId],
      )
    ).rows[0];
    if (
      !issuer?.enabled ||
      issuer.revoked_at ||
      issuer.source_instance_id !== event.sourceInstanceId
    )
      throw new HttpError(403, "commercial_issuer_revoked");
    // Both identities lock in sorted order: concurrent conflicting event/submission combinations cannot race.
    for (const lock of [
      `commercial:event:${event.sourceInstanceId}:${event.eventId}`,
      `commercial:submission:${event.sourceInstanceId}:${event.submissionId}`,
    ].sort())
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        lock,
      ]);
    const previous = (
      await c.query(
        "SELECT * FROM commercial_intake_receipt WHERE source_instance_id=$1 AND (submission_id=$2 OR event_id=$3)",
        [event.sourceInstanceId, event.submissionId, event.eventId],
      )
    ).rows;
    if (previous.length) {
      const old = previous[0];
      if (
        previous.length !== 1 ||
        old.payload_sha256 !== verified.fingerprint ||
        old.event_id !== event.eventId ||
        old.submission_id !== event.submissionId
      )
        throw new HttpError(409, "commercial_identity_conflict");
      return {
        schemaVersion: 1,
        eventId: event.eventId,
        submissionId: event.submissionId,
        leadId: old.lead_id,
        receivedAt: new Date(old.received_at).toISOString(),
        duplicate: true,
      };
    }
    const i = event.inquiry,
      leadId = randomUUID();
    await c.query(
      "INSERT INTO lead(id,name,email,phone,location,description,source,status,inquiry_type,reported_company_name,contact_title,reported_property_name,property_type,acreage_description,project_stage,service_timing,services,attribution) VALUES($1,$2,$3,$4,$5,$6,'website_form','new',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
      [
        leadId,
        i.name,
        i.email,
        i.phone,
        i.address,
        i.message || "",
        i.inquiryType,
        i.company,
        i.title,
        i.propertyName,
        i.propertyType,
        i.acreage,
        i.projectStage,
        i.serviceTiming,
        i.services,
        i.attribution,
      ],
    );
    const receipt = (
      await c.query(
        "INSERT INTO commercial_intake_receipt(id,source_instance_id,submission_id,event_id,schema_version,payload_sha256,accepted_at,lead_id,raw_intake) VALUES($1,$2,$3,$4,1,$5,$6,$7,$8) RETURNING received_at",
        [
          randomUUID(),
          event.sourceInstanceId,
          event.submissionId,
          event.eventId,
          verified.fingerprint,
          event.acceptedAt,
          leadId,
          event,
        ],
      )
    ).rows[0];
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,NULL,'commercial.intake_received',$2,$3)",
      [
        randomUUID(),
        leadId,
        {
          sourceInstanceId: event.sourceInstanceId,
          eventId: event.eventId,
          submissionId: event.submissionId,
          keyId: verified.keyId,
        },
      ],
    );
    return {
      schemaVersion: 1,
      eventId: event.eventId,
      submissionId: event.submissionId,
      leadId,
      receivedAt: new Date(receipt.received_at).toISOString(),
      duplicate: false,
    };
  });
}
