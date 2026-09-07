// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamSection } from "./team-section";
import { teamMemberInputSchema } from "@shared/team";
const query = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false, isError: false }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => query }));
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { React?: typeof React }).React = React;
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  query.data = [
    {
      id: "a",
      ...teamMemberInputSchema.parse({
        name: "Alex",
        role: "Director",
        status: "published",
        biography: "<p>Full biography for <strong>Alex</strong></p>",
        excerpt: "Alex excerpt",
      }),
    },
    {
      id: "b",
      ...teamMemberInputSchema.parse({
        name: "Blair",
        status: "published",
        biography: "Blair biography",
      }),
    },
    { id: "draft", ...teamMemberInputSchema.parse({ name: "Private draft" }) },
  ];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
describe("Team section", () => {
  it.each(["portraits", "cards", "horizontal"])(
    "renders %s with selected order and no drafts",
    (layout) => {
      act(() =>
        root.render(
          <TeamSection props={{ layout, memberIds: ["b", "draft", "a"], title: "Our team" }} />,
        ),
      );
      expect(Array.from(container.querySelectorAll("h3")).map((el) => el.textContent)).toEqual([
        "Blair",
        "Alex",
      ]);
      expect(container.textContent).toContain("Alex excerpt");
      expect(container.textContent).not.toContain("Private draft");
    },
  );
  it("hides empty selections and honors excerpt/role toggles", () => {
    act(() => root.render(<TeamSection props={{ memberIds: [] }} />));
    expect(container.textContent).toBe("");
    act(() =>
      root.render(
        <TeamSection props={{ memberIds: ["a"], showExcerpt: false, showRole: false }} />,
      ),
    );
    expect(container.textContent).not.toContain("Director");
    expect(container.textContent).not.toContain("Alex excerpt");
  });
  it("opens full biography from the card and closes it", () => {
    act(() => root.render(<TeamSection props={{ memberIds: ["a"] }} />));
    act(() =>
      (container.querySelector('[aria-label="Read more about Alex"]') as HTMLButtonElement).click(),
    );
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Full biography for Alex");
    expect(dialog.querySelector("strong")?.textContent).toBe("Alex");
    act(() =>
      (
        Array.from(dialog.querySelectorAll("button")).find(
          (button) => button.textContent === "Close",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
