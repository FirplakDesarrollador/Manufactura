'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { permisosCalidadMs, permisosCalidadRmold, type PermisosCalidadMs } from '@/lib/calidad/permisos'
import { usePlantaCalidad } from '@/lib/calidad/plantaCalidad'

// Una sola consulta por carga de página, compartida por la barra y las vistas de Calidad MS / RMOLD.
// Los permisos dependen de la planta de la ruta (/calidad/ms o /calidad/rmold).
type FilaUsuario = { nombre?: string | null; correo?: string | null; rol?: string | null; permisos?: unknown } | null
let cache: Promise<FilaUsuario> | null = null

function cargar(): Promise<FilaUsuario> {
    if (!cache) {
        cache = (async () => {
            const { data: auth } = await supabase.auth.getUser()
            if (!auth?.user) return null
            const { data } = await supabase
                .from('usuarios')
                .select('nombre, correo, rol, permisos')
                .eq('uuid', auth.user.id)
                .maybeSingle()
            return (data as FilaUsuario) ?? null
        })().catch(() => {
            cache = null
            return null
        })
    }
    return cache
}

export function usePermisosCalidadMs() {
    const planta = usePlantaCalidad()
    const [permisos, setPermisos] = useState<PermisosCalidadMs | null>(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        let vivo = true
        void cargar().then(u => {
            if (!vivo) return
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setPermisos(planta.id === 'rmold' ? permisosCalidadRmold(u as any) : permisosCalidadMs(u as any))
            setCargando(false)
        })
        return () => {
            vivo = false
        }
    }, [planta.id])

    return { permisos, cargando }
}
