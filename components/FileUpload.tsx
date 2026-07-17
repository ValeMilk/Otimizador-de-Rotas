'use client';

import { useCallback, useState } from 'react';
import { Upload, AlertCircle, Download } from 'lucide-react';
import { importClientDataFromFile } from '@/utils/csvParser';
import { downloadBlankTemplate, downloadExampleTemplate } from '@/utils/templateDownload';
import { Client } from '@/types';

interface FileUploadProps {
  onFilesLoaded: (clients: Client[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        // Valida o tipo de arquivo
        if (!['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type) && !file.name.endsWith('.csv')) {
          throw new Error('Por favor, faça upload de um arquivo CSV ou Excel válido');
        }

        const clients = await importClientDataFromFile(file);

        if (clients.length === 0) {
          throw new Error(
            '❌ Nenhum cliente válido encontrado!\n\n' +
            'Verifique CADA campo:\n' +
            '✓ Coluna CÓD: Não está vazia?\n' +
            '✓ Coluna NOME FANTASIA: Não está vazia?\n' +
            '✓ LATITUDE: Formato -23.5505 (com PONTO, não vírgula)?\n' +
            '✓ LONGITUDE: Formato -46.6333 (com PONTO, não vírgula)?\n' +
            '✓ Coordenadas NÃO são 0, 0.0 ou vazias?\n' +
            '✓ FREQUÊNCIA: Número inteiro 1-6 (não vazio)?\n' +
            '✓ TEMPO MÉDIO: Formato HH:MM:SS (ex: 01:00:00)?\n\n' +
            '💡 DICA: Baixe "Template com Exemplos" e copie exatamente o formato dos dados de exemplo.\n' +
            '📄 Para mais detalhes: Veja arquivo "COMO_CORRIGIR_ARQUIVO.md" na pasta do projeto.'
          );
        }

        onFilesLoaded(clients);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao processar o arquivo';
        setError(message);
        console.error('Upload error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [onFilesLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Seção de Download de Template */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Baixar Modelo de Planilha (.XLSX)
        </h3>
        <p className="text-sm text-blue-800 mb-4">
          Clique em um dos links abaixo para baixar um modelo de planilha em Excel pronto para preenchimento:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={downloadBlankTemplate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <Download className="w-5 h-5" />
            Template em Branco (.xlsx)
          </button>
          <button
            onClick={downloadExampleTemplate}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <Download className="w-5 h-5" />
            Template com Exemplos (.xlsx)
          </button>
        </div>
      </div>

      {/* Seção de Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleInputChange}
          disabled={isLoading}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <Upload className={`w-10 h-10 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              {isLoading ? 'Processando arquivo...' : 'Arraste a planilha aqui ou clique para selecionar'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Arquivo deve estar em formato CSV ou Excel</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erro ao processar arquivo</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
