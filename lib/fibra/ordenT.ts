import { cargarFechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'

// Orden estándar de todos los módulos de Fibra: por Fecha Entrega Lote (columna T del Semáforo), de lo más
// atrasado a lo más reciente. Sin T se usa la fecha ideal de producción o la entrega estimada; sin ninguna, al
// final. A igual fecha se conserva el orden en que llegaron (p. ej. por fecha de pintura).
type ConOf = { orden_fabricacion?: string | number | null; fecha_ideal_produccion?: string | null; fecha_entrega_estimada?: string | null }

const tiempo = (raw: string | null | undefined) => {
    const t = raw ? new Date(raw).getTime() : NaN
    return Number.isFinite(t) ? t : Infinity
}

export async function ordenarPorFechaT<T extends ConOf>(lista: T[]): Promise<T[]> {
    const { mapa } = await cargarFechasSemaforoFv()
    return lista
        .map((r, i) => ({ r, i, t: tiempo(mapa.get(String(r.orden_fabricacion ?? '').trim())?.lote || r.fecha_ideal_produccion || r.fecha_entrega_estimada) }))
        .sort((a, b) => a.t - b.t || a.i - b.i)
        .map(x => x.r)
}
