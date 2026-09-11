import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        console.log("Iniciando solicitud a la nueva API Python (Cloudflare) para semaforo...");
        
        const apiUrl = "https://cfr-bernard-supported-guestbook.trycloudflare.com/semaforo/";
        
        const listRes = await fetch(apiUrl, {
            headers: {
                'api-key': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us'
            },
            cache: 'no-store'
        });

        if (!listRes.ok) {
            const errText = await listRes.text();
            throw new Error(`Error al consultar semaforo en Cloudflare: ${listRes.status} - ${errText}`);
        }

        const data = await listRes.json();
        
        if (data.error) {
            throw new Error(`Error retornado por la API Python: ${data.message}`);
        }

        const allRecords = data.response || [];

        console.log(`Consulta completada. Total registros obtenidos: ${allRecords.length}`);

        // Mapear de los nombres devueltos por la API (asumiendo que coinciden con los del UDT o la vista)
        // Se intenta mapear tanto con las llaves 'U_...' como con las llaves que puede devolver la vista en Python
        const mappedRecords = allRecords.map((r: any, index: number) => ({
            id: index + 1,
            originnum: r.U_Originnum ?? r.Originnum ?? null,
            nroOp: r.U_NroOP ?? r['Nro OP'] ?? r.NroOP ?? null,
            sku: r.U_SKU ?? r.SKU ?? null,
            descripcion: r.U_DescArticulo ?? r['Descripción Artículo'] ?? r.DescArticulo ?? null,
            planta: r.U_Planta ?? r.Planta ?? null,
            familia: r.U_Familia ?? r.Familia ?? null,
            tipoOrden: r.U_TipoOrden ?? r['Tipo Orden'] ?? r.TipoOrden ?? null,
            cantPendiente: r.U_CantPendiente ?? r['Cant. Pendiente'] ?? r.CantPendiente ?? null,
            cantPendItem: r.U_CantPendItem ?? r['Cant. Pend. Item'] ?? r.CantPendItem ?? null,
            cantTotal: r.U_CantidadTotal ?? r['Cantidad total'] ?? r.CantidadTotal ?? null,
            disponiblePt01: r.U_DisponiblePT01 ?? r['Disponible PT01'] ?? r.DisponiblePT01 ?? null,
            fechaCreacionOp: r.U_FechaCreacionOP ?? r['Fecha Creación OP'] ?? r.FechaCreacionOP ?? null,
            estado: r.U_Estado ?? r.Estado ?? null,
            fechaRecomendadaLiberacion: r.U_FechaRecoLib ?? r['Fecha Recomendada Liberación'] ?? r.FechaRecoLib ?? null,
            fechaRealLiberacion: r.U_FechaRealLib ?? r['Fecha Real Liberación'] ?? r.FechaRealLib ?? null,
            consumoParaLiberar: r.U_ConsumoParaLib ?? r['Consumo Para Liberar'] ?? r.ConsumoParaLib ?? null,
            colorLiberacionTxt: r.U_ColorLibTxt ?? r['Color Liberación Txt'] ?? r.ColorLibTxt ?? null,
            colorLiberacion: r.U_ColorLib ?? r['Color Liberación'] ?? r.ColorLib ?? null,
            cumplimientoLiberacion: r.U_CumpLib ?? r['Cumplimiento Liberación'] ?? r.CumpLib ?? null,
            fechaEntregaLote: r.U_FechaEntLote ?? r['Fecha Entrega Lote'] ?? r.FechaEntLote ?? null,
            fechaRecomendadaEntrega: r.U_FechaRecoEnt ?? r['Fecha Recomendada de Entrega'] ?? r.FechaRecoEnt ?? null,
            fechaCierreOp: r.U_FechaCierreOP ?? r['Fecha Cierre OP'] ?? r.FechaCierreOP ?? null,
            fechaIdealEntregaProduccion: r.U_FechaIdealEnt ?? r['Fecha Ideal Entrega Producción'] ?? r.FechaIdealEnt ?? null,
            consumoAmortiguadorPlanta: r.U_ConsumoAmort ?? r['Consumo Amortiguador Planta'] ?? r.ConsumoAmort ?? null,
            colorProduccionTxt: r.U_ColorProdTxt ?? r['Color Producción Txt'] ?? r.ColorProdTxt ?? null,
            colorProduccion: r.U_ColorProd ?? r['Color Producción'] ?? r.ColorProd ?? null,
            cumplimientoPlanta: r.U_CumpPlanta ?? r['Cumplimiento Planta'] ?? r.CumpPlanta ?? null,
            diasRetrazoFirplak: r.U_DiasRetrazo ?? r['Dias Retrazo Firplak'] ?? r.DiasRetrazo ?? null,
            colorFirplakTxt: r.U_ColorFirplakTxt ?? r['Color Firplak Txt'] ?? r.ColorFirplakTxt ?? null,
            colorFirplak: r.U_ColorFirplak ?? r['Color Firplak'] ?? r.ColorFirplak ?? null,
            cumplimientoFirplak: r.U_CumpFirplak ?? r['Cumplimiento Firplak'] ?? r.CumpFirplak ?? null,
            fechaPrometidaEntregaItem: r.U_FechaPromEnt ?? r['Fecha Prometida Entrega Item'] ?? r.FechaPromEnt ?? null,
            destino: r.U_Destino ?? r.Destino ?? null,
            numLote: r.U_NumLote ?? r.NumLote ?? null,
            molde: r.U_Molde ?? r.Molde ?? null,
            capacidadMolde: r.U_CapacidadMolde ?? r['Capacidad Molde'] ?? r.CapacidadMolde ?? null,
            fechaCargaMolde: r.U_FechaCargaMolde ?? r['Fecha Carga Molde'] ?? r.FechaCargaMolde ?? null,
            amortiguador: r.U_Amortiguador ?? r.Amortiguador ?? null,
            cliente: r.U_Cliente ?? r.Cliente ?? null
        }));

        return NextResponse.json({
            success: true,
            source: 'Python API (Cloudflare)',
            data: mappedRecords,
            total: mappedRecords.length
        });

    } catch (error: any) {
        console.error("Error en API semáforo (Python API):", error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch from Python API', details: error.message },
            { status: 500 }
        );
    }
}
