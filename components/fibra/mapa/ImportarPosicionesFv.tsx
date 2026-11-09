'use client'

import React, { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardPaste, Loader2, X } from 'lucide-react'
import { OrdenFabricacion } from '@/types/pintura'
import { getAllMoldes } from '@/lib/supabase/queries/fibra'
import { moldesDisponiblesOrden } from '@/lib/fibra/moldesOrden'
import { piezasPorEtapa } from '@/components/fibra/buscador/BuscadorOrdenesFibraModule'
import {
    DESTINOS_MOVIMIENTO_FV, DestinoMovimientoFv, PiezaMapaFv, asignarMesaFv, moverPiezaFibra, registrarPiezaProgramadoFv
} from '@/lib/supabase/queries/fibra_administracion'

// Ubicar en el mapa las OF a partir del listado de Excel (columna PROCESO): se pegan las filas y la app
// registra o mueve cada pieza al proceso y a la primera mesa libre de ese proceso.
// - Si la OF ya tiene piezas en el mapa, se mueven esas (no se crean piezas de más).
// - Si no, se registra la pieza como en Pintura con el primer molde disponible (igual que al soltarla desde Programado).

type Lugar = { label: string; destino: DestinoMovimientoFv; zonas: string[] }
// VACIADO = la pieza está en la mesa de vaciado, aún sin notificar el vaciado (estado Pintura).
// Desmolde, Herrajes y Nivelación van después del vaciado (estado Vaciado) hasta que se notifique Pulido.
const LUGARES: { patron: RegExp; lugar: Lugar }[] = [
    { patron: /ACABADO\s*2/, lugar: { label: 'Acabado 2', destino: 'huacales', zonas: ['acabado2'] } },
    { patron: /ENSAMBLE\s*2/, lugar: { label: 'Ensamble 2', destino: 'ensayo', zonas: ['ensamble2'] } },
    { patron: /ENSAMBLE\s*1/, lugar: { label: 'Ensamble 1', destino: 'ensayo', zonas: ['ensamble1'] } },
    { patron: /ENSAMBLE/, lugar: { label: 'Ensamble', destino: 'ensayo', zonas: ['ensamble1', 'ensamble2'] } },
    { patron: /ACABADO/, lugar: { label: 'Acabado 1', destino: 'ensayo', zonas: ['acabado'] } },
    { patron: /ENSAYO/, lugar: { label: 'Ensayo', destino: 'ensayo', zonas: ['ensayo'] } },
    { patron: /[GH]?UACAL/, lugar: { label: 'Huacales', destino: 'huacales', zonas: ['huacales'] } },
    { patron: /HERRAJE/, lugar: { label: 'Herrajes', destino: 'vaciado', zonas: ['desmolde'] } },
    { patron: /NIVELACION/, lugar: { label: 'Nivelación', destino: 'vaciado', zonas: ['desmolde'] } },
    { patron: /DESMOLDE/, lugar: { label: 'Desmolde', destino: 'vaciado', zonas: ['desmolde'] } },
    { patron: /PULIDO/, lugar: { label: 'Pulido', destino: 'pulido', zonas: ['pulido'] } },
    { patron: /VACIADO/, lugar: { label: 'Vaciado', destino: 'pintura', zonas: ['vaciado'] } },
    { patron: /PINTURA/, lugar: { label: 'Pintura', destino: 'pintura', zonas: ['pintura'] } },
    { patron: /REPARACION/, lugar: { label: 'Reparación', destino: 'reparacion', zonas: ['reparacion'] } },
    { patron: /DIGITADO|EMPAQUE/, lugar: { label: 'Digitado', destino: 'digitado', zonas: [] } },
    { patron: /TRANSITO/, lugar: { label: 'Tránsito', destino: 'transito', zonas: [] } },
    { patron: /CEDI/, lugar: { label: 'CEDI', destino: 'cedi', zonas: [] } }
]

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

type Fila = { linea: number; of: string; cantidad: number; proceso: string }
type Accion = {
    of: string; ordenId: number; descripcion: string; excel: string; lugar: Lugar; mesa: string | null
    pieza: PiezaMapaFv | null   // pieza existente que se mueve; null = se registra una pieza nueva
}
type Resultado = { accion: Accion; ok: boolean; mensaje: string }

