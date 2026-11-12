import { NextResponse } from 'next/server';
import { fetchSAP, SAP_BASE_URL } from '@/lib/sap';
import { crearFaltantes } from '@/lib/sapFaltantes';
import { supabase } from '@/lib/supabase';

const TIPOS_ORDEN: Record<string, string> = { bopotStandard: 'Estándar', bopotSpecial: 'Especial', bopotDisassembly: 'Desmontaje' };
const ESTADOS_ORDEN: Record<string, string> = { boposPlanned: 'Planificado', boposReleased: 'Liberado', boposClosed: 'Cerrado', boposCancelled: 'Cancelado' };
const ORIGENES: Record<string, string> = { bopooSalesOrder: 'Pedido de cliente', bopooManual: 'Manual', bopooMRP: 'MRP' };
const EMISIONES: Record<string, string> = { im_Manual: 'Manual', im_Backflush: 'Notificación' };
const ENRUTAMIENTOS: Record<string, string> = { raOnStartDate: 'En Fecha de inicio', raOnEndDate: 'En Fecha de finalización' };
const TIPOS_LINEA: Record<string, string> = { pit_Item: 'Artículo', pit_Resource: 'Recurso', pit_Text: 'Texto' };

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
}

// Consulta de una orden de fabricación. Lo que SAP no entregue o no se reconozca va en `faltantes`
// (la pantalla lo muestra como error) en lugar de completarse con valores por defecto.
export async function GET(request: Request, props: { params: Promise<{ docNum: string }> }) {
    try {
        const params = await props.params;
        const { docNum } = params;
        if (!docNum || !/^\d+$/.test(docNum)) {
            return NextResponse.json({ error: 'Número de orden inválido' }, { status: 400 });
        }

        const baseUrl = process.env.SAP_BASE_URL || (process.env.SAP_API_URL ? process.env.SAP_API_URL.replace(/\/Login\/?$/, '') : SAP_BASE_URL);
        const url = `${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${docNum}`;

        // Sesión de SAP reutilizada (sin iniciar sesión en cada consulta)
        const response = await fetchSAP(url, { method: 'GET' });

        if (!response.ok) {
            return NextResponse.json({ error: `Error SAP: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();

        if (!data.value || data.value.length === 0) {
            return NextResponse.json({ error: `Orden ${docNum} no encontrada en SAP` }, { status: 404 });
        }

        const sapOrder = data.value[0];
        const f = crearFaltantes();
        const origen = sapOrder.ProductionOrderOrigin ? f.traducir(sapOrder.ProductionOrderOrigin, ORIGENES, 'Origen') : '';
        const lineas: any[] = Array.isArray(sapOrder.ProductionOrderLines) ? sapOrder.ProductionOrderLines : [];
        if (!Array.isArray(sapOrder.ProductionOrderLines)) f.agregar('Componentes');

        // Cálculo de Gelcoat teórico desde las líneas de la orden
        const gelcoatLines = lineas.filter((line: any) => {
            const desc = (line.ItemName || '').toUpperCase();
            const no = (line.ItemNo || '').toUpperCase();
            return desc.includes('GELCOAT') || desc.includes('GEL COAT') || no.startsWith('PGEL');
        });
        const gelcoatSuma = gelcoatLines.reduce((acc: number, line: any) => {
            const q = Number(line.PlannedQuantity ?? line.BaseQuantity ?? 0);
            return acc + (Number.isFinite(q) ? q : 0);
        }, 0);

        let gelcoatTeorico: number | null = gelcoatSuma > 0 ? Number(gelcoatSuma.toFixed(3)) : null;
        let masaTeorica: number | null = null;

        // Peso de vaciado (regla tomada de la hoja "Por vaciar / Por pintar" de planta, validada con 12 OF):
        // en la lista de materiales cada pieza vaciada es un bloque de líneas seguidas Gelcoat → Masilla para vaciado → Resina.
        // La resina del bloque es la que queda más cerca de su masilla: RESINA FV 4891 = "Virgen", RESINA PALATAL CARGADA = "Cargada".
        // Las resinas sueltas pequeñas (0,03 a 1,3 kg, reparaciones) no son vaciado. La pieza con más resina es la Bañera y la otra el Faldón.
        const qty = (line: any) => { const q = Number(line.PlannedQuantity ?? line.BaseQuantity ?? 0); return Number.isFinite(q) ? q : 0 };
        const conPos = lineas.map((line: any, i: number) => ({ line, i, d: String(line.ItemName || '').toUpperCase(), no: String(line.ItemNo || '').toUpperCase() }));
        const masillas = conPos.filter(x => /MASILLA\s+PARA\s+VACIADO/.test(x.d));
        const resinas = conPos.filter(x => /\bRESINA\b/.test(x.d) && qty(x.line) > 0);
        const gelcoats = conPos.filter(x => /GEL\s?COAT/.test(x.d) || x.no.startsWith('PGEL'));
        // Emparejar cada masilla con la resina más cercana (de menor a mayor distancia, cada resina una sola vez)
        const pares = masillas.flatMap(m => resinas.map(r => ({ m, r, dist: Math.abs(m.i - r.i) }))).sort((a, b) => a.dist - b.dist);
        const usadasM = new Set<number>(), usadasR = new Set<number>();
        const piezas: { m: typeof conPos[number]; r: typeof conPos[number] }[] = [];
        for (const p of pares) {
            if (p.dist > 6 || usadasM.has(p.m.i) || usadasR.has(p.r.i)) continue;
            usadasM.add(p.m.i); usadasR.add(p.r.i); piezas.push({ m: p.m, r: p.r });
        }
        // Por unidad (como la hoja de planta): SAP trae el total de la OF
        const unidades = Number(sapOrder.PlannedQuantity) > 0 ? Number(sapOrder.PlannedQuantity) : 1;
        const porUnidad = (q: number) => Number((q / unidades).toFixed(2));
        // Resinas de mayor a menor = Bañera, Faldón, ...; la pintura (gelcoat) también de mayor a menor: la mayor es la de la bañera
        const resinasVaciado = piezas.map(p => p.r).sort((x, y) => qty(y.line) - qty(x.line));
        const gelcoatsVaciado = gelcoats.map(g => qty(g.line)).sort((x, y) => y - x);
        const vaciado = resinasVaciado.map((r, k) => ({
            pieza: k === 0 ? 'Bañera' : k === 1 ? 'Faldón' : `Pieza ${k + 1}`,
            resinaTipo: /CARGAD/.test(r.d) ? 'Cargada' : 'Virgen',
            resinaKg: porUnidad(qty(r.line)),
            gelcoatKg: gelcoatsVaciado[k] != null ? porUnidad(gelcoatsVaciado[k]) : null,
        }));
        // El gelcoat teórico también por unidad
        if (gelcoatTeorico != null) gelcoatTeorico = porUnidad(gelcoatTeorico);
        if (vaciado.length > 0) masaTeorica = Number(vaciado.reduce((a, p) => a + p.resinaKg, 0).toFixed(2));

        // Consultar enriquecimiento en Supabase
        try {
            const [fvRes, ofRes] = await Promise.allSettled([
                supabase.from('ordenes_fabricacion_fv')
                    .select('producto_masa')
                    .eq('orden_fabricacion', String(docNum))
                    .maybeSingle(),
                supabase.from('ordenes_fabricacion')
                    .select('kilos_gelcoat')
                    .eq('orden_fabricacion', String(docNum))
                    .maybeSingle()
            ]);

            if (masaTeorica == null && fvRes.status === 'fulfilled' && fvRes.value.data?.producto_masa) {
                const m = Number(fvRes.value.data.producto_masa);
                if (m > 0) masaTeorica = m;
            }

            if (gelcoatTeorico == null && ofRes.status === 'fulfilled' && ofRes.value.data?.kilos_gelcoat) {
                const g = Number(ofRes.value.data.kilos_gelcoat);
                if (g > 0) gelcoatTeorico = g;
            }
        } catch (sbErr) {
            console.warn('Error consultando Supabase para masa/gelcoat:', sbErr);
        }

        // Mapear los datos de SAP al formato esperado por el frontend
        const mappedOrder = {
            tipo: f.traducir(sapOrder.ProductionOrderType, TIPOS_ORDEN, 'Tipo'),
            estado: f.traducir(sapOrder.ProductionOrderStatus, ESTADOS_ORDEN, 'Estado'),
            noProducto: f.requerido(sapOrder.ItemNo, 'Nº producto'),
            descripcionProducto: f.requerido(sapOrder.ProductDescription, 'Descripción producto'),
            cantPlanificada: f.requerido(sapOrder.PlannedQuantity, 'Cantidad planificada'),
            nombreUN: sapOrder.InventoryUOM || '',
            almacen: f.requerido(sapOrder.Warehouse, 'Almacén'),
            socioNegocio: sapOrder.U_HBT_Tercero || '',
            metodoEnrutamiento: f.traducir(sapOrder.RoutingDateCalculation, ENRUTAMIENTOS, 'Método de fecha de enrutamiento'),
            aprovisionarArticulos: false,
            noOrden: String(sapOrder.DocumentNumber),
            fechaOrden: formatDate(f.requerido(sapOrder.PostingDate, 'Fecha orden de fabricación') || null),
            fechaInicio: formatDate(f.requerido(sapOrder.StartDate, 'Fecha de inicio') || null),
            fechaFinalizacion: formatDate(f.requerido(sapOrder.DueDate, 'Fecha de finalización') || null),
            usuario: sapOrder.UserSignature ? `Usuario ${sapOrder.UserSignature}` : String(f.requerido(null, 'Usuario')),
            origen,
            vinculadoA: origen,
            pedidoVinculado: sapOrder.ProductionOrderOriginNumber ? String(sapOrder.ProductionOrderOriginNumber) : '',
            cliente: sapOrder.CustomerCode || '',
            centroCostos: '',
            proyecto: sapOrder.Project || '',
            comentarios: sapOrder.Remarks || '',
            observacionesEmpaque: '',
            cantCompletada: sapOrder.CompletedQuantity ?? 0,
            cantRechazada: sapOrder.RejectedQuantity ?? 0,
            fechaCierreReal: formatDate(sapOrder.ClosingDate),
            asientoContable: sapOrder.JournalRemarks || '',
            masaTeorica,
            gelcoatTeorico,
            vaciado,
            componentes: lineas.map((line: any, index: number) => {
                const n = index + 1;
                return {
                    id: n,
                    tipo: f.traducir(line.ItemType, TIPOS_LINEA, 'Tipo de componente'),
                    no: f.requerido(line.ItemNo, `Nº del componente ${n}`),
                    descripcion: line.ItemName || '',
                    cantBase: f.requerido(line.BaseQuantity, `Cantidad base del componente ${n}`),
                    ratioBase: line.BaseQuantity ?? '',
                    cantRequerida: f.requerido(line.PlannedQuantity, `Cantidad requerida del componente ${n}`),
                    consumido: f.requerido(line.IssuedQuantity, `Consumido del componente ${n}`),
                    // La línea de la orden no trae el disponible: se muestra vacío, no 0
                    disponible: '—',
                    // UoMCode -1 = unidad manual en SAP
                    unidadMedida: line.UoMCode === -1 || line.UoMCode === '-1' ? 'Manual' : line.UoMCode ? String(line.UoMCode) : String(f.requerido(null, 'Unidad de medida de componentes')),
                    almacen: f.requerido(line.Warehouse, `Almacén del componente ${n}`),
                    metodoEmision: f.traducir(line.ProductionOrderIssueType, EMISIONES, 'Método de emisión')
                };
            }),
            faltantes: f.lista
        };

        return NextResponse.json(mappedOrder);

    } catch (error: any) {
        console.error("Error en endpoint de SAP:", error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
