'use client';

import { useEffect, useRef } from 'react';
import { OptimizationResult } from '@/types';

interface MapAllRoutesProps {
  result: OptimizationResult;
}

const ROUTE_COLORS = [
  '#3b82f6', // Azul
  '#ef4444', // Vermelho
  '#10b981', // Verde
  '#f59e0b', // Laranja
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Cyan
  '#6366f1', // Índigo
];

export const MapAllRoutes: React.FC<MapAllRoutesProps> = ({ result }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (result.routes.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.fillText('Nenhuma rota para exibir', 20, 30);
      return;
    }

    // Calcula os limites globais de todas as rotas
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const route of result.routes) {
      for (const stop of route.stops) {
        minLat = Math.min(minLat, stop.latitude);
        maxLat = Math.max(maxLat, stop.latitude);
        minLng = Math.min(minLng, stop.longitude);
        maxLng = Math.max(maxLng, stop.longitude);
      }
    }

    // Adiciona padding
    const latPadding = (maxLat - minLat) * 0.15 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.15 || 0.01;

    const bounds = {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
    };

    // Função para converter coordenadas em pixels
    const latToPixel = (lat: number) => {
      return canvas.height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (canvas.height - 80) - 40;
    };

    const lngToPixel = (lng: number) => {
      return ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (canvas.width - 80) + 40;
    };

    // Desenha cada rota com cor diferente
    result.routes.forEach((route, routeIdx) => {
      const color = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];

      // Desenha as linhas de conexão
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;

      for (let i = 0; i < route.stops.length - 1; i++) {
        const from = route.stops[i];
        const to = route.stops[i + 1];

        ctx.beginPath();
        ctx.moveTo(lngToPixel(from.longitude), latToPixel(from.latitude));
        ctx.lineTo(lngToPixel(to.longitude), latToPixel(to.latitude));
        ctx.stroke();
      }

      // Desenha os pontos
      ctx.globalAlpha = 1;
      for (let i = 0; i < route.stops.length; i++) {
        const stop = route.stops[i];
        const x = lngToPixel(stop.longitude);
        const y = latToPixel(stop.latitude);

        // Círculo de fundo com a cor da rota
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();

        // Número da parada
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), x, y);
      }
    });

    // Desenha a legenda
    const legendX = canvas.width - 200;
    const legendY = 20;
    const legendItemHeight = 20;

    // Fundo da legenda
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(legendX - 10, legendY - 10, 210, result.routes.length * legendItemHeight + 20);

    // Borda da legenda
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 10, legendY - 10, 210, result.routes.length * legendItemHeight + 20);

    // Título da legenda
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Rotas', legendX, legendY + 10);

    // Itens da legenda
    result.routes.forEach((route, idx) => {
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const y = legendY + 25 + idx * legendItemHeight;

      // Círculo colorido
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(legendX, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Texto
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Rota #${idx + 1} (${route.stops.length} clientes)`, legendX + 12, y + 4);
    });
  }, [result]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
        <h3 className="text-lg font-semibold text-gray-900">🗺️ Mapa Geral das Rotas</h3>
        <p className="text-sm text-gray-600 mt-1">Divisão visual de todos os clientes por rota</p>
      </div>
      <div className="w-full overflow-auto bg-slate-50">
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          className="w-full min-w-full border-t border-gray-200"
          style={{ minHeight: '600px', backgroundColor: '#f8fafc' }}
        />
      </div>
    </div>
  );
};
