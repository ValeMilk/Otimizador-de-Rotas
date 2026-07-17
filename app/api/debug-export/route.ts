import { OptimizationResult } from '@/types';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const data: OptimizationResult = await request.json();
    
    // Salvar em arquivo de debug
    const debugPath = join(process.cwd(), 'public', 'debug-export.json');
    await writeFile(debugPath, JSON.stringify(data, null, 2));
    
    console.log(`[DEBUG_EXPORT] Arquivo salvo em ${debugPath}`);
    console.log(`[DEBUG_EXPORT] Rotas: ${data.routes?.length || 0}`);
    
    return Response.json({
      success: true,
      message: 'Debug export saved',
      path: debugPath,
      routesCount: data.routes?.length || 0
    });
  } catch (error) {
    console.error('[DEBUG_EXPORT_ERROR]', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
