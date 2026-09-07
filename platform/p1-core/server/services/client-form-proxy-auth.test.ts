import { describe, expect, it } from "vitest";
import { authorizeClientFormProxy } from "./client-form-proxy-auth";

const configured = {
  requestedStackId: "better-farms-foundation",
  targetStackId: "better-farms-foundation",
  expectedToken: "test-client-form-proxy-token",
};

describe("authorizeClientFormProxy", () => {
  it("accepts only the configured stack and matching server token", () => {
    expect(
      authorizeClientFormProxy({ ...configured, presentedToken: "test-client-form-proxy-token" }),
    ).toEqual({ allowed: true });
  });

  it("rejects a different stack or token without treating the proxy as unconfigured", () => {
    expect(
      authorizeClientFormProxy({
        ...configured,
        requestedStackId: "another-client",
        presentedToken: "test-client-form-proxy-token",
      }),
    ).toEqual({ allowed: false, configured: true });
    expect(authorizeClientFormProxy({ ...configured, presentedToken: "wrong-token" })).toEqual({
      allowed: false,
      configured: true,
    });
  });

  it("reports an unavailable proxy when stack identity or token configuration is absent", () => {
    expect(authorizeClientFormProxy({ requestedStackId: "better-farms-foundation" })).toEqual({
      allowed: false,
      configured: false,
    });
  });
});
