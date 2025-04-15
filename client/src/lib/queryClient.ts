import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add cache-busting timestamp to prevent browser caching
    const url = queryKey[0] as string;
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = new Date().getTime();
    const cacheBustingUrl = `${url}${separator}_=${timestamp}`;
    
    // Fetch with explicit cache prevention headers
    const res = await fetch(cacheBustingUrl, {
      credentials: "include",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,       // Always refetch when window is focused
      refetchOnReconnect: true,         // Refetch when reconnecting
      refetchOnMount: true,             // Always refetch when mounting components
      staleTime: 0,                     // Consider data stale immediately (always refetch)
      gcTime: 1000 * 60,                // Cache for 1 minute maximum (previously called cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
