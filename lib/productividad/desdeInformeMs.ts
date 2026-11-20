import type { DatosAutoMs, ManualMs } from '@/lib/informe-turno/ms'
import { personasAusentes } from '@/lib/informe-turno/ms'
import type { DiaPlanta, Paro } from './calculo'
import { cargarParametros, diaRegistrado, guardarDia, ultimoDia } from './datos'

// Informe de Turno MS → Productividad (prod_dia_planta y prod_paros), como antes se llenaban BD_MS y BD_PAROS del Excel.
// Lo que el informe no trae (horarios, mano de obra teórica por turno, objetivo PHH) se toma del día ya registrado
// o, si no existe, del último día de MS.

const num = (s: string | undefined) => { const v = Number(String(s ?? '').trim().replace(',', '.')); return String(s ?? '').trim() === '' || isNaN(v) ? null : v }
const SE_ARRASTRAN = ['hora_inicio_produccion', 'hora_fin_produccion', 'tiempo_alimentacion', 'tiempo_no_producion', 'mo_teorica_ms_t1', 'mo_teorica_ms_t2', 'mo_teorica_ms_t3', 'tiempo_t1', 'tiempo_t2', 'tiempo_t3']
const NO_SE_REGISTRAN = /^(alimentaci|alistamiento)/i

export async function registrarProductividadDesdeInformeMs(fecha: string, m: ManualMs, a: DatosAutoMs | null, email: string | null) {
    const [params, reg, ult] = await Promise.all([cargarParametros(), diaRegistrado('MS', fecha), ultimoDia('MS', fecha)])
    const base = reg.dia || ult
    if (!base) throw new Error('No hay días anteriores de MS en productividad para tomar horarios y mano de obra teórica.')
    const detBase = (base.detalle || {}) as Record<string, unknown>
    const detalle: Record<string, unknown> = {}
    for (const k of SE_ARRASTRAN) if (detBase[k] != null) detalle[k] = detBase[k]
    Object.assign(detalle, {
        ausentismo_general: personasAusentes(m),
        real_pintura_linea_1: a?.pintura.l1 ?? null, real_pintura_linea_2: a?.pintura.l2 ?? null, real_pintura_linea_3: a?.pintura.l3 ?? null,
        real_pintura: a?.pintura.total ?? null, real_vaciado: a?.vaciado.total ?? null,
        adm: num(m.adm), cnc_pulido: num(m.cnc), mesones: num(m.mesones),
        calidad: a?.calidad == null ? null : a.calidad / 100,
    })
    // Tiempo real de producción: (fin − inicio) − alimentación − no producción, igual que la hoja BD_MS
    const aMin = (v: unknown) => {
        if (typeof v === 'number') return Math.round(v * 1440)
        const x = String(v ?? '').match(/^(\d{1,2}):(\d{2})/); return x ? Number(x[1]) * 60 + Number(x[2]) : null
    }
    const ini = aMin(detalle.hora_inicio_produccion), fin = aMin(detalle.hora_fin_produccion)
    const tiempo = ini != null && fin != null ? fin - ini - (Number(detalle.tiempo_alimentacion) || 0) - (Number(detalle.tiempo_no_producion) || 0) : base.tiempo_min

    const dia = {
        fecha, planta: 'MS', tiempo_min: tiempo, obj_phh: base.obj_phh,
        real_piezas: num(m.acabado), kg_real: num(m.kilos), detalle,
    } as DiaPlanta

    // Paros: los reflejados (con su familia) cuentan en las pérdidas; los reales de pintura y vaciado quedan como registro
    const conCausa = (l: { minutos: string; causa: string; familia?: string }[]) => l.filter(p => p.causa.trim() && (num(p.minutos) ?? 0) > 0)
    const paros: Paro[] = [
        ...conCausa(m.parosPintura).filter(p => !NO_SE_REGISTRAN.test(p.causa.trim())).map(p => ({ proceso: 'PINTURA', tipo: 'REAL', p })),
        ...conCausa(m.parosVaciado).filter(p => !NO_SE_REGISTRAN.test(p.causa.trim())).map(p => ({ proceso: 'VACIADO', tipo: 'REAL', p })),
        ...conCausa(m.reflejados).map(p => ({ proceso: '', tipo: 'REFLEJADO', p })),
    ].map(({ proceso, tipo, p }) => ({
        fecha, planta: 'MS', proceso: proceso || null, familia: (p as { familia?: string }).familia || null, modo_perdida: null, equipo: null,
        descripcion: p.causa.trim().toUpperCase(), minutos: num(p.minutos) ?? 0, tipo, area_responsable: null, responsable: null,
    }))
    return guardarDia(dia, paros, params, 'informe_turno', email)
}
