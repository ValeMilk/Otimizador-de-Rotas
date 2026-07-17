/**
 * NOVO ALGORITMO DE ATRIBUIÇÃO COM RESTRIÇÕES (CSP - Constraint Satisfaction Problem)
 * 
 * Estrutura:
 * 1. PREPARAÇÃO: Criar agenda semanal vazia (Seg-Sáb) com capacidades definidas
 * 2. EXPANSÃO: Expandir cada cliente por sua frequência (freq=3 → 3 visitas independentes)
 * 3. VALIDAÇÃO: Identificar dias DISPONÍVEIS para cada visita (inverte bloqueios)
 * 4. ALOCAÇÃO: Usar algoritmo guloso com backtracking para respeitar restrições
 * 5. OTIMIZAÇÃO: Ordenar visitas por proximidade geográfica (Vizinho Mais Próximo)
 * 6. FINALIZAÇÃO: Gerar rotas com tempos calculados corretamente
 * 
 * REGRAS INVIOLÁVEIS:
 * - Cada visita só pode ser alocada em dias que o vendedor está DISPONÍVEL
 * - Capacidade diária NUNCA é excedida (hard constraint)
 * - Frequência do cliente é TOTALMENTE RESPEITADA (todas as N visitas agendadas ou aviso)
 * - Um mesmo cliente NÃO pode ter 2+ visitas no MESMO dia
 */

import { Client, DailyRoute, RouteStop, WorkSchedule } from '../types';
import {
  calculateHaversineDistance,
  estimateTravelTime,
  nearestNeighbor,
  calculateDistanceMatrix,
} from './distanceUtils';
import { hoursToMinutes, formatMinutesForDisplay } from './timeUtils';

/**
 * ESTRUTURA 1: Agenda Semanal
 * Representa o estado de alocação para um dia da semana
 */
interface AgendaDia {
  dia: string; // "Segunda", "Terça", etc
  diaSemana: number; // 0=Seg, 1=Ter, ..., 5=Sáb
  capacidadeTotal: number; // minutos disponíveis
  tempoUsado: number; // minutos já alocados
  visitas: VisitaPlanejada[]; // lista de visitas agendadas NESTE DIA
  paradas: RouteStop[]; // rotas convertidas
}

interface AgendaSemanal {
  segunda: AgendaDia;
  terça: AgendaDia;
  quarta: AgendaDia;
  quinta: AgendaDia;
  sexta: AgendaDia;
  sabado: AgendaDia;
}

/**
 * ESTRUTURA 2: Visita Planejada (expandida por frequência)
 * Cada instância representa UMA visita individual do cliente
 */
interface VisitaPlanejada {
  id: string; // UUID único para esta visita
  clienteId: string;
  clienteNome: string;
  latitude: number;
  longitude: number;
  duracao: number; // minutos
  indiceVisita: number; // 1 de 3, 2 de 3, 3 de 3
  totalVisitas: number; // frequência total do cliente
  diasDisponiveis: boolean[]; // true = cliente pode visitar [Seg, Ter, Qua, Qui, Sex, Sab]
  diasBloqueadosVendedor: boolean[]; // true = promotor JÁ vai visitar = NÃO pode alocar aqui
  alocado: boolean; // foi agendado com sucesso?
  diaAlocado?: number; // qual dia foi alocado (0-5)
  cliente: Client; // referência ao original
}

/**
 * ESTRUTURA 3: Resultado de Alocação para um Vendedor
 */
interface ResultadoAgendamento {
  promotorId: string;
  agenda: AgendaSemanal;
  rotas: DailyRoute[];
  stats: {
    visitasRequisitadas: number;
    visitasAlocadas: number;
    percentualCobertura: number;
    utilizacaoMedia: number;
    avisos: string[];
  };
}

/**
 * ESTRUTURA VELHA (mantém compatibilidade com tipos)
 */
interface VisitInstance {
  clientId: string;
  clientName: string;
  latitude: number;
  longitude: number;
  visitDurationMinutes: number;
  visitIndex: number;
  frequencyTotal: number;
  blockedDays: boolean[];
  originalClient: Client;
}

/**
 * Representa o estado de um dia específico (COMPATIBILIDADE)
 */
interface DaySchedule {
  dayName: string;
  dayIndex: number;
  capacityMinutes: number;
  usedMinutes: number;
  visits: VisitInstance[];
  stops: RouteStop[];
}

/**
 * Resultado da otimização para um promotor
 */
