'use client';

import React, { useState } from 'react';
import { Promoter } from '@/types';
import { Trash2, MapPin, Loader, Check, AlertCircle } from 'lucide-react';

interface PromotersConfigurationProps {
  promoters: Promoter[];
  onPromotersChange: (promoters: Promoter[]) => void;
}

export const PromotersConfiguration: React.FC<PromotersConfigurationProps> = ({
  promoters,
  onPromotersChange,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState('');

  const geocodeAddress = async (addressText: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      setLoading(true);
      setGeocodingError('');

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressText)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'OtimizadorRotas/1.0',
          },
        }
      );

      const results = await response.json();

      if (!results || results.length === 0) {
        setGeocodingError('Endereço não encontrado. Tente ser mais específico.');
        return null;
      }

      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      setGeocodingError('Erro ao buscar coordenadas. Tente novamente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromoter = async () => {
    if (!name.trim() || !address.trim()) {
      setGeocodingError('Preencha nome e endereço');
      return;
    }

    const coordinates = await geocodeAddress(address);
    if (!coordinates) {
      return;
    }

    const newPromoter: Promoter = {
      id: `promoter_${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    };

    onPromotersChange([...promoters, newPromoter]);
    setName('');
    setAddress('');
    setGeocodingError('');
  };

  const handleRemovePromoter = (id: string) => {
    onPromotersChange(promoters.filter(p => p.id !== id));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Configurar Promotores</h2>
      </div>

      {/* Form para adicionar promotor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Promotor
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endereço Completo
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Rua das Flores, 123, Fortaleza, CE"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddPromoter();
              }
            }}
          />
        </div>

        <button
          onClick={handleAddPromoter}
          disabled={loading}
          className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Localizando endereço...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Adicionar Promotor
            </>
          )}
        </button>
      </div>

      {/* Mensagem de erro */}
      {geocodingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{geocodingError}</p>
        </div>
      )}

      {/* Lista de promotores */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Promotores Cadastrados ({promoters.length})
        </h3>

        {promoters.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">Nenhum promotor cadastrado ainda.</p>
            <p className="text-sm text-gray-500 mt-1">
              Adicione promotores acima para continuar com a configuração.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {promoters.map((promoter) => (
              <div
                key={promoter.id}
                className="bg-gray-50 rounded-lg p-4 flex items-start justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <h4 className="font-semibold text-gray-900">{promoter.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{promoter.address}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {promoter.latitude.toFixed(4)}, {promoter.longitude.toFixed(4)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemovePromoter(promoter.id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remover promotor"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informação */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          ℹ️ Os promotores serão atribuídos às rotas automaticamente com base na proximidade de suas residências aos clientes.
        </p>
      </div>
    </div>
  );
};
