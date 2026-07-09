import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: 0 means data is always considered stale.
      // This ensures refetches happen on window focus and after
      // invalidateQueries calls take effect immediately.
      staleTime: 0,
      // gcTime: how long inactive query data stays in memory (5 min)
      gcTime: 5 * 60 * 1000,
      retry: 1,
      // Refetch when the user comes back to the tab
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
