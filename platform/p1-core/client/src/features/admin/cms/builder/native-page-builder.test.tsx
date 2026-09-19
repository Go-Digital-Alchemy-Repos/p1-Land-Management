// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NativePageBuilder } from "../../../../../../../../artifacts/p1-dashboard/src/marketing/NativePageBuilder";
import { NativeBuilderBlockPreview } from "../../../../../../../../artifacts/p1-dashboard/src/marketing/NativeBuilderBlockPreview";
import { ALL_BLOCKS } from "./block-registry";
vi.mock(
  "../../../../../../../../artifacts/p1-dashboard/node_modules/react",
  async () => await import("react"),
);
vi.mock(
  "../../../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-runtime",
  async () => await import("react/jsx-runtime"),
);
vi.mock(
  "../../../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-dev-runtime",
  async () => await import("react/jsx-dev-runtime"),
);
vi.mock(
  "../../../../../../../../artifacts/p1-dashboard/node_modules/lucide-react",
  async () => await import("lucide-react"),
);
vi.mock(
  "../../../../../../../../artifacts/p1-dashboard/node_modules/react-resizable-panels",
  async () => await import("react-resizable-panels"),
);
vi.mock("../../../../../../../../artifacts/p1-dashboard/src/marketing/CmsRichTextEditor", () => ({
  CmsRichTextEditor: ({ value, onChange }: any) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("../../../../../../../../artifacts/p1-dashboard/src/marketing/MediaLibrary", () => ({
  MediaLibrary: () => null,
}));
const api = vi.hoisted(() => ({
  sections: vi.fn(),
  save: vi.fn(),
  forms: vi.fn(),
  blog: vi.fn(),
  team: vi.fn(),
  events: vi.fn(),
  gallery: vi.fn(),
  careers: vi.fn(),
  branding: vi.fn(),
  social: vi.fn(),
}));
vi.mock("../../../../../../../../lib/api-client-react/src/dashboard/index", () => ({
  listMarketingSections: api.sections,
  createMarketingSection: api.save,
  listMarketingForms: api.forms,
  listMarketingBlog: api.blog,
  listMarketingTeam: api.team,
  listMarketingEvents: api.events,
  getMarketingGallery: api.gallery,
  listMarketingCareerJobs: api.careers,
  getWebsiteIdentity: api.branding,
  getWebsiteSocial: api.social,
}));
let host: HTMLDivElement;
let root: Root;
const catalog = {
  blocks: ALL_BLOCKS,
  aliases: {},
  forms: [],
  pages: [],
  galleries: [],
  team: [],
  previewUrl: null,
};
const base = { catalog: catalog as any, canUseMedia: false, disabled: false, onNotice: vi.fn() };
beforeEach(() => {
  Object.assign(globalThis, {
    React,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  vi.clearAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue([]);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function render(blocks: any[], extra = {}) {
  await act(async () =>
    root.render(<NativePageBuilder {...base} blocks={blocks} onChange={vi.fn()} {...extra} />),
  );
}
it("denies omitted section and dynamic capabilities without issuing requests", async () => {
  await render([{ id: "t", type: "team", props: { memberIds: ["one"] } }]);
  expect(api.sections).not.toHaveBeenCalled();
  expect(api.team).not.toHaveBeenCalled();
  expect(host.textContent).toContain("requires access to its content module");
});
it("uses actual approved dynamic data and removes it immediately after grant revocation", async () => {
  api.team.mockResolvedValue([
    {
      id: "one",
      name: "Actual owner",
      role: "Owner",
      status: "published",
      biography: "<p>Real biography</p>",
      excerpt: "Actual excerpt",
      photoUrl: "",
      photoAlt: "",
    },
  ]);
  const blocks = [{ id: "t", type: "team", props: { memberIds: ["one"], showRole: true } }];
  await render(blocks, { canPreviewData: (kind: string) => kind === "team" });
  expect(api.team).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain("Actual owner");
  await render(blocks, { canPreviewData: () => false });
  expect(host.textContent).not.toContain("Actual owner");
  expect(host.textContent).toContain("requires access");
});
it("retains original canvas, inspector and real select options while preserving unknown content", async () => {
  const unknown = {
    id: "legacy",
    type: "custom-unregistered",
    props: { customText: "Keep this", nested: { token: 7 } },
    futureFlag: "retain",
  };
  const change = vi.fn();
  await render([unknown], { onChange: change });
  expect(host.querySelector('[data-testid="canvas-block-legacy"]')).not.toBeNull();
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-testid="select-canvas-block-legacy"]')!.click(),
  );
  expect(
    Array.from(host.querySelectorAll("input")).some((input) => input.value === "Keep this"),
  ).toBe(true);
  expect(change).not.toHaveBeenCalled();
  expect(unknown.props.nested).toEqual({ token: 7 });
});
it("sanitizes raw HTML rendering without altering source drafts and preserves CTA labels", async () => {
  const source = {
    id: "raw",
    type: "raw-html",
    props: {
      html: '<script>window.bad=1</script><p onclick="bad()">Safe</p><iframe src="https://evil.test"></iframe>',
    },
  };
  await act(async () => root.render(<NativeBuilderBlockPreview block={source} />));
  expect(host.querySelector("script,iframe,[onclick]")).toBeNull();
  expect(host.textContent).toContain("Safe");
  expect(source.props.html).toContain("<script>");
  await act(async () =>
    root.render(
      <NativeBuilderBlockPreview
        block={{
          id: "hero",
          type: "hero",
          props: {
            heading: "P1",
            ctaText: "Request service",
            primaryButtonLink: "/contact",
          },
        }}
      />,
    ),
  );
  expect(host.textContent).toContain("P1");
});
it("sanitizes dynamic form HTML and cannot submit from preview", async () => {
  const form = {
    id: "form",
    slug: "contact",
    name: "Actual contact",
    fields: [
      {
        id: "h",
        key: "h",
        type: "html",
        label: "Markup",
        config: {
          htmlContent: '<p>Safe field</p><img src=x onerror="bad()"><script>bad()</script>',
        },
      },
    ],
    settings: { submitButtonText: "Send actual" },
  };
  await act(async () =>
    root.render(
      <NativeBuilderBlockPreview
        block={{ id: "f", type: "form-embed", props: { formSlug: "contact" } }}
        resource={{ loading: false, data: [form] }}
      />,
    ),
  );
  expect(host.textContent).toContain("Safe field");
  expect(host.querySelector("script,[onerror],form")).toBeNull();
  expect(host.textContent).toContain("submissions are disabled");
  expect(
    Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Send actual",
    )?.disabled,
  ).toBe(true);
  expect(form.fields[0].config.htmlContent).toContain("onerror");
});
it("renders recording metadata without loading media or payment flows", async () => {
  await act(async () =>
    root.render(
      <NativeBuilderBlockPreview
        block={{ id: "r", type: "video-archives", props: {} }}
        resource={{
          loading: false,
          data: [
            {
              id: "recorded",
              title: "Recorded field training",
              date: "2020-01-01",
              status: "published",
              visibility: "public",
              showInArchives: true,
              recordingUrl: "https://secret.test/paid",
              recordingAccess: "paid",
              recordingPrice: 1000,
            },
          ],
        }}
      />,
    ),
  );
  expect(host.textContent).toContain("Recorded field training");
  expect(host.textContent).toContain("Playback and purchases are unavailable");
  expect(host.innerHTML).not.toContain("secret.test");
  expect(host.querySelector("iframe")).toBeNull();
});

it("keeps the inspector mounted through controlled edits and exposes real option choices", async () => {
  const def = ALL_BLOCKS.find((def) => def.type === "rich-text")!;
  function Controlled() {
    const [blocks, setBlocks] = useState<any[]>([
      {
        id: "text",
        type: "rich-text",
        props: { ...def.defaultProps, content: "<p>Original text</p>" },
      },
    ]);
    return <NativePageBuilder {...base} blocks={blocks} onChange={setBlocks} />;
  }
  await act(async () => root.render(<Controlled />));
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-testid="select-canvas-block-text"]')!.click(),
  );
  const editor = Array.from(host.querySelectorAll<HTMLTextAreaElement>("textarea")).find(
    (input) => input.value === "<p>Original text</p>",
  )!;
  expect(editor).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      editor,
      "<p>Updated text</p>",
    );
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(editor.isConnected).toBe(true);
  expect(editor.value).toBe("<p>Updated text</p>");
  const layout = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (button) => button.textContent === "Layout",
  )!;
  await act(async () => layout.click());
  expect(
    Array.from(host.querySelectorAll("select")).some((select) => select.options.length > 1),
  ).toBe(true);
});

