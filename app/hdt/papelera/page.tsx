'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Trash2, RotateCcw, AlertTriangle, Search, Factory, 
  Layers, Calendar, User, Eye, ArrowLeft, Loader2, CheckCircle2, ShieldAlert
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import SubHeader from '@/components/hdt/SubHeader'
import { getTrashHdts, restoreFromTrash, deleteFromTrashPermanently, emptyTrash, TrashHdtItem } from '@/lib/hdt/papelera'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function HdtPapeleraPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [trashItems, setTrashItems] = useState<TrashHdtItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('todas')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadTrash = () => {
    const items = getTrashHdts()
    setTrashItems(items)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)
      loadTrash()
      setLoading(false)
    }
    init()
  }, [router])

  const plantsList = useMemo(() => {
    const unique = Array.from(new Set(trashItems.map(t => t.hdt.planta || 'Sin Planta')))
    return unique.filter(Boolean)
  }, [trashItems])

  const filteredItems = useMemo(() => {
    return trashItems.filter(item => {
      const q = searchTerm.toLowerCase()
      const matchSearch = !q || 
        (item.hdt.codigo || '').toLowerCase().includes(q) ||
        (item.hdt.labor || '').toLowerCase().includes(q) ||
        (item.hdt.proceso || '').toLowerCase().includes(q) ||
        (item.deletedBy || '').toLowerCase().includes(q)

      const matchPlant = selectedPlant === 'todas' || item.hdt.planta === selectedPlant
      return matchSearch && matchPlant
    })
  }, [trashItems, searchTerm, selectedPlant])

  const handleRestore = async (trashId: string, codigo: string) => {
    setProcessingId(trashId)
    const res = await restoreFromTrash(trashId)
    setProcessingId(null)

    if (res.success) {
      setActionSuccess(`¡HDT ${codigo} restaurada con éxito!`)
      loadTrash()
      setTimeout(() => setActionSuccess(null), 3500)
    } else {
      alert(`Error al restaurar: ${res.error}`)
    }
  }

  const handleDeletePermanently = (trashId: string, codigo: string) => {
    const confirmDel = window.confirm(`¿Estás completamente seguro de eliminar permanentemente la HDT "${codigo}"? Esta acción borrará el backup definitivo.`)
    if (!confirmDel) return

    deleteFromTrashPermanently(trashId)
    loadTrash()
    setActionSuccess(`HDT ${codigo} eliminada definitivamente del backup.`)
    setTimeout(() => setActionSuccess(null), 3500)
  }

  const handleEmptyAllTrash = () => {
    if (trashItems.length === 0) return
    const confirmEmpty = window.confirm('¿Estás seguro de que deseas VACIAR completamente la Papelera de Reciclaje? Se perderán todos los respaldos.')
    if (!confirmEmpty) return

    emptyTrash()
    loadTrash()
    setActionSuccess('La papelera de reciclaje ha sido vaciada.')
    setTimeout(() => setActionSuccess(null), 3500)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F6F3EE] text-[#000000]">
      <Header
        title="HDT"
        subtitle="Papelera de Reciclaje y Respaldo"
        userEmail={currentUser?.email || ''}
        showLogout={true}
        onLogout={handleSignOut}
      />
      <SubHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8">
        
        {/* Banner Informativo */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e2ded5] mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
              <Trash2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#324354]">Papelera de Reciclaje de HDTs</h2>
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-xs font-black rounded-full">
                  {trashItems.length} en backup
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Aquí se resguardan las HDTs y versiones eliminadas. Puedes restaurarlas a su planta original en cualquier momento.
              </p>
            </div>
          </div>

          {trashItems.length > 0 && (
            <button
              onClick={handleEmptyAllTrash}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Vaciar Papelera</span>
            </button>
          )}
        </div>

        {/* Notificación de Éxito */}
        {actionSuccess && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 text-xs font-bold">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2ded5] mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, labor, proceso o autor..."
                className="w-full pl-9 pr-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-semibold text-[#324354] focus:outline-none"
              />
            </div>

            {plantsList.length > 0 && (
              <select
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none cursor-pointer"
              >
                <option value="todas">Todas las Plantas</option>
                {plantsList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {(searchTerm || selectedPlant !== 'todas') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedPlant('todas')
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Mostrando {filteredItems.length} de {trashItems.length} registros eliminados
          </div>
        </div>

        {/* Tabla de Elementos en Papelera */}
        {loading ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-[#e2ded5]">
            <Loader2 className="animate-spin text-[#324354] mx-auto mb-2" size={36} />
            <p className="text-xs text-slate-400 font-bold">Cargando papelera de HDTs...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-[#e2ded5] shadow-sm">
            <Trash2 className="mx-auto text-slate-300 mb-3" size={48} />
            <h4 className="text-sm font-bold text-slate-700 mb-1">La Papelera está vacía</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No hay hojas de división de trabajo eliminadas en el historial de respaldo.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-md border border-[#e2ded5] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#324354]">
                  <TableRow className="hover:bg-[#324354] border-none">
                    <TableHead className="py-3.5 font-bold text-white uppercase text-xs">Código</TableHead>
                    <TableHead className="py-3.5 font-bold text-white uppercase text-xs">Labor / Operación</TableHead>
                    <TableHead className="py-3.5 font-bold text-white uppercase text-xs">Planta / Proceso</TableHead>
                    <TableHead className="py-3.5 font-bold text-white uppercase text-xs text-center">Versión</TableHead>
                    <TableHead className="py-3.5 font-bold text-white uppercase text-xs">Eliminado por</TableHead>
                    <TableHead className="py-3.5 font-bold text-white uppercase text-xs">Fecha Borrado</TableHead>
                    <TableHead className="py-3.5 font-bold text-white uppercase text-xs text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isProcessing = processingId === item.trashId
                    const dateFormatted = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('es-CO', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'Fecha desc.'

                    return (
                      <TableRow key={item.trashId} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        {/* 1. Código */}
                        <TableCell className="py-4">
                          <span className="font-mono font-bold text-[#324354] text-xs bg-slate-100 px-2.5 py-1 rounded-md">
                            {item.hdt.codigo || 'S/C'}
                          </span>
                        </TableCell>

                        {/* 2. Labor */}
                        <TableCell className="py-4">
                          <div className="font-bold text-slate-800 text-xs max-w-xs truncate" title={item.hdt.labor || ''}>
                            {item.hdt.labor || 'Sin labor'}
                          </div>
                          {item.deleteType === 'all' && (
                            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block mt-0.5">
                              • Todas las versiones
                            </span>
                          )}
                        </TableCell>

                        {/* 3. Planta / Proceso */}
                        <TableCell className="py-4">
                          <div className="text-xs font-semibold text-[#324354] flex items-center gap-1.5">
                            <Factory size={13} className="text-[#7B8E90]" />
                            <span>{item.hdt.planta || 'Planta'}</span>
                          </div>
                          {item.hdt.proceso && (
                            <span className="text-[11px] text-slate-400 block">{item.hdt.proceso}</span>
                          )}
                        </TableCell>

                        {/* 4. Versión */}
                        <TableCell className="py-4 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                            v{item.hdt.version || 1}
                          </span>
                        </TableCell>

                        {/* 5. Eliminado Por */}
                        <TableCell className="py-4">
                          <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <User size={13} className="text-[#7B8E90]" />
                            <span>{item.deletedBy}</span>
                          </div>
                        </TableCell>

                        {/* 6. Fecha Borrado */}
                        <TableCell className="py-4">
                          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#7B8E90]" />
                            <span>{dateFormatted}</span>
                          </div>
                        </TableCell>

                        {/* 7. Acciones */}
                        <TableCell className="py-4 text-right pr-6">
                          <div className="inline-flex items-center gap-2">
                            {/* Botón Restaurar */}
                            <button
                              disabled={isProcessing}
                              onClick={() => handleRestore(item.trashId, item.hdt.codigo || 'HDT')}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer hover:scale-105"
                              title="Restaurar esta HDT a su planta activa"
                            >
                              {isProcessing ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <RotateCcw size={13} />
                              )}
                              <span>Restaurar</span>
                            </button>

                            {/* Botón Eliminar Permanente */}
                            <button
                              disabled={isProcessing}
                              onClick={() => handleDeletePermanently(item.trashId, item.hdt.codigo || 'HDT')}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Eliminar definitivamente"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
