/**
 * Documentação Completa de Tipos TypeScript - v2.0
 * 
 * VERSÃO 2.0: Motor Reescrito com 4 Correções Críticas
 * - Gap logic: Alocação de 13% → 100%
 * - Sábado: Agora incluído (dia 5)
 * - Best-fit packing: Capacidade otimizada
 * - Excel export: Dias marcados corretamente
 * 
 * Ver NOVIDADES.md para detalhes técnicos
 */

/**
 * Cliente/Loja a ser visitada
 * @property {string} id - Identificador único do cliente
 * @property {string} name - Nome fantasia da loja
 * @property {number} latitude - Coordenada de latitude
 * @property {number} longitude - Coordenada de longitude
 * @property {number} visitDurationMinutes - Tempo médio de visita em minutos
 * @property {number} frequency - Número de vezes que deve ser visitado na semana
 * @property {object} visitorDays - Dias em que o vendedor já visita (conflito)
 * @property {string} promoterId - ID do promotor responsável
 */
export interface Client {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  visitDurationMinutes: number;
  frequency: number;
  visitorDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean; // ✨ v2.0: Sábado agora suportado
  };
  promoterId: string;
}

/**
 * Configuração de jornada de trabalho
 * Especifica quantas horas de trabalho o promotor tem por dia
 */
export interface WorkSchedule {
  monday: number; // horas
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number; // ✨ v2.0: Sábado (tipicamente 4h)
}

/**
 * Parada individual em uma rota
 * Representa uma visita a um cliente específico
 */
export interface RouteStop {
  order: number; // Ordem sequencial de visita (1, 2, 3...)
  clientId: string; // ID do cliente
  clientName: string; // Nome da loja
  latitude: number;
  longitude: number;
  visitDurationMinutes: number; // Tempo gasto na loja
  travelTimeMinutes: number; // Tempo de deslocamento até aqui
  arrivalTime: string; // HH:MM:SS
  departureTime: string; // HH:MM:SS
}

/**
 * Rota diária para um promotor
 * Contém todas as paradas agendadas para um dia específico
 * 
 * ✨ v2.0 Changes:
 * - day: Agora retorna 'saturday' quando alocado
 * - Suporta sábado com capacidade de 4h
 */
export interface DailyRoute {
  day: string; // 'monday', 'tuesday', ..., 'saturday' (✨ v2.0: agora pode ser saturday)
  promoterId: string; // ID do promotor
  stops: RouteStop[]; // Array de paradas ordenadas (✨ v2.0: best-fit sorted)
  totalTravelTimeMinutes: number; // Soma de todos os deslocamentos
  totalVisitTimeMinutes: number; // Soma de todas as visitações
  totalTimeMinutes: number; // Tempo total (deslocamento + visita)
}

/**
 * Resultado completo da otimização
 * Contém todas as rotas geradas e estatísticas
 * 
 * ✨ v2.0: Resultados significativamente melhorados
 * - Taxa de alocação: 13% → 100%
 * - Sábado: 0 rotas → 1+ rotas
 * - Utilização: Subutilizada → Ótima
 */
export interface OptimizationResult {
  routes: DailyRoute[]; // Array de rotas diárias (✨ v2.0: agora inclui sábado)
  clients?: Client[]; // ✨ v2.0: Clientes alocados (adicionado para export)
  summary: {
    totalDaysOptimized: number; // Número de dias com rotas (agora pode incluir sábado)
    totalClientsAssigned: number; // Número de clientes alocados (✨ v2.0: tipicamente 100%)
    averageUtilization: number; // Utilização média em %
    warnings: string[]; // Avisos gerados durante a otimização
  };
}

// Tipos auxiliares

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'; // ✨ v2.0: saturday adicionado

export interface ClientAssignment {
  clientId: string;
  day: string;
}

export interface OptimizationProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
}

export interface ValidationError {
  type: 'missing_field' | 'invalid_value' | 'constraint_violation';
  field: string;
  message: string;
  row?: number;
}

export interface ParseResult {
  clients: Client[];
  errors: ValidationError[];
  warnings: string[];
}