it("gates contact company and social reads independently while retaining inert form preview", async () => {
  api.forms.mockResolvedValue([
    { id: "f", slug: "contact-form", name: "Contact", fields: [], settings: {} },
  ]);
  api.branding.mockResolvedValue({
    settings: {
      company_name: "P1 verified company",
      company_address: "Actual address",
      company_phone_numbers: "555-1234",
      company_google_business_url: "javascript:bad()",
    },
  });
  api.social.mockResolvedValue({
    settings: { social_facebook_url: "https://facebook.com/p1", social_icon_style: "brand" },
  });
  const blocks = [{ id: "contact", type: "contact-form", props: {} }];
  await render(blocks, { canPreviewData: (kind: string) => kind === "forms" });
  expect(api.branding).not.toHaveBeenCalled();
  expect(api.social).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Send a Message");
  expect(host.textContent).toContain("requires Branding access");
  await render(blocks, { canPreviewData: () => true });
  expect(host.textContent).toContain("P1 verified company");
  expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(host.querySelector('[data-testid="link-social-facebook"]')).not.toBeNull();
  expect(host.querySelector("form")).toBeNull();
  await render(blocks, { canPreviewData: (kind: string) => kind === "forms", disabled: true });
  expect(host.textContent).not.toContain("P1 verified company");
  expect((host.querySelector("fieldset.native-page-builder") as HTMLElement).inert).toBe(true);
});
