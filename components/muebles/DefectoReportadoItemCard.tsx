'use client'

import React from 'react'
import { ReposicionMueble } from '@/types/muebles'
import { Calendar, Hash, User, Box, Image as ImageIcon, ExternalLink, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DefectoReportadoItemCardProps {
    reposicion: ReposicionMueble
}

export default function DefectoReportadoItemCard({ reposicion }: DefectoReportadoItemCardProps) {
    const formattedDate = format(new Date(reposicion.created_at), "dd MMM yyyy, HH:mm", { locale: es })

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group">
            {/* Header: OF & Status */}
            <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Hash size={16} className="text-blue-600" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none block mb-0.5">Orden de Fab.</span>
                        <span className="text-sm font-black text-gray-800">{reposicion.orden_fabricacion}</span>
                    </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    reposicion.reparable 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-red-100 text-red-700'
                }`}>
                    {reposicion.reparable ? 'Reparación' : 'Reposición'}
                </div>
            </div>

            {/* Product & Component */}
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <Box size={16} className="text-gray-400 mt-1 shrink-0" />
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none block mb-1">Producto</span>
                        <p className="text-xs font-medium text-gray-700 leading-normal">{reposicion.producto_descripcion}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">SKU: {reposicion.sku}</p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="p-1 px-1.5 bg-gray-50 rounded-md border border-gray-100 flex items-center gap-2 w-full">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Componente:</span>
                        <span className="text-[11px] font-black text-gray-600 truncate">{reposicion.componente}</span>
                    </div>
                </div>
            </div>

            {/* Evidence Photo */}
            {reposicion.foto ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-100 group/img">
                    <img 
                        src={reposicion.foto} 
                        alt="Evidencia del defecto" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <a 
                            href={reposicion.foto} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-white rounded-full text-gray-800 hover:scale-110 transition-transform shadow-xl"
                        >
                            <ExternalLink size={18} />
                        </a>
                    </div>
                </div>
            ) : (
                <div className="aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                    <ImageIcon size={24} className="text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Sin evidencia fotográfica</span>
                </div>
            )}

            {/* Footer: Metadata */}
            <div className="mt-2 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <User size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Supervisor</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-600 truncate">{reposicion.supervisor || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Registrado</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-600 truncate">{formattedDate}</span>
                </div>
            </div>

            {/* Secondary Badge: Taladro */}
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-blue-500 uppercase px-2 py-0.5 bg-blue-50 rounded-md border border-blue-100">
                    {reposicion.taladro || 'Centro No Espec.'}
                </span>
                {reposicion.of_pendiente && (
                    <span className="text-[9px] font-bold text-rose-500 uppercase px-2 py-0.5 bg-rose-50 rounded-md border border-rose-100 animate-pulse">
                        OF Pendiente
                    </span>
                )}
            </div>
        </div>
    )
}
