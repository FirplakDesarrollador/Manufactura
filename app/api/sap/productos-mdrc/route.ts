import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';

function mapColor(colorCodigo: string | null | undefined): string {
    const code = String(colorCodigo || '').trim();
    switch (code) {
        case '0100': return 'BLANCO';
        case '0160':
        case '0106': return 'NEGRO';
        case '0300': return 'NATURAL';
        case '0155':
        case '0150': return 'GRIS';
        case '0501': return 'GRIS BRUMA';
        case '0500': return 'GRIS NIEBLA';
        case '0503': return 'GRIS SOMBRA';
        case '0950': return 'GRANITO GRIS';
        case '0960': return 'GRANITO NEGRO';
        case '0902': return 'GRANITO MARFIL';
        case '0900': return 'GRANITO BLANCO';
        case '0901': return 'GRANITO PERLA';
        case '0904': return 'GRANITO CHAMPANA';
        case '0103': return 'MARFIL';
        default: return 'OTRO';
    }
}

function mapPlanta(grupo: string | null | undefined, plantaCodigo: string | null | undefined): string {
    const g = String(grupo || '').trim().toUpperCase();
    const p = String(plantaCodigo || '').trim().toUpperCase();

    if (g === 'QUARTZSTONE') return 'QUARZTONE';
    if (['MBL', 'ESPGAB'].includes(p)) return 'MUEBLES';
    if (p === 'PC') return 'MARMOL';
    if (p === 'RTM') return 'RTM';
    if (p === 'ALM') return 'COMERCIALIZADO';
    if (['FV', 'FVHM', 'FVHMP'].includes(p)) return 'FIBRA';
    if (p === 'KIT') return 'KIT';
    return 'SIN PLANTA';
}

function parseDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (str.length === 8) {
        const year = str.substring(0, 4);
        const month = str.substring(4, 6);
        const day = str.substring(6, 8);
        return `${year}-${month}-${day} 00:00:00`;
    }
    return str;
}

export async function GET() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';

        const queryUrl = `${baseUrl}/SQLQueries('fir_productos_mdrc')/List`;

        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader || loginData,
                'Content-Type': 'application/json',
                'Prefer': 'odata.maxpagesize=5000'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en SAP Service Layer (${response.status}): ${errorText}`);
        }

        const json = await response.json();
        const rawRows: any[] = json.value || [];

        const mappedRows = rawRows.map((item: any) => {
            const desc = String(item.producto_descripcion || '');
            const flauta = desc.toLowerCase().includes('con flauta') ? 'true' : 'false';
            const color = mapColor(item.color_codigo);
            const planta = mapPlanta(item.grupo, item.planta_codigo);

            return {
                id: item.id,
                created_at: parseDate(item.created_at),
                modified_at: parseDate(item.modified_at),
                producto_sku: item.producto_sku || '',
                producto_descripcion: desc,
                molde_sku: item.molde_sku || '',
                flauta,
                color,
                color_codigo: item.color_codigo || '',
                familia: item.familia || '',
                grupo: item.grupo || '',
                grupo_codigo: item.grupo_codigo || null,
                planta,
                planta_codigo: item.planta_codigo || '',
                masa: Number(item.masa) || 0
            };
        });

        // Ordenar por created_at descendente
        mappedRows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        return NextResponse.json({
            success: true,
            total: mappedRows.length,
            endpoint: "/SQLQueries('fir_productos_mdrc')/List",
            data: mappedRows
        });

    } catch (error: any) {
        console.error("Error en /api/sap/productos-mdrc:", error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al consultar productos MDRC desde SAP'
        }, { status: 500 });
    }
}
