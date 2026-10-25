'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
    RefreshCw,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Edit,
    Trash2,
    ZoomIn,
    Camera,
    Plus
} from 'lucide-react'
import { BrokenSinkIcon } from '@/components/icons/BrokenSinkIcon'
import Header from '@/components/opt-sistemica/Header'
import { CalidadMsNavButtons } from '@/components/calidad/CalidadMsNavButtons'

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

type SortColumn = 'id' | 'created_at' | 'tipo' | 'producto' | 'defecto' | 'molde' | 'usuario' | 'foto'

export default function HistoricoDefectosPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [userEmail, setUserEmail] = useState<string | undefined>()
    const [reports, setReports] = useState<HistoricoReporte[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<'TODOS' | 'LINEA' | 'SALDO' | 'DESTRUCCION' | 'SALDO_DESTRUCCION' | 'MOLDE'>('TODOS')
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    
    // Catalogs for Edit
    const [productsCatalog, setProductsCatalog] = useState<{ id: number; Referencia: string }[]>([])
    const [defectsCatalog, setDefectsCatalog] = useState<{ id: number; Defecto?: string; defecto?: string; nombre?: string; Nombre?: string }[]>([])

    // Detail & Edit Modals
    const [selectedDetailReport, setSelectedDetailReport] = useState<HistoricoReporte | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editProductId, setEditProductId] = useState<number>(0)
    const [editMolde, setEditMolde] = useState<string>('')
    const [editDefectsList, setEditDefectsList] = useState<string[]>([])
    const [editSelectedDefectInput, setEditSelectedDefectInput] = useState<string>('')
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteConfirmReport, setDeleteConfirmReport] = useState<HistoricoReporte | null>(null)
    const editFileInputRef = useRef<HTMLInputElement>(null)

    // Sorting
    const [sortColumn, setSortColumn] = useState<SortColumn>('created_at')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [totalDbCount, setTotalDbCount] = useState(0)

    // Default to Colombia local date (America/Bogota, UTC-5)
    const getColombiaToday = () => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
    }

    const [startDate, setStartDate] = useState(getColombiaToday())
    const [endDate, setEndDate] = useState(getColombiaToday())

    // Fetch Catalogs
    useEffect(() => {
        const loadCatalogs = async () => {
            const [prodRes, defRes] = await Promise.all([
                supabase.from('productos_defectos_ms').select('id, Referencia').order('Referencia'),
                supabase.from('ms_defectos').select('id, Defecto, defecto, nombre, Nombre').order('id')
            ])
            if (prodRes.data) setProductsCatalog(prodRes.data)
            if (defRes.data) setDefectsCatalog(defRes.data)
        }
        void loadCatalogs()
    }, [])

    const fetchHistorico = useCallback(async () => {
        setLoading(true)
        try {
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
                const startIso = new Date(`${startDate}T00:00:00-05:00`).toISOString()
                query = query.gte('created_at', startIso)
            }
            if (endDate) {
                const endIso = new Date(`${endDate}T23:59:59.999-05:00`).toISOString()
                query = query.lte('created_at', endIso)
            }

            const queryLimit = (startDate || endDate) ? 5000 : 1000
            query = query.limit(queryLimit)

            const { data, count, error } = await query

            if (error) {
                console.error('Error fetching defects history:', error)
            } else if (data) {
                if (count !== null) setTotalDbCount(count)

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
        const getAuth = async () => {
            const { data: authData } = await supabase.auth.getUser()
            if (authData?.user?.email) {
                setUserEmail(authData.user.email)
            }
        }
        void getAuth()
    }, [fetchHistorico])

    // Helper functions for defect parsing
    const getDefectNames = (report: HistoricoReporte) => {
        const defectItems = Array.isArray(report.defecto) 
            ? report.defecto 
            : (typeof report.defecto === 'string' ? [report.defecto] : [])
        return defectItems.map((d: any) => 
            typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '')
        ).filter(Boolean)
    }

    const getDefectNamesString = (report: HistoricoReporte) => {
        return getDefectNames(report).join(', ')
    }

    const getTipo = (report: HistoricoReporte): 'DESTRUCCION' | 'SALDO' | 'LINEA' => {
        const defectStr = getDefectNamesString(report).toLowerCase()
        if (defectStr.includes('destrucción') || defectStr.includes('destruccion')) return 'DESTRUCCION'
        if (defectStr.includes('saldo')) return 'SALDO'
        return 'LINEA'
    }

    const handleSort = (col: SortColumn) => {
        if (sortColumn === col) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(col)
            setSortDirection(col === 'created_at' || col === 'id' ? 'desc' : 'asc')
        }
    }

    // Filter and search
    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const defectNames = getDefectNamesString(r)
            const tipo = getTipo(r)

            if (typeFilter === 'LINEA' && tipo !== 'LINEA') return false
            if (typeFilter === 'SALDO' && tipo !== 'SALDO') return false
            if (typeFilter === 'DESTRUCCION' && tipo !== 'DESTRUCCION') return false
            if (typeFilter === 'SALDO_DESTRUCCION' && tipo === 'LINEA') return false
            if (typeFilter === 'MOLDE') {
                const moldeVal = (r.Molde || r.molde || '').toString().trim()
                if (!moldeVal || moldeVal === '-' || moldeVal.toLowerCase() === 'n/a' || moldeVal === '0') return false
            }

            if (!searchTerm.trim()) return true

            const term = searchTerm.toLowerCase().trim()
            const matchId = r.id.toString().includes(term)
            const matchRef = (r.producto?.Referencia || '').toLowerCase().includes(term)
            const matchDefecto = defectNames.toLowerCase().includes(term)
            const matchMolde = (r.Molde || r.molde || '').toLowerCase().includes(term)
            const matchUser = (r.usuario_nombre || '').toLowerCase().includes(term)

            return matchId || matchRef || matchDefecto || matchMolde || matchUser
        })
    }, [reports, typeFilter, searchTerm])

    // Sorted reports
    const sortedReports = useMemo(() => {
        return [...filteredReports].sort((a, b) => {
            let valA: any = ''
            let valB: any = ''

            switch (sortColumn) {
                case 'id':
                    return sortDirection === 'asc' ? a.id - b.id : b.id - a.id
                case 'created_at':
                    valA = new Date(a.created_at).getTime()
                    valB = new Date(b.created_at).getTime()
                    return sortDirection === 'asc' ? valA - valB : valB - valA
                case 'tipo':
                    valA = getTipo(a)
                    valB = getTipo(b)
                    break
                case 'producto':
                    valA = a.producto?.Referencia || ''
                    valB = b.producto?.Referencia || ''
                    break
                case 'defecto':
                    valA = getDefectNamesString(a)
                    valB = getDefectNamesString(b)
                    break
                case 'molde':
                    valA = a.Molde || a.molde || ''
                    valB = b.Molde || b.molde || ''
                    break
                case 'usuario':
                    valA = a.usuario_nombre || ''
                    valB = b.usuario_nombre || ''
                    break
                case 'foto':
                    valA = a.fotoUrl ? 1 : 0
                    valB = b.fotoUrl ? 1 : 0
                    return sortDirection === 'asc' ? valA - valB : valB - valA
            }

            const cmp = String(valA).localeCompare(String(valB), 'es', { sensitivity: 'base' })
            return sortDirection === 'asc' ? cmp : -cmp
        })
    }, [filteredReports, sortColumn, sortDirection])

    // Pagination
    const totalPages = Math.ceil(sortedReports.length / pageSize) || 1
    const paginatedReports = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return sortedReports.slice(start, start + pageSize)
    }, [sortedReports, currentPage, pageSize])

    // Export to CSV
    const exportToCSV = () => {
        if (sortedReports.length === 0) {
            alert('No hay datos para exportar')
            return
        }

        const headers = ['ID', 'Fecha_Hora', 'Tipo', 'Referencia_Producto', 'Defectos', 'Molde', 'Registrado_Por', 'Tiene_Evidencia']
        const rows = sortedReports.map(r => {
            const defectNames = getDefectNamesString(r)
            const tipo = getTipo(r)
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

    // Handle Edit / Delete Actions
    const handleStartEdit = (report: HistoricoReporte) => {
        setEditProductId(report.producto_id || 0)
        setEditMolde(report.Molde || report.molde || '')
        setEditDefectsList(getDefectNames(report))
        setEditPhotoFile(null)
        setEditSelectedDefectInput('')
        setIsEditing(true)
    }

    const handleSaveEdit = async () => {
        if (!selectedDetailReport) return
        setIsSavingEdit(true)
        try {
            let uploadedPhotoUrl = selectedDetailReport.fotoUrl
            if (editPhotoFile) {
                const fileName = `ms-defectos/${Date.now()}-${editPhotoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
                const { error: uploadError } = await supabase.storage
                    .from('fichas-media')
                    .upload(fileName, editPhotoFile)
                if (uploadError) {
                    console.error('Error uploading photo:', uploadError)
                    alert('Error al subir la nueva foto')
                    setIsSavingEdit(false)
                    return
                }
                const { data } = supabase.storage.from('fichas-media').getPublicUrl(fileName)
                uploadedPhotoUrl = data.publicUrl
            }

            const updatedDefects = editDefectsList.map(name => ({ defecto: name }))

            const updatePayload: any = {
                producto_id: editProductId,
                defecto: updatedDefects,
                Molde: editMolde.trim() || null,
                fotoUrl: uploadedPhotoUrl
            }

            const { error: updateError } = await supabase
                .from('ms_reporte_defectos')
                .update(updatePayload)
                .eq('id', selectedDetailReport.id)

            if (updateError) {
                alert('Error al actualizar registro: ' + updateError.message)
            } else {
                alert('Registro actualizado exitosamente')
                setIsEditing(false)
                setSelectedDetailReport(null)
                await fetchHistorico()
            }
        } catch (err) {
            console.error('Error in handleSaveEdit:', err)
            alert('Error inesperado al guardar')
        } finally {
            setIsSavingEdit(false)
        }
    }

    const handleDeleteReport = (report: HistoricoReporte) => {
        setDeleteConfirmReport(report)
    }

    const confirmDeleteReport = async () => {
        if (!deleteConfirmReport) return
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('ms_reporte_defectos')
                .delete()
                .eq('id', deleteConfirmReport.id)
            if (error) {
                alert('Error al eliminar: ' + error.message)
            } else {
                setDeleteConfirmReport(null)
                setSelectedDetailReport(null)
                setIsEditing(false)
                await fetchHistorico()
            }
        } catch (err) {
            console.error('Error in confirmDeleteReport:', err)
            alert('Error inesperado al eliminar')
        } finally {
            setIsDeleting(false)
        }
    }

    const renderSortHeader = (label: string, col: SortColumn, align: 'left' | 'center' = 'left') => {
        const isActive = sortColumn === col
        return (
            <th
                scope="col"
                onClick={() => handleSort(col)}
                className={`px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider cursor-pointer hover:bg-slate-700 select-none transition-colors ${align === 'center' ? 'text-center' : 'text-left'}`}
                title={`Ordenar por ${label}`}
            >
                <div className={`inline-flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{label}</span>
                    <span className="text-[10px]">
                        {isActive ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                    </span>
                </div>
            </th>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header unificado estilo FIRPLAK con altura compacta h-14 */}
            <Header
                title="Calidad MS"
                subtitle=""
                compact={true}
                userEmail={userEmail}
                showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))}
            />

            {/* Sticky Search & Filter Toolbar - EXACT SAME HEIGHT (h-14 / 56px) AS MAIN HEADER */}
            <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 2xl:py-0 2xl:h-14 sticky top-[56px] z-40 shadow-xs flex items-center">
                <div className="max-w-[1800px] w-full mx-auto flex flex-wrap items-center justify-between 2xl:grid 2xl:grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)] 2xl:gap-4 relative 2xl:h-full gap-2">
                    {/* Left: Search input & Type Filter - Ampliado para aprovechar el espacio antes de los botones */}
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 min-w-0 sm:min-w-[320px] 2xl:max-w-[520px]">
                        {/* Search Input: mismo ancho que el selector de referencia del registro */}
                        <div className="relative flex-1 min-w-[180px] [contain:inline-size]">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="BUSCAR REF, DEFECTO, INSPECTOR..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-[#254153] focus:outline-none focus:border-[#254153] uppercase placeholder-gray-400 h-9"
                            />
                        </div>

                        {/* Filter by Type (lista desplegable) */}
                        <div className="flex items-center gap-1 h-9 bg-white border border-gray-300 rounded px-2 shrink-0">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Tipo</span>
                            <select
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setCurrentPage(1); }}
                                className="bg-transparent font-black text-[#254153] text-xs outline-none cursor-pointer"
                                title="Filtrar por tipo de registro"
                            >
                                <option value="TODOS">Todos</option>
                                <option value="LINEA">En línea</option>
                                <option value="SALDO">Saldos</option>
                                <option value="DESTRUCCION">Destrucciones</option>
                                <option value="SALDO_DESTRUCCION">Saldos y destrucciones</option>
                                <option value="MOLDE">Con molde</option>
                            </select>
                        </div>
                    </div>

                    {/* Center: Nav Buttons - EXACTLY CENTERED WITH FIRPLAK LOGO */}
                    <div className="order-3 2xl:order-none w-full 2xl:w-auto flex justify-center z-20">
                        <CalidadMsNavButtons activeTab="historico" hasSettingsPermission={true} />
                    </div>

                    {/* Right: Date Range, Actualizar, Exportar CSV, Total BD */}
                    <div className="order-2 2xl:order-none flex flex-wrap items-center justify-center sm:justify-end gap-1.5 w-full sm:w-auto sm:ml-auto 2xl:ml-0 2xl:justify-self-end min-w-0 z-10">
                        {/* Date Filters */}
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="w-[116px] px-1.5 py-1 bg-gray-50 border border-gray-300 rounded text-[11px] font-bold text-[#254153] h-9"
                                title="Fecha Inicio"
                            />
                            <span className="text-gray-400 text-xs">a</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="w-[116px] px-1.5 py-1 bg-gray-50 border border-gray-300 rounded text-[11px] font-bold text-[#254153] h-9"
                                title="Fecha Fin"
                            />
                            {(startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setStartDate('')
                                        setEndDate('')
                                        setCurrentPage(1)
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded h-9 flex items-center justify-center"
                                    title="Ver todo (sin filtro de fecha)"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Actualizar Button */}
                        <button
                            onClick={fetchHistorico}
                            className="bg-white border border-gray-300 hover:bg-gray-100 text-[#254153] px-2.5 py-1.5 rounded font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all active:scale-95 h-9"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden 2xl:inline">Actualizar</span>
                        </button>

                        {/* Export CSV */}
                        <button
                            onClick={exportToCSV}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all active:scale-95 h-9"
                            title="Descargar datos filtrados en CSV"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden 2xl:inline">Exportar</span>
                        </button>

                        {/* Counter Badge */}
                        <div className="bg-[#254153] text-white px-2.5 py-1.5 rounded flex items-center gap-1 shadow-xs whitespace-nowrap h-9 text-xs font-black">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                                Total:
                            </span>
                            <span>{filteredReports.length.toLocaleString('es-CO')}</span>
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
                        <p className="text-xs text-gray-500 mt-1 max-w-sm">No hay registros que coincidan con la fecha y filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto flex-1 flex flex-col justify-between">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                            <thead className="bg-[#254153]">
                                <tr>
                                    {renderSortHeader('# ID', 'id')}
                                    {renderSortHeader('Fecha y Hora', 'created_at')}
                                    {renderSortHeader('Tipo', 'tipo', 'center')}
                                    {renderSortHeader('Referencia Producto', 'producto')}
                                    {renderSortHeader('Defecto(s) Registrado(s)', 'defecto')}
                                    {renderSortHeader('Molde', 'molde', 'center')}
                                    {renderSortHeader('Registrado Por', 'usuario')}
                                    {renderSortHeader('Evidencia', 'foto', 'center')}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {paginatedReports.map((report) => {
                                    const defectNamesList = getDefectNames(report)
                                    const tipo = getTipo(report)

                                    let tipoBadge = (
                                        <span className="px-2 py-0.5 inline-flex text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                            En Línea
                                        </span>
                                    )
                                    if (tipo === 'DESTRUCCION') {
                                        tipoBadge = (
                                            <span className="px-2 py-0.5 inline-flex text-[10px] font-black uppercase tracking-wider rounded-full bg-red-100 text-red-800 border border-red-200">
                                                Destrucción
                                            </span>
                                        )
                                    } else if (tipo === 'SALDO') {
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
                                        <tr 
                                            key={report.id} 
                                            onClick={() => setSelectedDetailReport(report)}
                                            className="hover:bg-blue-50/60 cursor-pointer transition-colors group select-none"
                                            title="Clic para abrir detalle, editar o eliminar"
                                        >
                                            {/* ID */}
                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-bold text-gray-500 group-hover:text-blue-600">
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
                                            <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
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

                        {/* Pagination Footer */}
                        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs text-gray-600">
                                        Mostrando página <span className="font-black text-[#254153]">{currentPage}</span> de{' '}
                                        <span className="font-black text-[#254153]">{totalPages}</span> ({sortedReports.length.toLocaleString('es-CO')} registros filtrados)
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        Anterior
                                    </button>
                                    <span className="text-xs font-bold text-gray-500 px-2">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                                    >
                                        Siguiente
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* DETAIL MODAL */}
            {selectedDetailReport && !isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
                        {/* Header */}
                        <div className="bg-[#254153] text-white p-4 rounded-t-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-300" />
                                <h3 className="font-black text-base uppercase tracking-wider">
                                    Detalle de Registro #{selectedDetailReport.id}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedDetailReport(null)}
                                className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Product & Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Referencia de Producto</span>
                                    <span className="text-base font-black text-[#254153]">
                                        {selectedDetailReport.producto?.Referencia || `ID: ${selectedDetailReport.producto_id}`}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Tipo de Evento</span>
                                    <span className="text-sm font-black">
                                        {getTipo(selectedDetailReport) === 'DESTRUCCION' ? (
                                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">Destrucción</span>
                                        ) : getTipo(selectedDetailReport) === 'SALDO' ? (
                                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Saldo</span>
                                        ) : (
                                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Defecto en Línea</span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Defectos */}
                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider mb-2">Defecto(s) Registrado(s)</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {getDefectNames(selectedDetailReport).map((dName, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-100 text-[#254153] rounded text-xs font-bold border border-gray-300">
                                            {dName}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Molde & Inspector */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-y border-gray-100">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Molde</span>
                                    <span className="text-sm font-bold text-gray-800">
                                        {selectedDetailReport.Molde || selectedDetailReport.molde || 'No especificado'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Registrado Por</span>
                                    <span className="text-sm font-bold text-gray-800">
                                        {selectedDetailReport.usuario_nombre}
                                    </span>
                                </div>
                            </div>

                            {/* Fecha y Hora */}
                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Fecha y Hora de Registro</span>
                                <span className="text-xs font-mono font-bold text-gray-600">
                                    {new Date(selectedDetailReport.created_at.endsWith('Z') || selectedDetailReport.created_at.includes('+') ? selectedDetailReport.created_at : selectedDetailReport.created_at + 'Z').toLocaleString('es-CO', {
                                        dateStyle: 'full',
                                        timeStyle: 'medium',
                                        timeZone: 'America/Bogota'
                                    })}
                                </span>
                            </div>

                            {/* Foto de Evidencia */}
                            {selectedDetailReport.fotoUrl && (
                                <div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider mb-2">Evidencia Fotográfica</span>
                                    <div 
                                        onClick={() => setSelectedImage(selectedDetailReport.fotoUrl || null)}
                                        className="relative rounded-lg overflow-hidden border border-gray-300 bg-gray-100 max-h-64 flex items-center justify-center cursor-pointer group"
                                    >
                                        <img
                                            src={selectedDetailReport.fotoUrl}
                                            alt="Evidencia"
                                            className="max-h-64 object-contain group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                            <ZoomIn className="w-4 h-4" /> Ampliar foto
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions Footer: EDIT & DELETE */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex items-center justify-between gap-3">
                            <button
                                onClick={() => handleDeleteReport(selectedDetailReport)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar Registro</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleStartEdit(selectedDetailReport)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                    <Edit className="w-4 h-4" />
                                    <span>Editar Registro</span>
                                </button>
                                <button
                                    onClick={() => setSelectedDetailReport(null)}
                                    className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded font-black text-xs uppercase tracking-wider shadow-2xs transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {selectedDetailReport && isEditing && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
                        {/* Header */}
                        <div className="bg-[#254153] text-white p-4 rounded-t-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit className="w-5 h-5 text-blue-300" />
                                <h3 className="font-black text-base uppercase tracking-wider">
                                    Editar Registro #{selectedDetailReport.id}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-4">
                            {/* Product Reference */}
                            <div>
                                <label className="text-[11px] font-black uppercase text-gray-700 block mb-1">
                                    Referencia de Producto
                                </label>
                                <select
                                    value={editProductId}
                                    onChange={(e) => setEditProductId(Number(e.target.value))}
                                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs font-bold text-[#254153] focus:border-[#254153] outline-none"
                                >
                                    <option value={0}>-- Seleccionar Referencia --</option>
                                    {productsCatalog.map(p => (
                                        <option key={p.id} value={p.id}>{p.Referencia}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Molde */}
                            <div>
                                <label className="text-[11px] font-black uppercase text-gray-700 block mb-1">
                                    Referencia de Molde
                                </label>
                                <input
                                    type="text"
                                    value={editMolde}
                                    onChange={(e) => setEditMolde(e.target.value)}
                                    placeholder="Ej: M-102"
                                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs font-bold text-[#254153] focus:border-[#254153] outline-none uppercase"
                                />
                            </div>

                            {/* Defectos */}
                            <div>
                                <label className="text-[11px] font-black uppercase text-gray-700 block mb-1">
                                    Defectos Asignados
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-gray-50 border border-gray-200 rounded min-h-[40px]">
                                    {editDefectsList.length === 0 ? (
                                        <span className="text-xs text-gray-400 italic">No hay defectos asignados</span>
                                    ) : (
                                        editDefectsList.map((dName, idx) => (
                                            <span key={idx} className="px-2.5 py-1 bg-white border border-gray-300 rounded text-xs font-bold text-[#254153] flex items-center gap-1 shadow-2xs">
                                                <span>{dName}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditDefectsList(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>

                                {/* Add defect from catalog */}
                                <div className="flex gap-2">
                                    <select
                                        value={editSelectedDefectInput}
                                        onChange={(e) => setEditSelectedDefectInput(e.target.value)}
                                        className="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-medium text-gray-700"
                                    >
                                        <option value="">-- Agregar defecto del catálogo --</option>
                                        {defectsCatalog.map(d => {
                                            const name = d.defecto || d.Defecto || d.nombre || d.Nombre || ''
                                            return <option key={d.id} value={name}>{name}</option>
                                        })}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editSelectedDefectInput && !editDefectsList.includes(editSelectedDefectInput)) {
                                                setEditDefectsList(prev => [...prev, editSelectedDefectInput])
                                                setEditSelectedDefectInput('')
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-[#254153] text-white text-xs font-bold rounded hover:bg-black transition-colors"
                                    >
                                        Agregar
                                    </button>
                                </div>
                            </div>

                            {/* Foto */}
                            <div>
                                <label className="text-[11px] font-black uppercase text-gray-700 block mb-1">
                                    Foto de Evidencia
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={editFileInputRef}
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setEditPhotoFile(e.target.files[0])
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => editFileInputRef.current?.click()}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs font-bold text-[#254153] flex items-center gap-1.5"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>{editPhotoFile ? 'Cambiar archivo seleccionado' : 'Subir / Tomar nueva foto'}</span>
                                    </button>
                                    {editPhotoFile ? (
                                        <span className="text-xs font-bold text-green-600 truncate max-w-xs">
                                            {editPhotoFile.name}
                                        </span>
                                    ) : selectedDetailReport.fotoUrl ? (
                                        <span className="text-xs text-gray-500">Conserva la foto actual</span>
                                    ) : (
                                        <span className="text-xs text-gray-400">Sin foto actualmente</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded font-black text-xs uppercase tracking-wider shadow-2xs"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-black text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                            >
                                {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULLSCREEN IMAGE MODAL */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img 
                            src={selectedImage} 
                            alt="Evidencia fotográfica ampliada" 
                            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl" 
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* POPUP DE CONFIRMACIÓN DE ELIMINACIÓN */}
            {deleteConfirmReport && (
                <div className="fixed inset-0 bg-black/60 z-[70] backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-black text-[#254153] uppercase tracking-wide">
                                        ¿Eliminar este registro?
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                                        ¿Estás seguro de que deseas eliminar permanentemente el registro{' '}
                                        <span className="font-black text-red-600">#{deleteConfirmReport.id}</span>
                                        {deleteConfirmReport.producto?.Referencia && (
                                            <> ({deleteConfirmReport.producto.Referencia})</>
                                        )}? Esta acción removerá el reporte de la base de datos y no se puede deshacer.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmReport(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteReport}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
