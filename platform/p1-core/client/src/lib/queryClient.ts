import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let message = text;
    try {
      const json = JSON.parse(text);
      if (json.message) message = json.message;
      else if (json.error) message = json.error;
    } catch {
      // Keep the raw response text when the server does not return JSON.
    }
    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: HeadersInit },
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Query freshness tiers:
 *  STATIC     – Reference data that rarely changes (specializations, enums). Never refetches automatically.
 *  SESSION    – User-context data (auth, preferences). Refreshes every 5 min and on window focus.
 *  OPERATIONAL – Admin views that change frequently but don't need real-time polling (provider lists, user lists, events). ~2 min.
 *  LIVE       – Dashboards and queues that benefit from near-real-time updates. ~1 min, often paired with refetchOnWindowFocus.
 *  SEARCH     – Search result pages where repeated refinements should stay responsive. ~30 sec.
 *  PREVIEW    – Builder/preview pages where editor changes should appear almost immediately. ~5 sec.
 *  CONTENT    – Published public content that changes rarely during a visit. ~10 min.
 */
export const STALE_TIMES = {
  STATIC: Infinity,
  SESSION: 5 * 60 * 1000,
  OPERATIONAL: 2 * 60 * 1000,
  LIVE: 60 * 1000,
  SEARCH: 30 * 1000,
  PREVIEW: 5 * 1000,
  CONTENT: 10 * 60 * 1000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: STALE_TIMES.SESSION,
      gcTime: 10 * 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
