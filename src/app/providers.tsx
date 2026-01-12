"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CompareProvider } from "@/context/CompareContext";
import { CompareTray } from "@/components/ui/CompareTray";
import { TopNav } from "@/components/ui/TopNav";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CompareProvider>
        <TopNav />
        {children}
        <CompareTray />
      </CompareProvider>
    </QueryClientProvider>
  );
}
