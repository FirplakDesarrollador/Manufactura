import React from 'react'
import { Molde } from '@/types/pintura'

interface MoldSelectorProps {
    moldes: Molde[]
    selectedMolde: Molde | null
    onSelectMolde: (molde: Molde) => void
    disabled?: boolean
}

export default function MoldSelector({
    moldes,
    selectedMolde,
    onSelectMolde,
    disabled = false
}: MoldSelectorProps) {
    return (
        <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-900 mb-2">
                Seleccionar Molde
            </label>

            <select
                value={selectedMolde?.id || ''}
                onChange={(e) => {
                    const molde = moldes.find(m => m.id === parseInt(e.target.value))
                    if (molde) onSelectMolde(molde)
                }}
                disabled={disabled || moldes.length === 0}
                className="w-full px-4 py-3 text-base font-medium text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#254153] focus:border-[#254153] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
                <option value="">
                    {moldes.length === 0 ? 'No hay moldes disponibles' : 'Seleccione un molde'}
                </option>
                {moldes.map((molde) => (
                    <option key={molde.id} value={molde.id}>
                        {molde.serial} - {molde.molde_descripcion} (Vueltas: {molde.vueltas_actuales}/{molde.vueltas_totales})
                    </option>
                ))}
            </select>

            {selectedMolde && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-bold text-gray-900">Serial:</span>
                            <span className="ml-2 text-gray-900 font-bold">{selectedMolde.serial}</span>
                        </div>
                        <div>
                            <span className="font-bold text-gray-900">Estado:</span>
                            <span className="ml-2 text-gray-900 font-bold">{selectedMolde.estado}</span>
                        </div>
                        <div>
                            <span className="font-bold text-gray-900">Vueltas Actuales:</span>
                            <span className="ml-2 text-gray-900 font-bold">{selectedMolde.vueltas_actuales}</span>
                        </div>
                        <div>
                            <span className="font-bold text-gray-900">Vueltas Mto:</span>
                            <span className="ml-2 text-gray-900 font-bold">{selectedMolde.vueltas_totales}</span>
                        </div>
                        {selectedMolde.linea && (
                            <div className="col-span-2">
                                <span className="font-bold text-gray-900">Línea Actual:</span>
                                <span className="ml-2 text-gray-900 font-bold">{selectedMolde.linea}</span>
                            </div>
                        )}
                    </div>

                    {/* Warning if mold needs maintenance soon */}
                    {selectedMolde.vueltas_actuales >= selectedMolde.vueltas_totales * 0.9 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                            ⚠️ Este molde está próximo a mantenimiento
                        </div>
                    )}

                    {selectedMolde.vueltas_actuales >= selectedMolde.vueltas_totales && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                            🚨 Este molde requiere mantenimiento
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
