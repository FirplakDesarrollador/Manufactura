'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getAllMoldes, getRegistrosTrazabilidadHoyMetricas } from '@/lib/supabase/queries/fibra'
import EncabezadoFibra, { useMetricasFibra } from './EncabezadoFibra'

// Página común de los módulos de piso FV por pieza (Pulido, Ensayo, Guacales, Reparación…): encabezado de
// indicadores y búsqueda, y la lista de piezas pendientes, cada una con la tarjeta de su orden y sus botones
interface ModuloPiezasFibraProps {
    cargarPiezas: () => Promise<RegistroTrazabilidad[]>
    tituloLista: string            // p. ej. "Piezas pendientes de pulido"
    sinPiezas: string              // mensaje cuando no hay piezas (sin filtros)
    renderPieza: (p: { registro: RegistroTrazabilidad; orden?: OrdenFabricacion; moldes: Molde[]; onRefresh: () => void }) => React.ReactNode
    extra?: React.ReactNode        // controles propios del módulo en la barra (p. ej. pestañas)
}

export default function ModuloPiezasFibra({ cargarPiezas, tituloLista, sinPiezas, renderPieza, extra }: ModuloPiezasFibraProps) {
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [trazabilidad, setTrazabilidad] = useState<RegistroTrazabilidad[]>([])
    const [moldes, setMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState('')

    // cargarPiezas cambia cuando cambia la pestaña del módulo: se vuelve a consultar
    const loadRegistros = useCallback(async () => {
        setLoading(true)
        const [data, ordenesData, moldesData, trazaHoy] = await Promise.all([
            cargarPiezas(), getOrdenesFabricacion(), getAllMoldes(), getRegistrosTrazabilidadHoyMetricas()
        ])
        setRegistros(data)
        setOrdenes(ordenesData)
        setMoldes(moldesData)
        setTrazabilidad(trazaHoy)
        setLoading(false)
    }, [cargarPiezas])

    useEffect(() => { loadRegistros() }, [loadRegistros])

    const { baseFilteredOrdenes, metrics } = useMetricasFibra(ordenes, trazabilidad, searchText, selectedDate)

    const ordenPorOf = useMemo(() => {
        const m = new Map<string, OrdenFabricacion>()
        for (const o of ordenes) m.set(String(o.orden_fabricacion), o)
        return m
    }, [ordenes])

    // Una pieza se muestra si su orden pasa la búsqueda y la fecha, o (sin fecha) si la búsqueda coincide con la pieza (p. ej. el serial)
    const filteredRegistros = useMemo(() => {
        if (!searchText && !selectedDate) return registros
        const ofsFiltradas = new Set(baseFilteredOrdenes.map(o => String(o.orden_fabricacion)))
        const search = searchText.toLowerCase()
        return registros.filter(r => {
            if (ofsFiltradas.has(String(r.orden_fabricacion))) return true
            if (selectedDate || !search) return false
            return [r.molde_serial, r.molde_descripcion, r.orden_fabricacion, r.producto_descripcion, r.pedido, r.numero_pedido, r.producto_sku]
                .some(v => (v || '').toLowerCase().includes(search))
        })
    }, [registros, baseFilteredOrdenes, searchText, selectedDate])

    return (
        <div className="min-h-full md:h-full flex flex-col bg-slate-50/30 md:overflow-hidden">
            <EncabezadoFibra
                metrics={metrics}
                searchText={searchText}
                onSearchChange={setSearchText}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onClear={() => { setSearchText(''); setSelectedDate('') }}
                loading={loading}
                placeholder="OF / Producto / Pedido / Molde..."
                extra={extra}
            />

            <div className="flex-1 md:overflow-y-auto p-2 sm:p-4">
                <div className="space-y-2">
                    <div className="text-cyan-600 text-xs font-bold mb-2 uppercase">
                        {tituloLista}: {filteredRegistros.length}
                    </div>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Cargando piezas...</div>
                    ) : filteredRegistros.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchText || selectedDate ? 'No se encontraron piezas con esos filtros' : sinPiezas}
                        </div>
                    ) : (
                        filteredRegistros.map((registro, index) => (
                            <React.Fragment key={registro.registrer || index}>
                                {renderPieza({ registro, orden: ordenPorOf.get(String(registro.orden_fabricacion)), moldes, onRefresh: loadRegistros })}
                            </React.Fragment>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
