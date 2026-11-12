import { NextResponse } from 'next/server';
import { fetchSAP, SAP_BASE_URL } from '@/lib/sap';

// Traslados de una orden de fabricación.
// En SAP los traslados no quedan ligados a la OF por documento base: la planta escribe el número de la OF al inicio
// del comentario (ej. "2263061<tab>HIDROAERO SANTORINI ... Basado en Solicitud de traslado 73632.").
// Se buscan Solicitudes de traslado y Traslados cuyo comentario contenga la OF como número completo (no parte de otro).
const ESTADOS: Record<string, string> = { bost_Open: 'Abierto', bost_Close: 'Cerrado', bost_Paid: 'Cerrado', bost_Delivered: 'Cerrado' };

type Linea = { item: string; descripcion: string; cantidad: number; desde: string; hacia: string };
type DocTraslado = { tipo: 'Solicitud' | 'Traslado'; docNum: number; fecha: string; desde: string; hacia: string; estado: string; comentario: string; solicitudBase: number | null; lineas: Linea[] };

const fecha = (iso?: string) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';

export async function GET(_request: Request, props: { params: Promise<{ docNum: string }> }) {
    try {
        const { docNum } = await props.params;
        if (!docNum || !/^\d+$/.test(docNum)) return NextResponse.json({ error: 'Número de orden inválido' }, { status: 400 });

        const baseUrl = process.env.SAP_BASE_URL || (process.env.SAP_API_URL ? process.env.SAP_API_URL.replace(/\/Login\/?$/, '') : SAP_BASE_URL);
        const filtro = encodeURIComponent(`contains(Comments,'${docNum}')`);
        const comoNumero = new RegExp(`(^|\\D)${docNum}(\\D|$)`);

        const consultar = async (entidad: 'InventoryTransferRequests' | 'StockTransfers', tipo: DocTraslado['tipo']): Promise<DocTraslado[]> => {
            const r = await fetchSAP(`${baseUrl}/${entidad}?$filter=${filtro}&$orderby=DocEntry asc`, { method: 'GET', headers: { Prefer: 'odata.maxpagesize=100' } });
            if (!r.ok) throw new Error(`SAP no respondió los ${tipo === 'Solicitud' ? 'solicitudes de traslado' : 'traslados'} (${r.status})`);
            const d = await r.json();
            return (d.value || [])
                .filter((x: any) => comoNumero.test(String(x.Comments || '')))
                .map((x: any): DocTraslado => {
                    const comentario = String(x.Comments || '').replace(/\t/g, ' ').trim();
                    const base = comentario.match(/Solicitud de traslado\s+(\d+)/i);
                    return {
                        tipo,
                        docNum: x.DocNum,
                        fecha: fecha(x.DocDate),
                        desde: x.FromWarehouse || '',
                        hacia: x.ToWarehouse || '',
                        estado: ESTADOS[x.DocumentStatus] || x.DocumentStatus || '',
                        comentario,
                        solicitudBase: base ? Number(base[1]) : null,
                        lineas: (x.StockTransferLines || []).map((l: any) => ({
                            item: l.ItemCode || '',
                            descripcion: l.ItemDescription || '',
                            cantidad: Number(l.Quantity) || 0,
                            desde: l.FromWarehouseCode || x.FromWarehouse || '',
                            hacia: l.WarehouseCode || x.ToWarehouse || '',
                        })),
                    };
                });
        };

        const [solicitudes, traslados] = await Promise.all([
            consultar('InventoryTransferRequests', 'Solicitud'),
            consultar('StockTransfers', 'Traslado'),
        ]);
        return NextResponse.json({ ordenFabricacion: docNum, solicitudes, traslados });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error consultando traslados en SAP' }, { status: 500 });
    }
}
