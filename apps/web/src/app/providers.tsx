import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Estratégia de cache do TanStack Query orientada a operações de marmoraria
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache para tabelas de preços e materiais
      retry: (failureCount, error) => {
        // Não tentar novamente se for erro de permissão (403), não encontrado (404) ou conflito (409)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status === 401 || status === 403 || status === 404 || status === 409) {
            return false;
          }
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Evita perda de foco no canvas CAD durante medições
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
