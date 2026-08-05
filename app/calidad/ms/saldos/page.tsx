'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SaldosYDestruccionesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [hasPermission, setHasPermission] = useState(false)

    useEffect(() => {
        const checkPermission = async () => {
            const { data: authData } = await supabase.auth.getUser()
            if (!authData?.user?.email) {
                router.push('/login')
                return
            }

            const { data: localUser } = await supabase
                .from('usuarios')
                .select('permisos')
                .eq('uuid', authData.user.id)
                .single()

            if (!localUser?.permisos?.calidad?.saldos_y_destrucciones) {
                router.push('/home')
                return
            }

            setHasPermission(true)
            setLoading(false)
        }

        checkPermission()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        )
    }

    if (!hasPermission) return null

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-[#254153] text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => router.push('/calidad/ms')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-widest uppercase">
                            Saldos y Destrucciones
                        </h1>
                        <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">
                            Módulo de Calidad
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex-1 p-6 flex items-center justify-center">
                <div className="text-center opacity-50">
                    <p className="text-xl font-black text-[#254153] uppercase mb-2">Próximamente</p>
                    <p className="text-sm font-bold">Este módulo está en construcción</p>
                </div>
            </main>
        </div>
    )
}
