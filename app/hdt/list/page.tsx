import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, FileText, Search, Home, User } from 'lucide-react'
import type { Database } from '@/lib/hdt/database.types'
import GroupedHdtList from '@/components/hdt/GroupedHdtList'
import { createHdtServerClient } from '@/lib/hdt/server-client'

type HdtRow = Database['public']['Tables']['hdts']['Row']

export default async function HdtListPage({
  searchParams,
}: {
  searchParams: Promise<{ planta?: string, action?: string, showObsolete?: string, query?: string }>
}) {
  const supabase = await createHdtServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { planta, action = 'view', showObsolete, query = '' } = await searchParams
  const isShowObsolete = showObsolete === 'true'

  if (!user) { redirect('/login') }
  if (!planta) { redirect('/hdt/plants') }

  const { data: hdts, error } = await supabase
    .from('hdts')
    .select('*')
    .ilike('planta', planta)
    .order('proceso', { ascending: true })
    .order('codigo', { ascending: true })
    .order('version', { ascending: false })

  const filteredHdts = query
    ? (hdts as HdtRow[])?.filter(hdt =>
      (hdt.labor?.toLowerCase() || '').includes(query.toLowerCase()) ||
      (hdt.proceso?.toLowerCase() || '').includes(query.toLowerCase()) ||
      (hdt.codigo?.toLowerCase() || '').includes(query.toLowerCase())
    )
    : (hdts as HdtRow[])

  const groupedHdts = filteredHdts?.reduce((acc, hdt) => {
    const proceso = hdt.proceso || 'Sin Proceso'
    if (!acc[proceso]) acc[proceso] = []
    acc[proceso].push(hdt)
    return acc
  }, {} as Record<string, HdtRow[]>)

  if (error) console.error('Supabase error in HDT List:', error)

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#f8fafc' }}>
      {/* Dark Header */}
      <header className="p-4 flex items-center shadow-md relative z-10 text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="flex items-center gap-1">
          <Link href="/hdt/plants" className="p-2 rounded-full transition-colors hover:bg-white/10" title="Volver">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <Link href="/hdt" className="p-2 rounded-full transition-colors hover:bg-white/10" title="Ir al Menú Principal">
            <Home className="h-6 w-6" />
          </Link>
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-normal tracking-tight">HDTs de {planta}</h1>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-12">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 gap-4" style={{ borderBottom: '1px solid #e4e4e7' }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: 'rgba(27,65,84,0.10)' }}>
                <FileText className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <div>
                <h2 className="text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>Listado de HDTs</h2>
                <p className="font-medium" style={{ color: '#6b7280' }}>Gestiona las hojas de división de trabajo para esta planta</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <form action="/hdt/list" method="get" className="flex items-center">
                  <input type="hidden" name="planta" value={planta} />
                  <input type="hidden" name="action" value={action} />
                  <input type="hidden" name="showObsolete" value={showObsolete || 'false'} />
                  <input
                    type="text"
                    name="query"
                    defaultValue={query}
                    placeholder="Buscar por labor o proceso..."
                    className="w-full bg-white border-2 rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all"
                    style={{ borderColor: '#e4e4e7' }}
                  />
                  <Search className="absolute left-3.5 h-4 w-4" style={{ color: '#9ca3af' }} />
                </form>
              </div>

              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ backgroundColor: 'rgba(27,65,84,0.05)', border: '1px solid rgba(27,65,84,0.10)' }}>
                <User className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>{user.email?.split('@')[0]}</span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-3xl p-10 text-center" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
              <p className="font-medium" style={{ color: '#dc2626' }}>Error al cargar las HDTs. Por favor intenta de nuevo.</p>
            </div>
          ) : Object.keys(groupedHdts || {}).length === 0 ? (
            <div className="border-2 border-dashed rounded-3xl p-20 flex flex-col items-center text-center space-y-4 bg-white" style={{ borderColor: '#e4e4e7' }}>
              <FileText className="h-16 w-16" style={{ color: '#e4e4e7' }} />
              <p className="text-xl font-medium" style={{ color: '#6b7280' }}>No se encontraron HDTs para esta búsqueda.</p>
            </div>
          ) : (
            <GroupedHdtList groupedHdts={groupedHdts || {}} action={action} />
          )}
        </div>
      </main>

      <footer className="p-8 flex flex-col items-center gap-4" style={{ borderTop: '1px solid #f4f4f5' }}>
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: '#d4d4d8' }}>
          FIRPLAK S.A. | GESTIÓN CALIDAD | 2026
        </p>
      </footer>
    </div>
  )
}
