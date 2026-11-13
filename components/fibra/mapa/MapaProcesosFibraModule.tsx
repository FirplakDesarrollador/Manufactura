'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { getAllMoldes } from '@/lib/supabase/queries/fibra'
import { OrderProcessesPanel } from '@/components/fibra/administracion/AdministracionFibraModule'
import { piezasPorEtapa } from '@/components/fibra/buscador/BuscadorOrdenesFibraModule'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { DestinoMovimientoFv, getPiezasMapaFv, asignarMesaFv, moverPiezaFibra, registrarPiezaProgramadoFv, devolverPiezaAProgramadoFv, registrarKitReparacionFv, PiezaMapaFv } from '@/lib/supabase/queries/fibra_administracion'
import { esKitReparacion } from '@/lib/fibra/kitReparacion'
import { useFechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'
import { moldesDeOrden } from '@/lib/fibra/moldesOrden'
import { ocupacionMoldesFv, liberarMoldeFv, OcupacionMolde } from '@/lib/supabase/queries/fibra_moldes'
import { toast } from 'sonner'
import ImportarPosicionesFv from './ImportarPosicionesFv'
import HistorialMovimientosFv from './HistorialMovimientosFv'
import { MapPin as MapaIcon, RefreshCw, AlertTriangle, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Search, X, ChevronDown, FileDown, Loader2, ClipboardPaste, Unlock, History } from 'lucide-react'

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
    tituloIzq?: boolean  // el nombre va a la izquierda del recuadro (Desmolde, Instalación Herrajes)
    aislado?: boolean  // proceso que aún no está en el flujo
    sinContador?: boolean  // solo se dibuja el proceso, sin contador de OF ni mensajes
    tipo: TipoProceso
    etapas: string[]   // campos de ordenes_fabricacion_fv que suman en este proceso ([] = sin registro en la app)
    caja: Caja         // posición en el plano del layout (px de la imagen de referencia)
    destino?: DestinoMovimientoFv  // soltar una pieza en el proceso la pasa a este estado (movimiento manual)
    crear?: DestinoMovimientoFv    // estado de la pieza nueva si se suelta aquí una OF de Programado (se pide el molde)
}

// Plano de referencia (imagen "LAYOUT FV"): todo se ubica en % de este rectángulo
// ANCHO 1700: franja de la derecha para que Programado tenga 2 recuadros del tamaño de una mesa por fila
const X0 = 0, Y0 = 70, ANCHO = 1700, ALTO = 650
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
    { id: 'curado', label: 'Zona Curado', sinContador: true, tipo: 'espera', etapas: [], caja: [1072, 92, 1470, 164] },
    // Debajo de Zona Curado: Desmolde (8 casillas) e Instalación Herrajes (5), tiempos de espera de las piezas vaciadas
    { id: 'desmoldez', label: 'Desmolde', tituloIzq: true, sinContador: true, tipo: 'espera', etapas: [], caja: [1072, 170, 1470, 308] },
    { id: 'herrajesz', label: 'Instalación\nHerrajes', tituloIzq: true, tipo: 'notificacion', etapas: ['herrajes'], crear: 'herrajes', caja: [974, 322, 1470, 394] },
    { id: 'pintura', label: 'Pintura', tipo: 'notificacion', etapas: ['pintura'], crear: 'pintura', caja: [1484, 92, 1694, 164] },
    { id: 'huacales', label: 'Huacales', tipo: 'notificacion', etapas: ['empaque'], destino: 'huacales', caja: [6, 470, 208, 608] },
    { id: 'acabado2', label: 'Acabado 2', sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [216, 470, 418, 608] },
    { id: 'ensayo', label: 'Ensayo', tipo: 'notificacion', etapas: ['acabado'], destino: 'ensayo', caja: [426, 470, 530, 608] },
    { id: 'ensamble', label: 'Ensamble 2 · Ensamble 1 · Acabado 1', nombres: ['Ensamble\n2', 'Ensamble\n1', 'Acabado\n1'], enColumnas: true, sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [538, 470, 936, 608] },
    { id: 'pulido', label: 'Pulido', tipo: 'notificacion', etapas: ['pulido'], destino: 'pulido', caja: [948, 470, 1248, 608] },
    { id: 'nivelacion', label: 'Nivelación', sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [1256, 470, 1458, 608] },
    { id: 'reparacion', label: 'Reparación', tipo: 'notificacion', etapas: ['reparacion', 'reparacion_larga'], destino: 'reparacion', caja: [216, 644, 516, 716] },
    { id: 'soldadura', label: 'Soldadura', aislado: true, sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [1256, 644, 1362, 716] },
    // Pasos virtuales (no son procesos físicos): Programado → Pintura … Huacales → Digitado → Tránsito → CEDI
    { id: 'programado', label: 'Programado', sub: 'Pendiente por pintar', tipo: 'virtual', etapas: ['programado'], caja: [1484, 212, 1694, 716] },
    { id: 'digitado', label: 'Digitado', tipo: 'virtual', etapas: ['digitado'], destino: 'digitado', caja: [6, 346, 600, 418] },
    { id: 'transito', label: 'Tránsito', tipo: 'virtual', etapas: ['transito'], destino: 'transito', caja: [6, 252, 600, 324] },
    { id: 'cedi', label: 'CEDI', tipo: 'virtual', etapas: ['cedi'], destino: 'cedi', caja: [6, 92, 600, 230] }
]
const PROCESO = Object.fromEntries(PROCESOS.map(p => [p.id, p])) as Record<string, Proceso>

