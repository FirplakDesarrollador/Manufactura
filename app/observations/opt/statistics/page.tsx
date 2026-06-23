import { getAllOPTRecordsForStats } from '../actions'
import { StatisticsDashboard } from '@/components/opt/statistics/StatisticsDashboard'
import Link from 'next/link'
import { Home } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StatisticsPage() {
    // Fetch all OPT data on the server
    const data = await getAllOPTRecordsForStats()

    return (
        <main className="min-h-screen bg-white">
            {/* Header section identical to standard pages */}
            <header className="bg-primary text-white p-4 sm:p-6 shadow-md border-b-4 border-secondary flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl sm:text-2xl font-bold">Estadísticas OPT</h1>
                </div>
                
                <Link
                    href="/"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                    title="Ir a Inicio"
                >
                    <Home size={28} />
                </Link>
            </header>

            <div className="max-w-7xl mx-auto p-4 sm:p-6 mt-4 pb-24">
                <StatisticsDashboard data={data as any[]} />
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

