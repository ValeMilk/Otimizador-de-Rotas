'use client';

import { useEffect, useRef } from 'react';
import { DailyRoute } from '@/types';
import { getDayName, formatMinutesForDisplay } from '@/utils/timeUtils';

interface MapDisplayProps {
  route: DailyRoute;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({ route }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (route.stops.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.fillText('Nenhuma parada nesta rota', 20, 30);
      return;
    }

    // Calcula os limites das coordenadas
    let minLat = route.stops[0].latitude;
    let maxLat = route.stops[0].latitude;
    let minLng = route.stops[0].longitude;
    let maxLng = route.stops[0].longitude;

    for (const stop of route.stops) {
      minLat = Math.min(minLat, stop.latitude);
      maxLat = Math.max(maxLat, stop.latitude);
      minLng = Math.min(minLng, stop.longitude);
      maxLng = Math.max(maxLng, stop.longitude);
    }

    // Adiciona padding
    const latPadding = (maxLat - minLat) * 0.2 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.2 || 0.01;

    const bounds = {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
    };

    // Função para converter coordenadas em pixels
    const latToPixel = (lat: number) => {
      return canvas.height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (canvas.height - 40) - 20;
    };

    const lngToPixel = (lng: number) => {
      return ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (canvas.width - 40) + 20;
    };

    // Desenha as linhas de conexão
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    for (let i = 0; i < route.stops.length - 1; i++) {
      const from = route.stops[i];
      const to = route.stops[i + 1];

      ctx.beginPath();
      ctx.moveTo(lngToPixel(from.longitude), latToPixel(from.latitude));
      ctx.lineTo(lngToPixel(to.longitude), latToPixel(to.latitude));
      ctx.stroke();
    }

    // Desenha os pontos
    for (let i = 0; i < route.stops.length; i++) {
      const stop = route.stops[i];
      const x = lngToPixel(stop.longitude);
      const y = latToPixel(stop.latitude);

      // Círculo de fundo
      ctx.fillStyle = i === 0 ? '#10b981' : i === route.stops.length - 1 ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Número da parada
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x, y);

      // Tooltip com informações
      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(stop.clientName, x + 15, y - 5);
    }

    // Desenha legenda
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    let legendY = 10;
    const legendItems = [
      { color: '#10b981', label: 'Origem' },
      { color: '#3b82f6', label: 'Parada' },
      { color: '#ef4444', label: 'Fim' },
    ];

    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.fillRect(canvas.width - 100, legendY, 12, 12);
      ctx.fillStyle = '#333';
      ctx.fillText(item.label, canvas.width - 80, legendY + 10);
      legendY += 20;
    }
  }, [route]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Visualização da Rota - {route.day || 'Sem dia'} (Promotor {route.promoterId})
      </h3>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full border border-gray-300 rounded bg-gray-50"
      />
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-gray-600">Tempo total</p>
          <p className="font-semibold text-gray-900">{formatMinutesForDisplay(route.totalTimeMinutes)}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <p className="text-gray-600">Tempo de visitas</p>
          <p className="font-semibold text-gray-900">{formatMinutesForDisplay(route.totalVisitTimeMinutes)}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded">
          <p className="text-gray-600">Tempo de deslocamento</p>
          <p className="font-semibold text-gray-900">{formatMinutesForDisplay(route.totalTravelTimeMinutes)}</p>
        </div>
      </div>
    </div>
  );
};