// Flechas de flujo (centro en px del plano)
// Títulos en 2 renglones (como Ensamble 2 / Ensamble 1)
const DOS_RENGLONES = new Set(['huacales', 'acabado2', 'ensayo', 'pulido'])
const FLECHAS: { x: number; y: number; dir: 'izq' | 'der' | 'arriba' | 'abajo' }[] = [
    { x: 1066, y: 128, dir: 'izq' },                                       // Zona Curado → Vaciado
    { x: 1477, y: 128, dir: 'izq' },                                       // Pintura → Zona Curado
    { x: 1680, y: 170, dir: 'arriba' },                                    // Programado → Pintura
    { x: 1066, y: 239, dir: 'der' },                                      // Vaciado → Desmolde (flecha en L)
    { x: 1271, y: 315, dir: 'abajo' },                                     // Desmolde → Instalación Herrajes
    { x: 1357, y: 424, dir: 'abajo' },                                     // Instalación Herrajes → Desmolde · Herrajes · Nivelación
    ...[1252, 942, 534, 422, 212].map(x => ({ x, y: 580, dir: 'izq' as const })),
    { x: 180, y: 426, dir: 'arriba' },                                     // Huacales → Digitado
    { x: 440, y: 335, dir: 'arriba' },                                     // Digitado → Tránsito
    { x: 440, y: 241, dir: 'arriba' },                                     // Tránsito → CEDI
    { x: 290, y: 616, dir: 'arriba' }, { x: 314, y: 616, dir: 'abajo' }    // Acabado 2 ⇄ Reparación
]
const ICONO_FLECHA = { izq: ArrowLeft, der: ArrowRight, arriba: ArrowUp, abajo: ArrowDown }

// Colores del layout: amarillo = punto de notificación, azul = sin notificación, gris = espera
const ESTILO: Record<TipoProceso, { caja: string; chip: string; badge: string; label: string }> = {
    // Todas las piezas (OF) en blanco; solo las atrasadas a cliente van en rojo. Colores del manual Firplak con contraste: amarillo semáforo = punto de notificación, navy = proceso sin
    // notificación, sage claro = tiempo de espera (crema/blanco = paso virtual)
    'notificacion': { caja: 'bg-[#deb841] border-[#b8962c] text-[#25323f]', chip: 'bg-white text-[#25323f] shadow-sm hover:bg-[#F6F3EE]', badge: 'bg-[#324354] text-white', label: 'Punto de notificación' },
    'sin-notificacion': { caja: 'bg-[#324354] border-[#25323f] text-white', chip: 'bg-white text-[#25323f] shadow-sm hover:bg-[#F6F3EE]', badge: 'bg-[#324354] text-white', label: 'Proceso sin notificación' },
    'espera': { caja: 'bg-[#c3cdce] border-[#7B8E90] text-[#25323f]', chip: 'bg-white text-[#25323f] shadow-sm hover:bg-[#F6F3EE]', badge: 'bg-[#324354] text-white', label: 'Tiempo de espera' },
    'virtual': { caja: 'bg-white border-dashed border-slate-400 text-[#25323f]', chip: 'bg-white text-[#25323f] shadow-sm ring-1 ring-[#e2ded5] hover:bg-[#F6F3EE]', badge: 'bg-[#25323f] text-white', label: 'Paso virtual' }
}

