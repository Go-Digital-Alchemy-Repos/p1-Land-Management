import { storage } from "../storage";
import { logger } from "../utils/logger";
import { ensureSystemEmailTemplates } from "./system-email-templates.service";
import { ensureSystemForms } from "./system-forms.service";

export async function runSystemBootstrap() {
  logger.app.info("Running system bootstrap");

  for (const [key, value] of Object.entries({
    company_name: "P1 Land & Property Management",
    favicon_url: "/p1-symbol.svg",
  })) {
    if ((await storage.settings.getSetting(key)) === null)
      await storage.settings.upsertSetting(key, value, "branding", false);
  }
  await ensureSystemForms();
  await ensureSystemEmailTemplates(false);

  logger.app.info("System bootstrap complete");
}
