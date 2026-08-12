import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

interface DefectoMS {
    id: number
    defecto?: string
    Defecto?: string
    nombre?: string
    Nombre?: string
    Al_amarilla?: number
    Al_roja?: number
    Al_azul?: number
    Requiere_Foto?: boolean
    Requiere_Referencia_Molde?: boolean
}

interface DefectsSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    defects: DefectoMS[]
    onSave: (updatedDefects: DefectoMS[]) => Promise<void>
}

export const DefectsSettingsModal: React.FC<DefectsSettingsModalProps> = ({
    isOpen,
    onClose,
    defects,
    onSave
}) => {
    const [localDefects, setLocalDefects] = useState<DefectoMS[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (isOpen) {
            // Deep copy to avoid mutating the original until saved
            setLocalDefects(JSON.parse(JSON.stringify(defects)))
            setSearchQuery('')
        }
    }, [isOpen, defects])

    if (!isOpen) return null

    const handleUpdate = (index: number, field: keyof DefectoMS, value: any) => {
        const newDefects = [...localDefects]
        newDefects[index] = { ...newDefects[index], [field]: value }
        setLocalDefects(newDefects)
    }

    const handleSaveClick = async () => {
        setIsSaving(true)
        await onSave(localDefects)
        setIsSaving(false)
        onClose()
    }

    const filteredDefects = localDefects.map((defect, originalIndex) => ({
        defect,
        originalIndex
    })).filter(({ defect }) => {
        const name = defect.defecto || defect.Defecto || defect.nombre || defect.Nombre || ''
        return name.toLowerCase().includes(searchQuery.toLowerCase())
    })

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#254153] text-white rounded-t-lg">
                    <h2 className="text-lg font-black uppercase tracking-wider">Configuración de Defectos</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <input
                        type="text"
                        placeholder="Buscar defecto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-[#254153]"
                    />
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className={`flex items-center space-x-2 px-4 py-2 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors ${
                            isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#36A284] hover:bg-[#2b856b]'
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
                    <div className="bg-white border border-gray-200 rounded shadow-sm">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                                    <th className="px-4 py-3">Defecto</th>
                                    <th className="px-4 py-3 text-center">Amarilla (Min)</th>
                                    <th className="px-4 py-3 text-center">Azul (Min)</th>
                                    <th className="px-4 py-3 text-center">Roja (Min)</th>
                                    <th className="px-4 py-3 text-center">Requiere Foto</th>
                                    <th className="px-4 py-3 text-center">Referencia Molde</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDefects.map(({ defect, originalIndex }) => {
                                    const name = defect.defecto || defect.Defecto || defect.nombre || defect.Nombre || 'Defecto'
                                    return (
                                        <tr key={defect.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 font-medium text-gray-800">
                                                {name}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={defect.Al_amarilla || 0}
                                                    onChange={(e) => handleUpdate(originalIndex, 'Al_amarilla', parseInt(e.target.value) || 0)}
                                                    className="w-16 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:border-yellow-500 bg-yellow-50"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={defect.Al_azul || 0}
                                                    onChange={(e) => handleUpdate(originalIndex, 'Al_azul', parseInt(e.target.value) || 0)}
                                                    className="w-16 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:border-blue-500 bg-blue-50"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={defect.Al_roja || 0}
                                                    onChange={(e) => handleUpdate(originalIndex, 'Al_roja', parseInt(e.target.value) || 0)}
                                                    className="w-16 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:border-red-500 bg-red-50"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <label className="inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!defect.Requiere_Foto}
                                                        onChange={(e) => handleUpdate(originalIndex, 'Requiere_Foto', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#254153]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#254153]"></div>
                                                </label>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <label className="inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!defect.Requiere_Referencia_Molde}
                                                        onChange={(e) => handleUpdate(originalIndex, 'Requiere_Referencia_Molde', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#254153]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#254153]"></div>
                                                </label>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filteredDefects.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No se encontraron defectos con esa búsqueda.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
