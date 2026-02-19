'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { DefectCard } from '@/components/calidad/DefectCard'

export default function CalidadMsReportPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<any[]>([])
    const [defects, setDefects] = useState<any[]>([])
    const [todaysReports, setTodaysReports] = useState<any[]>([])
    const [stats, setStats] = useState({
        buenos: 0,
        defectuosos: 0,
        total: 0,
        ifi: 0
    })

    const [selectedProduct, setSelectedProduct] = useState<string>('')
    const [selectedDefects, setSelectedDefects] = useState<Record<number, boolean>>({})

    const fetchData = async () => {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
            router.push('/login')
            return
        }
        setUser(userData.user)

        const [productsRes, defectsRes, reportsRes] = await Promise.all([
            supabase.from('productos_defectos_ms').select('*').order('Referencia'),
            supabase.from('ms_defectos').select('*').order('id'),
            supabase.from('query_ms_reporte_defectos_dia').select('*')
        ])

        if (productsRes.data) setProducts(productsRes.data)
        if (defectsRes.data) setDefects(defectsRes.data)
        if (reportsRes.data) {
            setTodaysReports(reportsRes.data)
            calculateStats(reportsRes.data)
        }

        setLoading(false)
    }

    const calculateStats = (reports: any[]) => {
        const total = reports.length
        const defectuosos = reports.filter(r => r.defectos_lista && r.defectos_lista !== '').length
        const buenos = total - defectuosos
        const ifi = total > 0 ? (buenos / total) * 100 : 0

        setStats({ buenos, defectuosos, total, ifi })
    }

    useEffect(() => {
        fetchData()
    }, [router])

    const getDefectCount = (defectName: string) => {
        if (!todaysReports || !defectName) return 0
        let count = 0
        todaysReports.forEach(report => {
            if (report.defectos_lista && report.defectos_lista.toLowerCase().includes(defectName.toLowerCase())) {
                count++
            }
        })
        return count
    }

    const handleToggleDefect = (id: number) => {
        setSelectedDefects(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const handleSave = async () => {
        if (!selectedProduct) {
            alert('Por favor selecciona un producto')
            return
        }

        const selectedDefectNames = defects
            .filter(d => selectedDefects[d.id])
            .map(d => ({ defecto: d.defecto || d.Defecto || d.nombre || d.Nombre }))

        const reportData = {
            producto_id: parseInt(selectedProduct),
            create_by: user.id,
            defecto: selectedDefectNames,
            created_at: new Date().toISOString()
        }

        const { error } = await supabase.from('ms_reporte_defectos').insert(reportData)
        if (error) {
            console.error('Error saving report:', error)
            alert('Error al guardar el reporte')
        } else {
            await fetchData()
            setSelectedDefects({})
            setSelectedProduct('')
            alert('Reporte guardado exitosamente')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                    <div className="text-white text-xs font-black tracking-[0.5em] uppercase animate-pulse">Initializing System</div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            {/* Professional Header - Full Width */}
            <header className="bg-[#254153] text-white sticky top-0 z-50 px-4">
                <div className="mx-auto h-14 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => router.push('/calidad')}
                            className="p-1.5 hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div className="flex items-center space-x-3">
                            <span className="text-xl font-black tracking-tighter italic">FIRPLAK</span>
                            <div className="h-4 w-px bg-white/20" />
                            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-60">MS Quality Control</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:block text-right">
                            <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block leading-none">Terminal Activa</span>
                            <span className="text-xs font-bold text-blue-400">{user?.email}</span>
                        </div>
                        <button
                            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                            className="p-1.5 hover:bg-red-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Control Bar - Full Width */}
            <div className="bg-gray-50 border-b border-gray-200 sticky top-[56px] z-40">
                <div className="max-w-full px-4 py-3 flex flex-wrap items-center gap-6">
                    <div className="flex-1 min-w-[300px]">
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-[#254153] font-black text-base focus:border-[#254153] outline-none transition-all appearance-none"
                        >
                            <option value="">-- SELECCIONAR REFERENCIA DE PRODUCTO --</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.Referencia}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleSave}
                            className="flex items-center space-x-2 px-6 py-2.5 bg-[#254153] text-white font-black uppercase tracking-widest text-xs hover:bg-black transition-all"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                            </svg>
                            <span>Ejecutar Registro</span>
                        </button>
                        <button
                            onClick={() => router.push('/calidad/ms/list')}
                            className="p-2.5 bg-white border border-gray-300 text-[#254153] hover:bg-gray-50"
                            title="Ver Reportes del Día"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-200 hidden lg:block" />

                    {/* Quick Metrics */}
                    <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-none shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">OK:</span>
                            <span className="text-lg font-black text-green-600">{stats.buenos}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-none shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">DEF:</span>
                            <span className="text-lg font-black text-red-600">{stats.defectuosos}</span>
                        </div>
                        <div className="flex flex-col items-center px-4 border-l border-gray-200">
                            <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Eficiencia</span>
                            <span className="text-xl font-black text-blue-600 leading-none">{stats.ifi.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col items-center px-4 border-l border-gray-200">
                            <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Total</span>
                            <span className="text-xl font-black text-[#254153] leading-none">{stats.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid - Full Width No Padding constraint */}
            <main className="flex-1 w-full bg-gray-50 p-1">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 3xl:grid-cols-12 gap-1">
                    {defects.map((defect, index) => {
                        const defectName = defect.defecto || defect.Defecto || defect.nombre || defect.Nombre || 'Defecto'
                        return (
                            <DefectCard
                                key={defect.id}
                                index={defect.id || index + 1}
                                title={defectName}
                                count={getDefectCount(defectName)}
                                isSelected={!!selectedDefects[defect.id]}
                                onToggle={() => handleToggleDefect(defect.id)}
                            />
                        )
                    })}
                </div>
            </main>

            <footer className="py-4 px-4 bg-[#254153] text-[9px] font-bold text-white/30 uppercase tracking-[0.5em] flex justify-between items-center">
                <span>© {new Date().getFullYear()} ImpacSoft Engineering</span>
                <span>Secure Terminal v4.0.2</span>
            </footer>
        </div>
    )
}
