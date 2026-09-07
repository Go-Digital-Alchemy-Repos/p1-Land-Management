import { ensureSystemEmailTemplates } from "../services/system-email-templates.service";

ensureSystemEmailTemplates(true)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
