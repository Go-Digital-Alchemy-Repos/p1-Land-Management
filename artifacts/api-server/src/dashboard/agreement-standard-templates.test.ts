import test from "node:test";
import assert from "node:assert/strict";
import { standardAgreementTemplates } from "./agreement-standard-templates";

test("owner-supplied standard agreement sources are complete and exclude the MSA work-order appendix", () => {
  assert.deepEqual(
    standardAgreementTemplates.map((template) => template.slug),
    ["master-services-agreement", "standard-snow-ice-removal"],
  );
  const msa = standardAgreementTemplates[0];
  assert.equal(msa.name, "Master Services Agreement");
  assert.match(msa.body, /MASTER SERVICES AGREEMENT/);
  assert.doesNotMatch(msa.body, /EXHIBIT A\s+WORK ORDER/i);
  const snow = standardAgreementTemplates[1];
  assert.equal(snow.name, "Standard Snow & Ice Removal");
  assert.match(snow.body, /COMMERCIAL SNOW AND ICE MANAGEMENT AGREEMENT/);
});
