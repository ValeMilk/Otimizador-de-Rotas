/**
 * ⚡ NOVO MOTOR DE ROTEIRIZAÇÃO - 7 REGRAS DE OURO
 * 
 * Implementa estritamente:
 * 1. Clusterização por Geolocalização (Haversine + Nearest Neighbor)
 * 2. Unicidade de Rota (cliente NÃO é dividido entre rotas)
 * 3. Capacidade Máxima do Dia (Seg-Sex: 480min, Sáb: 240min)
 * 4. Multiplicação pela Frequência (freq=2 → 2 dias distintos)
 * 5. Visitas Intercaladas (gap mínimo de 1 dia entre visitas)
 * 6. Restrição com Vendedor (X na coluna = dia BLOQUEADO)
 * 7. Otimização (First Fit Decreasing: processar clientes grandes primeiro)
 */

import { Client, DailyRoute, RouteStop, WorkSchedule } from '../types';

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface AgendaDia {
  nome: string;
  diaSemana: number;        // 0=Seg, 1=Ter, ..., 5=Sáb
  limite: number;           // minutos: 480 (seg-sex) ou 240 (sáb)
  visitas: VisitaAgendada[];
  tempoGasto: number;
}

interface AgendaSemanal {
  [dia: number]: AgendaDia;
}

interface VisitaAgendada {
  clienteId: string;
  clienteNome: string;
  latitude: number;
  longitude: number;
  duracao: number;          // minutos
  tempoDeslocamento: number; // minutos (calculado depois)
  diaSemana: number;
}

interface ClienteExpandido {
  clienteOriginal: Client;
  visitasRequisitadas: number;
  visitasAlocadas: number;
  diasAlocados: Set<number>; // Set de dias onde será visitado
  // diasDisponiveis: não usamos mais - todos os clientes têm seg-sex disponível
}

// ============================================================================
// CONSTANTES
// ============================================================================

const VELOCIDADE_MEDIA = 40; // km/h
const DIAS_NOMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_INGLES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const CAPACIDADES = [480, 480, 480, 480, 480, 240]; // minutos por dia

// ============================================================================
// UTILITÁRIOS MATEMÁTICOS
// ============================================================================

/**
 * Calcula distância em km usando Haversine
 */
function calcularDistanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6.371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converte km/h para minutos de deslocamento
 */
function calcularTempoDeslocamento(distanciaKm: number): number {
  return Math.ceil((distanciaKm / VELOCIDADE_MEDIA) * 60);
}

/**
 * Encontra o vizinho mais próximo (Nearest Neighbor)
 * Retorna índice do cliente não visitado mais próximo
 */
function encontrarVizinhoMaisProximo(
  clienteAtual: ClienteExpandido,
  clientesDisponiveis: ClienteExpandido[],
  indicesNaoVisitados: number[]
): number {
  if (indicesNaoVisitados.length === 0) return -1;

  let vizinhoMaisProximo = -1;
  let distanciaMinima = Infinity;

  for (const indice of indicesNaoVisitados) {
    const cliente = clientesDisponiveis[indice];
    const distancia = calcularDistanciaHaversine(
      clienteAtual.clienteOriginal.latitude,
      clienteAtual.clienteOriginal.longitude,
      cliente.clienteOriginal.latitude,
      cliente.clienteOriginal.longitude
    );

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      vizinhoMaisProximo = indice;
    }
  }

  return vizinhoMaisProximo;
}

// ============================================================================
// REGRA 5: VALIDAR GAP MÍNIMO (INTERCALAÇÃO)
// ============================================================================

