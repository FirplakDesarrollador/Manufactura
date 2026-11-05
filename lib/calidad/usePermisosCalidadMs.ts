'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { permisosCalidadMs, type PermisosCalidadMs } from '@/lib/calidad/permisos'

// Una sola consulta por carga de página, compartida por la barra y las vistas de Calidad MS
let cache: Promise<PermisosCalidadMs | null> | null = null

function cargar(): Promise<PermisosCalidadMs | null> {
    if (!cache) {
        cache = (async () => {
            const { data: auth } = await supabase.auth.getUser()
            if (!auth?.user) return null
            const { data } = await supabase
                .from('usuarios')
                .select('nombre, correo, rol, permisos')
                .eq('uuid', auth.user.id)
                .maybeSingle()
            return permisosCalidadMs(data)
        })().catch(() => {
            cache = null
            return null
        })
    }
    return cache
}

export function usePermisosCalidadMs() {
    const [permisos, setPermisos] = useState<PermisosCalidadMs | null>(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        let vivo = true
        void cargar().then(p => {
            if (!vivo) return
            setPermisos(p)
            setCargando(false)
        })
        return () => {
            vivo = false
        }
    }, [])

    return { permisos, cargando }
}
