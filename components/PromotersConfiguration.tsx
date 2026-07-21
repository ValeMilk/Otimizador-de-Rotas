'use client';

import React, { useState, useRef } from 'react';
import { Promoter } from '@/types';
import { Trash2, MapPin, Loader, Check, AlertCircle, Upload, FileText } from 'lucide-react';

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
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Geocoding sem side effects (usado no upload em massa)
  const geocodeSilent = async (addressText: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressText)}&format=json&limit=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'OtimizadorRotas/1.0',
          },
        }
      );
      const results = await response.json();
      if (!results || results.length === 0) return null;
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      return null;
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    setGeocodingError('');

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Detecta separador (`;` ou `,`)
      const separator = lines[0].includes(';') ? ';' : ',';
      
      // Remove cabeçalho
      const dataLines = lines.slice(1);
      
      console.log(`📄 CSV: ${dataLines.length} promotor(es) para processar (separador: "${separator}")`);
      
      const novosPromoters: Promoter[] = [];
      const erros: string[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const linha = dataLines[i];
        const partes = linha.split(separator).map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (partes.length < 2) {
          erros.push(`Linha ${i + 2}: formato inválido`);
          continue;
        }

        const nomePromotor = partes[0];
        const enderecoPromotor = partes[1];

        if (!nomePromotor || !enderecoPromotor) {
          erros.push(`Linha ${i + 2}: nome ou endereço vazio`);
          continue;
        }

        setCsvProgress({ current: i + 1, total: dataLines.length, name: nomePromotor });
        console.log(`🔍 [${i + 1}/${dataLines.length}] Buscando: ${nomePromotor} - ${enderecoPromotor}`);

        const coords = await geocodeSilent(enderecoPromotor);
        
        if (coords) {
          novosPromoters.push({
            id: `promoter_${Date.now()}_${i}`,
            name: nomePromotor,
            address: enderecoPromotor,
            latitude: coords.lat,
            longitude: coords.lng,
          });
          console.log(`  ✅ ${nomePromotor}: [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}]`);
        } else {
          erros.push(`${nomePromotor}: endereço não encontrado`);
          console.warn(`  ❌ ${nomePromotor}: endereço não encontrado`);
        }

        // Delay obrigatório do Nominatim (1 req/seg)
        await delay(1100);
      }

      onPromotersChange([...promoters, ...novosPromoters]);
      setCsvProgress(null);
      
      if (erros.length > 0) {
        setGeocodingError(`Importados ${novosPromoters.length} de ${dataLines.length}. Erros: ${erros.slice(0, 3).join('; ')}${erros.length > 3 ? '...' : ''}`);
      } else {
        console.log(`✅ ${novosPromoters.length} promotor(es) importado(s) com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      setGeocodingError('Erro ao ler o arquivo CSV.');
    } finally {
      setCsvLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      {/* Upload em massa via CSV */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3 mb-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Upload em Massa (CSV)</h3>
            <p className="text-sm text-gray-600">
              Importe múltiplos promotores de uma vez via arquivo CSV. 
              Formato: <code className="bg-white px-2 py-0.5 rounded text-xs">NOME;ENDEREÇO</code> (separador <code className="bg-white px-2 py-0.5 rounded text-xs">;</code>)
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          disabled={csvLoading}
          className="hidden"
          id="csv-promoters-upload"
        />
        <label
          htmlFor="csv-promoters-upload"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white cursor-pointer transition-colors ${
            csvLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {csvLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Selecionar CSV de Promotores
            </>
          )}
        </label>
        
        {/* Barra de progresso */}
        {csvProgress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-700 mb-1">
              <span className="font-medium">Processando: {csvProgress.name}</span>
              <span>{csvProgress.current}/{csvProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(csvProgress.current / csvProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ⏱️ Nominatim exige 1 segundo entre requisições
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-500">ou adicione manualmente</span>
        <div className="flex-1 h-px bg-gray-200" />
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