/**
 * Verifica se alocar visita no dia respeitaria a restrição de intercalação (Gap).
 * 
 * LÓGICA CONDICIONAL POR FREQUÊNCIA:
 * 
 * - Se FREQUÊNCIA <= 4 (ESTRITA):
 *   Bloqueia mesmo-dia (diff=0) E dia seguinte (diff=1)
 *   Exige gap mínimo de 2 dias entre visitas
 *   Ex: Segunda [0] e Quarta [2] OK | Segunda [0] e Terça [1] BLOQUEADO
 * 
 * - Se FREQUÊNCIA > 4 (FLEXÍVEL - apenas freq=5):
 *   Permite dias seguidos quando necessário para completar frequência
 *   Único bloqueio: não permite 2+ visitas no MESMO dia (diff=0)
 *   Ex: Segunda [0] e Terça [1] OK | Segunda [0] e Segunda [0] BLOQUEADO
 * 
 * Rationale: Apenas clientes com frequência 5 (máximo possível em 6 dias úteis)
 * não têm dias suficientes com gap de 2 dias. Exemplo:
 *   Freq=5 (seg, ter, qua, qui, sex) impossível com gap=2
 *   Freq=4 com gap=2 → 3 dias possíveis (seg, qua, sex) = 4 necessários (crítico mas rígido)
 */
function verificarGapMinimo(clienteExp: ClienteExpandido, diaSemana: number): boolean {
  if (clienteExp.diasAlocados.size === 0) {
    // Primeira visita, sempre OK
    return true;
  }

  const frequencia = clienteExp.clienteOriginal.frequency;
  const diasArray = Array.from(clienteExp.diasAlocados);

  // Verificar restrição baseada na frequência do cliente
  for (const diaAlocado of diasArray) {
    const diff = Math.abs(diaSemana - diaAlocado);

    if (frequencia <= 4) {
      // FREQUÊNCIA ESTRITA: Bloqueia diff=0 E diff=1
      if (diff === 0 || diff === 1) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[GAP_BLOCK] ${clienteExp.clienteOriginal.name} (freq=${frequencia}): Tentativa alocar dia ${diaSemana} falhou, já tem dia ${diaAlocado}, diff=${diff}`);
        }
        return false; // Violaria restrição de gap mínimo de 2 dias
      }
    } else {
      // FREQUÊNCIA MUITO ALTA (freq=5): Bloqueia apenas diff=0 (mesmo dia)
      if (diff === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[SAME_DAY_BLOCK] ${clienteExp.clienteOriginal.name} (freq=${frequencia}): Tentativa alocar dia ${diaSemana} falhou, já tem dia ${diaAlocado}`);
        }
        return false; // Não pode alocar 2+ visitas no mesmo dia
      }
    }
  }

  return true;
}

// ============================================================================
// REGRA 6: VERIFICAR BLOQUEIOS DO VENDEDOR
// ============================================================================

/**
 * Retorna array boolean[6] com dias bloqueados para este cliente
 * true = promoter já vai visitar este dia (BLOQUEADO para novo cliente)
 * false = dia disponível para novo cliente
 */
function extrairDiasDisponiveisCliente(cliente: Client): boolean[] {
  // Retorna array de dias BLOQUEADOS (NOT disponível)
  // Se visitorDays.monday = false, significa que cliente NÃO está disponível segunda
  const diasBloqueados = [
    !cliente.visitorDays.monday,  // true = bloqueado
    !cliente.visitorDays.tuesday,
    !cliente.visitorDays.wednesday,
    !cliente.visitorDays.thursday,
    !cliente.visitorDays.friday,
    !cliente.visitorDays.saturday,
  ];
  
  // DEBUG: Para cliente específico
  if (cliente.name.includes('SUPERMERCADO PROGRESSO')) {
    console.log('[DAY_AVAILABILITY_CHECK]', cliente.name);
    console.log('  visitorDays:', cliente.visitorDays);
    console.log('  diasBloqueados (invertidos):', diasBloqueados);
  }
  
  return diasBloqueados;
}

// ============================================================================
// REGRA 3: TENTAR ALOCAR VISITA NO DIA
// ============================================================================

/**
 * Tenta encaixar uma visita no dia, considerando capacidade e distância.
 * IMPORTANTE: SEMPRE valida o gap usando a lógica condicional de frequência.
 * Retorna true se conseguiu alocar, false caso contrário
 */
