'use client'

import React from 'react'
import { Defecto } from '@/types/muebles'
import { AlertCircle, Edit2, CheckCircle2, XCircle } from 'lucide-react'

interface DefectoCardProps {
    defecto: Defecto
    onClick: () => void
}

export default function DefectoCard({ defecto, onClick }: DefectoCardProps) {
    return (
        <div 
            onClick={onClick}
            className="group relative bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer overflow-hidden"
        >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${defecto.estado ? 'bg-emerald-500' : 'bg-gray-300'}`} />

            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${defecto.estado ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                        {defecto.estado ? (
                            <CheckCircle2 className="text-emerald-500" size={20} />
                        ) : (
                            <XCircle className="text-gray-400" size={20} />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">{defecto.nombre}</h3>
                        <p className="text-xs text-gray-500">ID: {defecto.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex gap-4">
                        <div className="text-center px-3 py-1 bg-amber-50 rounded-lg border border-amber-100">
                            <span className="text-[10px] uppercase font-bold text-amber-600 block leading-none">A. Amarilla</span>
                            <span className="text-sm font-black text-amber-700">{defecto.alerta_amarilla}</span>
                        </div>
                        <div className="text-center px-3 py-1 bg-red-50 rounded-lg border border-red-100">
                            <span className="text-[10px] uppercase font-bold text-red-600 block leading-none">A. Roja</span>
                            <span className="text-sm font-black text-red-700">{defecto.alerta_roja}</span>
                        </div>
                    </div>
                    
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                        <Edit2 size={18} />
                    </button>
                </div>
            </div>

            {!defecto.estado && (
                <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-md w-fit">
                    <AlertCircle size={10} className="text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Inactivo</span>
                </div>
            )}
        </div>
    )
}
