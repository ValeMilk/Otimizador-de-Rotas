'use client';

import * as XLSX from 'xlsx';

export interface TemplateData {
  CÓD: string;
  'NOME FANTASIA': string;
  LATITUDE: string;
  LONGITUDE: string;
  'TEMPO MÉDIO DE VISITA': string;
  FREQUÊNCIA: string;
  SEG: string;
  TER: string;
  QUA: string;
  QUI: string;
  SEX: string;
  SAB: string;
  ROTAS: string;
}

const HEADERS = [
  'CÓD',
  'NOME FANTASIA',
  'LATITUDE',
  'LONGITUDE',
  'TEMPO MÉDIO DE VISITA',
  'FREQUÊNCIA',
  'SEG (Dias do Vendedor)',
  'TER (Dias do Vendedor)',
  'QUA (Dias do Vendedor)',
  'QUI (Dias do Vendedor)',
  'SEX (Dias do Vendedor)',
  'SAB (Dias do Vendedor)',
];

/**
 * Gera um arquivo Excel vazio com as colunas padrão
 */
export const generateBlankTemplate = (): void => {
  // Cria 5 linhas vazias COM as colunas header
  const emptyRows = Array(5)
    .fill(null)
    .map(() => Object.fromEntries(HEADERS.map((h) => [h, ''])));

  const ws = XLSX.utils.json_to_sheet(emptyRows);

  // Define largura das colunas para melhor visualização
  const columnWidths = [
    { wch: 10 }, // CÓD
    { wch: 25 }, // NOME FANTASIA
    { wch: 12 }, // LATITUDE
    { wch: 12 }, // LONGITUDE
    { wch: 20 }, // TEMPO MÉDIO DE VISITA
    { wch: 12 }, // FREQUÊNCIA
    { wch: 20 }, // SEG (Dias do Vendedor)
    { wch: 20 }, // TER (Dias do Vendedor)
    { wch: 20 }, // QUA (Dias do Vendedor)
    { wch: 20 }, // QUI (Dias do Vendedor)
    { wch: 20 }, // SEX (Dias do Vendedor)
    { wch: 20 }, // SAB (Dias do Vendedor)
  ];
  ws['!cols'] = columnWidths;

  // Formata o header (primeira linha)
  HEADERS.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, 'template_clientes.xlsx');
};

/**
 * Gera um arquivo Excel com exemplos para referência
 */
export const generateExampleTemplate = (): void => {
  const exampleData = [
    {
      CÓD: '001',
      'NOME FANTASIA': 'Loja Centro',
      LATITUDE: '-23.5505',
      LONGITUDE: '-46.6333',
      'TEMPO MÉDIO DE VISITA': '01:00:00',
      FREQUÊNCIA: '2',
      'SEG (Dias do Vendedor)': 'X',
      'TER (Dias do Vendedor)': '',
      'QUA (Dias do Vendedor)': '',
      'QUI (Dias do Vendedor)': '',
      'SEX (Dias do Vendedor)': 'X',
      'SAB (Dias do Vendedor)': '',
    },
    {
      CÓD: '002',
      'NOME FANTASIA': 'Loja Zona Sul',
      LATITUDE: '-23.5886',
      LONGITUDE: '-46.6536',
      'TEMPO MÉDIO DE VISITA': '00:45:00',
      FREQUÊNCIA: '3',
      'SEG (Dias do Vendedor)': '',
      'TER (Dias do Vendedor)': 'X',
      'QUA (Dias do Vendedor)': 'X',
      'QUI (Dias do Vendedor)': '',
      'SEX (Dias do Vendedor)': 'X',
      'SAB (Dias do Vendedor)': '',
    },
    {
      CÓD: '003',
      'NOME FANTASIA': 'Loja Zona Norte',
      LATITUDE: '-23.5602',
      LONGITUDE: '-46.7057',
      'TEMPO MÉDIO DE VISITA': '00:30:00',
      FREQUÊNCIA: '2',
      'SEG (Dias do Vendedor)': 'X',
      'TER (Dias do Vendedor)': 'X',
      'QUA (Dias do Vendedor)': '',
      'QUI (Dias do Vendedor)': '',
      'SEX (Dias do Vendedor)': '',
      'SAB (Dias do Vendedor)': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData);

  // Define largura das colunas
  const columnWidths = [
    { wch: 10 }, // CÓD
    { wch: 25 }, // NOME FANTASIA
    { wch: 12 }, // LATITUDE
    { wch: 12 }, // LONGITUDE
    { wch: 20 }, // TEMPO MÉDIO DE VISITA
    { wch: 12 }, // FREQUÊNCIA
    { wch: 20 }, // SEG (Dias do Vendedor)
    { wch: 20 }, // TER (Dias do Vendedor)
    { wch: 20 }, // QUA (Dias do Vendedor)
    { wch: 20 }, // QUI (Dias do Vendedor)
    { wch: 20 }, // SEX (Dias do Vendedor)
    { wch: 20 }, // SAB (Dias do Vendedor)
  ];
  ws['!cols'] = columnWidths;

  // Formata o header (primeira linha)
  HEADERS.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, 'template_clientes_exemplo.xlsx');
};

/**
 * Download do template em branco
 */
export const downloadBlankTemplate = (): void => {
  generateBlankTemplate();
};

/**
 * Download do template com exemplos
 */
export const downloadExampleTemplate = (): void => {
  generateExampleTemplate();
};
