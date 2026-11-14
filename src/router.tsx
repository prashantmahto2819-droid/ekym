import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageSkeleton } from "@/components/site/Skeletons";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // data rendered on the server is reused on the client instead of being fetched again on mount;
        // lists refresh when a page is revisited after 2 minutes or when a mutation invalidates them
        staleTime: 2 * 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // a grey page outline instead of a frozen screen when a page takes a moment to load
    defaultPendingComponent: PageSkeleton,
    defaultPendingMs: 400,
    defaultPendingMinMs: 300,
  });

  return router;
};
