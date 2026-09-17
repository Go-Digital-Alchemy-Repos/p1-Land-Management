import { expect, it } from "vitest";
import {
  getSocialMediaLinks,
  isSafeSocialUrl,
  isSocialSettingKey,
  SOCIAL_MEDIA_PLATFORMS,
  normalizeSocialIconStyle,
} from "./social-media";
it("retains all ten profile keys and excludes executable or credential-bearing links", () => {
  expect(SOCIAL_MEDIA_PLATFORMS).toHaveLength(10);
  for (const url of [
    "https://www.facebook.com/example?ref=site#profile",
    "http://example.test/profile",
    "https://example.test/a%20b",
  ])
    expect(isSafeSocialUrl(url)).toBe(true);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,bad",
    "//example.test",
    "/relative",
    "https://user:password@example.test",
    "https://example.test/\\unsafe",
    "https://example.test/\nunsafe",
    "https://example.test/" + "x".repeat(2048),
  ])
    expect(isSafeSocialUrl(url)).toBe(false);
  const links = getSocialMediaLinks({
    social_facebook_url: " https://example.test/profile ",
    social_x_url: "javascript:alert(1)",
    social_yelp_url: "https://user:password@example.test",
  });
  expect(links).toHaveLength(1);
  expect(links[0]).toMatchObject({ platform: "facebook", url: "https://example.test/profile" });
});
it("shared styling defaults and exact setting guards retain legacy semantics", () => {
  expect(normalizeSocialIconStyle("outline")).toBe("outline");
  expect(normalizeSocialIconStyle("custom")).toBe("brand");
  for (const platform of SOCIAL_MEDIA_PLATFORMS)
    expect(isSocialSettingKey(platform.settingKey)).toBe(true);
  expect(isSocialSettingKey("social_icon_style")).toBe(true);
  expect(isSocialSettingKey("company_name")).toBe(false);
});
