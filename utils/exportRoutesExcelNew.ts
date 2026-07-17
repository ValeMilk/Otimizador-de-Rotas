import * as XLSX from 'xlsx';
import { OptimizationResult } from '@/types';
import { minutesToTimeString } from './timeUtils';

/**
 * Exporta as rotas otimizadas para um arquivo Excel
 * Estrutura correta: Cada ROTA é um PROMOTOR com agenda de SEGUNDA A SÁBADO
 */
export const exportRoutesToExcelNew = (result: OptimizationResult) => {
  const workbook = XLSX.utils.book_new();

  // ===== PLANILHA 1: CLIENTES COM ROTAS E DIAS =====
  const clientsData: any[] = [
    ['CÓD', 'NOME FANTASIA', 'ROTA', 'FREQUÊNCIA', 'TEMPO MÉDIO DE VISITA', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
  ];

  // Mapa: cliente -> { rotaId, dias }
  const clientRouteMap = new Map<string, { rotaId: number; dias: Set<string> }>();

  // Processar rotas (estrutura PromotorRota)
  if (result.rotas && result.rotas.length > 0) {
    console.log('\n📍 PROCESSANDO ROTAS (PromotorRota):');
    
    result.rotas.forEach(rota => {
      console.log(`\n  Rota ${rota.id} (${rota.nome}):`);
      
      const diasPT = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      
      // Iterar por cada dia da semana
      diasPT.forEach((diaPT) => {
        const agenda = rota.agenda[diaPT as keyof typeof rota.agenda];
        if (!agenda || agenda.stops.length === 0) return;
        
        console.log(`    ${diaPT}: ${agenda.stops.length} cliente(s)`);
        
        // Cada stop é um cliente visitado neste dia
        agenda.stops.forEach(stop => {
          if (!clientRouteMap.has(stop.clientId)) {
            clientRouteMap.set(stop.clientId, {
              rotaId: rota.id,
              dias: new Set(),
            });
          }
          
          const data = clientRouteMap.get(stop.clientId)!;
          data.dias.add(diaPT);
          console.log(`      ✓ ${stop.clientId}: adicionado ao dia ${diaPT}`);
        });
      });
    });
  }

  console.log('\n📋 MAPEAMENTO COMPLETO:');
  for (const [clientId, data] of clientRouteMap) {
    console.log(`  Cliente ${clientId}: ROTA ${data.rotaId}, dias=[${Array.from(data.dias).join(', ')}]`);
  }

  // Montar linhas com clientes
  if (result.clients) {
    console.log('\n📝 ADICIONANDO CLIENTES À PLANILHA:');
    
    result.clients.forEach(client => {
      const routeData = clientRouteMap.get(client.id);
      
      // Apenas exportar clientes alocados
      if (!routeData) {
        console.log(`  ⊘ Cliente ${client.id}: NÃO ALOCADO - pulando`);
        return;
      }
      
      const hasSeg = routeData.dias.has('Segunda-feira');
      const hasTer = routeData.dias.has('Terça-feira');
      const hasQua = routeData.dias.has('Quarta-feira');
      const hasQui = routeData.dias.has('Quinta-feira');
      const hasSex = routeData.dias.has('Sexta-feira');
      const hasSab = routeData.dias.has('Sábado');
      
      const row: any[] = [
        client.id,
        client.name,
        `ROTA ${routeData.rotaId}`,
        client.frequency,
        minutesToTimeString(client.visitDurationMinutes),
        hasSeg ? 'X' : '',
        hasTer ? 'X' : '',
        hasQua ? 'X' : '',
        hasQui ? 'X' : '',
        hasSex ? 'X' : '',
        hasSab ? 'X' : '',
      ];
      
      clientsData.push(row);
      console.log(`  ✓ Cliente ${client.id}: ROTA ${routeData.rotaId}, ${Array.from(routeData.dias).join(', ')}`);
    });
  }

  // Formatar planilha de clientes
  const clientsSheet = XLSX.utils.aoa_to_sheet(clientsData);
  clientsSheet['!cols'] = [
    { wch: 12 }, // CÓD
    { wch: 30 }, // NOME FANTASIA
    { wch: 12 }, // ROTA
    { wch: 12 }, // FREQUÊNCIA
    { wch: 18 }, // TEMPO MÉDIO DE VISITA
    { wch: 8 },  // SEG
    { wch: 8 },  // TER
    { wch: 8 },  // QUA
    { wch: 8 },  // QUI
    { wch: 8 },  // SEX
    { wch: 8 },  // SAB
  ];

  // Formatar header
  for (let i = 0; i < 11; i++) {
    const cell = clientsSheet[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clientes');

  // ===== PLANILHA 2: RESUMO =====
  const summaryData = [
    ['RESUMO DA OTIMIZAÇÃO'],
    [],
    ['Total de Promotores', result.summary.totalPromotores || result.rotas?.length || 0],
    ['Total de Clientes Alocados', result.summary.totalClientsAssigned],
    ['Utilização Média', `${result.summary.averageUtilization}%`],
    [],
    ['Avisos'],
    ...result.summary.warnings.map((w) => [w]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // ===== PLANILHA 3: DETALHES POR PROMOTOR E DIA =====
  const routeDetailsData: any[] = [
    ['DETALHES DAS ROTAS POR PROMOTOR'],
    [],
    ['Promotor', 'Dia', 'Ordem', 'Cliente', 'Chegada', 'Saída', 'Visitação', 'Deslocamento'],
  ];

  if (result.rotas && result.rotas.length > 0) {
    const diasPT = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    
    result.rotas.forEach(rota => {
      diasPT.forEach(diaPT => {
        const agenda = rota.agenda[diaPT as keyof typeof rota.agenda];
        if (!agenda || agenda.stops.length === 0) return;
        
        agenda.stops.forEach((stop, idx) => {
          routeDetailsData.push([
            `${rota.nome} (${rota.promoterId})`,
            diaPT,
            stop.order,
            stop.clientName,
            stop.arrivalTime,
            stop.departureTime,
            `${stop.visitDurationMinutes}min`,
            `${stop.travelTimeMinutes}min`,
          ]);
        });
      });
    });
  }

  const routeDetailsSheet = XLSX.utils.aoa_to_sheet(routeDetailsData);
  routeDetailsSheet['!cols'] = [
    { wch: 20 }, // Promotor
    { wch: 15 }, // Dia
    { wch: 8 },  // Ordem
    { wch: 30 }, // Cliente
    { wch: 12 }, // Chegada
    { wch: 12 }, // Saída
    { wch: 12 }, // Visitação
    { wch: 12 }, // Deslocamento
  ];

  // Formatar header
  for (let i = 0; i < 8; i++) {
    const cell = routeDetailsSheet[XLSX.utils.encode_cell({ r: 2, c: i })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '059669' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  XLSX.utils.book_append_sheet(workbook, routeDetailsSheet, 'Detalhes');

  // ===== SALVAR ARQUIVO =====
  const fileName = `Roteirizacao_${new Date().toISOString().split('T')[0]}_${new Date().getHours()}-${String(new Date().getMinutes()).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  
  console.log(`\n✅ Arquivo exportado: ${fileName}`);
};
