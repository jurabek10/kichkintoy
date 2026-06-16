import { QueryClient } from '@tanstack/react-query';

/**
 * Single QueryClient for the app. Tuned for Uzbekistan's slow/intermittent
 * connections: serve cached data instantly, revalidate in the background, and
 * retry transient failures (but not 4xx) with backoff.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});
