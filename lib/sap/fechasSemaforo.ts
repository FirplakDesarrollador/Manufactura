// Fechas del Semáforo (query "FPK - Semaforo - DJP") por número de OF, para guardarlas en el control de piso.
// Se consulta la misma API de Sistemas que usa /api/sap/semaforo, del lado del servidor (nadie descarga nada).
// Si la API no responde se lanza el error: quien llama decide no tocar las fechas guardadas.
import { parseFecha } from '@/lib/prioridadesPlantas'

export type FechasSemaforo = {
    fecha_entrega_lote: string | null
    fecha_real_liberacion: string | null
    fecha_ideal_entrega_produccion: string | null
    fecha_prometida_entrega: string | null
}

// Nombres posibles de cada columna en la API (los mismos de app/api/sap/semaforo/route.ts)
const NOMBRES = {
    nroOp: ['U_NroOP', 'Nro OP', 'NroOP'],
    fecha_entrega_lote: ['U_FechaEntLote', 'Fecha Entrega Lote', 'FechaEntLote'],
    fecha_real_liberacion: ['U_FechaRealLib', 'Fecha Real Liberación', 'FechaRealLib'],
    fecha_ideal_entrega_produccion: ['U_FechaIdealEnt', 'Fecha Ideal Entrega Producción', 'FechaIdealEnt'],
    fecha_prometida_entrega: ['U_FechaPromEnt', 'Fecha Prometida Entrega Item', 'FechaPromEnt']
}

const valor = (r: any, nombres: string[]) => {
    const n = nombres.find(k => r?.[k] != null && String(r[k]).trim() !== '')
    return n ? r[n] : null
}
const iso = (raw: unknown): string | null => {
    const d = raw == null ? null : parseFecha(String(raw))
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null
}

export async function fechasSemaforoPorOf(): Promise<Map<string, FechasSemaforo>> {
    const apiUrl = process.env.SEMAFORO_API_URL
    const apiKey = process.env.SEMAFORO_API_KEY
    if (!apiUrl || !apiKey) throw new Error('Falta configurar SEMAFORO_API_URL / SEMAFORO_API_KEY en el servidor.')

    const res = await fetch(apiUrl, { headers: { 'api-key': apiKey }, cache: 'no-store', signal: AbortSignal.timeout(45000) })
    if (!res.ok) throw new Error(`La API del Semáforo respondió HTTP ${res.status}.`)
    const data = await res.json()
    const registros: any[] | null = Array.isArray(data) ? data : Array.isArray(data?.response) ? data.response : null
    if (!registros || registros.length === 0) throw new Error('La API del Semáforo no devolvió registros.')

    const mapa = new Map<string, FechasSemaforo>()
    for (const r of registros) {
        const of = String(valor(r, NOMBRES.nroOp) ?? '').trim()
        if (!of || mapa.has(of)) continue
        mapa.set(of, {
            fecha_entrega_lote: iso(valor(r, NOMBRES.fecha_entrega_lote)),
            fecha_real_liberacion: iso(valor(r, NOMBRES.fecha_real_liberacion)),
            fecha_ideal_entrega_produccion: iso(valor(r, NOMBRES.fecha_ideal_entrega_produccion)),
            fecha_prometida_entrega: iso(valor(r, NOMBRES.fecha_prometida_entrega))
        })
    }
    return mapa
}
