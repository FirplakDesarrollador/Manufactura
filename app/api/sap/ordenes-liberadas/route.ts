import { NextResponse } from 'next/server';

interface OrdenLiberadaApiRow {
    DocNum: number | string;
    type?: string;
    Status?: string;
    "Fecha Fabricación"?: string | null;
    "Fecha Finalización"?: string | null;
    CloseDate?: string | null;
    CardCode?: string | null;
    CardName?: string | null;
    ItemCode?: string;
    Itemname?: string;
    Warehouse?: string;
    "Cant.Planificada"?: string | number;
    "Cant.Completada"?: string | number;
    "PENDIENTE-OJO cuando sea superior a 1"?: string | number;
    U_name?: string | null;
    [key: string]: any;
}

interface ApiResponse {
    error: boolean;
    message: string;
    response: OrdenLiberadaApiRow[];
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
        const clean = String(dateStr).trim();
        if (clean.includes('-') && clean.length >= 10) {
            const parts = clean.slice(0, 10).split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        const d = new Date(clean);
        if (isNaN(d.getTime())) return clean;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return String(dateStr || '');
    }
}

function mapRow(row: OrdenLiberadaApiRow, index: number) {
    const planned = Number(row["Cant.Planificada"]) || 0;
    const completed = Number(row["Cant.Completada"]) || 0;
    const rawPendiente = row["PENDIENTE-OJO cuando sea superior a 1"];
    const pendiente = rawPendiente !== undefined && rawPendiente !== null && rawPendiente !== ''
        ? Number(rawPendiente)
        : (planned - completed);

    return {
        id: index + 1,
        docNum: row.DocNum !== undefined && row.DocNum !== null ? String(row.DocNum) : '',
        tipo: row.type || 'Estándar',
        status: row.Status || 'Liberado',
        fechaFabricacion: formatDate(row["Fecha Fabricación"]),
        fechaFinalizacion: formatDate(row["Fecha Finalización"]),
        fechaCierre: formatDate(row.CloseDate),
        codigoCliente: row.CardCode || '',
        nombreSN: row.CardName || 'FIRPLAK S A',
        itemCode: row.ItemCode || '',
        itemName: row.Itemname || '',
        almacen: row.Warehouse || '',
        cantPlanificada: planned,
        cantCompletada: completed,
        pendiente: pendiente,
        usuario: row.U_name || 'Usuario Sistema',
    };
}

export async function GET() {
    const apiUrl = process.env.ORDENESLIBERADAS_API_URL || 'https://rented-paralyses-wince.ngrok-free.dev/ordenesliberadasms/';
    const apiKey = process.env.ORDENESLIBERADAS_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';

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
                { success: false, error: `Error consultando Órdenes Liberadas: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const result: ApiResponse = await response.json();

        if (result.error) {
            return NextResponse.json(
                { success: false, error: result.message || 'La API de Órdenes Liberadas reportó un error' },
                { status: 502 }
            );
        }

        const rawRows = Array.isArray(result.response) ? result.response : [];
        const data = rawRows.map(mapRow);

        return NextResponse.json({
            success: true,
            total: data.length,
            query: "FPK - Ordenes de fabricación liberadas",
            data,
        });
    } catch (error: any) {
        console.error("Error en API de órdenes liberadas:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar órdenes liberadas' },
            { status: 500 }
        );
    }
}
