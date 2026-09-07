import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ClientSiteManifestLoadError,
  loadClientSiteManifest,
} from "../services/client-site-manifest.service";

const fixturePath = fileURLToPath(
  new URL("../../docs/pilots/better-farms/client-site-manifest.example.json", import.meta.url),
);

describe("client site manifest loader", () => {
  it("loads a compatible validated manifest", async () => {
    const manifest = await loadClientSiteManifest(fixturePath, "1.0.0");

    expect(manifest.client.stackId).toBe("better-farms-foundation");
    expect(manifest.puck.editableComponents[0].key).toBe("fund-a-farm-page");
  });

  it("fails closed when Core Platform is outside the declared range", async () => {
    await expect(loadClientSiteManifest(fixturePath, "0.9.9")).rejects.toThrow(
      "below the manifest minimum",
    );
  });

  it("reports safe structured errors without echoing embedded secrets", async () => {
    const directory = await mkdtemp(join(tmpdir(), "client-site-manifest-"));
    const invalidPath = join(directory, "invalid.json");
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
    const sensitiveValue = "sk_live_1234567890ABCDEF";
    fixture.apiKey = sensitiveValue;
    await writeFile(invalidPath, JSON.stringify(fixture));

    const error = await loadClientSiteManifest(invalidPath, "1.0.0").catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ClientSiteManifestLoadError);
    expect(JSON.stringify(error)).not.toContain(sensitiveValue);
    expect((error as ClientSiteManifestLoadError).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "embedded_secret_field" })]),
    );
  });
});
