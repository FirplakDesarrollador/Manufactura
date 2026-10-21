import React, { useState, useEffect } from 'react'
import { X, Save, Search, Filter } from 'lucide-react'

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
}

export const SaldosDefectsSettingsModal: React.FC<SaldosDefectsSettingsModalProps> = ({
    isOpen,
    onClose,
    defects,
    onSave
}) => {
    const [localDefects, setLocalDefects] = useState<DefectoSaldoDestruccion[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<'Todos' | 'Saldo' | 'Destrucción'>('Todos')

    useEffect(() => {
        if (isOpen) {
            setLocalDefects(JSON.parse(JSON.stringify(defects)))
            setSearchQuery('')
            setTypeFilter('Todos')
        }
    }, [isOpen, defects])

    if (!isOpen) return null

    const handleToggle = (id: number, field: 'Requiere_Foto' | 'Requiere_Referencia_Molde') => {
        setLocalDefects(prev => prev.map(d => {
            if (d.id === id) {
                return { ...d, [field]: !d[field] }
            }
            return d
        }))
    }

    const handleSaveClick = async () => {
        setIsSaving(true)
        await onSave(localDefects)
        setIsSaving(false)
    }

    const filteredDefects = localDefects.filter(d => {
        const matchesSearch = d.defecto.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = typeFilter === 'Todos' || d.saldo_o_destruccion === typeFilter
        return matchesSearch && matchesType
    })

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-[#254153]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#254153] text-white rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-wider">Configuración de Defectos</h2>
                        <p className="text-[11px] text-blue-200 uppercase tracking-widest font-semibold">
                            Saldos y Destrucciones
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center gap-3">
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
                                    return (
                                        <tr key={defect.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-bold text-gray-800">
                                                {defect.defecto}
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
