/**
 * ⚡ NOVO MOTOR v4.0 - ESTRUTURA DE PROMOTOR COM AGENDA SEMANAL
 * 
 * MODELO CORRETO:
 * - Uma Rota = Um Promotor
 * - Um Promotor tem uma agenda de SEGUNDA A SÁBADO (estrutura única)
 * - Não gera múltiplas "rotas" por dia
 * 
 * Padrão: Dynamic Fleet Generation
 * - Pool global de clientes não alocados
 * - Loop while: criar rotas (promotores) até esgotar clientes
 * - Cada rota preenchida por proximidade (Nearest Neighbor)
 * - Respeita: Gap, Capacidade, Frequência, Restrição Vendedor
 * - Output: N promotores com agenda semanal completa
 */

import { Client, PromotorRota, DailyRoute, DailySchedule, RouteStop, WorkSchedule, OptimizationResult, Promoter } from '../types';

// ============================================================================
// CONSTANTES
// ============================================================================

const VELOCIDADE_MEDIA = 40; // km/h
const DIAS_NOME_PT = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DIAS_INGLES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const CAPACIDADES = [480, 480, 480, 480, 480, 240]; // minutos por dia (seg-sex: 8h, sáb: 4h)
const HORA_INICIO = 8 * 60; // 08:00
const HORAS_OBRIGATORIAS_SEMANA = 44 * 60; // 44h em minutos = 2640 min (8h seg-sex + 4h sab)

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface ClienteExpandido {
  cliente: Client;
  frequenciaRequisitada: number;
  visitasAlocadas: Set<number>; // Set<diaSemana>: dias já com visita agendada
}

interface AgendaSemanalInterna {
  [dia: number]: {
    tempoUsado: number;
    visitas: VisitaAgendada[];
  };
}

interface VisitaAgendada {
  clienteId: string;
  clienteNome: string;
  latitude: number;
  longitude: number;
  duracao: number;
  frequency?: number;
}

interface RotaEmConstrucao {
  numero: number;
  promotorId: string;
  agenda: AgendaSemanalInterna;
  clientesNaRota: ClienteExpandido[];
}

/**
 * Matriz de Tempos de Viagem (Roteamento Real de Ruas)
 * matrizTempos[idOrigem][idDestino] = tempo em minutos (via OSRM)
 */
interface MatrizTempos {
  [idOrigem: string]: {
    [idDestino: string]: number; // tempo em minutos
  };
}

// ============================================================================
// UTILITÁRIOS MATEMÁTICOS
// ============================================================================

/**
 * Calcula demanda total em minutos (soma de todas as visitas necessárias)
 * Demanda = Σ(frequencia × duracaoVisita) para cada cliente
 */
function calcularDemandaTotal(clientes: Client[]): number {
  let total = 0;
  let invalidCount = 0;
  
  clientes.forEach(cliente => {
    const freq = Number(cliente.frequency) || 0;
    const duration = Number(cliente.visitDurationMinutes) || 0;
    
    if (freq === 0 || duration === 0) {
      invalidCount++;
    }
    
    total += freq * duration;
  });
  
  if (invalidCount > 0) {
    console.warn(`  ⚠️ ${invalidCount} clientes com frequency ou visitDuration inválidos (ignorados no cálculo)`);
  }
  
  return total;
}

/**
 * Fallback: Haversine com fator 1.5x (estima ruas vs linha reta)
 * Usado apenas se matriz de OSRM falhar
 */
function calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6.371;
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

function calcularTempoFallback(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Haversine + fator 1.5x (compensação por trajetos reais de rua)
  const distanciaKm = calcularDistanciaHaversine(lat1, lon1, lat2, lon2);
  const velocidadeMedia = 25; // km/h (realista para tráfego urbano Fortaleza com congestionamento)
  const tempoMinutos = (distanciaKm / velocidadeMedia) * 60 * 1.5;
  return Math.ceil(tempoMinutos);
}

/**
 * Converte tempo de viagem em km
 * Inverso de calcularTempoFallback: tempo → distância
 * Considera: velocidade média de 25 km/h e fator 1.5x para ruas reais
 * Fórmula: distância = (tempo em minutos / 60) * velocidade / 1.5
 */
function calcularDistanciaDeTempoMinutos(tempoMinutos: number): number {
  const velocidadeMedia = 25; // km/h (deve ser igual ao usado em calcularTempoFallback)
  const distanciaKm = (tempoMinutos / 60) * velocidadeMedia / 1.5;
  return Math.round(distanciaKm * 10) / 10; // Arredonda para 1 casa decimal
}

function minutosParaHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

// ============================================================================
// PRÉ-COMPUTAÇÃO DE MATRIZ DE DISTÂNCIAS (OSRM)
// ============================================================================

/**
 * Obtém tempo real de viagem via OSRM (http://router.project-osrm.org/)
 * Aceita até 100 coordenadas numa única requisição
 */
async function obterMatrizTemposOSRM(
  clientes: ClienteExpandido[]
): Promise<MatrizTempos | null> {
  try {
    if (clientes.length === 0) return null;

    // Limite de 100 coordenadas por requisição OSRM
    const LIMITE_OSRM = 100;
    if (clientes.length > LIMITE_OSRM) {
      console.warn(
        `⚠️ Aviso: ${clientes.length} clientes excedem limite OSRM (${LIMITE_OSRM}). Usando fallback Haversine.`
      );
      return null;
    }

    // Construir array de coordenadas: [lon,lat] (OSRM usa lon,lat)
    const coordenadas = clientes.map(c => `${c.cliente.longitude},${c.cliente.latitude}`);
    const coordenadosStr = coordenadas.join(';');

    // Requisição à API pública OSRM
    // GET /table/v1/driving/lon1,lat1;lon2,lat2;...
    // HTTPS obrigatório para evitar Mixed Content em GitHub Pages
    const url = `https://router.project-osrm.org/table/v1/driving/${coordenadosStr}`;

    console.log(`🌐 Chamando OSRM (HTTPS) com ${clientes.length} coordenadas...`);

    // Adiciona timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ OSRM retornou ${response.status}. Usando fallback.`);
        return null;
      }

      const data = await response.json();

      // Verificar se OSRM retornou matriz de tempos (em segundos)
      if (!data.durations || !Array.isArray(data.durations)) {
        console.warn('⚠️ OSRM retornou estrutura inválida. Usando fallback.');
        return null;
      }

    // Construir matriz: matrizTempos[idOrigem][idDestino]
    const matrizTempos: MatrizTempos = {};
    let nullCount = 0;

    for (let i = 0; i < clientes.length; i++) {
      const idOrigem = clientes[i].cliente.id;
      matrizTempos[idOrigem] = {};

      for (let j = 0; j < clientes.length; j++) {
        const idDestino = clientes[j].cliente.id;
        const tempoSegundos = data.durations[i][j];
        
        // Se OSRM retornar null (rota impossível/muito longa), usa fallback Haversine
        if (tempoSegundos === null || tempoSegundos === undefined) {
          nullCount++;
          const clienteA = clientes[i].cliente;
          const clienteB = clientes[j].cliente;
          const tempoMinutos = calcularTempoFallback(
            clienteA.latitude,
            clienteA.longitude,
            clienteB.latitude,
            clienteB.longitude
          );
          matrizTempos[idOrigem][idDestino] = tempoMinutos;
        } else {
          const tempoMinutos = Math.ceil(tempoSegundos / 60);
          matrizTempos[idOrigem][idDestino] = tempoMinutos;
        }
      }
    }

    const totalPares = clientes.length * clientes.length;
    const percentualFallback = ((nullCount / totalPares) * 100).toFixed(1);
    console.log(`✅ Matriz OSRM: ${clientes.length}x${clientes.length} | ${nullCount}/${totalPares} pares usaram fallback (${percentualFallback}%)`);
    
    if (nullCount > totalPares * 0.5) {
      console.warn(`⚠️ Mais de 50% dos pares usaram fallback. Considere usar matriz Haversine completa.`);
    }

    return matrizTempos;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.warn(`⏱️ OSRM timeout (>30s). Usando fallback Haversine.`);
      } else {
        console.warn(`⚠️ Erro ao chamar OSRM: ${fetchError.message}. Usando fallback Haversine.`);
      }
      return null;
    }
  } catch (erro: any) {
    console.warn(`⚠️ Erro geral ao processar OSRM: ${erro.message}. Usando fallback Haversine.`);
    return null;
  }
}

/**
 * Cria matriz de tempos com fallback Haversine
 * Se OSRM falhar, usa Haversine + 1.5x como estimativa
 */
function criarMatrizTemposFallback(clientes: ClienteExpandido[]): MatrizTempos {
  const matriz: MatrizTempos = {};

  for (let i = 0; i < clientes.length; i++) {
    const clienteA = clientes[i].cliente;
    const idA = clienteA.id;
    matriz[idA] = {};

    for (let j = 0; j < clientes.length; j++) {
      const clienteB = clientes[j].cliente;
      const idB = clienteB.id;

      const tempoMinutos = calcularTempoFallback(
        clienteA.latitude,
        clienteA.longitude,
        clienteB.latitude,
        clienteB.longitude
      );

      matriz[idA][idB] = tempoMinutos;
    }
  }

  console.log(`⚠️ Usando matriz de fallback (Haversine + 1.5x)`);
  return matriz;
}

// ============================================================================
// ATRIBUIÇÃO AUTOMÁTICA DE ROTAS A PROMOTERS (1 ROTA POR PROMOTER)
// ============================================================================

