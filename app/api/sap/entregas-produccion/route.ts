import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';

function parseToIsoDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    // Check if DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
        const [d, m, y] = clean.split('/');
        return `${y}-${m}-${d}`;
    }
    // Check if YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        return clean;
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }
    return null;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fromParam = searchParams.get('fromDate') || searchParams.get('desde');
        const toParam = searchParams.get('toDate') || searchParams.get('hasta');

        const fromDate = parseToIsoDate(fromParam);
        const toDate = parseToIsoDate(toParam);

        if (!fromDate || !toDate) {
            return NextResponse.json(
                { success: false, error: 'Fechas de contabilización inválidas. Formato requerido: DD/MM/AAAA' },
                { status: 400 }
            );
        }

        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '');

        // Construir filtro por fecha de contabilización (DocDate)
        const dateFilter = `DocDate ge '${fromDate}' and DocDate le '${toDate}'`;
        let nextUrl: string | null = `${baseUrl}/InventoryGenEntries?$filter=${encodeURIComponent(dateFilter)}&$orderby=DocNum desc&$select=DocEntry,DocNum,DocDate,DocumentLines`;

        let allEntries: any[] = [];
        let maxPages = 15; // Límite de seguridad
        let pageCount = 0;

        while (nextUrl && pageCount < maxPages) {
            pageCount++;
            const response: Response = await fetch(nextUrl, {
                method: 'GET',
                headers: {
                    'Cookie': loginData.cookieHeader,
                    'Content-Type': 'application/json',
                    'Prefer': 'odata.maxpagesize=500'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json(
                    { success: false, error: `Error SAP: ${response.status} - ${errText}` },
                    { status: response.status }
                );
            }

            const data: any = await response.json();
            const items = data.value || [];
            allEntries.push(...items);

            if (data['odata.nextLink'] || data['@odata.nextLink']) {
                const nextRel = data['odata.nextLink'] || data['@odata.nextLink'];
                nextUrl = nextRel.startsWith('http') ? nextRel : `${baseUrl}/${nextRel.replace(/^\//, '')}`;
            } else {
                nextUrl = null;
            }
        }

        // Aplanar líneas de documento con almacenes de Producto Terminado (PT-01, PT-02, PT-08 o inicio PT)
        const validWhs = ['PT-01', 'PT-02', 'PT-08'];
        const mappedRows: any[] = [];

        for (const entry of allEntries) {
            const lines = entry.DocumentLines || [];
            for (const line of lines) {
                const whs = line.WarehouseCode || '';
                if (validWhs.includes(whs) || whs.startsWith('PT')) {
                    const batchNum = line.BatchNumbers?.[0]?.BatchNumber || '';
                    mappedRows.push({
                        id: mappedRows.length + 1,
                        docNum: String(entry.DocNum || ''),
                        itemCode: line.ItemCode || '',
                        descripcion: line.ItemDescription || '',
                        cantidad: Number(line.Quantity) || 0,
                        whsCode: whs,
                        familia: line.U_Familia || 'MBL',
                        ov: String(line.U_LineItemOV || line.BaseRef || line.BaseEntry || ''),
                        numLote: batchNum || (line.BaseRef ? `${line.BaseRef}-001` : ''),
                        tipoOrden: line.U_HBT_TipoOrdenEDI || 'STANDARD',
                        docNumOP: String(line.BaseRef || line.BaseEntry || ''),
                        bloqueado: line.U_Bloqueado || 'N'
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            total: mappedRows.length,
            query: "SELECT T0.[DocNum], T1.[ItemCode], T1.[Dscription], T1.[Quantity], T1.[WhsCode], T2.[U_Familia], T3.[OriginNum] as 'OV', t3.U_Numlote, T3.[U_Tipo_Orden], T3.[DocNum], T4.[U_Bloqueado] FROM OIGN T0 INNER JOIN IGN1 T1 ...",
            data: mappedRows
        });

    } catch (error: any) {
        console.error("Error en API de Entregas Producción:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar entregas de producción en SAP' },
            { status: 500 }
        );
    }
}
