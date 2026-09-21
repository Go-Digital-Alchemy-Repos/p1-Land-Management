import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PublicForm from "../src/pages/public-form";

// Keep the real page, routing effects, host context and form renderer. Only
// presentation chrome and the separately tested verification boundary are stubbed.
vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: any) => children,
}));
vi.mock("@/components/layout/PageHero", () => ({ PageHero: () => null }));
vi.mock("@/components/seo", () => ({ SEO: () => null }));
vi.mock("@/components/ui/button", () => ({
  Button: ({ variant, ...props }: any) => <button {...props} />,
}));
vi.mock("@/components/ui/input", () => ({
  Input: ({ autoPrependHttps, ...props }: any) => <input {...props} />,
}));
vi.mock("@/components/ui/label", () => ({
  Label: (props: any) => <label {...props} />,
}));
vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));
vi.mock("@/components/ui/checkbox", () => ({ Checkbox: () => null }));
vi.mock("@/components/ui/select", () => ({}));
vi.mock("lucide-react", () => ({
  Loader2: () => null,
  Plus: () => null,
  Trash2: () => null,
}));
vi.mock(
  "../../../platform/p1-core/client/src/features/admin/cms/builder/builder-host",
  () => ({
    cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
  }),
);
const verification = vi.hoisted(() => ({
  reset: vi.fn(),
  headers: vi.fn(() => ({})),
}));
vi.mock("@/components/forms/PublicFormVerification", () => ({
  isPublicFormPreview: () => false,
  usePublicFormVerification: () => ({
    ...verification,
    ready: true,
    control: null,
  }),
}));

