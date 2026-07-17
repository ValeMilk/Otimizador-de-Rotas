'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMap, MarkerF, useJsApiLoader, DirectionsRenderer, DirectionsService } from '@react-google-maps/api';
import { OptimizationResult } from '@/types';

interface MapGoogleRoutesProps {
  result: OptimizationResult;
}

// Paleta de cores para rotas
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
  markers: Array<{ lat: number; lng: number; label: string }>;
  polylinePath: Array<{ lat: number; lng: number }>;
  directionsResponse?: google.maps.DirectionsResult;
  error?: string;
}

export const MapGoogleRoutes: React.FC<MapGoogleRoutesProps> = ({ result }) => {
  const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: -23.5505, lng: -46.6333 }); // São Paulo default
  const mapRef = useRef<google.maps.Map>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  // Carrega API do Google Maps
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['routes'],
  });

  // Processa rotas para organizar por número e calcula direções
  useEffect(() => {
    if (!result.routes || result.routes.length === 0) return;

    const grouped: { [key: number]: RouteGroup } = {};

    // Agrupa stops por rota e dia (para traçados reais)
    result.routes.forEach((route) => {
      const routeNumber = route.routeNumber || 1;
      
      if (!grouped[routeNumber]) {
        grouped[routeNumber] = {
          routeNumber,
          color: ROUTE_COLORS[routeNumber % ROUTE_COLORS.length],
          markers: [],
          polylinePath: [],
        };
      }

      const group = grouped[routeNumber];

      // Adiciona stops como marcadores
      route.stops.forEach((stop, idx) => {
        group.markers.push({
          lat: stop.latitude,
          lng: stop.longitude,
          label: String(idx + 1),
        });
        
        // Adiciona ao caminho da polilinha (fallback)
        group.polylinePath.push({
          lat: stop.latitude,
          lng: stop.longitude,
        });
      });
    });

    // Converte para array
    const groups = Object.values(grouped);
    setRouteGroups(groups);

    // Calcula o centro (média de todas as coordenadas)
    if (groups.length > 0 && groups[0].markers.length > 0) {
      let sumLat = 0;
      let sumLng = 0;
      let count = 0;

      groups.forEach(group => {
        group.markers.forEach(marker => {
          sumLat += marker.lat;
          sumLng += marker.lng;
          count++;
        });
      });

      setMapCenter({ lat: sumLat / count, lng: sumLng / count });
    }
  }, [result]);

  // Calcula direções reais para cada rota assim que isLoaded muda
  useEffect(() => {
    if (!isLoaded || routeGroups.length === 0) return;

    // Inicializa DirectionsService
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

    const directionsService = directionsServiceRef.current;

    // Calcula direções para cada rota
    routeGroups.forEach((group, index) => {
      if (group.markers.length < 2) {
        // Se houver menos de 2 marcadores, não pode calcular rota
        return;
      }

      // Monta waypoints (locais intermediários)
      const waypoints = group.markers
        .slice(1, -1) // Exclui primeiro e último (esses são origin e destination)
        .map(marker => ({
          location: new google.maps.LatLng(marker.lat, marker.lng),
          stopover: true,
        }));

      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(group.markers[0].lat, group.markers[0].lng),
        destination: new google.maps.LatLng(
          group.markers[group.markers.length - 1].lat,
          group.markers[group.markers.length - 1].lng
        ),
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false, // Mantém ordem dos waypoints
      };

      // Chama DirectionsService com delay para evitar throttling
      setTimeout(() => {
        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            // Atualiza routeGroups com a resposta
            setRouteGroups(prevGroups => {
              const updated = [...prevGroups];
              updated[index] = {
                ...updated[index],
                directionsResponse: result,
              };
              return updated;
            });
          } else {
            // Log do erro mas mantém funcionando com fallback
            console.warn(`Erro ao calcular direções para rota ${group.routeNumber}: ${status}`);
            setRouteGroups(prevGroups => {
              const updated = [...prevGroups];
              updated[index] = {
                ...updated[index],
                error: `Erro ao carregar rota: ${status}`,
              };
              return updated;
            });
          }
        });
      }, index * 500); // Delay entre requisições
    });
  }, [isLoaded, routeGroups.length]); // Nota: intencionalmente sem routeGroups no array

  // Faz fit bounds quando mapa carrega
  useEffect(() => {
    if (!isLoaded || !(mapRef as any).current || routeGroups.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    
    routeGroups.forEach(group => {
      group.markers.forEach(marker => {
        bounds.extend(new google.maps.LatLng(marker.lat, marker.lng));
      });
    });

    (mapRef as any).current.fitBounds(bounds);
  }, [isLoaded, routeGroups.length]); // Nota: intencionalmente sem routeGroups.markers no array

  if (!isLoaded) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-600">Carregando mapa e rotas...</span>
      </div>
    );
  }

  // Se não houver chave de API, mostrar aviso
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-96 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col items-center justify-center">
        <p className="text-yellow-800 font-semibold mb-2">⚠️ Google Maps não configurado</p>
        <p className="text-yellow-700 text-sm">
          Configure a variável de ambiente <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para ativar o mapa interativo.
        </p>
        <p className="text-yellow-700 text-xs mt-2">
          Para obter uma chave: <a href="https://developers.google.com/maps" target="_blank" rel="noopener noreferrer" className="underline">https://developers.google.com/maps</a>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={mapCenter}
        zoom={13}
        onLoad={(map) => {
          (mapRef as any).current = map;
        }}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Renderiza direções reais (traçados pelas ruas) para cada rota */}
        {routeGroups.map((group) =>
          group.directionsResponse ? (
            <DirectionsRenderer
              key={`directions-${group.routeNumber}`}
              directions={group.directionsResponse}
              options={{
                polylineOptions: {
                  strokeColor: group.color,
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                },
                suppressMarkers: true, // Renderizamos nossos próprios marcadores
              }}
            />
          ) : null
        )}

        {/* Renderiza marcadores para cada rota */}
        {routeGroups.map((group) =>
          group.markers.map((marker, idx) => (
            <MarkerF
              key={`marker-${group.routeNumber}-${idx}`}
              position={{ lat: marker.lat, lng: marker.lng }}
              label={{
                text: marker.label,
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: group.color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              title={`Parada ${marker.label} - Rota ${group.routeNumber}`}
            />
          ))
        )}
      </GoogleMap>

      {/* Legenda */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-md max-h-48 overflow-y-auto">
        <h3 className="font-semibold text-sm mb-2">🚗 Rotas (Traçados Reais)</h3>
        <div className="space-y-1">
          {routeGroups.map((group) => (
            <div key={`legend-${group.routeNumber}`} className="flex items-center gap-2 text-xs">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: group.color }}
              ></div>
              <span>
                Rota {group.routeNumber} {group.error ? '⚠️' : '✓'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 border-t pt-2">
          🗺️ Traçados pelas ruas reais usando Google Directions API
        </p>
      </div>
    </div>
  );
};