function tentarAlocarVisitaNoDia(
  agenda: AgendaSemanal,
  diaSemana: number,
  clienteExp: ClienteExpandido,
  clientesNaRota: ClienteExpandido[],
  exigirGap: boolean = true
): boolean {
  const dia = agenda[diaSemana];

  // Verificar bloqueios do promoter (Regra 6)
  const diasBloqueados = extrairDiasDisponiveisCliente(clienteExp.clienteOriginal);
  if (diasBloqueados[diaSemana]) {
    return false; // Dia está bloqueado para este cliente
  }

  // Verificar se cliente já foi visitado neste dia (Regra 2: unicidade)
  if (clienteExp.diasAlocados.has(diaSemana)) {
    return false; // Cliente já tem visita agendada neste dia
  }

  // Verificar gap mínimo com lógica condicional de frequência (Regra 5)
  // SEMPRE aplicar - a lógica condicional dentro de verificarGapMinimo cuida da frequência
  if (!verificarGapMinimo(clienteExp, diaSemana)) {
    return false; // Gap violado (regra estrita para freq<3 ou mesmo-dia para freq>=3)
  }

  // Calcular tempo de deslocamento (Nearest Neighbor - Regra 1)
  let tempoDeslocamento = 0;
  if (dia.visitas.length > 0) {
    const ultimaVisita = dia.visitas[dia.visitas.length - 1];
    const distancia = calcularDistanciaHaversine(
      ultimaVisita.latitude,
      ultimaVisita.longitude,
      clienteExp.clienteOriginal.latitude,
      clienteExp.clienteOriginal.longitude
    );
    tempoDeslocamento = calcularTempoDeslocamento(distancia);
  }

  const duracao = clienteExp.clienteOriginal.visitDurationMinutes;
  const tempoTotal = tempoDeslocamento + duracao;

  // Verificar capacidade do dia (Regra 3)
  if (dia.tempoGasto + tempoTotal > dia.limite) {
    return false; // Não cabe na capacidade
  }

  // ✅ ALOCAR
  dia.visitas.push({
    clienteId: clienteExp.clienteOriginal.id,
    clienteNome: clienteExp.clienteOriginal.name,
    latitude: clienteExp.clienteOriginal.latitude,
    longitude: clienteExp.clienteOriginal.longitude,
    duracao: duracao,
    tempoDeslocamento: tempoDeslocamento,
    diaSemana: diaSemana,
  });

  dia.tempoGasto += tempoTotal;
  clienteExp.visitasAlocadas++;
  clienteExp.diasAlocados.add(diaSemana);

  return true;
}

// ============================================================================
// REGRA 4: PROCESSAR FREQUÊNCIA COM INTERCALAÇÃO
// ============================================================================

/**
 * Tenta alocar todas as visitas de um cliente respeitando frequência
 * LÓGICA DE FALLBACK: Tenta com gap mínimo primeiro. Se falhar, tenta em QUALQUER dia disponível.
 */
function processarFrequenciaCliente(
  agenda: AgendaSemanal,
  clienteExp: ClienteExpandido,
  clientesNaRota: ClienteExpandido[]
): void {
  const visitasNecessarias = clienteExp.clienteOriginal.frequency;
  
  // FASE 1: Tentar com gap mínimo (intercalação perfeita)
  let rodadasSemSucesso = 0;
  const maxRodadas = 10;
  
  while (clienteExp.visitasAlocadas < visitasNecessarias && rodadasSemSucesso < maxRodadas) {
    let alocouNesstaRodada = false;
    
    // Tentar cada dia (0-5: Segunda a Sábado) com exigência de gap
    for (let diaSemana = 0; diaSemana < 6; diaSemana++) {
      if (clienteExp.visitasAlocadas < visitasNecessarias) {
        if (tentarAlocarVisitaNoDia(agenda, diaSemana, clienteExp, clientesNaRota, true)) {
          alocouNesstaRodada = true;
          rodadasSemSucesso = 0;
          break;
        }
      }
    }
    
    if (!alocouNesstaRodada) {
      rodadasSemSucesso++;
    }
  }
  
  // FASE 2: FALLBACK - Se ainda não alocou todas as visitas, tenta em QUALQUER dia sem exigência de gap
  if (clienteExp.visitasAlocadas < visitasNecessarias) {
    let tentativasFallback = 0;
    const maxTentativasFallback = 20;
    
    while (clienteExp.visitasAlocadas < visitasNecessarias && tentativasFallback < maxTentativasFallback) {
      let alocouFallback = false;
      
      // Tentar QUALQUER dia (0-5: Segunda a Sábado) sem exigência de gap
      for (let diaSemana = 0; diaSemana < 6; diaSemana++) {
        if (clienteExp.visitasAlocadas < visitasNecessarias) {
          if (tentarAlocarVisitaNoDia(agenda, diaSemana, clienteExp, clientesNaRota, false)) {
            alocouFallback = true;
            break;
          }
        }
      }
      
      if (!alocouFallback) {
        tentativasFallback++;
      }
    }
  }
}

