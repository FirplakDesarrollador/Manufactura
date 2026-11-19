'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'

// Control de Piso Superficies (RTM): módulo nuevo, en construcción (el usuario definirá su funcionamiento)
export default function SuperficiesPage() {
    const router = useRouter()
    const [email, setEmail] = useState<string | undefined>()

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) router.push('/login')
            else setEmail(user.email)
        })
    }, [router])

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col">
            <Header title="Control de Piso Superficies (RTM)" subtitle="" compact={true} userEmail={email} showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} />
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-sm p-8 sm:p-12 max-w-lg w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#deb841]/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-[#b8941f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 20h20M5 20V9l7-5 7 5v11M9 20v-6h6v6M3 9l9-6 9 6" />
                        </svg>
                    </div>
                    <span className="text-xs font-black uppercase bg-[#deb841]/20 text-[#8a6d10] px-2.5 py-1 rounded-md">En construcción</span>
                    <h1 className="text-xl sm:text-2xl font-black text-[#324354] mt-3">Control de Piso Superficies (RTM)</h1>
                    <p className="text-sm text-[#7B8E90] font-semibold mt-2">Este módulo se está construyendo. Pronto estará disponible.</p>
                    <button onClick={() => router.push('/home/selection')}
                        className="mt-6 h-10 px-5 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-sm font-bold">
                        Volver a Control de Piso
                    </button>
                </div>
            </main>
        </div>
    )
}
