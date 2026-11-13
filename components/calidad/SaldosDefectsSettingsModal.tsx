import React, { useState, useEffect } from 'react'
import { X, Save, Search, Plus, Pencil, Check } from 'lucide-react'

export interface DefectoSaldoDestruccion {
    id: number
    defecto: string
    saldo_o_destruccion: 'Saldo' | 'Destrucción' | string
    Requiere_Foto?: boolean
    Requiere_Referencia_Molde?: boolean
}

interface SaldosDefectsSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    defects: DefectoSaldoDestruccion[]
    onSave: (updatedDefects: DefectoSaldoDestruccion[]) => Promise<void>
    // Garantes: pueden cambiar el nombre de los defectos y agregar nuevos (ids negativos = nuevos)
    puedeEditarDefectos?: boolean
}

const normalizarNombre = (s: string) => s.replace(/\s+/g, ' ').trim().toUpperCase()

export const SaldosDefectsSettingsModal: React.FC<SaldosDefectsSettingsModalProps> = ({
    isOpen,
    onClose,
    defects,
    onSave,
    puedeEditarDefectos = false
}) => {
    const [localDefects, setLocalDefects] = useState<DefectoSaldoDestruccion[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<'Todos' | 'Saldo' | 'Destrucción'>('Todos')
    const [editandoId, setEditandoId] = useState<number | null>(null)
    const [nombreEditado, setNombreEditado] = useState('')
    const [agregando, setAgregando] = useState(false)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [nuevoTipo, setNuevoTipo] = useState<'Saldo' | 'Destrucción'>('Saldo')
    const [aviso, setAviso] = useState('')

    useEffect(() => {
        if (isOpen) {
            setLocalDefects(JSON.parse(JSON.stringify(defects)))
            setSearchQuery('')
            setTypeFilter('Todos')
            setEditandoId(null)
            setAgregando(false)
            setNuevoNombre('')
            setAviso('')
        }
    }, [isOpen, defects])

    if (!isOpen) return null

    const original = (id: number) => defects.find(d => d.id === id)
    const repetido = (nombre: string, tipo: string, id?: number) =>
        localDefects.some(d => d.id !== id && d.saldo_o_destruccion === tipo && normalizarNombre(d.defecto) === nombre)

    const handleToggle = (id: number, field: 'Requiere_Foto' | 'Requiere_Referencia_Molde') => {
        setLocalDefects(prev => prev.map(d => (d.id === id ? { ...d, [field]: !d[field] } : d)))
    }

    const confirmarNombre = () => {
        if (editandoId === null) return
        const d = localDefects.find(x => x.id === editandoId)
        const nombre = normalizarNombre(nombreEditado)
        if (!d) return setEditandoId(null)
        if (!nombre) return setAviso('El nombre del defecto no puede quedar vacío.')
        if (repetido(nombre, d.saldo_o_destruccion, d.id)) return setAviso(`Ya existe "${nombre}" en ${d.saldo_o_destruccion}.`)
        setLocalDefects(prev => prev.map(x => (x.id === editandoId ? { ...x, defecto: nombre } : x)))
        setEditandoId(null)
        setAviso('')
    }

    const agregarDefecto = () => {
        const nombre = normalizarNombre(nuevoNombre)
        if (!nombre) return setAviso('Escriba el nombre del nuevo defecto.')
        if (repetido(nombre, nuevoTipo)) return setAviso(`Ya existe "${nombre}" en ${nuevoTipo}.`)
        const idTemporal = Math.min(0, ...localDefects.map(d => d.id)) - 1
        setLocalDefects(prev => [{ id: idTemporal, defecto: nombre, saldo_o_destruccion: nuevoTipo, Requiere_Foto: true, Requiere_Referencia_Molde: false }, ...prev])
        setNuevoNombre('')
        setAgregando(false)
        setAviso('')
        setTypeFilter(nuevoTipo)
        setSearchQuery('')
    }

    const handleSaveClick = async () => {
        if (editandoId !== null) return setAviso('Confirme (✓) o cancele el nombre que está editando antes de guardar.')
        setIsSaving(true)
        await onSave(localDefects)
        setIsSaving(false)
    }

    const filteredDefects = localDefects.filter(d => {
        const matchesSearch = d.defecto.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = typeFilter === 'Todos' || d.saldo_o_destruccion === typeFilter
        return matchesSearch && matchesType
    })

    const abrirAgregar = () => {
        setNuevoTipo(typeFilter === 'Destrucción' ? 'Destrucción' : 'Saldo')
        setAgregando(true)
        setAviso('')
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-[#254153]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#254153] text-white rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-wider">Configuración de Defectos</h2>
                        <p className="text-[11px] text-blue-200 uppercase tracking-widest font-semibold">
                            Saldos y Destrucciones
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors text-white" title="Cerrar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar defecto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border border-gray-300 rounded pl-9 pr-3 py-1.5 text-sm w-64 focus:outline-none focus:border-[#254153] bg-white font-medium shadow-inner"
                            />
                        </div>
                        <div className="flex items-center bg-gray-200 rounded p-0.5 text-xs font-bold">
                            {(['Todos', 'Saldo', 'Destrucción'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1 rounded transition-colors ${
                                        typeFilter === t
                                            ? 'bg-white text-[#254153] shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        {puedeEditarDefectos && (
                            <button
                                onClick={abrirAgregar}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#324354] hover:bg-[#25323f] text-white text-xs font-bold"
                                title="Agregar un defecto nuevo de saldo o de destrucción"
                            >
                                <Plus className="w-3.5 h-3.5" /> Agregar defecto
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className={`flex items-center space-x-2 px-5 py-2 text-white font-black text-xs uppercase tracking-wider rounded shadow-md transition-all ${
                            isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#36A284] hover:bg-[#2b856b] hover:shadow-lg'
                        }`}
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                </div>

                {/* Nuevo defecto */}
                {puedeEditarDefectos && agregando && (
                    <div className="px-6 py-3 border-b border-amber-300 bg-amber-50 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">Nuevo defecto</span>
                        <input
                            autoFocus
                            value={nuevoNombre}
                            onChange={e => setNuevoNombre(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') agregarDefecto(); if (e.key === 'Escape') setAgregando(false) }}
                            placeholder="Nombre del defecto"
                            className="flex-1 min-w-[200px] border border-amber-300 rounded-lg px-3 py-1.5 text-sm font-bold uppercase bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                        />
                        <div className="flex items-center bg-white border border-amber-300 rounded p-0.5 text-xs font-bold">
                            {(['Saldo', 'Destrucción'] as const).map(t => (
                                <button key={t} onClick={() => setNuevoTipo(t)}
                                    className={`px-3 py-1 rounded ${nuevoTipo === t ? (t === 'Saldo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700') : 'text-gray-500 hover:text-gray-800'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button onClick={agregarDefecto} className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold">Agregar</button>
                        <button onClick={() => { setAgregando(false); setAviso('') }} className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold">Cancelar</button>
                    </div>
                )}

                {aviso && (
                    <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold">{aviso}</div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-auto bg-gray-100 p-6">
                    <div className="bg-white border border-gray-200 rounded shadow-xs overflow-hidden">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                                    <th className="px-6 py-3">Defecto</th>
                                    <th className="px-6 py-3 text-center">Tipo</th>
                                    <th className="px-6 py-3 text-center">Requiere Foto</th>
                                    <th className="px-6 py-3 text-center">Referencia Molde</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDefects.map((defect) => {
                                    const isDest = defect.saldo_o_destruccion === 'Destrucción'
                                    const esNuevo = defect.id < 0
                                    const antes = original(defect.id)
                                    const renombrado = !!antes && antes.defecto !== defect.defecto
                                    const editando = editandoId === defect.id
                                    return (
                                        <tr key={defect.id} className={`transition-colors ${esNuevo || renombrado ? 'bg-amber-50/70' : 'hover:bg-gray-50'}`}>
                                            <td className="px-6 py-3 font-bold text-gray-800">
                                                {editando ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            autoFocus
                                                            value={nombreEditado}
                                                            onChange={e => setNombreEditado(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') confirmarNombre(); if (e.key === 'Escape') { setEditandoId(null); setAviso('') } }}
                                                            className="flex-1 border border-amber-300 rounded-lg px-2 py-1 text-sm font-bold uppercase bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                                                        />
                                                        <button onClick={confirmarNombre} className="p-1 rounded bg-amber-500 hover:bg-amber-600 text-white" title="Confirmar nombre"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => { setEditandoId(null); setAviso('') }} className="p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-600" title="Cancelar"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 group">
                                                        <span>{defect.defecto}</span>
                                                        {esNuevo && <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 px-1.5 rounded">Nuevo</span>}
                                                        {renombrado && <span className="text-[9px] font-semibold text-amber-800" title={`Nombre anterior: ${antes?.defecto}`}>antes: {antes?.defecto}</span>}
                                                        {puedeEditarDefectos && (
                                                            <button
                                                                onClick={() => { setEditandoId(defect.id); setNombreEditado(defect.defecto); setAviso('') }}
                                                                className="p-1 rounded text-gray-400 hover:text-[#324354] hover:bg-gray-100 opacity-60 group-hover:opacity-100"
                                                                title="Cambiar nombre"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`px-2 py-0.5 inline-flex text-[10px] font-black uppercase tracking-wider rounded-full ${
                                                    isDest ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {defect.saldo_o_destruccion}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <label className="inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!defect.Requiere_Foto}
                                                        onChange={() => handleToggle(defect.id, 'Requiere_Foto')}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#254153]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#254153]"></div>
                                                </label>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <label className="inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!defect.Requiere_Referencia_Molde}
                                                        onChange={() => handleToggle(defect.id, 'Requiere_Referencia_Molde')}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#254153]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#254153]"></div>
                                                </label>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filteredDefects.length === 0 && (
                            <div className="p-8 text-center text-gray-500 font-medium">
                                No se encontraron defectos con esa búsqueda.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
