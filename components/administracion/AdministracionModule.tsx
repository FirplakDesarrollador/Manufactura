'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'
import {
    updateOrdenFabricacion,
    deleteOrdenFabricacion,
    updateRegistroTrazabilidad,
    deleteRegistroTrazabilidad
} from '@/lib/supabase/queries/administracion'
import {
    Search,
    Calendar,
    Eraser,
    Edit2,
    Trash2,
    X
} from 'lucide-react'

export default function AdministracionModule({ userEmail }: { userEmail?: string }) {
    // userEmail available for future use
    void userEmail;
    const [activeTab, setActiveTab] = useState<'of' | 'trazabilidad'>('of')
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    // Modal State
    const [editModal, setEditModal] = useState<{
        type: 'of' | 'registro',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item: any
    } | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            // Optimized: Fetch active orders and last 1000 traceability records
            // This prevents loading the entire historical database which was causing lag
            const [ofRes, trazRes] = await Promise.all([
                supabase.from('query_ordenes_fabricacion')
                    .select('*')
                    .order('fecha_entrega_estimada', { ascending: true }),
                supabase.from('query_trazabilidad_ms')
                    .select('*')
                    .order('vaciado_fecha', { ascending: false })
                    .limit(10000)
            ])
            setOrdenes(ofRes.data || [])
            setRegistros(trazRes.data || [])
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredOrdenes = useMemo(() => {
        const search = searchText.toLowerCase()
        return ordenes.filter(o => {
            const matchesSearch = !search ||
                (o.orden_fabricacion?.toLowerCase() || '').includes(search) ||
                (o.pedido?.toLowerCase() || '').includes(search) ||
                (o.producto_descripcion?.toLowerCase() || '').includes(search) ||
                (o.producto_sku?.toLowerCase() || '').includes(search) ||
                (o.molde_descripcion?.toLowerCase() || '').includes(search) ||
                (o.cliente?.toLowerCase() || '').includes(search)

            const matchesDate = !selectedDate || (o.fecha_ideal_produccion && o.fecha_ideal_produccion.split('T')[0] === selectedDate)

            return matchesSearch && matchesDate
        })
    }, [ordenes, searchText, selectedDate])

    const filteredRegistros = useMemo(() => {
        const search = searchText.toLowerCase()
        return registros.filter(r => {
            const matchesSearch = !search ||
                (r.orden_fabricacion?.toLowerCase() || '').includes(search) ||
                (r.numero_pedido?.toLowerCase() || '').includes(search) ||
                (r.producto_descripcion?.toLowerCase() || '').includes(search) ||
                (r.producto_sku?.toLowerCase() || '').includes(search) ||
                (r.molde_descripcion?.toLowerCase() || '').includes(search)

            // For registros, date filtering might be complex but we follow FF pattern
            return matchesSearch
        })
    }, [registros, searchText])

    // Summary Calculations (matching FF logic)
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]

        // Filters for traceability counts today
        const vaciadoToday = registros.filter(r => (r.vaciado_fecha || '').split('T')[0] === today)
        const pinturaToday = registros.filter(r => (r.pintura_fecha || '').split('T')[0] === today)
        const acabadoToday = registros.filter(r => (r.acabado_fecha || '').split('T')[0] === today)

        // Kilograms: Current Transito + Cedi Today (Matches FF logic for 3407.8kg)
        const transitoTotal = registros.filter(r => r.estado === 'Transito')
        const cediToday = registros.filter(r => (r.cedi_fecha || '').split('T')[0] === today)
        
        const totalKilos = [...transitoTotal, ...cediToday]
            .reduce((acc, r) => acc + (Number(r.kilos_vaciados) || 0), 0)

        return {
            cantidad: filteredOrdenes.reduce((acc, o) => acc + (o.cantidad_programada || o.cantidad || 0), 0),
            programado: filteredOrdenes.reduce((acc, o) => acc + (o.programado || 0), 0),
            pintura: pinturaToday.length,
            desgelcada: 0,
            vaciado: vaciadoToday.length,
            acabado: acabadoToday.length,
            saldo: filteredOrdenes.reduce((acc, o) => acc + (o.saldo || 0), 0),
            digitado: filteredOrdenes.reduce((acc, o) => acc + (o.digitado || 0), 0),
            transito: transitoTotal.length,
            cedi: cediToday.length,
            kilos: totalKilos
        }
    }, [filteredOrdenes, registros])

    const handleDelete = async (type: 'of' | 'registro', id: number) => {
        if (!confirm('¿Seguro que desea eliminar este registro? ESTA ACCIÓN NO SE PUEDE DESHACER.')) return

        try {
            if (type === 'of') await deleteOrdenFabricacion(id)
            else await deleteRegistroTrazabilidad(id)
            alert('Eliminado correctamente')
            loadData()
        } catch {
            alert('Error al eliminar')
        }
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editModal) return
        setSaving(true)
        try {
            const { type, item } = editModal
            if (type === 'of') await updateOrdenFabricacion(item.id, item)
            else await updateRegistroTrazabilidad(item.id, item)
            alert('Actualizado correctamente')
            setEditModal(null)
            loadData()
        } catch {
            alert('Error al actualizar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
            {/* Summary Cards */}
            <div className="p-4 bg-white border-b border-slate-200">
                <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 no-scrollbar">
                    <StatCard label="Cantidad" value={stats.cantidad} color="bg-blue-50 text-blue-600" />
                    <StatCard label="Programado" value={stats.programado} color="bg-indigo-50 text-indigo-600" />
                    <StatCard label="Pintura Hoy" value={stats.pintura} color="bg-orange-50 text-orange-600" />
                    <StatCard label="Desgelcada" value={stats.desgelcada} color="bg-yellow-50 text-yellow-600" />
                    <StatCard label="Vaciado Hoy" value={stats.vaciado} color="bg-emerald-50 text-emerald-600" />
                    <StatCard label="Acabado Hoy" value={stats.acabado} color="bg-purple-50 text-purple-600" />
                    <StatCard label="Saldo" value={stats.saldo} color="bg-rose-50 text-rose-600" />
                    <StatCard label="Digitado" value={stats.digitado} color="bg-slate-50 text-slate-600" />
                    <StatCard label="Transito" value={stats.transito} color="bg-amber-50 text-amber-600" />
                    <StatCard label="Cedi Hoy" value={stats.cedi} color="bg-green-50 text-green-600" />
                    <StatCard label="Kg Hoy" value={stats.kilos.toFixed(1)} color="bg-blue-600 text-white" />
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[300px]">
                        <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">Búsqueda Global</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Sku / Of / Pedido / Molde / Cliente"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="w-48">
                        <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">Filtrar Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="date"
                                value={selectedDate || ''}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => { setSearchText(''); setSelectedDate(null); }}
                        className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shadow-sm"
                        title="Limpiar filtros"
                    >
                        <Eraser size={20} />
                    </button>
                </div>
                {/* Real-time Counter (Requested) */}
                <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        Total {activeTab === 'of' ? 'Órdenes' : 'Registros'}: {activeTab === 'of' ? filteredOrdenes.length : filteredRegistros.length}
                    </span>
                    {(searchText || selectedDate) && (
                        <span className="text-[10px] font-bold text-slate-400 italic">
                            (Filtrado aplicado)
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white px-4 border-b border-slate-200">
                <TabButton
                    active={activeTab === 'of'}
                    label="Órdenes de Fabricación"
                    onClick={() => setActiveTab('of')}
                />
                <TabButton
                    active={activeTab === 'trazabilidad'}
                    label="Registros de Trazabilidad"
                    onClick={() => setActiveTab('trazabilidad')}
                />
            </div>

            {/* Main Table Area */}
            <div className="flex-1 overflow-auto p-4 content-scrollbar">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-max">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b border-slate-100">
                                <th className="p-4">Acciones</th>
                                {activeTab === 'of' ? (
                                    <>
                                        <th className="p-4">OF / Pedido</th>
                                        <th className="p-4">Producto</th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4 text-center">Cant</th>
                                        <th className="p-4 text-center">Sal.</th>
                                        <th className="p-4">F. Ideal</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-4">Pieza (Id)</th>
                                        <th className="p-4">OF / Pedido</th>
                                        <th className="p-4">Producto</th>
                                        <th className="p-4">Molde</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4">Última Fecha</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="p-20 text-center text-slate-400 font-bold italic">Cargando datos...</td>
                                </tr>
                            ) : activeTab === 'of' ? (
                                filteredOrdenes.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-20 text-center text-slate-400 font-bold italic">No se encontraron órdenes</td>
                                    </tr>
                                ) : filteredOrdenes.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 flex gap-2">
                                            <button
                                                onClick={() => setEditModal({ type: 'of', item })}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete('of', item.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-blue-600">{item.orden_fabricacion}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">P: {item.pedido}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700 max-w-[200px] truncate">{item.producto_descripcion}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{item.producto_sku}</div>
                                        </td>
                                        <td className="p-4 text-[11px] font-bold text-slate-400">{item.cliente || '-'}</td>
                                        <td className="p-4 text-center font-black text-slate-600">{item.cantidad}</td>
                                        <td className="p-4 text-center font-black text-orange-600">{item.saldo}</td>
                                        <td className="p-4 text-[11px] font-bold text-slate-400">
                                            {item.fecha_ideal_produccion ? new Date(item.fecha_ideal_produccion).toLocaleDateString('es-ES') : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                filteredRegistros.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-20 text-center text-slate-400 font-bold italic">No se encontraron registros</td>
                                    </tr>
                                ) : filteredRegistros.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 flex gap-2">
                                            <button
                                                onClick={() => setEditModal({ type: 'registro', item })}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete('registro', item.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                        <td className="p-4 text-[11px] font-black text-blue-600">#{item.id}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{item.orden_fabricacion}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">P: {item.numero_pedido}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700 max-w-[200px] truncate">{item.producto_descripcion}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{item.producto_sku}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{item.molde_serial}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{item.molde_descripcion}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-black text-[9px] uppercase">
                                                {item.estado}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[11px] font-bold text-slate-400">
                                            {item.pintura_fecha ? new Date(item.pintura_fecha).toLocaleDateString('es-ES') : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">
                                {editModal.type === 'of' ? 'Editar Orden' : 'Editar Registro'} #{editModal.item.id}
                            </h2>
                            <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            {editModal.type === 'of' ? (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cliente</label>
                                        <input
                                            value={editModal.item.cliente || ''}
                                            onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, cliente: e.target.value } })}
                                            className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cantidad</label>
                                            <input
                                                type="number"
                                                value={editModal.item.cantidad || 0}
                                                onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, cantidad: parseInt(e.target.value) } })}
                                                className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Saldo</label>
                                            <input
                                                type="number"
                                                value={editModal.item.saldo || 0}
                                                onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, saldo: parseInt(e.target.value) } })}
                                                className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Estado</label>
                                        <select
                                            value={editModal.item.estado || ''}
                                            onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, estado: e.target.value } })}
                                            className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="Pintura text-black">Pintura</option>
                                            <option value="Desgelcado text-black">Desgelcado</option>
                                            <option value="Vaciado text-black">Vaciado</option>
                                            <option value="Pulido text-black">Pulido</option>
                                            <option value="Acabado text-black">Acabado</option>
                                            <option value="Empaque text-black">Empaque</option>
                                            <option value="Digitado text-black">Digitado</option>
                                            <option value="Transito text-black">Transito</option>
                                            <option value="Cedi text-black">Cedi</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Kilos Vaciados</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={editModal.item.kilos_vaciados || 0}
                                            onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, kilos_vaciados: parseFloat(e.target.value) } })}
                                            className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditModal(null)}
                                    className="flex-1 p-3 font-black text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-blue-600 p-3 rounded-xl font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-300"
                                >
                                    {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, color }: { label: string, value: string | number, color: string }) {
    return (
        <div className={`shrink-0 p-3 rounded-xl border border-slate-100 shadow-sm min-w-[100px] flex flex-col items-center justify-center ${color}`}>
            <span className="text-[9px] font-black uppercase opacity-70 mb-1">{label}</span>
            <span className="text-sm font-black tracking-tight">{value}</span>
        </div>
    )
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${active ? 'border-blue-600 text-blue-600 bg-blue-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
            {label}
        </button>
    )
}
