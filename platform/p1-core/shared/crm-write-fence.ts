/**
 * Versioned, non-secret setting used only to fence legacy Core staff CRM writes
 * during the Dashboard Sales cutover. Public intake and durable form effects
 * are deliberately outside this boundary.
 */
export const LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY = "crm_cutover";
export const LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY = "legacy_staff_crm_writes_fenced";

export const LEGACY_STAFF_CRM_WRITE_FENCE_KEY_RULES = {
  [LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY]: false,
} as const;
