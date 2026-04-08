'use client'

import React, { useState, useEffect } from 'react'
import { updateUserPlant } from '@/lib/supabase/queries/muebles'
import { RefreshCcw, Loader2, Building2, ChevronRight, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface CambiarPlantaModalProps {
    userUuid: string
    currentPlant: string
    onClose: () => void
    onPlantChanged: () => void
}

export default function CambiarPlantaModal({ userUuid, currentPlant, onClose, onPlantChanged }: CambiarPlantaModalProps) {
    const [isTransitioning, setIsTransitioning] = useState(false)
    const newPlant = currentPlant === 'Muebles' ? 'Cefi' : 'Muebles'

    const handleSwitch = async () => {
        setIsTransitioning(true)
        try {
            await updateUserPlant(userUuid, newPlant)
            
            // Artificial delay to show the nice animation as in the legacy app
            await new Promise(resolve => setTimeout(resolve, 2500))
            
            toast.success(`Cambiado exitosamente a Planta ${newPlant}`)
            onPlantChanged()
        } catch (error) {
            console.error('Error switching plant:', error)
            toast.error('Error al cambiar de planta')
            setIsTransitioning(false)
        }
    }

    if (isTransitioning) {
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center">
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500" />
                
                <div className="relative flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
                    <div className="relative">
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl animate-pulse" />
                        <div className="p-8 bg-white/10 rounded-[30%] border border-white/20 backdrop-blur-md animate-[spin_3s_linear_infinite]">
                            <RefreshCcw size={80} className="text-white" />
                        </div>
                    </div>
                    
                    <div className="text-center space-y-3">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter animate-pulse">Cambiando Planta</h2>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-sm font-bold text-white/40 uppercase tracking-widest">{currentPlant}</span>
                            <ChevronRight className="text-white/20" />
                            <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">{newPlant}</span>
                        </div>
                    </div>
                    
                    <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full animate-[progress_2.5s_ease-in-out_forwards]" style={{ width: '0%' }} />
                    </div>
                </div>
                
                <style jsx>{`
                    @keyframes progress {
                        from { width: 0%; }
                        to { width: 100%; }
                    }
                `}</style>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 pb-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 ring-8 ring-indigo-50/50">
                            <Building2 size={40} />
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight leading-none mb-2">Cambiar de Planta</h2>
                            <p className="text-sm font-bold text-gray-500 max-w-[280px]">
                                Al cambiar de planta, verás las órdenes y métricas correspondientes a la nueva ubicación.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${currentPlant === 'Muebles' ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-gray-50 border-transparent opacity-60'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Actual</span>
                            <span className="text-sm font-black text-gray-700">Muebles</span>
                        </div>
                        <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${currentPlant === 'Cefi' ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-gray-50 border-transparent opacity-60'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Actual</span>
                            <span className="text-sm font-black text-gray-700">Cefi</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-0 flex flex-col gap-3">
                    <button 
                        onClick={handleSwitch}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        <Zap size={18} className="group-hover:animate-bounce" fill="currentColor" />
                        Cambiar a Planta {newPlant}
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                </div>

                <div className="px-8 py-3 bg-slate-50 border-t border-gray-100 flex items-center justify-center gap-2">
                    <RefreshCcw size={12} className="text-gray-400" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sincronización Automática activada</span>
                </div>
            </div>
        </div>
    )
}