// ===== Mesas =====
// Zona = grupo de mesas dentro de un proceso, en `cols` columnas desde la esquina (x, y) del plano.
// Todas las mesas miden lo mismo (como las de Ensayo y Ensamble); los recuadros se ajustan a sus mesas.
const MESA_ANCHO = 92, MESA_ALTO = 60, GAP = 6
// auto = paso virtual o de espera: no hay mesa específica, las piezas llenan las casillas en orden (la más antigua primero)
type Zona = { id: string; proceso: string; label: string; n: number; cols: number; x: number; y: number; auto?: boolean; fueraDeCupo?: boolean; destino?: DestinoMovimientoFv; crear?: DestinoMovimientoFv; regreso?: DestinoMovimientoFv }
const ZONAS: Zona[] = [
    // La mesa de Pintura recibe piezas pintadas pero no cuenta en el cupo de Vaciado (6 mesas)
    { id: 'pintura', proceso: 'pintura', label: 'Pintura', n: 1, cols: 1, x: 1543, y: 98, fueraDeCupo: true, crear: 'pintura', regreso: 'pintura' },
    { id: 'curadop', proceso: 'curado', label: 'Zona Curado · pintadas, van para Vaciado', n: 4, cols: 4, x: 1078, y: 98, auto: true, crear: 'pintura', regreso: 'pintura' },
    { id: 'curadov', proceso: 'desmoldez', label: 'Desmolde · vaciadas, esperan desmolde', n: 8, cols: 4, x: 1078, y: 176, auto: true, crear: 'vaciado', regreso: 'vaciado' },
    { id: 'instherrajes', proceso: 'herrajesz', label: 'Instalación Herrajes', n: 5, cols: 5, x: 980, y: 328, auto: true, crear: 'vaciado', regreso: 'vaciado' },
    { id: 'vaciado', proceso: 'vaciado', label: 'Vaciado', n: 2, cols: 2, x: 864, y: 98, crear: 'vaciado', regreso: 'pintura' },
    { id: 'desmolde', proceso: 'nivelacion', label: 'Nivelación', n: 4, cols: 2, x: 1262, y: 476, crear: 'herrajes', regreso: 'herrajes' },
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
// Mesas físicas de cada zona (sin las casillas automáticas), para ubicar OF desde Excel
const MESAS_ZONA: Record<string, string[]> = Object.fromEntries(ZONAS.filter(z => !z.auto).map(z => [z.id, MESAS.filter(m => m.zona.id === z.id).map(m => m.id)]))

// Tramos: en la app la pieza solo cambia de estado en los puntos de notificación, así que cada estado puede estar
// en las mesas de los procesos que recorre hasta la siguiente notificación. `proceso` es donde se listan sus piezas sin mesa.
type Tramo = { id: string; proceso: string; estados: string[]; zonas: string[] }
const TRAMOS: Tramo[] = [
    // Pintadas que esperan vaciado: 2 mesas de Vaciado + 4 de la fila de arriba de Zona Curado = 6
    { id: 'vaciado', proceso: 'vaciado', estados: ['Pintura'], zonas: ['pintura', 'curadop', 'vaciado'] },
    // Ya vaciadas, van para Pulido: 12 de Zona Curado abajo + 4 de Desmolde + 6 de Pulido = 22
    // Vaciadas que esperan herrajes: 8 de Desmolde (solo visual, sin notificación) + 5 de Instalación Herrajes = 13
    { id: 'herrajes', proceso: 'herrajesz', estados: ['Vaciado', 'Desgelcada'], zonas: ['curadov', 'instherrajes'] },
    // Con herrajes, van para Pulido: 4 de Nivelación + 6 de Pulido = 10 ('Pulido' = estado anterior al punto de Herrajes)
    { id: 'pulido', proceso: 'pulido', estados: ['Herrajes', 'Pulido'], zonas: ['desmolde', 'pulido'] },
    { id: 'ensayo', proceso: 'ensayo', estados: ['Ensayo', 'Acabado'], zonas: ['acabado', 'ensamble1', 'ensamble2', 'ensayo'] },
    // Guacales = salió de Ensayo y espera el huacal; Empaque = huacal registrado, espera el Digitado
    { id: 'guacales', proceso: 'huacales', estados: ['Guacales'], zonas: ['acabado2', 'huacales'] },
    { id: 'reparacion', proceso: 'reparacion', estados: ['Reparacion', 'Reparacion_larga'], zonas: ['reparacion'] },
    { id: 'digitado', proceso: 'digitado', estados: ['Empaque', 'Digitado'], zonas: ['digitado'] },
    { id: 'transito', proceso: 'transito', estados: ['Transito'], zonas: ['transito'] },
    { id: 'cedi', proceso: 'cedi', estados: ['Cedi'], zonas: ['cedi'] }
]
const TODOS_ESTADOS = TRAMOS.flatMap(t => t.estados)
// regreso = estado que toma una pieza de otro tramo al soltarla en Pintura, Zona Curado, Vaciado o Desmolde,
// sea hacia adelante (p. ej. Pintura → Curado de abajo = Vaciado) o devolviéndola desde un proceso posterior
const ESTADO_REGRESO: Record<string, string> = { pintura: 'Pintura', vaciado: 'Vaciado', herrajes: 'Herrajes' }
const indiceTramo = (estado: string) => TRAMOS.findIndex(t => t.estados.includes(estado))
const cambiaEstadoEn = (z: Zona, estado: string) => {
    if (!z.regreso) return false
    const desde = indiceTramo(estado), hacia = indiceTramo(ESTADO_REGRESO[z.regreso])
    return hacia >= 0 && desde >= 0 && desde !== hacia
}
// ¿Es devolución (viene de un proceso posterior)?
const esRegreso = (z: Zona, estado: string) => cambiaEstadoEn(z, estado) && indiceTramo(estado) > indiceTramo(ESTADO_REGRESO[z.regreso!])
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
    herrajes: [...enFila('instherrajes', 5), ...enFila('curadov', 8).reverse()],
    pulido: [...porColumnas('pulido', 3, 2), ...porColumnas('desmolde', 2, 2)],
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
    // Tamaño real del plano en pantalla: el plano se estira distinto a lo ancho y a lo alto, así que las OF de
    // Programado toman el tamaño en px de una mesa (mismo recuadro que en los demás procesos)
    const [plano, setPlano] = useState<{ w: number; h: number } | null>(null)
    const observador = useRef<ResizeObserver | null>(null)
    // ref de callback: el plano aparece después de cargar las órdenes
    const planoRef = useCallback((el: HTMLDivElement | null) => {
        observador.current?.disconnect()
        observador.current = null
        if (!el) return
        const medir = () => setPlano(prev => (prev && prev.w === el.clientWidth && prev.h === el.clientHeight) ? prev : { w: el.clientWidth, h: el.clientHeight })
        medir()
        observador.current = new ResizeObserver(medir)
        observador.current.observe(el)
    }, [])
    // OF de Programado soltada en el mapa: falta escoger el molde para registrarla
    const [registroNuevo, setRegistroNuevo] = useState<{ pieza: PiezaMesa; destino: DestinoMovimientoFv; mesa: string | null; lugar: string } | null>(null)
    const [moldeElegido, setMoldeElegido] = useState<number | null>(null)
    const [importar, setImportar] = useState(false)
    const [historial, setHistorial] = useState(false)

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
    // Moldes de la referencia: libres (Disponible y sin pieza en Pintura/Vaciado) y ocupados (se pueden liberar)
    const moldesRef = useMemo(() => ordenNueva && moldes ? moldesDeOrden(ordenNueva, moldes) : [], [ordenNueva, moldes])
    const [ocupacion, setOcupacion] = useState<Map<number, OcupacionMolde & { registrer: string }> | null>(null)
    const [errorOcupacion, setErrorOcupacion] = useState<string | null>(null)
    useEffect(() => {
        if (!registroNuevo || moldes == null) { setOcupacion(null); return }
        let vigente = true
        setErrorOcupacion(null)
        ocupacionMoldesFv(moldesRef.map(m => m.id))
            .then(o => { if (vigente) setOcupacion(o) })
            .catch(e => { if (vigente) { setOcupacion(new Map()); setErrorOcupacion(e instanceof Error ? e.message : String(e)) } })
        return () => { vigente = false }
    }, [registroNuevo, moldes, moldesRef])
    const moldesNueva = ocupacion ? moldesRef.filter(m => m.estado === 'Disponible' && !ocupacion.has(m.id)).sort((a, b) => a.vueltas_actuales - b.vueltas_actuales) : []
    const moldesOcupados = ocupacion ? moldesRef.filter(m => m.estado === 'En uso' || ocupacion.has(m.id)) : []
    const [liberandoMolde, setLiberandoMolde] = useState<number | null>(null)
    const liberarParaPintar = async (m: Molde) => {
        const o = ocupacion?.get(m.id)
        const texto = o
            ? `¿Liberar el molde ${m.serial}?\n\nLo ocupa la pieza de la OF ${o.of} en ${o.lugar} (${o.estado}). Esa pieza pasará a PULIDO (se asume que ya se desmoldó) y quedará en el historial.\n\nEl molde quedará Disponible para pintar la OF ${registroNuevo?.pieza.of}.`
            : `¿Liberar el molde ${m.serial}?\n\nEstá En uso pero ninguna pieza lo ocupa. Quedará Disponible y el cambio quedará en el historial.`
        if (!confirm(texto)) return
        setLiberandoMolde(m.id)
        try {
            await liberarMoldeFv(m.id, await usuarioActual(), 'mapa')
            toast.success(`Molde ${m.serial} liberado`)
            setMoldes(await getAllMoldes())
            setMoldeElegido(m.id)
            cargar()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e), { duration: 10000 })
        } finally {
            setLiberandoMolde(null)
        }
    }

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
    // OF soltada desde Programado: pide el molde; un kit de reparación no usa molde y se registra de una vez
    const abrirRegistroNuevo = (r: { pieza: PiezaMesa; destino: DestinoMovimientoFv; mesa: string | null; lugar: string }) => {
        if (esKitReparacion(r.pieza.descripcion)) {
            if (!confirm(`¿Registrar 1 kit de reparación de la OF ${r.pieza.of} en ${r.lugar}?\n\nNo usa molde. Quedará en el historial con su usuario y la hora.`)) return
            ejecutar(async () => {
                await registrarKitReparacionFv(r.pieza.ordenId, r.destino, await usuarioActual(), r.mesa)
                toast.success(`OF ${r.pieza.of}: kit registrado en ${r.lugar}`)
            })
            return
        }
        setMoldeElegido(null)
        setRegistroNuevo(r)
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
            if (m && t.zonas.includes(m.zona.id) && !enMesa[m.id]) enMesa[m.id] = info
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
    // Tránsito → CEDI (y cualquier entrada a CEDI) solo se registra desde el módulo CEDI, nunca arrastrando en el mapa
    const SOLO_POR_MODULO = new Set(['cedi'])
    const puedeEnMesa = (m: Mesa) => {
        if (!arrastre) return false
        if (SOLO_POR_MODULO.has(m.zona.proceso) && tramoDeEstado(arrastre.estado)?.id !== 'cedi') return false
        // En las zonas automáticas (Curado, Digitado, Tránsito…) también se puede fijar la casilla exacta: solo bloquea
        // una pieza que la tenga fijada; las que llenan en orden se corren a la siguiente casilla libre
        const ocupante = mesas.enMesa[m.id]
        if ((ocupante && (!m.zona.auto || ocupante.mesa === m.id)) || arrastre.mesa === m.id) return false
        if (arrastre.nueva) return !!(m.zona.crear || m.zona.destino)
        const t = tramoDeEstado(arrastre.estado)
        return (!!t && t.zonas.includes(m.zona.id)) || !!m.zona.destino || cambiaEstadoEn(m.zona, arrastre.estado)
    }
    const puedeEnProceso = (p: Proceso) => {
        if (SOLO_POR_MODULO.has(p.id)) return false
        if (arrastre?.nueva) return !!(p.crear || p.destino)
        if (arrastre && p.id === 'programado') return true
        if (!arrastre || !p.destino) return false
        return !tramoDeEstado(arrastre.estado)?.zonas.some(z => ZONAS.find(x => x.id === z)?.proceso === p.id)
    }

    // Soltar en una mesa: dentro del mismo tramo solo cambia la mesa; en otro tramo cambia el estado (trazabilidad)
    const soltarEnMesa = (m: Mesa) => {
        const pieza = arrastre
        terminarArrastre()
        if (!pieza || !puedeEnMesa(m)) return
        const mesaId = m.id
        if (pieza.nueva) {
            setMoldeElegido(null)
            abrirRegistroNuevo({ pieza, destino: m.zona.crear ?? m.zona.destino!, mesa: mesaId, lugar: m.zona.label })
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
        const regreso = !m.zona.destino && esRegreso(m.zona, pieza.estado)
        const destino = m.zona.destino ?? m.zona.regreso!
        if (!confirm(regreso
            ? `¿Devolver 1 pieza de la OF ${pieza.of} (${pieza.nombre}) de ${pieza.estado} a ${m.zona.label.split(' · ')[0]} (estado ${ESTADO_REGRESO[destino]})?\n\n` +
              `La pieza vuelve a ocupar su molde (queda En uso). Si otra pieza ya ocupa ese molde, no se podrá devolver. Quedará registrado en la trazabilidad y en el historial.`
            : `¿Pasar 1 pieza de la OF ${pieza.of} (${pieza.nombre}) a ${m.zona.label}?\n\nCambia de proceso y quedará registrado en la trazabilidad con su usuario y la hora.`)) return
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
            abrirRegistroNuevo({ pieza, destino: p.crear ?? p.destino!, mesa: null, lugar: p.label })
            return
        }
        if (p.id === 'programado') {
            if (!confirm(`⚠ ADVERTENCIA: ¿Devolver 1 pieza de la OF ${pieza.of} (${pieza.nombre}) a Programado (pendiente por pintar)?\n\n` +
                `Se borra el registro de la pieza (${pieza.estado}): SE PIERDE LA TRAZABILIDAD DEL MOLDE con que se pintó y todo su historial de procesos. No se puede deshacer.\n\n` +
                `Si la pieza aún ocupa el molde, el molde queda Disponible.`)) return
            ejecutar(async () => {
                await devolverPiezaAProgramadoFv(pieza.registrer, await usuarioActual())
                toast.success(`OF ${pieza.of}: 1 pieza devuelta a Programado`)
            })
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

    // Nombre cortado en letras completas (sin "…" ni media letra): cada letra es un elemento de un renglón
    // que envuelve; la que no cabe entera baja al segundo renglón, que queda oculto.
    const nombreCortado = (texto: string, clase: string) => (
        <span className={`flex flex-wrap overflow-hidden h-[1.25em] leading-[1.25em] ${clase}`}>
            {Array.from(texto).map((c, i) => <span key={i} className="shrink-0">{c === ' ' ? ' ' : c}</span>)}
        </span>
    )

    // Pieza: clic abre el detalle; clic sostenido y arrastrar la lleva a una mesa o a otro proceso
    // Atrasada a cliente: su Fecha Entrega Lote (T del Semáforo) ya pasó. Se resalta todo el recuadro en rojo
    // FIRPLAK opaco, en cualquier proceso; el verde de la búsqueda tiene prioridad.
    const fechasSem = useFechasSemaforoFv()
    const hoyT = new Date().toLocaleDateString('en-CA')
    const fechaT = (of: string) => fechasSem?.mapa.get(of.trim())?.lote?.slice(0, 10) || null
    const atrasadaT = (of: string) => { const t = fechaT(of); return !!t && t < hoyT }
    const ROJO_ATRASO = 'bg-[#d14747]/85 text-white ring-1 ring-[#a93a3a] hover:bg-[#d14747]'
    const chipPieza = (x: PiezaMesa, estiloBase: string, enMesa: boolean) => {
        const estilo = atrasadaT(x.of) ? ROJO_ATRASO : estiloBase
        return (
        <button key={x.registrer} onClick={() => setDetalleOf(x.of)}
            draggable={!moviendo}
            onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.registrer); setArrastre(x); setListaAbierta(null) }}
            onDragEnd={terminarArrastre}
            title={`OF ${x.of} · ${x.descripcion || 'sin descripción'} · pieza ${x.registrer} (${x.estado}) · Entrega Lote (T) ${fechaT(x.of)?.split('-').reverse().join('/') || 'sin fecha'}${atrasadaT(x.of) ? ' (ATRASADA A CLIENTE)' : ''} · clic para ver el detalle · clic sostenido y arrastrar a una mesa o a otro proceso`}
            className={`${enMesa ? 'w-full h-full flex flex-col items-center justify-center text-center px-0.5 overflow-hidden' : 'max-w-full flex items-baseline gap-0.5 text-[9px] px-1 leading-[14px] whitespace-nowrap'} font-bold rounded cursor-grab active:cursor-grabbing ${arrastre?.registrer === x.registrer ? 'opacity-40' : ''} ${coincide(x) ? 'bg-[#59a96a] text-white ring-2 ring-[#3b8f50]' : estilo}`}>
            {enMesa ? (
                <>
                    {x.nombre && nombreCortado(x.nombre, 'w-full justify-center text-[10px]')}
                    <span className="block font-mono text-lg font-black leading-none">{x.of.slice(-4)}</span>
                </>
            ) : (
                <>
                    {x.nombre && nombreCortado(x.nombre, 'min-w-0')}
                    <span className="font-mono shrink-0">{x.of.slice(-4)}</span>
                </>
            )}
        </button>
        )
    }

    const mesa = (m: Mesa) => {
        const ocupada = mesas.enMesa[m.id]
        const tipo = PROCESO[m.zona.proceso].tipo
        const claro = tipo !== 'sin-notificacion'
        const valido = puedeEnMesa(m)
        const zona = 'mesa:' + m.id
        return (
            <div key={m.id} style={pos(m.caja)} title={ocupada ? undefined : m.zona.auto ? `${m.zona.label} · se llena en orden (o suelte la pieza aquí para dejarla en esta casilla)` : `${m.zona.label} · mesa libre`}
                {...zonaDrop(zona, valido, () => soltarEnMesa(m))}
                className={`absolute z-[5] rounded border border-dashed p-0.5 flex items-stretch ${claro ? 'border-[#25323f]/30 bg-white/30' : 'border-white/40 bg-white/10'} ${valido ? (sobre === zona ? 'ring-2 ring-[#59a96a] bg-[#59a96a]/30' : 'ring-1 ring-[#59a96a]/70') : ''}`}>
                {ocupada && chipPieza(ocupada, ESTILO[tipo].chip, true)}
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
                    className={`flex items-center gap-0.5 text-[9px] font-black px-1 rounded leading-4 ${sobrecupo ? 'bg-[#d14747] text-white' : 'bg-[#deb841] text-[#25323f]'} ${sobre === 'sin:' + t.id ? 'ring-2 ring-[#59a96a]' : ''}`}>
                    {lista.length} sin mesa <ChevronDown className="w-3 h-3" />
                </button>
                {listaAbierta === t.id && lista.length > 0 && (
                    <div className="absolute left-0 top-full mt-0.5 z-30 w-44 max-h-48 overflow-y-auto bg-white border border-[#deb841] rounded-lg shadow-xl p-1 space-y-0.5">
                        <div className="text-[9px] font-black uppercase text-[#324354] px-0.5">{sobrecupo ? `Sobran ${mesas.total[t.id] - capacidad} pieza(s)` : 'Arrástrelas a su mesa'}</div>
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
        if (p.tituloIzq) return (
            <div key={'nombre-' + p.id} style={pos([x1 - 170, p.id === 'desmoldez' ? y1 + 76 : y1, x1 - 8, p.caja[3]])}
                className={`absolute flex flex-col items-end justify-center gap-0.5 text-right pointer-events-none [&_button]:pointer-events-auto [&>div]:pointer-events-auto ${listaAbierta && tramo?.id === listaAbierta ? 'z-30' : 'z-[6]'}`}>
                <span className="text-[12px] font-black text-[#25323f] leading-tight whitespace-pre-line">{p.label}</span>
                {/* Instalación Herrajes (punto de notificación): contador y lista de las que no caben en las casillas */}
                {tramo && (
                    <div className="flex items-center justify-end gap-1">
                        {avisoSinMesa(tramo, ESTILO[p.tipo].chip)}
                        {contadorProceso(p)}
                    </div>
                )}
            </div>
        )
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
                ) : DOS_RENGLONES.has(p.id) ? (
                    // Huacales, Acabado 2, Ensayo y Pulido: en 2 renglones como Ensamble 2 / Ensamble 1
                    // (nombre arriba; abajo el número o el contador)
                    <div className="flex flex-col items-center w-full">
                        <span className="text-[11px] font-black text-[#25323f] leading-tight text-center whitespace-pre-line">{p.label.replace(/ (\d+)$/, '\n$1')}</span>
                        <div className="flex items-center justify-center gap-1">
                            {tramo && avisoSinMesa(tramo, ESTILO[p.tipo].chip)}
                            {contadorProceso(p)}
                        </div>
                    </div>
                ) : (
                    <span className="text-[12px] font-black text-[#25323f] leading-tight min-w-0">{p.label}</span>
                )}
                {!DOS_RENGLONES.has(p.id) && tramo && avisoSinMesa(tramo, ESTILO[p.tipo].chip)}
                {!DOS_RENGLONES.has(p.id) && contadorProceso(p)}
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
                        {/* OF como recuadros grandes, igual que las piezas en las mesas (2 por fila, misma altura y letra que una mesa): se pueden tomar
                            con el dedo en tablet y celular. Se desplaza hacia abajo cuando hay muchas */}
                        <div className="mt-0.5 grid content-start justify-center overflow-y-auto overflow-x-hidden min-h-0 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={plano ? {
                                // Recuadro = pieza dentro de una mesa (mesa menos su borde punteado y relleno, 6 px)
                                gridTemplateColumns: `repeat(2, ${Math.max(40, (MESA_ANCHO / ANCHO) * plano.w - 6)}px)`,
                                gridAutoRows: `${Math.max(34, (MESA_ALTO / ALTO) * plano.h - 6)}px`,
                                columnGap: `${(GAP / ANCHO) * plano.w + 6}px`,
                                rowGap: `${(GAP / ALTO) * plano.h + 6}px`,
                            } : { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
                            {lista.map(x => (
                                <button key={x.of} onClick={() => setDetalleOf(x.of)}
                                    draggable={!moviendo}
                                    onDragStart={e => {
                                        e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.of); setListaAbierta(null)
                                        setArrastre({ registrer: 'nueva:' + x.of, of: x.of, ordenId: x.ordenId, estado: '', mesa: null, nombre: x.nombre, descripcion: x.descripcion, nueva: true })
                                    }}
                                    onDragEnd={terminarArrastre}
                                    title={`OF ${x.of} · ${x.descripcion || 'sin descripción'} · ${x.piezas} pieza(s) pendientes · Entrega Lote (T) ${fechaT(x.of)?.split('-').reverse().join('/') || 'sin fecha'}${atrasadaT(x.of) ? ' (ATRASADA A CLIENTE)' : ''} · clic para ver el detalle · arrastrar a una mesa o proceso para registrar 1 pieza (se pide el molde)`}
                                    className={`relative w-full h-full min-w-0 flex flex-col items-center justify-center text-center px-0.5 overflow-hidden font-bold rounded cursor-grab active:cursor-grabbing ${arrastre?.registrer === 'nueva:' + x.of ? 'opacity-40' : ''} ${coincide(x) ? 'bg-[#59a96a] text-white ring-2 ring-[#3b8f50]' : atrasadaT(x.of) ? ROJO_ATRASO : estilo.chip}`}>
                                    {x.nombre && nombreCortado(x.nombre, 'w-full justify-center text-[10px]')}
                                    <span className="block font-mono text-lg font-black leading-none">{x.of.slice(-4)}</span>
                                    {/* Piezas pendientes de la OF (si son varias): en la esquina inferior, sin tapar el nombre */}
                                    {x.piezas > 1 && <span className="absolute bottom-0.5 right-0.5 text-[8px] font-black leading-none px-0.5 rounded bg-[#25323f] text-white">×{x.piezas}</span>}
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
                    <div className="flex items-center gap-1.5">
                    <button onClick={descargarArqueo} disabled={descargandoArqueo}
                        title="Excel con la hoja FV de Prioridades (Semáforo de SAP) y el proceso actual de cada unidad de cada OF"
                        className="h-7 px-3 flex items-center gap-1.5 rounded-lg bg-[#324354] text-white text-[11px] font-bold hover:bg-[#254153] disabled:opacity-50 whitespace-nowrap">
                        {descargandoArqueo ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Descargar arqueo
                    </button>
                    <button onClick={() => setImportar(true)} disabled={cargando}
                        title="Pegar las filas del Excel (Nro OP … PROCESO) y ubicar cada pieza en su proceso"
                        className="h-7 px-3 flex items-center gap-1.5 rounded-lg border border-[#324354] text-[#324354] bg-white text-[11px] font-bold hover:bg-[#F6F3EE] disabled:opacity-50 whitespace-nowrap">
                        <ClipboardPaste size={14} /> Ubicar desde Excel
                    </button>
                    <button onClick={() => setHistorial(true)}
                        title="Quién movió qué pieza, cuándo y de dónde a dónde (mapa, Excel, Moldes y Administración)"
                        className="h-7 px-3 flex items-center gap-1.5 rounded-lg border border-[#324354] text-[#324354] bg-white text-[11px] font-bold hover:bg-[#F6F3EE] whitespace-nowrap">
                        <History size={14} /> Historial
                    </button>
                    </div>
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
                        <div ref={planoRef} className="relative w-full h-[max(520px,calc(100vh-8rem))]">
                            {PROCESOS.map(caja)}
                            {PROCESOS.map(etiqueta)}

                            {/* Leyenda: 2 renglones (3 + 2) dentro del hueco entre Reparación y Soldadura, sin montarse en los recuadros */}
                            <div className="absolute grid grid-cols-[auto_auto_auto] content-end justify-center gap-x-4 gap-y-0.5 text-[9px] leading-tight font-semibold text-slate-600 overflow-hidden" style={pos([540, 672, 1240, 716])}>
                                {(Object.keys(ESTILO) as TipoProceso[]).map(t => (
                                    <span key={t} className="flex items-center gap-1 whitespace-nowrap">
                                        <span className={`w-2.5 h-2.5 rounded-sm border shrink-0 ${ESTILO[t].caja}`} /> {ESTILO[t].label}
                                    </span>
                                ))}
                                <span className="flex items-center gap-1 whitespace-nowrap" title="La Fecha Entrega Lote (columna T del Semáforo) ya pasó">
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-[#d14747]/85 ring-1 ring-[#a93a3a]" /> Atrasada a cliente (T vencida)
                                </span>
                            </div>


                            {MESAS.map(mesa)}

                            {/* Vaciado → Desmolde: baja desde Vaciado y entra por la izquierda de Desmolde */}
                            <div className="absolute w-[3px] bg-[#00b050] -translate-x-1/2" style={{ ...punto(900, 166), height: `${((240 - 166) / ALTO) * 100}%` }} />
                            <div className="absolute h-[3px] bg-[#00b050] -translate-y-1/2" style={{ ...punto(899, 239), width: `${((1062 - 899) / ANCHO) * 100}%` }} />
                            {/* Instalación Herrajes → Desmolde · Herrajes · Nivelación (centrada sobre Desmolde) */}
                            <div className="absolute w-[3px] bg-[#00b050] -translate-x-1/2" style={{ ...punto(1357, 396), height: `${((420 - 396) / ALTO) * 100}%` }} />

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
                        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                            <div className="text-[10px] font-black uppercase text-slate-500">Moldes disponibles</div>
                            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                                {moldes == null || ocupacion == null ? (
                                    <div className="p-4 text-center text-sm text-slate-500 font-bold">Cargando moldes...</div>
                                ) : moldesNueva.length === 0 ? (
                                    <div className="p-3 bg-red-50 text-red-800 text-sm font-bold flex items-start gap-2 rounded-xl" role="alert">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                                        {moldesOcupados.length > 0 ? 'No hay moldes libres para esta orden. Libere uno de los ocupados de abajo.' : 'Esta referencia no tiene moldes libres ni ocupados (revise los moldes en reparación en el módulo Moldes).'}
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
                            {errorOcupacion && (
                                <div className="p-2 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-lg" role="alert">{errorOcupacion}</div>
                            )}
                            {moldesOcupados.length > 0 && (
                                <>
                                    <div className="text-[10px] font-black uppercase text-slate-500 mt-1">Moldes ocupados · liberar para pintar</div>
                                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                                        {moldesOcupados.map(m => {
                                            const o = ocupacion?.get(m.id)
                                            return (
                                                <div key={m.id} className="flex items-center gap-2 px-3 py-2">
                                                    <span className="font-mono font-black text-[#324354] text-sm">{m.serial}</span>
                                                    <span className={`text-xs flex-1 min-w-0 ${o ? 'text-blue-800 font-semibold' : 'text-red-700 font-bold'}`}>
                                                        {o ? `OF ${o.of} · ${o.lugar}` : 'En uso sin pieza'}
                                                    </span>
                                                    <button onClick={() => liberarParaPintar(m)} disabled={liberandoMolde != null || moviendo}
                                                        className="shrink-0 h-6 px-2 flex items-center gap-1 rounded-md bg-red-600 text-white text-[10px] font-black hover:bg-red-700 disabled:opacity-40">
                                                        {liberandoMolde === m.id ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />} Liberar
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#e2ded5]">
                            <button onClick={() => setRegistroNuevo(null)} className="px-3 py-1.5 rounded-lg font-bold text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50">Cancelar</button>
                            <button onClick={confirmarRegistroNuevo} disabled={moldeElegido == null || moviendo}
                                className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#324354] text-white hover:bg-[#254153] disabled:opacity-50">Registrar</button>
                        </div>
                    </div>
                </div>
            )}

            {historial && <HistorialMovimientosFv onCerrar={() => setHistorial(false)} ofInicial={busqueda.trim()} />}

            {importar && (
                <ImportarPosicionesFv ordenes={ordenes} piezas={piezasMapa} mesasZona={MESAS_ZONA} usuarioActual={usuarioActual}
                    onCerrar={() => setImportar(false)} onListo={cargar} />
            )}

            {detalleOf != null && (
                <DetalleOrdenSapModal ordenFabricacion={detalleOf} onClose={() => setDetalleOf(null)}
                    // Trazabilidad: procesos por pieza de la orden (como en Administración, solo consulta)
                    piso={{ label: 'Trazabilidad', contenido: <OrderProcessesPanel orden={ordenDetalle ?? ({ orden_fabricacion: detalleOf } as any)} registros={[]} /> }} />
            )}
        </div>
    )
}
