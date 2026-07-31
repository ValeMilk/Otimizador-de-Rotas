'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { OptimizationResult } from '@/types';
import { getDayName, formatMinutesForDisplay } from '@/utils/timeUtils';
import { MapDisplay } from './MapDisplay';
import { MapAllRoutes } from './MapAllRoutes';
import { AlertCircle, Download, MapPin, Filter } from 'lucide-react';
import { exportRoutesToExcelNew } from '@/utils/exportRoutesExcelNew';

// Importa dinamicamente o MapLeafletRoutes sem SSR para evitar erros de window
const MapLeafletRoutes = dynamic(
  () => import('./MapLeafletRoutes').then(mod => ({ default: mod.MapLeafletRoutes })),
  { ssr: false, loading: () => <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">Carregando mapa...</div> }
);

interface ResultsDashboardProps {
  result: OptimizationResult;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result }) => {
  const [selectedRoutes, setSelectedRoutes] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPromoters, setSelectedPromoters] = useState<string[]>([]);
  
  // Ordem dos dias da semana em português
  const dayOrder: { [key: string]: number } = {
    'Segunda-feira': 0,
    'Terça-feira': 1,
    'Quarta-feira': 2,
    'Quinta-feira': 3,
    'Sexta-feira': 4,
    'Sábado': 5,
  };
  
  // Extrai dias únicos em ordem
  const uniqueDays = Array.from(new Set(result.routes?.map(r => r.day) || []))
    .sort((a, b) => (dayOrder[a as string] ?? 999) - (dayOrder[b as string] ?? 999));
  
  // Extrai rotas únicas
  const uniqueRoutes = Array.from(new Set(result.routes?.map(r => r.routeNumber || 1) || [])).sort((a, b) => a - b);

  // Extrai promotores únicos com suas rotas atribuídas
  const uniquePromoters = Array.from(new Set(
    Object.entries(result.routeAssignments || {})
      .map(([_, promoterId]) => promoterId)
  )).map(promoterId => {
    const promoter = result.promoters?.find(p => p.id === promoterId);
    const assignedRoutes = Object.entries(result.routeAssignments || {})
      .filter(([_, pId]) => pId === promoterId)
      .map(([routeNum, _]) => parseInt(routeNum));
    return {
      id: promoterId,
      name: promoter?.name || 'Desconhecido',
      routes: assignedRoutes,
    };
  });

  const handleExport = () => {
    exportRoutesToExcelNew(result);
  };
  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total de Promotores</p>
          <p className="text-3xl font-bold text-gray-900">{result.summary.totalPromotores || result.rotas?.length || 0}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total de Clientes Atribuídos</p>
          <p className="text-3xl font-bold text-gray-900">{result.summary.totalClientsAssigned}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Utilização Média</p>
          <p className="text-3xl font-bold text-gray-900">{result.summary.averageUtilization}%</p>
        </div>
      </div>

      {/* Atribuição de Promotores às Rotas */}
      {result.routeAssignments && Object.keys(result.routeAssignments).length > 0 && result.promoters && result.promoters.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Atribuição de Promotores às Rotas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueRoutes.map((routeNumber) => {
              const promoterId = result.routeAssignments![routeNumber];
              const promoter = result.promoters?.find(p => p.id === promoterId);
              const routeClients = result.routes?.filter(r => r.routeNumber === routeNumber) || [];
              const totalClients = routeClients.length;

              return (
                <div key={routeNumber} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Rota #{routeNumber}</p>
                      <p className="text-xs text-gray-500">{totalClients} cliente(s)</p>
                    </div>
                    <div className="text-2xl">🏍️</div>
                  </div>
                  
                  {promoter ? (
                    <div className="space-y-2">
                      <div className="border-t border-gray-200 pt-3">
                        <p className="text-sm font-semibold text-gray-900">{promoter.name}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{promoter.address}</p>
                        <p className="text-xs text-blue-600 mt-2">📍 {promoter.latitude.toFixed(4)}, {promoter.longitude.toFixed(4)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm text-gray-500 italic">Promotor não atribuído</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Avisos */}
      {result.summary.warnings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-3">Relatório da Otimização</h3>
              <ul className="space-y-2">
                {result.summary.warnings.map((warning, idx) => {
                  // Identifica se é um aviso de ociosidade
                  const isIdleWarning = warning.includes('⚠️');
                  return (
                    <li 
                      key={idx} 
                      className={`text-sm ${isIdleWarning ? 'text-yellow-800 bg-yellow-50 px-2 py-1 rounded' : 'text-blue-800'}`}
                    >
                      {warning}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Botão Exportar */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
          Exportar Rotas (.xlsx)
        </button>
      </div>

      {/* Mapa Geral das Rotas - Leaflet com Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Visualização de Rotas no Mapa</h3>
          </div>
          
          {/* Filtros */}
          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Filter className="w-4 h-4" />
              Filtros de Rotas (Selecione múltiplas):
            </div>
            
            {/* Filtro de Rotas - Checkboxes para múltipla seleção */}
            <div className="flex flex-wrap gap-3">
              {uniqueRoutes.map((route) => (
                <label key={route} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-blue-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedRoutes.includes(route)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Quando marca uma rota, limpa filtro de promoters
                        setSelectedPromoters([]);
                        setSelectedRoutes([...selectedRoutes, route]);
                      } else {
                        setSelectedRoutes(selectedRoutes.filter(r => r !== route));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-medium">Rota {route}</span>
                </label>
              ))}
            </div>

            {/* Separador */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                🏍️ Filtros de Promotores (Selecione múltiplos):
              </div>
              
              {/* Filtro de Promotores - Checkboxes para múltipla seleção */}
              {uniquePromoters.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {uniquePromoters.map((promoter) => (
                    <label key={promoter.id} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-green-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedPromoters.includes(promoter.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Quando marca um promoter, limpa filtro de rotas
                            setSelectedRoutes([]);
                            setSelectedPromoters([...selectedPromoters, promoter.id]);
                          } else {
                            setSelectedPromoters(selectedPromoters.filter(p => p !== promoter.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 font-medium">{promoter.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro de Dia */}
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">📅 Filtro de Dia:</div>
              <select
                value={selectedDay ?? ''}
                onChange={(e) => setSelectedDay(e.target.value === '' ? null : e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Dias ({uniqueDays.length})</option>
                {uniqueDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Limpar Filtros */}
            {(selectedRoutes.length > 0 || selectedDay !== null || selectedPromoters.length > 0) && (
              <button
                onClick={() => {
                  setSelectedRoutes([]);
                  setSelectedDay(null);
                  setSelectedPromoters([]);
                }}
                className="mt-4 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ✕ Limpar Todos os Filtros
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <MapLeafletRoutes result={result} selectedRoutes={selectedRoutes} selectedDay={selectedDay} selectedPromoters={selectedPromoters} />
        </div>
      </div>

      {/* Resumo de Carga Horária por Promotor */}
      {result.routeAssignments && Object.keys(result.routeAssignments).length > 0 && result.promoters && result.promoters.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              📊 Carga Horária por Promotor
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Promotor</th>
                  {uniqueDays.filter((d) => d !== undefined).map((day) => (
                    <th key={day} className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      {day}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 bg-blue-50">
                    Total Semanal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {uniquePromoters.map((promoter) => {
                  // Calcula carga horária por dia para este promotor (serviço vs deslocamento)
                  const tempoServiçoPorDia: { [key: string]: number } = {};
                  const tempoDeslocamentoPorDia: { [key: string]: number } = {};
                  let totalServiçoSemanal = 0;
                  let totalDeslocamentoSemanal = 0;

                  promoter.routes.forEach((routeNum) => {
                    const routesForThisRoute = result.routes?.filter(
                      (r) => r.routeNumber === routeNum
                    ) || [];

                    routesForThisRoute.forEach((route) => {
                      const day = route.day || 'Desconhecido';
                      const tempoServiço = route.totalVisitTimeMinutes || 0;
                      const tempoDeslocamento = route.totalTravelTimeMinutes || 0;

                      tempoServiçoPorDia[day] = (tempoServiçoPorDia[day] || 0) + tempoServiço;
                      tempoDeslocamentoPorDia[day] = (tempoDeslocamentoPorDia[day] || 0) + tempoDeslocamento;
                      
                      totalServiçoSemanal += tempoServiço;
                      totalDeslocamentoSemanal += tempoDeslocamento;
                    });
                  });

                  return (
                    <tr key={promoter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        🏍️ {promoter.name}
                      </td>
                      {uniqueDays.filter((d) => d !== undefined).map((day) => {
                        const minutosServiço = day ? (tempoServiçoPorDia[day] || 0) : 0;
                        const minutosDeslocamento = day ? (tempoDeslocamentoPorDia[day] || 0) : 0;
                        
                        const horasServiço = Math.floor(minutosServiço / 60);
                        const minsServiço = minutosServiço % 60;
                        const horasDeslocamento = Math.floor(minutosDeslocamento / 60);
                        const minsDeslocamento = minutosDeslocamento % 60;
                        
                        return (
                          <td
                            key={day}
                            className="px-6 py-4 text-center text-sm text-gray-700 font-medium"
                            title={`Serviço: ${horasServiço}h ${minsServiço}m | Deslocamento: ${horasDeslocamento}h ${minsDeslocamento}m`}
                          >
                            {minutosServiço > 0 ? (
                              <>
                                <span className="text-gray-900 font-semibold">{horasServiço}h {minsServiço}m</span>
                                <span className="text-gray-500 text-xs"> ({horasDeslocamento}h {minsDeslocamento}m)</span>
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center text-sm font-bold text-blue-600 bg-blue-50">
                        <span>{Math.floor(totalServiçoSemanal / 60)}h {totalServiçoSemanal % 60}m</span>
                        <div className="text-xs text-gray-500">({Math.floor(totalDeslocamentoSemanal / 60)}h {totalDeslocamentoSemanal % 60}m)</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda e informações */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              💡 <strong>Dica:</strong> Este resumo mostra o tempo total de trabalho (deslocamento + visitação) 
              para cada promotor em cada dia da semana.
            </p>
          </div>
        </div>
      )}

      {/* Resumo de Quilometragem por Promotor */}
      {result.routeAssignments && Object.keys(result.routeAssignments).length > 0 && result.promoters && result.promoters.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🛣️ Quilometragem por Promotor
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Promotor</th>
                  {uniqueDays.filter((d) => d !== undefined).map((day) => (
                    <th key={day} className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      {day}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 bg-orange-50">
                    Total Semanal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {uniquePromoters.map((promoter) => {
                  // Calcula quilometragem por dia para este promotor
                  const quilometragemPorDia: { [key: string]: number } = {};
                  let quilometragemSemanal = 0;

                  promoter.routes.forEach((routeNum) => {
                    const routesForThisRoute = result.routes?.filter(
                      (r) => r.routeNumber === routeNum
                    ) || [];

                    routesForThisRoute.forEach((route) => {
                      const day = route.day || 'Desconhecido';
                      const quilometragem = route.totalTravelDistanceKm || 0;

                      quilometragemPorDia[day] = (quilometragemPorDia[day] || 0) + quilometragem;
                      quilometragemSemanal += quilometragem;
                    });
                  });

                  return (
                    <tr key={`km-${promoter.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        🏍️ {promoter.name}
                      </td>
                      {uniqueDays.filter((d) => d !== undefined).map((day) => {
                        const km = day ? (quilometragemPorDia[day] || 0) : 0;
                        
                        return (
                          <td
                            key={day}
                            className="px-6 py-4 text-center text-sm text-gray-700 font-medium"
                          >
                            {km > 0 ? (
                              <span className="text-gray-900 font-semibold">{km.toFixed(1)} km</span>
                            ) : (
                              '-'
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center text-sm font-bold text-orange-600 bg-orange-50">
                        <span>{quilometragemSemanal.toFixed(1)} km</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda e informações */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              💡 <strong>Dica:</strong> Este resumo mostra a quilometragem total de deslocamento 
              para cada promotor em cada dia da semana (ida + volta + deslocamentos entre clientes).
            </p>
          </div>
        </div>
      )}

      {/* Seção de Rotas Detalhadas - Comentada (Use os filtros no mapa acima) */}
      {false && result.routes.length > 0 ? (
        <div className="space-y-8">
          {result.routes.map((route, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header da Rota */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Rota #{idx + 1} - {route.day || 'Sem dia'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Promotor (DEFAULT) • {route.stops.length} parada(s) • {formatMinutesForDisplay(route.totalTimeMinutes)} total
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{route.stops.length}</p>
                    <p className="text-xs text-gray-600">clientes</p>
                  </div>
                </div>
              </div>

              {/* Mapa */}
              <MapDisplay route={route} />

              {/* Tabela de Paradas */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Itinerário Detalhado</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ordem</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Chegada</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Saída</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Visitação</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Deslocamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {route.stops.map((stop, stopIdx) => (
                      <tr key={stopIdx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{stop.order}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{stop.clientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{stop.arrivalTime}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{stop.departureTime}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatMinutesForDisplay(stop.visitDurationMinutes)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatMinutesForDisplay(stop.travelTimeMinutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total de Visitações:</p>
                    <p className="font-semibold text-gray-900">{formatMinutesForDisplay(route.totalVisitTimeMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total de Deslocamentos:</p>
                    <p className="font-semibold text-gray-900">{formatMinutesForDisplay(route.totalTravelTimeMinutes)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-sm">Tempo Total:</p>
                  <p className="text-lg font-bold text-blue-600">{formatMinutesForDisplay(route.totalTimeMinutes)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
