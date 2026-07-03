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
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4" style={{ backgroundColor: '#f8fafc' }}>
                <Loader2 className="h-12 w-12 animate-spin" style={{ color: 'var(--brand-primary)' }} />
                <p className="font-medium" style={{ color: '#6b7280' }}>Cargando plantas...</p>
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
        <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#f8fafc', color: '#18181b' }}>
            {/* Dark Header */}
            <header className="p-4 flex items-center shadow-md relative z-10" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => router.push('/hdt')}
                        className="p-2 rounded-full transition-colors"
                        style={{ color: 'white' }}
                        onMouseOver={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                        onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                    <div className="flex items-center gap-3 pb-6" style={{ borderBottom: '1px solid #e4e4e7' }}>
                        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'rgba(27,65,84,0.10)' }}>
                            <Factory className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>Plantas disponibles</h2>
                            <p className="font-medium" style={{ color: '#6b7280' }}>Selecciona una planta para ver su listado de HDTs</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin" style={{ color: 'var(--brand-primary)' }} />
                            <p className="font-medium animate-pulse" style={{ color: '#6b7280' }}>Consultando base de datos...</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-3xl p-8 flex flex-col items-center text-center space-y-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
                            <AlertCircle className="h-12 w-12" style={{ color: '#ef4444' }} />
                            <p className="text-lg font-medium" style={{ color: '#991b1b' }}>{error}</p>
                            <button onClick={() => window.location.reload()} className="px-6 py-2 rounded-xl font-bold text-white" style={{ backgroundColor: '#dc2626' }}>Reintentar</button>
                        </div>
                    ) : plants.length === 0 ? (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed rounded-3xl p-16 flex flex-col items-center text-center space-y-6 bg-white" style={{ borderColor: '#e4e4e7' }}>
                                <div className="p-5 rounded-full" style={{ backgroundColor: '#fffbeb' }}>
                                    <LayoutGrid className="h-12 w-12" style={{ color: '#f59e0b' }} />
                                </div>
                                <p className="text-xl font-bold" style={{ color: '#6b7280' }}>No se encontraron plantas disponibles.</p>
                                <p className="font-medium max-w-md" style={{ color: '#9ca3af' }}>
                                    {totalCount === 0
                                        ? 'La base de datos respondió correctamente, pero la tabla está vacía (0 registros detectados).'
                                        : `Se encontraron ${totalCount} registros, pero no logramos identificar el nombre de la planta.`}
                                </p>
                            </div>
                            <div className="rounded-2xl p-6" style={{ backgroundColor: 'rgba(244,244,245,0.5)', border: '1px solid #e4e4e7' }}>
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#9ca3af' }}>Detalles técnicos</h3>
                                <pre className="text-[10px] sm:text-xs font-mono p-4 rounded-xl overflow-x-auto" style={{ backgroundColor: '#18181b', color: '#4ade80' }}>
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
                                    className="group bg-white p-8 rounded-3xl flex items-center justify-between transition-all duration-300 text-left"
                                    style={{ border: '2px solid rgba(27,65,84,0.05)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                                    onMouseOver={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-primary)'
                                        ;(e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'
                                        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px -15px rgba(27,65,84,0.15)'
                                    }}
                                    onMouseOut={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(27,65,84,0.05)'
                                        ;(e.currentTarget as HTMLElement).style.backgroundColor = 'white'
                                        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                                    }}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'rgba(27,65,84,0.05)' }}>
                                            <Factory className="h-7 w-7" style={{ color: 'var(--brand-primary)' }} />
                                        </div>
                                        <span className="text-xl font-bold capitalize transition-transform duration-300" style={{ color: 'var(--brand-primary)' }}>
                                            {planta.toLowerCase()}
                                        </span>
                                    </div>
                                    <ChevronRight className="h-6 w-6" style={{ color: '#d4d4d8' }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="p-8 text-center bg-transparent">
                <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#9ca3af' }}>
                    Firplak S.A. | Planta de Producción
                </p>
            </footer>
        </div>
    )
}
