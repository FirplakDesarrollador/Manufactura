'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Factory, Loader2, ChevronRight, AlertCircle, LayoutGrid } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/hdt/database.types'

type HdtRow = Database['public']['Tables']['hdts']['Row']

export default function HdtPlantsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-[#F6F3EE]">
                <Loader2 className="h-12 w-12 animate-spin text-[#324354]" />
                <p className="font-medium text-slate-500 font-sans">Cargando plantas...</p>
            </div>
        }>
            <PlantsContent />
        </Suspense>
    )
}

function PlantsContent() {
    const [plants, setPlants] = useState<string[]>([])
    const [totalCount, setTotalCount] = useState<number | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [debugInfo, setDebugInfo] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const action = searchParams.get('action') || 'view'

    useEffect(() => {
        const fetchPlants = async () => {
            try {
                setLoading(true)
                setError(null)
                setDebugInfo(null)

                const { data: { user }, error: authError } = await supabase.auth.getUser()
                if (authError || !user) { router.push('/login'); return }

                const { data, error: fetchError } = await supabase.from('hdts').select('*')

                if (fetchError) { setDebugInfo({ error: fetchError }); throw fetchError }

                setDebugInfo({ rowsFound: data?.length || 0, firstRowKeys: data?.[0] ? Object.keys(data[0]) : [], userId: user.id })

                if (data) {
                    setTotalCount(data.length)
                    const firstRow = data[0]
                    const plantaKey = firstRow ? Object.keys(firstRow).find(key => key.toLowerCase() === 'planta') : 'planta'
                    const uniquePlants = Array.from(new Set(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data.map((item: any) => item[plantaKey || 'planta'])
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .filter((p: any) => p !== null && p !== undefined && String(p).trim() !== '')
                    )) as string[]
                    setPlants(uniquePlants.sort())
                }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                console.error('Error fetching plants:', err)
                setError(`Error de datos: ${err.message}`)
            } finally {
                setLoading(false)
            }
        }
        fetchPlants()
    }, [router])

    return (
        <div className="min-h-screen flex flex-col font-sans bg-[#F6F3EE] text-[#000000]">
            {/* Dark Header */}
            <header className="p-4 flex items-center shadow-md relative z-10 bg-[#324354]">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => router.push('/hdt')}
                        className="p-2 rounded-full transition-colors hover:bg-white/10 text-white"
                        title="Volver"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex-1 text-center">
                    <h1 className="text-white text-2xl font-normal tracking-tight">Selecciona Planta</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-12">
                <div className="space-y-8">
                    <div className="flex items-center gap-3 pb-6 border-b border-[#e2ded5]">
                        <div className="p-3 rounded-2xl bg-[#324354]/10">
                            <Factory className="h-8 w-8 text-[#324354]" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-[#324354]">Plantas disponibles</h2>
                            <p className="font-medium text-slate-500">Selecciona una planta para ver su listado de HDTs</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-[#324354]" />
                            <p className="font-medium animate-pulse text-slate-500">Consultando base de datos...</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-3xl p-8 flex flex-col items-center text-center space-y-4 bg-red-50 border border-red-200">
                            <AlertCircle className="h-12 w-12 text-red-500" />
                            <p className="text-lg font-medium text-red-700">{error}</p>
                            <button onClick={() => window.location.reload()} className="px-6 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700">Reintentar</button>
                        </div>
                    ) : plants.length === 0 ? (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed rounded-3xl p-16 flex flex-col items-center text-center space-y-6 bg-white border-[#e2ded5]">
                                <div className="p-5 rounded-full bg-amber-50">
                                    <LayoutGrid className="h-12 w-12 text-amber-500" />
                                </div>
                                <p className="text-xl font-bold text-slate-600">No se encontraron plantas disponibles.</p>
                                <p className="font-medium max-w-md text-slate-400">
                                    {totalCount === 0
                                        ? 'La base de datos respondió correctamente, pero la tabla está vacía (0 registros detectados).'
                                        : `Se encontraron ${totalCount} registros, pero no logramos identificar el nombre de la planta.`}
                                </p>
                            </div>
                            <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200">
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-400">Detalles técnicos</h3>
                                <pre className="text-[10px] sm:text-xs font-mono p-4 rounded-xl overflow-x-auto bg-slate-900 text-emerald-400">
                                    {JSON.stringify(debugInfo, null, 2)}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plants.map((planta) => (
                                <button
                                    key={planta}
                                    onClick={() => router.push(`/hdt/list?planta=${encodeURIComponent(planta)}&action=${action}`)}
                                    className="group bg-white p-8 rounded-3xl flex items-center justify-between transition-all duration-300 text-left border border-[#e2ded5] hover:border-[#324354] hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)]"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-slate-50 transition-colors duration-300 group-hover:bg-[#324354]/10">
                                            <Factory className="h-7 w-7 text-[#324354]" />
                                        </div>
                                        <span className="text-xl font-bold capitalize text-[#324354]">
                                            {planta.toLowerCase()}
                                        </span>
                                    </div>
                                    <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-[#324354] transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="p-8 text-center border-t border-[#e2ded5]">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400">
                    Firplak S.A. | Planta de Producción
                </p>
            </footer>
        </div>
    )
}