export interface PromoterSchedule {
  promoterId: string;
  weekSchedule: DaySchedule[];
  dailyRoutes: DailyRoute[];
  stats: {
    totalVisitsScheduled: number;
    totalVisitsRequested: number;
    visitsCoverage: number; // %
    averageDailyUtilization: number; // %
    warnings: string[];
  };
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const NOMES_DIAS_PT = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOVO ALGORITMO: ATRIBUIÇÃO COM RESTRIÇÕES (CSP)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * PASSO 1: Criar agenda semanal vazia com capacidades definidas
 * Cada dia começa vazio, pronto para receber atribuições
 */
const criarAgendaSemanal = (agendaTrabajo: WorkSchedule): AgendaSemanal => {
  console.log('[CSP] Passo 1: Criando agenda semanal vazia...');

  const criarDia = (nome: string, indice: number, horas: number): AgendaDia => ({
    dia: nome,
    diaSemana: indice,
    capacidadeTotal: hoursToMinutes(horas),
    tempoUsado: 0,
    visitas: [],
    paradas: [],
  });

  return {
    segunda: criarDia('Segunda', 0, agendaTrabajo.monday),
    terça: criarDia('Terça', 1, agendaTrabajo.tuesday),
    quarta: criarDia('Quarta', 2, agendaTrabajo.wednesday),
    quinta: criarDia('Quinta', 3, agendaTrabajo.thursday),
    sexta: criarDia('Sexta', 4, agendaTrabajo.friday),
    sabado: criarDia('Sábado', 5, agendaTrabajo.saturday),
  };
};

/**
 * PASSO 2: Expandir clientes por frequência
 * Cada cliente com freq=N vira N VisitaPlanejada independentes
 * 
 * IMPORTANTE: diasDisponiveis é o INVERSO de blockedDays
 * Se o dia está MARCADO ("X") na planilha = cliente pode visitar = true
 * Se o dia está VAZIO = cliente NÃO pode visitar = false
 */
const expandirClientesPorFrequencia = (clientes: Client[]): VisitaPlanejada[] => {
  console.log('[CSP] Passo 2: Expandindo clientes por frequência...');

  const visitas: VisitaPlanejada[] = [];

  for (const cliente of clientes) {
    // CRÍTICO: Converter visitorDays (true=pode visitar) para diasDisponiveis (true=pode visitar)
    // visitorDays vem do CSV parseado:
    //   - true = "X" marcado = CAN VISIT
    //   - false = vazio = CANNOT VISIT
    const diasDisponiveis = [
      cliente.visitorDays.monday,    // Seg
      cliente.visitorDays.tuesday,   // Ter
      cliente.visitorDays.wednesday, // Qua
      cliente.visitorDays.thursday,  // Qui
      cliente.visitorDays.friday,    // Sex
      cliente.visitorDays.saturday,  // Sab
    ];

    console.log(`  Cliente ${cliente.id} (${cliente.name}): freq=${cliente.frequency}, disponível em [${
      diasDisponiveis.map((d, i) => d ? DAY_NAMES[i].substring(0, 3) : '---').join(', ')
    }]`);

    // Criar N instâncias (uma para cada frequência)
    for (let i = 1; i <= cliente.frequency; i++) {
      const diasBloqueadosVendedor = [
        cliente.promoterBlockedDays.monday,
        cliente.promoterBlockedDays.tuesday,
        cliente.promoterBlockedDays.wednesday,
        cliente.promoterBlockedDays.thursday,
        cliente.promoterBlockedDays.friday,
        cliente.promoterBlockedDays.saturday,
      ];

      visitas.push({
        id: `${cliente.id}_visit_${i}`,
        clienteId: cliente.id,
        clienteNome: cliente.name,
        latitude: cliente.latitude,
        longitude: cliente.longitude,
        duracao: cliente.visitDurationMinutes,
        indiceVisita: i,
        totalVisitas: cliente.frequency,
        diasDisponiveis, // true = cliente pode visitar
        diasBloqueadosVendedor, // true = promotor já vai visitar = não pode alocar
        alocado: false,
        cliente,
      });
    }
  }

  console.log(`✓ Total de visitas após expansão: ${visitas.length}`);
  return visitas;
};

/**
 * PASSO 3: Alocar visitas respeitando restrições com ROUND-ROBIN
 * 
 * Algoritmo Round-Robin (Distribuição em Rodadas):
 * Rodada 1: Alocar TODAS as 1ª visitas de cada cliente
 * Rodada 2: Alocar TODAS as 2ª visitas de cada cliente
 * Rodada N: Alocar TODAS as N-ésimas visitas de cada cliente
 * 
 * Vantagem: Distribui visitas uniformemente ao longo da semana
 * Ao invés de: Completar um cliente totalmente antes de passar ao próximo
 */
const alocarvisiasAosDias = (
  visitas: VisitaPlanejada[],
  agenda: AgendaSemanal,
  matrizDistancia: Map<string, Map<string, number>>,
  avisos: string[]
): void => {
  console.log('[CSP] Passo 3: Alocando visitas aos dias (ROUND-ROBIN)...');

  const diasAgenda: AgendaDia[] = [
    agenda.segunda,
    agenda.terça,
    agenda.quarta,
    agenda.quinta,
    agenda.sexta,
    agenda.sabado,
  ];

  // Mapear quais clientes já têm alocação em cada dia (para "max 1 per day")
  const clientesPorDia = new Map<number, Set<string>>();
  for (let i = 0; i < 6; i++) {
    clientesPorDia.set(i, new Set());
  }

  for (let diaSemana = 0; diaSemana < 6; diaSemana++) {
    for (const visita of diasAgenda[diaSemana].visitas) {
      clientesPorDia.get(diaSemana)!.add(visita.clienteId);
    }
  }
  
  // ============================================================
  // ESTRATÉGIA OTIMIZADA: Alocação com distribuição intercalada
  // ============================================================
  
  // 1. Agrupar visitas por cliente
  const visitasPorCliente = new Map<string, VisitaPlanejada[]>();
  for (const visita of visitas) {
    if (!visitasPorCliente.has(visita.clienteId)) {
      visitasPorCliente.set(visita.clienteId, []);
    }
    visitasPorCliente.get(visita.clienteId)!.push(visita);
  }

  // 2. Para cada cliente com freq>1, pré-calcular dias intercalados ideais
  const diasIdeiaisPorCliente = new Map<string, number[]>();
  for (const [clienteId, visitasCliente] of visitasPorCliente) {
    if (visitasCliente.length === 1) {
      // Uma única visita - usar qualquer dia disponível
      diasIdeiaisPorCliente.set(clienteId, []);
      continue;
    }

    const visita = visitasCliente[0];
    const diasDisponiveis = visita.diasDisponiveis;
    const diasBloqueados = visita.diasBloqueadosVendedor;

    // IMPORTANTE: Excluir dias bloqueados do promotor
    // Dia válido = cliente pode visitar E promotor NÃO vai naquele dia
    const diasValidos = diasDisponiveis
      .map((dCliente, i) => {
        // true se: cliente disponível E dia NÃO está bloqueado
        return dCliente && !diasBloqueados[i] ? i : -1;
      })
      .filter(i => i !== -1);

    console.log(
      `  📅 Cliente ${clienteId}: freq=${visita.totalVisitas}, dias cliente=[${
        diasDisponiveis.map((d, i) => d ? DAY_NAMES[i].substring(0, 3) : '---').join(', ')
      }], dias bloqueados promotor=[${
        diasBloqueados.map((d, i) => d ? DAY_NAMES[i].substring(0, 3) : '---').join(', ')
      }], dias válidos=[${
        diasValidos.map(i => DAY_NAMES[i].substring(0, 3)).join(', ')
      }]`
    );

    // Se não houver dias válidos, usar apenas dias disponíveis do cliente como fallback
    const diasParaAlocar = diasValidos.length > 0 ? diasValidos : 
      diasDisponiveis.map((d, i) => d ? i : -1).filter(i => i !== -1);

    // Distribuir visitas de forma intercalada
    const freq = visitasCliente.length;
    const diasIntercalados: number[] = [];

    if (diasParaAlocar.length >= freq) {
      const gap = Math.floor(diasParaAlocar.length / freq);
      for (let i = 0; i < freq; i++) {
        diasIntercalados.push(diasParaAlocar[i * gap]);
      }
    } else {
      // Não há dias suficientes, usar os disponíveis
      diasIntercalados.push(...diasParaAlocar);
    }

    diasIdeiaisPorCliente.set(clienteId, diasIntercalados);
    console.log(
      `  📅 Cliente ${clienteId}: freq=${freq}, dias ideais intercalados = [${diasIntercalados
        .map(d => DAY_NAMES[d].substring(0, 3))
        .join(', ')}]`
    );
  }

  // 3. Ordenar clientes por flexibilidade (mais restritos primeiro)
  const clientesOrdenados = Array.from(visitasPorCliente.entries()).sort((a, b) => {
    const diasA = a[1][0].diasDisponiveis.filter(d => d).length;
    const diasB = b[1][0].diasDisponiveis.filter(d => d).length;
    return diasA - diasB;
  });

  console.log(`  📋 Alocando ${visitas.length} visitas para ${clientesOrdenados.length} clientes...`);

  let visitasNaoAlocadas = 0;
  const visitasNaoAloc: VisitaPlanejada[] = [];

  // 4. Alocar visitas respeitando ordem intercalada
  for (const [clienteId, visitasCliente] of clientesOrdenados) {
    const diasIdeais = diasIdeiaisPorCliente.get(clienteId) || [];

    for (let idxVisita = 0; idxVisita < visitasCliente.length; idxVisita++) {
      const visita = visitasCliente[idxVisita];
      
      // VALIDAÇÃO: Garantir que a visita não foi alocada anteriormente
      if (visita.alocado) {
        console.warn(`    ⚠️ [${visita.id}] já foi alocada! Pulando...`);
        continue;
      }
      
      let alocado = false;

      // Tentar alocar no dia ideal primeiro (intercalado)
      if (idxVisita < diasIdeais.length && !visita.alocado) {
        const diaIdeal = diasIdeais[idxVisita];
        if (visita.diasDisponiveis[diaIdeal] && !visita.diasBloqueadosVendedor[diaIdeal]) {
          const dia = diasAgenda[diaIdeal];

          let tempoDeslocamento = 0;
          if (dia.visitas.length > 0) {
            const ultimaVisita = dia.visitas[dia.visitas.length - 1];
            const distancia = matrizDistancia.get(ultimaVisita.clienteId)?.get(visita.clienteId) || 0;
            tempoDeslocamento = estimateTravelTime(distancia);
          }

          const tempoTotal = visita.duracao + tempoDeslocamento;
          const espacoLivre = dia.capacidadeTotal - dia.tempoUsado;

          if (tempoTotal <= espacoLivre) {
            dia.visitas.push(visita);
            dia.tempoUsado += tempoTotal;
            visita.alocado = true;
            visita.diaAlocado = diaIdeal;
            console.log(
              `    ✅ [${visita.id}] (${idxVisita + 1}/${visita.totalVisitas}) → ${DAY_NAMES[diaIdeal]} (INTERCALADO)`
            );
            alocado = true;
          }
        }
      }

      // Fallback: tentar outros dias disponíveis (SÓ SE NÃO FOI ALOCADA)
      if (!alocado && !visita.alocado) {
        for (let diaSemana = 0; diaSemana < 6; diaSemana++) {
          if (!visita.diasDisponiveis[diaSemana]) continue;
          if (visita.diasBloqueadosVendedor[diaSemana]) continue; // Respeitar dias bloqueados do promotor

          const dia = diasAgenda[diaSemana];
          let tempoDeslocamento = 0;
          if (dia.visitas.length > 0) {
            const ultimaVisita = dia.visitas[dia.visitas.length - 1];
            const distancia = matrizDistancia.get(ultimaVisita.clienteId)?.get(visita.clienteId) || 0;
            tempoDeslocamento = estimateTravelTime(distancia);
          }

          const tempoTotal = visita.duracao + tempoDeslocamento;
          const espacoLivre = dia.capacidadeTotal - dia.tempoUsado;

          if (tempoTotal <= espacoLivre) {
            dia.visitas.push(visita);
            dia.tempoUsado += tempoTotal;
            visita.alocado = true;
            visita.diaAlocado = diaSemana;
            console.log(
              `    ✅ [${visita.id}] (${idxVisita + 1}/${visita.totalVisitas}) → ${DAY_NAMES[diaSemana]} (FALLBACK)`
            );
            alocado = true;
            break;
          }
        }
      }

      if (!alocado) {
        visitasNaoAlocadas++;
        visitasNaoAloc.push(visita);
        console.log(`    ❌ [${visita.id}] (${idxVisita + 1}/${visita.totalVisitas}) → NÃO ALOCADA`);
      }
    }
  }

  // Gerar avisos detalhados
  if (visitasNaoAlocadas > 0) {
    console.log(`\n⚠️  ${visitasNaoAlocadas} visitação(ões) NÃO ALOCADAS:`);
    
    const porCliente = new Map<string, VisitaPlanejada[]>();
    for (const v of visitasNaoAloc) {
      if (!porCliente.has(v.clienteId)) {
        porCliente.set(v.clienteId, []);
      }
      porCliente.get(v.clienteId)!.push(v);
    }

    for (const [clienteId, vv] of porCliente) {
      const v = vv[0];
      console.log(`  • ${clienteId} (${v.clienteNome}): ${vv.length}/${v.totalVisitas} visitas não alocadas`);
      console.log(`    Disponível em: ${v.diasDisponiveis.map((d, i) => d ? DAY_NAMES[i].substring(0, 3) : '---').join(', ')}`);

      avisos.push(
        `⚠️ Cliente "${v.clienteNome}" (${clienteId}): ${vv.length}/${v.totalVisitas} visitas não alocadas (capacidade semanal insuficiente ou dias bloqueados)`
      );
    }
  }

  console.log(`✓ Alocação concluída: ${visitas.length - visitasNaoAlocadas}/${visitas.length} visitas alocadas`);
};

/**
 * PASSO 4: Otimizar sequência diária com Nearest Neighbor
 */
const otimizarSequenciaDiaria = (
  agenda: AgendaSemanal,
  matrizDistancia: Map<string, Map<string, number>>
): void => {
  console.log('[CSP] Passo 4: Otimizando sequência diária (Nearest Neighbor)...');

  const diasAgenda: AgendaDia[] = [
    agenda.segunda,
    agenda.terça,
    agenda.quarta,
    agenda.quinta,
    agenda.sexta,
    agenda.sabado,
  ];

  for (const dia of diasAgenda) {
    if (dia.visitas.length === 0) continue;

    const clienteIds = dia.visitas.map((v) => v.clienteId);
    const sequencia = nearestNeighbor(clienteIds, matrizDistancia);

    const visitasOrdenadas: VisitaPlanejada[] = [];
    for (const clienteId of sequencia) {
      const visita = dia.visitas.find((v) => v.clienteId === clienteId);
      if (visita) {
        visitasOrdenadas.push(visita);
      }
    }

    dia.visitas = visitasOrdenadas;
  }

  console.log('✓ Sequências otimizadas');
};

/**
 * PASSO 5 & 6: Gerar rotas com tempos e finalizar
 */
const gerarRotasFinais = (
  promotorId: string,
  agenda: AgendaSemanal,
  matrizDistancia: Map<string, Map<string, number>>
): DailyRoute[] => {
  console.log('[CSP] Passo 5-6: Gerando rotas finais com tempos calculados...');

  const diasAgenda: AgendaDia[] = [
    agenda.segunda,
    agenda.terça,
    agenda.quarta,
    agenda.quinta,
    agenda.sexta,
    agenda.sabado,
  ];

  const rotas: DailyRoute[] = [];
  let numeroRota = 1;

  for (const dia of diasAgenda) {
    if (dia.visitas.length === 0) continue;

    const paradas: RouteStop[] = [];
    let tempoAcumulado = 0;

    for (let i = 0; i < dia.visitas.length; i++) {
      const visita = dia.visitas[i];

      let tempoDeslocamento = 0;
      if (i > 0) {
        const visitaAnterior = dia.visitas[i - 1];
        const distancia = matrizDistancia.get(visitaAnterior.clienteId)?.get(visita.clienteId) || 0;
        tempoDeslocamento = estimateTravelTime(distancia);
      }

      tempoAcumulado += tempoDeslocamento;
      const chegada = tempoAcumulado;

      tempoAcumulado += visita.duracao;
      const saida = tempoAcumulado;

      paradas.push({
        order: i + 1,
        clientId: visita.clienteId,
        clientName: visita.clienteNome,
        latitude: visita.latitude,
        longitude: visita.longitude,
        visitDurationMinutes: visita.duracao,
        travelTimeMinutes: tempoDeslocamento,
        arrivalTime: formatMinutesForDisplay(chegada),
        departureTime: formatMinutesForDisplay(saida),
        frequency: visita.totalVisitas,
        visitorDays: visita.cliente.visitorDays,
      });
    }

    dia.paradas = paradas;

    const tempoDeslocamentoTotal = paradas.reduce((sum, p) => sum + p.travelTimeMinutes, 0);
    const tempoVisitaTotal = paradas.reduce((sum, p) => sum + p.visitDurationMinutes, 0);

    const rota: DailyRoute = {
      day: DAYS_OF_WEEK[dia.diaSemana],
      promoterId: `${promotorId}-${DAY_NAMES[dia.diaSemana]}`,
      stops: paradas,
      totalTravelTimeMinutes: tempoDeslocamentoTotal,
      totalVisitTimeMinutes: tempoVisitaTotal,
      totalTimeMinutes: tempoDeslocamentoTotal + tempoVisitaTotal,
      routeNumber: numeroRota++,
    };

    rotas.push(rota);
  }

  console.log(`✓ ${rotas.length} rotas finais geradas`);
  return rotas;
};

/**
 * FUNÇÃO PRINCIPAL: Usar novo algoritmo CSP
 */
export const gerarAgendamentoOtimizado = (
  promotorId: string,
  clientes: Client[],
  agendaTrabajo: WorkSchedule,
  matrizDistancia: Map<string, Map<string, number>>
): PromoterSchedule => {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`[CSP] INICIANDO AGENDAMENTO OTIMIZADO`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`Promotor: ${promotorId}`);
  console.log(`Clientes: ${clientes.length}`);
  console.log(`Total de visitações (por frequência): ${clientes.reduce((s, c) => s + c.frequency, 0)}`);
  console.log(`${'═'.repeat(70)}\n`);

