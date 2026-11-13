import { parseDBDate } from '@/lib/utils/date';
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { Box, Clipboard, Users, AlertTriangle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { OrderProcessesPanel } from '@/components/fibra/administracion/AdministracionFibraModule'
import { useFechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'

// Copia el número de la OF al portapapeles (con respaldo para navegadores sin permiso de portapapeles)
const copiarOf = async (of: unknown) => {
    const texto = String(of ?? '').trim()
    if (!texto) return
    try {
        await navigator.clipboard.writeText(texto)
    } catch {
        const ta = document.createElement('textarea')
        ta.value = texto
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
    }
    toast.success(`Orden ${texto} copiada`)
}

// 'YYYY-MM-DD' → dd/mm/aaaa
const fechaCorta = (iso: string | null) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—'

interface OrdenCardProps {
    orden: OrdenFabricacion
    isActive: boolean
    onClick: () => void
    moldes: Molde[]
    planta?: 'fv'   // FV: recuadros en el orden del encabezado de piso FV (Ensayo y Huacales en lugar de Acabado/Empaque/Estantería)
    conDetalle?: boolean   // FV: botón de detalle SAP junto a "Moldes" (se apaga donde la pantalla ya tiene su propio botón)
}

// Helper to render a small metric box within the card
// FV: el proceso con piezas se resalta en amarillo Firplak; en cero queda suave
const MiniMetric = ({ label, value, color, fv }: { label: string, value: number, color?: string, fv?: boolean }) => (
    <div className={`flex flex-col items-center justify-center p-1 border rounded min-w-0 overflow-hidden ${color || (fv ? (value > 0 ? 'bg-[#deb841]/20 border-[#deb841]' : 'bg-white border-[#e2ded5]') : 'border-gray-200')}`}>
        {/* Nombres largos (Programado, Destrucción, Reparación…) un punto más pequeños para que quepan en el recuadro */}
        <span className={`font-bold uppercase text-center leading-tight max-w-full ${fv ? 'text-[#7B8E90]' : 'text-gray-900'} ${fv ? (label.length > 8 ? 'text-[8px] tracking-tight' : 'text-[9px]') : label.length > 9 ? 'text-[9px] tracking-tighter' : 'text-[10px]'}`}>{label}</span>
        <span className={`text-sm ${fv ? (value > 0 || color ? 'text-[#324354] font-black' : 'text-[#7B8E90]/60 font-bold') : 'text-gray-900 font-bold'}`}>{value}</span>
    </div>
)

export default function OrdenCard({ orden, isActive, onClick, moldes, planta, conDetalle = true }: OrdenCardProps) {
    const [verDetalle, setVerDetalle] = useState(false)
    // FV: las 4 fechas del Semáforo guardadas al cargar las órdenes
    const semaforo = useFechasSemaforoFv(planta === 'fv')
    const fechasSem = semaforo?.mapa.get(String(orden.orden_fabricacion ?? '').trim())
    const clientePremium = /sodimac/i.test(String(orden.cliente || orden.cliente_nombre || ''))
    const hoyIso = new Date().toLocaleDateString('en-CA')
    const sku = (orden.molde_sku || orden.producto_sku || orden.sku || '').trim().toLowerCase()
    const codeMatch = sku.match(/PMOL\d*-(\d+)/i) || (orden.molde_sku ? orden.molde_sku.match(/PMOL\d*-(\d+)/i) : null)
    const targetCode = codeMatch ? codeMatch[1].replace(/^0+/, '') : ''
    const targetDesc = (orden.molde_descripcion || orden.producto_descripcion || '').trim().toLowerCase()

    const relevantMoldes = moldes.filter(m => {
        const mSku = (m.molde_sku || (m as any).tipo_molde_sku || '').trim().toLowerCase()
        const mSerial = (m.serial || '').trim().toLowerCase()
        const mDesc = (m.molde_descripcion || (m as any).nombre_articulo || '').trim().toLowerCase()

        if (sku && (mSku === sku || mSerial === sku)) return true
        if (targetCode && mSerial.split('-')[0].replace(/^0+/, '') === targetCode) return true
        if (targetDesc && mDesc) {
            const mKeywords = mDesc.replace(/molde|nuevo/gi, '').split(/\s+/).filter((w: string) => w.length > 2)
            if (mKeywords.length > 0 && mKeywords.every((kw: string) => targetDesc.includes(kw))) return true
        }
        return false
    })
    const disponibles = relevantMoldes.filter(m => m.estado === 'Disponible').length
    const enUso = relevantMoldes.filter(m => m.estado === 'En uso').length
    const enReparacion = relevantMoldes.filter(m => !['Disponible', 'En uso'].includes(m.estado)).length

    const cantidadTotal = Math.max(0, orden.cantidad || orden.cantidad_programada || 0)

    // Sum of all stage counts
    const sumEtapas = (orden.pintura || 0) +
        (orden.pulido || 0) +
        (orden.reparacion || 0) +
        (orden.saldo || 0) +
        (orden.empaque || 0) +
        (orden.transito || 0) +
        (orden.vaciado || 0) +
        (orden.estanteria || 0) +
        (orden.acabado || 0) +
        (orden.reparacion_larga || 0) +
        (orden.digitado || 0) +
        (orden.cedi || 0)

    const isExcedido = cantidadTotal > 0 && sumEtapas > cantidadTotal
    const programadoCalculado = Math.max(0, cantidadTotal - sumEtapas)

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 lg:flex lg:flex-row lg:gap-0 relative ${isExcedido
                ? (planta === 'fv' ? 'bg-[#d14747]/5 border-[#d14747] ring-4 ring-[#d14747]/20 shadow-md' : 'bg-red-50/30 border-red-500 ring-4 ring-red-500/20 shadow-md')
                : isActive
                ? (planta === 'fv' ? 'bg-[#324354]/[0.06] border-[#324354] ring-4 ring-[#324354]/15 shadow-md' : 'bg-cyan-100 border-cyan-500 ring-4 ring-cyan-500/20 shadow-md')
                : (planta === 'fv' ? 'bg-white border-[#e2ded5] hover:bg-[#F6F3EE]/60' : 'bg-white border-gray-300 hover:bg-gray-50')
                }`}
        >
            {isExcedido && (
                <div className="absolute -top-2.5 right-4 bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 z-10">
                    <AlertTriangle size={12} />
                    ¡Alerta: Suma en etapas ({sumEtapas}) excede cantidad ({cantidadTotal})!
                </div>
            )}
            {/* Left Section: Basic Info */}
            <div className={`w-full ${planta === 'fv' ? 'lg:w-[42%]' : 'lg:w-[28%]'} lg:pr-2 lg:border-r ${planta === 'fv' ? 'border-[#e2ded5]' : 'border-gray-300'} flex flex-col justify-between min-w-0`}>
                <div className="min-w-0">
                    {/* FV: la descripción del producto y el SKU van arriba y resaltados */}
                    {planta === 'fv' ? (
                        // FV: 2 renglones en paralelo, a la izquierda OF y Pedido, a la derecha la descripción (resaltada) y el SKU
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 items-start">
                            <div className="min-w-0">
                                {/* Un clic copia el número de la OF (como en Control de Piso MS); la tarjeta también se selecciona */}
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => copiarOf(orden.orden_fabricacion)}
                                    onKeyDown={e => { if (e.key === 'Enter') copiarOf(orden.orden_fabricacion) }}
                                    className="flex items-center gap-1 text-[#324354] cursor-copy rounded px-0.5 -mx-0.5 hover:bg-[#deb841]/25 transition-colors"
                                    title="Clic para copiar el número de la orden"
                                >
                                    <Clipboard size={16} className="shrink-0" />
                                    <span className="text-base font-black text-[#324354] whitespace-nowrap">OF: {orden.orden_fabricacion}</span>
                                </span>
                                {/* Solo la orden de venta: sin la línea/lote (lo que va desde el primer guion) */}
                                <div className="text-xs font-bold text-[#7B8E90] whitespace-nowrap mt-0.5">Pedido: {String(orden.pedido || (orden as any).numero_pedido || '').split('-')[0].trim() || 'Sin pedido'}</div>
                            </div>
                            <div className="min-w-0 pl-3 border-l border-[#e2ded5]">
                                {/* Descripción completa (sin cortar): si es larga, baja a otro renglón */}
                                <div className="text-base font-black text-[#324354] leading-tight uppercase break-words"
                                    title={orden.producto_descripcion || orden.molde_descripcion || orden.producto_sku || 'Sin descripción'}>
                                    {orden.producto_descripcion || orden.molde_descripcion || orden.producto_sku || 'Sin descripción'}
                                </div>
                                {/* SKU del producto de la OF (no el del molde) */}
                                <div className="text-[10px] font-semibold text-[#7B8E90] mt-0.5 truncate">SKU: {orden.producto_sku?.trim() || orden.sku?.trim() || 'No definido'}</div>
                            </div>
                            {/* Detalle de la orden en SAP, al lado de la descripción */}
                            {conDetalle ? (
                                // La tarjeta ya es un botón: el detalle va como span con rol de botón para no anidar botones
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={e => { e.stopPropagation(); setVerDetalle(true) }}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setVerDetalle(true) } }}
                                    className="self-center p-1 text-[#7B8E90] hover:text-[#324354] transition-colors cursor-pointer"
                                    title="Detalle de la orden en SAP (lista de materiales, comentarios)"
                                >
                                    <FileText size={16} />
                                </span>
                            ) : <span />}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-1 text-cyan-600 mb-1">
                                <Clipboard size={14} className="shrink-0" />
                                <span className="text-xs font-bold text-gray-900 truncate">OF: {orden.orden_fabricacion}</span>
                            </div>
                            <div className="text-[11px] font-bold text-cyan-600 truncate">Pedido: {orden.pedido || (orden as any).numero_pedido || 'Sin pedido'}</div>
                        </>
                    )}
                    {/* En FV se usan las fechas del Semáforo (O, T, W, AF): sin Ideal Producción ni Entrega Estimada */}
                    {planta !== 'fv' && <div className="flex flex-wrap gap-1 mt-1">
                        {orden.fecha_ideal_produccion ? (
                            <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded inline-block">
                                📅 Ideal Producción: {parseDBDate(orden.fecha_ideal_produccion).toLocaleDateString('es-ES')}
                            </div>
                        ) : orden.fecha_entrega_estimada ? (
                            <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded inline-block">
                                📅 Ideal Producción: {parseDBDate(orden.fecha_entrega_estimada).toLocaleDateString('es-ES')}
                            </div>
                        ) : null}
                        {orden.fecha_entrega_estimada && orden.fecha_ideal_produccion && orden.fecha_ideal_produccion.split('T')[0] !== orden.fecha_entrega_estimada.split('T')[0] && (
                            <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded inline-block">
                                📦 Entrega Estimada: {parseDBDate(orden.fecha_entrega_estimada).toLocaleDateString('es-ES')}
                            </div>
                        )}
                    </div>}
                    {planta === 'fv' && semaforo && (
                        // Fechas del Semáforo: T, Real Liberación, W (la que usa Prioridades para atrasos) y AF
                        semaforo.error ? (
                            <div className="mt-1 text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded">{semaforo.error}</div>
                        ) : !fechasSem || (!fechasSem.lote && !fechasSem.realLib && !fechasSem.idealW && !fechasSem.prometida) ? (
                            <div className="mt-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-300 px-1.5 py-0.5 rounded">
                                {fechasSem?.actualizadas ? 'Esta OF no está en el Semáforo' : 'Sin fechas del Semáforo: use "Cargar Órdenes"'}
                            </div>
                        ) : (
                            // 3 fechas del Semáforo en recuadros (O, T, W): nombre arriba y la fecha grande debajo. La Prometida (AF) no se muestra
                            <div className="mt-1.5 grid grid-cols-3 gap-2"
                                title={fechasSem.actualizadas ? `Fechas del Semáforo traídas el ${new Date(fechasSem.actualizadas).toLocaleString('es-CO')}` : undefined}>
                                {([
                                    // Nombres cortos en pantalla; la columna del Semáforo queda en el globo de ayuda (title)
                                    { nombre: 'Liberación', valor: fechasSem.realLib, tono: '#7B8E90', ayuda: 'Real Liberación · columna O del Semáforo' },
                                    // Solo la T (la que ordena todos los módulos) se marca en rojo cuando está atrasada
                                    { nombre: 'Prometida Cliente', valor: fechasSem.lote, tono: '#deb841', atrasada: !!fechasSem.lote && fechasSem.lote < hoyIso, ayuda: 'Fecha Entrega Lote · columna T del Semáforo (ordena todos los módulos; en rojo si ya pasó)' },
                                    { nombre: 'Nivel de Servicio', valor: fechasSem.idealW, tono: '#59a96a', ayuda: 'Fecha Ideal Entrega Producción [NS] · columna W del Semáforo' }
                                ] as { nombre: string; valor?: string | null; tono: string; atrasada?: boolean; ayuda?: string }[]).map(f => (
                                    <div key={f.nombre} title={f.ayuda}
                                        className="pl-2 border-l-[3px]" style={{ borderLeftColor: f.atrasada ? '#d14747' : f.tono }}>
                                        <div className={`text-[9px] leading-3 font-bold uppercase ${f.atrasada ? 'text-[#d14747]' : 'text-[#7B8E90]'}`}>{f.nombre}</div>
                                        <div className={`text-[13px] leading-[18px] font-black ${f.atrasada ? 'text-[#d14747]' : 'text-[#324354]'}`}>{fechaCorta(f.valor ?? null)}</div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                    {planta !== 'fv' && (() => {
                        const fullDesc = orden.producto_descripcion || orden.molde_descripcion || orden.producto_sku || 'Sin descripción'
                        return (
                            <div className="text-[11px] font-bold text-gray-800 mt-1 leading-snug break-words" title={fullDesc}>
                                {fullDesc}
                            </div>
                        )
                    })()}
                    {planta !== 'fv' && <div className="text-[9px] text-gray-400 italic mt-0.5 truncate">SKU: {sku || 'No definido'}</div>}
                </div>
                {planta === 'fv' ? (
                    // FV: el cliente es dato clave, va resaltado en una etiqueta navy; SODIMAC (cliente premium, con
                    // prioridad) va en rojo
                    <div className={`mt-2.5 self-start max-w-full flex items-center gap-1.5 text-white rounded-md px-2 py-0.5 leading-4 ${clientePremium ? 'bg-[#d14747]' : 'bg-[#324354]'}`}
                        title={`${orden.cliente || orden.cliente_nombre || 'No registrado'}${clientePremium ? ' · Cliente premium: tiene prioridad' : ''}`}>
                        <Users size={12} className={`shrink-0 ${clientePremium ? 'text-white' : 'text-[#deb841]'}`} />
                        <span className="text-[11px] font-black uppercase truncate">{orden.cliente || orden.cliente_nombre || 'Cliente no registrado'}</span>
                    </div>
                ) : (
                <div className="flex items-center gap-1 text-cyan-500 mt-2 lg:mt-auto">
                    <Users size={12} className="shrink-0" />
                    <span className="text-[11px] font-bold truncate">Cliente: {orden.cliente || orden.cliente_nombre || 'No registrado'}</span>
                </div>
                )}
            </div>

            {/* Moldes FV: compacto y con los colores Firplak (etiqueta gris, número navy); el detalle SAP junto al título */}
            {planta === 'fv' ? (
            <div className="w-full sm:w-auto sm:min-w-[150px] lg:min-w-0 lg:w-[11%] lg:px-2.5 lg:border-r border-[#e2ded5] flex flex-col justify-start bg-[#F6F3EE] lg:bg-transparent p-2 lg:p-0 rounded">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#324354]">Moldes</span>
                </div>
                <div className="text-[10px] font-semibold leading-[15px] text-[#7B8E90]">
                    {[
                        ['Totales', orden.moldes_totales || relevantMoldes.length],
                        ['Disponibles', orden.moldes_disponibles || disponibles],
                        ['En uso', orden.moldes_en_uso || enUso],
                        ['Reparación', orden.moldes_en_reparacion || enReparacion],
                        ['Fabricación', orden.moldes_en_fabricacion || 0]
                    ].map(([n, v]) => (
                        <div key={n as string} className="flex items-baseline justify-between gap-2 border-b border-[#e2ded5]/70 last:border-0">
                            <span>{n}</span><span className="font-black text-[#324354]">{v}</span>
                        </div>
                    ))}
                </div>
            </div>
            ) : (
            // Moldes MS (sin cambios)
            <div className="w-full sm:w-auto sm:min-w-[180px] lg:min-w-0 lg:w-[17%] justify-center lg:px-3 lg:border-r border-gray-300 flex flex-col bg-gray-50 lg:bg-transparent p-2 lg:p-0 rounded">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Moldes</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 lg:grid-cols-1 xl:grid-cols-2 gap-y-1 text-[10px] font-bold">
                    <div className="text-cyan-600">Totales: <span className="text-gray-900">{orden.moldes_totales || relevantMoldes.length}</span></div>
                    <div className="text-red-500">Reparación: <span className="text-gray-900">{orden.moldes_en_reparacion || enReparacion}</span></div>
                    <div className="text-green-600">Disponibles: <span className="text-gray-900">{orden.moldes_disponibles || disponibles}</span></div>
                    <div className="text-orange-600">Fabricación: <span className="text-gray-900">{orden.moldes_en_fabricacion || 0}</span></div>
                    <div className="text-yellow-600">En uso: <span className="text-gray-900">{orden.moldes_en_uso || enUso}</span></div>
                </div>
            </div>
            )}

            {/* Right Section: Process Grid */}
            {planta === 'fv' ? (
                // FV: mismo orden del encabezado. En la base, las piezas en Ensayo cuentan en `acabado` y las de
                // Guacales (por poner o ya en huacal) en `empaque`; la reparación larga suma en Reparación
                <div className="sm:col-span-2 flex-1 lg:pl-3 grid grid-cols-4 sm:grid-cols-7 gap-1">
                    <MiniMetric label="Cantidad" value={cantidadTotal} color={isExcedido ? "bg-[#d14747] border-[#d14747] [&>span]:!text-white" : "bg-[#324354] border-[#324354] [&>span]:!text-white"} fv />
                    <MiniMetric label="Programado" value={programadoCalculado} color="bg-[#7B8E90]/20 border-[#7B8E90]/60" fv />
                    <MiniMetric label="Pintura" value={Math.max(0, orden.pintura || 0)} fv />
                    <MiniMetric label="Vaciado" value={Math.max(0, orden.vaciado || 0)} fv />
                    <MiniMetric label="Herrajes" value={Math.max(0, orden.herrajes || 0)} fv />
                    <MiniMetric label="Pulido" value={Math.max(0, orden.pulido || 0)} fv />
                    <MiniMetric label="Ensayo" value={Math.max(0, orden.acabado || 0)} fv />

                    <MiniMetric label="Reparación" value={Math.max(0, orden.reparacion || 0) + Math.max(0, orden.reparacion_larga || 0)} fv />
                    <MiniMetric label="Huacales" value={Math.max(0, orden.empaque || 0)} fv />
                    <MiniMetric label="Saldo" value={Math.max(0, orden.saldo || 0)} fv />
                    <MiniMetric label="Destrucción" value={Math.max(0, orden.destruccion || 0)} fv />
                    <MiniMetric label="Digitado" value={Math.max(0, orden.digitado || 0)} fv />
                    <MiniMetric label="Tránsito" value={Math.max(0, orden.transito || 0)} fv />
                    <MiniMetric label="CEDI" value={Math.max(0, orden.cedi || 0)} color="bg-[#59a96a]/20 border-[#59a96a]/70" fv />
                </div>
            ) : (
            <div className="sm:col-span-2 flex-1 lg:pl-3 grid grid-cols-4 sm:grid-cols-8 gap-1">
                <MiniMetric label="Cantidad" value={cantidadTotal} color={isExcedido ? "bg-red-100 border-red-400 text-red-700" : "bg-cyan-50 border-cyan-200"} />
                <MiniMetric label="Pintura" value={Math.max(0, orden.pintura || 0)} />
                <MiniMetric label="Desgelcada" value={Math.max(0, orden.desgelcada || 0)} />
                <MiniMetric label="Pulido" value={Math.max(0, orden.pulido || 0)} />
                <MiniMetric label="Reparación" value={Math.max(0, orden.reparacion || 0)} />
                <MiniMetric label="Saldo" value={Math.max(0, orden.saldo || 0)} />
                <MiniMetric label="Empaque" value={Math.max(0, orden.empaque || 0)} />
                <MiniMetric label="Transito" value={Math.max(0, orden.transito || 0)} />

                <MiniMetric label="Programado" value={programadoCalculado} color="bg-orange-50 border-orange-200" />
                <MiniMetric label="Vaciado" value={Math.max(0, orden.vaciado || 0)} />
                <MiniMetric label="Estanteria" value={Math.max(0, orden.estanteria || 0)} />
                <MiniMetric label="Acabado" value={Math.max(0, orden.acabado || 0)} />
                <MiniMetric label="Rep. Larga" value={Math.max(0, orden.reparacion_larga || 0)} />
                <MiniMetric label="Destrucción" value={Math.max(0, orden.destruccion || 0)} />
                <MiniMetric label="Digitado" value={Math.max(0, orden.digitado || 0)} />
                <MiniMetric label="CEDI" value={Math.max(0, orden.cedi || 0)} color="bg-cyan-50 border-cyan-200" />
            </div>
            )}
            {/* El modal va fuera de la tarjeta (portal) y no propaga clics a ella */}
            {verDetalle && typeof document !== 'undefined' && createPortal(
                <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                    <DetalleOrdenSapModal ordenFabricacion={orden.orden_fabricacion} onClose={() => setVerDetalle(false)}
                        piso={planta === 'fv' ? { label: 'Trazabilidad', contenido: <OrderProcessesPanel orden={orden} registros={[]} /> } : undefined} />
                </div>,
                document.body
            )}
        </button>
    )
}