// ============================================================================
// REGRA 7: ORDENAR CLIENTES (FIRST FIT DECREASING)
// ============================================================================

/**
 * Ordena clientes por: Frequência DESC, Tempo de Visita DESC
 * Assim os "difíceis" são processados primeiro
 */
function ordenarClientesFFD(clientes: ClienteExpandido[]): ClienteExpandido[] {
  return [...clientes].sort((a, b) => {
    const frequenciaA = a.clienteOriginal.frequency;
    const frequenciaB = b.clienteOriginal.frequency;

    // Primeiro por frequência (descendente)
    if (frequenciaA !== frequenciaB) {
      return frequenciaB - frequenciaA;
    }

    // Depois por tempo de visita (descendente)
    const tempoA = a.clienteOriginal.visitDurationMinutes;
    const tempoB = b.clienteOriginal.visitDurationMinutes;
    return tempoB - tempoA;
  });
}

// ============================================================================
// FUNÇÃO PRINCIPAL: GERAR ROTEIRIZAÇÃO
// ============================================================================

export interface PromoterSchedule {
  promoterId: string;
  dailyRoutes: DailyRoute[];
  stats: {
    totalClientsRequested: number;
    totalClientsAllocated: number;
    allocationPercentage: number;
    averageUtilization: number;
    warnings: string[];
  };
}

