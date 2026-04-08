import { supabase } from '@/lib/supabase'
import { OrdenMueble, MetricasMuebles, Defecto, ConteoDefecto, ReposicionMueble, Turno, Supervisor, SupervisorTurno } from '@/types/muebles'

export async function getOrdenesMuebles(planta?: string) {
    let query = supabase
        .from('query_of_muebles')
        .select('*')
        .order('id', { ascending: false })

    if (planta) {
        query = query.eq('planta', planta)
    }

    const { data, error } = await query

    if (error) throw error
    return data as OrdenMueble[]
}

export async function getMetricasMueblesHoy(turno?: string) {
    const today = new Date().toISOString().split('T')[0]
    let query = supabase
        .from('metricas_turno_dia_muebles')
        .select('*')
        .eq('fecha', today)
        .eq('planta', 'Muebles')

    if (turno) {
        query = query.eq('turno', turno)
    }

    const { data, error } = await query

    if (error) throw error
    return data as MetricasMuebles[]
}

export async function registrarTrazabilidadMueble(payload: {
    orden_fabricacion: string,
    cantidad: number,
    creado_por: string,
    proceso: string,
    taladro?: string
}) {
    const { data, error } = await supabase
        .from('trazabilidad_muebles')
        .insert([{
            orden_fabricacion: payload.orden_fabricacion,
            cantidad: payload.cantidad,
            creado_por: payload.creado_por,
            proceso: payload.proceso,
            taladro: payload.taladro || 'NO APLICA',
            created_at: new Date().toISOString()
        }])

    if (error) throw error
    return data
}

export async function getCediActual(planta: string) {
    const { data, error } = await supabase
    .from('query_cedi_actual_muebles')
    .select('*')
    .eq('planta', planta)
    .maybeSingle()

    if (error) throw error
    return data
}

export async function getDefectos(activeOnly?: boolean) {
    let query = supabase
        .from('defectos')
        .select('*')
        .order('nombre', { ascending: true })

    if (activeOnly !== undefined) {
        query = query.eq('estado', activeOnly)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Defecto[]
}

export async function upsertDefecto(defecto: Partial<Defecto>) {
    const { data, error } = await supabase
        .from('defectos')
        .upsert([defecto])
        .select()

    if (error) throw error
    return data
}

export async function deleteDefecto(id: number) {
    const { error } = await supabase
        .from('defectos')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function getConteoDefectos(filters: {
    fecha: string,
    planta: string,
    turno?: string,
    taladros?: string[],
    tipos?: boolean[]
}) {
    let query = supabase
        .from('query_conteo_defectos_mb')
        .select('*')
        .eq('fecha', filters.fecha)
        .eq('planta', filters.planta)

    if (filters.turno) {
        query = query.eq('turno', filters.turno)
    }

    if (filters.taladros && filters.taladros.length > 0) {
        query = query.in('taladro', filters.taladros)
    }

    if (filters.tipos && filters.tipos.length > 0) {
        query = query.in('reparable', filters.tipos)
    }

    const { data, error } = await query
    if (error) throw error
    return data as ConteoDefecto[]
}

export async function getReposicionesByIds(ids: number[]) {
    if (!ids || ids.length === 0) return []
    
    const { data, error } = await supabase
        .from('query_reposiciones_muebles')
        .select('*')
        .in('id', ids)
        .order('id', { ascending: false })

    if (error) throw error
    return data as ReposicionMueble[]
}

export async function getMetricasDashboard(planta: string) {
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setHours(fifteenDaysAgo.getHours() - 360)

    const { data, error } = await supabase
        .from('metricas_turno_dia_muebles')
        .select('*')
        .gte('fecha', fifteenDaysAgo.toISOString().split('T')[0])
        .eq('planta', planta)
        .order('fecha', { ascending: false })
        .order('turno', { ascending: false })

    if (error) throw error
    return data as MetricasMuebles[]
}

export async function getTurnos() {
    const { data, error } = await supabase
        .from('turnos')
        .select('*')
        .order('turno', { ascending: true })

    if (error) throw error
    return data as Turno[]
}

export async function updateTurno(id: number, updates: Partial<Turno>) {
    const { data, error } = await supabase
        .from('turnos')
        .update(updates)
        .eq('id', id)
        .select()

    if (error) throw error
    return data
}

export async function getSupervisores() {
    const { data, error } = await supabase
        .from('supervisores')
        .select('*')
        .order('supervisor', { ascending: true })

    if (error) throw error
    return data as Supervisor[]
}

export async function getSupervisoresTurno() {
    const { data, error } = await supabase
        .from('query_supervisores_turno')
        .select('*')
        .order('turno', { ascending: true })

    if (error) throw error
    return data as SupervisorTurno[]
}

export async function updateSupervisorTurno(id: number, supervisor_id: number) {
    const { data, error } = await supabase
        .from('supervisores_turno')
        .update({ supervisor_id })
        .eq('id', id)
        .select()

    if (error) throw error
    return data
}

export async function updateUserPlant(userUuid: string, newPlant: string) {
    const { data, error } = await supabase
        .from('usuarios')
        .update({ planta_muebles: newPlant })
        .eq('uuid', userUuid)
        .select()

    if (error) throw error
    return data
}