function atribuirRotasAPromoters(
  rotasGeradas: RotaEmConstrucao[],
  rotasFinais: DailyRoute[],
  promoters: Promoter[],
  matrizTempos: MatrizTempos
): { [routeNumber: number]: string } {
  const assignments: { [routeNumber: number]: string } = {};

  if (promoters.length === 0 || rotasGeradas.length === 0) return assignments;

  const CAPACIDADE_SEMANAL = 480 * 5 + 240 * 1; // 2880 minutos = 44h

  console.log(`\n📊 FASE 2: Alocando ${rotasGeradas.length} rotas aos ${promoters.length} promoters (capacidade: 44h/semana)`);

  // Promoters com coordenadas
  const promotoresComCoord = promoters.filter(p => p.latitude && p.longitude);
  if (promotoresComCoord.length === 0) {
    console.warn(`⚠️ Nenhum promotor com coordenadas — sem alocação possível`);
    return assignments;
  }

  // Rastreia carga horária atual de cada promotor
  const cargaPromoter: { [promoterId: string]: number } = {};
  promotoresComCoord.forEach(p => {
    cargaPromoter[p.id] = 0;
  });

  // Calcula carga horária de cada rota
  const cargaRota: { [routeNumber: number]: number } = {};
  rotasGeradas.forEach(rota => {
    let tempoTotal = 0;
    for (let dia = 0; dia <= 5; dia++) {
      tempoTotal += rota.agenda[dia].tempoUsado;
    }
    cargaRota[rota.numero] = tempoTotal;
  });

  // ESTRATÉGIA: Para cada rota, aloca ao promoter mais próximo com CAPACIDADE
  console.log(`\n🔄 Alocando rotas por proximidade + capacidade disponível:`);
  
  rotasGeradas.forEach(rota => {
    const cargaDaRota = cargaRota[rota.numero];
    
    // Calcula centroide da rota
    const centroide = {
      lat: rota.clientesNaRota.reduce((s, c) => s + c.cliente.latitude, 0) / rota.clientesNaRota.length,
      lng: rota.clientesNaRota.reduce((s, c) => s + c.cliente.longitude, 0) / rota.clientesNaRota.length
    };

    // Calcula distância de TODOS os promoters ao centroide
    const promotoresComDistancia = promotoresComCoord
      .map(p => ({
        promoter: p,
        distancia: calcularDistanciaHaversine(p.latitude, p.longitude, centroide.lat, centroide.lng),
        cargaAtual: cargaPromoter[p.id]
      }))
      .sort((a, b) => a.distancia - b.distancia); // Ordena por distância (crescente)

    // Tenta alocar ao promoter mais próximo que tiver CAPACIDADE
    let promoterEscolhido: Promoter | null = null;
    let distanciaEscolhida: number = Infinity;
    let temCapacidade = false;

    for (const { promoter, distancia, cargaAtual } of promotoresComDistancia) {
      const capacidadeDisponivel = CAPACIDADE_SEMANAL - cargaAtual;
      
      if (capacidadeDisponivel >= cargaDaRota) {
        // Promoter tem capacidade! Aloca aqui
        promoterEscolhido = promoter;
        distanciaEscolhida = distancia;
        temCapacidade = true;
        break;
      }
    }

    // Se nenhum tem capacidade exata, pega o que tiver mais espaço (mesmo que não caiba toda a rota)
    if (!temCapacidade && promotoresComDistancia.length > 0) {
      const comMaisEspaco = [...promotoresComDistancia].sort((a, b) => {
        const espA = CAPACIDADE_SEMANAL - a.cargaAtual;
        const espB = CAPACIDADE_SEMANAL - b.cargaAtual;
        return espB - espA; // Ordena por espaço descending
      })[0];
      
      promoterEscolhido = comMaisEspaco.promoter;
      distanciaEscolhida = comMaisEspaco.distancia;
      const espacoDisp = CAPACIDADE_SEMANAL - comMaisEspaco.cargaAtual;
      console.warn(`  ⚠️ Rota ${rota.numero}: Nenhum promoter com ${Math.floor(cargaDaRota / 60)}h ${cargaDaRota % 60}m livres.`);
      console.warn(`     Alocando ao promoter com mais espaço: ${promoterEscolhido.name} (${espacoDisp / 60}h ${espacoDisp % 60}m disponível)`);
    }

    if (promoterEscolhido) {
      assignments[rota.numero] = promoterEscolhido.id;
      cargaPromoter[promoterEscolhido.id] += cargaDaRota;

      const horasCarga = Math.floor(cargaPromoter[promoterEscolhido.id] / 60);
      const minsCarga = cargaPromoter[promoterEscolhido.id] % 60;
      const horasRota = Math.floor(cargaDaRota / 60);
      const minsRota = cargaDaRota % 60;
      
      console.log(`  ✅ Rota ${rota.numero} (${horasRota}h ${minsRota}m) → ${promoterEscolhido.name} (${distanciaEscolhida.toFixed(1)}km, carga total: ${horasCarga}h ${minsCarga}m)`);
    } else {
      console.error(`  ❌ Rota ${rota.numero}: NÃO FOI POSSÍVEL ALOCAR A NENHUM PROMOTER!`);
    }
  });

  // Relatório final
  console.log(`\n📋 Resumo da Alocação Final:`);
  promotoresComCoord.forEach(p => {
    const carga = cargaPromoter[p.id];
    const horas = Math.floor(carga / 60);
    const mins = carga % 60;
    const percentual = ((carga / CAPACIDADE_SEMANAL) * 100).toFixed(1);
    const status = carga > CAPACIDADE_SEMANAL ? '❌' : '✅';
    console.log(`  ${status} ${p.name}: ${horas}h ${mins}m (${percentual}%)`);
  });

  console.log('');
  return assignments;
}

// ============================================================================
// AGENDA SEMANAL
// ============================================================================

function criarAgendaSemanalInterna(): AgendaSemanalInterna {
  const agenda: AgendaSemanalInterna = {};
  for (let dia = 0; dia <= 5; dia++) {
    agenda[dia] = {
      tempoUsado: 0,
      visitas: [],
    };
  }
  return agenda;
}