export function gerarRoteirizacaoOtimizada(
  promoterId: string,
  clientes: Client[],
  workSchedule: WorkSchedule
): PromoterSchedule {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`[NOVO MOTOR] Gerando roteirização para: ${promoterId}`);
  console.log(`Clientes: ${clientes.length}`);
  console.log(`${'═'.repeat(70)}\n`);

  const warnings: string[] = [];

  // ✅ PASSO 0: Preparar clientes expandidos (Regra 2: unicidade de rota)
  const clientesExp: ClienteExpandido[] = clientes.map((cliente) => ({
    clienteOriginal: cliente,
    visitasRequisitadas: cliente.frequency,
    visitasAlocadas: 0,
    diasAlocados: new Set(),
  }));

  // ✅ PASSO 1: Ordenar por Frequência e Tempo (Regra 7)
  const clientesOrdenados = ordenarClientesFFD(clientesExp);

  // ✅ PASSO 2: Criar agenda semanal vazia
  const agenda: AgendaSemanal = {
    0: { nome: 'Segunda', diaSemana: 0, limite: 480, visitas: [], tempoGasto: 0 },
    1: { nome: 'Terça', diaSemana: 1, limite: 480, visitas: [], tempoGasto: 0 },
    2: { nome: 'Quarta', diaSemana: 2, limite: 480, visitas: [], tempoGasto: 0 },
    3: { nome: 'Quinta', diaSemana: 3, limite: 480, visitas: [], tempoGasto: 0 },
    4: { nome: 'Sexta', diaSemana: 4, limite: 480, visitas: [], tempoGasto: 0 },
    5: { nome: 'Sábado', diaSemana: 5, limite: 240, visitas: [], tempoGasto: 0 },
  };

  // Aplicar capacidades da jornada de trabalho se fornecidas
  if (workSchedule) {
    agenda[0].limite = (workSchedule.monday || 8) * 60;
    agenda[1].limite = (workSchedule.tuesday || 8) * 60;
    agenda[2].limite = (workSchedule.wednesday || 8) * 60;
    agenda[3].limite = (workSchedule.thursday || 8) * 60;
    agenda[4].limite = (workSchedule.friday || 8) * 60;
    agenda[5].limite = (workSchedule.saturday || 4) * 60; // Sábado: máximo 4h = 240min
  }

  // ✅ PASSO 3: Processar cada cliente (Regra 4: frequência + Regra 5: intercalação)
  for (const clienteExp of clientesOrdenados) {
    processarFrequenciaCliente(agenda, clienteExp, clientesOrdenados);

    // Avisar se não conseguiu alocar todas as visitas
    if (clienteExp.visitasAlocadas < clienteExp.visitasRequisitadas) {
      warnings.push(
        `⚠️ ${clienteExp.clienteOriginal.name}: ${clienteExp.visitasAlocadas}/${clienteExp.visitasRequisitadas} visitas alocadas`
      );
    }
  }

  // ✅ PASSO 3.5: Preencher horas do dia com clientes menores (Best Fit Packing)
  preencherCapacidadeDiaComBestFit(agenda, clientesOrdenados);

  // ✅ PASSO 4: Otimizar sequência por Nearest Neighbor (Regra 1)
  otimizarSequenciaNeighbor(agenda);

  // ✅ PASSO 5: Gerar rotas finais
  const dailyRoutes = gerarRotasFinais(promoterId, agenda);

  // ✅ CALCULAR ESTATÍSTICAS
  const totalClientesRequisitados = clientes.length;
  const totalClientesAlocados = clientesExp.filter((c) => c.visitasAlocadas > 0).length;
  const totalCapacidade = 480 * 5 + 240; // 5 dias úteis + sábado
  const totalUsado = Object.values(agenda).reduce((sum, dia) => sum + dia.tempoGasto, 0);
  const utilizacao = (totalUsado / totalCapacidade) * 100;

  console.log(`✅ Roteirização concluída:`);
  console.log(`   - Clientes alocados: ${totalClientesAlocados}/${totalClientesRequisitados}`);
  console.log(`   - Utilização média: ${utilizacao.toFixed(2)}%`);
  console.log(`   - Rotas geradas: ${dailyRoutes.length}`);
  console.log(`   - Avisos: ${warnings.length}`);

  return {
    promoterId,
    dailyRoutes,
    stats: {
      totalClientsRequested: totalClientesRequisitados,
      totalClientsAllocated: totalClientesAlocados,
      allocationPercentage: (totalClientesAlocados / totalClientesRequisitados) * 100,
      averageUtilization: utilizacao,
      warnings,
    },
  };
}

// ============================================================================
// OTIMIZAÇÃO: PREENCHER CAPACIDADE DO DIA (BEST FIT PACKING)
// ============================================================================

/**
 * Após alocação inicial, tenta preencher horas vazias do dia com clientes menores
 * não alocados ou parcialmente alocados, sem exigência de gap.
 */
function preencherCapacidadeDiaComBestFit(
  agenda: AgendaSemanal,
  clientesDisponiveis: ClienteExpandido[]
): void {
  // Ordenar clientes por tempo de visita (menor primeiro) para best-fit
  const clientesOrdenadosPorTempo = [...clientesDisponiveis].sort((a, b) => {
    return a.clienteOriginal.visitDurationMinutes - b.clienteOriginal.visitDurationMinutes;
  });

  // Para cada dia, tentar preencher espaço vazio
  for (const dia of Object.values(agenda)) {
    const tempoVazio = dia.limite - dia.tempoGasto;
    if (tempoVazio <= 0) continue; // Dia cheio

    // Tentar adicionar clientes menores que ainda não foram completamente alocados
    for (const clienteExp of clientesOrdenadosPorTempo) {
      if (clienteExp.visitasAlocadas >= clienteExp.visitasRequisitadas) {
        continue; // Cliente já tem todas as visitas
      }

      // Tentar alocar sem exigência de gap (fallback mode)
      if (tentarAlocarVisitaNoDia(agenda, dia.diaSemana, clienteExp, clientesDisponiveis, false)) {
        // Conseguiu! Recalcular tempo vazio
        const novoTempoVazio = dia.limite - dia.tempoGasto;
        if (novoTempoVazio <= 0) break; // Dia ficou cheio
      }
    }
  }
}

// ============================================================================
// OTIMIZAÇÃO: REORDENAR POR NEAREST NEIGHBOR
// ============================================================================

