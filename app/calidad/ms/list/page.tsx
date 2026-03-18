'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Search, X, ChevronLeft, Filter, Calendar as CalendarIcon } from 'lucide-react'
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

    interface MSReportQueryResult {
        id: number
        created_at: string
        create_by: number
        defecto: string | DefectItem[]
        producto_id: number
        Molde: string
        producto?: {
            Referencia: string
        }
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
    }

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProduct, setSelectedProduct] = useState('')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

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

        const [reportsRes, productsRes] = await Promise.all([
            supabase
                .from('ms_reporte_defectos')
                .select(`
                    *,
                    producto:productos_defectos_ms (Referencia)
                `)
                .gte('created_at', queryStart)
                .lte('created_at', queryEnd)
                .order('created_at', { ascending: false }),
            supabase.from('productos_defectos_ms').select('*').order('Referencia')
        ])

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

            // Calculate total pieces stats (each record = 1 piece inspected)
            const filteredByDate = typedData.filter(r =>
                new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) === selectedDate
            )
            const totalPieces = filteredByDate.length
            const defectivePieces = filteredByDate.filter(r => {
                const defects = Array.isArray(r.defecto) ? r.defecto : []
                return defects.length > 0
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
                            hora_registro: new Date(r.created_at).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'America/Bogota'
                            }),
                            Molde: r.Molde
                        }
                    }

                    groupedMap[key].cantidad += 1
                    groupedMap[key].productos.add(r.producto?.Referencia || r.producto_id?.toString() || 'Sin Producto')
                    if (!groupedMap[key].reporters.has(usersMap[r.create_by] || 'Anónimo')) {
                        groupedMap[key].reporters.add(usersMap[r.create_by] || 'Anónimo')
                    }
                })
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

    const filteredReports = reports.filter(report => {
        const matchesProductFilter = selectedProduct === '' || report.productos_lista.includes(String(selectedProduct))
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = searchTerm === '' ||
            (report.productos_lista.toLowerCase().includes(searchLower)) ||
            (report.defecto_especifico && report.defecto_especifico.toLowerCase().includes(searchLower)) ||
            (report.creado_por && report.creado_por.toLowerCase().includes(searchLower))

        return matchesProductFilter && matchesSearch
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
                        onClick={() => router.back()}
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
                                setLoading(true)
                                setSelectedDate(e.target.value)
                            }}
                            className="w-full bg-white border border-gray-300 rounded-none px-4 py-2 text-xs font-black text-[#254153] focus:border-[#254153] outline-none pl-10"
                        />
                    </div>

                    {/* Product Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-none font-black text-xs text-[#254153] outline-none focus:border-[#254153]"
                        >
                            <option value="">-- TODAS LAS REFERENCIAS --</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id.toString()}>{p.Referencia}</option>
                            ))}
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
                                    className="bg-white border border-gray-100 border-l-4 border-l-red-600 p-3 hover:shadow-lg transition-all flex flex-col justify-between aspect-square group overflow-hidden relative shadow-sm"
                                >
                                    <div className="absolute top-0 right-0 bg-red-600 text-white px-2 py-0.5 text-[14px] font-bold z-20 shadow-sm">
                                        {report.cantidad}
                                    </div>

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
                                            <span className="text-xl font-black text-red-600">{filteredReports.reduce((acc, curr) => acc + curr.cantidad, 0)}</span>
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
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#dc2626' : '#254153'} />
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
        </div>
    )
}
