// @vitest-environment jsdom
import React, { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { FormPresentation } from "./form-presentation";
import { FormPresentationHostProvider } from "./form-presentation-host";

let host: HTMLDivElement;
let root: Root;
let toast: ReturnType<typeof vi.fn>;
const submit = vi.fn(async () => ({ message: "Received" }));

const ui = {
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  Input: ({
    autoPrependHttps: _autoPrependHttps,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & { autoPrependHttps?: boolean }) => (
    <input {...props} />
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  Label: (props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />,
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      {...props}
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
    />
  ),
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  SelectValue: () => null,
  SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
};

function field(id: string, type: string, required = true) {
  return { id, key: id, label: id, type, required };
}

async function mount(fields: any[]) {
  await act(async () =>
    root.render(
      <FormPresentationHostProvider value={{ ui, toast }}>
        <FormPresentation
          slug="required-fields"
          form={
            {
              id: "required-fields",
              slug: "required-fields",
              name: "Required fields",
              fields,
              settings: {},
            } as any
          }
          submit={submit}
        />
      </FormPresentationHostProvider>,
    ),
  );
}

async function submitForm() {
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

async function fill(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  toast = vi.fn();
  submit.mockClear();
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("blocks a single-page required text and checkbox form without sending a request", async () => {
  await mount([
    field("name", "text"),
    { ...field("services", "checkbox"), options: [{ label: "Mowing", value: "mowing" }] },
  ]);

  await submitForm();
  expect(submit).not.toHaveBeenCalled();
  expect(toast).toHaveBeenLastCalledWith(
    expect.objectContaining({
      title: "Complete required fields",
      description: "name is required",
    }),
  );

  await fill(host.querySelector('input[type="text"]')!, "Owner");
  await act(async () => host.querySelector('input[type="checkbox"]')!.click());
  await submitForm();
  expect(submit).toHaveBeenCalledWith({ name: "Owner", services: ["mowing"] }, expect.any(String));
});

it("checks every required page before a final submission and submits when valid", async () => {
  await mount([
    field("contact", "text"),
    { ...field("details-page", "page", false), config: { pageTitle: "Details" } },
    field("details", "textarea"),
  ]);

  await submitForm();
  expect(submit).not.toHaveBeenCalled();
  expect(toast).toHaveBeenLastCalledWith(
    expect.objectContaining({ description: "contact is required" }),
  );

  await fill(host.querySelector('input[type="text"]')!, "Owner");
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Next")!
      .click(),
  );
  await submitForm();
  expect(submit).not.toHaveBeenCalled();
  expect(toast).toHaveBeenLastCalledWith(
    expect.objectContaining({ description: "details is required" }),
  );

  const textarea = host.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      textarea,
      "Drainage work",
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await submitForm();
  expect(submit).toHaveBeenCalledWith(
    { contact: "Owner", "details-page": "", details: "Drainage work" },
    expect.any(String),
  );
});