/**
 * Reordena clientes de cada dia usando Nearest Neighbor (Regra 1)
 */
function otimizarSequenciaNeighbor(agenda: AgendaSemanal): void {
  for (const dia of Object.values(agenda)) {
    if (dia.visitas.length <= 1) continue;

    const visitasOrdenadas: VisitaAgendada[] = [];
    const visitasRestantes = new Set(dia.visitas.map((_: VisitaAgendada, i: number) => i));

    // Começar com a primeira visita
    let indiceSelecionado = 0;
    visitasOrdenadas.push(dia.visitas[indiceSelecionado]);
    visitasRestantes.delete(indiceSelecionado);

    // Nearest Neighbor: sempre ir pro vizinho mais próximo
    while (visitasRestantes.size > 0) {
      const ultimaVisita = visitasOrdenadas[visitasOrdenadas.length - 1];
      let proximoIndice = -1;
      let distanciaMinima = Infinity;

      for (const indice of visitasRestantes) {
        const indiceNum = indice as number;
        const visita = dia.visitas[indiceNum];
        const distancia = calcularDistanciaHaversine(
          ultimaVisita.latitude,
          ultimaVisita.longitude,
          visita.latitude,
          visita.longitude
        );

        if (distancia < distanciaMinima) {
          distanciaMinima = distancia;
          proximoIndice = indiceNum;
        }
      }

      if (proximoIndice !== -1) {
        visitasOrdenadas.push(dia.visitas[proximoIndice]);
        visitasRestantes.delete(proximoIndice);
      }
    }

    dia.visitas = visitasOrdenadas;
  }
}

// ============================================================================
// GERAR ROTAS FINAIS (COM TEMPOS)
// ============================================================================

function gerarRotasFinais(promoterId: string, agenda: AgendaSemanal): DailyRoute[] {
  const rotas: DailyRoute[] = [];

  for (const dia of Object.values(agenda)) {
    if (dia.visitas.length === 0) continue;

    const paradas: RouteStop[] = [];
    let tempoAcumulado = 480; // Iniciar às 08:00 (480 minutos = 8 * 60)
    
    // Mapa para rastrear cliente para seu object visitorDays
    const clienteVisitorDaysMap = new Map<string, any>();

    for (let i = 0; i < dia.visitas.length; i++) {
      const visita = dia.visitas[i];

      // Recalcular tempo de deslocamento (mais preciso depois de reordenar)
      let tempoDeslocamento = 0;
      if (i > 0) {
        const visitaAnterior = dia.visitas[i - 1];
        const distancia = calcularDistanciaHaversine(
          visitaAnterior.latitude,
          visitaAnterior.longitude,
          visita.latitude,
          visita.longitude
        );
        tempoDeslocamento = calcularTempoDeslocamento(distancia);
      }

      tempoAcumulado += tempoDeslocamento;
      const horaChegada = formatarTempo(tempoAcumulado);

      tempoAcumulado += visita.duracao;
      const horaSaida = formatarTempo(tempoAcumulado);

      paradas.push({
        order: i + 1,
        clientId: visita.clienteId,
        clientName: visita.clienteNome,
        latitude: visita.latitude,
        longitude: visita.longitude,
        visitDurationMinutes: visita.duracao,
        travelTimeMinutes: tempoDeslocamento,
        arrivalTime: horaChegada,
        departureTime: horaSaida,
        frequency: 1,
        visitorDays: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
        },
      });
    }

    const tempoVisitaTotal = paradas.reduce((sum, p) => sum + p.visitDurationMinutes, 0);
    const tempoDeslocamentoTotal = paradas.reduce((sum, p) => sum + p.travelTimeMinutes, 0);

    rotas.push({
      day: DIAS_INGLES[dia.diaSemana],
      promoterId: promoterId,
      stops: paradas,
      totalTravelTimeMinutes: tempoDeslocamentoTotal,
      totalVisitTimeMinutes: tempoVisitaTotal,
      totalTimeMinutes: tempoDeslocamentoTotal + tempoVisitaTotal,
      routeNumber: rotas.length + 1,
    });
  }

  return rotas;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function formatarTempo(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
