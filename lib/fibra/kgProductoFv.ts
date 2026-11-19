'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Kilos de una unidad de producto FV = resina + gelcoat de todas sus piezas (bañera + faldón), con la reducción en %
// de Parámetros FV (tabla productos_fv_pesos). Un registro de trazabilidad FV es una unidad del producto de la OF.
// Se lee una vez por pantalla. Producto sin cálculo en Parámetros → no tiene kilos (se informa, no se cuenta como 0).

export type KgPorSku = Map<string, number>

let promesa: Promise<KgPorSku> | null = null

export function cargarKgPorSku(forzar = false): Promise<KgPorSku> {
    if (promesa && !forzar) return promesa
    promesa = (async () => {
        const mapa: KgPorSku = new Map()
        for (let i = 0; ; i += 1000) {
            const { data, error } = await supabase.from('productos_fv_pesos')
                .select('producto_sku, resina_banera_kg, resina_faldon_kg, gelcoat_banera_kg, gelcoat_faldon_kg, porcentaje_reduccion_resina, porcentaje_reduccion_gelcoat')
                .range(i, i + 999)
            if (error) throw new Error(error.message)
            for (const f of data || []) {
                const resina = (Number(f.resina_banera_kg) || 0) + (Number(f.resina_faldon_kg) || 0)
                const gelcoat = (Number(f.gelcoat_banera_kg) || 0) + (Number(f.gelcoat_faldon_kg) || 0)
                if (resina + gelcoat <= 0) continue
                const kg = resina * (1 - (Number(f.porcentaje_reduccion_resina) || 0) / 100) + gelcoat * (1 - (Number(f.porcentaje_reduccion_gelcoat) || 0) / 100)
                mapa.set(String(f.producto_sku).trim(), Math.round(kg * 100) / 100)
            }
            if (!data || data.length < 1000) break
        }
        return mapa
    })()
    promesa.catch(() => { promesa = null })
    return promesa
}

export function useKgPorSku(): KgPorSku | null {
    const [mapa, setMapa] = useState<KgPorSku | null>(null)
    useEffect(() => {
        let vivo = true
        cargarKgPorSku().then(m => { if (vivo) setMapa(m) }).catch(e => console.error('Kilos FV por producto:', e))
        return () => { vivo = false }
    }, [])
    return mapa
}
