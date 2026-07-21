'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

interface MachineDropdownProps {
    onSelectMachine: (machine: string) => void
}

export default function MachineDropdown({ onSelectMachine }: MachineDropdownProps) {
    const [machines, setMachines] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchMachines = async () => {
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('REPUESTOS_MANTENIMIENTO')
                .select('Maquina')

            if (data) {
                const uniqueMachines = Array.from(new Set(data.map(item => item.Maquina).filter(Boolean))) as string[]
                setMachines(uniqueMachines.sort())
            }
            setLoading(false)
        }

        fetchMachines()
    }, [supabase])

    if (loading) {
        return <div className="text-xs text-gray-400 animate-pulse py-2">Cargando máquinas...</div>
    }

    return (
        <div className="mt-4">
            <label htmlFor="machine-select" className="block text-xs font-medium text-gray-700 mb-1">
                Seleccionar Máquina (Mantenimiento)
            </label>
            <select
                id="machine-select"
                onChange={(e) => onSelectMachine(e.target.value)}
                className="block w-full pl-3 pr-10 py-3 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-xl bg-gray-50 border transition-all duration-200"
                defaultValue=""
            >
                <option value="" disabled>
                    {machines.length > 0 ? 'Selecciona una máquina' : 'Sin datos encontrados'}
                </option>
                {machines.map((machine, index) => (
                    <option key={index} value={machine}>
                        {machine}
                    </option>
                ))}
            </select>
            {machines.length === 0 && (
                <div className="mt-2 text-[10px] text-red-500 bg-red-50 p-2 rounded border border-red-100">
                    <p className="font-bold">No se encontraron datos.</p>
                </div>
            )}
        </div>
    )
}
