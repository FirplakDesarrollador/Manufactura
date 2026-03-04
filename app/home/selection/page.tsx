'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SelectionPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#254153] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/home')}
              className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Selección de Módulo</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-white/70">Bienvenido</p>
              <p className="text-white font-semibold">{user?.email}</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mármol Button */}
          <button
            onClick={() => router.push('/marmol')}
            className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-[#254153] hover:shadow-xl transition-all duration-200 group"
          >
            <div className="w-20 h-20 bg-[#254153]/10 rounded-full flex items-center justify-center mb-5 group-hover:bg-[#254153] transition-all duration-200">
              <svg className="w-10 h-10 text-[#254153] group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-200">Manufactura Mármol</span>
          </button>

          {/* Muebles Button */}
          <button className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-[#254153] hover:shadow-xl transition-all duration-200 group">
            <div className="w-20 h-20 bg-[#254153]/10 rounded-full flex items-center justify-center mb-5 group-hover:bg-[#254153] transition-all duration-200">
              <svg className="w-10 h-10 text-[#254153] group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-200">Manufactura Muebles</span>
          </button>

          {/* Fibra Button */}
          <button className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-[#254153] hover:shadow-xl transition-all duration-200 group">
            <div className="w-20 h-20 bg-[#254153]/10 rounded-full flex items-center justify-center mb-5 group-hover:bg-[#254153] transition-all duration-200">
              <svg className="w-10 h-10 text-[#254153] group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-200">Manufactura Fibra</span>
          </button>
        </div>
      </main>
    </div>
  )
}
