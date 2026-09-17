import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  snapshot: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    settings: {
      getCategorySnapshot: state.snapshot,
      getDecryptedCategory: state.read,
      upsertSettings: state.write,
      invalidateCategory: state.invalidate,
    },
  },
}));
vi.mock("./email.service", () => ({ sendEmail: vi.fn() }));
vi.mock("./r2.service", () => ({}));
import { DEFAULT_CAREER_SETTINGS, getCareerSettings, saveCareerSettings } from "./careers.service";
beforeEach(() => {
  vi.clearAllMocks();
  state.read.mockResolvedValue({
    google_service_account_json: "private-google",
    indeed_apply_secret: "private-indeed",
    zip_recruiter_api_key: "private-zip",
    generic_webhook_secret: "private-webhook",
  });
  state.snapshot.mockImplementation(async () => ({
    values: await state.read(),
    version: "a".repeat(64),
  }));
  state.write.mockResolvedValue([]);
});
it("redacted round trips retain every stored credential and use one atomic settings batch", async () => {
  const redacted = await getCareerSettings(false);
  expect(JSON.stringify(redacted)).not.toContain("private-");
  redacted.sharing.enabled = false;
  await saveCareerSettings(redacted);
  expect(state.write).toHaveBeenCalledTimes(1);
  const batch = state.write.mock.calls[0][0];
  expect(batch.every((entry: any) => !entry.isSecret)).toBe(true);
  expect(batch).toContainEqual({
    key: "share_enabled",
    value: "false",
    category: "career_center",
    isSecret: false,
  });
  expect(state.invalidate).toHaveBeenCalledTimes(1);
});
it("explicit replacement writes only supplied credentials; failed writes do not invalidate or return success", async () => {
  const value = structuredClone(DEFAULT_CAREER_SETTINGS);
  value.integrations.indeedApplySecret = "replacement";
  value.integrations.genericWebhookSecret = "  ";
  await saveCareerSettings(value);
  expect(state.write.mock.calls[0][0].filter((entry: any) => entry.isSecret)).toEqual([
    { key: "indeed_apply_secret", value: "replacement", category: "career_center", isSecret: true },
  ]);
  state.invalidate.mockClear();
  state.write.mockRejectedValue(new Error("Synthetic failure"));
  await expect(saveCareerSettings(value)).rejects.toThrow("Synthetic failure");
  expect(state.invalidate).not.toHaveBeenCalled();
});

it("versioned administrative reads bypass caches and saves forward the loaded version", async () => {
  state.snapshot.mockResolvedValue({
    values: { share_enabled: "false", indeed_apply_secret: "private" },
    version: "b".repeat(64),
  });
  const value = await getCareerSettings(false, true);
  expect(value.version).toBe("b".repeat(64));
  expect(value.sharing.enabled).toBe(false);
  expect(value.integrations.indeedApplySecret).toBe("");
  expect(state.read).not.toHaveBeenCalled();
  await saveCareerSettings(value);
  expect(state.write.mock.calls[0][1]).toEqual({
    category: "career_center",
    version: "b".repeat(64),
  });
  state.invalidate.mockClear();
  state.write.mockRejectedValue(Object.assign(new Error("Settings changed"), { statusCode: 409 }));
  await expect(saveCareerSettings(value)).rejects.toMatchObject({ statusCode: 409 });
  expect(state.invalidate).not.toHaveBeenCalled();
});
