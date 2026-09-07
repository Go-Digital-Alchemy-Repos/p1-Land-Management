import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { storage } from "../storage";
import type { CmsFormEffectJob } from "@shared/schema";
import {
  COMMERCIAL_INGRESS_PATH,
  commercialIntakeEventSchema,
  commercialIntakeResultSchema,
  commercialSignatureInput,
} from "../../shared/commercial-intake-contract";
export class CommercialHandoffError extends Error {}
function configuration() {
  const input = z
    .object({
      keyId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
      secret: z.string().regex(/^[a-fA-F0-9]{64}$/),
      source: z.string().uuid(),
      url: z.string().url(),
      host: z.string().min(1),
    })
    .safeParse({
      keyId: process.env.COMMERCIAL_HANDOFF_KEY_ID,
      secret: process.env.COMMERCIAL_HANDOFF_SECRET_HEX,
      source: process.env.COMMERCIAL_HANDOFF_SOURCE_INSTANCE_ID,
      url: process.env.COMMERCIAL_HANDOFF_URL,
      host: process.env.COMMERCIAL_HANDOFF_ALLOWED_HOST,
    });
  if (!input.success) throw new CommercialHandoffError("commercial_handoff_unconfigured");
  const url = new URL(input.data.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== input.data.host ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== COMMERCIAL_INGRESS_PATH ||
    url.port
  )
    throw new CommercialHandoffError("commercial_destination_invalid");
  return input.data;
}
export async function deliverCommercialHandoff(job: CmsFormEffectJob) {
  const config = configuration();
  if (!job.processingToken) throw new CommercialHandoffError("commercial_claim_lost");
  const bytes = await storage.forms.freezeCommercialDelivery(
    job.id,
    job.processingToken,
    config.source,
  );
  const event = commercialIntakeEventSchema.parse(JSON.parse(bytes));
  if (event.sourceInstanceId !== config.source)
    throw new CommercialHandoffError("commercial_source_changed");
  const sentAt = String(Math.floor(Date.now() / 1000));
  const digest = createHash("sha256").update(bytes).digest("hex");
  const signature = createHmac("sha256", Buffer.from(config.secret, "hex"))
    .update(commercialSignatureInput(config.keyId, sentAt, digest))
    .digest("hex");
  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "content-type": "application/json",
        "x-p1-key-id": config.keyId,
        "x-p1-sent-at": sentAt,
        "x-p1-signature": signature,
      },
      body: bytes,
    });
  } catch {
    throw new CommercialHandoffError("commercial_delivery_unavailable");
  }
  if (![200, 201].includes(response.status))
    throw new CommercialHandoffError(
      [400, 401, 403, 409, 413, 429].includes(response.status)
        ? `commercial_http_${response.status}`
        : "commercial_delivery_unavailable",
    );
  let raw = "";
  const reader = response.body?.getReader();
  if (!reader) throw new CommercialHandoffError("commercial_response_invalid");
  let bytesRead = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > 4096) {
        await reader.cancel();
        throw new CommercialHandoffError("commercial_response_invalid");
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
  } catch (error) {
    if (error instanceof CommercialHandoffError) throw error;
    throw new CommercialHandoffError("commercial_delivery_unavailable");
  }
  let result;
  try {
    result = commercialIntakeResultSchema.parse(JSON.parse(raw));
  } catch {
    throw new CommercialHandoffError("commercial_response_invalid");
  }
  if (result.eventId !== event.eventId || result.submissionId !== event.submissionId)
    throw new CommercialHandoffError("commercial_response_mismatch");
  return result;
}
