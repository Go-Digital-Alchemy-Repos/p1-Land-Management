import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    select: mocks.select,
  },
}));

function mockPublicForm(row: unknown) {
  const limit = vi.fn().mockResolvedValue([row]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mocks.select.mockReturnValueOnce({ from });
}

describe("FormsStorage public forms", () => {
  it("sanitizes HTML fields before returning a public form to any route", async () => {
    mockPublicForm({
      id: "form-1",
      kind: "form",
      fields: [
        {
          id: "intro",
          type: "html",
          config: {
            htmlContent:
              '<p>Welcome <strong>friends</strong></p><iframe src="https://evil.example"></iframe><img src="javascript:alert(1)" onerror="alert(1)">',
          },
        },
      ],
      settings: {},
    });
    const { FormsStorage } = await import("./forms.storage");

    const form = await new FormsStorage().getPublicById("form-1");

    expect(form?.fields).toMatchObject([
      {
        config: {
          htmlContent: "<p>Welcome <strong>friends</strong></p><img />",
        },
      },
    ]);
  });

  it("preserves safe rich text for public form rendering", async () => {
    mockPublicForm({
      id: "form-2",
      kind: "form",
      fields: [
        {
          id: "intro",
          type: "html",
          config: {
            htmlContent: '<p>Read <a href="https://example.test">the guide</a>.</p>',
          },
        },
      ],
      settings: {},
    });
    const { FormsStorage } = await import("./forms.storage");

    const form = await new FormsStorage().getPublicById("form-2");

    expect(form?.fields).toMatchObject([
      {
        config: {
          htmlContent: '<p>Read <a href="https://example.test">the guide</a>.</p>',
        },
      },
    ]);
  });
});
