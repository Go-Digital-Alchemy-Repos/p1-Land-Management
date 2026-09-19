import { createHash } from "node:crypto";
import type { SeoSettings } from "@shared/schema";
import { buildRobotsTxtPayload } from "./robots-txt.service";

export function projectWebsiteRobots(settings?: SeoSettings | null) {
  const content = buildRobotsTxtPayload(settings).effectiveContent;
  if (Buffer.byteLength(content, "utf8") > 32768 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ud800-\udfff]/u.test(content)) {
    throw new Error("Invalid robots content");
  }
  return { schemaVersion: 1, stackId: "p1-land-management", version: createHash("sha256").update(content).digest("hex"), content };
}
