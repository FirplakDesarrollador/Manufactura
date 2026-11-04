'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { getRegistrosParaVaciado } from '@/lib/supabase/queries/fibra_vaciado'
import { getOrdenesFabricacion, getAllMoldes, getRegistrosTrazabilidadHoyMetricas } from '@/lib/supabase/queries/fibra'
import EncabezadoFibra, { useMetricasFibra } from '../EncabezadoFibra'
import RegistroVaciadoCard from './RegistroVaciadoCard'
import KilosTable from './KilosTable'
import { ClipboardList, TableProperties } from 'lucide-react'

export default function VaciadoFibraModule({ userEmail }: { userEmail: string }) {
    const [activeTab, setActiveTab] = useState<'reportar' | 'kilos'>('reportar')
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [trazabilidad, setTrazabilidad] = useState<RegistroTrazabilidad[]>([])
    const [moldes, setMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState('')

    // Piezas pendientes de vaciado + órdenes, moldes y registros de hoy (tarjeta e indicadores iguales a Pintura)
    const loadRegistros = useCallback(async () => {
        setLoading(true)
        const [data, ordenesData, moldesData, trazaHoy] = await Promise.all([
            getRegistrosParaVaciado(), getOrdenesFabricacion(), getAllMoldes(), getRegistrosTrazabilidadHoyMetricas()
        ])
        setRegistros(data)
        setOrdenes(ordenesData)
        setMoldes(moldesData)
        setTrazabilidad(trazaHoy)
        setLoading(false)
    }, [])

    useEffect(() => {
        if (activeTab === 'reportar') {
            loadRegistros()
        }
    }, [activeTab, loadRegistros])

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
            return [r.molde_serial, r.molde_descripcion, r.orden_fabricacion, r.producto_descripcion, r.pedido, r.numero_pedido]
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
                extra={
                    <div className="flex h-8 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setActiveTab('reportar')}
                            className={`flex items-center gap-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'reportar' ? 'bg-[#254153] text-white' : 'text-slate-500 hover:text-[#254153]'}`}
                        >
                            <ClipboardList size={14} />
                            Reportar
                        </button>
                        <button
                            onClick={() => setActiveTab('kilos')}
                            className={`flex items-center gap-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'kilos' ? 'bg-[#254153] text-white' : 'text-slate-500 hover:text-[#254153]'}`}
                        >
                            <TableProperties size={14} />
                            Tabla Kilos
                        </button>
                    </div>
                }
            />

            {/* Contenido */}
            <div className="flex-1 md:overflow-y-auto p-2 sm:p-4">
                {activeTab === 'reportar' ? (
                    <div className="space-y-2">
                        <div className="text-cyan-600 text-xs font-bold mb-2 uppercase">
                            Piezas pendientes de vaciado: {filteredRegistros.length}
                        </div>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Cargando piezas...</div>
                        ) : filteredRegistros.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {searchText || selectedDate ? 'No se encontraron piezas con esos filtros' : "No hay piezas en estado 'Pintura' pendientes de vaciado"}
                            </div>
                        ) : (
                            filteredRegistros.map((registro, index) => (
                                <RegistroVaciadoCard
                                    key={registro.registrer || index}
                                    registro={registro}
                                    orden={ordenPorOf.get(String(registro.orden_fabricacion))}
                                    moldes={moldes}
                                    usuarioEmail={userEmail}
                                    onRefresh={loadRegistros}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto">
                        <KilosTable />
                    </div>
                )}
            </div>
        </div>
    )
}
