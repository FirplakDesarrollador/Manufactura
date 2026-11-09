'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { getAllMoldes } from '@/lib/supabase/queries/fibra'
import OrdenCard from '@/components/pintura/OrdenCard'
import { OrderProcessesPanel } from '@/components/fibra/administracion/AdministracionFibraModule'
import { piezasPorEtapa } from '@/components/fibra/buscador/BuscadorOrdenesFibraModule'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { DestinoMovimientoFv, getPiezasMapaFv, asignarMesaFv, moverPiezaFibra, registrarPiezaProgramadoFv, PiezaMapaFv } from '@/lib/supabase/queries/fibra_administracion'
import { moldesDisponiblesOrden } from '@/lib/fibra/moldesOrden'
import { toast } from 'sonner'
import { MapPin as MapaIcon, RefreshCw, AlertTriangle, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Search, X, ChevronDown, FileDown, Loader2 } from 'lucide-react'

// Mapa de procesos FV, dibujado con las proporciones del layout de la planta. Cada proceso tiene sus mesas físicas
// y el supervisor ubica cada pieza arrastrándola a su mesa (clic abre el detalle de la orden). Al soltarla en una
// mesa de otro proceso se registra el movimiento en la trazabilidad.

type TipoProceso = 'notificacion' | 'sin-notificacion' | 'espera' | 'virtual'
type Caja = [x1: number, y1: number, x2: number, y2: number]
type Proceso = {
    id: string
    label: string
    sub?: string
    // Procesos unificados en un solo rectángulo: cada nombre conserva su espacio (en columnas o en filas)
    nombres?: string[]
    enColumnas?: boolean
    aislado?: boolean  // proceso que aún no está en el flujo
    sinContador?: boolean  // solo se dibuja el proceso, sin contador de OF ni mensajes
    tipo: TipoProceso
    etapas: string[]   // campos de ordenes_fabricacion_fv que suman en este proceso ([] = sin registro en la app)
    caja: Caja         // posición en el plano del layout (px de la imagen de referencia)
    destino?: DestinoMovimientoFv  // soltar una pieza en el proceso la pasa a este estado (movimiento manual)
    crear?: DestinoMovimientoFv    // estado de la pieza nueva si se suelta aquí una OF de Programado (se pide el molde)
}

// Plano de referencia (imagen "LAYOUT FV"): todo se ubica en % de este rectángulo
const X0 = 0, Y0 = 70, ANCHO = 1650, ALTO = 650
const pos = ([x1, y1, x2, y2]: Caja): React.CSSProperties => ({
    left: `${((x1 - X0) / ANCHO) * 100}%`,
    top: `${((y1 - Y0) / ALTO) * 100}%`,
    width: `${((x2 - x1) / ANCHO) * 100}%`,
    height: `${((y2 - y1) / ALTO) * 100}%`
})
const punto = (x: number, y: number): React.CSSProperties => ({
    left: `${((x - X0) / ANCHO) * 100}%`,
    top: `${((y - Y0) / ALTO) * 100}%`
})

// El nombre de cada proceso va encima de su recuadro (franja de 20 del plano); el recuadro solo lleva las mesas
const PROCESOS: Proceso[] = [
    { id: 'vaciado', label: 'Vaciado', tipo: 'notificacion', etapas: ['vaciado'], crear: 'vaciado', caja: [858, 92, 1060, 164] },
    { id: 'curado', label: 'Zona Curado', sinContador: true, tipo: 'espera', etapas: [], caja: [1072, 92, 1470, 370] },
    { id: 'pintura', label: 'Pintura', tipo: 'notificacion', etapas: ['pintura'], crear: 'pintura', caja: [1484, 92, 1644, 164] },
    { id: 'huacales', label: 'Huacales', tipo: 'notificacion', etapas: ['empaque'], destino: 'huacales', caja: [6, 470, 208, 608] },
    { id: 'acabado2', label: 'Acabado 2', sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [216, 470, 418, 608] },
    { id: 'ensayo', label: 'Ensayo', tipo: 'notificacion', etapas: ['acabado'], destino: 'ensayo', caja: [426, 470, 530, 608] },
    { id: 'ensamble', label: 'Ensamble 2 · Ensamble 1 · Acabado 1', nombres: ['Ensamble\n2', 'Ensamble\n1', 'Acabado\n1'], enColumnas: true, sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [538, 470, 936, 608] },
    { id: 'pulido', label: 'Pulido', tipo: 'notificacion', etapas: ['pulido'], destino: 'pulido', caja: [948, 470, 1248, 608] },
    { id: 'nivelacion', label: 'Desmolde · Herrajes · Nivelación', nombres: ['Desmolde', 'Herrajes', 'Nivelación'], enColumnas: true, sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [1256, 470, 1458, 608] },
    { id: 'reparacion', label: 'Reparación', tipo: 'notificacion', etapas: ['reparacion', 'reparacion_larga'], destino: 'reparacion', caja: [216, 644, 516, 716] },
    { id: 'soldadura', label: 'Soldadura', aislado: true, sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [1256, 644, 1362, 716] },
    // Pasos virtuales (no son procesos físicos): Programado → Pintura … Huacales → Digitado → Tránsito → CEDI
    { id: 'programado', label: 'Programado', sub: 'Pendiente por pintar', tipo: 'virtual', etapas: ['programado'], caja: [1484, 212, 1644, 716] },
    { id: 'digitado', label: 'Digitado', tipo: 'virtual', etapas: ['digitado'], destino: 'digitado', caja: [6, 346, 600, 418] },
    { id: 'transito', label: 'Tránsito', tipo: 'virtual', etapas: ['transito'], destino: 'transito', caja: [6, 252, 600, 324] },
    { id: 'cedi', label: 'CEDI', tipo: 'virtual', etapas: ['cedi'], destino: 'cedi', caja: [6, 92, 600, 230] }
]
const PROCESO = Object.fromEntries(PROCESOS.map(p => [p.id, p])) as Record<string, Proceso>

