'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Search, X, ChevronLeft, Filter, Calendar as CalendarIcon, Trash2, Edit, Clock } from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts'

export default function ReportedDefectsListPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState<ReportDefectItem[]>([])
    const [products, setProducts] = useState<ProductMS[]>([])

    interface ProductMS {
        id: number
        Referencia: string
    }

    interface DefectItem {
        defecto?: string
        Defecto?: string
        nombre?: string
        Nombre?: string
    }

    interface DefectoMS {
        id: number
        defecto?: string
        Defecto?: string
        nombre?: string
        Nombre?: string
        Requiere_Foto?: boolean
        Requiere_Referencia_Molde?: boolean
    }

    interface MSReportQueryResult {
        id: number
        created_at: string
        create_by: number
        defecto: string | DefectItem[]
        producto_id: number
        Molde: string
        Molde: string
        producto?: {
            Referencia: string
        }
        fotoUrl?: string
    }

    interface ReportDefectItem {
        id: string
        defecto_especifico: string
        cantidad: number
        productos_lista: string
        creado_por: string
        reporters: Set<string>
        productos: Set<string>
        hora_registro: string
        Molde: string
        fotos: { url: string, referencia: string, hora: string }[]
        detalles: { id: number, producto_id: number, referencia: string, hora: string, rawHora: string, usuario: string, fotoUrl?: string, molde?: string, rawDefectos: any[] }[]
    }

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProduct, setSelectedProduct] = useState('')
    const [selectedDefect, setSelectedDefect] = useState('')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [modalStartTime, setModalStartTime] = useState('')
    const [modalEndTime, setModalEndTime] = useState('')
    const [modalProductSearch, setModalProductSearch] = useState('')
    const [selectedDetails, setSelectedDetails] = useState<{title: string, items: { id: number, producto_id: number, referencia: string, hora: string, rawHora: string, usuario: string, fotoUrl?: string, rawDefectos: any[] }[]} | null>(null)
    const [editRecord, setEditRecord] = useState<{ id: number, referencia: string, currentFotoUrl?: string, currentMolde?: string } | null>(null)
    const [editSelectedProductId, setEditSelectedProductId] = useState<string>('')
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
    const [editMoldeInputValue, setEditMoldeInputValue] = useState('')
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
    const [defectosCatalog, setDefectosCatalog] = useState<DefectoMS[]>([])
    const [editSelectedDefects, setEditSelectedDefects] = useState<Record<string, boolean>>({})
    const [editDefectSearch, setEditDefectSearch] = useState('')

    // Stats for total pieces
    const [pieceStats, setPieceStats] = useState({
        total: 0,
        buenos: 0,
        defectuosos: 0,
        eficiencia: 0
    })

    const fetchData = useCallback(async () => {
        // No synchronous setLoading(true) here to avoid cascading render error in useEffect

        const day = new Date(selectedDate)
        const nextDay = new Date(day)
        nextDay.setDate(day.getDate() + 1)
        const nextDayStr = nextDay.toISOString().split('T')[0]

        const queryStart = `${selectedDate}T00:00:00Z`
        const queryEnd = `${nextDayStr}T12:00:00Z`

        const [reportsRes, productsRes, defectosRes] = await Promise.all([
            supabase
                .from('ms_reporte_defectos')
                .select(`
                    *,
                    producto:productos_defectos_ms (Referencia)
                `)
                .gte('created_at', queryStart)
                .lte('created_at', queryEnd)
                .order('created_at', { ascending: false }),
            supabase.from('productos_defectos_ms').select('*').order('Referencia'),
            supabase.from('ms_defectos').select('*').order('id')
        ])

        if (defectosRes.data) setDefectosCatalog(defectosRes.data)

        if (reportsRes.data) {
            const typedData = reportsRes.data as unknown as MSReportQueryResult[]
            const userIds = [...new Set(typedData.map(r => r.create_by))].filter(Boolean)
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

            // --- DEBUG START ---
            const { data: diaData } = await supabase.from('query_ms_reporte_defectos_dia').select('id')
            if (diaData) {
                const diaIds = new Set(diaData.map(d => d.id))
                const missing = typedData.filter(r => !diaIds.has(r.id))
                console.log('Missing from view:', missing.map(m => ({ id: m.id, defecto: m.defecto, Molde: m.Molde, Reparacion: (m as any).Reparacion })))
            }
            // --- DEBUG END ---

            // Excluded defects logic based on query_ms_ifi_dia and user request
            const isIgnoredDefect = (defectName: string) => {
                const cleanName = defectName.replace(/^\s*\d+\.\s*/, '').trim().toLowerCase()
                return [
                    'saldos/destrucciones',
                    'opaco',
                    'error en pedido referencia',
                    'quebrados logistica'
                ].includes(cleanName)
            }

            // Calculate total pieces stats (each record = 1 piece inspected)
            const filteredByDate = typedData.filter(r =>
                new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) === selectedDate
            )
            const totalPieces = filteredByDate.length
            
            const defectivePieces = filteredByDate.filter(r => {
                const defects = Array.isArray(r.defecto) ? r.defecto : []
                const validDefects = defects.filter(d => {
                    const name = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)
                    if (!name) return false
                    return !isIgnoredDefect(name)
                })
                return validDefects.length > 0
            }).length
            
            const goodPieces = totalPieces - defectivePieces
            const efficiency = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0

            setPieceStats({
                total: totalPieces,
                buenos: goodPieces,
                defectuosos: defectivePieces,
                eficiencia: efficiency
            })

            const groupedMap: Record<string, ReportDefectItem> = {}

            filteredByDate.forEach(r => {
                const defects = Array.isArray(r.defecto) ? r.defecto : []
                
                const validDefects = defects.filter(d => {
                    const name = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)
                    if (!name) return false
                    return !isIgnoredDefect(name)
                })

                if (validDefects.length === 0) {
                    const key = 'SIN DEFECTOS'
                    if (!groupedMap[key]) {
                        groupedMap[key] = {
                            id: key,
                            defecto_especifico: key,
                            cantidad: 0,
                            productos_lista: '',
                            creado_por: '',
                            reporters: new Set(),
                            productos: new Set(),
                            hora_registro: new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z').toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'UTC'
                            }),
                            Molde: r.Molde,
                            fotos: [],
                            detalles: []
                        }
                    }
                    groupedMap[key].cantidad += 1
                    groupedMap[key].productos.add(r.producto?.Referencia || r.producto_id?.toString() || 'Sin Producto')
                    if (!groupedMap[key].reporters.has(usersMap[r.create_by] || 'Anónimo')) {
                        groupedMap[key].reporters.add(usersMap[r.create_by] || 'Anónimo')
                    }
                    groupedMap[key].detalles.push({
                        id: r.id,
                        producto_id: r.producto_id,
                        referencia: r.producto?.Referencia || r.producto_id?.toString() || 'Sin Referencia',
                        hora: new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z').toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'UTC'
                        }),
                        rawHora: new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z').toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'UTC'
                        }).substring(0, 5),
                        usuario: usersMap[r.create_by] || 'Anónimo',
                        fotoUrl: r.fotoUrl,
                        molde: r.Molde,
                        rawDefectos: Array.isArray(r.defecto) ? r.defecto : []
                    })
                } else {
                    defects.forEach(d => {
                        const defectName = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)
                        if (!defectName) return

                        const key = defectName

                        if (!groupedMap[key]) {
                            groupedMap[key] = {
                                id: key,
                                defecto_especifico: defectName,
                                cantidad: 0,
                                productos_lista: '',
                                creado_por: '',
                                reporters: new Set(),
                                productos: new Set(),
                                hora_registro: new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z').toLocaleTimeString('es-CO', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                    timeZone: 'UTC'
                                }),
                                Molde: r.Molde,
                                fotos: [],
                                detalles: []
                            }
                        }

                        groupedMap[key].cantidad += 1
                        groupedMap[key].productos.add(r.producto?.Referencia || r.producto_id?.toString() || 'Sin Producto')
                        if (!groupedMap[key].reporters.has(usersMap[r.create_by] || 'Anónimo')) {
                            groupedMap[key].reporters.add(usersMap[r.create_by] || 'Anónimo')
                        }
                        
                        const horaStr = new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z').toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'UTC'
                        })

                        groupedMap[key].detalles.push({
                            id: r.id,
                            producto_id: r.producto_id,
                            referencia: r.producto?.Referencia || r.producto_id?.toString() || 'Sin Referencia',
                            hora: horaStr,
                            rawHora: new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z').toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                                timeZone: 'UTC'
                            }).substring(0, 5),
                            usuario: usersMap[r.create_by] || 'Anónimo',
                            fotoUrl: r.fotoUrl,
                            molde: r.Molde,
                            rawDefectos: Array.isArray(r.defecto) ? r.defecto : []
                        })

                        if (r.fotoUrl) {
                            groupedMap[key].fotos.push({
                                url: r.fotoUrl,
                                referencia: r.producto?.Referencia || r.producto_id?.toString() || 'Sin Referencia',
                                hora: horaStr
                            })
                        }
                    })
                }
            })

            const finalReports = Object.values(groupedMap)
                .map(item => ({
                    ...item,
                    creado_por: Array.from(item.reporters).join(', '),
                    productos_lista: Array.from(item.productos).join(', ')
                }))
                .sort((a, b) => b.cantidad - a.cantidad)

            setReports(finalReports)
        }

        if (productsRes.data) setProducts(productsRes.data)
        setLoading(false)
    }, [selectedDate])

    useEffect(() => {
        const load = async () => {
            await fetchData()
        }
        void load()
    }, [fetchData])

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar el registro completo de esta pieza (incluyendo todos sus defectos)?')) return
        setLoading(true)
        const { error } = await supabase.from('ms_reporte_defectos').delete().eq('id', id)
        if (error) {
            alert('Error al eliminar: ' + error.message)
            setLoading(false)
        } else {
            setSelectedDetails(null)
            await fetchData()
        }
    }

    const handleSaveEdit = async () => {
        if (!editRecord || !editSelectedProductId) return
        setLoading(true)
        setIsUploadingPhoto(true)

        let newFotoUrl = editRecord.currentFotoUrl

        if (editPhotoFile) {
            const fileName = `ms-defectos/${Date.now()}-${editPhotoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
            const { error: uploadError } = await supabase.storage
                .from('fichas-media')
                .upload(fileName, editPhotoFile)

            if (uploadError) {
                console.error('Error uploading photo:', uploadError)
                alert('Error al subir la foto')
                setLoading(false)
                setIsUploadingPhoto(false)
                return
            }

            const { data } = supabase.storage.from('fichas-media').getPublicUrl(fileName)
            newFotoUrl = data.publicUrl
        }

        const updateData: any = { 
            producto_id: parseInt(editSelectedProductId),
            defecto: Object.entries(editSelectedDefects)
                .filter(([_, isChecked]) => isChecked)
                .map(([name]) => ({ defecto: name }))
        }
        if (newFotoUrl !== editRecord.currentFotoUrl) {
            updateData.fotoUrl = newFotoUrl
        }
        updateData.Molde = editMoldeInputValue.trim() || null

        const { error } = await supabase.from('ms_reporte_defectos').update(updateData).eq('id', editRecord.id)
        
        setIsUploadingPhoto(false)
        if (error) {
            alert('Error al actualizar: ' + error.message)
            setLoading(false)
        } else {
            setEditRecord(null)
            setEditPhotoFile(null)
            setSelectedDetails(null)
            await fetchData()
        }
    }

    const filteredReports = reports.filter(report => {
        const matchesProductFilter = selectedProduct === '' || report.productos_lista.includes(String(selectedProduct))
        const matchesDefectFilter = selectedDefect === '' || report.defecto_especifico === selectedDefect
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = searchTerm === '' ||
            (report.productos_lista.toLowerCase().includes(searchLower)) ||
            (report.defecto_especifico && report.defecto_especifico.toLowerCase().includes(searchLower)) ||
            (report.creado_por && report.creado_por.toLowerCase().includes(searchLower))

        return matchesProductFilter && matchesDefectFilter && matchesSearch
    })

    if (loading && reports.length === 0) {
        return (
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            {/* Professional Header */}
            <header className="bg-[#254153] text-white px-4 h-14 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push('/home')}
                        className="p-1 hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black tracking-widest uppercase">Consulta de Defectos</h1>
                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter italic">Engineered by Firplak Quality</span>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                        <span className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] block">Base de Datos Activa</span>
                        <span className="text-xs font-black text-blue-400">ms_reporte_defectos</span>
                    </div>
                    <div className="w-10 h-10 bg-white/5 rounded-none border border-white/10 flex items-center justify-center">
                        <Filter className="w-5 h-5 opacity-40" />
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="bg-gray-50 border-b border-gray-200 p-2 sticky top-14 z-40">
                <div className="max-w-full flex flex-wrap items-center gap-2">

                    {/* Date Picker */}
                    <div className="flex-none w-44 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#254153]">
                            <CalendarIcon className="w-4 h-4" />
                        </div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value)
                            }}
                            className="w-full bg-white border border-gray-300 rounded-none px-4 py-2 text-xs font-black text-[#254153] focus:border-[#254153] outline-none pl-10"
                        />
                    </div>

                    {/* Product Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value)
                            }}
                            className="w-full px-4 py-2 bg-white border border-gray-300 font-black text-[#254153] text-xs outline-none focus:border-[#254153]"
                        >
                            <option value="">TODAS LAS REFERENCIAS</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id.toString()}>{p.Referencia}</option>
                            ))}
                        </select>
                    </div>

                    {/* Defect Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedDefect}
                            onChange={(e) => setSelectedDefect(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-300 font-black text-[#254153] text-xs outline-none focus:border-[#254153]"
                        >
                            <option value="">TODOS LOS DEFECTOS</option>
                            {defectosCatalog.map((d) => {
                                const name = d.defecto || d.Defecto || d.nombre || d.Nombre
                                if (!name) return null
                                return (
                                    <option key={d.id} value={name}>{name}</option>
                                )
                            })}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="flex-[2] min-w-[250px] relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="BUSCAR POR PRODUCTO O DEFECTO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-none font-black text-xs text-[#254153] outline-none focus:border-[#254153] uppercase placeholder:text-gray-300"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="bg-[#254153] text-white px-6 py-2 rounded-none text-xs font-black uppercase tracking-widest border border-black shadow-inner">
                        REGISTROS: {filteredReports.length}
                    </div>

                    {/* Piece Stats Summary */}
                    <div className="flex items-center space-x-4 ml-auto">
                        <div className="flex items-center space-x-1.5">
                            <div className="w-2 h-2 bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                            <span className="text-[10px] font-black text-gray-400 uppercase">OK:</span>
                            <span className="text-base font-black text-green-600">{pieceStats.buenos}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <div className="w-2 h-2 bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                            <span className="text-[10px] font-black text-gray-400 uppercase">DEF:</span>
                            <span className="text-base font-black text-red-600">{pieceStats.defectuosos}</span>
                        </div>
                        <div className="h-8 w-px bg-gray-300" />
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-gray-400 uppercase leading-none">Total Piezas</span>
                            <span className="text-lg font-black text-[#254153] leading-none">{pieceStats.total}</span>
                        </div>
                        <div className="flex flex-col items-center px-3 border-l border-gray-300">
                            <span className="text-[9px] font-black text-gray-400 uppercase leading-none">Eficiencia</span>
                            <span className={`text-lg font-black leading-none ${pieceStats.eficiencia >= 90 ? 'text-green-600' : pieceStats.eficiencia >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{pieceStats.eficiencia.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Grid - High Density "Cubos" */}
            <main className="flex-1 p-1 overflow-y-auto bg-gray-100">
                {loading && reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-12 h-12 border-2 border-gray-300 border-t-[#254153] rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Archivos...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 text-gray-300 bg-white m-1 border border-dashed border-gray-200">
                        <div className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-50">System Empty</div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No se detectaron fallos para esta selección</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
                            {filteredReports.map((report) => (
                                <div
                                    key={report.id}
                                    onClick={() => {
                                        setSelectedDetails({ title: report.defecto_especifico, items: report.detalles })
                                    }}
                                    className={`bg-white border border-gray-100 border-l-4 p-3 transition-all flex flex-col justify-between aspect-square group overflow-hidden relative shadow-sm cursor-pointer hover:shadow-lg hover:border-l-blue-600 ${report.defecto_especifico === 'SIN DEFECTOS' ? 'border-l-green-500' : 'border-l-red-600'}`}
                                >
                                    <div className={`absolute top-0 right-0 text-white px-2 py-0.5 text-[14px] font-bold z-20 shadow-sm transition-colors ${report.defecto_especifico === 'SIN DEFECTOS' ? 'bg-green-500 group-hover:bg-blue-600' : 'bg-red-600 group-hover:bg-blue-600'}`}>
                                        {report.cantidad}
                                    </div>
                                    
                                    {report.fotos && report.fotos.length > 0 && (
                                        <div className="absolute bottom-1 right-1 text-blue-500 opacity-50 group-hover:opacity-100">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}

                                    <div className="relative z-10 h-full flex flex-col pt-1">
                                        <div className="text-center px-1 flex-1 flex flex-col justify-center">
                                            <h2 className="text-[13px] font-black text-[#254153] leading-tight uppercase mb-2 break-all line-clamp-3">
                                                {report.defecto_especifico}
                                            </h2>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase line-clamp-3 leading-tight group-hover:text-gray-600">
                                                {report.productos_lista}
                                            </p>
                                        </div>

                                        <div className="mt-auto pt-2 border-t border-gray-50 flex flex-col items-center">
                                            <span className="text-[8px] font-black text-blue-600 uppercase leading-none truncate w-full text-center">
                                                {report.creado_por.split(',')[0].split(' ')[0]} {report.reporters.size > 1 ? `+${report.reporters.size - 1}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Analytics Section */}
                        {filteredReports.length > 0 && (
                            <div className="mt-8 mb-4 bg-white border border-gray-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                                    <div>
                                        <h2 className="text-sm font-black text-[#254153] uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1 h-4 bg-red-600" />
                                            Análisis de Incidencias (Pareto)
                                        </h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Frecuencia de defectos por tipo en la fecha seleccionada</p>
                                    </div>
                                    <div className="flex items-center space-x-6">
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-[#254153] opacity-30 uppercase block">Piezas Revisadas</span>
                                            <span className="text-xl font-black text-[#254153]">{pieceStats.total}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-green-600 opacity-60 uppercase block">Sin Defectos</span>
                                            <span className="text-xl font-black text-green-600">{pieceStats.buenos}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-red-600 opacity-60 uppercase block">Con Defectos</span>
                                            <span className="text-xl font-black text-red-600">{pieceStats.defectuosos}</span>
                                        </div>
                                        <div className="text-right border-l border-gray-200 pl-6">
                                            <span className="text-[10px] font-black text-blue-600 opacity-60 uppercase block">Eficiencia</span>
                                            <span className={`text-xl font-black ${pieceStats.eficiencia >= 90 ? 'text-green-600' : pieceStats.eficiencia >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{pieceStats.eficiencia.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-8 w-px bg-gray-200" />
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-[#254153] opacity-30 uppercase block">Total Defectos</span>
                                            <span className="text-xl font-black text-red-600">{filteredReports.filter(r => r.defecto_especifico !== 'SIN DEFECTOS').reduce((acc, curr) => acc + curr.cantidad, 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={filteredReports}
                                            layout="vertical"
                                            margin={{ top: 5, right: 60, left: 140, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="defecto_especifico"
                                                type="category"
                                                tick={{ fill: '#254153', fontSize: 10, fontWeight: 900 }}
                                                width={130}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f8f8f8' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-[#254153] text-white p-3 border border-black shadow-xl">
                                                                <p className="text-[10px] font-black uppercase mb-1 border-b border-white/10 pb-1">{data.defecto_especifico}</p>
                                                                <p className="text-[9px] font-bold opacity-70 mb-2">{data.productos_lista}</p>
                                                                <p className="text-[12px] font-black text-red-400">TOTAL: {data.cantidad}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar
                                                dataKey="cantidad"
                                                fill="#254153"
                                                radius={[0, 4, 4, 0]}
                                                barSize={24}
                                            >
                                                {filteredReports.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.defecto_especifico === 'SIN DEFECTOS' ? '#22c55e' : (index === (filteredReports[0]?.defecto_especifico === 'SIN DEFECTOS' ? 1 : 0) ? '#dc2626' : '#254153')} />
                                                ))}
                                                <LabelList
                                                    dataKey="cantidad"
                                                    position="right"
                                                    fill="#254153"
                                                    style={{ fontSize: '11px', fontWeight: 900 }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <footer className="p-3 bg-[#254153] text-[9px] font-black text-white/20 uppercase tracking-[1em] flex justify-center items-center">
                ESTACIÓN DE CALIDAD MS • SISTEMA CENTRALIZADO
            </footer>

            {/* Modal for Details */}
            {selectedDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-none shadow-2xl border-4 border-[#254153]">
                        <div className="flex justify-between items-center p-4 bg-[#254153] text-white">
                            <h3 className="font-black tracking-widest uppercase text-sm">DETALLES: {selectedDetails.title}</h3>
                            <button onClick={() => { setSelectedDetails(null); setModalProductSearch(''); setModalStartTime(''); setModalEndTime(''); }} className="p-1 hover:bg-white/10 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        {/* Modal Time Filter */}
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center space-x-2 flex-none bg-white border border-gray-300 px-3 py-1.5 shadow-sm">
                                <Clock className="w-3.5 h-3.5 text-[#254153]" />
                                <span className="text-[10px] font-black text-gray-400 uppercase mr-1">Rango:</span>
                                <input 
                                    type="time" 
                                    value={modalStartTime} 
                                    onChange={(e) => setModalStartTime(e.target.value)}
                                    className="text-xs font-black text-[#254153] outline-none bg-transparent"
                                />
                                <span className="text-xs font-bold text-gray-400">-</span>
                                <input 
                                    type="time" 
                                    value={modalEndTime} 
                                    onChange={(e) => setModalEndTime(e.target.value)}
                                    className="text-xs font-black text-[#254153] outline-none bg-transparent"
                                />
                                {(modalStartTime || modalEndTime) && (
                                    <button onClick={() => { setModalStartTime(''); setModalEndTime(''); }} className="ml-2 text-gray-400 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex items-center space-x-2 flex-none bg-white border border-gray-300 px-3 py-1.5 shadow-sm min-w-[200px]">
                                <Search className="w-3.5 h-3.5 text-[#254153]" />
                                <input 
                                    type="text" 
                                    list="modal-references-list"
                                    placeholder="Buscar por referencia..."
                                    value={modalProductSearch} 
                                    onChange={(e) => setModalProductSearch(e.target.value)}
                                    className="text-xs font-black text-[#254153] outline-none bg-transparent w-full uppercase placeholder:normal-case placeholder:font-bold"
                                />
                                <datalist id="modal-references-list">
                                    {Array.from(new Set(selectedDetails.items?.map(i => i.referencia))).sort().map(ref => (
                                        <option key={ref} value={ref} />
                                    ))}
                                </datalist>
                                {modalProductSearch && (
                                    <button onClick={() => setModalProductSearch('')} className="ml-2 text-gray-400 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <span className="text-[10px] font-black text-gray-400 uppercase ml-auto hidden sm:block">
                                Filtrando registros de esta pieza
                            </span>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto bg-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                                {selectedDetails.items?.filter(item => {
                                    if (modalStartTime || modalEndTime) {
                                        const hm = item.rawHora
                                        if (modalStartTime && modalEndTime && modalStartTime > modalEndTime) {
                                            if (!(hm >= modalStartTime || hm <= modalEndTime)) return false
                                        } else {
                                            if (modalStartTime && hm < modalStartTime) return false
                                            if (modalEndTime && hm > modalEndTime) return false
                                        }
                                    }
                                    if (modalProductSearch) {
                                        if (!item.referencia.toLowerCase().includes(modalProductSearch.toLowerCase())) {
                                            return false
                                        }
                                    }
                                    return true
                                }).map((item, i) => (
                                    <div key={i} className="flex flex-col bg-white border border-gray-300 shadow-sm overflow-hidden h-max">
                                    {item.fotoUrl && (
                                        <div className="aspect-square bg-gray-200 relative flex items-center justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.fotoUrl} alt={`Detalle ${i+1}`} className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div className="p-3 bg-white border-t border-gray-200">
                                        <p className="text-[10px] font-black text-[#254153] uppercase mb-1 truncate" title={item.referencia}>
                                            Ref: {item.referencia}
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">
                                                Hora: {item.hora}
                                            </p>
                                            <p className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-sm">
                                                {item.usuario.split(' ')[0]}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-end space-x-2 mt-3 pt-2 border-t border-gray-100">
                                            <button 
                                                onClick={() => { 
                                                    setEditSelectedProductId(item.producto_id.toString()); 
                                                    setEditPhotoFile(null); 
                                                    const initialDefects: Record<string, boolean> = {};
                                                    item.rawDefectos.forEach(d => {
                                                        const name = d.defecto || d.Defecto || d.nombre || d.Nombre;
                                                        if (name) initialDefects[name] = true;
                                                    });
                                                    setEditSelectedDefects(initialDefects);
                                                    setEditMoldeInputValue(item.molde || '');
                                                    setEditRecord({ id: item.id, referencia: item.referencia, currentFotoUrl: item.fotoUrl, currentMolde: item.molde }) 
                                                }}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Edit Modal */}
            {editRecord && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-4xl rounded-none shadow-2xl border-4 border-[#254153] flex flex-col max-h-[95vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 bg-[#254153] text-white">
                            <h3 className="font-black tracking-widest uppercase text-sm">Editar Producto</h3>
                            <button onClick={() => setEditRecord(null)} className="p-1 hover:bg-white/10 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex flex-col md:flex-row p-0 overflow-y-auto md:overflow-hidden h-full">
                            {/* LEFT COLUMN: Photo */}
                            <div className="w-full md:w-1/2 p-6 bg-gray-100 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 text-center tracking-widest">Fotografía de la Pieza</label>
                                {editRecord.currentFotoUrl ? (
                                    <div className="aspect-square bg-gray-200 relative flex items-center justify-center border border-gray-300 shadow-inner w-full max-w-sm mx-auto">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={editRecord.currentFotoUrl} alt="Foto actual" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[250px] border-2 border-dashed border-gray-300 bg-white p-4">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => setEditPhotoFile(e.target.files?.[0] || null)}
                                            className="w-full max-w-[250px] text-xs border border-gray-200 p-2 bg-gray-50 text-[#254153] mb-2"
                                        />
                                        {editPhotoFile ? (
                                            <p className="text-[10px] text-green-600 font-bold mt-1 text-center px-4">Archivo seleccionado:<br/>{editPhotoFile.name}</p>
                                        ) : (
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-50 mt-2">Sin imagen adjunta</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Info */}
                            <div className="w-full md:w-1/2 p-6 flex flex-col gap-5 overflow-y-auto">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Producto</label>
                                    <select
                                        value={editSelectedProductId}
                                        onChange={(e) => setEditSelectedProductId(e.target.value)}
                                        className="w-full px-3 py-3 bg-white border border-gray-300 font-bold text-xs text-[#254153] outline-none focus:border-[#254153]"
                                    >
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id.toString()}>{p.Referencia}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1 flex flex-col min-h-[200px]">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Defectos de la Pieza</label>
                                    <div className="mb-2 relative">
                                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="text"
                                            placeholder="Buscar defecto..."
                                            value={editDefectSearch}
                                            onChange={(e) => setEditDefectSearch(e.target.value)}
                                            className="w-full text-xs font-bold border border-gray-200 py-1.5 pl-8 pr-2 text-[#254153] outline-none focus:border-[#254153] uppercase placeholder:normal-case placeholder:font-normal"
                                        />
                                        {editDefectSearch && (
                                            <button onClick={() => setEditDefectSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto border border-gray-200 p-3 bg-gray-50">
                                        {defectosCatalog.filter(d => {
                                            const name = d.defecto || d.Defecto || d.nombre || d.Nombre
                                            if (!name) return false
                                            if (editDefectSearch && !name.toLowerCase().includes(editDefectSearch.toLowerCase())) return false
                                            return true
                                        }).map(d => {
                                            const name = d.defecto || d.Defecto || d.nombre || d.Nombre
                                            if (!name) return null
                                            return (
                                                <label key={d.id} className="flex items-start space-x-2 text-[10px] cursor-pointer hover:bg-gray-200 p-1 transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-3.5 h-3.5 mt-0.5 text-[#254153] border-gray-300 rounded-none focus:ring-[#254153]"
                                                        checked={!!editSelectedDefects[name]} 
                                                        onChange={(e) => setEditSelectedDefects({...editSelectedDefects, [name]: e.target.checked})} 
                                                    />
                                                    <span className="uppercase font-bold text-[#254153] leading-tight break-words pr-1">{name}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>

                                {Object.entries(editSelectedDefects).some(([name, isChecked]) => {
                                    if (!isChecked) return false
                                    const d = defectosCatalog.find(cat => (cat.defecto || cat.Defecto || cat.nombre || cat.Nombre) === name)
                                    return d?.Requiere_Referencia_Molde
                                }) && (
                                    <div className="mt-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Referencia de Molde <span className="text-red-500">* (Obligatorio)</span></label>
                                        <input 
                                            type="text" 
                                            value={editMoldeInputValue} 
                                            onChange={e => setEditMoldeInputValue(e.target.value)} 
                                            className="w-full text-xs font-bold border border-gray-300 py-2.5 px-3 text-[#254153] outline-none focus:border-[#254153] shadow-sm uppercase placeholder:normal-case placeholder:font-normal"
                                            placeholder="Ingrese el molde..."
                                        />
                                    </div>
                                )}

                                <button 
                                    onClick={handleSaveEdit}
                                    disabled={
                                        !editSelectedProductId || 
                                        isUploadingPhoto ||
                                        (Object.entries(editSelectedDefects).some(([name, isChecked]) => isChecked && defectosCatalog.find(c => (c.defecto || c.Defecto || c.nombre || c.Nombre) === name)?.Requiere_Foto) && !editRecord?.currentFotoUrl && !editPhotoFile) ||
                                        (Object.entries(editSelectedDefects).some(([name, isChecked]) => isChecked && defectosCatalog.find(c => (c.defecto || c.Defecto || c.nombre || c.Nombre) === name)?.Requiere_Referencia_Molde) && !editMoldeInputValue.trim())
                                    }
                                    className="mt-4 w-full bg-[#254153] text-white font-black text-xs uppercase py-4 hover:bg-[#1a2d3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shrink-0"
                                >
                                    {isUploadingPhoto ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Guardando Cambios...
                                        </>
                                    ) : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
