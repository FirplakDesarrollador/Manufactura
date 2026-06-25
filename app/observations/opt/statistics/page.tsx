import { getAllOPTRecordsForStats } from '../actions'
import { StatisticsDashboard } from '@/components/opt/statistics/StatisticsDashboard'
import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'
import { createExternalClient } from '@/lib/supabase/external'

export const dynamic = 'force-dynamic'

export default async function StatisticsPage() {
    // Fetch all OPT data on the server
    const data = await getAllOPTRecordsForStats()

    // Fetch employees who can perform OPT observations (supervisors/leaders)
    const externalSupabase = createExternalClient()
    const { data: realizadoPorList } = await externalSupabase
        .from('empleados')
        .select('nombreCompleto')
        .eq('activo', true)
        .in('nivelCargo', ['Operario lider', 'Supervisor', 'Jefe', 'Coordinador', 'Director'])
        .order('nombreCompleto', { ascending: true })

    return (
        <main className="min-h-screen bg-white">
            {/* Header section identical to standard pages */}
            <header className="w-full bg-[#254153] text-white h-20 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="w-32 flex items-center">
                    <Link href="/opt" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Volver al menú OPT">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                </div>
                
                <h1 className="font-bold text-base sm:text-lg md:text-xl uppercase tracking-wider text-center flex-1 truncate px-2">
                    Estadísticas OPT
                </h1>
                
                <div className="w-32 flex justify-end">
                    <img
                        src="/firplak-logo.png"
                        alt="Firplak Logo"
                        className="brightness-0 invert object-contain max-h-[32px]"
                    />
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 sm:p-6 mt-4 pb-24">
                <StatisticsDashboard data={data as any[]} empleados={realizadoPorList || []} />
            </div>

            {/* Sticky Home Button (Consistent with the rest of the app) */}
            <div className="fixed bottom-6 right-6 z-50">
                <Link
                    href="/"
                    className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <Home size={28} />
                </Link>
            </div>
        </main>
    )
}


