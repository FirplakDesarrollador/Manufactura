'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'

export default function CriteriosPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)
            setLoading(false)
        }
        checkUser()
    }, [router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            <Header
                title="Criterios de Calidad"
                subtitle="Módulo Operativo"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-20 h-20 bg-[#324354]/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <svg className="w-10 h-10 text-[#324354]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#324354] mb-3">Módulo en Construcción</h2>
                <p className="text-sm md:text-base text-gray-500 max-w-md mb-8">
                    Estamos diseñando y construyendo esta sección de Criterios de Calidad para brindarte la mejor experiencia operativa.
                </p>
                <p className="text-xs md:text-sm italic text-[#7B8E90] tracking-wide select-none">
                    Inspirando Hogares
                </p>
            </main>
        </div>
    )
}
