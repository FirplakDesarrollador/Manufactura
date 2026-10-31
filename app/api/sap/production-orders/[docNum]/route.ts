import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';
import { crearFaltantes } from '@/lib/sapFaltantes';

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

        const loginData = await loginToSAP();
        const url = `${process.env.SAP_API_URL?.replace('/Login', '')}/ProductionOrders?$filter=DocumentNumber eq ${docNum}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader,
                'Content-Type': 'application/json'
            }
        });

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
