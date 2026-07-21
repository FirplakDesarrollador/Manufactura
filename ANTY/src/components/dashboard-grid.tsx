'use client'

import { useState } from 'react'
import MachineDropdown from './machine-dropdown'
import SparePartsList from './spare-parts-list'

export default function DashboardGrid() {
    const [selectedMachine, setSelectedMachine] = useState<string | null>(null)

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Machine Selection */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Directivas Rápidas</h3>
                        <p className="text-xs text-gray-500">Gestión de máquinas</p>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">Selecciona una máquina para ver sus repuestos asociados.</p>
                <MachineDropdown onSelectMachine={setSelectedMachine} />
            </div>

            {/* Card 2: Spare Parts List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow lg:col-span-2 md:col-span-1">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Scripts Determinísticos</h3>
                        <p className="text-xs text-gray-500">Listado de Repuestos</p>
                    </div>
                </div>
                {!selectedMachine ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p>Selecciona una máquina para visualizar los repuestos asignados.</p>
                    </div>
                ) : (
                    <SparePartsList machineName={selectedMachine} />
                )}
            </div>
        </div>
    )
}
