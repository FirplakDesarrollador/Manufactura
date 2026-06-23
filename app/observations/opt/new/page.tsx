import { createExternalClient } from '@/lib/supabase/external'
import OPTForm from './OPTForm'
import Image from 'next/image'
import Link from 'next/link'
import BackButton from './BackButton'

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
            <header className="bg-primary w-full text-white sticky top-0 z-10 shadow-md">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <BackButton />
                        <span className="text-base sm:text-lg font-semibold tracking-wide">Nueva OPT</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-white hover:opacity-80 transition-opacity" title="Inicio">
                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </Link>
                        <Image
                            src="/firplak-logo.png"
                            alt="Firplak Logo"
                            width={120}
                            height={40}
                            className="h-auto w-auto max-h-[36px] object-contain brightness-0 invert"
                        />
                    </div>
                </div>
            </header>

            {/* Form Content */}
            <div className="p-4 sm:p-6">
                <OPTForm empleados={empleados} cargos={cargos} realizadoPorList={realizadoPorList} />
            </div>
        </main>
    )
}

