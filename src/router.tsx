import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Mantém dados frescos por 5min, cache por 24h (suporta uso offline)
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 1,
        networkMode: "offlineFirst",
      },
      mutations: { networkMode: "offlineFirst" },
    },
  });

  // Persistência só no browser — evita "window is not defined" no SSR.
  if (typeof window !== "undefined") {
    try {
      const persister = createSyncStoragePersister({ storage: window.localStorage, key: "lvbl-rq-cache" });
      persistQueryClient({
        queryClient,
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        // Persiste apenas queries que o rep precisa offline (agenda, clientes, alertas, metas).
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => {
            const k = String(q.queryKey?.[0] ?? "");
            return /^rep_|^spin-|^visit-priorities$/.test(k);
          },
        },
      });
    } catch {
      // localStorage indisponível (modo privado, etc.) — ignora silenciosamente.
    }
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
