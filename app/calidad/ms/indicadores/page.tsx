'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import { CalidadMsNavButtons } from '@/components/calidad/CalidadMsNavButtons'
import IndicadoresCalidadView from '@/components/calidad/IndicadoresCalidadView'

// Indicadores generales de calidad MS: la misma sección "Mármol Sintético (MS)" del tablero de control
// (IndicadoresCalidadView con soloMs), así cualquier cambio en el tablero se refleja aquí.
export default function IndicadoresCalidadMsPage() {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string | undefined>()
    const [hasSettingsPermission, setHasSettingsPermission] = useState(false)

    useEffect(() => {
        const load = async () => {
            const { data: authData } = await supabase.auth.getUser()
            if (!authData?.user?.email) {
                router.push('/login')
                return
            }
            setUserEmail(authData.user.email)

            const { data: localUser } = await supabase
                .from('usuarios')
                .select('permisos')
                .eq('uuid', authData.user.id)
                .single()

            if (localUser?.permisos?.calidad) {
                setHasSettingsPermission(!!localUser.permisos.calidad.configurar_defectos || !!localUser.permisos.calidad.editar)
            } else {
                setHasSettingsPermission(true)
            }
        }
        void load()
    }, [router])

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans">
            <Header
                title="Calidad MS"
                subtitle=""
                compact={true}
                userEmail={userEmail}
                showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))}
            />

            {/* Barra de controles: solo los botones de navegación, centrados */}
            <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 xl:py-0 xl:h-14 sticky top-[56px] z-40 shadow-xs flex items-center">
                <div className="max-w-[1800px] w-full mx-auto flex justify-center">
                    <CalidadMsNavButtons activeTab="indicadores" hasSettingsPermission={hasSettingsPermission} />
                </div>
            </div>

            <IndicadoresCalidadView soloMs />
        </div>
    )
}
