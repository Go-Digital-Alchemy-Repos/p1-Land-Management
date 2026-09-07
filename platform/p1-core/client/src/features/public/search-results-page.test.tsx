// @vitest-environment jsdom

import React, { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchResultsPage from "@/features/public/search-results-page";

const navigate = vi.fn();
const useSearchMock = vi.fn();

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
  useLocation: () => ["/search", navigate],
  useSearch: () => useSearchMock(),
}));

vi.mock("@/components/layout/page-layout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "page-layout" }, children),
}));

describe("SearchResultsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let queryClient: QueryClient;

  beforeEach(() => {
    navigate.mockReset();
    useSearchMock.mockReset();
    useSearchMock.mockReturnValue("query=application%20process");
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    (
      globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).React = React;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            type: "page",
            id: "join",
            title: "Join the Network",
            url: "/join",
            excerpt: "The Application Process includes Submit Your Application.",
            metadata: "Page",
          },
        ],
      }),
    );
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    queryClient.clear();
    vi.unstubAllGlobals();
    container.remove();
    document.body.innerHTML = "";
  });

  it("reads the query string and fetches site search results", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(SearchResultsPage),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fetch).toHaveBeenCalledWith("/api/search?q=application%20process");
    expect(container.textContent).toContain('1 result for "application process"');
    expect(container.textContent).toContain("Join the Network");
  });
});