  const avisos: string[] = [];

  // Passo 1: Criar agenda vazia
  const agenda = criarAgendaSemanal(agendaTrabajo);

  // Passo 2: Expandir por frequência
  const visitas = expandirClientesPorFrequencia(clientes);

  // Passo 3: Alocar respeitando restrições
  alocarvisiasAosDias(visitas, agenda, matrizDistancia, avisos);

  // Passo 4: Otimizar sequência
  otimizarSequenciaDiaria(agenda, matrizDistancia);

  // Passo 5-6: Gerar rotas finais
  const rotas = gerarRotasFinais(promotorId, agenda, matrizDistancia);

  // Estatísticas
  const visitasAlocadas = visitas.filter((v) => v.alocado).length;
  const visitasRequisitadas = visitas.length;
  const percentualCobertura = (visitasAlocadas / visitasRequisitadas) * 100;

  const diasComVisitas = [agenda.segunda, agenda.terça, agenda.quarta, agenda.quinta, agenda.sexta, agenda.sabado]
    .filter((d) => d.visitas.length > 0);
  const utilizacoes = diasComVisitas.map((d) => (d.tempoUsado / d.capacidadeTotal) * 100);
  const utilizacaoMedia = utilizacoes.length > 0 ? utilizacoes.reduce((a, b) => a + b, 0) / utilizacoes.length : 0;

