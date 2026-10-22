'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
    History, 
    ArrowLeft, 
    Search, 
    Download, 
    X, 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    AlertTriangle, 
    PackageX, 
    CheckCircle2, 
    Image as ImageIcon,
    Filter,
    RefreshCw
} from 'lucide-react'
import { BrokenSinkIcon } from '@/components/icons/BrokenSinkIcon'

interface HistoricoReporte {
    id: number
    created_at: string
    create_by: number
    producto_id: number
    defecto: any
    Molde?: string
    molde?: string
    fotoUrl?: string
    producto?: {
        Referencia: string
    }
    usuario_nombre?: string
}

export default function HistoricoDefectosPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState<HistoricoReporte[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<'TODOS' | 'LINEA' | 'SALDO' | 'DESTRUCCION'>('TODOS')
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [totalDbCount, setTotalDbCount] = useState(0)

    // Optional Date Range
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const fetchHistorico = useCallback(async () => {
        setLoading(true)
        try {
            // Build base query
            let query = supabase
                .from('ms_reporte_defectos')
                .select(`
                    id,
                    created_at,
                    create_by,
                    producto_id,
                    defecto,
                    Molde,
                    fotoUrl,
                    producto:productos_defectos_ms (Referencia)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })

            if (startDate) {
                query = query.gte('created_at', `${startDate}T00:00:00Z`)
            }
            if (endDate) {
                const nextDay = new Date(endDate)
                nextDay.setDate(nextDay.getDate() + 1)
                const nextDayStr = nextDay.toISOString().split('T')[0]
                query = query.lte('created_at', `${nextDayStr}T12:00:00Z`)
            }

            // When date range is specified, fetch all records in that window (up to 5000) so no destructions/saldos are missed.
            // If no date range is set, fetch the most recent 1000 records.
            const queryLimit = (startDate || endDate) ? 5000 : 1000
            query = query.limit(queryLimit)

            const { data, count, error } = await query

            if (error) {
                console.error('Error fetching defects history:', error)
            } else if (data) {
                if (count !== null) setTotalDbCount(count)

                // Fetch reporter names
                const userIds = [...new Set(data.map(r => r.create_by))].filter(Boolean)
                const usersMap: Record<number, string> = {}
                if (userIds.length > 0) {
                    const { data: usersData } = await supabase
                        .from('usuarios')
                        .select('id, nombre')
                        .in('id', userIds)
                    if (usersData) {
                        usersData.forEach(u => {
                            usersMap[u.id] = u.nombre
                        })
                    }
                }

                const mapped: HistoricoReporte[] = data.map((item: any) => ({
                    ...item,
                    usuario_nombre: usersMap[item.create_by] || `Usuario #${item.create_by}`
                }))

                setReports(mapped)
                setCurrentPage(1)
            }
        } catch (err) {
            console.error('Unexpected error fetching history:', err)
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate])

    useEffect(() => {
        fetchHistorico()
    }, [fetchHistorico])

    // Filter and search
    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            // Defect details
            const defectItems = Array.isArray(r.defecto) 
                ? r.defecto 
                : (typeof r.defecto === 'string' ? [r.defecto] : [])
            const defectNames = defectItems.map((d: any) => 
                typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '')
            ).join(', ')

            // Determine registration type
            const isDestruccion = defectNames.toLowerCase().includes('destrucción') || defectNames.toLowerCase().includes('destruccion')
            const isSaldo = defectNames.toLowerCase().includes('saldo')
            const isLinea = !isDestruccion && !isSaldo

            if (typeFilter === 'LINEA' && !isLinea) return false
            if (typeFilter === 'SALDO' && !isSaldo) return false
            if (typeFilter === 'DESTRUCCION' && !isDestruccion) return false

            if (!searchTerm.trim()) return true

            const term = searchTerm.toLowerCase().trim()
            const matchId = r.id.toString().includes(term)
            const matchRef = (r.producto?.Referencia || '').toLowerCase().includes(term)
            const matchDefecto = defectNames.toLowerCase().includes(term)
            const matchMolde = (r.Molde || r.molde || '').toLowerCase().includes(term)
            const matchUser = (r.usuario_nombre || '').toLowerCase().includes(term)

            return matchId || matchRef || matchDefecto || matchMolde || matchUser
        })
    }, [reports, searchTerm, typeFilter])

    // Client-side pagination over filtered results
    const totalPages = Math.ceil(filteredReports.length / pageSize) || 1
    const paginatedReports = useMemo(() => {
        const from = (currentPage - 1) * pageSize
        return filteredReports.slice(from, from + pageSize)
    }, [filteredReports, currentPage, pageSize])

    // Export to CSV
    const exportToCSV = () => {
        if (reports.length === 0) {
            alert('No hay registros para exportar.')
            return
        }

        const headers = [
            'ID',
            'Fecha y Hora',
            'Tipo',
            'Referencia Producto',
            'Defectos',
            'Molde',
            'Registrado Por',
            'Tiene Foto'
        ]

        const rows = filteredReports.map(r => {
            const defectItems = Array.isArray(r.defecto) ? r.defecto : []
            const defectNames = defectItems.map((d: any) => 
                typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '')
            ).join(' | ')

            const isDest = defectNames.toLowerCase().includes('destrucción') || defectNames.toLowerCase().includes('destruccion')
            const isSal = defectNames.toLowerCase().includes('saldo')
            const tipo = isDest ? 'Destrucción' : isSal ? 'Saldo' : 'Defecto en Línea'

            const dateStr = new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z').toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'medium',
                timeZone: 'America/Bogota'
            })

            return [
                r.id,
                `"${dateStr}"`,
                `"${tipo}"`,
                `"${r.producto?.Referencia || 'Sin Referencia'}"`,
                `"${defectNames.replace(/"/g, '""')}"`,
                `"${r.Molde || r.molde || '-'}"`,
                `"${r.usuario_nombre || '-'}"`,
                r.fotoUrl ? 'SI' : 'NO'
            ].join(',')
        })

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `historico_defectos_ms_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-[#254153] text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => router.push('/calidad/ms')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Volver a Calidad MS"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-widest uppercase flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-300" />
                            Histórico de Defectos
                        </h1>
                        <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">
                            Base de Datos Completa • MS Quality Control
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchHistorico}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-bold"
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </header>

            {/* Sticky Search & Filter Toolbar */}
            <div className="bg-white border-b border-gray-200 p-3 sticky top-[72px] z-40 shadow-xs">
                <div className="max-w-full flex flex-wrap items-center gap-3 justify-between">
                    {/* Search Bar */}
                    <div className="flex-1 min-w-[280px] relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="BUSCAR POR REFERENCIA, DEFECTO, MOLDE, INSPECTOR O # ID..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-[#254153] focus:outline-none focus:border-[#254153] uppercase placeholder-gray-400 shadow-inner"
                        />
                    </div>

                    {/* Filter by Type */}
                    <div className="flex items-center bg-gray-100 rounded p-1 text-[11px] font-bold">
                        <button
                            onClick={() => {
                                setTypeFilter('TODOS')
                                setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 rounded transition-all ${typeFilter === 'TODOS' ? 'bg-[#254153] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => {
                                setTypeFilter('LINEA')
                                setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 rounded transition-all ${typeFilter === 'LINEA' ? 'bg-[#254153] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            En Línea
                        </button>
                        <button
                            onClick={() => {
                                setTypeFilter('SALDO')
                                setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 rounded transition-all ${typeFilter === 'SALDO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Saldos
                        </button>
                        <button
                            onClick={() => {
                                setTypeFilter('DESTRUCCION')
                                setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 rounded transition-all ${typeFilter === 'DESTRUCCION' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Destrucciones
                        </button>
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-[#254153]"
                            title="Desde"
                        />
                        <span className="text-gray-400 text-xs">a</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-[#254153]"
                            title="Hasta"
                        />
                        {(startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setStartDate('')
                                    setEndDate('')
                                    setCurrentPage(1)
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                title="Limpiar fechas"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Actions: Export CSV & Counter Badge */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToCSV}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                            title="Descargar datos filtrados en CSV"
                        >
                            <Download className="w-4 h-4" />
                            <span>Exportar CSV</span>
                        </button>

                        <div className="bg-[#254153] text-white px-3 py-2 rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                                {typeFilter !== 'TODOS' || searchTerm || startDate || endDate ? 'Registros:' : 'Total BD:'}
                            </span>
                            <span className="text-xs font-black">{filteredReports.length.toLocaleString('es-CO')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Content */}
            <main className="flex-1 p-4 max-w-full overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 border-3 border-[#254153] border-t-transparent rounded-full animate-spin mb-3" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cargando histórico de defectos...</span>
                        </div>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
                        <History className="w-12 h-12 text-gray-300 mb-2" />
                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Sin Registros Encontrados</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm">No hay registros que coincidan con los filtros y búsqueda aplicados.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto flex-1 flex flex-col justify-between">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                            <thead className="bg-[#254153]">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider"># ID</th>
                                    <th scope="col" className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider">Fecha y Hora</th>
                                    <th scope="col" className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider text-center">Tipo</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-black text-white uppercase tracking-wider">Referencia Producto</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-black text-white uppercase tracking-wider">Defecto(s) Registrado(s)</th>
                                    <th scope="col" className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider text-center">Molde</th>
                                    <th scope="col" className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider">Registrado Por</th>
                                    <th scope="col" className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider text-center">Evidencia</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {paginatedReports.map((report) => {
                                    // Parse defects
                                    const rawDefects = Array.isArray(report.defecto) ? report.defecto : []
                                    const defectNamesList = rawDefects.map((d: any) => 
                                        typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '')
                                    ).filter(Boolean)

                                    const allDefectsStr = defectNamesList.join(', ')
                                    const isDestruccion = allDefectsStr.toLowerCase().includes('destrucción') || allDefectsStr.toLowerCase().includes('destruccion')
                                    const isSaldo = allDefectsStr.toLowerCase().includes('saldo')
                                    
                                    let tipoBadge = (
                                        <span className="px-2 py-0.5 inline-flex text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                            En Línea
                                        </span>
                                    )
                                    if (isDestruccion) {
                                        tipoBadge = (
                                            <span className="px-2 py-0.5 inline-flex text-[10px] font-black uppercase tracking-wider rounded-full bg-red-100 text-red-800 border border-red-200">
                                                Destrucción
                                            </span>
                                        )
                                    } else if (isSaldo) {
                                        tipoBadge = (
                                            <span className="px-2 py-0.5 inline-flex text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                Saldo
                                            </span>
                                        )
                                    }

                                    // Format Colombia Date
                                    const dateObj = new Date(report.created_at.endsWith('Z') || report.created_at.includes('+') ? report.created_at : report.created_at + 'Z')
                                    const fechaFormateada = dateObj.toLocaleDateString('es-CO', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: '2-digit',
                                        timeZone: 'America/Bogota'
                                    })
                                    const horaFormateada = dateObj.toLocaleTimeString('es-CO', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true,
                                        timeZone: 'America/Bogota'
                                    })

                                    const moldeVal = report.Molde || report.molde

                                    return (
                                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                            {/* ID */}
                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-bold text-gray-500">
                                                #{report.id}
                                            </td>

                                            {/* Fecha y Hora */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-xs font-bold text-gray-800">{fechaFormateada}</div>
                                                <div className="text-[10px] font-mono text-gray-500">{horaFormateada}</div>
                                            </td>

                                            {/* Tipo de Registro */}
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                {tipoBadge}
                                            </td>

                                            {/* Referencia Producto */}
                                            <td className="px-5 py-3 whitespace-nowrap text-xs font-black text-[#254153]">
                                                {report.producto?.Referencia || 'Sin Referencia'}
                                            </td>

                                            {/* Defectos */}
                                            <td className="px-5 py-3 text-xs">
                                                <div className="flex flex-wrap gap-1 max-w-md">
                                                    {defectNamesList.length > 0 ? (
                                                        defectNamesList.map((dName, idx) => (
                                                            <span 
                                                                key={idx} 
                                                                className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-[11px] font-bold border border-gray-200"
                                                            >
                                                                {dName}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs">Sin especificar</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Molde */}
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-bold">
                                                {moldeVal ? (
                                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[11px] font-black tracking-wide">
                                                        {moldeVal}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>

                                            {/* Registrado Por */}
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-semibold">
                                                {report.usuario_nombre}
                                            </td>

                                            {/* Evidencia Fotográfica */}
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                {report.fotoUrl ? (
                                                    <button
                                                        onClick={() => setSelectedImage(report.fotoUrl || null)}
                                                        className="group relative inline-block w-9 h-9 rounded overflow-hidden border border-gray-300 hover:border-[#254153] shadow-xs transition-all"
                                                        title="Ver foto en tamaño completo"
                                                    >
                                                        <img
                                                            src={report.fotoUrl}
                                                            alt="Evidencia"
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                        />
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* Pagination Bar */}
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-gray-600">
                                <span>Mostrando</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value))
                                        setCurrentPage(1)
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1 bg-white font-bold text-[#254153]"
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                </select>
                                <span>registros por página • Total: <strong>{filteredReports.length}</strong></span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium">
                                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                        title="Página Anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="p-1.5 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                        title="Página Siguiente"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal de Imagen a Pantalla Completa */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col shadow-2xl border border-white/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 bg-[#254153] flex justify-between items-center text-white">
                            <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Evidencia Fotográfica
                            </span>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-2 flex items-center justify-center bg-black/90 max-h-[80vh] overflow-auto">
                            <img
                                src={selectedImage}
                                alt="Evidencia Detalle"
                                className="max-w-full max-h-[75vh] object-contain rounded"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
