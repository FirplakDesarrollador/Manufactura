'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Fila única de pestañas (niveles 2 y 3). Centrada si caben; si no, se desplaza en horizontal
// como carrusel, con flechas a los lados para avanzar.
export default function CarruselPestanas({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const [izq, setIzq] = useState(false)
    const [der, setDer] = useState(false)

    const medir = useCallback(() => {
        const el = ref.current
        if (!el) return
        setIzq(el.scrollLeft > 2)
        setDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
    }, [])

    useEffect(() => {
        medir()
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(medir)
        ro.observe(el)
        if (el.firstElementChild) ro.observe(el.firstElementChild)
        return () => ro.disconnect()
    }, [medir])

    const mover = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: 'smooth' })

    const flecha = 'absolute top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white border border-slate-300 shadow-sm text-[#324354] hover:bg-slate-100'

    return (
        <div className={`relative w-full min-w-0 ${className}`}>
            {izq && (
                <button type="button" onClick={() => mover(-1)} className={`${flecha} left-0`} aria-label="Ver pestañas anteriores">
                    <ChevronLeft size={16} />
                </button>
            )}
            <div ref={ref} onScroll={medir} className={`overflow-x-auto scrollbar-hide scroll-smooth ${izq ? 'pl-9' : ''} ${der ? 'pr-9' : ''}`}>
                <div className="flex flex-nowrap items-center gap-2 sm:gap-3 w-max mx-auto py-0.5">{children}</div>
            </div>
            {der && (
                <button type="button" onClick={() => mover(1)} className={`${flecha} right-0`} aria-label="Ver más pestañas">
                    <ChevronRight size={16} />
                </button>
            )}
        </div>
    )
}