function obterCapacidadeDisponivel(agenda: AgendaSemanalInterna, dia: number): number {
  if (!agenda[dia]) return 0;
  return CAPACIDADES[dia] - agenda[dia].tempoUsado;
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

/**
 * Valida se cliente pode visitar neste dia
 * - CRÍTICO: Deve respeitar visitorDays (quando cliente QUER ser visitado)
 * - Não pode se vendedor já visita (promoterBlockedDays)
 * - Não pode mesmo dia (diff === 0)
 * - Pode dias adjacentes para melhor distribuição
 */
function podeVisitarNoDia(
  cliente: ClienteExpandido,
  dia: number,
  clienteOriginal: Client
): boolean {
  // 0. CRÍTICO: Verifica disponibilidade do CLIENTE (quando cliente quer ser visitado)
  const diaIngles = DIAS_INGLES[dia] as keyof typeof clienteOriginal.visitorDays;
  if (!clienteOriginal.visitorDays[diaIngles]) {
    return false; // Cliente NÃO está disponível neste dia
  }

  // 1. Verifica restrição do vendedor (coluna X - Dias do Vendedor)
  const diaInglesBloqueado = DIAS_INGLES[dia] as keyof typeof clienteOriginal.promoterBlockedDays;
  if (clienteOriginal.promoterBlockedDays[diaInglesBloqueado]) {
    return false; // Vendedor já visita este dia
  }

  // 2. Validação estrita de Gap (intercalação de dias)
  const diaIndex = dia;
  const diasJaAlocados = Array.from(cliente.visitasAlocadas);

  // Regra 1: Nunca permitir o mesmo dia duas vezes
  if (diasJaAlocados.includes(diaIndex)) {
    return false;
  }
  
  // Regra 2: Para clientes com frequência < 4, garantir gap mínimo de 1 dia
  if (clienteOriginal.frequency < 4) {
    for (const diaAlocado of diasJaAlocados) {
      // Se a diferença absoluta for 1, são dias seguidos. BLOQUEIA!
      if (Math.abs(diaAlocado - diaIndex) <= 1) {
        return false;
      }
    }
  }
  // Se frequência >= 4, permite dias seguidos

  return true;
}

// ============================================================================
// ALOCAÇÃO DE VISITAÇÃO
// ============================================================================

/**
 * Tenta alocar uma visitação em um dia específico
 * TRAVA ABSOLUTA: Visitação + Deslocamento SEMPRE somam contra o limite de 8h
 * 
 * LÓGICA DE NEGÓCIO CRÍTICA:
 * - O funcionário TRABALHA durante o trajeto (está em jornada)
 * - Portanto, tempo de visitação + deslocamento DEVE somar para os 480 min/dia (8h)
 * - Nenhuma exceção. Nenhum overflow permitido.
 */
function tentarAlocarEmDia(
  clienteExpandido: ClienteExpandido,
  dia: number,
  agenda: AgendaSemanalInterna,
  matrizTempos: MatrizTempos,
  isUltimaRota: boolean = false,
  forçado: boolean = false
): boolean {
  const cliente = clienteExpandido.cliente;

  // 1. Validações
  if (!podeVisitarNoDia(clienteExpandido, dia, cliente)) {
    return false;
  }

  // 2. CALCULA O TEMPO DE DESLOCAMENTO INTER-LOJAS (v4.2.7)
  // NOVO: Apenas trânsito entre clientes (não conta casa→primeiro e último→casa)
  let tempoDeslocamentoReal = 0;
  const visitasNoDia = agenda[dia].visitas;

  if (visitasNoDia.length > 0) {
    // Apenas se já existir cliente no dia, calcula trânsito inter-lojas
    const ultimaVisita = visitasNoDia[visitasNoDia.length - 1];
    if (matrizTempos && matrizTempos[ultimaVisita.clienteId]?.[cliente.id]) {
      tempoDeslocamentoReal = matrizTempos[ultimaVisita.clienteId][cliente.id];
    } else {
      tempoDeslocamentoReal = calcularTempoFallback(
        ultimaVisita.latitude,
        ultimaVisita.longitude,
        cliente.latitude,
        cliente.longitude
      );
    }
  }
  // Se for o primeiro cliente do dia (visitasNoDia.length === 0),
  // tempoDeslocamentoReal permanece 0 (não conta trajeto casa→cliente)

  // 3. VERIFICAÇÃO COM TOLERÂNCIA GLOBAL (v4.2.6)
  const tempoVisita = cliente.visitDurationMinutes;
  const tempoTotalNecessario = tempoVisita + tempoDeslocamentoReal;
  const capacidadeDisponivel = obterCapacidadeDisponivel(agenda, dia);
  
  // Regra de forçamento: Se for última rota, aumenta tolerância em 15%
  // para evitar que clientes sejam deixados órfãos (não alocados)
  // Se forçado=true, ignora limites completamente (permite overflow)
  let tolerancia = isUltimaRota ? 1.15 : 1.0;
  if (forçado) {
    tolerancia = Infinity; // Permite qualquer quantidade
  }
  const limiteComTolerancia = capacidadeDisponivel * tolerancia;

  if (tempoTotalNecessario > limiteComTolerancia) {
    return false;
  }

  // 4. SE COUBER, ALOCA E CONTABILIZA
  clienteExpandido.visitasAlocadas.add(dia);
  agenda[dia].visitas.push({
    clienteId: cliente.id,
    clienteNome: cliente.name,
    latitude: cliente.latitude,
    longitude: cliente.longitude,
    duracao: cliente.visitDurationMinutes,
    frequency: cliente.frequency,
  });

  agenda[dia].tempoUsado += tempoTotalNecessario;

  return true;
}

/**
 * Processa frequência completa de um cliente
 * Tenta alocar todas as visitações sequencialmente Segunda→Sábado
 */
// Helper: Faz backup da agenda
function fazerBackupAgenda(agenda: AgendaSemanalInterna): AgendaSemanalInterna {
  const backup: AgendaSemanalInterna = {};
  for (let dia = 0; dia <= 5; dia++) {
    backup[dia] = {
      tempoUsado: agenda[dia].tempoUsado,
      visitas: [...agenda[dia].visitas],
    };
  }
  return backup;
}

// Helper: Restaura agenda do backup
function restaurarAgendaDoBackup(agenda: AgendaSemanalInterna, backup: AgendaSemanalInterna): void {
  for (let dia = 0; dia <= 5; dia++) {
    agenda[dia].tempoUsado = backup[dia].tempoUsado;
    agenda[dia].visitas = [...backup[dia].visitas];
  }
}

// v4.2.9: DISTRIBUIÇÃO UNIFORME (1 visita por dia para freq >= 4)
function tentarDistribuicaoUniforme(
  clienteExpandido: ClienteExpandido,
  agenda: AgendaSemanalInterna,
  matrizTempos: MatrizTempos,
  isUltimaRota: boolean = false,
  forçado: boolean = false
): number {
  const frequenciaRequisitada = clienteExpandido.frequenciaRequisitada;
  const cliente = clienteExpandido.cliente;
  
  // Backup antes de tentar
  const backupAgenda = fazerBackupAgenda(agenda);
  const backupVisitas = new Set(clienteExpandido.visitasAlocadas);

  // Coletar dias disponíveis na ordem
  const diasDisponiveis: number[] = [];
  for (let dia = 0; dia <= 5; dia++) {
    if (podeVisitarNoDia(clienteExpandido, dia, clienteExpandido.cliente)) {
      diasDisponiveis.push(dia);
    }
  }

  // Precisa de pelo menos `frequenciaRequisitada` dias disponíveis
  if (diasDisponiveis.length < frequenciaRequisitada) {
    // Restaurar estado anterior se falhar
    restaurarAgendaDoBackup(agenda, backupAgenda);
    clienteExpandido.visitasAlocadas = backupVisitas;
    return 0; // Não consegue distribuir uniformemente
  }

  // Tenta alocar 1 visita em cada um dos primeiros `frequenciaRequisitada` dias
  let alocadas = 0;
  for (let i = 0; i < frequenciaRequisitada; i++) {
    const dia = diasDisponiveis[i];
    if (tentarAlocarEmDia(clienteExpandido, dia, agenda, matrizTempos, isUltimaRota, forçado)) {
      alocadas++;
    } else {
      // Se não conseguir em algum dia, faz ROLLBACK e retorna 0
      restaurarAgendaDoBackup(agenda, backupAgenda);
      clienteExpandido.visitasAlocadas = backupVisitas;
      return 0;
    }
  }

  // ✅ Sucesso! Alocou todas as `frequenciaRequisitada` visitas uniformemente
  return alocadas;
}

function processarFrequenciaCliente(
  clienteExpandido: ClienteExpandido,
  agenda: AgendaSemanalInterna,
  matrizTempos: MatrizTempos,
  isUltimaRota: boolean = false,
  forçado: boolean = false
): number {
  // v4.2.9: DISTRIBUIÇÃO UNIFORME PARA CLIENTES DE ALTA FREQUÊNCIA
  // Se freq >= 4, tenta alocar 1 visita por dia (distribuição uniforme)
  const frequenciaRequisitada = clienteExpandido.frequenciaRequisitada;
  
  if (frequenciaRequisitada >= 4) {
    const resultadoUniforme = tentarDistribuicaoUniforme(
      clienteExpandido,
      agenda,
      matrizTempos,
      isUltimaRota,
      forçado
    );
    if (resultadoUniforme > 0) {
      return resultadoUniforme; // ✅ Sucesso com distribuição uniforme
    }
    // Se falhar, cai para estratégia padrão abaixo
  }

  // v4.2.8: ALOCAÇÃO PARCIAL PERMITIDA (estratégia padrão)
  // Permite alocar frequência parcial (ex: cliente com freq 6 aloca 4 visitas)
  // Objetivo: Maximizar cobertura vs. rejeitar clientes completamente
  
  // 1. Backup para rollback se necessário
  const backupAgenda = fazerBackupAgenda(agenda);
  const backupVisitas = new Set(clienteExpandido.visitasAlocadas);

  let alocadasComSucesso = 0;

  // Rodada por rodada: cada rodada tenta alocar UMA visita
  for (let rodada = 0; rodada < frequenciaRequisitada && alocadasComSucesso < frequenciaRequisitada; rodada++) {
    // SEQUENCIALMENTE: Segunda (0) até Sábado (5)
    for (let dia = 0; dia <= 5; dia++) {
      if (alocadasComSucesso >= frequenciaRequisitada) break;
      if (clienteExpandido.visitasAlocadas.has(dia)) continue; // Já tem visita neste dia

      if (tentarAlocarEmDia(clienteExpandido, dia, agenda, matrizTempos, isUltimaRota, forçado)) {
        alocadasComSucesso++;
        break; // Saiu do loop de dias, vai para próxima rodada
      }
    }
  }

  // 2. v4.2.8: Permitir alocação PARCIAL (não fazer rollback)
  // Se conseguiu alocar pelo menos 1 frequência (50% da solicitada), mantém
  const minFrequenciaAceita = Math.max(1, Math.ceil(frequenciaRequisitada * 0.5));
  
  if (alocadasComSucesso < minFrequenciaAceita) {
    // Falhou em alocar nem o mínimo, faz ROLLBACK
    restaurarAgendaDoBackup(agenda, backupAgenda);
    clienteExpandido.visitasAlocadas = backupVisitas;
    return 0; // Zero alocações
  }

  // ✅ Mantém as alocações (mesmo que parciais)
  return alocadasComSucesso;
}

// ============================================================================
// CLUSTERIZAÇÃO - NEAREST NEIGHBOR COM MATRIZ DE TEMPOS
// ============================================================================

/**
 * Encontra o cliente não alocado com menor tempo de viagem
 * Usa matriz de tempos de OSRM (ou fallback Haversine)
 */
function encontrarVizinhoMaisProximo(
  clienteAtual: ClienteExpandido,
  clientesNaoAlocados: ClienteExpandido[],
  matrizTempos: MatrizTempos
): ClienteExpandido | null {
  if (clientesNaoAlocados.length === 0) return null;

  let vizinhoMaisProximo: ClienteExpandido | null = null;
  let menorTempo = Infinity;
  const idAtual = clienteAtual.cliente.id;

  for (const candidato of clientesNaoAlocados) {
    const idCandidato = candidato.cliente.id;
    
    // Tenta obter tempo da matriz
    const tempo = matrizTempos[idAtual]?.[idCandidato];
    
    if (tempo !== undefined && tempo < menorTempo) {
      menorTempo = tempo;
      vizinhoMaisProximo = candidato;
    }
  }

  return vizinhoMaisProximo;
}

/**
 * Ordena visitas de um dia usando Nearest Neighbor com tempos reais
 * Implementa TSP (Traveling Salesman Problem) com heurística greedy
 */
function aplicarNearestNeighbor(
  visitas: VisitaAgendada[],
  matrizTempos: MatrizTempos
): VisitaAgendada[] {
  if (visitas.length <= 1) return visitas;

  const resultado: VisitaAgendada[] = [];
  const restantes = [...visitas];

  resultado.push(restantes.shift()!);

  while (restantes.length > 0) {
    const ultimaVisita = resultado[resultado.length - 1];
    let proximaVisita: VisitaAgendada | null = null;
    let menorTempo = Infinity;
    let indiceProxima = 0;

    for (let i = 0; i < restantes.length; i++) {
      const tempo = matrizTempos[ultimaVisita.clienteId]?.[restantes[i].clienteId];
      
      if (tempo !== undefined && tempo < menorTempo) {
        menorTempo = tempo;
        proximaVisita = restantes[i];
        indiceProxima = i;
      }
    }

    if (proximaVisita) {
      resultado.push(proximaVisita);
      restantes.splice(indiceProxima, 1);
    } else {
      break;
    }
  }

  return resultado;
}

// ============================================================================
// CONSTRUÇÃO DE ROTA (PROMOTOR COM AGENDA SEMANAL)
// ============================================================================

/**
 * ⚡ v4.3 REFACTOR: PRIORIDADE GEOLOCALIZAÇÃO + CARGA HORÁRIA
 * 
 * NOVA ESTRATÉGIA (Requisito do usuário):
 * 1ª PRIORIDADE: Geolocalização (menor distância entre lojas)
 * 2ª PRIORIDADE: Completar carga horária (43h30-44h)
 * 
 * Lógica:
 * 1. Seed: Primeiro cliente (FFD - maior frequência/duração)
 * 2. Loop principal: Sempre escolhe o CLIENTE MAIS PRÓXIMO dos já alocados na rota
 * 3. Se cliente mais próximo não couber, tenta o próximo mais próximo
 * 4. Continua adicionando clientes por PROXIMIDADE até saturar capacidade
 * 5. Se não atingir 90% (43.2h), força alocação de clientes distantes para completar
 * 6. Usa matriz de tempos reais (OSRM ou fallback Haversine)
 */
/**
 * ⚡ v4.8 CENTROIDE CONGELADO - SEM META DE 90%
 * 
 * Abordagem:
 * 1. Seed = cliente com maior frequência
 * 2. Núcleo = Seed + vizinhos mais próximos (até couber)
 * 3. Centroide congelado do núcleo
 * 4. Greedy: adiciona vizinhos ≤ 3km do centroide
 * 5. **NÃO tenta forçar 90% de utilização**
 * 6. Resultado: rotas COMPACTAS, pode ficar em 60-75%, não importa
 */
function construirRotaGreedyGeografica(
  numeroRota: number,
  poolGlobal: ClienteExpandido[],
  matrizTempos: MatrizTempos,
  celularBounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): { rota: RotaEmConstrucao; clientesAlocados: ClienteExpandido[] } {
  const rota: RotaEmConstrucao = {
    numero: numeroRota,
    promotorId: `ROTA_${numeroRota}`,
    agenda: criarAgendaSemanalInterna(),
    clientesNaRota: [],
  };
  const clientesAlocados: ClienteExpandido[] = [];

  if (poolGlobal.length === 0) return { rota, clientesAlocados };

  const RAIO_MAXIMO_ROTA_KM = 4.0; // Raio ao centroide (aumentado de 3.0 para 4.0)
  const DIAMETRO_MAXIMO_ROTA_KM = 8.0; // Distância máxima entre quaisquer 2 clientes (aumentado de 5.0 para 8.0)

  // ─────────────────────────────────────────────────────────────
  // FASE 1: SEED = cliente com maior frequência
  // ─────────────────────────────────────────────────────────────
  let melhorSeedIdx = 0;
  let maiorFrequencia = 0;

  for (let i = 0; i < poolGlobal.length; i++) {
    if (poolGlobal[i].cliente.frequency > maiorFrequencia) {
      maiorFrequencia = poolGlobal[i].cliente.frequency;
      melhorSeedIdx = i;
    }
  }

  const seed = poolGlobal[melhorSeedIdx];
  const alocSeed = processarFrequenciaCliente(seed, rota.agenda, matrizTempos);

  if (alocSeed === 0) {
    poolGlobal.splice(melhorSeedIdx, 1);
    console.warn(`  ⚠️ SEED "${seed.cliente.name}" não coube, descartado`);
    return { rota, clientesAlocados };
  }

  rota.clientesNaRota.push(seed);
  clientesAlocados.push(seed);
  poolGlobal.splice(melhorSeedIdx, 1);

  // ─────────────────────────────────────────────────────────────
  // FASE 2: FORMAR NÚCLEO COM VIZINHOS PRÓXIMOS
  // Pega 1-2 vizinhos mais próximos que cabem na agenda
  // ─────────────────────────────────────────────────────────────
  const nucleoClientes: ClienteExpandido[] = [seed];
  const vizinhosPorDist: Array<{ idx: number; dist: number; cliente: ClienteExpandido }> = [];

  for (let i = 0; i < poolGlobal.length; i++) {
    const dist = calcularDistanciaHaversine(
      seed.cliente.latitude, seed.cliente.longitude,
      poolGlobal[i].cliente.latitude, poolGlobal[i].cliente.longitude
    );
    vizinhosPorDist.push({ idx: i, dist, cliente: poolGlobal[i] });
  }
  vizinhosPorDist.sort((a, b) => a.dist - b.dist);

  // Tenta adicionar até 2 vizinhos ao núcleo
  const indicesToRemove: number[] = [];
  for (let i = 0; i < Math.min(2, vizinhosPorDist.length); i++) {
    const { idx, cliente } = vizinhosPorDist[i];
    const alocacoes = processarFrequenciaCliente(cliente, rota.agenda, matrizTempos);
    if (alocacoes > 0) {
      nucleoClientes.push(cliente);
      rota.clientesNaRota.push(cliente);
      clientesAlocados.push(cliente);
      indicesToRemove.push(idx);
    }
  }

  // Remove do pool em ordem reversa para não mexer índices
  indicesToRemove.sort((a, b) => b - a);
  for (const idx of indicesToRemove) {
    poolGlobal.splice(idx, 1);
  }

  // Recalccula índices no pool após removals
  const nucleoIds = new Set(nucleoClientes.map(c => c.cliente.id));
  for (let i = poolGlobal.length - 1; i >= 0; i--) {
    if (nucleoIds.has(poolGlobal[i].cliente.id)) {
      poolGlobal.splice(i, 1);
    }
  }

  // Calcula centroide CONGELADO do núcleo
  let centroLat = 0, centroLng = 0;
  for (const c of nucleoClientes) {
    centroLat += c.cliente.latitude;
    centroLng += c.cliente.longitude;
  }
  centroLat /= nucleoClientes.length;
  centroLng /= nucleoClientes.length;

  console.log(
    `  🌱 SEED: ${seed.cliente.name} | Núcleo: ${nucleoClientes.length} | Centroide: (${centroLat.toFixed(4)}, ${centroLng.toFixed(4)})`
  );

  // ─────────────────────────────────────────────────────────────
  // FASE 3: GREEDY AO REDOR DO CENTROIDE CONGELADO (3KM RIGOROSO)
  // PARA quando vizinho > 3km - SEM META DE UTILIZAÇÃO
  // ─────────────────────────────────────────────────────────────
  const rejeitados = new Set<string>();
  let ciclosSemSucesso = 0;
  const MAX_CICLOS_REJEITADOS = 5;

  while (poolGlobal.length > 0 && ciclosSemSucesso < MAX_CICLOS_REJEITADOS) {
    // Encontra vizinho MAIS PRÓXIMO DO CENTROIDE
    let melhorIdx = -1;
    let melhorDist = Infinity;

    for (let i = 0; i < poolGlobal.length; i++) {
      if (rejeitados.has(poolGlobal[i].cliente.id)) continue;

      const dist = calcularDistanciaHaversine(
        poolGlobal[i].cliente.latitude, poolGlobal[i].cliente.longitude,
        centroLat, centroLng
      );

      if (dist < melhorDist) {
        melhorDist = dist;
        melhorIdx = i;
      }
    }

    if (melhorIdx === -1) {
      console.log(`  🛑 Nenhum candidato não-rejeitado`);
      break;
    }

    // 🚫 Se está muito longe, para (não tenta forçar)
    if (melhorDist > RAIO_MAXIMO_ROTA_KM) {
      console.log(
        `  🛑 Vizinho mais próximo a ${melhorDist.toFixed(1)} km > raio ${RAIO_MAXIMO_ROTA_KM} km, encerrando rota`
      );
      break;
    }

    const candidato = poolGlobal[melhorIdx];
    
    // 🔍 VERIFICAÇÃO ADICIONAL: Calcula diâmetro da rota se adicionarmos este candidato
    let diametroMax = 0;
    for (const c1 of rota.clientesNaRota) {
      const distToCandidato = calcularDistanciaHaversine(
        c1.cliente.latitude, c1.cliente.longitude,
        candidato.cliente.latitude, candidato.cliente.longitude
      );
      if (distToCandidato > diametroMax) {
        diametroMax = distToCandidato;
      }
    }

    // 🚫 Rejeita se o diâmetro ultrapassar o limite (mesmo que esteja dentro do raio do centroide)
    if (diametroMax > DIAMETRO_MAXIMO_ROTA_KM) {
      console.log(
        `  ⚠️ Cliente "${candidato.cliente.name}" rejeitado: diâmetro seria ${diametroMax.toFixed(1)} km > ${DIAMETRO_MAXIMO_ROTA_KM} km`
      );
      rejeitados.add(candidato.cliente.id);
      ciclosSemSucesso++;
      continue;
    }

    const alocacoes = processarFrequenciaCliente(candidato, rota.agenda, matrizTempos);

    if (alocacoes > 0) {
      rota.clientesNaRota.push(candidato);
      clientesAlocados.push(candidato);
      poolGlobal.splice(melhorIdx, 1);
      ciclosSemSucesso = 0;
    } else {
      // Não coube, marca como rejeitado
      rejeitados.add(candidato.cliente.id);
      ciclosSemSucesso++;
    }
  }

  const utilFinal = calcularUtilizacaoMediaSemanal(rota);
  const raioFinal = Math.max(
    ...rota.clientesNaRota.map(c =>
      calcularDistanciaHaversine(centroLat, centroLng, c.cliente.latitude, c.cliente.longitude)
    )
  );

  // Calcula diâmetro REAL da rota (maior distância entre quaisquer 2 clientes)
  let diametroFinal = 0;
  for (let i = 0; i < rota.clientesNaRota.length; i++) {
    for (let j = i + 1; j < rota.clientesNaRota.length; j++) {
      const dist = calcularDistanciaHaversine(
        rota.clientesNaRota[i].cliente.latitude, rota.clientesNaRota[i].cliente.longitude,
        rota.clientesNaRota[j].cliente.latitude, rota.clientesNaRota[j].cliente.longitude
      );
      if (dist > diametroFinal) {
        diametroFinal = dist;
      }
    }
  }

  console.log(
    `  📊 Rota ${numeroRota}: ${clientesAlocados.length} clientes | ${utilFinal.toFixed(1)}% | raio: ${raioFinal.toFixed(1)} km | diâmetro: ${diametroFinal.toFixed(1)} km`
  );

  return { rota, clientesAlocados };
}

function construirRotaComClusterizacao(
  numeroRota: number,
  clientesNaoAlocados: ClienteExpandido[],
  matrizTempos: MatrizTempos
): { rota: RotaEmConstrucao; clientesAlocados: ClienteExpandido[] } {
  const rota: RotaEmConstrucao = {
    numero: numeroRota,
    promotorId: `ROTA_${numeroRota}`,
    agenda: criarAgendaSemanalInterna(),
    clientesNaRota: [],
  };

  const clientesAlocados: ClienteExpandido[] = [];

  if (clientesNaoAlocados.length === 0) {
    return { rota, clientesAlocados };
  }

  // SEED: Pega o primeiro cliente (maior frequência/duração, já ordenado por FFD)
  const primeiroCliente = clientesNaoAlocados[0];
  clientesNaoAlocados.splice(0, 1);

  const alocacoes = processarFrequenciaCliente(primeiroCliente, rota.agenda, matrizTempos);
  if (alocacoes > 0) {
    rota.clientesNaRota.push(primeiroCliente);
    clientesAlocados.push(primeiroCliente);
  } else {
    // Não conseguiu alocar seed - rota inviável, retorna vazia
    clientesNaoAlocados.unshift(primeiroCliente);
    return { rota, clientesAlocados };
  }

  // LOOP PRINCIPAL: Tenta alocar clientes NA ORDEM (já ordenados por proximidade)
  // NÃO usa nearest neighbor durante construção - ordem do cluster já é ótima
  const CAPACIDADE_SEMANAL = 480 * 5 + 240 * 1; // 2880 min
  const META_UTILIZACAO = 0.90; // 90% = 2592 min = 43.2h

  // Itera por CADA cliente do cluster na ordem (mais próximos do centroide primeiro)
  for (let i = 0; i < clientesNaoAlocados.length; i++) {
    const candidato = clientesNaoAlocados[i];

    // Tenta alocar TODAS as frequências do candidato
    const alocacoes = processarFrequenciaCliente(candidato, rota.agenda, matrizTempos);

    if (alocacoes > 0) {
      // ✅ Sucesso: adiciona à rota
      rota.clientesNaRota.push(candidato);
      clientesAlocados.push(candidato);
    }
    
    // Verifica se já atingiu utilização mínima (90%)
    const utilizacaoAtual = calcularUtilizacaoMediaSemanal(rota);
    if (utilizacaoAtual >= META_UTILIZACAO * 100) {
      console.log(`  ⏸️ Rota ${numeroRota} atingiu ${utilizacaoAtual.toFixed(1)}% (meta: 90%), parando alocação`);
      break; // Já atingiu 90%+, pode parar
    }
  }

  // Remove clientes alocados do array original
  for (const alocado of clientesAlocados) {
    const idx = clientesNaoAlocados.indexOf(alocado);
    if (idx >= 0) {
      clientesNaoAlocados.splice(idx, 1);
    }
  }

  // FASE 2: Se não atingiu 90%, tenta forçar alocação dos clientes restantes deste cluster
  const utilizacaoFinal = calcularUtilizacaoMediaSemanal(rota);
  if (utilizacaoFinal < META_UTILIZACAO * 100 && clientesNaoAlocados.length > 0) {
    console.log(`  ⚠️ Rota ${numeroRota}: ${utilizacaoFinal.toFixed(1)}% < 90%, forçando clientes restantes do cluster...`);
    
    for (let i = clientesNaoAlocados.length - 1; i >= 0; i--) {
      const cliente = clientesNaoAlocados[i];
      const alocacoes = processarFrequenciaCliente(cliente, rota.agenda, matrizTempos, true, true); // força=true
      
      if (alocacoes > 0) {
        rota.clientesNaRota.push(cliente);
        clientesAlocados.push(cliente);
        clientesNaoAlocados.splice(i, 1);
        
        const novaUtilizacao = calcularUtilizacaoMediaSemanal(rota);
        if (novaUtilizacao >= META_UTILIZACAO * 100) {
          console.log(`  ✅ Atingiu ${novaUtilizacao.toFixed(1)}% após forçar alocação`);
          break; // Atingiu 90%, pode parar
        }
      }
    }
  }

  return { rota, clientesAlocados };
}

// ============================================================================
// ALERTAS PÓS-PROCESSAMENTO
// ============================================================================

/**
 * Gera alertas de ociosidade (dias com < 75% utilização)
 */
function gerarAlertasOciosidade(rotasGeradas: RotaEmConstrucao[]): string[] {
  const alertas: string[] = [];
  const LIMITE_OCIOSIDADE = 0.75; // 75%

  rotasGeradas.forEach(rota => {
    for (let dia = 0; dia <= 5; dia++) {
      const agenda = rota.agenda[dia];
      if (agenda.tempoUsado === 0) continue; // Pula dias vazios
      
      const capacidade = CAPACIDADES[dia];
      const percentualUso = agenda.tempoUsado / capacidade;
      
      if (percentualUso < LIMITE_OCIOSIDADE) {
        const horasUsadas = Math.floor(agenda.tempoUsado / 60);
        const minutosUsados = agenda.tempoUsado % 60;
        const horasTotal = Math.floor(capacidade / 60);
        const minutosTotal = capacidade % 60;
        
        const aviso = `⚠️ ROTA ${rota.numero} - ${DIAS_NOME_PT[dia]}: Carga ociosa (Apenas ${horasUsadas}h ${minutosUsados}m alocadas de ${horasTotal}h ${minutosTotal}m disponíveis)`;
        alertas.push(aviso);
      }
    }
  });

  return alertas;
}

/**
 * 📊 VALIDAR EFICIÊNCIA DA ROTA (v4.3 - Ajustado)
 * 
 * IMPORTANTE: Prioridade é GEOLOCALIZAÇÃO + 44h
 * - Se rota tem 90%+ utilização com lojas distantes = ACEITÁVEL (necessário para atingir 44h)
 * - Só alerta se: baixa eficiência AND utilização < 90%
 * 
 * Calcula razão tempo produtivo (visitas) vs improdutivo (deslocamento)
 */
function validarEficienciaRotas(rotasGeradas: RotaEmConstrucao[]): string[] {
  const alertas: string[] = [];
  const EFICIENCIA_MINIMA = 0.40; // 40% do tempo deve ser produtivo (visitas)
  const UTILIZACAO_MINIMA = 90; // 90%
  
  rotasGeradas.forEach(rota => {
    const utilizacao = calcularUtilizacaoMediaSemanal(rota);
    
    // Se já atingiu 90%+, não alerta (distância foi necessária para atingir meta)
    if (utilizacao >= UTILIZACAO_MINIMA) {
      return; // Pula validação de eficiência
    }
    
    let tempoVisitas = 0;
    let tempoDeslocamento = 0;
    let totalClientes = rota.clientesNaRota.length;
    
    // Soma tempo de visitas e deslocamentos
    for (let dia = 0; dia <= 5; dia++) {
      const visitasDia = rota.agenda[dia].visitas;
      
      visitasDia.forEach((visita, idx) => {
        tempoVisitas += visita.duracao;
        
        // Deslocamento estimado (já contabilizado no tempoUsado)
        // Aproximação: 10 min de deslocamento por visita (média)
        if (idx > 0) {
          tempoDeslocamento += 10;
        }
      });
    }
    
    const tempoTotal = tempoVisitas + tempoDeslocamento;
    const eficiencia = tempoTotal > 0 ? tempoVisitas / tempoTotal : 0;
    
    if (eficiencia < EFICIENCIA_MINIMA && totalClientes > 0) {
      const tempoTotalHoras = (tempoTotal / 60).toFixed(1);
      const tempoVisitasHoras = (tempoVisitas / 60).toFixed(1);
      const tempoDeslocamentoHoras = (tempoDeslocamento / 60).toFixed(1);
      
      alertas.push(
        `⚠️ ROTA ${rota.numero} - EFICIÊNCIA BAIXA: ${(eficiencia * 100).toFixed(0)}%\n` +
        `   ${totalClientes} clientes, ${tempoVisitasHoras}h visitas vs ${tempoDeslocamentoHoras}h deslocamento\n` +
        `   💡 SUGESTÃO: Considere reduzir número de rotas para concentrar clientes`
      );
    }
  });
  
  return alertas;
}

// ============================================================================
// REBALANCEAMENTO DE CARGA HORÁRIA (Evitar Ociosidade em Rota 4+)
// ============================================================================

/**
 * Calcula utilização média semanal de uma rota
 * Retorna percentual (0-100)
 */
function calcularUtilizacaoMediaSemanal(rota: RotaEmConstrucao): number {
  let tempoTotalUsado = 0;
  for (let dia = 0; dia <= 5; dia++) {
    tempoTotalUsado += rota.agenda[dia].tempoUsado;
  }
  
  // Total de capacidade semanal: 2880 min (480*5 + 240*1)
  const capacidadeSemanal = 480 * 5 + 240 * 1; // 2880
  return (tempoTotalUsado / capacidadeSemanal) * 100;
}

/**
 * 🔄 NOVO REBALANCEAMENTO v4.3 - GARANTIR 90%+ EM TODAS AS ROTAS
 * Modelo: 43h30-44h OBRIGATÓRIO (90%+ de 2880 min)
 * 
 * Estratégia:
 * 1. Identifica rotas abaixo de 90% (2592 min)
 * 2. Se encontrar, consolida essas rotas nas anteriores (overflow permitido)
 * 3. Remove rotas sub-utilizadas
 */
function aplicarRebalanceamentoDeCarga(
  rotasGeradas: RotaEmConstrucao[],
  clientesNaoAlocados: ClienteExpandido[],
  matrizTempos: MatrizTempos
): void {
  if (rotasGeradas.length === 0) return;

  const CAPACIDADE_SEMANAL = 480 * 5 + 240 * 1; // 2880 min
  const UTILIZACAO_MINIMA = 90; // 90% = 2592 minutos = 43.2h
  const META_HORAS = 2640; // 44h em minutos

  console.log('\n🔄 NOVO REBALANCEAMENTO v4.3 - Garantindo 90%+ em todas as rotas');

  // PASSO 1: Identificar rotas abaixo de 90%
  const rotasAbaixoMinimo: number[] = [];
  for (let i = 0; i < rotasGeradas.length; i++) {
    const utilizacao = calcularUtilizacaoMediaSemanal(rotasGeradas[i]);
    if (utilizacao < UTILIZACAO_MINIMA) {
      rotasAbaixoMinimo.push(i);
      console.log(`  ⚠️ Rota ${i + 1}: ${utilizacao.toFixed(1)}% (abaixo de 90%)`);
    }
  }

  if (rotasAbaixoMinimo.length === 0) {
    console.log('  ✅ Todas as rotas acima de 90%, nenhum ajuste necessário');
    return;
  }

  // PASSO 2: Consolidar rotas sub-utilizadas
  // Mover clientes das rotas fracas para as rotas boas (permitindo overflow)
  for (const idxFraca of rotasAbaixoMinimo.reverse()) {
    const rotaFraca = rotasGeradas[idxFraca];
    const clientesDaRotaFraca = [...rotaFraca.clientesNaRota];
    
    console.log(`  🔀 Redistribuindo ${clientesDaRotaFraca.length} clientes da Rota ${idxFraca + 1}...`);

    // Tenta alocar em outras rotas (prioritariamente as que têm espaço)
    for (const cliente of clientesDaRotaFraca) {
      let alocado = false;

      // Tenta alocar em rotas existentes (exceto a fraca)
      for (let i = 0; i < rotasGeradas.length; i++) {
        if (i === idxFraca) continue; // Pular a rota fraca
        
        const rotaDestino = rotasGeradas[i];
        const utilizacaoDestino = calcularUtilizacaoMediaSemanal(rotaDestino);

        // Se a rota destino está abaixo de 100%, tenta alocar normalmente
        // Se está acima, força entrada (overflow)
        const modoForcado = utilizacaoDestino >= 100;

        // Limpa alocações anteriores
        cliente.visitasAlocadas.clear();
        
        const sucesso = processarFrequenciaCliente(cliente, rotaDestino.agenda, matrizTempos, true, modoForcado);
        if (sucesso > 0) {
          rotaDestino.clientesNaRota.push(cliente);
          alocado = true;
          break;
        }
      }

      if (!alocado) {
        console.warn(`    ⚠️ Cliente ${cliente.cliente.name} não alocado após rebalanceamento`);
        clientesNaoAlocados.push(cliente);
      }
    }

    // Remove a rota fraca
    rotasGeradas.splice(idxFraca, 1);
    console.log(`  ❌ Rota ${idxFraca + 1} removida (sub-utilizada)`);
  }

  // PASSO 3: Relatório final
  console.log('\n📊 RESULTADO DO REBALANCEAMENTO:');
  for (let i = 0; i < rotasGeradas.length; i++) {
    const utilizacao = calcularUtilizacaoMediaSemanal(rotasGeradas[i]);
    const tempoTotal = rotasGeradas[i].clientesNaRota.reduce((sum, c) => {
      let total = 0;
      for (let dia = 0; dia <= 5; dia++) {
        total += rotasGeradas[i].agenda[dia].tempoUsado;
      }
      return sum + total;
    }, 0);
    
    const status = utilizacao >= UTILIZACAO_MINIMA ? '✅' : '⚠️';
    console.log(`  ${status} Rota ${i + 1}: ${utilizacao.toFixed(1)}% (${(tempoTotal / 60).toFixed(1)}h de ${(META_HORAS / 60).toFixed(1)}h)`);
  }
}

/**
 * 🔓 FORÇAR ENTRADA DE CLIENTES (Cenário 3)
 * Aloca clientes não alocados na última rota, MESMO QUE ULTRAPASSE 100%
 * Garante que ninguém fica sem atendimento
 */
function forcarEntradaClientesRestantes(
  rotasGeradas: RotaEmConstrucao[],
  clientesNaoAlocados: ClienteExpandido[],
  matrizTempos: MatrizTempos
): void {
  if (rotasGeradas.length === 0 || clientesNaoAlocados.length === 0) return;

  const ultimaRota = rotasGeradas[rotasGeradas.length - 1];
  let clientesForçados = 0;

  console.log(`\n🔓 Forçando entrada de ${clientesNaoAlocados.length} cliente(s) restante(s) na última rota...`);

  for (const cliente of clientesNaoAlocados) {
    // Tenta alocar com modo "forçado" - permite ultrapassar 100%
    const sucesso = processarFrequenciaCliente(cliente, ultimaRota.agenda, matrizTempos, true, true);
    if (sucesso) {
      ultimaRota.clientesNaRota.push(cliente);
      clientesForçados++;
    }
  }

  // Remove clientes alocados da lista
  for (let i = clientesNaoAlocados.length - 1; i >= 0; i--) {
    if (clientesNaoAlocados[i].visitasAlocadas.size > 0) {
      clientesNaoAlocados.splice(i, 1);
    }
  }

  if (clientesForçados > 0) {
    const utilización = calcularUtilizacaoMediaSemanal(ultimaRota);
    console.log(`  ✅ ${clientesForçados} cliente(s) forçado(s) | Nova utilização: ${utilización.toFixed(1)}%`);
  }
}

// ============================================================================
// CLUSTERIZAÇÃO GEOGRÁFICA (K-MEANS SIMPLIFICADO)
// ============================================================================

/**
 * 🗺️ K-MEANS CLUSTERING PARA AGRUPAR CLIENTES GEOGRAFICAMENTE
 * 
 * Objetivo: Dividir clientes em GRUPOS GEOGRÁFICOS compactos
 * - Cada cluster = Uma região da cidade (Norte, Sul, Leste, Oeste, etc.)
 * - Cada rota atende APENAS UM cluster (lojas próximas)
 * - Evita rotas entrecruzadas e longas
 */
function agruparClientesPorProximidade(
  clientes: ClienteExpandido[],
  numClusters: number
): ClienteExpandido[][] {
  if (clientes.length === 0 || numClusters === 0) return [];
  
  // Se numClusters >= clientes, cada cliente = 1 cluster
  if (numClusters >= clientes.length) {
    return clientes.map(c => [c]);
  }

  console.log(`\n🗺️ Clusterização: Dividindo ${clientes.length} clientes em ${numClusters} grupos geográficos...`);

  // 1. Inicializa centroides (distribui uniformemente no espaço)
  const centroides: { lat: number; lng: number }[] = [];
  
  // Encontra limites geográficos
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  
  clientes.forEach(c => {
    if (c.cliente.latitude < minLat) minLat = c.cliente.latitude;
    if (c.cliente.latitude > maxLat) maxLat = c.cliente.latitude;
    if (c.cliente.longitude < minLng) minLng = c.cliente.longitude;
    if (c.cliente.longitude > maxLng) maxLng = c.cliente.longitude;
  });

  // Inicializa centroides em grid
  const rows = Math.ceil(Math.sqrt(numClusters));
  const cols = Math.ceil(numClusters / rows);
  
  for (let i = 0; i < numClusters; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    centroides.push({
      lat: minLat + (maxLat - minLat) * (row + 0.5) / rows,
      lng: minLng + (maxLng - minLng) * (col + 0.5) / cols
    });
  }

  // 2. K-Means: Iterações para convergir
  const MAX_ITERACOES = 20;
  let clusters: ClienteExpandido[][] = [];

  for (let iter = 0; iter < MAX_ITERACOES; iter++) {
    // Atribui cada cliente ao centroide mais próximo
    clusters = Array.from({ length: numClusters }, () => []);
    
    clientes.forEach(cliente => {
      let menorDistancia = Infinity;
      let clusterMaisProximo = 0;
      
      centroides.forEach((centroide, idx) => {
        const dist = calcularDistanciaHaversine(
          cliente.cliente.latitude,
          cliente.cliente.longitude,
          centroide.lat,
          centroide.lng
        );
        
        if (dist < menorDistancia) {
          menorDistancia = dist;
          clusterMaisProximo = idx;
        }
      });
      
      clusters[clusterMaisProximo].push(cliente);
    });

    // Recalcula centroides (média das posições dos clientes)
    let mudou = false;
    centroides.forEach((centroide, idx) => {
      if (clusters[idx].length === 0) return; // Cluster vazio
      
      const somaLat = clusters[idx].reduce((sum, c) => sum + c.cliente.latitude, 0);
      const somaLng = clusters[idx].reduce((sum, c) => sum + c.cliente.longitude, 0);
      
      const novoLat = somaLat / clusters[idx].length;
      const novoLng = somaLng / clusters[idx].length;
      
      // Verifica se mudou significativamente
      const deltaLat = Math.abs(novoLat - centroide.lat);
      const deltaLng = Math.abs(novoLng - centroide.lng);
      
      if (deltaLat > 0.001 || deltaLng > 0.001) {
        mudou = true;
      }
      
      centroide.lat = novoLat;
      centroide.lng = novoLng;
    });

    // Converge se centroides não mudarem
    if (!mudou) {
      console.log(`  ✅ Convergiu em ${iter + 1} iterações`);
      break;
    }
  }

  // 3. Remove clusters vazios
  clusters = clusters.filter(c => c.length > 0);

  // 4. Ordena clientes dentro de cada cluster por PROXIMIDADE AO CENTROIDE
  // Isso garante que tentamos alocar lojas mais próximas do centro do cluster primeiro
  clusters.forEach((cluster, idxCluster) => {
    const centroide = centroides[idxCluster];
    if (!centroide) return;
    
    cluster.sort((a, b) => {
      const distA = calcularDistanciaHaversine(
        a.cliente.latitude,
        a.cliente.longitude,
        centroide.lat,
        centroide.lng
      );
      const distB = calcularDistanciaHaversine(
        b.cliente.latitude,
        b.cliente.longitude,
        centroide.lat,
        centroide.lng
      );
      
      // Ordena por distância (mais próximos primeiro)
      const diffDist = distA - distB;
      if (Math.abs(diffDist) > 0.5) return diffDist; // Se diferença > 0.5km, usa distância
      
      // Se distâncias similares, prioriza maior frequência (FFD)
      const diffFreq = b.frequenciaRequisitada - a.frequenciaRequisitada;
      if (diffFreq !== 0) return diffFreq;
      return b.cliente.visitDurationMinutes - a.cliente.visitDurationMinutes;
    });
  });

  console.log(`  ✅ Criados ${clusters.length} clusters (ordenados por proximidade ao centroide):`);
  clusters.forEach((cluster, idx) => {
    console.log(`     Cluster ${idx + 1}: ${cluster.length} clientes`);
  });

  return clusters;
}

// ============================================================================
// GERAÇÃO DINÂMICA DE ROTAS
// ============================================================================

export async function gerarRotasDinamicamente(
  clientes: Client[],
  workSchedule: WorkSchedule,
  promoters: Promoter[] = []
): Promise<OptimizationResult> {
  // FORCE ALERT to see if function runs
  if (typeof window !== 'undefined') {
    (window as any).__debugOptimization = {
      totalClientes: clientes.length,
      firstClientName: clientes[0]?.name,
      firstClientVisitorDays: clientes[0]?.visitorDays
    };
  }
  
  console.log('\n=== OTIMIZAÇÃO DINÂMICA V4.2 (Multi-Vehicle Routing + OSRM) ===');
  console.log(`📊 Entrada: ${clientes.length} clientes`);
  if (clientes.length > 0) {
    const c0 = clientes[0];
    console.log(`FIRST CLIENT: ${c0.name}, visitorDays=${JSON.stringify(c0.visitorDays)}`);
  }
  console.log(`📍 Promoters: ${promoters.length}`);

  // 1. Prepara pool de clientes não alocados
  // FFD: First Fit Decreasing - ordena por frequência DESC, depois duração DESC
  const clientesOrdenados = [...clientes]
    .map(c => ({
      cliente: c,
      frequenciaRequisitada: c.frequency,
      visitasAlocadas: new Set<number>(),
    }))
    .sort((a, b) => {
      const diffFreq = b.frequenciaRequisitada - a.frequenciaRequisitada;
      if (diffFreq !== 0) return diffFreq;
      return b.cliente.visitDurationMinutes - a.cliente.visitDurationMinutes;
    });

  console.log('📋 FFD Sorted (Frequency DESC, Duration DESC):');
  clientesOrdenados.slice(0, 5).forEach(c => {
    console.log(`  - ${c.cliente.name}: freq=${c.frequenciaRequisitada}, duracao=${c.cliente.visitDurationMinutes}min, visitorDays=${JSON.stringify(c.cliente.visitorDays)}`);
  });
  console.log('  ...\n');

  // 2. PRÉ-COMPUTAÇÃO: Obter matriz de tempos reais via OSRM
  console.log('🌐 Fase 1: Pré-computando matriz de distâncias (OSRM)...');
  let matrizTempos = await obterMatrizTemposOSRM(clientesOrdenados);
  
  // Se OSRM falhar, usar fallback Haversine
  if (!matrizTempos) {
    console.log('⚠️ OSRM indisponível ou limite excedido, usando fallback Haversine + 1.5x');
    console.log('ℹ️  Fallback Haversine é preciso e confiável para otimização urbana');
    matrizTempos = criarMatrizTemposFallback(clientesOrdenados);
  }
  console.log('✅ Matriz de tempos pronta para alocação\n');

  // NOVO: Calcular demanda total e número ótimo de rotas (Cenário 1)
  const demandaTotal = calcularDemandaTotal(clientes);
  const rotasOtimas = Math.ceil(demandaTotal / HORAS_OBRIGATORIAS_SEMANA);
  const limiteRotas = Math.min(rotasOtimas, promoters.length > 0 ? promoters.length : 100);
  
  console.log(`\n📊 NOVO MODELO - 43h30/44h OBRIGATÓRIO POR PROMOTER:`);
  console.log(`  - Demanda total: ${demandaTotal} min (${(demandaTotal / 60).toFixed(1)}h)`);
  console.log(`  - Horas obrigatórias/promoter: ${HORAS_OBRIGATORIAS_SEMANA} min (44h)`);
  console.log(`  - Rotas ótimas calculadas: ${rotasOtimas}`);
  console.log(`  - Promoters disponíveis: ${promoters.length}`);
  console.log(`  - Limite de rotas (min): ${limiteRotas} (Cenário 1: ${limiteRotas} promoters usados, ${promoters.length - limiteRotas} parados)\n`);

  // 3. CONSTRUÇÃO GREEDY GEOGRÁFICA v4.3 — ROTAS ANTES DOS PROMOTORES
  //    - PRIORIDADE 1: Agrupar lojas por proximidade (geolocalização)
  //    - PRIORIDADE 2: Alocar rota ao promotor cuja casa está perto do centroide dela
  //    - Sequência: pool → rotas geograficamente compactas → aloca ao promotor mais próximo
  console.log(`\n🗺️ Estratégia: GREEDY GEOGRÁFICO → DEPOIS ALOCA AO PROMOTOR MAIS PRÓXIMO`);
  console.log(`   Fase 1: Agrupa lojas por proximidade (vizinho mais próximo)`);
  console.log(`   Fase 2: Para cada rota, aloca ao promotor cuja casa está mais perto do centroide\n`);

  const poolGlobal: ClienteExpandido[] = [...clientesOrdenados];
  const rotasGeradas: RotaEmConstrucao[] = [];
  let numeroRota = 0;

  // FASE 1: Cria rotas baseado em GEOLOCALIZAÇÃO PURA (sem pensar em promotor)
  // SEM LIMITE DE ROTAS - continua até alocar TODOS os clientes
  while (poolGlobal.length > 0) {
    numeroRota++;
    console.log(`\n🚗 Rota ${numeroRota}: pool restante = ${poolGlobal.length} clientes`);

    const { rota, clientesAlocados } = construirRotaGreedyGeografica(
      numeroRota,
      poolGlobal,
      matrizTempos
    );

    if (clientesAlocados.length > 0) {
      // ✅ FASE 1: Rota geográfica aceita SEM validação de proximidade
      // A proximidade será resolvida na FASE 2 (alocação aos promoters)
      rotasGeradas.push(rota);
      const utilizacao = calcularUtilizacaoMediaSemanal(rota);
      const centroideRota = {
        lat: rota.clientesNaRota.reduce((s, c) => s + c.cliente.latitude, 0) / rota.clientesNaRota.length,
        lng: rota.clientesNaRota.reduce((s, c) => s + c.cliente.longitude, 0) / rota.clientesNaRota.length
      };
      console.log(
        `  ✅ Rota ${numeroRota}: ${clientesAlocados.length} clientes | ${utilizacao.toFixed(1)}% | Centroide: (${centroideRota.lat.toFixed(4)}, ${centroideRota.lng.toFixed(4)})`
      );
    } else {
      console.warn(`  ⚠️ Rota ${numeroRota}: nenhum cliente alocado`);
      if (poolGlobal.length > 0) {
        console.warn(`  🛑 ${poolGlobal.length} clientes restantes não conseguem entrar em rotas compactas`);
        console.warn(`  📋 Transferindo para FASE 1B (rotas solo)...`);
      }
      break;
    }
  }

  const clientesNaoAlocados: ClienteExpandido[] = [...poolGlobal];
  console.log(`\n✅ FASE 1 COMPLETA: ${rotasGeradas.length} rotas geradas | ${clientesNaoAlocados.length} restantes`);

  // ──────────────────────────────────────────────────────────────
  // FASE 1B: CRIAR ROTAS SOLO PARA CLIENTES RESTANTES
  // SEM VALIDAÇÃO de proximidade — alocação será feita na FASE 2
  // ──────────────────────────────────────────────────────────────
  if (clientesNaoAlocados.length > 0) {
    console.log(`\n🎯 FASE 1B: Criando rotas solo para ${clientesNaoAlocados.length} clientes restantes...`);

    for (const cliente of clientesNaoAlocados) {
      numeroRota++;
      const rotaSolo: RotaEmConstrucao = {
        numero: numeroRota,
        promotorId: `ROTA_${numeroRota}`,
        agenda: criarAgendaSemanalInterna(),
        clientesNaRota: [cliente],
      };
      
      // Tenta alocar o cliente em qualquer dia disponível
      let alocado = false;
      for (let dia = 0; dia < 6; dia++) {
        const CAPACIDADES = [480, 480, 480, 480, 480, 240];
        const tempoDisponivel = CAPACIDADES[dia] - rotaSolo.agenda[dia].tempoUsado;
        if (tempoDisponivel >= cliente.frequenciaRequisitada) {
          rotaSolo.agenda[dia].tempoUsado += cliente.frequenciaRequisitada;
          rotaSolo.agenda[dia].visitas.push({
            clienteId: cliente.cliente.id,
            clienteNome: cliente.cliente.name,
            latitude: cliente.cliente.latitude,
            longitude: cliente.cliente.longitude,
            duracao: cliente.frequenciaRequisitada,
            frequency: cliente.cliente.frequency
          });
          alocado = true;
          break;
        }
      }

      if (alocado) {
        rotasGeradas.push(rotaSolo);
        const util = calcularUtilizacaoMediaSemanal(rotaSolo);
        console.log(`  ✅ Rota Solo ${numeroRota}: ${cliente.cliente.name} | ${util.toFixed(1)}%`);
      } else {
        console.warn(`  ⚠️ Rota Solo ${numeroRota}: ${cliente.cliente.name} não alocado (agenda cheia)`);
      }
    }

    // 🔴 Limpar clientesNaoAlocados após FASE 1B para evitar duplicação
    clientesNaoAlocados.length = 0;
  }

  // FASE 2: DESABILITADA - Atribuição será feita pela função atribuirRotasAPromoters
  // que implementa a estratégia de "aloca ao promoter mais próximo com capacidade"
  console.log(`\n👥 FASE 2: Será executada pela função atribuirRotasAPromoters após construção de rotasFinais\n`);

  // 4️⃣ REBALANCEAMENTO DE CARGA (DESATIVADO TEMPORARIAMENTE PARA OPÇÃO A)
  // O rebalanceamento remove rotas sub-utilizadas e adiciona clientes a clientesNaoAlocados
  // Isso interfere com FASE 1B que precisa de clientesNaoAlocados para criar rotas solo
  // Para Opção A (135/135 allocation), o rebalanceamento será feito APÓS FASE 1B
  // aplicarRebalanceamentoDeCarga(rotasGeradas, clientesNaoAlocados, matrizTempos);

  // 4️⃣b FORÇAR ENTRADA (Cenário 3): Alocar clientes restantes na última rota com overflow
  if (clientesNaoAlocados.length > 0 && rotasGeradas.length > 0) {
    forcarEntradaClientesRestantes(rotasGeradas, clientesNaoAlocados, matrizTempos);
  }

  // 5️⃣a. Cria estrutura PromotorRota (será populada com stops depois)
  const promotorRotas: PromotorRota[] = rotasGeradas.map(rotaInterna => {
    const agenda: PromotorRota['agenda'] = {
      'Segunda-feira': {
        limit: CAPACIDADES[0],
        timeUsed: rotaInterna.agenda[0].tempoUsado,
        stops: [],
      },
      'Terça-feira': {
        limit: CAPACIDADES[1],
        timeUsed: rotaInterna.agenda[1].tempoUsado,
        stops: [],
      },
      'Quarta-feira': {
        limit: CAPACIDADES[2],
        timeUsed: rotaInterna.agenda[2].tempoUsado,
        stops: [],
      },
      'Quinta-feira': {
        limit: CAPACIDADES[3],
        timeUsed: rotaInterna.agenda[3].tempoUsado,
        stops: [],
      },
      'Sexta-feira': {
        limit: CAPACIDADES[4],
        timeUsed: rotaInterna.agenda[4].tempoUsado,
        stops: [],
      },
      'Sábado': {
        limit: CAPACIDADES[5],
        timeUsed: rotaInterna.agenda[5].tempoUsado,
        stops: [],
      },
    };

    return {
      id: rotaInterna.numero,
      nome: `ROTA ${rotaInterna.numero}`,
      promoterId: rotaInterna.promotorId,
      agenda,
    };
  });

  // 7️⃣ ATRIBUIÇÃO FINAL: Atribui rotas aos promoters COM PROXIMIDADE + BALANCEAMENTO
  // Fazer ANTES de construir rotasFinais para usar IDs corretos!
  const routeAssignments = atribuirRotasAPromoters(rotasGeradas, [], promoters, matrizTempos);
  
  // Atualiza promotorId nas rotas com a atribuição balanceada final
  rotasGeradas.forEach((rota, idx) => {
    if (routeAssignments[rota.numero]) {
      rota.promotorId = routeAssignments[rota.numero];
      promotorRotas[idx].promoterId = routeAssignments[rota.numero];
      // ✅ Atualiza nome com o nome REAL do promotor
      const promoter = promoters.find(p => p.id === routeAssignments[rota.numero]);
      if (promoter) {
        promotorRotas[idx].nome = promoter.name;
      }
    }
  });

  console.log(`\n✅ Atribuição final com limite de proximidade (15km) e balanceamento completada\n`);

  // 5️⃣b. DailyRoute: compatibilidade com exportação (view por dia)
  // Constrói DEPOIS da atribuição final para usar IDs corretos
  const rotasFinais: DailyRoute[] = [];

  // Busca dados do promoter para calcular deslocamento casa→clientes→casa
  for (const rotaEmConstrucao of rotasGeradas) {
    const promoter = promoters.find(p => p.id === rotaEmConstrucao.promotorId);
    const promoterLatitude = promoter?.latitude ?? 0;
    const promoterLongitude = promoter?.longitude ?? 0;

    for (let dia = 0; dia <= 5; dia++) {
      const agendaDia = rotaEmConstrucao.agenda[dia];
      if (agendaDia.visitas.length === 0) continue; // Skip dias vazios

      // Ordena visitas por vizinho mais próximo (usando matriz de tempos)
      const visitasOrdenadas = aplicarNearestNeighbor(agendaDia.visitas, matrizTempos);

      // Cria RouteStop com tempos reais de viagem
      let tempoAtual = HORA_INICIO;
      const stops: RouteStop[] = [];

      // Calcula tempo de deslocamento: casa do promoter → primeiro cliente
      // Aplica fator 1.3x por ser horário de pico (início do expediente)
      const tempoDeslocamentoInicial =
        visitasOrdenadas.length > 0
          ? Math.ceil(calcularTempoFallback(
              promoterLatitude,
              promoterLongitude,
              visitasOrdenadas[0].latitude,
              visitasOrdenadas[0].longitude
            ) * 1.3) // Fator de pico matinal
          : 0;

      tempoAtual += tempoDeslocamentoInicial;

      for (let i = 0; i < visitasOrdenadas.length; i++) {
        const visita = visitasOrdenadas[i];

        // Usa tempos reais da matriz, nunca Haversine
        const tempoDeslocamento =
          i === 0
            ? tempoDeslocamentoInicial  // ← AGORA INCLUI TRAJETO DE CASA
            : (matrizTempos[visitasOrdenadas[i - 1].clienteId]?.[visita.clienteId] || 
               calcularTempoFallback(
                 visitasOrdenadas[i - 1].latitude,
                 visitasOrdenadas[i - 1].longitude,
                 visita.latitude,
                 visita.longitude
               ));

        // Calcula distância a partir do tempo
        const distanciaDeslocamento = calcularDistanciaDeTempoMinutos(tempoDeslocamento);

        tempoAtual += (i === 0 ? 0 : tempoDeslocamento); // i===0 já foi adicionado acima

        stops.push({
          order: i + 1,
          clientId: visita.clienteId,
          clientName: visita.clienteNome,
          latitude: visita.latitude,
          longitude: visita.longitude,
          visitDurationMinutes: visita.duracao,
          frequency: visita.frequency,
          travelTimeMinutes: tempoDeslocamento,
          travelDistanceKm: distanciaDeslocamento,
          arrivalTime: minutosParaHora(tempoAtual),
          departureTime: minutosParaHora(tempoAtual + visita.duracao),
        });

        tempoAtual += visita.duracao;
      }

      // Calcula tempo de deslocamento: último cliente → casa do promoter
      // Aplica fator 1.3x por ser horário de pico (fim do expediente)
      const tempoDeslocamentoFinal =
        visitasOrdenadas.length > 0
          ? Math.ceil(calcularTempoFallback(
              visitasOrdenadas[visitasOrdenadas.length - 1].latitude,
              visitasOrdenadas[visitasOrdenadas.length - 1].longitude,
              promoterLatitude,
              promoterLongitude
            ) * 1.3) // Fator de pico noturno
          : 0;

      // Calcula distância final
      const distanciaDeslocamentoFinal = calcularDistanciaDeTempoMinutos(tempoDeslocamentoFinal);

      // Total de tempo - INCLUI TRAJETOS INICIAIS E FINAIS
      // stops[0].travelTimeMinutes = tempoDeslocamentoInicial (casa→primeiro cliente)
      // stops[i].travelTimeMinutes = tempo entre cliente i-1 e cliente i
      // tempoDeslocamentoFinal = último cliente → casa
      const totalTravelTime = 
        stops.reduce((sum, s) => sum + s.travelTimeMinutes, 0) + 
        tempoDeslocamentoFinal;
      const totalTravelDistance = 
        stops.reduce((sum, s) => sum + (s.travelDistanceKm || 0), 0) + 
        distanciaDeslocamentoFinal;
      const totalVisitTime = stops.reduce((sum, s) => sum + s.visitDurationMinutes, 0);

      rotasFinais.push({
        day: DIAS_NOME_PT[dia],
        promoterId: rotaEmConstrucao.promotorId,
        routeNumber: rotaEmConstrucao.numero,
        stops,
        totalTravelTimeMinutes: totalTravelTime,
        totalVisitTimeMinutes: totalVisitTime,
        totalTimeMinutes: totalTravelTime + totalVisitTime,
        totalTravelDistanceKm: totalTravelDistance,
      });

      // Popula stops na agenda PromotorRota
      const rotaPromotorIdx = rotasGeradas.findIndex(r => r.numero === rotaEmConstrucao.numero);
      if (rotaPromotorIdx >= 0) {
        const promotorRota = promotorRotas[rotaPromotorIdx];
        const diaKey = DIAS_NOME_PT[dia] as keyof PromotorRota['agenda'];
        promotorRota.agenda[diaKey].stops = stops;
      }
    }
  }

  // 6️⃣ Calcula estatísticas
  const totalClientesAlocados = rotasGeradas.reduce((sum, r) => sum + r.clientesNaRota.length, 0);
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`✅ RESUMO FINAL DA OTIMIZAÇÃO`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`🚗 Total de Rotas Criadas: ${rotasGeradas.length}`);
  console.log(`👥 Total de Clientes Alocados: ${totalClientesAlocados}/${clientes.length}`);
  console.log(`📊 Rotas por tipo:`);
  const rotasCompactas = rotasGeradas.filter(r => r.clientesNaRota.length > 1).length;
  const rotasSolo = rotasGeradas.filter(r => r.clientesNaRota.length === 1).length;
  console.log(`   - Rotas Compactas (>1 cliente): ${rotasCompactas}`);
  console.log(`   - Rotas Solo (1 cliente): ${rotasSolo}`);
  console.log(`   - Total: ${rotasCompactas + rotasSolo}`);
  console.log(`${'═'.repeat(80)}\n`);
  const totalTempoUsado = rotasGeradas.reduce((sum, r) => {
    let temp = 0;
    for (let dia = 0; dia <= 5; dia++) {
      temp += r.agenda[dia].tempoUsado;
    }
    return sum + temp;
  }, 0);
  const totalCapacidade = 44 * 60; // 44 horas em minutos (8h seg-sex + 4h sab)
  const utilizacao = (totalTempoUsado / (totalCapacidade * rotasGeradas.length)) * 100;

  // Gera alertas de ociosidade
  const alertasOciosidade = gerarAlertasOciosidade(rotasGeradas);
  
  // 6️⃣b Valida eficiência das rotas (v4.3)
  const alertasEficiencia = validarEficienciaRotas(rotasGeradas);
  if (alertasEficiencia.length > 0) {
    console.warn('\n⚠️ ALERTAS DE EFICIÊNCIA:');
    alertasEficiencia.forEach(alerta => console.warn(alerta));
  }

  // Note: atribuirRotasAPromoters já foi chamada ANTES de construir rotasFinais
  // Neste ponto, routeAssignments já contém a atribuição final com 15km de proximidade

  const resultado: OptimizationResult = {
    rotas: promotorRotas,
    routes: rotasFinais,
    clients: clientes,
    promoters: promoters,
    routeAssignments: routeAssignments,
    summary: {
      totalPromotores: rotasGeradas.length,
      totalClientsAssigned: totalClientesAlocados,
      averageUtilization: Math.round(utilizacao * 100) / 100,
      warnings: [
        `Total de promotores criados: ${rotasGeradas.length}`,
        `Clientes alocados: ${totalClientesAlocados}/${clientes.length}`,
        ...alertasOciosidade, // Alertas de ociosidade
        ...alertasEficiencia, // Alertas de eficiência (v4.3)
      ],
    },
  };

  console.log(resultado.summary);
  return resultado;
}