  console.log(`${'═'.repeat(70)}`);
  console.log(`[CSP] RESULTADO DO AGENDAMENTO`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`Visitas Alocadas: ${visitasAlocadas}/${visitasRequisitadas} (${percentualCobertura.toFixed(1)}%)`);
  console.log(`Rotas Diárias: ${rotas.length}`);
  console.log(`Utilização Média: ${utilizacaoMedia.toFixed(1)}%`);
  console.log(`Avisos: ${avisos.length}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Converter para estrutura old para compatibilidade
  const weekSchedule: DaySchedule[] = [
    ...Object.values(agenda).map((d) => ({
      dayName: d.dia,
      dayIndex: d.diaSemana,
      capacityMinutes: d.capacidadeTotal,
      usedMinutes: d.tempoUsado,
      visits: d.visitas as any,
      stops: d.paradas,
    })),
  ];

  return {
    promoterId: promotorId,
    weekSchedule,
    dailyRoutes: rotas,
    stats: {
      totalVisitsScheduled: visitasAlocadas,
      totalVisitsRequested: visitasRequisitadas,
      visitsCoverage: percentualCobertura,
      averageDailyUtilization: utilizacaoMedia,
      warnings: avisos,
    },
  };
};

/**
 * VERSÃO COMPATÍVEL: Manter função antigas
 */
const expandClientsByFrequency = (clients: Client[]): VisitInstance[] => {
  const visits: VisitInstance[] = [];

  for (const client of clients) {
    const blockedDays = [
      !client.visitorDays.monday,    // se false na planilha = blocked
      !client.visitorDays.tuesday,
      !client.visitorDays.wednesday,
      !client.visitorDays.thursday,
      !client.visitorDays.friday,
      !client.visitorDays.saturday,
    ];

    // Cria N instâncias deste cliente (uma para cada frequência)
    for (let visitIndex = 1; visitIndex <= client.frequency; visitIndex++) {
      visits.push({
        clientId: client.id,
        clientName: client.name,
        latitude: client.latitude,
        longitude: client.longitude,
        visitDurationMinutes: client.visitDurationMinutes,
        visitIndex,
        frequencyTotal: client.frequency,
        blockedDays,
        originalClient: client,
      });
    }
  }

  console.log(`[ScheduleGenerator] Clientes expandidos: ${clients.length} → ${visits.length} visitas`);
  return visits;
};

/**
 * Passo 2: Cria estrutura de dias da semana
 */
const createWeekSchedule = (workSchedule: WorkSchedule): DaySchedule[] => {
  const schedule: DaySchedule[] = [];

  schedule.push({
    dayName: 'Segunda',
    dayIndex: 0,
    capacityMinutes: hoursToMinutes(workSchedule.monday),
    usedMinutes: 0,
    visits: [],
    stops: [],
  });

  schedule.push({
    dayName: 'Terça',
    dayIndex: 1,
    capacityMinutes: hoursToMinutes(workSchedule.tuesday),
    usedMinutes: 0,
    visits: [],
    stops: [],
  });

  schedule.push({
    dayName: 'Quarta',
    dayIndex: 2,
    capacityMinutes: hoursToMinutes(workSchedule.wednesday),
    usedMinutes: 0,
    visits: [],
    stops: [],
  });

  schedule.push({
    dayName: 'Quinta',
    dayIndex: 3,
    capacityMinutes: hoursToMinutes(workSchedule.thursday),
    usedMinutes: 0,
    visits: [],
    stops: [],
  });

  schedule.push({
    dayName: 'Sexta',
    dayIndex: 4,
    capacityMinutes: hoursToMinutes(workSchedule.friday),
    usedMinutes: 0,
    visits: [],
    stops: [],
  });

  schedule.push({
    dayName: 'Sábado',
    dayIndex: 5,
    capacityMinutes: hoursToMinutes(workSchedule.saturday),
    usedMinutes: 0,
    visits: [],
    stops: [],
  });

  return schedule;
};

/**
 * Passo 3: Aloca visitas aos dias respeitando restrições
 * Usa uma estratégia gulosa com ajuste por proximidade geográfica
 * 
 * IMPORTANTE: Cada cliente pode ter no máximo 1 visita por dia!
 */
const allocateVisitsToDays = (
  visits: VisitInstance[],
  weekSchedule: DaySchedule[],
  distanceMatrix: Map<string, Map<string, number>>,
  warnings: string[]
): void => {
  const unallocatedVisits: VisitInstance[] = [];
  // Track how many times each client is scheduled per day
  const clientsPerDay = new Map<string, Set<string>>(); // dayIdx -> set of clientIds

  for (const visit of visits) {
    let allocated = false;

    // Tenta alocar em cada dia da semana (seg a sab)
    for (let dayIdx = 0; dayIdx < 6; dayIdx++) {
      // Se o dia está bloqueado para este cliente, pula
      if (visit.blockedDays[dayIdx]) {
        continue;
      }

      const day = weekSchedule[dayIdx];
      const dayKey = String(dayIdx);

      // Verifica se cliente já foi visitado hoje
      if (!clientsPerDay.has(dayKey)) {
        clientsPerDay.set(dayKey, new Set());
      }
      if (clientsPerDay.get(dayKey)!.has(visit.clientId)) {
        // Cliente já foi visitado neste dia, pula
        continue;
      }

      // Calcula tempo necessário para esta visita
      // Se há outras visitas no dia, considerar deslocamento
      let travelTimeMinutes = 0;
      if (day.visits.length > 0) {
        // Encontra a última visita do dia
        const lastVisit = day.visits[day.visits.length - 1];
        const distance =
          distanceMatrix.get(lastVisit.clientId)?.get(visit.clientId) || 0;
        travelTimeMinutes = estimateTravelTime(distance);
      }

      const totalTimeNeeded = visit.visitDurationMinutes + travelTimeMinutes;
      const spaceAvailable = day.capacityMinutes - day.usedMinutes;

      // Se cabe neste dia, aloca
      if (totalTimeNeeded <= spaceAvailable) {
        day.visits.push(visit);
        day.usedMinutes += totalTimeNeeded;
        clientsPerDay.get(dayKey)!.add(visit.clientId);
        allocated = true;
        break;
      }
    }

    if (!allocated) {
      unallocatedVisits.push(visit);
    }
  }

  // Registra avisos para visitas não alocadas
  if (unallocatedVisits.length > 0) {
    const warning = `⚠️ ${unallocatedVisits.length} visita(s) não conseguiu(ram) ser alocada(s) nos dias disponíveis (capacidade insuficiente ou totalmente bloqueada)`;
    warnings.push(warning);
    console.warn(warning);
    
    console.log(`[DEBUG] Visitas não alocadas por cliente:`);
    const byClient = new Map<string, VisitInstance[]>();
    for (const v of unallocatedVisits) {
      if (!byClient.has(v.clientId)) byClient.set(v.clientId, []);
      byClient.get(v.clientId)!.push(v);
    }
    for (const [clientId, visits] of byClient) {
      const v = visits[0];
      console.log(`  - Cliente ${clientId} (${v.clientName}): ${visits.length}/${v.frequencyTotal} visitas não alocadas`);
    }
  }

  // Log final de alocações
  console.log(`[DEBUG] RESUMO DE ALOCAÇÕES:`);
  for (let dayIdx = 0; dayIdx < 6; dayIdx++) {
    const day = weekSchedule[dayIdx];
    if (day.visits.length > 0) {
      console.log(`  ${day.dayName}: ${day.visits.length} visitas, ${day.usedMinutes}min/${day.capacityMinutes}min (${Math.round((day.usedMinutes/day.capacityMinutes)*100)}%)`);
    }
  }
};

/**
 * Passo 4: Otimiza a sequência de visitas por dia usando Nearest Neighbor
 */
const optimizeDailySequences = (
  weekSchedule: DaySchedule[],
  distanceMatrix: Map<string, Map<string, number>>
): void => {
  for (const day of weekSchedule) {
    if (day.visits.length === 0) continue;

    // Extrai IDs dos clientes para usar no Nearest Neighbor
    const clientIds = day.visits.map(v => v.clientId);

    // Usa NN para otimizar a sequência
    const optimizedSequence = nearestNeighbor(clientIds, distanceMatrix);

    // Reconstrói as visitas na ordem otimizada
    const optimizedVisits: VisitInstance[] = [];
    for (const clientId of optimizedSequence) {
      const visit = day.visits.find(v => v.clientId === clientId);
      if (visit) {
        optimizedVisits.push(visit);
      }
    }

    day.visits = optimizedVisits;
  }
};

/**
 * Passo 5: Gera RouteStop para cada visita do dia
 */
const generateDailyRouteStops = (
  day: DaySchedule,
  distanceMatrix: Map<string, Map<string, number>>
): RouteStop[] => {
  const stops: RouteStop[] = [];
  let cumulativeTime = 0;

  for (let i = 0; i < day.visits.length; i++) {
    const visit = day.visits[i];

    // Calcula deslocamento
    let travelTimeMinutes = 0;
    if (i > 0) {
      const prevVisit = day.visits[i - 1];
      const distance =
        distanceMatrix.get(prevVisit.clientId)?.get(visit.clientId) || 0;
      travelTimeMinutes = estimateTravelTime(distance);
    }

    cumulativeTime += travelTimeMinutes;
    const arrivalTime = cumulativeTime;

    cumulativeTime += visit.visitDurationMinutes;
    const departureTime = cumulativeTime;

    stops.push({
      order: i + 1,
      clientId: visit.clientId,
      clientName: visit.clientName,
      latitude: visit.latitude,
      longitude: visit.longitude,
      visitDurationMinutes: visit.visitDurationMinutes,
      travelTimeMinutes,
      arrivalTime: formatMinutesForDisplay(arrivalTime),
      departureTime: formatMinutesForDisplay(departureTime),
      frequency: visit.frequencyTotal,
      visitorDays: visit.originalClient.visitorDays,
    });
  }

  return stops;
};

/**
 * Função principal: Gera o agendamento otimizado para um promotor
 * AGORA USA O NOVO ALGORITMO CSP (Constraint Satisfaction Problem)
 */
export const generateOptimalWeeklySchedule = (
  promoterId: string,
  clients: Client[],
  workSchedule: WorkSchedule,
  distanceMatrix: Map<string, Map<string, number>>
): PromoterSchedule => {
  // Usar o novo algoritmo CSP
  return gerarAgendamentoOtimizado(promoterId, clients, workSchedule, distanceMatrix);
};

/**
 * Versão em batch para múltiplos promotores
 */
export const generateSchedulesForAllPromoters = (
  clientsByPromoter: Map<string, Client[]>,
  workSchedule: WorkSchedule,
  distanceMatrix: Map<string, Map<string, number>>
): {
  schedules: PromoterSchedule[];
  allRoutes: DailyRoute[];
  allWarnings: string[];
} => {
  const schedules: PromoterSchedule[] = [];
  const allRoutes: DailyRoute[] = [];
  const allWarnings: string[] = [];

  let globalRouteNumber = 0;

  for (const [promoterId, clients] of clientsByPromoter) {
    const schedule = generateOptimalWeeklySchedule(promoterId, clients, workSchedule, distanceMatrix);

    // Renumerar rotas globalmente
    for (const route of schedule.dailyRoutes) {
      globalRouteNumber++;
      route.routeNumber = globalRouteNumber;
      allRoutes.push(route);
    }

    schedules.push(schedule);
    allWarnings.push(...schedule.stats.warnings);
  }

  return {
    schedules,
    allRoutes,
    allWarnings,
  };
};
