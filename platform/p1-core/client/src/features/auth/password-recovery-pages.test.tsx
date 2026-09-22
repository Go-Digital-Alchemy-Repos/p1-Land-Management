// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock("@/lib/queryClient", () => ({ apiRequest }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: { mutationFn: () => Promise<unknown>; onSuccess?: () => void }) => ({
    isPending: false,
    mutate: () => void options.mutationFn().then(() => options.onSuccess?.()),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("wouter", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a {...props}>{children}</a>
  ),
  useLocation: () => ["/admin/reset-password", vi.fn()],
  useSearch: () => "?token=core-reset-token",
}));
vi.mock("@/components/layout/page-layout", () => ({
  PageLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardDescription: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: React.PropsWithChildren<React.LabelHTMLAttributes<HTMLLabelElement>>) => (
    <label {...props}>{children}</label>
  ),
}));

import ForgotPasswordPage from "./forgot-password-page";
import ResetPasswordPage from "./reset-password-page";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  apiRequest.mockReset().mockResolvedValue({});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function change(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("submits forgotten-password requests to the mounted Core auth route", async () => {
  await act(async () => root.render(<ForgotPasswordPage />));
  await act(async () =>
    change(container.querySelector<HTMLInputElement>("#email")!, "owner@example.com"),
  );
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(apiRequest).toHaveBeenCalledWith("POST", "/api/auth/forgot-password", {
    email: "owner@example.com",
  });
});

it("submits the Core reset token to the mounted Core auth route", async () => {
  await act(async () => root.render(<ResetPasswordPage />));
  await act(async () => {
    change(container.querySelector<HTMLInputElement>("#password")!, "validpassword123");
    change(container.querySelector<HTMLInputElement>("#confirmPassword")!, "validpassword123");
  });
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(apiRequest).toHaveBeenCalledWith("POST", "/api/auth/reset-password", {
    token: "core-reset-token",
    password: "validpassword123",
  });
});
