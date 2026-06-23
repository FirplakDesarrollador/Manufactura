'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Home, ChevronLeft, Calendar, User, Briefcase, ChevronUp, ChevronDown, UserCheck, Search } from 'lucide-react'

export default function OPTHistoryPage() {
    const [observations, setObservations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
        key: 'Create_at',
        direction: 'desc'
    })
    const [searchTerm, setSearchTerm] = useState('')
    const router = useRouter()

    const supabase = createClient()

    useEffect(() => {
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('OPT')
                .select('*')
                .order('Create_at', { ascending: false })

            if (data) {
                // Filter out "junk" records that don't have an ID or a Title
                const validRecords = data.filter(obs => (obs.ID || obs.id) && (obs.Título || obs.titulo));
                setObservations(validRecords)
            }
            setLoading(false)
        }
        fetchHistory()
    }, [])

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const filteredAndSortedData = useMemo(() => {
        let filteredItems = [...observations]
        
        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase()
            filteredItems = filteredItems.filter(obs => {
                const id = (obs.ID || obs.id || '').toString().toLowerCase()
                const titulo = (obs.Título || obs.titulo || '').toLowerCase()
                const operario = (obs.Operario || obs.operario || '').toLowerCase()
                const puesto = (obs.Puesto || obs.puesto || '').toLowerCase()
                const creador = (obs['Created By'] || obs['Creado por'] || '').toLowerCase()
                
                return id.includes(lowerSearch) || 
                       titulo.includes(lowerSearch) || 
                       operario.includes(lowerSearch) || 
                       puesto.includes(lowerSearch) || 
                       creador.includes(lowerSearch)
            })
        }

        // Apply sorting
        if (sortConfig.key) {
            filteredItems.sort((a, b) => {
                let valA = a[sortConfig.key]
                let valB = b[sortConfig.key]

                // Special handling for ID column since it can be under multiple keys
                if (sortConfig.key === 'ID_COL') {
                    valA = a.ID || a.id || 0
                    valB = b.ID || b.id || 0
                    
                    // Numeric sort if possible
                    const numA = Number(valA)
                    const numB = Number(valB)
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
                    }
                }

                valA = (valA || '').toString().toLowerCase()
                valB = (valB || '').toString().toLowerCase()

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }
        return filteredItems
    }, [observations, sortConfig, searchTerm])

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <ChevronDown size={14} className="opacity-20" />
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    }

    return (
        <main className="flex min-h-screen flex-col bg-background">
            {/* Header */}
            <header className="bg-primary w-full text-white py-4 px-6 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <ChevronLeft size={32} />
                    </Link>
                    <h1 className="text-xl font-bold">Histórico OPT</h1>
                </div>
                <Image
                    src="/firplak-logo.png"
                    alt="Firplak Logo"
                    width={120}
                    height={40}
                    className="brightness-0 invert object-contain"
                />
            </header>

            <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-primary">Observaciones Guardadas</h2>
                    
                    <div className="flex flex-1 max-w-md w-full flex-col gap-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por ID, Título, Operario..."
                                className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-lg focus:border-secondary focus:outline-none transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                            {filteredAndSortedData.length} Registros encontrados
                        </div>
                    </div>

                    <Link
                        href="/observations/opt/new"
                        className="bg-secondary text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95 text-nowrap"
                    >
                        Nueva OPT
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredAndSortedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 italic">
                        <Calendar size={64} className="mb-4 opacity-20" />
                        <p>No se encontraron registros de OPT.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border-2 border-primary rounded-xl shadow-lg">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-primary text-white">
                                    <th 
                                        className="px-4 py-4 font-bold uppercase text-xs cursor-pointer hover:bg-[#3b5998] transition-colors"
                                        onClick={() => requestSort('ID_COL')}
                                    >
                                        <div className="flex items-center gap-2 text-nowrap">
                                            # <SortIcon columnKey="ID_COL" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-4 font-bold uppercase text-xs cursor-pointer hover:bg-[#3b5998] transition-colors"
                                        onClick={() => requestSort('Título')}
                                    >
                                        <div className="flex items-center gap-2 text-nowrap">
                                            Título <SortIcon columnKey="Título" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-4 font-bold uppercase text-xs cursor-pointer hover:bg-[#3b5998] transition-colors"
                                        onClick={() => requestSort('Operario')}
                                    >
                                        <div className="flex items-center gap-2 text-nowrap">
                                            Operario <SortIcon columnKey="Operario" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-4 font-bold uppercase text-xs cursor-pointer hover:bg-[#3b5998] transition-colors"
                                        onClick={() => requestSort('Puesto')}
                                    >
                                        <div className="flex items-center gap-2 text-nowrap">
                                            Puesto <SortIcon columnKey="Puesto" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-4 font-bold uppercase text-xs cursor-pointer hover:bg-[#3b5998] transition-colors"
                                        onClick={() => requestSort('Created By')}
                                    >
                                        <div className="flex items-center gap-2 text-nowrap">
                                            Creado por <SortIcon columnKey="Created By" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-4 font-bold uppercase text-xs cursor-pointer hover:bg-secondary transition-colors"
                                        onClick={() => requestSort('Create_at')}
                                    >
                                        <div className="flex items-center gap-2 text-nowrap">
                                            Fecha / Hora <SortIcon columnKey="Create_at" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredAndSortedData.map((obs, index) => (
                                    <tr
                                        key={`${obs.ID !== undefined ? obs.ID : obs.id}-${index}`}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => {
                                            const recordId = obs.ID !== undefined ? obs.ID : obs.id;
                                            if (recordId !== undefined && recordId !== null) {
                                                router.push(`/observations/opt/${recordId}`);
                                            } else {
                                                console.error('No ID found for record:', obs);
                                                alert('No se pudo encontrar el identificador de este registro.');
                                            }
                                        }}
                                    >
                                        <td className="px-4 py-4 text-xs font-medium text-gray-400">
                                            {(obs.ID !== undefined && obs.ID !== null && obs.ID !== '') ? obs.ID.toString() : ((obs.id !== undefined && obs.id !== null && obs.id !== '') ? obs.id.toString() : 'N/A')}
                                        </td>
                                        <td className="px-4 py-4 text-primary font-bold group-hover:text-secondary">
                                            {obs.Título || obs.titulo}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 text-sm">
                                            {obs.Operario || obs.operario}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 text-sm">
                                            {obs.Puesto || obs.puesto}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600 text-xs">
                                            {obs['Created By'] || obs['Creado por'] || 'N/A'}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600 text-xs whitespace-nowrap">
                                            {obs.Create_at ? new Date(obs.Create_at).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sticky Home Button */}
            <div className="fixed bottom-6 right-6">
                <Link
                    href="/"
                    className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <Home size={28} />
                </Link>
            </div>
        </main>
    )
}

