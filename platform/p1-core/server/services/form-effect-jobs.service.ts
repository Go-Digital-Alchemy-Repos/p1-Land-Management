import { startStoppableWorker } from "../utils/runtime-lifecycle";
import { type CmsFormEffectJob } from "@shared/schema";
import { storage } from "../storage";
import { logger } from "../utils/logger";
import { recordDomainOutcome } from "../utils/metrics";
import { inferCrmLeadFromFormData, normalizeCrmLeadInput } from "./crm.service";
import { deliverManagedFormNotification } from "./email.service";
import { isSiteFeatureEnabled } from "./site-features.service";
import { syncContactToMailchimp } from "./mailchimp.service";

async function applyJob(job: CmsFormEffectJob, clock: () => Date) {
  const token = job.processingToken;
  if (!token) throw new Error("form_effect_claim_missing");
  const payload = job.payload;
  if (payload.kind === "crm_intake" && !(await isSiteFeatureEnabled("crmEnabled"))) {
    throw new Error("crm_feature_disabled");
  }
  if (payload.kind === "crm_intake" || payload.kind === "contact_message") {
    return storage.forms.completeEffectJob(
      job.id,
      token,
      "completed",
      clock,
      async (tx, submission) => {
        if (payload.kind === "crm_intake") {
          const input = normalizeCrmLeadInput({
            ...inferCrmLeadFromFormData(submission.data),
            source: "website_form",
            formSubmissionId: submission.id,
            formData: submission.data,
            metadata: { formName: payload.formName },
          });
          await storage.crm.createOrUpdateInboundLead(input, undefined, tx);
        } else {
          const { name, email, subject, message } = submission.data;
          if (
            ![name, email, subject, message].every((value) => typeof value === "string" && value)
          ) {
            throw new Error("form_contact_payload_invalid");
          }
          await storage.contacts.createMessage(
            {
              name: name as string,
              email: email as string,
              subject: subject as string,
              message: message as string,
            },
            tx,
          );
        }
      },
    );
  }
  // External providers cannot share the database transaction. A crash after
  // delivery can replay a send: delivery is at least once, never exactly once.
  let outcome: "completed" | "skipped" = "completed";
  if (payload.kind === "mailchimp_sync") {
    await syncContactToMailchimp(
      {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        tags: [payload.tag],
      },
      { requireConfigured: true },
    );
  } else if (payload.kind === "admin_notification") {
    outcome = await deliverManagedFormNotification(payload);
  } else {
    throw new Error("unsupported_form_effect");
  }
  return storage.forms.completeEffectJob(job.id, token, outcome, clock);
}

export async function runFormEffectJobs(
  clock: () => Date = () => new Date(),
  maxJobs = 25,
  isStopping: () => boolean = () => false,
) {
  let completed = 0;
  let retried = 0;
  let failed = 0;
  for (let i = 0; i < maxJobs; i += 1) {
    if (isStopping()) break;
    const job = await storage.forms.claimNextEffectJob(clock());
    if (!job) break;
    try {
      if (await applyJob(job, clock)) completed += 1;
    } catch {
      const updated = await storage.forms.retryEffectJob(job, clock());
      if (updated?.status === "failed") failed += 1;
      else if (updated) retried += 1;
      logger.app.warn("Managed form effect delivery failed", {
        jobId: job.id,
        attemptCount: job.attemptCount,
      });
    }
  }
  if (completed) recordDomainOutcome("form_effect", "completed", completed);
  if (retried) recordDomainOutcome("form_effect", "retried", retried);
  if (failed) recordDomainOutcome("form_effect", "failed", failed);
  return { completed, retried, failed };
}

export function startFormEffectJobService() {
  return startStoppableWorker({
    intervalMs: 30_000,
    run: async (isStopping) => {
      await runFormEffectJobs(undefined, undefined, isStopping);
    },
    onError: () => logger.app.error("Managed form effect worker failed"),
  });
}
