'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Popup, Polyline, CircleMarker, Marker } from 'react-leaflet';
import { OptimizationResult } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// SVG Icon para Loja (Cliente)
const createStoreIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="${color}" stroke="white" stroke-width="1"/>
    <path d="M8 10h16v3H8z" fill="white"/>
    <rect x="7" y="13" width="18" height="10" fill="none" stroke="white" stroke-width="1.5" rx="0.5"/>
    <line x1="11" y1="13" x2="11" y2="23" stroke="white" stroke-width="1"/>
    <line x1="16" y1="13" x2="16" y2="23" stroke="white" stroke-width="1"/>
    <line x1="21" y1="13" x2="21" y2="23" stroke="white" stroke-width="1"/>
    <line x1="7" y1="23" x2="25" y2="23" stroke="white" stroke-width="1.5"/>
  </svg>`;
  const encoded = encodeURIComponent(svg);
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encoded}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'store-icon',
  });
};

// SVG Icon para Casa (Promotor)
const createHouseIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#000000" stroke="#333333" stroke-width="2"/>
    <polygon points="16 8 24 14 24 24 8 24 8 14" fill="white"/>
    <rect x="13" y="18" width="6" height="6" fill="#000000" stroke="white" stroke-width="0.5"/>
  </svg>`;
  const encoded = encodeURIComponent(svg);
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encoded}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'house-icon',
  });
};

interface MapLeafletRoutesProps {
  result: OptimizationResult;
  selectedRoutes?: number[];
  selectedDay?: string | null;
  selectedPromoters?: string[];
}

const ROUTE_COLORS = [
  '#FF0000', // Vermelho
  '#0000FF', // Azul
  '#008000', // Verde
  '#800080', // Roxo
  '#FFA500', // Laranja
  '#00CED1', // Turquesa
  '#FFD700', // Ouro
  '#FF1493', // Rosa profundo
];

