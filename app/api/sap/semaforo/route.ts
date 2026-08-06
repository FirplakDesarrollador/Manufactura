import { NextResponse } from 'next/server';

interface SemaforoApiRow {
    Originnum: string;
    "Nro OP": string;
    SKU: string;
    "Descripción Artículo": string;
    Planta: string;
    Familia: string;
    "Tipo Orden": string;
    "Cant. Pendiente": string;
    "Cant. Pend. Item": string | null;
    "Cantidad total": string;
    "Disponible PT01": string;
    "Fecha Creación OP": string;
    Estado: string;
    "Fecha Recomendada Liberación": string;
    "Fecha Real Liberación": string;
    "Consumo Para Liberar": string;
    "Color Liberación Txt": string;
    "Color Liberación": string;
    "Cumplimiento Liberación": string;
    "Fecha Entrega Lote": string;
    "Fecha Recomendada de Entrega": string;
    "Fecha Cierre OP": string | null;
    "Fecha Ideal Entrega Producción": string;
    "Consumo Amortiguador Planta": string;
    "Color Producción Txt": string;
    "Color Producción": string;
    "Cumplimiento Planta": string;
    "Dias Retrazo Firplak": string;
    "Color Firplak Txt": string;
    "Color Firplak": string;
    "Cumplimiento Firplak": string;
    "Fecha Prometida Entrega Item": string;
    Destino: string;
    NumLote: string;
    Molde: string | null;
    "Capacidad Molde": string | null;
    "Fecha Carga Molde": string;
    Amortiguador: string;
    Cliente: string;
}

interface SemaforoApiResponse {
    error: boolean;
    message: string;
    response: SemaforoApiRow[];
}

function mapRow(row: SemaforoApiRow, index: number) {
    return {
        id: index + 1,
        originnum: row.Originnum,
        nroOp: row["Nro OP"],
        sku: row.SKU,
        descripcion: row["Descripción Artículo"],
        planta: row.Planta,
        familia: row.Familia,
        tipoOrden: row["Tipo Orden"],
        cantPendiente: row["Cant. Pendiente"],
        cantPendItem: row["Cant. Pend. Item"],
        cantTotal: row["Cantidad total"],
        disponiblePt01: row["Disponible PT01"],
        fechaCreacionOp: row["Fecha Creación OP"],
        estado: row.Estado,
        fechaRecomendadaLiberacion: row["Fecha Recomendada Liberación"],
        fechaRealLiberacion: row["Fecha Real Liberación"],
        consumoParaLiberar: row["Consumo Para Liberar"],
        colorLiberacionTxt: row["Color Liberación Txt"],
        colorLiberacion: row["Color Liberación"],
        cumplimientoLiberacion: row["Cumplimiento Liberación"],
        fechaEntregaLote: row["Fecha Entrega Lote"],
        fechaRecomendadaEntrega: row["Fecha Recomendada de Entrega"],
        fechaCierreOp: row["Fecha Cierre OP"],
        fechaIdealEntregaProduccion: row["Fecha Ideal Entrega Producción"],
        consumoAmortiguadorPlanta: row["Consumo Amortiguador Planta"],
        colorProduccionTxt: row["Color Producción Txt"],
        colorProduccion: row["Color Producción"],
        cumplimientoPlanta: row["Cumplimiento Planta"],
        diasRetrazoFirplak: row["Dias Retrazo Firplak"],
        colorFirplakTxt: row["Color Firplak Txt"],
        colorFirplak: row["Color Firplak"],
        cumplimientoFirplak: row["Cumplimiento Firplak"],
        fechaPrometidaEntregaItem: row["Fecha Prometida Entrega Item"],
        destino: row.Destino,
        numLote: row.NumLote,
        molde: row.Molde,
        capacidadMolde: row["Capacidad Molde"],
        fechaCargaMolde: row["Fecha Carga Molde"],
        amortiguador: row.Amortiguador,
        cliente: row.Cliente,
    };
}

export async function GET() {
    const apiUrl = process.env.SEMAFORO_API_URL;
    const apiKey = process.env.SEMAFORO_API_KEY;

    if (!apiUrl || !apiKey) {
        return NextResponse.json(
            { success: false, error: 'Faltan variables de entorno SEMAFORO_API_URL / SEMAFORO_API_KEY' },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'api-key': apiKey,
                'ngrok-skip-browser-warning': 'true',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { success: false, error: `Error consultando Semáforo: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const result: SemaforoApiResponse = await response.json();

        if (result.error) {
            return NextResponse.json(
                { success: false, error: result.message || 'La API de Semáforo reportó un error' },
                { status: 502 }
            );
        }

        const data = result.response.map(mapRow);

        return NextResponse.json({
            success: true,
            total: data.length,
            query: "EXEC [Planos_Symphony].[dbo].[SEMAFORO]",
            data,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar Semáforo' },
            { status: 500 }
        );
    }
}