type Request = {
  url: string;
  options: RequestInit;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
};
let host: HTMLDivElement;
let root: Root;
let route: ReturnType<typeof memoryLocation>;
let requests: Request[];
const fixture = (slug: string, name = `Form ${slug}`) => ({
  id: slug,
  slug,
  name,
  fields: [
    { id: "name", key: "name", label: "Name", type: "text", required: false },
  ],
  settings: { submitButtonText: "Send" },
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const request = (url: string, occurrence = 0) => {
  const found = requests.filter((item) => item.url === url)[occurrence];
  expect(found, `${url} request ${occurrence}`).toBeDefined();
  return found;
};
async function resolve(item: Request, data: unknown, status = 200) {
  await act(async () => {
    item.resolve(json(data, status));
    await import("../../../platform/p1-core/client/src/features/admin/cms/builder/form-presentation");
  });
}
async function navigate(slug: string) {
  await act(async () => route.navigate(`/forms/${slug}`));
}
async function load(slug: string, occurrence = 0) {
  await resolve(request(`/api/forms/${slug}`, occurrence), fixture(slug));
  // Allow the genuine dynamic renderer import to settle on the first mount.
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(host.querySelector("form")).not.toBeNull();
  });
}
async function submit() {
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
function expectActive(slug: string) {
  expect(host.textContent).toContain(`Form ${slug}`);
  expect(host.querySelector("form")).not.toBeNull();
  expect(host.textContent).not.toContain("Thank you.");
  expect(host.textContent).not.toContain("Form submitted");
  expect(host.textContent).not.toContain("Submission failed");
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  verification.reset.mockClear();
  verification.headers.mockClear();
  requests = [];
  // Deliberately ignore aborts: late transport completions must still be safe.
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, options: RequestInit = {}) =>
        new Promise<Response>((resolve, reject) =>
          requests.push({ url, options, resolve, reject }),
        ),
    ),
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  route = memoryLocation({ path: "/forms/a" });
  await act(async () =>
    root.render(
      <Router hook={route.hook}>
        <PublicForm />
      </Router>,
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("A to B ignores a late A GET even when the transport ignores abort", async () => {
  const old = request("/api/forms/a");
  await navigate("b");
  expect(old.options.signal?.aborted).toBe(true);
  await load("b");
  await resolve(old, fixture("a", "Obsolete A"));
  expectActive("b");
  expect(host.textContent).not.toContain("Obsolete A");
});

it.each(["success", "failure"])(
  "A to B ignores an old POST %s and B can submit",
  async (outcome) => {
    await load("a");
    await submit();
    const old = request("/api/forms/a/submit");
    await navigate("b");
    await load("b");
    verification.reset.mockClear();
    await resolve(
      old,
      outcome === "success"
        ? { submissionId: "old", message: "Old A receipt" }
        : {},
      outcome === "success" ? 201 : 500,
    );
    expectActive("b");
    expect(host.textContent).not.toContain("Old A receipt");
    expect(verification.reset).not.toHaveBeenCalled();
    await submit();
    const fresh = request("/api/forms/b/submit");
    expect(new Headers(fresh.options.headers).get("Idempotency-Key")).not.toBe(
      new Headers(old.options.headers).get("Idempotency-Key"),
    );
    await resolve(
      fresh,
      { submissionId: "new-b", message: "New B receipt" },
      201,
    );
    expect(host.textContent).toContain("Thank you.");
    expect(host.textContent).toContain("New B receipt");
  },
);

it.each(["success", "failure"])(
  "A to B to A rejects old %s callbacks and gives the new A a fresh attempt",
  async (outcome) => {
    await load("a");
    await submit();
    const old = request("/api/forms/a/submit");
    await navigate("b");
    await load("b");
    await navigate("a");
    await load("a", 1);
    verification.reset.mockClear();
    await resolve(
      old,
      outcome === "success"
        ? { submissionId: "old", message: "Obsolete receipt" }
        : {},
      outcome === "success" ? 201 : 500,
    );
    expectActive("a");
    expect(host.textContent).not.toContain("Obsolete receipt");
    expect(verification.reset).not.toHaveBeenCalled();
    await submit();
    const fresh = request("/api/forms/a/submit", 1);
    const oldKey = new Headers(old.options.headers).get("Idempotency-Key");
    const freshKey = new Headers(fresh.options.headers).get("Idempotency-Key");
    expect(oldKey).toBeTruthy();
    expect(freshKey).toBeTruthy();
    expect(freshKey).not.toBe(oldKey);
    expect(fresh.options.credentials).toBe("omit");
    expect(fresh.options.body).toBe(JSON.stringify({ name: "" }));
    await resolve(
      fresh,
      { submissionId: "new-a", message: "Fresh A receipt" },
      201,
    );
    expect(host.textContent).toContain("Thank you.");
    expect(host.textContent).toContain("Fresh A receipt");
  },
);

it("A to B to A ignores the first A GET arriving after the fresh A GET", async () => {
  const old = request("/api/forms/a");
  await navigate("b");
  await navigate("a");
  await load("a", 1);
  await resolve(old, fixture("a", "Obsolete A"));
  await resolve(request("/api/forms/b"), fixture("b"));
  expectActive("a");
  expect(host.textContent).not.toContain("Obsolete A");
});

it("current-route retry retains entries and key, then another request gets a new key", async () => {
  await load("a");
  await act(async () => {
    const input = host.querySelector("input")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "Owner");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await submit();
  const first = request("/api/forms/a/submit");
  await resolve(first, {}, 500);
  expect(host.textContent).toContain("Submission failed");
  expect(host.querySelector("input")!.value).toBe("Owner");
  expect(verification.reset).toHaveBeenCalledTimes(1);
  await submit();
  const retry = request("/api/forms/a/submit", 1);
  expect(retry.options.body).toBe(first.options.body);
  expect(new Headers(retry.options.headers).get("Idempotency-Key")).toBe(
    new Headers(first.options.headers).get("Idempotency-Key"),
  );
  await resolve(retry, { submissionId: "accepted" }, 201);
  expect(host.textContent).toContain("Thank you.");
  await act(async () =>
    host.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(host.querySelector("input")!.value).toBe("");
  await submit();
  const another = request("/api/forms/a/submit", 2);
  expect(new Headers(another.options.headers).get("Idempotency-Key")).not.toBe(
    new Headers(first.options.headers).get("Idempotency-Key"),
  );
  await resolve(another, { submissionId: "another" }, 201);
  expect(host.textContent).toContain("Thank you.");
});