// Flechas de flujo (centro en px del plano)
const FLECHAS: { x: number; y: number; dir: 'izq' | 'der' | 'arriba' | 'abajo' }[] = [
    { x: 1066, y: 115, dir: 'izq' }, { x: 1066, y: 141, dir: 'der' },      // Zona Curado ⇄ Vaciado
    { x: 1477, y: 128, dir: 'izq' },                                       // Pintura → Zona Curado
    { x: 1630, y: 170, dir: 'arriba' },                                    // Programado → Pintura
    { x: 1440, y: 424, dir: 'abajo' },                                     // Zona Curado → Desmolde · Herrajes · Nivelación
    ...[1252, 942, 534, 422, 212].map(x => ({ x, y: 580, dir: 'izq' as const })),
    { x: 180, y: 426, dir: 'arriba' },                                     // Huacales → Digitado
    { x: 440, y: 335, dir: 'arriba' },                                     // Digitado → Tránsito
    { x: 440, y: 241, dir: 'arriba' },                                     // Tránsito → CEDI
    { x: 290, y: 616, dir: 'arriba' }, { x: 314, y: 616, dir: 'abajo' }    // Acabado 2 ⇄ Reparación
]
const ICONO_FLECHA = { izq: ArrowLeft, der: ArrowRight, arriba: ArrowUp, abajo: ArrowDown }

// Colores del layout: amarillo = punto de notificación, azul = sin notificación, gris = espera
const ESTILO: Record<TipoProceso, { caja: string; chip: string; badge: string; label: string }> = {
    'notificacion': { caja: 'bg-[#FFC000] border-[#d9a400] text-[#25323f]', chip: 'bg-white/85 text-[#25323f] hover:bg-white', badge: 'bg-[#25323f] text-white', label: 'Punto de notificación' },
    'sin-notificacion': { caja: 'bg-[#4472C4] border-[#2f5597] text-white', chip: 'bg-white/20 text-white hover:bg-white/35', badge: 'bg-white text-[#2f5597]', label: 'Proceso sin notificación' },
    'espera': { caja: 'bg-[#d9d9d9] border-[#bfbfbf] text-[#25323f]', chip: 'bg-white/85 text-[#25323f] hover:bg-white', badge: 'bg-[#25323f] text-white', label: 'Tiempo de espera' },
    'virtual': { caja: 'bg-white border-dashed border-slate-400 text-[#25323f]', chip: 'bg-slate-100 text-[#25323f] hover:bg-slate-200', badge: 'bg-[#25323f] text-white', label: 'Paso virtual' }
}

// ===== Mesas =====
// Zona = grupo de mesas dentro de un proceso, en `cols` columnas desde la esquina (x, y) del plano.
// Todas las mesas miden lo mismo (como las de Ensayo y Ensamble); los recuadros se ajustan a sus mesas.
const MESA_ANCHO = 92, MESA_ALTO = 60, GAP = 6
// auto = paso virtual o de espera: no hay mesa específica, las piezas llenan las casillas en orden (la más antigua primero)
type Zona = { id: string; proceso: string; label: string; n: number; cols: number; x: number; y: number; auto?: boolean; fueraDeCupo?: boolean; destino?: DestinoMovimientoFv; crear?: DestinoMovimientoFv }
const ZONAS: Zona[] = [
    // La mesa de Pintura recibe piezas pintadas pero no cuenta en el cupo de Vaciado (6 mesas)
    { id: 'pintura', proceso: 'pintura', label: 'Pintura', n: 1, cols: 1, x: 1518, y: 98, fueraDeCupo: true, crear: 'pintura' },
    { id: 'curadop', proceso: 'curado', label: 'Zona Curado · pintadas, van para Vaciado', n: 4, cols: 4, x: 1078, y: 98, auto: true, crear: 'pintura' },
    { id: 'curadov', proceso: 'curado', label: 'Zona Curado · vaciadas, van para Desmolde', n: 12, cols: 4, x: 1078, y: 172, auto: true, crear: 'vaciado' },
    { id: 'vaciado', proceso: 'vaciado', label: 'Vaciado', n: 2, cols: 2, x: 864, y: 98, crear: 'vaciado' },
    { id: 'desmolde', proceso: 'nivelacion', label: 'Desmolde · Herrajes · Nivelación', n: 4, cols: 2, x: 1262, y: 476, crear: 'vaciado' },
    { id: 'pulido', proceso: 'pulido', label: 'Pulido', n: 6, cols: 3, x: 954, y: 476, destino: 'pulido' },
    { id: 'acabado', proceso: 'ensamble', label: 'Acabado 1', n: 4, cols: 2, x: 740, y: 476, destino: 'ensayo' },
    { id: 'ensamble1', proceso: 'ensamble', label: 'Ensamble 1', n: 2, cols: 1, x: 642, y: 476, destino: 'ensayo' },
    { id: 'ensamble2', proceso: 'ensamble', label: 'Ensamble 2', n: 2, cols: 1, x: 544, y: 476, destino: 'ensayo' },
    { id: 'ensayo', proceso: 'ensayo', label: 'Ensayo', n: 2, cols: 1, x: 432, y: 476, destino: 'ensayo' },
    { id: 'acabado2', proceso: 'acabado2', label: 'Acabado 2', n: 4, cols: 2, x: 222, y: 476, destino: 'huacales' },
    { id: 'huacales', proceso: 'huacales', label: 'Huacales', n: 4, cols: 2, x: 12, y: 476, destino: 'huacales' },
    { id: 'reparacion', proceso: 'reparacion', label: 'Reparación', n: 3, cols: 3, x: 222, y: 650, destino: 'reparacion' },
    { id: 'digitado', proceso: 'digitado', label: 'Digitado', n: 6, cols: 6, x: 12, y: 352, auto: true, destino: 'digitado' },
    { id: 'transito', proceso: 'transito', label: 'Tránsito', n: 6, cols: 6, x: 12, y: 258, auto: true, destino: 'transito' },
    { id: 'cedi', proceso: 'cedi', label: 'CEDI', n: 12, cols: 6, x: 12, y: 98, auto: true, destino: 'cedi' }
]
type Mesa = { id: string; zona: Zona; caja: Caja }
const MESAS: Mesa[] = ZONAS.flatMap(z => Array.from({ length: z.n }, (_, i) => {
    const x = z.x + (i % z.cols) * (MESA_ANCHO + GAP), y = z.y + Math.floor(i / z.cols) * (MESA_ALTO + GAP)
    return { id: `${z.id}-${i + 1}`, zona: z, caja: [x, y, x + MESA_ANCHO, y + MESA_ALTO] as Caja }
}))
const MESA = Object.fromEntries(MESAS.map(m => [m.id, m])) as Record<string, Mesa>

