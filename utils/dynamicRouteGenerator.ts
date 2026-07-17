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
  const velocidadeMedia = 40; // km/h
  const tempoMinutos = (distanciaKm / velocidadeMedia) * 60 * 1.5;
  return Math.ceil(tempoMinutos);
}

/**
 * Converte tempo de viagem em km
 * Inverso de calcularTempoFallback: tempo → distância
 * Considera: velocidade média de 40 km/h e fator 1.5x para ruas reais
 * Fórmula: distância = (tempo em minutos / 60) * velocidade / 1.5
 */
function calcularDistanciaDeTempoMinutos(tempoMinutos: number): number {
  const velocidadeMedia = 40; // km/h
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
    const url = `http://router.project-osrm.org/table/v1/driving/${coordenadosStr}`;

    console.log(`🌐 Chamando OSRM com ${clientes.length} coordenadas...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

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

    for (let i = 0; i < clientes.length; i++) {
      const idOrigem = clientes[i].cliente.id;
      matrizTempos[idOrigem] = {};

      for (let j = 0; j < clientes.length; j++) {
        const idDestino = clientes[j].cliente.id;
        const tempoSegundos = data.durations[i][j] || 0; // OSRM devolve em segundos
        const tempoMinutos = Math.ceil(tempoSegundos / 60);
        matrizTempos[idOrigem][idDestino] = tempoMinutos;
      }
    }

    console.log(`✅ Matriz OSRM calculada com sucesso (${clientes.length}x${clientes.length})`);
    return matrizTempos;
  } catch (erro) {
    console.warn(`⚠️ Erro ao chamar OSRM: ${erro}. Usando fallback Haversine.`);
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

  // Rastreia quais promotores já têm rota atribuída (1 rota por promotor)
  const promotoresAtribuidos = new Set<string>();

  // Cria um mapa de tempos: rota -> promotor -> tempo total
  const temposMapaRoutas: { [rotaNum: number]: { [promoterId: string]: number } } = {};

  rotasGeradas.forEach((rota) => {
    temposMapaRoutas[rota.numero] = {};

    promoters.forEach((promoter) => {
      let tempoTotal = 0;

      // Procura todas as visitas desta rota
      rotasFinais.forEach((dailyRoute) => {
        if (dailyRoute.routeNumber === rota.numero) {
          dailyRoute.stops.forEach((stop) => {
            // Usa Haversine + 1.5x como estimativa de tempo de ida/volta da casa do promotor
            const tempo = calcularTempoFallback(
              promoter.latitude,
              promoter.longitude,
              stop.latitude,
              stop.longitude
            );
            tempoTotal += tempo;
          });
        }
      });

      temposMapaRoutas[rota.numero][promoter.id] = tempoTotal;
    });
  });

  // Ordena rotas por número de clientes (descendente) para priorizar rotas maiores
  const rotasOrdenadas = [...rotasGeradas].sort(
    (a, b) => {
      const clientesA = rotasFinais.filter(r => r.routeNumber === a.numero).length || 0;
      const clientesB = rotasFinais.filter(r => r.routeNumber === b.numero).length || 0;
      return clientesB - clientesA;
    }
  );

  // Atribui cada rota a um promotor (máx 1 rota por promotor)
  rotasOrdenadas.forEach((rota) => {
    // Ordena promotores disponíveis por tempo de viagem (menor primeiro)
    const promotoresDisponiveis = promoters
      .filter(p => !promotoresAtribuidos.has(p.id))
      .sort((a, b) => {
        const tempoA = temposMapaRoutas[rota.numero][a.id];
        const tempoB = temposMapaRoutas[rota.numero][b.id];
        return tempoA - tempoB;
      });

    if (promotoresDisponiveis.length > 0) {
      // Atribui ao promotor disponível com menor tempo de viagem
      const promoterEscolhido = promotoresDisponiveis[0];
      assignments[rota.numero] = promoterEscolhido.id;
      promotoresAtribuidos.add(promoterEscolhido.id);
    } else {
      // Fallback: se todos estiverem atribuídos, usa o com menor tempo
      const melhorPromoter = promoters.reduce((prev, curr) => {
        const tempoPrev = temposMapaRoutas[rota.numero][prev.id];
        const tempoCurr = temposMapaRoutas[rota.numero][curr.id];
        return tempoCurr < tempoPrev ? curr : prev;
      });
      assignments[rota.numero] = melhorPromoter.id;
    }
  });

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
  // DEBUG
  if (clienteOriginal.name === 'SUPERMERCADO PROGRESSO') {
    console.log(`[podeVisitarNoDia] ${clienteOriginal.name}, dia ${dia} (${DIAS_NOME_PT[dia]})`);
    console.log(`  visitorDays:`, clienteOriginal.visitorDays);
    console.log(`  promoterBlockedDays:`, clienteOriginal.promoterBlockedDays);
  }

  // 0. CRÍTICO: Verifica disponibilidade do CLIENTE (quando cliente quer ser visitado)
  const diaIngles = DIAS_INGLES[dia] as keyof typeof clienteOriginal.visitorDays;
  if (!clienteOriginal.visitorDays[diaIngles]) {
    if (clienteOriginal.name === 'SUPERMERCADO PROGRESSO') {
      console.log(`  ❌ BLOQUEADO: cliente NÃO disponível em ${diaIngles}`);
    }
    return false; // Cliente NÃO está disponível neste dia
  }

  // 1. Verifica restrição do vendedor (coluna X - Dias do Vendedor)
  const diaInglesBloqueado = DIAS_INGLES[dia] as keyof typeof clienteOriginal.promoterBlockedDays;
  if (clienteOriginal.promoterBlockedDays[diaInglesBloqueado]) {
    if (clienteOriginal.name === 'SUPERMERCADO PROGRESSO') {
      console.log(`  ❌ BLOQUEADO: vendedor já visita em ${diaInglesBloqueado}`);
    }
    return false; // Vendedor já visita este dia
  }

  // 2. Validação estrita de Gap (intercalação de dias)
  // diaIndex = índice do dia que estamos testando (0 a 5)
  // diasJaAlocados = array dos índices dos dias já agendados para este cliente
  const diaIndex = dia;
  const diasJaAlocados = Array.from(cliente.visitasAlocadas);

  let diaPermitido = true;

  // Regra 1: Nunca permitir o mesmo dia duas vezes
  if (diasJaAlocados.includes(diaIndex)) {
    diaPermitido = false;
    if (clienteOriginal.name === 'SUPERMERCADO PROGRESSO') {
      console.log(`  ❌ BLOQUEADO: já tem visita em dia ${diaIndex}`);
    }
  } 
  // Regra 2: Para clientes com frequência < 4, garantir gap mínimo de 1 dia
  else if (clienteOriginal.frequency < 4) {
    for (const diaAlocado of diasJaAlocados) {
      // Se a diferença absoluta for 1, são dias seguidos (ex: 3 - 2 = 1). BLOQUEIA!
      if (Math.abs(diaAlocado - diaIndex) <= 1) {
        diaPermitido = false;
        if (clienteOriginal.name === 'SUPERMERCADO PROGRESSO') {
          console.log(`  ❌ BLOQUEADO: gap inválido. Dia alocado: ${diaAlocado}, testando: ${diaIndex}, diff: ${Math.abs(diaAlocado - diaIndex)}`);
        }
        break;
      }
    }
  }
  // Se frequência >= 4, permite dias seguidos (diaPermitido continua true)

  if (!diaPermitido) {
    return false;
  }

  if (clienteOriginal.name === 'SUPERMERCADO PROGRESSO') {
    console.log(`  ✅ PERMITIDO (dias alocados: ${diasJaAlocados.join(', ')}, testando: ${diaIndex})`);
  }
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
  isUltimaRota: boolean = false
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
  const tolerancia = isUltimaRota ? 1.15 : 1.0;
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
  isUltimaRota: boolean = false
): number {
  const frequenciaRequisitada = clienteExpandido.frequenciaRequisitada;
  const cliente = clienteExpandido.cliente;
  
  // DEBUG v4.2.9
  if (cliente.id === '10752' || clienteExpandido.frequenciaRequisitada >= 4) {
    console.error(`[v4.2.9] Distribuição uniforme: ${cliente.id} (${cliente.name}), freq=${frequenciaRequisitada}`);
  }
  
  // Backup antes de tentar
  const backupAgenda = fazerBackupAgenda(agenda);
  const backupVisitas = new Set(clienteExpandido.visitasAlocadas);

  // Coletar dias disponíveis na ordem
  const diasDisponiveis: number[] = [];
  const DIAS_NOMES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  for (let dia = 0; dia <= 5; dia++) {
    if (podeVisitarNoDia(clienteExpandido, dia, clienteExpandido.cliente)) {
      diasDisponiveis.push(dia);
    }
  }

  // Precisa de pelo menos `frequenciaRequisitada` dias disponíveis
  if (diasDisponiveis.length < frequenciaRequisitada) {
    console.error(`[v4.2.9] ❌ Falhou dias: ${diasDisponiveis.length} < ${frequenciaRequisitada}`);
    console.error(`[v4.2.9] SEG=${podeVisitarNoDia(clienteExpandido, 0, cliente)}, TER=${podeVisitarNoDia(clienteExpandido, 1, cliente)}, QUA=${podeVisitarNoDia(clienteExpandido, 2, cliente)}, QUI=${podeVisitarNoDia(clienteExpandido, 3, cliente)}, SEX=${podeVisitarNoDia(clienteExpandido, 4, cliente)}, SAB=${podeVisitarNoDia(clienteExpandido, 5, cliente)}`);
    // Restaurar estado anterior se falhar
    restaurarAgendaDoBackup(agenda, backupAgenda);
    clienteExpandido.visitasAlocadas = backupVisitas;
    return 0; // Não consegue distribuir uniformemente
  }

  console.error(`[v4.2.9] ✅ ${diasDisponiveis.length} dias disponíveis: ${diasDisponiveis.map(d => DIAS_NOMES[d]).join(', ')}`);

  // Tenta alocar 1 visita em cada um dos primeiros `frequenciaRequisitada` dias
  let alocadas = 0;
  for (let i = 0; i < frequenciaRequisitada; i++) {
    const dia = diasDisponiveis[i];
    if (tentarAlocarEmDia(clienteExpandido, dia, agenda, matrizTempos, isUltimaRota)) {
      alocadas++;
      console.error(`[v4.2.9] ✅ Alocado em ${DIAS_NOMES[dia]} (${alocadas}/${frequenciaRequisitada})`);
    } else {
      // Se não conseguir em algum dia, faz ROLLBACK e retorna 0
      console.error(`[v4.2.9] ❌ Falhou ao alocar em ${DIAS_NOMES[dia]}, fazendo ROLLBACK`);
      restaurarAgendaDoBackup(agenda, backupAgenda);
      clienteExpandido.visitasAlocadas = backupVisitas;
      return 0;
    }
  }

  // ✅ Sucesso! Alocou todas as `frequenciaRequisitada` visitas uniformemente
  console.error(`[v4.2.9] ✅✅✅ SUCESSO: ${cliente.id} alocado em ${alocadas} dias uniformemente`);
  return alocadas;
}

function processarFrequenciaCliente(
  clienteExpandido: ClienteExpandido,
  agenda: AgendaSemanalInterna,
  matrizTempos: MatrizTempos,
  isUltimaRota: boolean = false
): number {
  // v4.2.9: DISTRIBUIÇÃO UNIFORME PARA CLIENTES DE ALTA FREQUÊNCIA
  // Se freq >= 4, tenta alocar 1 visita por dia (distribuição uniforme)
  const frequenciaRequisitada = clienteExpandido.frequenciaRequisitada;
  
  if (frequenciaRequisitada >= 4) {
    const resultadoUniforme = tentarDistribuicaoUniforme(
      clienteExpandido,
      agenda,
      matrizTempos,
      isUltimaRota
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

      if (tentarAlocarEmDia(clienteExpandido, dia, agenda, matrizTempos, isUltimaRota)) {
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
 * ⚡ v4.2 REFACTOR: SATURAÇÃO EXAUSTIVA COM MATRIZ DE TEMPOS REAIS
 * 
 * Lógica:
 * 1. Cria rota com seed (primeiro cliente FFD)
 * 2. Loop exaustivo: itera por TODOS os clientes do pool sequencialmente (FFD sort mantém ordem)
 * 3. Tenta alocar cada cliente (TODAS as frequências = "tudo ou nada")
 * 4. Se aloca, remove do pool; se não, deixa para próxima rodada
 * 5. Usa matriz de tempos reais de rua (OSRM ou fallback Haversine)
 * 6. Continua até fazer um loop completo SEM alocar NINGUÉM
 * 7. Somente então declara rota como "saturada/cheia"
 */
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

  // LOOP EXAUSTIVO: Continua até fazer um loop completo SEM alocar ninguém
  let loopsConsecutivosSemAlocacao = 0;
  const MAX_LOOPS_SEM_ALOCACAO = 1; // Um loop sem sucesso = rota saturada
  const MAX_ITERACOES_TOTAIS = 500; // Segurança contra loop infinito
  let iteracaoAtual = 0;

  while (
    clientesNaoAlocados.length > 0 &&
    loopsConsecutivosSemAlocacao < MAX_LOOPS_SEM_ALOCACAO &&
    iteracaoAtual < MAX_ITERACOES_TOTAIS
  ) {
    iteracaoAtual++;
    let alocouNesteLacoCompleto = false;

    // Itera por CADA cliente do pool (mantém ordem FFD: maiores primeiro)
    for (let i = 0; i < clientesNaoAlocados.length; i++) {
      const candidato = clientesNaoAlocados[i];

      // Tenta alocar TODAS as frequências do candidato
      const alocacoesCandidato = processarFrequenciaCliente(candidato, rota.agenda, matrizTempos);

      if (alocacoesCandidato > 0) {
        // ✅ Sucesso: Remove do pool e adiciona à rota
        clientesNaoAlocados.splice(i, 1);
        rota.clientesNaRota.push(candidato);
        clientesAlocados.push(candidato);

        alocouNesteLacoCompleto = true;

        // Debug log
        console.log(
          `  ✅ Alocado ${candidato.cliente.name} (freq: ${candidato.frequenciaRequisitada}, duração: ${candidato.cliente.visitDurationMinutes}min)`
        );

        // Recomeça loop desde o início (clientes mantêm ordem FFD)
        i = -1; // -1 porque será incrementado no loop
      }
    }

    // Se um loop completo sem alcoação = rota saturada
    if (!alocouNesteLacoCompleto) {
      loopsConsecutivosSemAlocacao++;
      console.log(
        `  ⚠️ Loop ${iteracaoAtual} sem alcoações. Contador: ${loopsConsecutivosSemAlocacao}/${MAX_LOOPS_SEM_ALOCACAO}`
      );
    } else {
      loopsConsecutivosSemAlocacao = 0; // Reset se conseguiu alocar algo
    }

    // Verifica capacidade semanal
    let capacidadeRestanteSemanal = 0;
    for (let dia = 0; dia <= 5; dia++) {
      capacidadeRestanteSemanal += obterCapacidadeDisponivel(rota.agenda, dia);
    }

    // Debug: mostra estado atual
    if (iteracaoAtual % 10 === 0 || alocouNesteLacoCompleto) {
      console.log(
        `  [Iter ${iteracaoAtual}] Pool: ${clientesNaoAlocados.length}, Capacidade restante: ${Math.floor(capacidadeRestanteSemanal / 60)}h ${capacidadeRestanteSemanal % 60}m`
      );
    }
  }

  if (iteracaoAtual >= MAX_ITERACOES_TOTAIS) {
    console.log(`  ⚠️ Rota ${numeroRota} atingiu limite de iterações (${MAX_ITERACOES_TOTAIS})`);
  }

  if (loopsConsecutivosSemAlocacao >= MAX_LOOPS_SEM_ALOCACAO) {
    console.log(`  ✅ Rota ${numeroRota} SATURADA (exaustiva, tempos reais de OSRM)`);
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
 * Rebalanceia carga horária entre rotas
 * Se última rota < 60% utilização, tenta mover clientes de rotas anteriores
 */
/**
 * 🔄 NIVELAMENTO AGRESSIVO DE CARGA (v4.2.2)
 * Se última rota <60%, redistribui clientes de rotas >90% até atingir equilíbrio 75-85%
 * SIMPLES e DIRETO: move clientes, sem trocas complexas
 */
function aplicarRebalanceamentoDeCarga(
  rotasGeradas: RotaEmConstrucao[],
  clientesNaoAlocados: ClienteExpandido[],
  matrizTempos: MatrizTempos
): void {
  if (rotasGeradas.length < 2) return;

  const MIN_EQUILIBRIO = 75;
  const MAX_EQUILIBRIO = 85;
  const ALVO_MINIMO = 60;
  const LIMITE_DOACAO = 90;

  const ultimaRota = rotasGeradas[rotasGeradas.length - 1];
  const utilizacaoUltima = calcularUtilizacaoMediaSemanal(ultimaRota);

  console.log(`\n🔄 NIVELAMENTO DE CARGA (v4.2.2 Agressivo)`);
  console.log(`   Rota ${ultimaRota.numero}: ${utilizacaoUltima.toFixed(1)}% | Alvo: ${MIN_EQUILIBRIO}-${MAX_EQUILIBRIO}%`);

  if (utilizacaoUltima >= MIN_EQUILIBRIO) {
    console.log(`   ✅ Carga equilibrada (${utilizacaoUltima.toFixed(1)}% ≥ ${MIN_EQUILIBRIO}%)`);
    return;
  }

  console.log(`   ⚠️ Carga baixa (${utilizacaoUltima.toFixed(1)}% < ${MIN_EQUILIBRIO}%). Redistribuindo...`);

  let clientesMovidos = 0;

  // PASSO 1: Procura rotas doadores (>90%)
  for (let idxDoador = 0; idxDoador < rotasGeradas.length - 1; idxDoador++) {
    const rotaDoadora = rotasGeradas[idxDoador];
    const utilizacaoDoadora = calcularUtilizacaoMediaSemanal(rotaDoadora);

    if (utilizacaoDoadora <= LIMITE_DOACAO) continue; // Só se >90%

    console.log(`   🔍 Rota ${rotaDoadora.numero}: ${utilizacaoDoadora.toFixed(1)}% (>90%) - procurando menores clientes...`);

    // PASSO 2: Ordena clientes por tempo (menores primeiro) para mover os menos impactantes
    const clientesOrdenados = [...rotaDoadora.clientesNaRota].sort((a, b) => {
      const tempoA = a.frequenciaRequisitada * (a.cliente.visitDurationMinutes + 10);
      const tempoB = b.frequenciaRequisitada * (b.cliente.visitDurationMinutes + 10);
      return tempoA - tempoB; // Crescente: menor primeiro
    });

    // PASSO 3: Move clientes menores até atingir alvo
    for (const cliente of clientesOrdenados) {
      const utilizacaoAtual = calcularUtilizacaoMediaSemanal(ultimaRota);
      if (utilizacaoAtual >= MIN_EQUILIBRIO) {
        console.log(`   ✅ Alvo alcançado: ${utilizacaoAtual.toFixed(1)}%`);
        break; // Parar se atingiu alvo
      }

      const tempoCliente = cliente.frequenciaRequisitada * (cliente.cliente.visitDurationMinutes + 10);

      // Verifica se última rota tem capacidade
      const capacidadeLivre = 2880 - (utilizacaoAtual / 100) * 2880;
      if (capacidadeLivre < tempoCliente) continue; // Não cabe

      // ✅ MOVE o cliente
      const idx = rotaDoadora.clientesNaRota.indexOf(cliente);
      if (idx >= 0) {
        rotaDoadora.clientesNaRota.splice(idx, 1);
        ultimaRota.clientesNaRota.push(cliente);

        // Remove de agenda da doadora - apenas dos DIAS onde está realmente alocado
        // BUG FIX v4.2.9: Não subtrair tempo de TODOS os dias, apenas dos alocados
        const tempoUmaVisita = cliente.cliente.visitDurationMinutes + 10; // +10 min deslocamento médio
        
        for (let dia = 0; dia <= 5; dia++) {
          // Remove as visitas do cliente
          rotaDoadora.agenda[dia].visitas = rotaDoadora.agenda[dia].visitas.filter(
            (v) => v.clienteId !== cliente.cliente.id
          );
          
          // Subtrai tempo apenas se o cliente estava realmente alocado neste dia
          if (cliente.visitasAlocadas.has(dia)) {
            rotaDoadora.agenda[dia].tempoUsado -= tempoUmaVisita;
          }
        }

        // ⭐ v4.2.9: LIMPAR visitasAlocadas para realocar em nova rota
        cliente.visitasAlocadas.clear();

        // Adiciona em agenda da receptora
        processarFrequenciaCliente(cliente, ultimaRota.agenda, matrizTempos, true);

        clientesMovidos++;
        console.log(`      → Movido: ${cliente.cliente.name} (${tempoCliente.toFixed(0)} min)`);

        if (utilizacaoAtual >= MAX_EQUILIBRIO) break; // Não sobrecarregar
      }
    }
  }

  // RESULTADO
  const novaUtilizacao = calcularUtilizacaoMediaSemanal(ultimaRota);
  if (clientesMovidos > 0) {
    console.log(`   ✅ ${clientesMovidos} cliente(s) movido(s) | Nova utilização: ${novaUtilizacao.toFixed(1)}%`);
  } else {
    console.log(`   ℹ️ Nenhum cliente movido. Distribuição mantida.`);
  }
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
    console.warn('⚠️ OSRM indisponível, usando fallback Haversine + 1.5x');
    matrizTempos = criarMatrizTemposFallback(clientesOrdenados);
  }
  console.log('✅ Matriz de tempos pronta para alocação\n');

  const clientesNaoAlocados = [...clientesOrdenados];
  const rotasGeradas: RotaEmConstrucao[] = [];

  // 3. Loop: criar rotas até esgotar clientes
  let numeroRota = 1;
  while (clientesNaoAlocados.length > 0) {
    console.log(`🚗 Gerando Rota ${numeroRota}...`);
    const { rota, clientesAlocados } = construirRotaComClusterizacao(
      numeroRota, 
      clientesNaoAlocados,
      matrizTempos
    );

    if (clientesAlocados.length === 0) {
      console.warn('⚠️ Nenhum cliente alocado nesta rota, encerrando.');
      break;
    }

    rotasGeradas.push(rota);
    console.log(
      `  ✅ Alocados ${clientesAlocados.length} cliente(s), Pool restante: ${clientesNaoAlocados.length}`
    );

    numeroRota++;

    // Segurança: máximo de 100 rotas
    if (numeroRota > 100) {
      console.warn(`⚠️ Limite de 100 rotas atingido. ${clientesNaoAlocados.length} clientes não alocados.`);
      break;
    }
  }

  console.log(`\n✅ CRIAÇÃO DINÂMICA COMPLETA: ${rotasGeradas.length} rotas geradas`);

  // 4️⃣ REBALANCEAMENTO DE CARGA (v4.2.2): Evitar ociosidade nas últimas rotas
  aplicarRebalanceamentoDeCarga(rotasGeradas, clientesNaoAlocados, matrizTempos);

  // 5️⃣ Converte para estruturas de output
  // 5a. PromotorRota: estrutura correta (um promotor com agenda semanal)
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

  // 5b. DailyRoute: compatibilidade com exportação (view por dia)
  const rotasFinais: DailyRoute[] = [];

  for (const rotaEmConstrucao of rotasGeradas) {
    // Busca dados do promoter para calcular deslocamento casa→clientes→casa
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
      const tempoDeslocamentoInicial =
        visitasOrdenadas.length > 0
          ? calcularTempoFallback(
              promoterLatitude,
              promoterLongitude,
              visitasOrdenadas[0].latitude,
              visitasOrdenadas[0].longitude
            )
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
      const tempoDeslocamentoFinal =
        visitasOrdenadas.length > 0
          ? calcularTempoFallback(
              visitasOrdenadas[visitasOrdenadas.length - 1].latitude,
              visitasOrdenadas[visitasOrdenadas.length - 1].longitude,
              promoterLatitude,
              promoterLongitude
            )
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

  // 7️⃣ Atribui rotas aos promoters automaticamente
  const routeAssignments = atribuirRotasAPromoters(rotasGeradas, rotasFinais, promoters, matrizTempos);

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
      ],
    },
  };

  console.log(resultado.summary);
  return resultado;
}
