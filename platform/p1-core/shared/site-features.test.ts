import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_FEATURES, normalizeBooleanSetting, parseSiteFeatures, SITE_FEATURE_SETTING_KEYS } from "./site-features";

describe("site features", () => {
  it("enables cms by default", () => {
    expect(DEFAULT_SITE_FEATURES.cmsEnabled).toBe(true);
  });

  it("disables careers by default", () => {
    expect(DEFAULT_SITE_FEATURES.careersEnabled).toBe(false);
  });

  it("normalizes disabled feature settings", () => {
    expect(normalizeBooleanSetting("off", true)).toBe(false);
    expect(normalizeBooleanSetting("enabled", false)).toBe(true);
  });
});

it("uses retained defaults without persisting or enabling optional apps", () => {
  expect(parseSiteFeatures({})).toEqual(DEFAULT_SITE_FEATURES);
  expect(DEFAULT_SITE_FEATURES.eventsEnabled).toBe(false);
  expect(DEFAULT_SITE_FEATURES.careersEnabled).toBe(false);
});
it("normalizes all legacy aliases consistently and ignores unrelated values", () => {
  for (const value of [true, "true", "1", "yes", "on", "enabled", " TRUE "])
    expect(
      Object.values(
        parseSiteFeatures(
          Object.fromEntries(Object.values(SITE_FEATURE_SETTING_KEYS).map((key) => [key, value])),
        ),
      ),
    ).toEqual(Array(5).fill(true));
  for (const value of [false, "false", "0", "no", "off", "disabled", " FALSE "])
    expect(
      Object.values(
        parseSiteFeatures(
          Object.fromEntries(Object.values(SITE_FEATURE_SETTING_KEYS).map((key) => [key, value])),
        ),
      ),
    ).toEqual(Array(5).fill(false));
  expect(parseSiteFeatures({ enable_events: "invalid", enable_cms: null, other: true })).toEqual(
    DEFAULT_SITE_FEATURES,
  );
});