// Tramos: en la app la pieza solo cambia de estado en los puntos de notificación, así que cada estado puede estar
// en las mesas de los procesos que recorre hasta la siguiente notificación. `proceso` es donde se listan sus piezas sin mesa.
type Tramo = { id: string; proceso: string; estados: string[]; zonas: string[] }
const TRAMOS: Tramo[] = [
    // Pintadas que esperan vaciado: 2 mesas de Vaciado + 4 de la fila de arriba de Zona Curado = 6
    { id: 'vaciado', proceso: 'vaciado', estados: ['Pintura'], zonas: ['pintura', 'curadop', 'vaciado'] },
    // Ya vaciadas, van para Pulido: 12 de Zona Curado abajo + 4 de Desmolde + 6 de Pulido = 22
    { id: 'pulido', proceso: 'pulido', estados: ['Vaciado', 'Desgelcada', 'Pulido'], zonas: ['curadov', 'desmolde', 'pulido'] },
    { id: 'ensayo', proceso: 'ensayo', estados: ['Ensayo', 'Acabado'], zonas: ['acabado', 'ensamble1', 'ensamble2', 'ensayo'] },
    // Guacales = salió de Ensayo y espera el huacal; Empaque = huacal registrado, espera el Digitado
    { id: 'guacales', proceso: 'huacales', estados: ['Guacales'], zonas: ['acabado2', 'huacales'] },
    { id: 'reparacion', proceso: 'reparacion', estados: ['Reparacion', 'Reparacion_larga'], zonas: ['reparacion'] },
    { id: 'digitado', proceso: 'digitado', estados: ['Empaque', 'Digitado'], zonas: ['digitado'] },
    { id: 'transito', proceso: 'transito', estados: ['Transito'], zonas: ['transito'] },
    { id: 'cedi', proceso: 'cedi', estados: ['Cedi'], zonas: ['cedi'] }
]
const TODOS_ESTADOS = TRAMOS.flatMap(t => t.estados)
const tramoDeEstado = (estado: string) => TRAMOS.find(t => t.estados.includes(estado))
const mesasDeTramo = (t: Tramo) => MESAS.filter(m => t.zonas.includes(m.zona.id) && !m.zona.fueraDeCupo).length
const tramoDeProceso = (procesoId: string) => TRAMOS.find(t => t.proceso === procesoId)

// Orden de llenado de cada tramo para las piezas que llegan sin mesa (movidas desde los módulos, que no eligen
// mesa): primero las mesas más cerca de la siguiente notificación. En el mapa se ubican donde se suelten.
const porColumnas = (zona: string, cols: number, filas: number) =>
    Array.from({ length: cols * filas }, (_, i) => `${zona}-${(i % filas) * cols + Math.floor(i / filas) + 1}`)
const enFila = (zona: string, n: number) => Array.from({ length: n }, (_, i) => `${zona}-${i + 1}`)
const ORDEN_LLENADO: Record<string, string[]> = {
    vaciado: [...enFila('vaciado', 2), ...enFila('curadop', 4), 'pintura-1'],
    // Pulido (por columnas), Desmolde (por columnas) y Zona Curado de abajo desde la esquina inferior derecha
    pulido: [...porColumnas('pulido', 3, 2), ...porColumnas('desmolde', 2, 2), ...enFila('curadov', 12).reverse()],
    ensayo: [...enFila('ensayo', 2), ...enFila('ensamble2', 2), ...enFila('ensamble1', 2), ...porColumnas('acabado', 2, 2)],
    guacales: [...porColumnas('huacales', 2, 2), ...porColumnas('acabado2', 2, 2)],
    reparacion: enFila('reparacion', 3),
    digitado: enFila('digitado', 6),
    transito: enFila('transito', 6),
    cedi: porColumnas('cedi', 6, 2)
}

// nueva = OF arrastrada desde Programado: todavía no tiene pieza en la trazabilidad
type PiezaMesa = { registrer: string; of: string; ordenId: number; estado: string; mesa: string | null; nombre: string; descripcion: string; nueva?: boolean }

// Nombre corto de la bañera ("HIDROMASAJE HONOLULU DERECHA 180X120 BLANCO" → "Honolulu"):
// primera palabra de la descripción que no sea genérica, medida, color ni lado
const PALABRAS_GENERICAS = new Set([
    'HIDROMASAJE', 'HIDRO', 'HIDROAERO', 'AERO', 'AEROMASAJE', 'BAÑERA', 'BANERA', 'BAÑO', 'BANO', 'TINA', 'JACUZZI', 'SPA', 'DUCHA', 'PLATO',
    'RECEPTACULO', 'RECEPTÁCULO', 'MUEBLE', 'LAVAMANOS', 'LAVAPLATOS', 'LAVADERO', 'SEMI', 'SEMIEMPOTRADA',
    'EMPOTRAR', 'EMPOTRADA', 'EXENTA', 'ESQUINERA', 'CORNER', 'OVALADA', 'RECTANGULAR', 'REDONDA', 'KIT',
    'MOD', 'MODELO', 'NUEVA', 'NUEVO', 'PARA', 'CON', 'SIN', 'DEL', 'LAS', 'LOS',
    'DERECHA', 'IZQUIERDA', 'DER', 'IZQ', 'BLANCO', 'BLANCA', 'NEGRO', 'NEGRA', 'GRIS', 'BONE', 'BEIGE'
])
const nombreCorto = (descripcion?: string | null) => {
    const palabras = (descripcion || '').toUpperCase().split(/[^A-ZÁÉÍÓÚÜÑ0-9]+/).filter(Boolean)
    const nombre = palabras.find(p => p.length >= 3 && !/\d/.test(p) && !PALABRAS_GENERICAS.has(p)) || palabras[0] || ''
    return nombre ? nombre.charAt(0) + nombre.slice(1).toLocaleLowerCase('es') : ''
}

