import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetDocBySlug = vi.fn();
const mockCreateDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    docs: {
      getDocBySlug: mockGetDocBySlug,
      createDoc: mockCreateDoc,
      updateDoc: mockUpdateDoc,
    },
  },
}));

vi.mock("../utils/logger", () => ({
  logger: {
    app: {
      info: vi.fn(),
    },
  },
}));

describe("ensureSystemDocs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates generated system index docs from the repository", async () => {
    mockGetDocBySlug.mockResolvedValue(undefined);
    mockCreateDoc.mockImplementation(async (doc) => ({ id: doc.slug, ...doc }));

    const mod = await import("../services/system-docs.service");
    const result = await mod.ensureSystemDocs();
    const createdDocs = mockCreateDoc.mock.calls.map(([doc]) => doc);

    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(createdDocs.map((doc) => doc.slug)).toEqual(
      expect.arrayContaining([
        "system-architecture-map",
        "system-module-index",
        "system-api-route-index",
        "system-storage-schema-index",
        "system-services-jobs-index",
      ]),
    );
    expect(createdDocs.find((doc) => doc.slug === "system-api-route-index")?.content).toContain(
      "server/routes/index.ts",
    );
    expect(
      createdDocs.find((doc) => doc.slug === "system-storage-schema-index")?.content,
    ).toContain("shared/schema/docs.ts");
  });

  it("updates existing generated docs without duplicating their slugs", async () => {
    mockGetDocBySlug.mockImplementation(async (slug: string) => ({ id: `existing-${slug}`, slug }));
    mockUpdateDoc.mockImplementation(async (id, doc) => ({ id, ...doc }));

    const mod = await import("../services/system-docs.service");
    await mod.ensureSystemDocs();

    expect(mockCreateDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc.mock.calls.some(([, doc]) => doc.title === "System Module Index")).toBe(
      true,
    );
    expect(
      mockUpdateDoc.mock.calls.some(([, doc]) => doc.content.includes("client/src/features")),
    ).toBe(true);
  });
});
