/** Feature flags are resolved once per process; credentials do not enable a feature. */
export const features = Object.freeze({
  quickbooks: process.env.P1_FEATURE_QUICKBOOKS === "enabled",
});
