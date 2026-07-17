import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Otimizador de Rotas de Vendas',
  description: 'Sistema inteligente de roteirização para promotores de vendas',
  keywords: 'rotas, otimização, vendas, promotores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}
