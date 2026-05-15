import { supabase } from '@/lib/supabase'

/**
 * Obtiene la tarea activa de un usuario por su correo
 */
export async function getTareaActiva(email: string) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('tarea_activa')
        .eq('correo', email)
        .maybeSingle()
    
    if (error) {
        console.error('Error fetching active task:', error)
        return null
    }
    return data?.tarea_activa
}

/**
 * Actualiza la tarea activa de un usuario
 */
export async function setTareaActiva(email: string, tarea: any) {
    const { error } = await supabase
        .from('usuarios')
        .update({ tarea_activa: tarea })
        .eq('correo', email)
    
    if (error) {
        console.error('Error setting active task:', error)
        throw error
    }
}
