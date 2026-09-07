import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CRM_PIPELINE_CONFIG,
  CRM_PIPELINE_SETTING_KEY,
} from "@shared/crm-pipeline-settings";
const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), warn: vi.fn(), info: vi.fn() }));
vi.mock("../storage", () => ({
  storage: { settings: { getSetting: mocks.get, upsertSetting: mocks.put } },
}));
vi.mock("../utils/logger", () => ({ logger: { app: { warn: mocks.warn, info: mocks.info } } }));
import { getCrmPipelineSettings, saveCrmPipelineSettings } from "./crm-pipeline-settings.service";
describe("CRM pipeline settings persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(null);
  });
  it("returns defaults without writing a missing row", async () => {
    expect(await getCrmPipelineSettings()).toEqual({
      config: DEFAULT_CRM_PIPELINE_CONFIG,
      source: "default",
      issue: null,
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it.each(["broken", "{}", '{"version":1,"stages":[]}'])(
    "recovers malformed stored value without rewriting it",
    async (raw) => {
      mocks.get.mockResolvedValue(raw);
      expect((await getCrmPipelineSettings()).issue).toBe("invalid_stored_config");
      expect(mocks.put).not.toHaveBeenCalled();
      expect(mocks.warn.mock.calls[0][1]).toEqual({
        settingKey: CRM_PIPELINE_SETTING_KEY,
        issue: "invalid_stored_config",
      });
    },
  );
  it("does not downgrade unknown versions", async () => {
    mocks.get.mockResolvedValue('{"version":2}');
    expect((await getCrmPipelineSettings()).issue).toBe("unsupported_version");
    await expect(
      saveCrmPipelineSettings(DEFAULT_CRM_PIPELINE_CONFIG, "admin"),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("saves canonical config and supports restoring defaults with the same operation", async () => {
    const value = structuredClone(DEFAULT_CRM_PIPELINE_CONFIG);
    value.stages[0].label = " Inquiry ";
    const result = await saveCrmPipelineSettings(value, "admin");
    expect(result.config.stages[0].label).toBe("Inquiry");
    expect(mocks.put).toHaveBeenCalledWith(
      CRM_PIPELINE_SETTING_KEY,
      JSON.stringify(result.config),
      "crm",
      false,
    );
    mocks.get.mockResolvedValue(JSON.stringify(result.config));
    expect((await getCrmPipelineSettings()).source).toBe("stored");
    expect((await saveCrmPipelineSettings(DEFAULT_CRM_PIPELINE_CONFIG, "admin")).config).toEqual(
      DEFAULT_CRM_PIPELINE_CONFIG,
    );
  });
  it("rejects oversized raw payload even when trimming would shrink it", async () => {
    const value = structuredClone(DEFAULT_CRM_PIPELINE_CONFIG);
    value.stages[0].label = " ".repeat(4096) + "Inquiry";
    await expect(saveCrmPipelineSettings(value, "admin")).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });
});
