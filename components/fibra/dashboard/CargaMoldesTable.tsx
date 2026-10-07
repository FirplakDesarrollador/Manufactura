import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { 
    Search, 
    X, 
    RefreshCw, 
    Download, 
    ChevronUp, 
    ChevronDown, 
    ArrowUpDown, 
    Box, 
    CheckCircle2, 
    AlertTriangle, 
    Wrench, 
    Clock, 
    Layers,
    Filter
} from 'lucide-react'

export interface CargaMoldesRow {
    moldeSku: string
    moldeDescripcion: string
    moldesTotales: number
    moldesHabilitados: number
    moldesDisponibles: number
    moldesEnUso: number
    moldesEnReparacion: number
    moldesEnFabricacion: number
    totalOrdenes: number
    piezasProgramadas: number
    promedioVueltas: number | null
}

type SortField = keyof CargaMoldesRow
type FilterOption = 'all' | 'reparacion' | 'no_disponible' | 'programado' | 'alta_carga'

export default function CargaMoldesTable() {
    const [data, setData] = useState<CargaMoldesRow[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    
    // Controles de búsqueda, filtro y ordenamiento
    const [searchQuery, setSearchQuery] = useState('')
    const [filterOption, setFilterOption] = useState<FilterOption>('all')
    const [sortField, setSortField] = useState<SortField>('promedioVueltas')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const loadData = async () => {
        setLoading(true)
        setErrorMsg(null)
        try {
            const { data: result, error } = await supabase
                .from('query_carga_moldes')
                .select('*')
                
            if (error) {
                console.error("Error fetching carga moldes:", error)
                setErrorMsg("No se pudieron cargar los datos de carga de moldes.")
            }
            
            if (result && result.length > 0) {
                const normalized: CargaMoldesRow[] = result.map((row: any) => ({
                    moldeSku: row.molde_sku || row.moldeSku || row.sku || '',
                    moldeDescripcion: row.molde_descripcion || row.moldeDescripcion || row.descripcion || '',
                    moldesTotales: Number(row.moldes_totales ?? row.moldesTotales ?? row.totales ?? 0),
                    moldesHabilitados: Number(row.moldes_habilitados ?? row.moldesHabilitados ?? 0),
                    moldesDisponibles: Number(row.moldes_disponibles ?? row.moldesDisponibles ?? row.disponibles ?? 0),
                    moldesEnUso: Number(row.moldes_en_uso ?? row.moldesEnUso ?? row.en_uso ?? 0),
                    moldesEnReparacion: Number(row.moldes_en_reparacion ?? row.moldesEnReparacion ?? row.reparacion ?? 0),
                    moldesEnFabricacion: Number(row.moldes_en_fabricacion ?? row.moldesEnFabricacion ?? row.fabricacion ?? 0),
                    totalOrdenes: Number(row.total_ordenes ?? row.totalOrdenes ?? row.ordenes ?? 0),
                    piezasProgramadas: Number(row.piezas_programadas ?? row.piezasProgramadas ?? row.programado ?? 0),
                    promedioVueltas: row.promedio_vueltas != null 
                        ? Number(row.promedio_vueltas) 
                        : (row.vueltas != null ? Number(row.vueltas) : null)
                }))
                setData(normalized)
            } else {
                setData([])
            }
        } catch (error: any) {
            console.error("Error en CargaMoldesTable:", error)
            setErrorMsg(error?.message || "Ocurrió un error inesperado.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Manejador de cambio de ordenamiento
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('desc')
        }
    }

    // Filtrado y ordenamiento de datos en memoria
    const filteredAndSortedData = useMemo(() => {
        let result = [...data]

        // 1. Búsqueda por texto (SKU o Descripción)
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim()
            result = result.filter(row => 
                row.moldeSku.toLowerCase().includes(query) ||
                row.moldeDescripcion.toLowerCase().includes(query)
            )
        }

        // 2. Filtros de estado rápido
        if (filterOption === 'reparacion') {
            result = result.filter(row => row.moldesEnReparacion > 0)
        } else if (filterOption === 'no_disponible') {
            result = result.filter(row => row.moldesDisponibles === 0 && row.piezasProgramadas > 0)
        } else if (filterOption === 'programado') {
            result = result.filter(row => row.piezasProgramadas > 0)
        } else if (filterOption === 'alta_carga') {
            result = result.filter(row => (row.promedioVueltas || 0) >= 8)
        }

        // 3. Ordenamiento
        result.sort((a, b) => {
            let valA = a[sortField]
            let valB = b[sortField]

            if (valA === null || valA === undefined) valA = sortOrder === 'asc' ? Infinity : -Infinity
            if (valB === null || valB === undefined) valB = sortOrder === 'asc' ? Infinity : -Infinity

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA)
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortOrder === 'asc' ? valA - valB : valB - valA
            }

            return 0
        })

        return result
    }, [data, searchQuery, filterOption, sortField, sortOrder])

    // Métricas totales calculadas globalmente (y según filtros)
    const metrics = useMemo(() => {
        const totalRows = filteredAndSortedData.length
        const totalMoldes = filteredAndSortedData.reduce((acc, r) => acc + r.moldesTotales, 0)
        const totalDisponibles = filteredAndSortedData.reduce((acc, r) => acc + r.moldesDisponibles, 0)
        const totalEnUso = filteredAndSortedData.reduce((acc, r) => acc + r.moldesEnUso, 0)
        const totalReparacion = filteredAndSortedData.reduce((acc, r) => acc + r.moldesEnReparacion, 0)
        const totalFabricacion = filteredAndSortedData.reduce((acc, r) => acc + r.moldesEnFabricacion, 0)
        const totalOrdenes = filteredAndSortedData.reduce((acc, r) => acc + r.totalOrdenes, 0)
        const totalProgramadas = filteredAndSortedData.reduce((acc, r) => acc + r.piezasProgramadas, 0)

        // Promedio de vueltas general de los moldes habilitados
        const totalHabilitados = filteredAndSortedData.reduce((acc, r) => acc + r.moldesHabilitados, 0)
        const promedioVueltasGlobal = totalHabilitados > 0 
            ? Number((totalProgramadas / totalHabilitados).toFixed(2)) 
            : 0

        return {
            totalRows,
            totalMoldes,
            totalDisponibles,
            totalEnUso,
            totalReparacion,
            totalFabricacion,
            totalOrdenes,
            totalProgramadas,
            promedioVueltasGlobal
        }
    }, [filteredAndSortedData])

    // Exportar a CSV
    const exportToCSV = () => {
        if (filteredAndSortedData.length === 0) return

        const headers = ['SKU', 'Descripción', 'Moldes Totales', 'Disponibles', 'En Uso', 'Reparación', 'Fabricación', 'Órdenes Pendientes', 'Piezas Programadas', 'Promedio Vueltas']
        const rows = filteredAndSortedData.map(r => [
            `"${r.moldeSku}"`,
            `"${r.moldeDescripcion.replace(/"/g, '""')}"`,
            r.moldesTotales,
            r.moldesDisponibles,
            r.moldesEnUso,
            r.moldesEnReparacion,
            r.moldesEnFabricacion,
            r.totalOrdenes,
            r.piezasProgramadas,
            r.promedioVueltas ?? ''
        ])

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `Carga_de_Moldes_Fibra_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown size={13} className="inline ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        }
        return sortOrder === 'asc' 
            ? <ChevronUp size={14} className="inline ml-1 text-[#00bcd4]" /> 
            : <ChevronDown size={14} className="inline ml-1 text-[#00bcd4]" />
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col animate-in fade-in duration-300">
            {/* KPI Summary Cards Bar */}
            <div className="p-4 bg-gray-50/80 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Box size={12} className="text-[#324354]" /> Tipos Molde
                    </span>
                    <span className="text-base font-extrabold text-[#324354] mt-1">{metrics.totalRows}</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Layers size={12} className="text-gray-700" /> Totales
                    </span>
                    <span className="text-base font-extrabold text-gray-800 mt-1">{metrics.totalMoldes}</span>
                </div>

                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Disponibles
                    </span>
                    <span className="text-base font-extrabold text-emerald-700 mt-1">{metrics.totalDisponibles}</span>
                </div>

                <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                        <Clock size={12} className="text-amber-600" /> En Uso
                    </span>
                    <span className="text-base font-extrabold text-amber-700 mt-1">{metrics.totalEnUso}</span>
                </div>

                <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200/60 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                        <Wrench size={12} className="text-rose-600" /> Reparación
                    </span>
                    <span className="text-base font-extrabold text-rose-700 mt-1">{metrics.totalReparacion}</span>
                </div>

                <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                        <Box size={12} className="text-blue-600" /> Fabricación
                    </span>
                    <span className="text-base font-extrabold text-blue-700 mt-1">{metrics.totalFabricacion}</span>
                </div>

                <div className="bg-cyan-50/60 p-2.5 rounded-xl border border-cyan-200/60 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-[#008ba3] uppercase tracking-wider flex items-center gap-1">
                        <Layers size={12} className="text-[#00bcd4]" /> Programado
                    </span>
                    <span className="text-base font-extrabold text-[#00bcd4] mt-1">{metrics.totalProgramadas} pzs</span>
                </div>

                <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-200/60 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                        <RefreshCw size={12} className="text-purple-600" /> Vueltas Prom.
                    </span>
                    <span className="text-base font-extrabold text-purple-700 mt-1">{metrics.promedioVueltasGlobal}</span>
                </div>
            </div>

            {/* Filter & Controls Header */}
            <div className="p-3 bg-white border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por SKU o descripción de molde..."
                            className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/30 focus:border-[#00bcd4] transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdown */}
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                        <Filter size={14} className="text-gray-500" />
                        <select
                            value={filterOption}
                            onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                            className="bg-transparent text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer pr-1"
                        >
                            <option value="all">Todos los registros</option>
                            <option value="programado">Con Programación (&gt; 0)</option>
                            <option value="alta_carga">Alta Carga (&ge; 8 Vueltas)</option>
                            <option value="reparacion">Con Moldes en Reparación</option>
                            <option value="no_disponible">Sin Moldes Disponibles</option>
                        </select>
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportToCSV}
                        disabled={filteredAndSortedData.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
                        title="Exportar a CSV"
                    >
                        <Download size={14} />
                        <span className="hidden md:inline">Exportar CSV</span>
                    </button>

                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#324354] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-[#00bcd4]' : ''} />
                        <span className="hidden md:inline">Recargar</span>
                    </button>

                    <span className="text-xs bg-[#00bcd4]/10 text-[#008ba3] px-2.5 py-1 rounded-full font-bold ml-1">
                        {filteredAndSortedData.length} / {data.length}
                    </span>
                </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
                <div className="p-3 bg-red-50 border-b border-red-100 text-red-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                    <button onClick={loadData} className="underline font-bold hover:text-red-900">Reintentar</button>
                </div>
            )}

            {/* Main Table Content Area */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-56 gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00bcd4]"></div>
                        <span className="text-xs font-bold text-gray-500">Cargando indicador de carga de moldes...</span>
                    </div>
                ) : (
                    <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
                        <thead className="text-[11px] text-[#324354] bg-gray-100/90 sticky top-0 z-10 shadow-2xs uppercase font-extrabold tracking-wider select-none">
                            <tr>
                                <th 
                                    onClick={() => handleSort('moldeSku')}
                                    className="px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    SKU {renderSortIcon('moldeSku')}
                                </th>
                                <th 
                                    onClick={() => handleSort('moldeDescripcion')}
                                    className="px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Descripción {renderSortIcon('moldeDescripcion')}
                                </th>
                                <th 
                                    onClick={() => handleSort('moldesTotales')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Totales {renderSortIcon('moldesTotales')}
                                </th>
                                <th 
                                    onClick={() => handleSort('moldesDisponibles')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Disponibles {renderSortIcon('moldesDisponibles')}
                                </th>
                                <th 
                                    onClick={() => handleSort('moldesEnUso')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    En Uso {renderSortIcon('moldesEnUso')}
                                </th>
                                <th 
                                    onClick={() => handleSort('moldesEnReparacion')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Reparación {renderSortIcon('moldesEnReparacion')}
                                </th>
                                <th 
                                    onClick={() => handleSort('moldesEnFabricacion')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Fabricación {renderSortIcon('moldesEnFabricacion')}
                                </th>
                                <th 
                                    onClick={() => handleSort('totalOrdenes')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Órdenes {renderSortIcon('totalOrdenes')}
                                </th>
                                <th 
                                    onClick={() => handleSort('piezasProgramadas')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Programado {renderSortIcon('piezasProgramadas')}
                                </th>
                                <th 
                                    onClick={() => handleSort('promedioVueltas')}
                                    className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200/70 transition-colors group"
                                >
                                    Vueltas {renderSortIcon('promedioVueltas')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredAndSortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Box size={32} className="text-gray-300" />
                                            <p className="font-semibold text-gray-600">No se encontraron registros de moldes</p>
                                            <p className="text-xs text-gray-400">Intenta cambiar los términos de búsqueda o los filtros seleccionados.</p>
                                            {(searchQuery || filterOption !== 'all') && (
                                                <button
                                                    onClick={() => { setSearchQuery(''); setFilterOption('all'); }}
                                                    className="mt-2 text-xs font-bold text-[#00bcd4] hover:underline"
                                                >
                                                    Restablecer filtros
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedData.map((row: CargaMoldesRow, index: number) => {
                                    const vueltas = row.promedioVueltas
                                    const tieneAlertaReparacion = row.moldesEnReparacion > 0
                                    const tieneAlertaDisponibilidad = row.moldesDisponibles === 0 && row.piezasProgramadas > 0

                                    return (
                                        <tr 
                                            key={row.moldeSku || index} 
                                            className={`hover:bg-[#f8fafc] transition-colors ${
                                                tieneAlertaDisponibilidad 
                                                    ? 'bg-red-50/30' 
                                                    : tieneAlertaReparacion 
                                                    ? 'bg-amber-50/20' 
                                                    : ''
                                            }`}
                                        >
                                            {/* SKU */}
                                            <td className="px-4 py-2.5 font-bold text-[#324354]">
                                                {row.moldeSku || '-'}
                                            </td>

                                            {/* Descripción */}
                                            <td 
                                                className="px-4 py-2.5 text-gray-700 max-w-[280px] truncate" 
                                                title={row.moldeDescripcion}
                                            >
                                                {row.moldeDescripcion || '-'}
                                            </td>

                                            {/* Moldes Totales */}
                                            <td className="px-4 py-2.5 text-center font-bold text-gray-800">
                                                {row.moldesTotales}
                                            </td>

                                            {/* Disponibles */}
                                            <td className="px-4 py-2.5 text-center font-bold">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                                    row.moldesDisponibles > 0 
                                                        ? 'bg-emerald-100/70 text-emerald-800 font-extrabold' 
                                                        : 'bg-gray-100 text-gray-400 font-normal'
                                                }`}>
                                                    {row.moldesDisponibles}
                                                </span>
                                            </td>

                                            {/* En Uso */}
                                            <td className="px-4 py-2.5 text-center font-bold">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                                    row.moldesEnUso > 0 
                                                        ? 'bg-amber-100/70 text-amber-800 font-extrabold' 
                                                        : 'bg-gray-100 text-gray-400 font-normal'
                                                }`}>
                                                    {row.moldesEnUso}
                                                </span>
                                            </td>

                                            {/* Reparación */}
                                            <td className="px-4 py-2.5 text-center font-bold">
                                                {row.moldesEnReparacion > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800 font-extrabold">
                                                        <Wrench size={11} /> {row.moldesEnReparacion}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-normal">0</span>
                                                )}
                                            </td>

                                            {/* Fabricación */}
                                            <td className="px-4 py-2.5 text-center font-medium text-gray-600">
                                                {row.moldesEnFabricacion > 0 ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-bold">
                                                        {row.moldesEnFabricacion}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-normal">0</span>
                                                )}
                                            </td>

                                            {/* Órdenes */}
                                            <td className="px-4 py-2.5 text-center text-blue-700 font-extrabold bg-blue-50/20">
                                                {row.totalOrdenes}
                                            </td>

                                            {/* Programado (Piezas) */}
                                            <td className="px-4 py-2.5 text-center text-[#00bcd4] font-extrabold bg-[#00bcd4]/5">
                                                {row.piezasProgramadas}
                                            </td>

                                            {/* Vueltas Promedio */}
                                            <td className="px-4 py-2.5 text-center font-bold">
                                                {vueltas !== null ? (
                                                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs border font-extrabold ${
                                                        vueltas >= 10
                                                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                            : vueltas >= 5
                                                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    }`}>
                                                        {vueltas}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-normal">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {/* Summary Sticky Footer */}
                        {filteredAndSortedData.length > 0 && (
                            <tfoot className="bg-gray-100/95 border-t-2 border-gray-300 sticky bottom-0 z-10 text-xs font-black text-[#324354]">
                                <tr>
                                    <td className="px-4 py-3 uppercase tracking-wider">
                                        TOTALES ({metrics.totalRows} Moldes)
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 font-semibold italic">
                                        Resumen Consolidado
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-900">
                                        {metrics.totalMoldes}
                                    </td>
                                    <td className="px-4 py-3 text-center text-emerald-700">
                                        {metrics.totalDisponibles}
                                    </td>
                                    <td className="px-4 py-3 text-center text-amber-700">
                                        {metrics.totalEnUso}
                                    </td>
                                    <td className="px-4 py-3 text-center text-rose-700">
                                        {metrics.totalReparacion}
                                    </td>
                                    <td className="px-4 py-3 text-center text-blue-700">
                                        {metrics.totalFabricacion}
                                    </td>
                                    <td className="px-4 py-3 text-center text-blue-800">
                                        {metrics.totalOrdenes}
                                    </td>
                                    <td className="px-4 py-3 text-center text-[#00bcd4]">
                                        {metrics.totalProgramadas}
                                    </td>
                                    <td className="px-4 py-3 text-center text-purple-700">
                                        {metrics.promedioVueltasGlobal} (prom)
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}
            </div>
        </div>
    )
}

