import { createExternalClient } from '@/lib/supabase/external'
import { createClient } from '@/lib/supabase/server'
import OPTForm from './OPTForm'
import Image from 'next/image'
import Link from 'next/link'
import BackButton from './BackButton'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/opt-sistemica/Header'
import SubHeader from '@/components/opt/SubHeader'

export const dynamic = 'force-dynamic'

export default async function NewOPTForm() {
    const externalSupabase = createExternalClient()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || ''

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
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] w-full">
            <Header 
                title="OPT Operativa"
                subtitle="Nueva Evaluación"
                userEmail={userEmail}
            />
            <SubHeader />

            {/* Form Content */}
            <div className="p-4 sm:p-6 flex-1">
                <OPTForm empleados={empleados} cargos={cargos} realizadoPorList={realizadoPorList} />
            </div>
        </div>
    )
}

