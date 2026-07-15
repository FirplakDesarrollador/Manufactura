'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Cpu, Hammer, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'

export default function MaquinasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || '')
      setLoading(false)
    }
    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] selection:bg-[#324354] selection:text-white">
      <Header
        title="Mantenimiento"
        subtitle="Módulo Máquinas"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-[#e2ded5] shadow-2xl p-8 sm:p-12 text-center space-y-8 animate-in fade-in zoom-in duration-300">
          
          {/* Animated Icons Container */}
          <div className="relative flex justify-center items-center h-32 w-full">
            <div className="absolute w-24 h-24 bg-[#324354]/5 rounded-full blur-xl"></div>
            
            <div className="relative flex justify-center items-center gap-1">
              <Cpu size={48} className="text-[#324354] animate-pulse" />
              <Settings size={36} className="text-[#7B8E90] animate-spin" style={{ animationDuration: '6s' }} />
              <Hammer size={24} className="text-[#324354] -mt-10 -ml-2" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl font-light text-[#324354] uppercase tracking-wider font-sans">
              Módulo en Construcción
            </h1>
            <div className="w-24 h-1 bg-[#324354] mx-auto rounded-full"></div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-md mx-auto">
            Estamos digitalizando las hojas de vida, historiales y planes de mantenimiento preventivo para todas las máquinas de la planta. Próximamente disponible.
          </p>

          {/* Back button */}
          <div className="pt-4">
            <button
              onClick={() => router.push('/mantenimiento')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#324354] hover:bg-[#25313e] text-white font-bold rounded-xl transition duration-200 shadow-md hover:shadow-lg text-sm uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Volver a Mantenimiento</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
