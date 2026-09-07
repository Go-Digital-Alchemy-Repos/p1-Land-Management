import { describe, expect, it } from "vitest";
import { p1EstimateSchema } from "./p1-estimate";
import { isContactLink } from "../../shared/client-site-content-contract";
const valid = { name:"Property owner", email:"owner@example.test", address:"York County", message:"Clear five acres", services:["Forestry mulching"], attribution:{utm_source:"google"}, website:"" };
describe("P1 estimate boundary", () => {
  it("preserves project details and campaign attribution", () => { expect(p1EstimateSchema.parse(valid).attribution).toEqual({utm_source:"google"}); });
  it("rejects spam, malformed attribution and oversized requests", () => {
    expect(p1EstimateSchema.safeParse({...valid,website:"spam"}).success).toBe(false);
    expect(p1EstimateSchema.safeParse({...valid,attribution:{nested:{email:"private"}}}).success).toBe(false);
    expect(p1EstimateSchema.safeParse({...valid,message:"a".repeat(5001)}).success).toBe(false);
  });
  it("allows phone/email CTAs without executable URLs or email header injection", () => {
    expect(isContactLink("tel:+17042218928")).toBe(true);
    expect(isContactLink("mailto:info@p1landmanagement.com")).toBe(true);
    for (const url of ["javascript:alert(1)","mailto:a@b.com?bcc=other@b.com","tel:123%0aevil"]) expect(isContactLink(url)).toBe(false);
  });
});