export default function MapaProcesosFibraModule() {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [detalleOf, setDetalleOf] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [moldes, setMoldes] = useState<Molde[] | null>(null)
    const [arrastre, setArrastre] = useState<PiezaMesa | null>(null)
    const [sobre, setSobre] = useState<string | null>(null)
    const [moviendo, setMoviendo] = useState(false)
    const [piezasMapa, setPiezasMapa] = useState<PiezaMapaFv[]>([])
    const [errorMesas, setErrorMesas] = useState<string | null>(null)
    const [listaAbierta, setListaAbierta] = useState<string | null>(null)
    // OF de Programado soltada en el mapa: falta escoger el molde para registrarla
    const [registroNuevo, setRegistroNuevo] = useState<{ pieza: PiezaMesa; destino: DestinoMovimientoFv; mesa: string | null; lugar: string } | null>(null)
    const [moldeElegido, setMoldeElegido] = useState<number | null>(null)

    const cargar = async () => {
        setCargando(true)
        setError(null)
        const { data, error } = await supabase.from('ordenes_fabricacion_fv').select('*')
        if (error) {
            setError(`No se pudieron cargar las órdenes: ${error.message}`)
            setOrdenes([])
            setCargando(false)
            return
        }
        setOrdenes(data || [])
        try {
            setPiezasMapa(await getPiezasMapaFv((data || []).map(o => o.id), TODOS_ESTADOS))
            setErrorMesas(null)
        } catch (e) {
            setPiezasMapa([])
            setErrorMesas(e instanceof Error ? e.message : String(e))
        }
        setCargando(false)
    }

    useEffect(() => { cargar() }, [])

    // Moldes para la tarjeta de la orden: se consultan la primera vez que se abre un detalle
    useEffect(() => {
        if ((detalleOf != null || registroNuevo) && moldes == null) getAllMoldes().then(setMoldes)
    }, [detalleOf, registroNuevo, moldes])
    const ordenNueva = registroNuevo ? ordenes.find(o => o.id === registroNuevo.pieza.ordenId) : undefined
    const moldesNueva = ordenNueva && moldes ? moldesDisponiblesOrden(ordenNueva, moldes) : []

    const confirmarRegistroNuevo = () => {
        const r = registroNuevo, moldeId = moldeElegido
        if (!r || moldeId == null) return
        setRegistroNuevo(null)
        setMoldeElegido(null)
        setMoldes(null) // el molde queda en uso: se vuelven a consultar
        ejecutar(async () => {
            await registrarPiezaProgramadoFv(r.pieza.ordenId, moldeId, r.destino, await usuarioActual(), r.mesa)
            toast.success(`OF ${r.pieza.of}: pieza registrada en ${r.lugar}`)
        })
    }
    const ordenDetalle = detalleOf != null ? ordenes.find(o => String(o.orden_fabricacion ?? '') === detalleOf) : undefined

    // OF por proceso (contadores de la orden) y lista de Programado
    const porProceso = useMemo(() => {
        const m: Record<string, { of: string; ordenId: number; piezas: number; nombre: string; descripcion: string; fecha: string }[]> = {}
        const otros: Record<string, number> = { saldo: 0, destruccion: 0 }
        for (const p of PROCESOS) m[p.id] = []
        for (const o of ordenes) {
            const { piezas } = piezasPorEtapa(o)
            for (const p of PROCESOS) {
                const n = p.etapas.reduce((s, e) => s + (piezas[e] || 0), 0)
                if (n > 0) m[p.id].push({ of: String(o.orden_fabricacion ?? ''), ordenId: o.id, piezas: n, nombre: nombreCorto(o.producto_descripcion), descripcion: o.producto_descripcion || '', fecha: (o.fecha_entrega_lote || o.fecha_ideal_produccion || o.fecha_entrega_estimada || '').slice(0, 10) })
            }
            for (const k of Object.keys(otros)) if ((piezas[k] || 0) > 0) otros[k]++
        }
        // Lo más atrasado primero (F. Ideal Producción, o la entrega estimada si no la tiene); sin fecha al final
        for (const id of Object.keys(m)) m[id].sort((a, b) =>
            (a.fecha || '9999').localeCompare(b.fecha || '9999') || a.of.localeCompare(b.of, 'es', { numeric: true }))
        return { m, otros }
    }, [ordenes])

    // Piezas en mesas: cada una en su mesa si la mesa es válida para su estado y no está repetida; si no, "sin mesa"
    const mesas = useMemo(() => {
        const porId = new Map(ordenes.map(o => [o.id, o]))
        const enMesa: Record<string, PiezaMesa> = {}
        const pendientes: Record<string, PiezaMesa[]> = Object.fromEntries(TRAMOS.map(t => [t.id, []]))
        const sinMesa: Record<string, PiezaMesa[]> = {}
        const total: Record<string, number> = Object.fromEntries(TRAMOS.map(t => [t.id, 0]))
        for (const p of piezasMapa) {
            const t = tramoDeEstado(p.estado)
            if (!t) continue
            const o = porId.get(p.ordenId)
            const info: PiezaMesa = {
                registrer: p.registrer, of: String(o?.orden_fabricacion ?? '?'), ordenId: p.ordenId, estado: p.estado, mesa: p.mesa,
                nombre: nombreCorto(o?.producto_descripcion), descripcion: o?.producto_descripcion || ''
            }
            total[t.id]++
            const m = p.mesa ? MESA[p.mesa] : undefined
            if (m && t.zonas.includes(m.zona.id) && !m.zona.auto && !enMesa[m.id]) enMesa[m.id] = info
            else pendientes[t.id].push(info)
        }
        // Las piezas sin mesa fija llenan en orden las casillas de los pasos virtuales y de espera del tramo;
        // las que no caben quedan en la lista "sin mesa"
        const zonaDe: Record<string, string> = {}
        for (const t of TRAMOS) {
            // Las mesas libres del tramo, en su orden de llenado; la pieza más antigua toma la primera
            const libres = (ORDEN_LLENADO[t.id] || []).filter(id => MESA[id] && !enMesa[id])
            libres.forEach((id, i) => { if (pendientes[t.id][i]) enMesa[id] = pendientes[t.id][i] })
            sinMesa[t.id] = pendientes[t.id].slice(libres.length)
        }
        for (const [id, p] of Object.entries(enMesa)) zonaDe[p.registrer] = MESA[id].zona.id
        return { enMesa, sinMesa, total, zonaDe }
    }, [piezasMapa, ordenes])

    // Buscador: resalta en verde las OF cuyo número o descripción contienen el texto
    const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const termino = sinTildes(busqueda.trim())
    const coincide = (x: { of: string; descripcion: string }) => termino !== '' && (x.of.includes(termino) || sinTildes(x.descripcion).includes(termino))
    const coincidencias = useMemo(() => {
        if (!termino) return 0
        const ofs = new Set<string>()
        for (const lista of Object.values(porProceso.m)) for (const x of lista) if (coincide(x)) ofs.add(x.of)
        for (const p of piezasMapa) {
            const o = ordenes.find(x => x.id === p.ordenId)
            if (o && coincide({ of: String(o.orden_fabricacion ?? ''), descripcion: o.producto_descripcion || '' })) ofs.add(String(o.orden_fabricacion))
        }
        return ofs.size
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [porProceso, piezasMapa, termino])

    const usuarioActual = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) throw new Error('No hay una sesión activa. Inicie sesión para mover piezas.')
        return user.email
    }
    const ejecutar = async (accion: () => Promise<void>) => {
        setMoviendo(true)
        try {
            await accion()
            await cargar()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e), { duration: 10000 })
        } finally {
            setMoviendo(false)
        }
    }
    const terminarArrastre = () => { setArrastre(null); setSobre(null) }

    // Arqueo: hoja FV de Prioridades (Semáforo de SAP) con el proceso actual de cada unidad, en este momento
    const [descargandoArqueo, setDescargandoArqueo] = useState(false)
    const descargarArqueo = async () => {
        setDescargandoArqueo(true)
        const id = toast.loading('Consultando el Semáforo de SAP y el control de piso...')
        try {
            const res = await fetch('/api/sap/semaforo')
            const tipo = res.headers.get('content-type') || ''
            const json = tipo.includes('application/json') ? await res.json() : null
            if (!res.ok || !json?.success || !Array.isArray(json.data) || json.data.length === 0) {
                throw new Error(json?.error || json?.details || `El Semáforo de SAP no respondió (HTTP ${res.status})`)
            }
            const [{ descargarArqueoFv }, { procesosActualesFv }] = await Promise.all([import('@/lib/prioridadesPlantas'), import('@/lib/fibra/procesoActual')])
            const procesos = await procesosActualesFv()
            const filas = await descargarArqueoFv(json.data, procesos)
            toast.success(`Arqueo FV descargado (${filas} órdenes)`, { id })
        } catch (e) {
            toast.error(`No se pudo generar el arqueo: ${e instanceof Error ? e.message : String(e)}`, { id, duration: 10000 })
        } finally {
            setDescargandoArqueo(false)
        }
    }

    // ¿Dónde se puede soltar la pieza que se arrastra?
    const puedeEnMesa = (m: Mesa) => {
        if (!arrastre) return false
        if (m.zona.auto) {
            if (arrastre.nueva) return !!(m.zona.crear || m.zona.destino)
            const t = tramoDeEstado(arrastre.estado)
            if (t && t.zonas.includes(m.zona.id)) return mesas.zonaDe[arrastre.registrer] !== m.zona.id
            return !!m.zona.destino
        }
        if (mesas.enMesa[m.id] || arrastre.mesa === m.id) return false
        if (arrastre.nueva) return !!(m.zona.crear || m.zona.destino)
        const t = tramoDeEstado(arrastre.estado)
        return (!!t && t.zonas.includes(m.zona.id)) || !!m.zona.destino
    }
    const puedeEnProceso = (p: Proceso) => {
        if (arrastre?.nueva) return !!(p.crear || p.destino)
        if (!arrastre || !p.destino) return false
        return !tramoDeEstado(arrastre.estado)?.zonas.some(z => ZONAS.find(x => x.id === z)?.proceso === p.id)
    }

    // Soltar en una mesa: dentro del mismo tramo solo cambia la mesa; en otro tramo cambia el estado (trazabilidad)
    const soltarEnMesa = (m: Mesa) => {
        const pieza = arrastre
        terminarArrastre()
        if (!pieza || !puedeEnMesa(m)) return
        const mesaId = m.zona.auto ? null : m.id
        if (pieza.nueva) {
            setMoldeElegido(null)
            setRegistroNuevo({ pieza, destino: m.zona.crear ?? m.zona.destino!, mesa: mesaId, lugar: m.zona.label })
            return
        }
        const t = tramoDeEstado(pieza.estado)
        if (t && t.zonas.includes(m.zona.id)) {
            ejecutar(async () => {
                await asignarMesaFv(pieza.registrer, mesaId)
                toast.success(`OF ${pieza.of} (${pieza.nombre}) ubicada en ${m.zona.label}`)
            })
            return
        }
        const destino = m.zona.destino!
        if (!confirm(`¿Pasar 1 pieza de la OF ${pieza.of} (${pieza.nombre}) a ${m.zona.label}?\n\nCambia de proceso y quedará registrado en la trazabilidad con su usuario y la hora.`)) return
        ejecutar(async () => {
            await moverPiezaFibra(pieza.registrer, destino, await usuarioActual(), mesaId)
            toast.success(`OF ${pieza.of}: 1 pieza pasó a ${m.zona.label}`)
        })
    }

    // Soltar en un proceso (fuera de sus mesas): cambia el estado y la pieza queda sin mesa
    const soltarEnProceso = (p: Proceso) => {
        const pieza = arrastre
        terminarArrastre()
        if (!pieza || !puedeEnProceso(p)) return
        if (pieza.nueva) {
            setMoldeElegido(null)
            setRegistroNuevo({ pieza, destino: p.crear ?? p.destino!, mesa: null, lugar: p.label })
            return
        }
        const destino = p.destino!
        if (!confirm(`¿Pasar 1 pieza de la OF ${pieza.of} (${pieza.nombre}) a ${p.label}?\n\nQuedará registrado en la trazabilidad con su usuario y la hora.`)) return
        ejecutar(async () => {
            await moverPiezaFibra(pieza.registrer, destino, await usuarioActual())
            toast.success(`OF ${pieza.of}: 1 pieza pasó a ${p.label}`)
        })
    }

    // Soltar en la lista "sin mesa" de su tramo: le quita la mesa
    const quitarMesa = (t: Tramo) => {
        const pieza = arrastre
        terminarArrastre()
        if (!pieza?.mesa || tramoDeEstado(pieza.estado)?.id !== t.id) return
        ejecutar(async () => {
            await asignarMesaFv(pieza.registrer, null)
            toast.success(`OF ${pieza.of} (${pieza.nombre}) quedó sin mesa`)
        })
    }

    const zonaDrop = (id: string, valido: boolean, alSoltar: () => void) => valido ? {
        onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (sobre !== id) setSobre(id) },
        onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null) },
        onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); alSoltar() }
    } : {}

    // Pieza: clic abre el detalle; clic sostenido y arrastrar la lleva a una mesa o a otro proceso
    const chipPieza = (x: PiezaMesa, estilo: string, enMesa: boolean) => (
        <button key={x.registrer} onClick={() => setDetalleOf(x.of)}
            draggable={!moviendo}
            onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.registrer); setArrastre(x); setListaAbierta(null) }}
            onDragEnd={terminarArrastre}
            title={`OF ${x.of} · ${x.descripcion || 'sin descripción'} · pieza ${x.registrer} (${x.estado}) · clic para ver el detalle · clic sostenido y arrastrar a una mesa o a otro proceso`}
            className={`${enMesa ? 'w-full h-full flex flex-col items-center justify-center text-center px-0.5 overflow-hidden' : 'max-w-full flex items-baseline gap-0.5 text-[9px] px-1 leading-[14px] whitespace-nowrap'} font-bold rounded cursor-grab active:cursor-grabbing ${arrastre?.registrer === x.registrer ? 'opacity-40' : ''} ${coincide(x) ? 'bg-[#59a96a] text-white ring-2 ring-[#3b8f50]' : estilo}`}>
            {enMesa ? (
                <>
                    {x.nombre && <span className="block w-full truncate text-[11px] leading-tight">{x.nombre}</span>}
                    <span className="block font-mono text-xl font-black leading-none">{x.of.slice(-4)}</span>
                </>
            ) : (
                <>
                    {x.nombre && <span className="truncate min-w-0">{x.nombre}</span>}
                    <span className="font-mono shrink-0">{x.of.slice(-4)}</span>
                </>
            )}
        </button>
    )

    const mesa = (m: Mesa) => {
        const ocupada = mesas.enMesa[m.id]
        const tipo = PROCESO[m.zona.proceso].tipo
        const claro = tipo !== 'sin-notificacion'
        const valido = puedeEnMesa(m)
        const zona = 'mesa:' + m.id
        return (
            <div key={m.id} style={pos(m.caja)} title={ocupada ? undefined : m.zona.auto ? `${m.zona.label} · se llena en orden` : `${m.zona.label} · mesa libre`}
                {...zonaDrop(zona, valido, () => soltarEnMesa(m))}
                className={`absolute z-[5] rounded border border-dashed p-0.5 flex items-stretch ${claro ? 'border-[#25323f]/30 bg-white/30' : 'border-white/40 bg-white/10'} ${valido ? (sobre === zona ? 'ring-2 ring-[#59a96a] bg-[#59a96a]/30' : 'ring-1 ring-[#59a96a]/70') : ''}`}>
                {ocupada && chipPieza(ocupada, claro ? ESTILO.notificacion.chip : ESTILO['sin-notificacion'].chip, true)}
            </div>
        )
    }

    // Aviso "N sin mesa" junto al nombre del proceso: lista desplegable con las piezas sin ubicar o que no caben
    const avisoSinMesa = (t: Tramo, estilo: string) => {
        const lista = mesas.sinMesa[t.id]
        const valido = !!arrastre?.mesa && tramoDeEstado(arrastre.estado)?.id === t.id
        if (lista.length === 0 && !valido) return null
        const capacidad = mesasDeTramo(t)
        const sobrecupo = mesas.total[t.id] > capacidad
        return (
            <div className="relative shrink-0" {...zonaDrop('sin:' + t.id, valido, () => quitarMesa(t))}>
                <button onClick={() => setListaAbierta(listaAbierta === t.id ? null : t.id)}
                    title={sobrecupo ? `Hay ${mesas.total[t.id]} piezas y solo ${capacidad} mesas` : 'Piezas sin mesa: abra la lista y arrástrelas a su mesa'}
                    className={`flex items-center gap-0.5 text-[9px] font-black px-1 rounded leading-4 ${sobrecupo ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'} ${sobre === 'sin:' + t.id ? 'ring-2 ring-[#59a96a]' : ''}`}>
                    {lista.length} sin mesa <ChevronDown className="w-3 h-3" />
                </button>
                {listaAbierta === t.id && lista.length > 0 && (
                    <div className="absolute left-0 top-full mt-0.5 z-30 w-44 max-h-48 overflow-y-auto bg-white border border-amber-500 rounded-lg shadow-xl p-1 space-y-0.5">
                        <div className="text-[9px] font-black uppercase text-amber-800 px-0.5">{sobrecupo ? `Sobran ${mesas.total[t.id] - capacidad} pieza(s)` : 'Arrástrelas a su mesa'}</div>
                        {lista.map(x => <div key={x.registrer}>{chipPieza(x, estilo, false)}</div>)}
                    </div>
                )}
            </div>
        )
    }

    const contadorProceso = (p: Proceso) => {
        const tramo = tramoDeProceso(p.id)
        const badge = 'bg-[#25323f] text-white'
        if (tramo) return (
            <span className={`shrink-0 text-[9px] font-black px-1 rounded leading-4 ${mesas.total[tramo.id] > mesasDeTramo(tramo) ? 'bg-red-600 text-white' : badge}`}
                title={`${mesas.total[tramo.id]} pieza(s) en estado ${tramo.estados[0]} · ${mesasDeTramo(tramo)} mesas en ${tramo.zonas.map(z => ZONAS.find(x => x.id === z)!.label.split(' · ')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`}>
                {mesas.total[tramo.id]}/{mesasDeTramo(tramo)}
            </span>
        )
        const lista = porProceso.m[p.id]
        return !p.sinContador && p.etapas.length > 0
            ? <span className={`shrink-0 text-[9px] font-black px-1 rounded leading-4 ${badge}`} title={`${lista.length} orden(es)`}>{lista.length} OF</span>
            : null
    }

    // Nombre del proceso encima de su recuadro (con el aviso "sin mesa" y el contador)
    const etiqueta = (p: Proceso) => {
        const [x1, y1, x2] = p.caja
        const tramo = tramoDeProceso(p.id)
        return (
            <div key={'nombre-' + p.id} style={pos([x1, y1 - 40, x2, y1 - 2])}
                className={`absolute flex flex-wrap justify-center items-end content-end gap-x-1 gap-y-0.5 text-center pointer-events-none [&_button]:pointer-events-auto [&>div]:pointer-events-auto ${listaAbierta && tramo?.id === listaAbierta ? 'z-30' : 'z-[6]'} ${p.aislado ? 'opacity-60' : ''}`}>
                {/* Nombre y contador centrados sobre el recuadro, pegados a su borde superior */}
                {p.nombres ? (
                    // Ensamble: un nombre centrado sobre cada grupo de mesas; Desmolde · Herrajes · Nivelación: uno por renglón
                    <div className={p.id === 'ensamble' ? 'grid w-full items-end' : 'flex flex-col items-center w-full'}
                        style={p.id === 'ensamble' ? { gridTemplateColumns: '1fr 1fr 2fr' } : undefined}>
                        {p.nombres.map(n => <span key={n} className="text-[11px] font-black text-[#25323f] leading-tight px-0.5 text-center whitespace-pre-line">{n}</span>)}
                    </div>
                ) : (
                    <span className="text-[12px] font-black text-[#25323f] leading-tight min-w-0">{p.label}</span>
                )}
                {tramo && avisoSinMesa(tramo, ESTILO[p.tipo].chip)}
                {contadorProceso(p)}
            </div>
        )
    }

    const hoyIso = new Date().toLocaleDateString('en-CA')
    const caja = (p: Proceso) => {
        const estilo = ESTILO[p.tipo]
        const lista = porProceso.m[p.id]
        const valido = puedeEnProceso(p)
        return (
            <div key={p.id} style={pos(p.caja)}
                title={p.aislado ? `${p.label}: fuera del flujo, no afecta a ningún proceso` : undefined}
                {...zonaDrop(p.id, valido, () => soltarEnProceso(p))}
                className={`absolute rounded border-2 px-1 py-0.5 flex flex-col overflow-hidden transition-shadow ${estilo.caja} ${p.aislado ? 'opacity-60 border-dashed' : ''} ${valido ? (sobre === p.id ? 'ring-4 ring-[#59a96a] z-10' : 'ring-2 ring-[#59a96a]/60') : ''}`}>
                {p.id === 'ensayo' && errorMesas && (
                    <div className="px-1 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded leading-tight relative z-10" role="alert">{errorMesas}</div>
                )}
                {/* Programado no tiene piezas registradas todavía: se listan sus OF */}
                {p.id === 'programado' && (
                    <>
                        {p.sub && <span className="text-[9px] font-semibold italic opacity-80 leading-tight">{p.sub}</span>}
                        {/* Todas las OF del mismo ancho: columnas iguales que se acomodan al ancho del recuadro */}
                        <div className="mt-0.5 grid gap-0.5 content-start overflow-y-auto overflow-x-hidden min-h-0 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                            {lista.map(x => (
                                <button key={x.of} onClick={() => setDetalleOf(x.of)}
                                    draggable={!moviendo}
                                    onDragStart={e => {
                                        e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.of); setListaAbierta(null)
                                        setArrastre({ registrer: 'nueva:' + x.of, of: x.of, ordenId: x.ordenId, estado: '', mesa: null, nombre: x.nombre, descripcion: x.descripcion, nueva: true })
                                    }}
                                    onDragEnd={terminarArrastre}
                                    title={`OF ${x.of} · ${x.descripcion || 'sin descripción'} · ${x.piezas} pieza(s) pendientes · F. Ideal Producción ${x.fecha ? x.fecha.split('-').reverse().join('/') : 'sin fecha'}${x.fecha && x.fecha < hoyIso ? ' (ATRASADA)' : ''} · clic para ver el detalle · arrastrar a una mesa o proceso para registrar 1 pieza (se pide el molde)`}
                                    className={`w-full min-w-0 flex items-baseline gap-0.5 text-[9px] font-bold px-1 rounded leading-[14px] whitespace-nowrap cursor-grab active:cursor-grabbing ${arrastre?.registrer === 'nueva:' + x.of ? 'opacity-40' : ''} ${coincide(x) ? 'bg-[#59a96a] text-white ring-2 ring-[#3b8f50]' : estilo.chip}`}>
                                    {x.nombre && <span className="truncate min-w-0 flex-1 text-left">{x.nombre}</span>}
                                    <span className={`font-mono font-black shrink-0 ml-auto ${x.fecha && x.fecha < hoyIso && !coincide(x) ? 'text-red-600' : ''}`}>{x.of.slice(-4)}</span>
                                    {x.piezas > 1 && <sup className="shrink-0 text-[7px]">×{x.piezas}</sup>}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-[#F6F3EE]/40 overflow-hidden" onClick={e => { if (!(e.target as HTMLElement).closest('button')) setListaAbierta(null) }}>
            {/* Barra superior */}
            <div className="bg-white border-b border-[#e2ded5] px-3 py-1.5 shrink-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-[1200px]:grid min-[1200px]:grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)]">
                    <div className="flex items-center gap-1.5 text-[#324354]">
                        <MapaIcon className="w-4 h-4" />
                        <h2 className="text-sm font-black whitespace-nowrap">Mapa de procesos FV</h2>
                    </div>
                    <button onClick={descargarArqueo} disabled={descargandoArqueo}
                        title="Excel con la hoja FV de Prioridades (Semáforo de SAP) y el proceso actual de cada unidad de cada OF"
                        className="h-7 px-3 flex items-center gap-1.5 rounded-lg bg-[#324354] text-white text-[11px] font-bold hover:bg-[#254153] disabled:opacity-50 whitespace-nowrap">
                        {descargandoArqueo ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Descargar arqueo
                    </button>
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500 whitespace-nowrap min-[1200px]:justify-self-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar OF o descripción"
                                className="h-7 w-64 xl:w-80 2xl:w-[28rem] pl-7 pr-6 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-[#324354] outline-none focus:ring-2 focus:ring-[#59a96a]" />
                            {busqueda && (
                                <button onClick={() => setBusqueda('')} title="Borrar búsqueda"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                            )}
                        </div>
                        {termino && (
                            <span className={`px-1.5 py-0.5 rounded font-bold ${coincidencias ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {coincidencias} OF
                            </span>
                        )}
                        {/* Mismo cálculo de la tarjeta CANTIDAD de Órdenes de Fabricación: piezas de todas las órdenes */}
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold" title={`${ordenes.length} órdenes de fabricación FV cargadas en el mapa`}>Cantidad <b className="text-[#324354]">{ordenes.reduce((t, o) => t + (o.cantidad_programada || o.cantidad || 0), 0)}</b></span>
                        <button onClick={cargar} disabled={cargando}
                            className="h-7 w-7 flex items-center justify-center bg-[#324354] text-white rounded-lg hover:bg-[#254153] disabled:opacity-50" title="Actualizar">
                            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Plano: ocupa todo el ancho y el alto disponibles (las cajas se estiran a lo ancho) */}
            <div className="flex-1 overflow-auto p-2 sm:p-3">
                {error ? (
                    <div className="p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2" role="alert"><AlertTriangle size={18} /> {error}</div>
                ) : cargando && ordenes.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-[#e2ded5]">Cargando órdenes...</div>
                ) : (
                    <div className="w-full bg-white rounded-xl border border-[#e2ded5] shadow-sm p-2 min-w-[900px]">
                        <div className="relative w-full h-[max(520px,calc(100vh-8rem))]">
                            {PROCESOS.map(caja)}
                            {PROCESOS.map(etiqueta)}

                            {/* Leyenda */}
                            <div className="absolute flex items-end justify-center gap-3 text-[10px] font-semibold text-slate-600" style={pos([530, 694, 1250, 716])}>
                                {(Object.keys(ESTILO) as TipoProceso[]).map(t => (
                                    <span key={t} className="flex items-center gap-1.5 whitespace-nowrap">
                                        <span className={`w-3 h-3 rounded-sm border shrink-0 ${ESTILO[t].caja}`} /> {ESTILO[t].label}
                                    </span>
                                ))}
                            </div>

                            {/* Zona Curado: arriba las pintadas que van para Vaciado, abajo las vaciadas que van para Desmolde */}
                            <div className="absolute h-[2px] bg-slate-500/70" style={pos([1078, 164, 1464, 166])} />

                            {MESAS.map(mesa)}

                            {/* Zona Curado → Desmolde · Herrajes · Nivelación */}
                            <div className="absolute w-[3px] bg-[#00b050] -translate-x-1/2" style={{ ...punto(1440, 370), height: `${((424 - 370) / ALTO) * 100}%` }} />

                            {FLECHAS.map((f, i) => {
                                const Icono = ICONO_FLECHA[f.dir]
                                return <Icono key={i} className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 text-[#00b050] pointer-events-none" strokeWidth={3} style={punto(f.x, f.y)} />
                            })}
                        </div>
                    </div>
                )}
            </div>

            {registroNuevo && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
                    onMouseDown={e => { if (e.target === e.currentTarget) setRegistroNuevo(null) }}
                    onKeyDown={e => { if (e.key === 'Escape') setRegistroNuevo(null) }}>
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col gap-3">
                        <div>
                            <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Registrar pieza · Pintura</span>
                            <h2 className="text-xl font-black text-[#324354] mt-2">OF {registroNuevo.pieza.of} · {registroNuevo.pieza.nombre}</h2>
                            <p className="text-xs text-slate-600">{registroNuevo.pieza.descripcion}</p>
                            <p className="text-xs font-bold text-slate-700 mt-1">Se registra como en Pintura (molde en uso) y la pieza queda en <b>{registroNuevo.lugar}</b>.</p>
                        </div>
                        <div className="text-[10px] font-black uppercase text-slate-500">Molde</div>
                        <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                            {moldes == null ? (
                                <div className="p-4 text-center text-sm text-slate-500 font-bold">Cargando moldes...</div>
                            ) : moldesNueva.length === 0 ? (
                                <div className="p-3 bg-red-50 text-red-800 text-sm font-bold flex items-start gap-2" role="alert">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" /> No hay moldes disponibles para esta orden. Libere o revise los moldes en Pintura.
                                </div>
                            ) : moldesNueva.map(m => (
                                <label key={m.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${moldeElegido === m.id ? 'bg-[#324354]/10' : 'hover:bg-slate-50'}`}>
                                    <input type="radio" name="molde-nuevo" checked={moldeElegido === m.id} onChange={() => setMoldeElegido(m.id)} />
                                    <span className="font-mono font-black text-[#324354] text-sm">{m.serial}</span>
                                    <span className="text-xs text-slate-600 truncate flex-1">{m.molde_descripcion}</span>
                                    <span className="text-[10px] font-bold text-slate-500 shrink-0">{m.vueltas_actuales} vueltas</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#e2ded5]">
                            <button onClick={() => setRegistroNuevo(null)} className="px-3 py-1.5 rounded-lg font-bold text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50">Cancelar</button>
                            <button onClick={confirmarRegistroNuevo} disabled={moldeElegido == null || moviendo}
                                className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#324354] text-white hover:bg-[#254153] disabled:opacity-50">Registrar</button>
                        </div>
                    </div>
                </div>
            )}

            {detalleOf != null && (
                <DetalleOrdenSapModal ordenFabricacion={detalleOf} onClose={() => setDetalleOf(null)}
                    piso={{
                        label: 'Control de piso',
                        // Misma tarjeta y procesos por pieza de Órdenes de Fabricación (solo consulta)
                        contenido: ordenDetalle ? (
                            <div className="space-y-2">
                                <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none [&>button]:cursor-default [&>button:hover]:bg-white">
                                    <OrdenCard planta="fv" conDetalle={false} orden={ordenDetalle} isActive={false} onClick={() => { }} moldes={moldes || []} />
                                </div>
                                <OrderProcessesPanel orden={ordenDetalle} registros={[]} />
                            </div>
                        ) : (
                            <div className="px-4 py-6 bg-red-50 border border-red-400 text-red-800 text-sm font-bold rounded-xl flex items-center gap-2" role="alert">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" /> La OF {detalleOf} no está en las órdenes de Fibra cargadas. Actualice el mapa.
                            </div>
                        )
                    }} />
            )}
        </div>
    )
}
