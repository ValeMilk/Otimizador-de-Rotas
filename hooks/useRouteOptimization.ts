'use client';

import { useState, useCallback } from 'react';
import { Client, WorkSchedule, OptimizationResult, Promoter } from '@/types';
import { gerarRotasDinamicamente } from '@/utils/dynamicRouteGenerator';

interface UseRouteOptimizationReturn {
  result: OptimizationResult | null;
  isLoading: boolean;
  error: string | null;
  optimize: (clients: Client[], workSchedule: WorkSchedule, promoters: Promoter[]) => Promise<void>;
}

export const useRouteOptimization = (): UseRouteOptimizationReturn => {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(async (clients: Client[], workSchedule: WorkSchedule, promoters: Promoter[]) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[Hook] Iniciando criação dinâmica de rotas...');
      console.log(`[Hook] Clientes: ${clients.length}`);
      console.log(`[Hook] Promoters: ${promoters.length}`);
      
      const optimizationResult = await gerarRotasDinamicamente(clients, workSchedule, promoters);
      
      console.log('[Hook] Rotas geradas com sucesso!');
      console.log('[Hook] Rotas:', optimizationResult.routes.length);
      console.log('[Hook] Clientes alocados:', optimizationResult.summary.totalClientsAssigned);
      
      setResult(optimizationResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro durante a otimização';
      setError(message);
      console.error('Optimization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { result, isLoading, error, optimize };
};
