import { createExternalClient } from '@/lib/supabase/external'
import OPTForm from './OPTForm'
import Image from 'next/image'
import Link from 'next/link'
import BackButton from './BackButton'
import { ArrowLeft } from 'lucide-react'

export default async function NewOPTForm() {
    const externalSupabase = createExternalClient()

    const { data: empleados } = await externalSupabase
        .from('empleados')
        .select('nombreCompleto, foto')
        .eq('activo', true)
        .order('nombreCompleto', { ascending: true })

    const { data: cargos } = await externalSupabase
        .from('cargos')
        .select('cargo')
        .order('cargo', { ascending: true })

    // Fetch employees who can perform OPT observations (supervisors/leaders)
    const { data: realizadoPorList } = await externalSupabase
        .from('empleados')
        .select('nombreCompleto')
        .eq('activo', true)
        .in('nivelCargo', ['Operario lider', 'Supervisor', 'Jefe', 'Coordinador', 'Director'])
        .order('nombreCompleto', { ascending: true })

    return (
        <main className="flex min-h-screen flex-col bg-white text-[#000155]">
            {/* Header Banner */}
            <header className="w-full bg-[#254153] text-white h-20 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="w-32 flex items-center">
                    <Link href="/opt" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Volver al menú OPT">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                </div>
                
                <h1 className="font-bold text-base sm:text-lg md:text-xl uppercase tracking-wider text-center flex-1 truncate px-2">
                    Nueva OPT
                </h1>
                
                <div className="w-32 flex justify-end">
                    <img
                        src="/firplak-logo.png"
                        alt="Firplak Logo"
                        className="brightness-0 invert object-contain max-h-[32px]"
                    />
                </div>
            </header>

            {/* Form Content */}
            <div className="p-4 sm:p-6">
                <OPTForm empleados={empleados} cargos={cargos} realizadoPorList={realizadoPorList} />
            </div>
        </main>
    )
}

