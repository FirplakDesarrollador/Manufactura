'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createExternalClient } from '@/lib/supabase/external'
import { HdtStatisticsDashboard } from '@/components/hdt/HdtStatisticsDashboard'
import Header from '@/components/opt-sistemica/Header'
import SubHeader from '@/components/hdt/SubHeader'

export default function HdtStatisticsPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hdts, setHdts] = useState<any[]>([])
    const [hdtSteps, setHdtSteps] = useState<any[]>([])
    const [empleados, setEmpleados] = useState<any[]>([])
    const [userEmail, setUserEmail] = useState('')
    const router = useRouter()

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true)
                setError(null)

                // 1. Auth check
                const { data: { user }, error: authError } = await supabase.auth.getUser()
                if (authError || !user) {
                    router.push('/login')
                    return
                }
                setUserEmail(user.email || '')

                // 2. Fetch active HDTs (is_current = true)
                const { data: hdtData, error: hdtErr } = await supabase
                    .from('hdts')
                    .select('*')
                    .eq('is_current', true)

                if (hdtErr) throw new Error(`Error cargando HDTs: ${hdtErr.message}`)

                // 3. Fetch steps
                const hdtIds = (hdtData || []).map(h => h.id)
                let stepsData: any[] = []
                
                if (hdtIds.length > 0) {
                    // Fetch steps for these HDTs to avoid loading deleted/draft steps
                    const { data: steps, error: stepsErr } = await supabase
                        .from('hdt_steps')
                        .select('*')
                        .in('hdt_id', hdtIds)

                    if (stepsErr) throw new Error(`Error cargando pasos de HDT: ${stepsErr.message}`)
                    stepsData = steps || []
                }

                // 4. Fetch Employees (from Talento Humano DB)
                let employeesData: any[] = []
                try {
                    const extClient = createExternalClient()
                    const { data: emps, error: empsErr } = await extClient
                        .from('empleados')
                        .select('nombreCompleto, cargo, planta, activo')
                        .eq('activo', true)

                    if (empsErr) {
                        console.error('Error fetching employees from TH database, falling back:', empsErr)
                    } else {
                        employeesData = emps || []
                    }
                } catch (extErr) {
                    console.error('Failed to query Talento Humano library:', extErr)
                }

                setHdts(hdtData || [])
                setHdtSteps(stepsData)
                setEmpleados(employeesData)

            } catch (err: any) {
                console.error('Error loadDashboardData:', err)
                setError(err.message || 'Error desconocido al cargar las estadísticas.')
            } finally {
                setLoading(false)
            }
        }

        loadDashboardData()
    }, [router])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-zinc-50 font-sans">
                <Loader2 className="h-12 w-12 animate-spin text-[#1b4154]" />
                <p className="font-bold text-[#1b4154] animate-pulse text-sm">Cargando Tablero de Estadísticas...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-sans p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full border border-red-100 flex flex-col items-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                    <h2 className="text-xl font-black text-red-700">Error al Cargar</h2>
                    <p className="text-sm text-zinc-500 font-medium leading-relaxed">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-xl text-sm font-black transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] w-full">
            <Header 
                title="HDT"
                subtitle="Estandarización"
                userEmail={userEmail}
                showLogout={true}
                onLogout={handleSignOut}
            />
            <SubHeader />
            <main className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-10">
                <HdtStatisticsDashboard hdts={hdts} hdtSteps={hdtSteps} empleados={empleados} />
            </main>
        </div>
    )
}
