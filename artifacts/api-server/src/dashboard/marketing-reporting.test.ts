import {test} from "node:test";
import assert from "node:assert/strict";
import {marketingConnection, readMarketingReport} from "./marketing-reporting.transport";
const grant = "11111111-1111-4111-8111-111111111111";
test("report transport uses fixed paths, server credentials and bounded sanitized responses", async () => {
  let called = 0;
  const transport: typeof fetch = async (url, init) => {
    called++;
    assert.equal(String(url), "https://core.example.test/api/integrations/business-center/reporting/analytics?startDate=2026-09-01&endDate=2026-09-03");
    assert.deepEqual(JSON.parse(String(init?.body)), {grantId: grant});
    assert.equal(init?.redirect, "error");
    assert.deepEqual(init?.headers, {"content-type": "application/json", authorization: "Bearer synthetic-key"});
    return Response.json({status: "empty", reports: {}});
  };
  assert.deepEqual(await readMarketingReport("https://core.example.test", "synthetic-key", "analytics", grant, {startDate: "2026-09-01", endDate: "2026-09-03"}, transport), {status: "empty", reports: {}});
  await assert.rejects(() => readMarketingReport("https://core.example.test", "key", "../../admin/users", grant, {}, transport), /not found/);
  assert.equal(called, 1);
  await assert.rejects(() => readMarketingReport("https://core.example.test", "key", "analytics", grant, {}, async () => Response.json({secret: "sensitive"}, {status: 500})), error => !String(error).includes("sensitive") && String(error).includes("unavailable"));
  await assert.rejects(() => readMarketingReport("https://core.example.test", "key", "analytics", grant, {}, async () => new Response("x".repeat(8 * 1024 * 1024 + 1), {headers: {"content-type": "application/json"}})), /unavailable/);
});
test("report connection rejects browser-selected destinations and insecure or malformed config", () => {
  for (const origin of ["http://core.example.test", "https://user:pass@core.example.test", "https://core.example.test/admin", "https://core.example.test/?redirect=evil"])
    assert.throws(() => marketingConnection({CORE_MARKETING_ORIGIN: origin, CORE_MARKETING_SERVICE_KEY: "s".repeat(43)}), /not connected/);
  assert.deepEqual(marketingConnection({CORE_MARKETING_ORIGIN: "https://core.example.test", CORE_MARKETING_SERVICE_KEY: "s".repeat(43)}), {origin: "https://core.example.test", key: "s".repeat(43)});
});
