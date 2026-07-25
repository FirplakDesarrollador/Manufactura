'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Search, Home, User, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/hdt/database.types'
import GroupedHdtList from '@/components/hdt/GroupedHdtList'
import Header from '@/components/opt-sistemica/Header'
import SubHeader from '@/components/hdt/SubHeader'

type HdtRow = Database['public']['Tables']['hdts']['Row']

export default function HdtListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-[#324354]" />
        <p className="font-medium text-slate-500">Cargando...</p>
      </div>
    }>
      <HdtListContent />
    </Suspense>
  )
}

function HdtListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const planta = searchParams.get('planta') || ''
  const action = searchParams.get('action') || 'view'
  const showObsolete = searchParams.get('showObsolete') || 'false'
  const initialQuery = searchParams.get('query') || ''

  const [query, setQuery] = useState(initialQuery)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hdts, setHdts] = useState<HdtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchUserDataAndHdts = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/login')
          return
        }
        setCurrentUser(authUser)

        if (!planta) {
          router.push('/hdt/plants')
          return
        }

        // Fetch HDTs from Supabase
        const { data, error: fetchError } = await supabase
          .from('hdts')
          .select('*')
          .ilike('planta', planta)
          .order('proceso', { ascending: true })
          .order('codigo', { ascending: true })
          .order('version', { ascending: false })

        if (fetchError) throw fetchError
        setHdts(data || [])
      } catch (err) {
        console.error('Error loading HDT list:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserDataAndHdts()
  }, [planta, router])

  const filteredHdts = useMemo(() => {
    if (!query) return hdts
    return hdts.filter(hdt =>
      (hdt.labor?.toLowerCase() || '').includes(query.toLowerCase()) ||
      (hdt.proceso?.toLowerCase() || '').includes(query.toLowerCase()) ||
      (hdt.codigo?.toLowerCase() || '').includes(query.toLowerCase())
    )
  }, [hdts, query])

  const groupedHdts = useMemo(() => {
    return filteredHdts.reduce((acc, hdt) => {
      const proceso = hdt.proceso || 'Sin Proceso'
      if (!acc[proceso]) acc[proceso] = []
      acc[proceso].push(hdt)
      return acc
    }, {} as Record<string, HdtRow[]>)
  }, [filteredHdts])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-[#F6F3EE]">
        <Loader2 className="h-12 w-12 animate-spin text-[#324354]" />
        <p className="font-medium text-slate-500 font-sans">Cargando HDTs...</p>
      </div>
    )
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  const userEmailName = currentUser?.email?.split('@')[0] || 'usuario'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#F6F3EE' }}>
      <Header
        title="HDT"
        subtitle="Estandarización"
        userEmail={currentUser?.email || ''}
        showLogout={true}
        onLogout={handleSignOut}
      />
      <SubHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-12">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 gap-4" style={{ borderBottom: '1px solid #e2ded5' }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: 'rgba(50,67,84,0.10)' }}>
                <FileText className="h-8 w-8 text-[#324354]" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-[#324354]">Listado de HDTs</h2>
                <p className="font-medium text-slate-500">Gestiona las hojas de división de trabajo para esta planta</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <form onSubmit={handleSearchSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por labor o proceso..."
                    className="w-full bg-white border-2 rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all border-[#e2ded5] focus:border-[#324354] focus:ring-1 focus:ring-[#324354]"
                  />
                  <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                </form>
              </div>

              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl border border-[#e2ded5] bg-[#324354]/5">
                <User className="h-4 w-4 text-[#324354]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#324354]">{userEmailName}</span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-3xl p-10 text-center bg-red-50 border border-red-200">
              <p className="font-medium text-red-600">Error al cargar las HDTs. Por favor intenta de nuevo.</p>
            </div>
          ) : Object.keys(groupedHdts || {}).length === 0 ? (
            <div className="border-2 border-dashed rounded-3xl p-20 flex flex-col items-center text-center space-y-4 bg-white border-[#e2ded5]">
              <FileText className="h-16 w-16 text-slate-200" />
              <p className="text-xl font-medium text-slate-500">No se encontraron HDTs para esta búsqueda.</p>
            </div>
          ) : (
            <GroupedHdtList groupedHdts={groupedHdts || {}} action={action} />
          )}
        </div>
      </main>

      <footer className="p-8 flex flex-col items-center gap-4 border-t border-[#e2ded5]">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-slate-400">
          FIRPLAK S.A. | GESTIÓN CALIDAD | 2026
        </p>
      </footer>
    </div>
  )
}
