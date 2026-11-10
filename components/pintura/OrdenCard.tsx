import { parseDBDate } from '@/lib/utils/date';
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { Box, Clipboard, Users, AlertTriangle, FileText } from 'lucide-react'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { useFechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'

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
const MiniMetric = ({ label, value, color }: { label: string, value: number, color?: string }) => (
    <div className={`flex flex-col items-center justify-center p-1 border rounded min-w-0 ${color || 'border-gray-200'}`}>
        {/* Nombres largos (Programado, Destrucción, Reparación…) un punto más pequeños para que quepan en el recuadro */}
        <span className={`font-bold text-gray-900 uppercase text-center leading-tight max-w-full ${label.length > 9 ? 'text-[9px] tracking-tighter' : 'text-[10px]'}`}>{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
)

export default function OrdenCard({ orden, isActive, onClick, moldes, planta, conDetalle = true }: OrdenCardProps) {
    const [verDetalle, setVerDetalle] = useState(false)
    // FV: las 4 fechas del Semáforo guardadas al cargar las órdenes
    const semaforo = useFechasSemaforoFv(planta === 'fv')
    const fechasSem = semaforo?.mapa.get(String(orden.orden_fabricacion ?? '').trim())
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
                ? 'bg-red-50/30 border-red-500 ring-4 ring-red-500/20 shadow-md'
                : isActive
                ? 'bg-cyan-100 border-cyan-500 ring-4 ring-cyan-500/20 shadow-md'
                : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
        >
            {isExcedido && (
                <div className="absolute -top-2.5 right-4 bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 z-10">
                    <AlertTriangle size={12} />
                    ¡Alerta: Suma en etapas ({sumEtapas}) excede cantidad ({cantidadTotal})!
                </div>
            )}
            {/* Left Section: Basic Info */}
            <div className="w-full lg:w-[28%] lg:pr-2 lg:border-r border-gray-300 flex flex-col justify-between min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-1 text-cyan-600 mb-1">
                        <Clipboard size={14} className="shrink-0" />
                        <span className="text-xs font-bold text-gray-900 truncate">OF: {orden.orden_fabricacion}</span>

                    </div>
                    <div className="text-[11px] font-bold text-cyan-600 truncate">Pedido: {orden.pedido || (orden as any).numero_pedido || 'Sin pedido'}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
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
                    </div>
                    {planta === 'fv' && semaforo && (
                        // Fechas del Semáforo: T, Real Liberación, W (la que usa Prioridades para atrasos) y AF
                        semaforo.error ? (
                            <div className="mt-1 text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded">{semaforo.error}</div>
                        ) : !fechasSem || (!fechasSem.lote && !fechasSem.realLib && !fechasSem.idealW && !fechasSem.prometida) ? (
                            <div className="mt-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-300 px-1.5 py-0.5 rounded">
                                {fechasSem?.actualizadas ? 'Esta OF no está en el Semáforo' : 'Sin fechas del Semáforo: use "Cargar Órdenes"'}
                            </div>
                        ) : (
                            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] leading-tight border border-slate-200 rounded px-1.5 py-1 bg-slate-50"
                                title={fechasSem.actualizadas ? `Fechas del Semáforo traídas el ${new Date(fechasSem.actualizadas).toLocaleString('es-CO')}` : undefined}>
                                {/* Orden de las columnas del Semáforo: O, T, W, AF */}
                                <span><b className="text-slate-500">Real Liberación (O):</b> <b className="text-[#324354]">{fechaCorta(fechasSem.realLib)}</b></span>
                                {/* Solo la T (la que ordena todos los módulos) se marca en rojo cuando está atrasada */}
                                <span><b className="text-slate-500">Entrega Lote (T):</b> <b className={fechasSem.lote && fechasSem.lote < hoyIso ? 'text-red-600' : 'text-[#324354]'}>{fechaCorta(fechasSem.lote)}</b></span>
                                <span title="NS = Nivel de Servicio"><b className="text-slate-500">Ideal Entrega Prod. [NS] (W):</b> <b className="text-[#324354]">{fechaCorta(fechasSem.idealW)}</b></span>
                                <span><b className="text-slate-500">Prometida (AF):</b> <b className="text-[#324354]">{fechaCorta(fechasSem.prometida)}</b></span>
                            </div>
                        )
                    )}
                    {(() => {
                        const fullDesc = orden.producto_descripcion || orden.molde_descripcion || orden.producto_sku || 'Sin descripción'
                        return (
                            <div className="text-[11px] font-bold text-gray-800 mt-1 leading-snug break-words" title={fullDesc}>
                                {fullDesc}
                            </div>
                        )
                    })()}
                    <div className="text-[9px] text-gray-400 italic mt-0.5 truncate">SKU: {sku || 'No definido'}</div>
                </div>
                <div className="flex items-center gap-1 text-cyan-500 mt-2 lg:mt-auto">
                    <Users size={12} className="shrink-0" />
                    <span className="text-[11px] font-bold truncate">Cliente: {orden.cliente || orden.cliente_nombre || 'No registrado'}</span>
                </div>
            </div>

            {/* Middle Section: Mold Status */}
            <div className="w-full sm:w-auto sm:min-w-[180px] lg:min-w-0 lg:w-[17%] lg:px-3 lg:border-r border-gray-300 flex flex-col justify-center bg-gray-50 lg:bg-transparent p-2 lg:p-0 rounded">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Moldes</span>
                    {planta === 'fv' && conDetalle && (
                        // La tarjeta ya es un botón: el detalle va como span con rol de botón para no anidar botones
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={e => { e.stopPropagation(); setVerDetalle(true) }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setVerDetalle(true) } }}
                            className="p-1.5 text-[#324354] hover:bg-slate-100 rounded-lg transition-colors bg-slate-50 cursor-pointer"
                            title="Detalle de la orden en SAP (lista de materiales, comentarios)"
                        >
                            <FileText size={16} />
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-bold">
                    <div className="text-cyan-600">Totales: <span className="text-gray-900">{orden.moldes_totales || relevantMoldes.length}</span></div>
                    <div className="text-red-500">Reparación: <span className="text-gray-900">{orden.moldes_en_reparacion || enReparacion}</span></div>
                    <div className="text-green-600">Disponibles: <span className="text-gray-900">{orden.moldes_disponibles || disponibles}</span></div>
                    <div className="text-orange-600">Fabricación: <span className="text-gray-900">{orden.moldes_en_fabricacion || 0}</span></div>
                    <div className="text-yellow-600">En uso: <span className="text-gray-900">{orden.moldes_en_uso || enUso}</span></div>
                </div>
            </div>

            {/* Right Section: Process Grid */}
            {planta === 'fv' ? (
                // FV: mismo orden del encabezado. En la base, las piezas en Ensayo cuentan en `acabado` y las de
                // Guacales (por poner o ya en huacal) en `empaque`; la reparación larga suma en Reparación
                <div className="sm:col-span-2 flex-1 lg:pl-3 grid grid-cols-4 sm:grid-cols-7 gap-1">
                    <MiniMetric label="Cantidad" value={cantidadTotal} color={isExcedido ? "bg-red-100 border-red-400 text-red-700" : "bg-cyan-50 border-cyan-200"} />
                    <MiniMetric label="Programado" value={programadoCalculado} color="bg-orange-50 border-orange-200" />
                    <MiniMetric label="Pintura" value={Math.max(0, orden.pintura || 0)} />
                    <MiniMetric label="Desgelcada" value={Math.max(0, orden.desgelcada || 0)} />
                    <MiniMetric label="Vaciado" value={Math.max(0, orden.vaciado || 0)} />
                    <MiniMetric label="Pulido" value={Math.max(0, orden.pulido || 0)} />
                    <MiniMetric label="Ensayo" value={Math.max(0, orden.acabado || 0)} />

                    <MiniMetric label="Reparación" value={Math.max(0, orden.reparacion || 0) + Math.max(0, orden.reparacion_larga || 0)} />
                    <MiniMetric label="Huacales" value={Math.max(0, orden.empaque || 0)} />
                    <MiniMetric label="Saldo" value={Math.max(0, orden.saldo || 0)} />
                    <MiniMetric label="Destrucción" value={Math.max(0, orden.destruccion || 0)} />
                    <MiniMetric label="Digitado" value={Math.max(0, orden.digitado || 0)} />
                    <MiniMetric label="Tránsito" value={Math.max(0, orden.transito || 0)} />
                    <MiniMetric label="CEDI" value={Math.max(0, orden.cedi || 0)} color="bg-cyan-50 border-cyan-200" />
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
                    <DetalleOrdenSapModal ordenFabricacion={orden.orden_fabricacion} onClose={() => setVerDetalle(false)} />
                </div>,
                document.body
            )}
        </button>
    )
}
