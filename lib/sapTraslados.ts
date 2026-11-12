import { fetchSAP, SAP_BASE_URL } from '@/lib/sap'

// Traslados de las OF en SAP.
// SAP no liga el traslado a la OF por documento base: la planta escribe el número de la OF al inicio del comentario
// (ej. "2263061<tab>HIDROAERO SANTORINI ... Basado en Solicitud de traslado 73632."). Se buscan Solicitudes de
// traslado y Traslados cuyo comentario contenga la OF como número completo (no como parte de otro número).
// Rendimiento: pedir documentos completos (con líneas) dentro de una búsqueda tarda ~20 s; por eso primero se buscan
// solo los encabezados (~1 s) y después se descarga cada documento que coincide.

export type LineaTraslado = { item: string; descripcion: string; cantidad: number; desde: string; hacia: string }
export type DocTraslado = {
    tipo: 'Solicitud' | 'Traslado'; docNum: number; fecha: string; desde: string; hacia: string
    estado: string; comentario: string; solicitudBase: number | null; lineas: LineaTraslado[]
}
type Entidad = 'InventoryTransferRequests' | 'StockTransfers'
type Encabezado = { entidad: Entidad; docEntry: number; comentario: string }

const ESTADOS: Record<string, string> = { bost_Open: 'Abierto', bost_Close: 'Cerrado', bost_Paid: 'Cerrado', bost_Delivered: 'Cerrado' }
const ENTIDADES: [Entidad, DocTraslado['tipo']][] = [['InventoryTransferRequests', 'Solicitud'], ['StockTransfers', 'Traslado']]
const CAMPOS = 'DocEntry,DocNum,DocDate,Comments'
const fecha = (iso?: string) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : ''

export const sapBaseUrl = () =>
    process.env.SAP_BASE_URL || (process.env.SAP_API_URL ? process.env.SAP_API_URL.replace(/\/Login\/?$/, '') : SAP_BASE_URL)

// Números de 7 dígitos del comentario (posibles OF)
export const ofsDelComentario = (c: string) => [...new Set(String(c || '').match(/(?<!\d)\d{7}(?!\d)/g) || [])]

async function getJson(url: string) {
    const r = await fetchSAP(url, { method: 'GET', headers: { Prefer: 'odata.maxpagesize=500' } })
    if (!r.ok) throw new Error(`SAP respondió ${r.status} al consultar traslados`)
    return r.json()
}

// Documento completo (con líneas)
async function documento(baseUrl: string, entidad: Entidad, docEntry: number): Promise<DocTraslado> {
    const x = await getJson(`${baseUrl}/${entidad}(${docEntry})`)
    const comentario = String(x.Comments || '').replace(/\t/g, ' ').trim()
    const base = comentario.match(/Solicitud de traslado\s+(\d+)/i)
    return {
        tipo: entidad === 'StockTransfers' ? 'Traslado' : 'Solicitud',
        docNum: x.DocNum, fecha: fecha(x.DocDate), desde: x.FromWarehouse || '', hacia: x.ToWarehouse || '',
        estado: ESTADOS[x.DocumentStatus] || x.DocumentStatus || '', comentario,
        solicitudBase: base ? Number(base[1]) : null,
        lineas: (x.StockTransferLines || []).map((l: any) => ({
            item: l.ItemCode || '', descripcion: l.ItemDescription || '', cantidad: Number(l.Quantity) || 0,
            desde: l.FromWarehouseCode || x.FromWarehouse || '', hacia: l.WarehouseCode || x.ToWarehouse || '',
        })),
    }
}

// Descarga varios documentos de uno en uno: en la misma sesión de SAP las consultas en paralelo se bloquean entre sí
// (1 documento ~0,2 s; 4 en paralelo ~7 s)
export async function documentos(encabezados: Encabezado[], baseUrl = sapBaseUrl()) {
    const salida = new Map<string, DocTraslado>()
    for (const e of encabezados) salida.set(`${e.entidad}:${e.docEntry}`, await documento(baseUrl, e.entidad, e.docEntry))
    return salida
}

// Encabezados de solicitudes y traslados desde una fecha (para revisar muchas OF con una sola consulta)
export async function encabezadosDesde(desdeIso: string, baseUrl = sapBaseUrl()): Promise<Encabezado[]> {
    const todos: Encabezado[] = []
    for (const [entidad] of ENTIDADES) {
        let url: string | null = `${baseUrl}/${entidad}?$filter=${encodeURIComponent(`DocDate ge '${desdeIso}'`)}&$select=${CAMPOS}`
        for (let pag = 0; url && pag < 60; pag++) {
            const d = await getJson(url)
            for (const x of d.value || []) todos.push({ entidad, docEntry: x.DocEntry, comentario: String(x.Comments || '') })
            const next = d['odata.nextLink'] || d['@odata.nextLink']
            url = next ? (String(next).startsWith('http') ? String(next) : `${baseUrl}/${String(next).replace(/^\//, '')}`) : null
        }
    }
    return todos
}

// Traslados de una OF (pestaña Traslados del detalle de la orden)
export async function trasladosDeOf(docNum: string, baseUrl = sapBaseUrl()) {
    const filtro = encodeURIComponent(`contains(Comments,'${docNum}')`)
    const encabezados: Encabezado[] = []
    for (const [entidad] of ENTIDADES) {
        const d = await getJson(`${baseUrl}/${entidad}?$filter=${filtro}&$select=${CAMPOS}`)
        for (const x of d.value || []) {
            const comentario = String(x.Comments || '')
            if (ofsDelComentario(comentario).includes(docNum)) encabezados.push({ entidad, docEntry: x.DocEntry, comentario })
        }
    }
    encabezados.sort((a, b) => a.docEntry - b.docEntry)
    const docs = [...(await documentos(encabezados, baseUrl)).values()]
    return { solicitudes: docs.filter(d => d.tipo === 'Solicitud'), traslados: docs.filter(d => d.tipo === 'Traslado') }
}
