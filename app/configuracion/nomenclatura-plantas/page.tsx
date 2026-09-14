'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import { NOMENCLATURA_PLANTAS_DEFAULT, NomenclaturaPlanta } from '@/lib/nomenclaturaPlantas'

interface EditingPlantaState extends NomenclaturaPlanta {
    originalCodigo?: string;
}

export default function NomenclaturaPlantasPage() {
    const router = useRouter()
    const [plantas, setPlantas] = useState<NomenclaturaPlanta[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentUserEmail, setCurrentUserEmail] = useState('')
    const [isTableCreated, setIsTableCreated] = useState<boolean | null>(null)
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

    // Modal de Edición / Creación
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [editingPlanta, setEditingPlanta] = useState<EditingPlantaState>({
        codigo: '',
        nombre_oficial: '',
        alias: [],
        descripcion: '',
        color_hex: '#324354',
        activo: true
    })
    const [newAliasInput, setNewAliasInput] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Modal de confirmación para eliminar
    const [plantaToDelete, setPlantaToDelete] = useState<NomenclaturaPlanta | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToastMessage({ text, type })
        setTimeout(() => setToastMessage(null), 4000)
    }

    const checkAccessAndFetch = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (authUser) {
                setCurrentUserEmail(authUser.email || '')
            }

            // Consultar tabla en Supabase
            const { data, error } = await supabase
                .from('nomenclatura_plantas')
                .select('*')
                .order('id', { ascending: true })

            if (error) {
                console.warn('Tabla nomenclatura_plantas no encontrada o error al consultar:', error.message)
                setIsTableCreated(false)
                setPlantas(NOMENCLATURA_PLANTAS_DEFAULT)
            } else if (data && data.length > 0) {
                setIsTableCreated(true)
                setPlantas(data)
            } else {
                // La tabla existe pero está vacía: sembrar datos predeterminados automáticamente
                setIsTableCreated(true)
                try {
                    const { data: seededData, error: seedErr } = await supabase
                        .from('nomenclatura_plantas')
                        .upsert(NOMENCLATURA_PLANTAS_DEFAULT, { onConflict: 'codigo' })
                        .select()

                    if (!seedErr && seededData && seededData.length > 0) {
                        setPlantas(seededData)
                    } else {
                        setPlantas(NOMENCLATURA_PLANTAS_DEFAULT)
                    }
                } catch {
                    setPlantas(NOMENCLATURA_PLANTAS_DEFAULT)
                }
            }
        } catch (err: any) {
            console.error('Error al inicializar nomenclatura plantas:', err)
            setIsTableCreated(false)
            setPlantas(NOMENCLATURA_PLANTAS_DEFAULT)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        checkAccessAndFetch()
    }, [checkAccessAndFetch])

    // Filtro de búsqueda
    const filteredPlantas = plantas.filter(p => {
        const query = searchTerm.toLowerCase().trim()
        if (!query) return true
        return (
            p.nombre_oficial.toLowerCase().includes(query) ||
            p.codigo.toLowerCase().includes(query) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
            (p.alias && p.alias.some(al => al.toLowerCase().includes(query)))
        )
    })

    // Métricas
    const totalAliasCount = plantas.reduce((acc, curr) => acc + (curr.alias ? curr.alias.length : 0), 0)
    const activeCount = plantas.filter(p => p.activo !== false).length

    // Abrir Modal de Creación
    const handleOpenCreate = () => {
        setModalMode('create')
        setEditingPlanta({
            codigo: '',
            nombre_oficial: '',
            alias: [],
            descripcion: '',
            color_hex: '#324354',
            activo: true,
            originalCodigo: ''
        })
        setNewAliasInput('')
        setIsModalOpen(true)
    }

    // Abrir Modal de Edición
    const handleOpenEdit = (planta: NomenclaturaPlanta) => {
        setModalMode('edit')
        setEditingPlanta({
            ...planta,
            alias: [...(planta.alias || [])],
            originalCodigo: planta.codigo
        })
        setNewAliasInput('')
        setIsModalOpen(true)
    }

    // Agregar un alias al tag list del modal
    const handleAddAlias = () => {
        const val = newAliasInput.trim()
        if (!val) return
        const normalizedVal = val.toUpperCase()
        if (editingPlanta.alias.map(a => a.toUpperCase()).includes(normalizedVal)) {
            showToast('Ese alias ya existe en esta planta', 'info')
            return
        }
        setEditingPlanta(prev => ({
            ...prev,
            alias: [...prev.alias, val]
        }))
        setNewAliasInput('')
    }

    // Remover un alias del modal
    const handleRemoveAlias = (indexToRemove: number) => {
        setEditingPlanta(prev => ({
            ...prev,
            alias: prev.alias.filter((_, idx) => idx !== indexToRemove)
        }))
    }

    // Guardar en Supabase y estado local
    const handleSavePlanta = async () => {
        if (!editingPlanta.codigo.trim()) {
            showToast('El código de la planta es obligatorio (ej. MS, CEFI)', 'error')
            return
        }
        if (!editingPlanta.nombre_oficial.trim()) {
            showToast('El nombre oficial es obligatorio', 'error')
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                codigo: editingPlanta.codigo.trim().toUpperCase(),
                nombre_oficial: editingPlanta.nombre_oficial.trim(),
                alias: (editingPlanta.alias || []).map(a => a.trim()).filter(Boolean),
                descripcion: editingPlanta.descripcion?.trim() || '',
                color_hex: editingPlanta.color_hex || '#324354',
                activo: editingPlanta.activo !== false
            }

            let savedData: NomenclaturaPlanta = { ...payload, id: editingPlanta.id }

            if (isTableCreated) {
                if (modalMode === 'create') {
                    const { data, error } = await supabase
                        .from('nomenclatura_plantas')
                        .insert([payload])
                        .select()

                    if (error) throw error
                    savedData = data && data.length > 0 ? data[0] : { ...payload, id: Date.now() }
                    setPlantas(prev => [...prev, savedData])
                    showToast('Planta agregada exitosamente')
                } else {
                    // Actualizar fila existente
                    let query = supabase.from('nomenclatura_plantas').update(payload)
                    if (editingPlanta.id) {
                        query = query.eq('id', editingPlanta.id)
                    } else {
                        query = query.eq('codigo', editingPlanta.originalCodigo || payload.codigo)
                    }

                    const { data, error } = await query.select()
                    if (error) throw error

                    if (data && data.length > 0) {
                        savedData = data[0]
                    } else {
                        // Si no se encontró por ID o código original, hacer upsert
                        const { data: upsertData, error: upsertErr } = await supabase
                            .from('nomenclatura_plantas')
                            .upsert([payload], { onConflict: 'codigo' })
                            .select()

                        if (upsertErr) throw upsertErr
                        savedData = upsertData && upsertData.length > 0 ? upsertData[0] : { ...payload, id: editingPlanta.id || Date.now() }
                    }

                    setPlantas(prev => prev.map(p => {
                        const isMatch = (editingPlanta.id && p.id === editingPlanta.id) || 
                                        p.codigo === (editingPlanta.originalCodigo || payload.codigo);
                        return isMatch ? savedData : p;
                    }))
                    showToast('Planta actualizada exitosamente')
                }
            } else {
                // Modo memoria / fallback si la tabla no está creada en DB
                if (modalMode === 'create') {
                    savedData = { ...payload, id: Date.now() }
                    setPlantas(prev => [...prev, savedData])
                    showToast('Planta registrada en memoria (Asegúrate de correr el script SQL)', 'info')
                } else {
                    setPlantas(prev => prev.map(p => {
                        const isMatch = (editingPlanta.id && p.id === editingPlanta.id) || 
                                        p.codigo === (editingPlanta.originalCodigo || payload.codigo);
                        return isMatch ? { ...payload, id: p.id || Date.now() } : p;
                    }))
                    showToast('Planta actualizada en memoria', 'info')
                }
            }

            setIsModalOpen(false)
        } catch (err: any) {
            console.error('Error al guardar planta:', err)
            showToast(err.message || 'Error al guardar la planta en Supabase', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    // Eliminar planta
    const handleConfirmDelete = async () => {
        if (!plantaToDelete) return
        setIsDeleting(true)
        try {
            if (isTableCreated) {
                let query = supabase.from('nomenclatura_plantas').delete()
                if (plantaToDelete.id) {
                    query = query.eq('id', plantaToDelete.id)
                } else {
                    query = query.eq('codigo', plantaToDelete.codigo)
                }
                const { error } = await query
                if (error) {
                    console.warn('Advertencia al eliminar en DB:', error.message)
                }
            }
            setPlantas(prev => prev.filter(p => (plantaToDelete.id && p.id ? p.id !== plantaToDelete.id : p.codigo !== plantaToDelete.codigo)))
            showToast(`Nomenclatura "${plantaToDelete.nombre_oficial}" eliminada`, 'success')
            setPlantaToDelete(null)
        } catch (err: any) {
            console.error('Error al eliminar:', err)
            showToast(err.message || 'Error al eliminar la planta', 'error')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            {/* Header */}
            <Header
                title="Configuración"
                subtitle="Nomenclatura y Estandarización de Plantas"
                userEmail={currentUserEmail}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-[12000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium transition-all transform animate-bounce ${
                    toastMessage.type === 'error' ? 'bg-red-600' : toastMessage.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
                }`}>
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pt-28 pb-16">
                {/* Top Nav & Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/configuracion')}
                            className="p-2.5 bg-white hover:bg-gray-100 text-[#324354] rounded-xl border border-gray-200 shadow-sm transition-all flex items-center justify-center cursor-pointer"
                            title="Volver a Configuración"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#324354]">
                                Nomenclatura de Plantas
                            </h1>
                            <p className="text-sm text-[#7B8E90] mt-0.5">
                                Catálogo maestro de nombres oficiales, códigos y variantes/alias reconocidos
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleOpenCreate}
                            className="px-5 py-2.5 bg-[#324354] hover:bg-[#25323f] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Nueva Nomenclatura</span>
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plantas Activas</p>
                            <p className="text-3xl font-extrabold text-[#324354] mt-1">{activeCount}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[#324354]/10 flex items-center justify-center text-[#324354]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alias Registrados</p>
                            <p className="text-3xl font-extrabold text-[#7B8E90] mt-1">{totalAliasCount}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[#7B8E90]/10 flex items-center justify-center text-[#7B8E90]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado DB</p>
                            <p className="text-sm font-bold mt-2 flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isTableCreated ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                <span className={isTableCreated ? 'text-emerald-700' : 'text-amber-700'}>
                                    {isTableCreated ? 'Tabla Supabase Conectada' : 'Modo Catálogo Local'}
                                </span>
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6 flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar por nombre oficial, código o alias (ej. MS, Marmol, Muebles, CEFI)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-[#324354] placeholder-gray-400 font-medium"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 bg-gray-100 rounded-md cursor-pointer"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Plantas List / Table */}
                {loading ? (
                    <div className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#324354] mb-3"></div>
                        <p className="text-sm text-gray-400">Cargando catálogo de nomenclatura...</p>
                    </div>
                ) : filteredPlantas.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                        <p className="text-lg font-semibold text-gray-600">No se encontraron plantas con esa búsqueda</p>
                        <p className="text-xs text-gray-400 mt-1">Prueba con otro término o crea una nueva nomenclatura.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredPlantas.map((planta) => (
                            <div
                                key={planta.codigo}
                                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                            >
                                {/* Left Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span
                                            className="px-3 py-1 rounded-lg text-xs font-black uppercase text-white tracking-wider shadow-sm"
                                            style={{ backgroundColor: planta.color_hex || '#324354' }}
                                        >
                                            {planta.codigo}
                                        </span>
                                        <h2 className="text-xl font-bold text-[#324354]">
                                            {planta.nombre_oficial}
                                        </h2>
                                        {planta.activo === false && (
                                            <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                                Inactivo
                                            </span>
                                        )}
                                    </div>

                                    {planta.descripcion && (
                                        <p className="text-xs text-gray-500 mb-3 max-w-2xl">
                                            {planta.descripcion}
                                        </p>
                                    )}

                                    {/* Alias Tags */}
                                    <div>
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-[#7B8E90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            Alias y Variantes Aceptadas ({planta.alias?.length || 0}):
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {planta.alias && planta.alias.length > 0 ? (
                                                planta.alias.map((al, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2.5 py-1 bg-[#F6F3EE] text-[#324354] rounded-lg text-xs font-semibold border border-gray-200/80"
                                                    >
                                                        {al}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Sin alias adicionales registrados</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Actions */}
                                <div className="flex items-center gap-2 self-end lg:self-center">
                                    <button
                                        onClick={() => handleOpenEdit(planta)}
                                        className="px-4 py-2 bg-gray-50 hover:bg-[#324354] hover:text-white text-[#324354] font-semibold text-xs rounded-xl border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span>Editar / Gestionar Alias</span>
                                    </button>

                                    <button
                                        onClick={() => setPlantaToDelete(planta)}
                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                                        title="Eliminar Planta"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Crear / Editar Planta */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                >
                    <div 
                        className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 my-8 animate-in fade-in zoom-in-95 duration-200"
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                                    style={{ backgroundColor: editingPlanta.color_hex || '#324354' }}
                                >
                                    {editingPlanta.codigo || '??'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#324354]">
                                        {modalMode === 'create' ? 'Nueva Nomenclatura de Planta' : 'Editar Planta y Alias'}
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        Configura el nombre oficial y todas las variantes aceptadas
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Código */}
                                <div>
                                    <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1.5">
                                        Código Corto *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingPlanta.codigo}
                                        onChange={(e) => setEditingPlanta(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                                        placeholder="Ej. MS, CEFI, FV"
                                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] border border-gray-200 rounded-xl text-sm font-bold text-[#324354] focus:ring-2 focus:ring-[#324354] focus:outline-none uppercase"
                                    />
                                </div>

                                {/* Nombre Oficial */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1.5">
                                        Nombre Oficial Canónico *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingPlanta.nombre_oficial}
                                        onChange={(e) => setEditingPlanta(prev => ({ ...prev, nombre_oficial: e.target.value }))}
                                        placeholder="Ej. Mármol Sintético, Muebles (CEFI)"
                                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] border border-gray-200 rounded-xl text-sm font-bold text-[#324354] focus:ring-2 focus:ring-[#324354] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1.5">
                                    Descripción o Alcance (Opcional)
                                </label>
                                <textarea
                                    value={editingPlanta.descripcion || ''}
                                    onChange={(e) => setEditingPlanta(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Detalles sobre los procesos o productos fabricados en esta sección..."
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 bg-[#F6F3EE] border border-gray-200 rounded-xl text-sm text-[#324354] focus:ring-2 focus:ring-[#324354] focus:outline-none resize-none"
                                />
                            </div>

                            {/* Color Hex */}
                            <div>
                                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1.5">
                                    Color Identificador
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={editingPlanta.color_hex || '#324354'}
                                        onChange={(e) => setEditingPlanta(prev => ({ ...prev, color_hex: e.target.value }))}
                                        className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5 bg-white"
                                    />
                                    <div className="flex gap-2">
                                        {['#324354', '#7B8E90', '#deb841', '#59a96a', '#3b82f6', '#64748b'].map((hex) => (
                                            <button
                                                key={hex}
                                                type="button"
                                                onClick={() => setEditingPlanta(prev => ({ ...prev, color_hex: hex }))}
                                                className={`w-7 h-7 rounded-lg transition-transform ${editingPlanta.color_hex === hex ? 'scale-110 ring-2 ring-offset-1 ring-[#324354]' : 'opacity-70 hover:opacity-100'}`}
                                                style={{ backgroundColor: hex }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs font-mono text-gray-500 ml-auto">{editingPlanta.color_hex}</span>
                                </div>
                            </div>

                            {/* Alias Management */}
                            <div className="border-t border-gray-100 pt-4">
                                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1.5">
                                    Alias y Variantes Aceptadas
                                </label>
                                <p className="text-[11px] text-gray-400 mb-3">
                                    Escribe cualquier variación de texto o código antiguo (ej. <i>Marmol</i>, <i>MS</i>, <i>MP-10</i>) y presiona Enter o "Agregar".
                                </p>

                                {/* Input para agregar nuevo alias */}
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newAliasInput}
                                        onChange={(e) => setNewAliasInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleAddAlias()
                                            }
                                        }}
                                        placeholder="Escribe un alias (ej. Marmol Sintetico, MS)..."
                                        className="flex-1 px-3.5 py-2 bg-[#F6F3EE] border border-gray-200 rounded-xl text-sm text-[#324354] focus:ring-2 focus:ring-[#324354] focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddAlias}
                                        className="px-4 py-2 bg-[#324354] hover:bg-[#25323f] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Agregar</span>
                                    </button>
                                </div>

                                {/* Lista interactiva de Chips */}
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 min-h-[60px] max-h-[160px] overflow-y-auto">
                                    {editingPlanta.alias.length === 0 ? (
                                        <span className="text-xs text-gray-400 italic my-auto">Sin alias registrados aún</span>
                                    ) : (
                                        editingPlanta.alias.map((al, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#324354] border border-gray-200 rounded-lg text-xs font-semibold shadow-xs group"
                                            >
                                                <span>{al}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAlias(idx)}
                                                    className="text-gray-400 hover:text-red-600 rounded p-0.5 transition-colors cursor-pointer"
                                                    title="Eliminar alias"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-end gap-3 mt-8 border-t border-gray-100 pt-5">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSavePlanta}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-[#324354] hover:bg-[#25323f] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <span>Guardar Cambios</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {plantaToDelete && (
                <div 
                    className="fixed inset-0 z-[11000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isDeleting) setPlantaToDelete(null)
                    }}
                >
                    <div 
                        className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-200 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                            ¿Eliminar Nomenclatura?
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Estás a punto de eliminar la planta <b>"{plantaToDelete.nombre_oficial}"</b> ({plantaToDelete.codigo}) y todos sus alias.
                        </p>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setPlantaToDelete(null)}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
