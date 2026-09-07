import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../utils/logger", () => ({
  logger: {
    email: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    app: { warn: vi.fn() },
  },
}));

vi.mock("../utils/metrics", () => ({
  recordEmailOutcome: vi.fn(),
}));

const mockGetDecryptedCategory = vi.fn();
const mockGetTemplate = vi.fn();
vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getDecryptedCategory: mockGetDecryptedCategory,
    },
    emailTemplates: {
      getTemplate: mockGetTemplate,
    },
  },
}));

const mockCreate = vi.fn();
const mockDomainsGet = vi.fn();
const mockClient = vi.fn(() => ({
  messages: { create: mockCreate },
  domains: { get: mockDomainsGet },
}));
vi.mock("mailgun.js", () => ({
  default: vi.fn(() => ({
    client: mockClient,
  })),
}));

vi.mock("form-data", () => ({
  default: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({}),
    })),
  },
}));

describe("Email service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../services/email.service");
    mod.resetMailgunConfig();
  });

  it("sends via Mailgun when configured", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      mailgun_api_key: "key-123",
      mailgun_domain: "mg.example.com",
      mailgun_from_address: "noreply@example.com",
    });
    mockCreate.mockResolvedValue({});

    const mod = await import("../services/email.service");
    const result = await mod.sendEmail("user@test.com", "Test", "<p>Hello</p>");
    expect(result).toBe(true);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockClient).toHaveBeenCalledWith(expect.objectContaining({ timeout: 30_000 }));
  });

  it("caches Mailgun config after first fetch", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      mailgun_api_key: "key-123",
      mailgun_domain: "mg.example.com",
    });
    mockCreate.mockResolvedValue({});

    const mod = await import("../services/email.service");
    await mod.sendEmail("a@b.com", "S1", "<p>1</p>");
    await mod.sendEmail("c@d.com", "S2", "<p>2</p>");

    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(1);
  });

  it("re-fetches config after resetMailgunConfig", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      mailgun_api_key: "key-123",
      mailgun_domain: "mg.example.com",
    });
    mockCreate.mockResolvedValue({});

    const mod = await import("../services/email.service");
    await mod.sendEmail("a@b.com", "S1", "<p>1</p>");
    mod.resetMailgunConfig();
    await mod.sendEmail("c@d.com", "S2", "<p>2</p>");

    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(2);
  });

  it("returns false when no email provider is configured", async () => {
    mockGetDecryptedCategory.mockResolvedValue({});

    const mod = await import("../services/email.service");
    const result = await mod.sendEmail("user@test.com", "Test", "<p>Hello</p>");
    expect(result).toBe(false);
  });

  it("falls back gracefully when Mailgun send fails", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      mailgun_api_key: "key-123",
      mailgun_domain: "mg.example.com",
    });
    mockCreate.mockRejectedValue(new Error("Network error"));

    const mod = await import("../services/email.service");
    const result = await mod.sendEmail("user@test.com", "Test", "<p>Hello</p>");
    expect(result).toBe(false);
  });
  it("awaits managed form transport completion and reports failed delivery", async () => {
    mockGetTemplate.mockResolvedValue({
      subject: "Form",
      htmlBody: "<p>Hello</p>",
      isActive: true,
    });
    mockGetDecryptedCategory.mockResolvedValue({
      mailgun_api_key: "key-123",
      mailgun_domain: "mg.example.com",
    });
    let release!: () => void;
    mockCreate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const mod = await import("../services/email.service");
    const input = {
      recipient: "admin@example.com",
      formName: "Lead",
      summary: "Hello",
      dashboardUrl: "https://example.com/admin",
      contact: null,
    };
    const sending = mod.deliverManagedFormNotification(input);
    let completed = false;
    void sending.then(() => {
      completed = true;
    });
    await vi.waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(completed).toBe(false);
    release();
    await expect(sending).resolves.toBe("completed");
    mockCreate.mockRejectedValue(new Error("transport failed"));
    await expect(mod.deliverManagedFormNotification(input)).rejects.toThrow(
      "managed_form_notification_transport_unavailable",
    );
  });

  it("reports inactive form notification templates as explicit skips", async () => {
    mockGetTemplate.mockResolvedValue({ subject: "Form", htmlBody: "Hello", isActive: false });
    const mod = await import("../services/email.service");
    await expect(
      mod.deliverManagedFormNotification({
        recipient: "admin@example.com",
        formName: "Lead",
        summary: "Hello",
        dashboardUrl: "https://example.com/admin",
        contact: { name: "Lin", email: "lin@example.com", message: "Hi" },
      }),
    ).resolves.toBe("skipped");
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "escapes missing-template form HTML and keeps plain subjects (contact=%s)",
    async (isContact) => {
      mockGetTemplate.mockResolvedValue(undefined);
      mockGetDecryptedCategory.mockResolvedValue({
        mailgun_api_key: "key-123",
        mailgun_domain: "mg.example.com",
      });
      mockCreate.mockResolvedValue({});
      const hostile = 'A & <img src=x onerror="boom"> \' $& {{dashboardUrl}}';
      const mod = await import("../services/email.service");
      await mod.deliverManagedFormNotification({
        recipient: "admin@example.com",
        formName: hostile,
        summary: hostile,
        dashboardUrl: "https://example.com/admin",
        contact: isContact ? { name: hostile, email: hostile, message: hostile } : null,
      });
      const sent = mockCreate.mock.calls[0][1];
      expect(sent.subject).toBe(
        `${isContact ? "New Contact Form" : "New Form Submission"}: ${hostile}`,
      );
      expect(sent.html).toContain(
        "A &amp; &lt;img src=x onerror=&quot;boom&quot;&gt; &#39; $&amp; {{dashboardUrl}}",
      );
      expect(sent.html).not.toContain("<img src=x");
      expect(sent.html).not.toContain("&amp;lt;");
    },
  );

  it.each([false, true])(
    "escapes stored-template variables exactly once without expanding submitted tokens (contact=%s)",
    async (isContact) => {
      const nameVariable = isContact ? "senderName" : "formName";
      const bodyVariable = isContact ? "messageBody" : "submissionSummary";
      mockGetTemplate.mockResolvedValue({
        subject: `Received: {{${nameVariable}}}`,
        htmlBody: `<p>{{${nameVariable}}}</p>{{#${bodyVariable}}}<div>{{${bodyVariable}}}</div>{{/${bodyVariable}}}<a href="{{dashboardUrl}}">Open</a>`,
        isActive: true,
      });
      mockGetDecryptedCategory.mockResolvedValue({
        mailgun_api_key: "key-123",
        mailgun_domain: "mg.example.com",
      });
      mockCreate.mockResolvedValue({});
      const hostile = '<img src=x onerror="boom"> & $& {{dashboardUrl}}';
      const mod = await import("../services/email.service");
      await mod.deliverManagedFormNotification({
        recipient: "admin@example.com",
        formName: hostile,
        summary: hostile,
        dashboardUrl: 'https://example.com/admin?a=1&b="value"',
        contact: isContact
          ? { name: hostile, email: "sender@example.com", message: hostile }
          : null,
      });
      const sent = mockCreate.mock.calls[0][1];
      expect(sent.subject).toBe(`Received: ${hostile}`);
      expect(sent.html).toContain(
        "<div>&lt;img src=x onerror=&quot;boom&quot;&gt; &amp; $&amp; {{dashboardUrl}}</div>",
      );
      expect(sent.html).toContain('href="https://example.com/admin?a=1&amp;b=&quot;value&quot;"');
      expect(sent.html).not.toContain("<img src=x");
      expect(sent.html).not.toContain("&amp;lt;");
      expect(sent.html).not.toContain(`{{#${bodyVariable}}}`);
    },
  );
  it("configures SMTP phase and inactivity timeouts below the worker lease", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_USER", "synthetic");
    vi.stubEnv("SMTP_PASS", "synthetic");
    try {
      vi.resetModules();
      await import("../services/email.service");
      const { default: nodemailer } = await import("nodemailer");
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          dnsTimeout: 10_000,
          connectionTimeout: 15_000,
          greetingTimeout: 15_000,
          socketTimeout: 30_000,
        }),
      );
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
