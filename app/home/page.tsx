'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  interface User {
    id: string
    email?: string
  }

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
      }

      setLoading(false)
    }

    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#254153] flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#254153] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full">
              <svg className="w-6 h-6 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">ImpacSoft</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-white/70">Bienvenido</p>
              <p className="text-white font-semibold">{user?.email || 'Usuario'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Control de Piso Button */}
          <button
            onClick={() => router.push('/home/selection')}
            className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
              <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Manufactura</span>
          </button>

          {/* Calidad Button */}
          <button
            onClick={() => router.push('/calidad')}
            className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
          >
            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
              <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Calidad</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} ImpacSoft. Todos los derechos reservados.
      </footer>
    </div>
  )
}
