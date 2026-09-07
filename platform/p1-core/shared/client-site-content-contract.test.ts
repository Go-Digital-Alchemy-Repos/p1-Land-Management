import { describe, expect, it } from "vitest";
import {
  validateClientSiteComponentContent,
  type ClientSiteEditableComponent,
} from "./client-site-content-contract";

describe("editable URL boundaries", () => {
  for (const type of ["image", "ctaTarget"] as const) {
    const component = {
      fields: [{ path: "target", label: "Target", type, required: true }],
    } as ClientSiteEditableComponent;
    it(`${type} rejects paths browsers can interpret as external hosts`, () => {
      for (const target of [
        String.raw`/\example.test/image`,
        String.raw`/\user:pass@example.test/image`,
        "/image\u0000.png",
        "/image\u007f.png",
        "//example.test/image",
      ]) {
        expect(() => validateClientSiteComponentContent(component, { target })).toThrow();
      }
    });
    it(`${type} retains ordinary site paths and explicit HTTPS URLs`, () => {
      for (const target of [
        "/image.png",
        "/contact?from=hero#form",
        "https://media.example.test/image.png",
      ]) {
        expect(validateClientSiteComponentContent(component, { target })).toEqual({ target });
      }
    });
  }
});

describe("explicit image origin policy", () => {
  const component = {
    fields: [
      {
        path: "image",
        label: "Image",
        type: "image",
        required: true,
        allowedImageOrigins: ["https://dashboard.better-farms.example"],
      },
    ],
  } as ClientSiteEditableComponent;
  it("accepts internal paths and the exact Core admin image origin", () => {
    for (const image of [
      "/images/a.webp",
      "https://dashboard.better-farms.example/r2/clients/better-farms/uploads/a.webp",
    ]) {
      expect(validateClientSiteComponentContent(component, { image })).toEqual({ image });
    }
  });
  it("rejects other hosts, ports, credentials, HTTP and URL normalization tricks", () => {
    for (const image of [
      "https://dashboard.better-farms.example.evil.test/a",
      "https://dashboard.better-farms.example:444/a",
      "https://user:pass@dashboard.better-farms.example/a",
      "http://dashboard.better-farms.example/a",
      "https://other.example/a",
      String.raw`https://dashboard.better-farms.example\a`,
      "/\\evil.test/a",
      "https://dashboard.better-farms.example/\u0000a",
      "https://dashboard.better-farms.example/\u007fa",
    ]) {
      expect(() => validateClientSiteComponentContent(component, { image })).toThrow();
    }
  });
  it("an explicitly empty list permits internal images only", () => {
    const local = {
      ...component,
      fields: component.fields.map((field) => ({ ...field, allowedImageOrigins: [] })),
    };
    expect(() =>
      validateClientSiteComponentContent(local, {
        image: "https://dashboard.better-farms.example/a",
      }),
    ).toThrow();
    expect(validateClientSiteComponentContent(local, { image: "/a" })).toEqual({ image: "/a" });
  });
});
