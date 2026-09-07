import { pool } from "../db";
import { FormsStorage } from "../storage/forms.storage";

// Operator-only CLI. Lists no payload, email address, or submission data.
try {
  const [command, id, ...extra] = process.argv.slice(2);
  if (
    extra.length ||
    (command !== "list" && command !== "retry") ||
    (command === "list" && id) ||
    (command === "retry" && !id)
  ) {
    throw new Error(
      "Usage: tsx server/scripts/manage-form-effect-jobs.ts list | retry <failed-job-id>",
    );
  }
  const forms = new FormsStorage();
  if (command === "list") console.log(JSON.stringify(await forms.listFailedEffectJobs(), null, 2));
  else {
    const job = await forms.requeueFailedEffectJob(id);
    if (!job) throw new Error("Failed job not found; no job changed");
    console.log(JSON.stringify({ requeued: job.id }));
  }
} finally {
  await pool.end();
}
