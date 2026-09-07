import { describe, expect, it } from "vitest";
import { parseClientStackDeploymentArguments } from "./client-stack-deployment-arguments";

describe("client-stack deployment arguments", () => {
  it("maps every supported deployment requirement and manifest path", () => {
    expect(
      parseClientStackDeploymentArguments([
        "--require-ecommerce",
        "--require-email",
        "--require-backups",
        "--require-observability",
        "--require-client-form-proxy",
        "--require-separate-origins",
        "--release-manifest",
        "release.json",
      ]),
    ).toEqual({
      requirements: {
        ecommerce: true,
        email: true,
        backups: true,
        observability: true,
        clientFormProxy: true,
        separatePublicAndAdminOrigins: true,
      },
      releaseManifestPath: "release.json",
      errors: [],
    });
  });

  it("rejects unknown, duplicate, and incomplete options", () => {
    expect(
      parseClientStackDeploymentArguments([
        "--require-ecommerce",
        "--require-ecommerce",
        "--release-manifest",
        "first.json",
        "--release-manifest",
        "second.json",
        "--unexpected",
        "--release-manifest",
      ]),
    ).toEqual({
      requirements: { ecommerce: true },
      releaseManifestPath: "first.json",
      errors: [
        "--require-ecommerce may be provided only once",
        "--release-manifest may be provided only once",
        "Unknown option: --unexpected",
        "--release-manifest requires a file path",
      ],
    });
  });
});
