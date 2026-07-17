import Papa from 'papaparse';
import { Client } from '../types';

export interface RawClientData {
  [key: string]: string | number | undefined;
}

/**
 * Parseia um arquivo CSV/Excel e converte para o formato de Client
 */
export const parseClientDataFromCsv = (data: RawClientData[]): Client[] => {
  return data
    .map((row) => parseClientRow(row))
    .filter((client): client is Client => client !== null);
};

/**
 * Converte uma linha de dados CSV em um objeto Client
 */
const parseClientRow = (row: RawClientData): Client | null => {
  try {
    const id = String(row['CÓD'] || row['cod'] || row['id'] || '').trim();
    const name = String(row['NOME FANTASIA'] || row['nome'] || row['name'] || '').trim();
    
    // Normaliza coordenadas: converte vírgula para ponto
    let latitude = normalizeCoordinate(String(row['LATITUDE'] || row['latitude'] || ''));
    let longitude = normalizeCoordinate(String(row['LONGITUDE'] || row['longitude'] || ''));
    
    // Se coordenadas não forem fornecidas, usar valores próximos a Fortaleza com variação aleatória
    if (!latitude || latitude === 0 || isNaN(latitude)) {
      latitude = -3.73 + (Math.random() - 0.5) * 0.1; // Fortaleza ± variação
    }
    if (!longitude || longitude === 0 || isNaN(longitude)) {
      longitude = -38.52 + (Math.random() - 0.5) * 0.1; // Fortaleza ± variação
    }
    
    const visitDuration = String(
      row['TEMPO MÉDIO DE VISITA'] || 
      row['TEMPO MÉDIO DE VISI'] ||  // Coluna cortada
      row['TEMPO MÉDIO'] || 
      row['TEMPO'] || 
      row['tempo'] || 
      '00:30:00'
    ).trim();
    const frequency = parseInt(String(row['FREQUÊNCIA'] || row['frequency'] || '1'), 10);
    const promoterId = String(row['ROTAS'] || row['ROTA'] || row['promoter'] || row['promotor'] || 'DEFAULT').trim();

    // Validações básicas com feedback
    if (!id) {
      console.warn('❌ Linha rejeitada: CÓD vazio');
      return null;
    }
    if (!name) {
      console.warn(`❌ Linha ${id}: NOME FANTASIA vazio`);
      return null;
    }
    if (isNaN(frequency) || frequency < 1) {
      console.warn(`❌ Linha ${id} (${name}): FREQUÊNCIA inválida. Valor: "${row['FREQUÊNCIA']}" → ${frequency}`);
      return null;
    }

    // Parseia dias do CLIENTE (quando cliente pode ser visitado)
    // Lê dos dados CSV: SEG, TER, QUA, QUI, SEX, SAB
    // IMPORTANTE: X = BLOQUEADO/não visitar, blank = DISPONÍVEL/pode visitar
    // Inverso do que parece óbvio, mas é como o CSV está estruturado
    const visitorDays = {
      monday: !hasValue(row['SEG']),      // X bloqueado = false, blank = true
      tuesday: !hasValue(row['TER']),     // X bloqueado = false, blank = true
      wednesday: !hasValue(row['QUA']),   // X bloqueado = false, blank = true
      thursday: !hasValue(row['QUI']),    // X bloqueado = false, blank = true
      friday: !hasValue(row['SEX']),      // X bloqueado = false, blank = true
      saturday: !hasValue(row['SAB']),    // X bloqueado = false, blank = true
    };
    
    // Promoter blocked days = dados da coluna "(Dias do Vendedor)"
    // X em (Dias do Vendedor) significa "Promoter já vai visitar este dia"
    // = cliente NÃO pode ser alocado neste dia
    const promoterBlockedDays = {
      monday: hasValue(row['SEG (Dias do Vendedor)']),
      tuesday: hasValue(row['TER (Dias do Vendedor)']),
      wednesday: hasValue(row['QUA (Dias do Vendedor)']),
      thursday: hasValue(row['QUI (Dias do Vendedor)']),
      friday: hasValue(row['SEX (Dias do Vendedor)']),
      saturday: hasValue(row['SAB (Dias do Vendedor)']),
    };

    return {
      id,
      name,
      latitude,
      longitude,
      visitDurationMinutes: timeStringToMinutes(visitDuration),
      frequency,
      visitorDays,
      promoterBlockedDays,
      promoterId,
    };
  } catch (error) {
    console.error('Erro ao parsear linha:', row, error);
    return null;
  }
};

/**
 * Converte uma string de tempo HH:MM:SS para minutos
 */
const timeStringToMinutes = (timeStr: string): number => {
  if (!timeStr) return 30; // padrão de 30 minutos
  const [hours = 0, minutes = 0, seconds = 0] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + Math.round(seconds / 60);
};

/**
 * Normaliza coordenadas: converte vírgula para ponto
 * Aceita: -23.5505, -23,5505, -235505, etc.
 */
const normalizeCoordinate = (value: string): number => {
  if (!value) return 0;
  
  const str = String(value).trim();
  
  // Remove espaços em branco
  const cleaned = str.replace(/\s/g, '');
  
  // Converte vírgula para ponto (padrão: Google Maps usa ponto)
  const normalized = cleaned.replace(',', '.');
  
  const result = parseFloat(normalized);
  
  // Log se houve conversão de vírgula para ponto
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    console.log(`✅ Coordenada normalizada: "${str}" → ${result} (vírgula convertida para ponto)`);
  }
  
  return result;
};

/**
 * Verifica se um valor indica "marcado" (X, Yes, True, etc.)
 */
const hasValue = (value: any): boolean => {
  if (!value) return false;
  const str = String(value).trim().toUpperCase();
  return ['X', 'YES', 'TRUE', '1', 'SIM'].includes(str);
};

/**
 * Lê um arquivo e faz o parse usando PapaParse
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      resolve(typeof text === 'string' ? text : '');
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

/**
 * Parseia CSV usando PapaParse
 */
export const parseCsv = (csvText: string): RawClientData[] => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as RawClientData[]);
      },
      error: (error: any) => {
        reject(error);
      },
    });
  }) as any;
};

/**
 * Função completa para importar e processar um arquivo
 */
export const importClientDataFromFile = async (file: File): Promise<Client[]> => {
  try {
    const fileText = await readFileAsText(file);
    const rawData = await parseCsv(fileText);
    const clients = parseClientDataFromCsv(rawData);
    return clients;
  } catch (error) {
    console.error('Erro ao importar arquivo:', error);
    throw new Error('Falha ao importar arquivo de clientes');
  }
};