interface RouteGroup {
  routeNumber: number;
  color: string;
  markers: Array<{
    lat: number;
    lng: number;
    label: string;
    clientId?: string;
    clientName?: string;
    visitDurationMinutes?: number;
    frequency?: number;
    day?: string;
  }>;
  polylinePath: Array<[number, number]>;
  promoterLat: number;
  promoterLng: number;
}

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const MapLeafletRoutes: React.FC<MapLeafletRoutesProps> = ({
  result,
  selectedRoutes = [],
  selectedDay = null,
  selectedPromoters = [],
}) => {
  const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-3.7327, -38.5270]); // Fortaleza-CE
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [promoterLocation, setPromoterLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [osrmTraceados, setOsrmTraceados] = useState<{
    [key: string]: Array<[number, number]>;
  }>({});
  const [loadingOsrm, setLoadingOsrm] = useState(false);
  const mapRef = useRef<any>(null);

  // Função interna para buscar traçado OSRM com garantia de renderização
  async function buscarTrassadoOSRM(clientes: any[], casa: any): Promise<[number, number][]> {
    const pontos = [casa, ...clientes, casa];
    
    // OSRM Route API tem limite de 100 coordenadas
    // Para rotas muito longas, simplifica pegando pontos chave
    let pontosSimplificados = pontos;
    if (pontos.length > 50) {
      // Mantém casa inicial, casa final, e pontos espaçados uniformemente
      const step = Math.ceil(clientes.length / 48);
      const clientesSelecionados = clientes.filter((_, i) => i % step === 0);
      pontosSimplificados = [casa, ...clientesSelecionados, casa];
      console.log(`🗺️ Rota simplificada: ${pontos.length} → ${pontosSimplificados.length} pontos`);
    }
    
    // Timeout de 15 segundos (OSRM pode demorar com rotas longas)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const coords = pontosSimplificados.map(p => `${p.longitude},${p.latitude}`).join(';');
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.warn(`⚠️ OSRM Route API retornou ${res.status} para rota com ${pontosSimplificados.length} pontos`);
        return pontos.map(p => [p.latitude, p.longitude]);
      }
      
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]) {
        const geometry = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        console.log(`✅ OSRM traçou rota com ${geometry.length} pontos (${pontosSimplificados.length} waypoints)`);
        return geometry;
      }
      
      console.warn(`⚠️ OSRM retornou código: ${data.code} - usando fallback`);
      return pontos.map(p => [p.latitude, p.longitude]);
    } catch (e: any) {
      clearTimeout(timeoutId);
      
      if (e.name === 'AbortError') {
        console.warn(`⏱️ OSRM Route API timeout (>15s) para ${pontosSimplificados.length} pontos`);
      } else {
        console.warn(`⚠️ Erro OSRM Route API: ${e.message}`);
      }
      
      return pontos.map(p => [p.latitude, p.longitude]);
    }
  }
  
  // Função auxiliar para adicionar delay entre requisições
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Processa rotas para organizar por número
  useEffect(() => {
    if (!result.routes || result.routes.length === 0) return;

    const grouped: { [key: number]: RouteGroup } = {};
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    // Agrupa stops por rota
    result.routes.forEach((route) => {
      // Aplica filtros de dia
      if (selectedDay !== null && route.day !== selectedDay) return;

      const routeNumber = route.routeNumber || 1;
      // ✅ Filtro de múltiplas rotas: se selectedRoutes não está vazio, apenas mostra rotas selecionadas
      if (selectedRoutes.length > 0 && !selectedRoutes.includes(routeNumber)) return;

      // ✅ Filtro de múltiplos promotores: se selectedPromoters não está vazio, apenas mostra promotores selecionados
      if (selectedPromoters.length > 0) {
        const assignedPromoterId = result.routeAssignments?.[routeNumber];
        if (!assignedPromoterId || !selectedPromoters.includes(assignedPromoterId)) return;
      }

      if (!grouped[routeNumber]) {
        const promoterId = result.routeAssignments?.[routeNumber];
        const promoter = result.promoters?.find((p) => p.id === promoterId);

        grouped[routeNumber] = {
          routeNumber,
          color: ROUTE_COLORS[routeNumber % ROUTE_COLORS.length],
          markers: [],
          polylinePath: [],
          // Se não houver promotor, usa a primeira parada como referência (evita coord 0,0)
          promoterLat: promoter?.latitude ?? 0,
          promoterLng: promoter?.longitude ?? 0,
        };
      }

      const group = grouped[routeNumber];
      
      // Valida se coordenadas estão em uma faixa válida (Brasil: lat -35 a 5, lng -75 a -30)
      const isCoordValida = (lat: number, lng: number): boolean => {
        return !!(lat && lng && !isNaN(lat) && !isNaN(lng) &&
                  lat >= -90 && lat <= 90 &&
                  lng >= -180 && lng <= 180 &&
                  Math.abs(lat) > 0.001 && Math.abs(lng) > 0.001);
      };
      
      // Verifica se promotor tem coordenadas válidas
      const promoterValido = isCoordValida(group.promoterLat, group.promoterLng);

      // Adiciona casa do promotor como ponto inicial (apenas se válido)
      if (group.polylinePath.length === 0 && promoterValido) {
        group.polylinePath.push([group.promoterLat, group.promoterLng]);
      }

      // Adiciona stops como marcadores
      route.stops.forEach((stop, idx) => {
        // Valida coordenadas do stop com faixa ampla
        if (!isCoordValida(stop.latitude, stop.longitude)) {
          console.warn(`⚠️ Stop com coordenada inválida ignorado: ${stop.clientName} [${stop.latitude}, ${stop.longitude}]`);
          return;
        }
        
        group.markers.push({
          lat: stop.latitude,
          lng: stop.longitude,
          label: String(idx + 1),
          clientId: stop.clientId,
          clientName: stop.clientName,
          visitDurationMinutes: stop.visitDurationMinutes,
          frequency: stop.frequency,
          day: route.day,
        });

        // Adiciona ao caminho (será substituído por OSRM)
        group.polylinePath.push([stop.latitude, stop.longitude]);

        // Atualiza bounds APENAS com coordenadas válidas
        minLat = Math.min(minLat, stop.latitude);
        maxLat = Math.max(maxLat, stop.latitude);
        minLng = Math.min(minLng, stop.longitude);
        maxLng = Math.max(maxLng, stop.longitude);
      });

      // Adiciona casa do promotor como ponto final (apenas se válido)
      if (promoterValido) {
        group.polylinePath.push([group.promoterLat, group.promoterLng]);
        
        // Atualiza bounds para casa apenas se válido
        minLat = Math.min(minLat, group.promoterLat);
        maxLat = Math.max(maxLat, group.promoterLat);
        minLng = Math.min(minLng, group.promoterLng);
        maxLng = Math.max(maxLng, group.promoterLng);
      }
    });

    // Converte para array
    const groups = Object.values(grouped);
    setRouteGroups(groups);
    
    // Debug: log rotas geradas
    console.log(`📍 MapLeafletRoutes: ${groups.length} grupo(s) de rotas processados`);
    groups.forEach(g => {
      console.log(`  Rota ${g.routeNumber}: ${g.markers.length} marcador(es), promoter em [${g.promoterLat.toFixed(4)}, ${g.promoterLng.toFixed(4)}]`);
      console.log(`    polylinePath tem ${g.polylinePath.length} ponto(s)`);
      if (g.polylinePath.length > 0) {
        console.log(`    Primeiro ponto: [${g.polylinePath[0][0].toFixed(4)}, ${g.polylinePath[0][1].toFixed(4)}]`);
      }
    });

    // Calcula o centro (média de todas as coordenadas VÁLIDAS)
    if (groups.length > 0 && groups[0].markers.length > 0) {
      let sumLat = 0;
      let sumLng = 0;
      let count = 0;

      groups.forEach((group) => {
        // Adiciona promoter apenas se coordenadas válidas
        if (group.promoterLat !== 0 && group.promoterLng !== 0) {
          sumLat += group.promoterLat;
          sumLng += group.promoterLng;
          count++;
        }

        group.markers.forEach((marker) => {
          if (marker.lat !== 0 && marker.lng !== 0) {
            sumLat += marker.lat;
            sumLng += marker.lng;
            count++;
          }
        });
      });

      if (count > 0) {
        setMapCenter([sumLat / count, sumLng / count]);
      }
    }

    // Armazena bounds para fitBounds
    if (minLat <= maxLat && minLng <= maxLng) {
      setBounds({ minLat, maxLat, minLng, maxLng });
    }

    // Captura localização do promotor selecionado (apenas se houver 1 único selecionado)
    if (selectedPromoters.length === 1 && result.promoters) {
      const promoter = result.promoters.find((p) => p.id === selectedPromoters[0]);
      if (promoter) {
        setPromoterLocation({
          name: promoter.name,
          address: promoter.address,
          lat: promoter.latitude,
          lng: promoter.longitude,
        });
      } else {
        setPromoterLocation(null);
      }
    } else {
      setPromoterLocation(null);
    }
  }, [result, selectedRoutes, selectedDay, selectedPromoters]);

  // Busca traçados do OSRM para cada rota visível (PARALELIZADO)
  useEffect(() => {
    if (routeGroups.length === 0) return;

    const buscarTodos = async () => {
      setLoadingOsrm(true);
      
      // Filtra rotas que ainda não foram cacheadas
      const rotasParaBuscar = routeGroups.filter(group => {
        const chave = `${group.routeNumber}-${group.markers.map((m) => m.label).join(',')}`;
        return !osrmTraceados[chave];
      });
      
      if (rotasParaBuscar.length === 0) {
        setLoadingOsrm(false);
        return;
      }
      
      console.log(`🗺️ Buscando ${rotasParaBuscar.length} traçado(s) OSRM em paralelo...`);
      
      // Executa em PARALELO (Promise.all) — muito mais rápido!
      const resultados = await Promise.all(
        rotasParaBuscar.map(async (group) => {
          const chave = `${group.routeNumber}-${group.markers.map((m) => m.label).join(',')}`;
          const trajetoReal = await buscarTrassadoOSRM(
            group.markers.map((m) => ({ latitude: m.lat, longitude: m.lng })),
            { latitude: group.promoterLat, longitude: group.promoterLng }
          );
          return { chave, trajeto: trajetoReal };
        })
      );
      
      const novosCacheados: { [key: string]: Array<[number, number]> } = {};
      resultados.forEach(({ chave, trajeto }) => {
        novosCacheados[chave] = trajeto;
      });

      setOsrmTraceados((prev) => ({ ...prev, ...novosCacheados }));
      setLoadingOsrm(false);
      console.log(`✅ Traçados OSRM carregados para ${rotasParaBuscar.length} rota(s)`);
    };

    buscarTodos();
  }, [routeGroups]);

  // Faz fit bounds quando mapa carrega ou bounds mudam
  useEffect(() => {
    if (!bounds) return;
    
    // Valida bounds
    if (bounds.minLat === Infinity || bounds.maxLat === -Infinity ||
        bounds.minLng === Infinity || bounds.maxLng === -Infinity) {
      console.warn('⚠️ Bounds inválidos, ignorando fitBounds');
      return;
    }

    // Aguarda o mapa estar pronto
    const timer = setTimeout(() => {
      if (!mapRef.current) {
        console.warn('⚠️ Map ref ainda não disponível');
        return;
      }
      
      try {
        mapRef.current.invalidateSize();
        const leafletBounds = [[bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng]] as any;
        mapRef.current.fitBounds(leafletBounds, { padding: [50, 50], maxZoom: 14 });
        console.log(`🗺️ Mapa centralizado em bounds: [${bounds.minLat.toFixed(4)}, ${bounds.minLng.toFixed(4)}] → [${bounds.maxLat.toFixed(4)}, ${bounds.maxLng.toFixed(4)}]`);
      } catch (e) {
        console.error('Erro ao aplicar fitBounds:', e);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [bounds, routeGroups]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg relative bg-gray-100 shrink-0">
      {routeGroups.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Nenhuma rota para exibir</p>
        </div>
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          ref={mapRef}
          key={`map-${routeGroups.length}`}
        >
          {/* TileLayer do OpenStreetMap - Gratuito */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

        {/* Renderiza polilinhas com traçados do OSRM (ou fallback para linhas retas) */}
        {routeGroups.map((group) => {
          const chave = `${group.routeNumber}-${group.markers.map((m) => m.label).join(',')}`;
          const trajetoParaRenderizar = osrmTraceados[chave] || group.polylinePath;
          
          // Debug: verificar se tem pontos
          if (trajetoParaRenderizar.length === 0) {
            console.warn(`⚠️ Rota ${group.routeNumber} sem pontos para renderizar!`);
            return null;
          }

          return (
            <Polyline
              key={`polyline-${group.routeNumber}`}
              positions={trajetoParaRenderizar}
              color={group.color}
              opacity={0.8}
              weight={4}
              dashArray={osrmTraceados[chave] ? undefined : '8, 4'} // Tracejado se for fallback
              lineCap="round"
              lineJoin="round"
            />
          );
        })}

        {/* Renderiza marcadores para cada rota */}
        {routeGroups.map((group) =>
          group.markers.map((marker, idx) => (
            <Marker
              key={`marker-${group.routeNumber}-${idx}`}
              position={[marker.lat, marker.lng]}
              icon={createStoreIcon(group.color)}
            >
              <Popup>
                <div className="text-sm font-medium max-w-xs">
                  <div className="font-bold text-base mb-3" style={{ color: group.color }}>
                    📍 Parada {marker.label}
                  </div>

                  <div className="space-y-1 text-xs">
                    {marker.clientId && marker.clientName && (
                      <p>
                        <strong>🏪 Cód/Loja:</strong> {marker.clientId} - {marker.clientName}
                      </p>
                    )}
                    <p>
                      <strong>🛣️ Rota:</strong> {group.routeNumber}
                    </p>
                    {marker.day && (
                      <p>
                        <strong>📅 Dia:</strong> {marker.day}
                      </p>
                    )}
                    {marker.visitDurationMinutes !== undefined && (
                      <p>
                        <strong>⏱️ Tempo Médio:</strong>{' '}
                        {Math.floor(marker.visitDurationMinutes / 60)}h{' '}
                        {marker.visitDurationMinutes % 60}m
                      </p>
                    )}
                    {marker.frequency !== undefined && (
                      <p>
                        <strong>📊 Frequência:</strong> {marker.frequency}x/semana
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))
        )}

        {/* Marcadores da Casa do Promotor */}
        {routeGroups.map((group) => (
          <Marker
            key={`house-${group.routeNumber}`}
            position={[group.promoterLat, group.promoterLng]}
            icon={createHouseIcon()}
          >
            <Popup>
              <div className="text-sm font-medium max-w-xs">
                <div className="font-bold text-base mb-2 text-amber-800">🏠 Casa do Promotor</div>
                <div className="space-y-1 text-xs">
                  {promoterLocation && (
                    <>
                      <p>
                        <strong>🏍️ Promotor:</strong> {promoterLocation.name}
                      </p>
                      <p>
                        <strong>📍 Endereço:</strong> {promoterLocation.address}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      )}

      {/* Loading indicator para OSRM */}
      {loadingOsrm && (
        <div className="absolute top-4 left-4 bg-blue-100 border border-blue-400 text-blue-800 p-2 rounded text-xs font-semibold z-[1000]">
          ⏳ Calculando traçados reais (OSRM)...
        </div>
      )}
      
      {/* Indicador de rotas renderizadas */}
      {!loadingOsrm && routeGroups.length > 0 && (
        <div className="absolute top-4 left-4 bg-green-100 border border-green-400 text-green-800 p-2 rounded text-xs font-semibold z-[1000]">
          ✅ {routeGroups.length} rota(s) no mapa
        </div>
      )}

      {/* Legenda */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-h-56 overflow-y-auto z-10 border border-gray-200">
        <h3 className="font-bold text-sm mb-3 text-gray-800 flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          Rotas ({routeGroups.length})
        </h3>
        <div className="space-y-2">
          {routeGroups.map((group) => (
            <div
              key={`legend-${group.routeNumber}`}
              className="flex items-center gap-3 text-xs hover:bg-gray-50 p-2 rounded transition-colors cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-white"
                style={{ backgroundColor: group.color }}
              >
                {group.routeNumber}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Rota {group.routeNumber}</p>
                <p className="text-gray-600">{group.markers.length} parada(s)</p>
              </div>
            </div>
          ))}
        </div>

        {/* Badge de traçados reais */}
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-green-700 font-semibold flex items-center gap-2">
          <span>✅</span>
          <span>Traçados OSRM (ruas reais)</span>
        </div>
      </div>

      {/* Crédito OpenStreetMap e OSRM */}
      <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg text-xs text-gray-700 z-10 shadow-md border border-gray-200 font-medium flex items-center gap-1">
        <span>🌍</span>
        <span>OpenStreetMap + OSRM</span>
      </div>
    </div>
  );
};
