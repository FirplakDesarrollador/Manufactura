import { getAllOPTRecordsForStats } from '../actions'
import { StatisticsDashboard } from '@/components/opt/statistics/StatisticsDashboard'
import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'
import { createExternalClient } from '@/lib/supabase/external'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/opt-sistemica/Header'
import SubHeader from '@/components/opt/SubHeader'

export const dynamic = 'force-dynamic'

export default async function StatisticsPage() {
    // Fetch all OPT data on the server
    const data = await getAllOPTRecordsForStats()

    // Fetch employees who can perform OPT observations (supervisors/leaders)
    const externalSupabase = createExternalClient()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || ''

    const { data: realizadoPorList } = await externalSupabase
        .from('empleados')
        .select('nombreCompleto')
        .eq('activo', true)
        .in('nivelCargo', ['Operario lider', 'Supervisor', 'Jefe', 'Coordinador', 'Director'])
        .order('nombreCompleto', { ascending: true })

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] w-full">
            <Header 
                title="OPT Operativa"
                subtitle="Estadísticas"
                userEmail={userEmail}
            />
            <SubHeader />

            <div className="max-w-[1500px] mx-auto w-full p-4 sm:p-6 mt-4 pb-24 flex-1">
                <StatisticsDashboard data={data as any[]} empleados={realizadoPorList || []} />
            </div>

            {/* Sticky Home Button (Consistent with the rest of the app) */}
            <div className="fixed bottom-6 right-6 z-50">
                <Link
                    href="/home"
                    className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <Home size={28} />
                </Link>
            </div>
        </div>
    )
}


