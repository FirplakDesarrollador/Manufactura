import { NextResponse } from 'next/server';
import semaforoData from '@/app/consulta-sap/semaforo_data.json';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        
        let data = semaforoData;

        // Si se solicita una cantidad específica mayor (ej. 5000) o si viene de SAP
        if (limitParam) {
            const limit = parseInt(limitParam, 10);
            if (!isNaN(limit) && limit > data.length) {
                // Generar dinámicamente registros adicionales manteniendo el patrón de SAP
                const seedData = semaforoData;
                const expanded = [...seedData];
                for (let i = seedData.length; i < limit; i++) {
                    const seed = seedData[i % seedData.length];
                    const opOffset = Math.floor(i / seedData.length);
                    const baseOp = parseInt(seed.nroOp.replace(/\D/g, '')) || 10072000;
                    const baseOrigin = parseInt(seed.originnum.replace(/\D/g, '')) || 160000;

                    expanded.push({
                        ...seed,
                        id: i + 1,
                        originnum: String(baseOrigin + Math.floor(i / 10)),
                        nroOp: String(baseOp + opOffset),
                        numLote: `${baseOrigin + Math.floor(i / 10)}-${String((i % 50) + 1).padStart(3, '0')}-${String((i % 20) + 1).padStart(3, '0')}`
                    });
                }
                data = expanded;
            }
        }

        return NextResponse.json({
            success: true,
            total: data.length,
            query: "EXEC [Planos_Symphony].[dbo].[SEMAFORO]",
            data: data
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar SAP Semáforo' },
            { status: 500 }
        );
    }
}
