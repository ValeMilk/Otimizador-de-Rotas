'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { PromotersConfiguration } from '@/components/PromotersConfiguration';
import { WorkScheduleConfig } from '@/components/WorkScheduleConfig';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import { Client, WorkSchedule, Promoter } from '@/types';
import { Zap, MapPin } from 'lucide-react';

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>({
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 8,
    saturday: 4,
  });

  const { result, isLoading, error, optimize } = useRouteOptimization();

  const handleFilesLoaded = (newClients: Client[]) => {
    setClients(newClients);
  };

  const handleScheduleChange = (newSchedule: WorkSchedule) => {
    setWorkSchedule(newSchedule);
  };

  const handleOptimize = async () => {
    if (clients.length === 0) {
      alert('Por favor, faça upload de uma planilha com clientes antes de otimizar');
      return;
    }

    await optimize(clients, workSchedule, promoters);
  };

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Otimizador de Rotas</h1>
              <p className="text-gray-600">Roteirização inteligente para promotores de vendas</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Upload Section */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Importar Dados de Clientes</h2>
            <p className="text-gray-600 text-sm mb-4">
              Prepare uma planilha em formato CSV ou Excel com seus dados de clientes e faça o upload abaixo.
              Você pode baixar um modelo pronto para preenchimento.
            </p>
            <FileUpload onFilesLoaded={handleFilesLoaded} />

            {clients.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ {clients.length} cliente(s) carregado(s) com sucesso
                </p>
              </div>
            )}
          </section>

          {/* Schedule Configuration */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Configurar Jornada de Trabalho</h2>
            <WorkScheduleConfig onScheduleChange={handleScheduleChange} isLoading={isLoading} />
          </section>

          {/* Optimization Button */}
          <section className="bg-white rounded-lg shadow p-6">
            <button
              onClick={handleOptimize}
              disabled={isLoading || clients.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              <Zap className="w-5 h-5" />
              {isLoading ? 'Otimizando...' : 'Gerar Roteirização Otimizada'}
            </button>
          </section>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-900 font-semibold">Erro na otimização</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && <LoadingSpinner message="Otimizando rotas. Isso pode levar alguns segundos..." />}

          {/* Results Section */}
          {result && !isLoading && (
            <>
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">3. Configurar Promotores</h2>
                {(() => {
                  // Conta rotas ÚNICAS (não daily routes)
                  const uniqueRouteNumbers = Array.from(new Set(result.routes?.map(r => r.routeNumber) || []));
                  return (
                    <p className="text-gray-600 text-sm mb-4">
                      Foram criadas <strong>{uniqueRouteNumbers.length}</strong> rota(s) na otimização. 
                      Configure um promotor para cada rota abaixo. Os promotores serão atribuídos automaticamente com base na proximidade de suas residências aos clientes.
                    </p>
                  );
                })()}
                <PromotersConfiguration promoters={promoters} onPromotersChange={setPromoters} />
                
                {/* Botão de Atualizar Atribuições */}
                {promoters.length > 0 && (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => optimize(clients, workSchedule, promoters)}
                      disabled={isLoading || promoters.length === 0}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                    >
                      <MapPin className="w-5 h-5" />
                      {isLoading ? 'Atualizando...' : 'Atualizar Atribuições de Promotores'}
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Results Section */}
          {result && !isLoading && (
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">4. Resultados da Otimização</h2>
              <ResultsDashboard result={result} />
            </section>
          )}

          {/* Empty State */}
          {!result && !isLoading && clients.length > 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 text-lg">
                Clique em "Gerar Roteirização Otimizada" para ver os resultados
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>© 2024 Otimizador de Rotas. Todos os direitos reservados.</p>
          <p className="text-sm mt-2">
            Desenvolvido com <span className="text-red-400">♥</span> para otimizar vendas
          </p>
        </div>
      </footer>
    </main>
  );
}