// Una fila pegada de Excel: Nro OP · Descripción · Planta · Cantidad · Fecha · PROCESO (o solo "OF PROCESO")
function leerFilas(texto: string): { filas: Fila[]; malas: string[]; sinProceso: string[] } {
    const filas: Fila[] = [], malas: string[] = [], sinProceso: string[] = []
    texto.split(/\r?\n/).forEach((l, i) => {
        if (!l.trim()) return
        const celdas = l.split('\t').map(c => c.trim())
        const of = celdas.find(c => /^\d{6,8}$/.test(c))
        if (!of) { if (!/NRO|DESCRIP/i.test(l)) malas.push(l.trim()); return }
        let proceso = '', cantidad = 1
        if (celdas.length > 1) {
            const resto = celdas.slice(celdas.indexOf(of) + 1)
            proceso = [...resto].reverse().find(c => c && !/^\d{1,2}$/.test(c) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c) && !/^FV$/i.test(c)) || ''
            // La cantidad es la celda numérica corta antes del proceso
            const n = resto.find(c => /^\d{1,2}$/.test(c))
            if (n) cantidad = Number(n)
            if (proceso === resto.find(c => c.length > 25)) proceso = '' // solo llegó la descripción
        } else {
            const fecha = l.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+(.+)$/)
            proceso = fecha ? fecha[1] : l.slice(l.indexOf(of) + of.length)
        }
        if (!proceso.trim()) { sinProceso.push(of); return }
        filas.push({ linea: i + 1, of, cantidad, proceso: proceso.trim() })
    })
    return { filas, malas, sinProceso }
}

// "1 EN VACIADO, 1 EN HERRAJE" → [{n:1, VACIADO}, {n:1, HERRAJE}]; "HUACAL" con cantidad 2 → [{n:2, HUACAL}]
function partesProceso(f: Fila): { n: number; texto: string; lugar: Lugar | null }[] {
    const partes = normal(f.proceso).split(/,|;|\s+Y\s+|\s+-\s+/).map(p => p.trim()).filter(Boolean)
    return partes.map(p => {
        const m = p.match(/^(\d+)?\s*(?:EN\s+)?(.*)$/)!
        const n = m[1] ? Number(m[1]) : partes.length === 1 ? f.cantidad : 1
        return { n, texto: p, lugar: LUGARES.find(x => x.patron.test(m[2]))?.lugar || null }
    })
}

