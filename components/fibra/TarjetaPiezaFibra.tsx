'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import OrdenCard from '@/components/pintura/OrdenCard'
import { Layers, AlertTriangle, PackageCheck, Loader2 } from 'lucide-react'
import { barrerOfCerradasSap } from '@/lib/fibra/cierreSap'
import TrazabilidadPiezaFibra from './TrazabilidadPiezaFibra'

// Tarjeta de una pieza en los módulos de piso FV (Vaciado, Pulido, Ensayo…): la tarjeta de la orden de Pintura
// y debajo la franja de la pieza (serial, último proceso con su trazabilidad, con las acciones del módulo a la derecha
interface TarjetaPiezaFibraProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    acciones: React.ReactNode
    pesos?: 'gelcoat' | 'resina'   // kilos por pieza en la tarjeta de la orden (Resina en Vaciado)
    extra?: React.ReactNode   // dato adicional en la franja (p. ej. componentes para la entrega en Digitado)
    franja?: string   // ya no cambia el color: la franja es gris Firplak en todos los módulos (se deja por compatibilidad)
}

export default function TarjetaPiezaFibra({ registro, orden, moldes, acciones, extra, pesos }: TarjetaPiezaFibraProps) {
    // OF cerrada en SAP: la pieza sale sola del proceso en el barrido de cada hora; el botón lo hace de una vez
    const cerradaSap = !orden && registro.of_pendiente === false
    const [retirando, setRetirando] = useState(false)
    const [retirada, setRetirada] = useState(false)
    const [errorRetiro, setErrorRetiro] = useState('')
    if (retirada) return null
    const retirar = async () => {
        setRetirando(true); setErrorRetiro('')
        try { await barrerOfCerradasSap(); setRetirada(true) }
        catch (e: any) { setErrorRetiro(e?.message || String(e)) }
        finally { setRetirando(false) }
    }
    return (
        <div className="bg-white border-2 border-[#e2ded5] rounded-lg">
            {orden ? (
                // La tarjeta de la orden solo informa: sin borde propio ni selección
                <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none [&>button]:cursor-default [&>button:hover]:bg-white">
                    <OrdenCard planta="fv" pesos={pesos} orden={orden} isActive={false} onClick={() => { }} moldes={moldes} />
                </div>
            ) : (
                <div className="p-3 text-xs">
                    <div className="font-bold text-gray-900">OF: {registro.orden_fabricacion}</div>
                    <div className="text-[11px] font-bold text-gray-800 mt-1">{registro.producto_descripcion || registro.producto_sku}</div>
                    {cerradaSap ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                <AlertTriangle size={12} /> OF cerrada en SAP: la pieza sale del proceso y pasa a CEDI en el próximo barrido (cada hora)
                            </span>
                            <button type="button" onClick={retirar} disabled={retirando}
                                className="h-7 px-2.5 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-[10px] font-bold flex items-center gap-1 disabled:opacity-60">
                                {retirando ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />} Pasar a CEDI ya
                            </button>
                            {errorRetiro && <span className="text-[10px] font-bold text-red-700">{errorRetiro}</span>}
                        </div>
                    ) : (
                        <div className="mt-1 text-[10px] font-bold text-red-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> La OF no está en las órdenes de fabricación FV cargadas
                        </div>
                    )}
                </div>
            )}

            {/* Franja de la pieza: gris cálido Firplak (crema con borde #e2ded5) en todos los módulos */}
            <div className="rounded-b-md border-t-2 border-[#e2ded5] bg-[#F6F3EE] px-3 py-1 flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3">
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 sm:gap-x-5 lg:gap-x-4 2xl:gap-x-6 gap-y-1 flex-1 min-w-0">
                    {/* En celular molde (serial) y último proceso en un solo renglón (sin íconos, letra menor) */}
                    <div className="flex flex-nowrap items-center gap-x-3 sm:gap-x-6 min-w-0">
                    <div className="flex items-center gap-2">
                        <Layers size={16} className="text-[#7B8E90] shrink-0 hidden sm:block" />
                        <div>
                            <p className="text-[10px] text-[#7B8E90] uppercase font-black leading-none">Molde</p>
                            <p className="text-sm sm:text-base font-black text-[#324354] leading-tight whitespace-nowrap">{registro.molde_serial}</p>
                        </div>
                    </div>
                    <TrazabilidadPiezaFibra registro={registro} />
                    </div>
                    {extra}
                </div>

                {/* En celular los botones en un solo renglón, repartidos a lo ancho y con letra más pequeña */}
                {/* En pantallas de planta (≈1266 px a zoom 100 %) botones más compactos para que la franja quepa en un renglón */}
                <div className="flex flex-nowrap sm:flex-wrap lg:flex-nowrap gap-2 shrink-0 [&>*]:flex-1 [&>*]:min-w-0 sm:[&>*]:flex-none [&_button]:px-2 sm:[&_button]:px-4 lg:[&_button]:px-3 2xl:[&_button]:px-4 [&_button]:text-xs sm:[&_button]:text-sm lg:[&_button]:text-xs 2xl:[&_button]:text-sm [&_button]:whitespace-nowrap [&_button]:h-9">{acciones}</div>
            </div>
        </div>
    )
}