export default function ImportarPosicionesFv({ ordenes, piezas, mesasZona, usuarioActual, onCerrar, onListo }: {
    ordenes: OrdenFabricacion[]
    piezas: PiezaMapaFv[]
    mesasZona: Record<string, string[]>   // mesas físicas (no automáticas) de cada zona, en su orden
    usuarioActual: () => Promise<string>
    onCerrar: () => void
    onListo: () => void
}) {
    const [texto, setTexto] = useState('')
    const [corriendo, setCorriendo] = useState<number | null>(null)
    const [resultados, setResultados] = useState<Resultado[] | null>(null)

    const plan = useMemo(() => {
        const { filas, malas, sinProceso } = leerFilas(texto)
        const avisos: string[] = malas.map(l => `No se entendió la fila: ${l.slice(0, 80)}`)
        const porOf = new Map(ordenes.map(o => [String(o.orden_fabricacion ?? ''), o]))
        const acciones: Omit<Accion, 'mesa' | 'igual'>[] = []
        const usadas = new Set<string>()
        for (const f of filas) {
            const o = porOf.get(f.of)
            if (!o) { avisos.push(`OF ${f.of}: no está en las órdenes FV cargadas.`); continue }
            const partes = partesProceso(f)
            const sinLugar = partes.filter(p => !p.lugar)
            if (sinLugar.length) avisos.push(`OF ${f.of}: no se reconoce el proceso "${sinLugar.map(p => p.texto).join(', ')}".`)
            // Piezas de la OF que ya están en el mapa; las que faltan salen de Programado
            const propias = piezas.filter(p => p.ordenId === o.id && !usadas.has(p.registrer))
            let pendientes = piezasPorEtapa(o).piezas.programado || 0
            for (const parte of partes) {
                if (!parte.lugar) continue
                const estado = DESTINOS_MOVIMIENTO_FV[parte.lugar.destino].estado
                for (let k = 0; k < parte.n; k++) {
                    const i = propias.findIndex(p => !usadas.has(p.registrer) && p.estado === estado)
                    const pieza = i >= 0 ? propias[i] : propias.find(p => !usadas.has(p.registrer)) || null
                    if (pieza) usadas.add(pieza.registrer)
                    else if (pendientes > 0) pendientes--
                    else { avisos.push(`OF ${f.of}: no le quedan piezas en Programado para "${parte.texto}".`); break }
                    acciones.push({ of: f.of, ordenId: o.id, descripcion: o.producto_descripcion || '', excel: parte.texto, lugar: parte.lugar, pieza })
                }
            }
        }
        // Mesas: libres = las que no ocupa una pieza que se queda donde está
        const ocupadas = new Set(piezas.filter(p => p.mesa && !usadas.has(p.registrer)).map(p => p.mesa!))
        // El Excel manda: aunque la pieza ya esté en el mapa, su mesa se vuelve a asignar en el orden de las filas
        const conMesa: Accion[] = acciones.map(a => {
            const mesa = a.lugar.zonas.flatMap(z => mesasZona[z] || []).find(m => !ocupadas.has(m)) || null
            if (mesa) ocupadas.add(mesa)
            return { ...a, mesa }
        })
        return { filas, acciones: conMesa, avisos, sinProceso }
    }, [texto, ordenes, piezas, mesasZona])

    const porHacer = plan.acciones
    const mismoEstado = (a: Accion) => !!a.pieza && a.pieza.estado === DESTINOS_MOVIMIENTO_FV[a.lugar.destino].estado
    const nuevas = porHacer.filter(a => !a.pieza).length

    const ejecutar = async () => {
        let email: string
        try { email = await usuarioActual() } catch (e) { setResultados([{ accion: porHacer[0], ok: false, mensaje: e instanceof Error ? e.message : String(e) }]); return }
        const res: Resultado[] = []
        for (let i = 0; i < porHacer.length; i++) {
            const a = porHacer[i]
            setCorriendo(i)
            try {
                if (a.pieza) {
                    if (mismoEstado(a)) await asignarMesaFv(a.pieza.registrer, a.mesa)
                    else await moverPiezaFibra(a.pieza.registrer, a.lugar.destino, email, a.mesa)
                    res.push({ accion: a, ok: true, mensaje: mismoEstado(a) ? 'Posición actualizada' : `Pieza ${a.pieza.registrer} movida` })
                } else {
                    // Moldes al momento de registrar: cada registro deja su molde en uso
                    const orden = ordenes.find(o => o.id === a.ordenId)!
                    const molde = moldesDisponiblesOrden(orden, await getAllMoldes())[0]
                    if (!molde) throw new Error('No hay molde disponible para esta orden')
                    await registrarPiezaProgramadoFv(a.ordenId, molde.id, a.lugar.destino, email, a.mesa)
                    res.push({ accion: a, ok: true, mensaje: `Pieza registrada (molde ${molde.serial})` })
                }
            } catch (e) {
                res.push({ accion: a, ok: false, mensaje: e instanceof Error ? e.message : String(e) })
            }
        }
        setCorriendo(null)
        setResultados(res)
        onListo()
    }

    const ocupado = corriendo != null
    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            onMouseDown={e => { if (e.target === e.currentTarget && !ocupado) onCerrar() }}>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-[#324354]">Ubicar OF desde Excel</h2>
                        <p className="text-xs text-slate-600">Copie en Excel las filas (Nro OP … PROCESO) y péguelas aquí. Cada pieza queda en su proceso y en la primera mesa libre.</p>
                    </div>
                    <button onClick={onCerrar} disabled={ocupado} className="text-slate-400 hover:text-slate-600 disabled:opacity-40" title="Cerrar"><X className="w-5 h-5" /></button>
                </div>

                {!resultados ? (
                    <>
                        <textarea value={texto} onChange={e => setTexto(e.target.value)} disabled={ocupado} rows={texto ? 4 : 8}
                            placeholder={'2263052\tHIDROMASAJE HONOLULU DERECHA 180X120…\tFV\t1\t04/11/2026\tNIVELACION\n2251541\tHIDROMASAJE SANTORINI…\tFV\t2\t13/11/2026\t1 EN VACIADO, 1 EN HERRAJE'}
                            className="w-full border border-slate-300 rounded-xl p-2 font-mono text-[11px] text-[#324354] outline-none focus:ring-2 focus:ring-[#59a96a]" />

                        {plan.avisos.length > 0 && (
                            <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5 max-h-28 overflow-y-auto">
                                {plan.avisos.map((a, i) => <p key={i} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {a}</p>)}
                            </div>
                        )}

                        {plan.acciones.length > 0 && (
                            <div className="flex-1 min-h-0 overflow-auto border border-[#e2ded5] rounded-xl">
                                <table className="w-full text-[11px]">
                                    <thead className="sticky top-0 bg-[#F6F3EE] text-[10px] font-black uppercase text-slate-500">
                                        <tr><th className="text-left px-2 py-1.5">OF</th><th className="text-left px-2">Descripción</th><th className="text-left px-2">Excel</th><th className="text-left px-2">Queda en</th><th className="text-left px-2">Mesa</th><th className="text-left px-2">Acción</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {plan.acciones.map((a, i) => (
                                            <tr key={i} className={corriendo != null && porHacer[corriendo] === a ? 'bg-sky-50' : ''}>
                                                <td className="px-2 py-1 font-black text-[#324354]">{a.of}</td>
                                                <td className="px-2 py-1 text-slate-600 truncate max-w-[220px]" title={a.descripcion}>{a.descripcion}</td>
                                                <td className="px-2 py-1 text-slate-500">{a.excel}</td>
                                                <td className="px-2 py-1 font-bold text-[#324354]">{a.lugar.label}</td>
                                                <td className="px-2 py-1">{a.mesa || <span className="text-slate-400" title="Las mesas de este proceso están llenas: queda en la primera casilla libre del tramo o en la lista 'sin mesa'">sin mesa</span>}</td>
                                                <td className="px-2 py-1 text-slate-600">{!a.pieza ? 'Registrar pieza' : mismoEstado(a) ? (a.pieza.mesa === a.mesa ? 'Actualizar (misma mesa)' : `Actualizar mesa${a.pieza.mesa ? ` (estaba en ${a.pieza.mesa})` : ''}`) : `Mover pieza${a.pieza.mesa ? ` (estaba en ${a.pieza.mesa})` : ''}`}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e2ded5]">
                            <p className="text-[11px] text-slate-500">
                                {plan.acciones.length ? <>{plan.acciones.length} pieza(s) · {nuevas} se registran nuevas con el primer molde disponible · {porHacer.length - nuevas} ya están en el mapa y se actualiza su posición</> : 'Pegue las filas para ver qué se hará.'}
                                {plan.sinProceso.length > 0 && <> · {plan.sinProceso.length} fila(s) sin PROCESO se omiten</>}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={onCerrar} disabled={ocupado} className="px-3 py-1.5 rounded-lg font-bold text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                                <button onClick={ejecutar} disabled={ocupado || !porHacer.length}
                                    className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#324354] text-white hover:bg-[#254153] disabled:opacity-50 flex items-center gap-1.5">
                                    {ocupado ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {corriendo! + 1} de {porHacer.length}…</> : <><ClipboardPaste className="w-3.5 h-3.5" /> Actualizar {porHacer.length} pieza(s)</>}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm font-bold text-[#324354]">
                            {resultados.filter(r => r.ok).length} de {resultados.length} pieza(s) ubicadas.
                        </p>
                        <div className="flex-1 min-h-0 overflow-auto border border-[#e2ded5] rounded-xl divide-y divide-slate-100 text-[11px]">
                            {resultados.map((r, i) => (
                                <p key={i} className={`px-3 py-1.5 flex items-start gap-2 ${r.ok ? '' : 'bg-rose-50 text-rose-800 font-bold'}`}>
                                    {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-[#59a96a] shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    <span><b>OF {r.accion?.of}</b> → {r.accion?.lugar.label}{r.accion?.mesa ? ` (${r.accion.mesa})` : ''}: {r.mensaje}</span>
                                </p>
                            ))}
                        </div>
                        <div className="flex justify-end pt-2 border-t border-[#e2ded5]">
                            <button onClick={onCerrar} className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#324354] text-white hover:bg-[#254153]">Cerrar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
